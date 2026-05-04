import sys
import os
import json
import datetime
import decimal
import random
import time
import threading

base = os.path.dirname(os.path.abspath(__file__))
parent = os.path.dirname(base)

sys.path.insert(0, base)
sys.path.insert(0, parent)
sys.path.insert(0, os.path.join(parent, "bdd"))
sys.path.insert(0, os.path.join(parent, "compilateur"))
sys.path.insert(0, os.path.join(parent, "db"))

from flask import Flask, request, make_response
from flask_cors import CORS
from flask_socketio import SocketIO

from ia_module import IAGenerative, collecter_donnees_bd
from db_config import get_cursor, test_connection
from db_executor import DBExecutor

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

ia = IAGenerative()
db_exec = DBExecutor()
SIMULATION_RUNNING = True


class CustomEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime.datetime, datetime.date)):
            return obj.isoformat()
        if isinstance(obj, decimal.Decimal):
            return float(obj)
        return super().default(obj)


def api_response(data, code=200):
    response = make_response(json.dumps(data, cls=CustomEncoder), code)
    response.headers["Content-Type"] = "application/json"
    return response


def ensure_columns():
    try:
        with get_cursor() as cur:
            cur.execute("""
                ALTER TABLE capteurs
                ADD COLUMN IF NOT EXISTS statut_since TIMESTAMP DEFAULT NOW()
            """)
            cur.execute("""
                ALTER TABLE vehicules
                ADD COLUMN IF NOT EXISTS statut_since TIMESTAMP DEFAULT NOW()
            """)
            cur.execute("""
                UPDATE capteurs SET statut_since = NOW()
                WHERE statut_since IS NULL
            """)
            cur.execute("""
                UPDATE vehicules SET statut_since = NOW()
                WHERE statut_since IS NULL
            """)
        print("[OK] Colonnes realtime vérifiées.")
    except Exception as e:
        print(f"[ERROR] ensure_columns: {e}")


def get_dashboard_stats():
    with get_cursor() as cur:
        cur.execute("""
            SELECT
                COUNT(*) AS total_capteurs,
                COUNT(*) FILTER (WHERE statut = 'ACTIF') AS capteurs_actifs,
                COUNT(*) FILTER (WHERE statut = 'HORS_SERVICE') AS capteurs_hs,
                COUNT(*) FILTER (WHERE statut = 'SIGNALE') AS capteurs_signales,
                COUNT(*) FILTER (WHERE statut = 'EN_MAINTENANCE') AS capteurs_maintenance,
                COUNT(*) FILTER (WHERE statut = 'INACTIF') AS capteurs_inactifs
            FROM capteurs
        """)
        capteurs = dict(cur.fetchone())

        cur.execute("""
            SELECT
                COUNT(*) AS total_interventions,
                COUNT(*) FILTER (WHERE statut != 'TERMINE') AS interventions_en_cours,
                COUNT(*) FILTER (WHERE statut = 'TERMINE') AS interventions_terminees
            FROM interventions
        """)
        interventions = dict(cur.fetchone())

        cur.execute("""
            SELECT
                COUNT(*) AS total_vehicules,
                COUNT(*) FILTER (WHERE statut = 'EN_ROUTE') AS vehicules_en_route,
                COUNT(*) FILTER (WHERE statut = 'EN_PANNE') AS vehicules_en_panne,
                COUNT(*) FILTER (WHERE statut = 'STATIONNE') AS vehicules_stationnes,
                COUNT(*) FILTER (WHERE statut = 'ARRIVE') AS vehicules_arrives
            FROM vehicules
        """)
        vehicules = dict(cur.fetchone())

        cur.execute("""
            SELECT
                COALESCE(ROUND(AVG(valeur)::numeric, 2), 0) AS moyenne_mesures,
                COALESCE(ROUND(MAX(valeur)::numeric, 2), 0) AS max_mesure,
                COALESCE(ROUND(MIN(valeur)::numeric, 2), 0) AS min_mesure,
                COUNT(*) AS total_mesures
            FROM mesures
            WHERE date >= NOW() - INTERVAL '24 hours'
        """)
        mesures = dict(cur.fetchone())

        cur.execute("""
            SELECT
                TO_CHAR(DATE_TRUNC('hour', date), 'HH24:00') AS name,
                ROUND(AVG(valeur)::numeric, 2) AS val
            FROM mesures
            WHERE date >= NOW() - INTERVAL '24 hours'
            GROUP BY DATE_TRUNC('hour', date)
            ORDER BY DATE_TRUNC('hour', date)
        """)
        measure_chart_data = [dict(r) for r in cur.fetchall()]

        cur.execute("""
            SELECT
                type_mesure,
                ROUND(AVG(valeur)::numeric, 2) AS moyenne
            FROM mesures
            WHERE date >= NOW() - INTERVAL '24 hours'
            GROUP BY type_mesure
            ORDER BY type_mesure
        """)
        mesures_by_type = [dict(r) for r in cur.fetchall()]

    return {
        **capteurs,
        **interventions,
        **vehicules,
        **mesures,
        "measure_chart_data": measure_chart_data,
        "mesures_by_type": mesures_by_type,
        "date": datetime.date.today().strftime("%d/%m/%Y"),
    }


AUTOMATA_RULES = {
    "capteur": {
        "activer": {"old": "INACTIF", "new": "ACTIF"},
        "signaler": {"old": "ACTIF", "new": "SIGNALE"},
        "maintenir": {"old": "SIGNALE", "new": "EN_MAINTENANCE"},
        "declarer_hs": {"old": "EN_MAINTENANCE", "new": "HORS_SERVICE"},
        "remplacer": {"old": "HORS_SERVICE", "new": "INACTIF"},
        "reparer": {"old": "EN_MAINTENANCE", "new": "ACTIF"},
    },
    "intervention": {
        "assigner_tech1": {"old": "DEMANDE", "new": "TECH1_ASSIGNE"},
        "valider_tech2": {"old": "TECH1_ASSIGNE", "new": "TECH2_VALIDE"},
        "valider_ia": {"old": "TECH2_VALIDE", "new": "IA_VALIDE"},
        "terminer": {"old": "IA_VALIDE", "new": "TERMINE"},
    },
    "vehicule": {
        "demarrer": {"old": ["STATIONNE", "ARRIVE"], "new": "EN_ROUTE"},
        "panne": {"old": "EN_ROUTE", "new": "EN_PANNE"},
        "arriver": {"old": ["EN_ROUTE", "EN_PANNE"], "new": "ARRIVE"},
        "reparer": {"old": "EN_PANNE", "new": "STATIONNE"},
    },
}


def emit_all_updates():
    try:
        stats = get_dashboard_stats()
        donnees = collecter_donnees_bd()
        capteurs = donnees.get("capteurs", [])
        mesures = donnees.get("mesures", [])
        vehicules = donnees.get("vehicules", [])
        interventions = donnees.get("interventions", [])

        print(f"[SOCKET] emit_all_updates {datetime.datetime.now().strftime('%H:%M:%S')}")
        print(
            "[FRONTEND] dashboard: "
            f"capteurs_actifs={stats.get('capteurs_actifs', 0)}, "
            f"capteurs_signales={stats.get('capteurs_signales', 0)}, "
            f"capteurs_hs={stats.get('capteurs_hs', 0)}, "
            f"interventions_en_cours={stats.get('interventions_en_cours', 0)}, "
            f"interventions_terminees={stats.get('interventions_terminees', 0)}, "
            f"vehicules_en_route={stats.get('vehicules_en_route', 0)}, "
            f"vehicules_en_panne={stats.get('vehicules_en_panne', 0)}"
        )
        print(
            "[FRONTEND] socket lists: "
            f"capteurs_update={len(capteurs)} items, "
            f"measures_update={len(mesures)} items, "
            f"vehicle_update={len(vehicules)} items, "
            f"intervention_update={len(interventions)} items"
        )

        socketio.emit("metrics_update", json.loads(json.dumps(stats, cls=CustomEncoder)))
        socketio.emit("capteurs_update", json.loads(json.dumps(capteurs, cls=CustomEncoder)))
        socketio.emit("measures_update", json.loads(json.dumps(mesures, cls=CustomEncoder)))
        socketio.emit("vehicle_update", json.loads(json.dumps(vehicules, cls=CustomEncoder)))
        socketio.emit("intervention_update", json.loads(json.dumps(interventions, cls=CustomEncoder)))

    except Exception as e:
        print(f"[ERROR] emit_all_updates: {e}")


def execute_transition(table, entity_id, event, entity_type):
    rules = AUTOMATA_RULES.get(entity_type, {})

    if not event:
        return {"success": False, "error": "Event manquant"}, 400

    if event not in rules:
        return {"success": False, "error": f"Événement inconnu: {event}"}, 400

    rule = rules[event]

    try:
        with get_cursor() as cur:
            cur.execute(f"SELECT statut FROM {table} WHERE id = %s", (entity_id,))
            row = cur.fetchone()

            if not row:
                return {"success": False, "error": "Entité introuvable"}, 404

            old_status = row["statut"]
            allowed_old = rule["old"] if isinstance(rule["old"], list) else [rule["old"]]

            if old_status not in allowed_old:
                return {
                    "success": False,
                    "error": f"Transition impossible: {old_status} -> {event}",
                }, 400

            new_status = rule["new"]

            if table in ["vehicules", "capteurs"]:
                cur.execute(
                    f"UPDATE {table} SET statut = %s, statut_since = %s WHERE id = %s",
                    (new_status, datetime.datetime.now(), entity_id),
                )
            else:
                cur.execute(
                    f"UPDATE {table} SET statut = %s WHERE id = %s",
                    (new_status, entity_id),
                )

        payload = {
            "success": True,
            "entity": entity_type,
            "id": entity_id,
            "event": event,
            "old_status": old_status,
            "new_status": new_status,
        }

        socketio.emit("status_change", payload)
        print(
            f"[MANUAL] {entity_type} #{entity_id}: "
            f"{old_status} -> {new_status} via {event}"
        )

        if entity_type == "capteur" and new_status in ["SIGNALE", "HORS_SERVICE"]:
            socketio.emit("alert", {
                "type": "capteur",
                "id": entity_id,
                "message": f"Capteur #{entity_id}: {new_status}",
            })

        if entity_type == "vehicule" and new_status == "EN_PANNE":
            socketio.emit("alert", {
                "type": "vehicule",
                "id": entity_id,
                "message": f"Véhicule #{entity_id} est en panne",
            })

        emit_all_updates()
        return payload, 200

    except Exception as e:
        return {"success": False, "error": str(e)}, 500


def update_capteurs_intelligent(cur):
    now = datetime.datetime.now()

    cur.execute("""
        SELECT id, type
        FROM capteurs
        WHERE statut = 'ACTIF'
        ORDER BY RANDOM()
        LIMIT 25
    """)
    for c in cur.fetchall():
        sensor_type = c["type"]
        if sensor_type == "pollution":
            value = random.uniform(20, 120)
        elif sensor_type == "co2":
            value = random.uniform(350, 900)
        elif sensor_type == "temperature":
            value = random.uniform(18, 38)
        elif sensor_type == "humidite":
            value = random.uniform(30, 90)
        elif sensor_type == "bruit":
            value = random.uniform(30, 95)
        elif sensor_type == "trafic":
            value = random.uniform(0, 100)
        else:
            value = random.uniform(0, 100)

        cur.execute("""
            INSERT INTO mesures (capteur_id, type_mesure, valeur, date)
            VALUES (%s, %s, %s, %s)
        """, (c["id"], sensor_type, round(value, 2), now))

    cur.execute("""
        SELECT id, statut
        FROM capteurs
        ORDER BY RANDOM()
        LIMIT 5
    """)
    rows = cur.fetchall()

    for row in rows:
        old_status = row["statut"]
        new_status = None
        event = None

        if old_status == "INACTIF":
            new_status, event = "ACTIF", "activer"
        elif old_status == "ACTIF":
            new_status, event = "SIGNALE", "signaler"
        elif old_status == "SIGNALE":
            new_status, event = "EN_MAINTENANCE", "maintenir"
        elif old_status == "EN_MAINTENANCE":
            if random.random() < 0.80:
                new_status, event = "ACTIF", "reparer"
            else:
                new_status, event = "HORS_SERVICE", "declarer_hs"
        elif old_status == "HORS_SERVICE":
            new_status, event = "INACTIF", "remplacer"

        if not new_status:
            continue

        cur.execute("""
            UPDATE capteurs
            SET statut = %s, statut_since = %s
            WHERE id = %s
        """, (new_status, now, row["id"]))

        socketio.emit("status_change", {
            "entity": "capteur",
            "id": row["id"],
            "old_status": old_status,
            "new_status": new_status,
            "event": "auto_" + event,
        })
        print(
            f"[AUTO] capteur #{row['id']}: "
            f"{old_status} -> {new_status} via {event}"
        )

        if new_status in ["SIGNALE", "HORS_SERVICE"]:
            socketio.emit("alert", {
                "type": "capteur",
                "id": row["id"],
                "message": f"Capteur #{row['id']}: {new_status}",
            })

def update_interventions(cur):
    cur.execute("SELECT COUNT(*) AS n FROM interventions WHERE statut != 'TERMINE'")
    active_count = cur.fetchone()["n"]
    if active_count == 0:
        cur.execute("""
            UPDATE interventions
            SET statut = 'DEMANDE'
            WHERE id IN (
                SELECT id FROM interventions ORDER BY RANDOM() LIMIT 8
            )
        """)

    cur.execute("""
        SELECT id, statut
        FROM interventions
        WHERE statut != 'TERMINE'
        ORDER BY RANDOM()
        LIMIT 4
    """)
    rows = cur.fetchall()

    for row in rows:
        current = row["statut"]
        next_status = {
            "DEMANDE": "TECH1_ASSIGNE",
            "TECH1_ASSIGNE": "TECH2_VALIDE",
            "TECH2_VALIDE": "IA_VALIDE",
            "IA_VALIDE": "TERMINE",
        }.get(current)

        if not next_status:
            continue

        cur.execute("""
            UPDATE interventions
            SET statut = %s
            WHERE id = %s
        """, (next_status, row["id"]))

        socketio.emit("status_change", {
            "entity": "intervention",
            "id": row["id"],
            "old_status": current,
            "new_status": next_status,
            "event": "auto_progress",
        })
        print(
            f"[AUTO] intervention #{row['id']}: "
            f"{current} -> {next_status} via auto_progress"
        )

        if next_status == "TERMINE":
            socketio.emit("alert", {
                "type": "intervention",
                "id": row["id"],
                "message": f"Intervention #{row['id']} terminée",
            })

def update_vehicules_intelligent(cur):
    now = datetime.datetime.now()

    cur.execute("""
        SELECT id, statut, statut_since
        FROM vehicules
        ORDER BY RANDOM()
        LIMIT 8
    """)
    vehicules = cur.fetchall()

    for v in vehicules:
        current = v["statut"]
        next_status = None

        if current == "STATIONNE":
            next_status = "EN_ROUTE"
        elif current == "EN_ROUTE":
            next_status = "EN_PANNE" if random.random() < 0.12 else "ARRIVE"
        elif current == "ARRIVE":
            next_status = "STATIONNE"
        elif current == "EN_PANNE":
            next_status = "STATIONNE"

        if not next_status:
            continue

        cur.execute("""
            UPDATE vehicules
            SET statut = %s, statut_since = %s
            WHERE id = %s
        """, (next_status, now, v["id"]))

        socketio.emit("status_change", {
            "entity": "vehicule",
            "id": v["id"],
            "old_status": current,
            "new_status": next_status,
            "event": "auto_vehicle_flow",
        })
        print(
            f"[AUTO] vehicule #{v['id']}: "
            f"{current} -> {next_status} via auto_vehicle_flow"
        )

        if next_status == "EN_PANNE":
            socketio.emit("alert", {
                "type": "vehicule",
                "id": v["id"],
                "message": f"Véhicule #{v['id']} est en panne",
            })

def background_simulation_worker():
    global SIMULATION_RUNNING

    print("[SYSTEM] Smart City Automation Engine Started.")

    while True:
        if SIMULATION_RUNNING:
            try:
                print(f"[WORKER] Heartbeat - {datetime.datetime.now().strftime('%H:%M:%S')}")

                with get_cursor() as cur:
                    update_capteurs_intelligent(cur)
                    update_interventions(cur)
                    update_vehicules_intelligent(cur)

                emit_all_updates()

            except Exception as e:
                print(f"[ERROR] Automation Error: {e}")

        time.sleep(60)


automation_thread = threading.Thread(target=background_simulation_worker, daemon=True)
automation_thread.start()


@app.route("/api/realtime/status")
def realtime_status():
    return api_response({
        "success": True,
        "simulation_running": SIMULATION_RUNNING,
        "timestamp": datetime.datetime.now(),
    })


@app.route("/api/simulate/start", methods=["POST"])
def simulate_start():
    global SIMULATION_RUNNING
    SIMULATION_RUNNING = True
    emit_all_updates()
    return api_response({"success": True, "status": "running"})


@app.route("/api/simulate/stop", methods=["POST"])
def simulate_stop():
    global SIMULATION_RUNNING
    SIMULATION_RUNNING = False
    emit_all_updates()
    return api_response({"success": True, "status": "stopped"})


@app.route("/api/dashboard")
def api_dashboard():
    try:
        return api_response({"success": True, **get_dashboard_stats()})
    except Exception as e:
        return api_response({"success": False, "error": str(e)}, 500)


@app.route("/api/capteurs")
def api_capteurs():
    try:
        return api_response({
            "success": True,
            "capteurs": collecter_donnees_bd().get("capteurs", []),
        })
    except Exception as e:
        return api_response({"success": False, "error": str(e)}, 500)


@app.route("/api/capteurs/<int:id>/transition", methods=["POST"])
def transition_capteur(id):
    data = request.get_json() or {}
    result, code = execute_transition("capteurs", id, data.get("event"), "capteur")
    return api_response(result, code)


@app.route("/api/interventions")
def api_interventions():
    try:
        return api_response({
            "success": True,
            "interventions": collecter_donnees_bd().get("interventions", []),
        })
    except Exception as e:
        return api_response({"success": False, "error": str(e)}, 500)


@app.route("/api/interventions/<int:id>/transition", methods=["POST"])
def transition_intervention(id):
    data = request.get_json() or {}
    result, code = execute_transition("interventions", id, data.get("event"), "intervention")
    return api_response(result, code)


@app.route("/api/vehicules")
def api_vehicules():
    try:
        return api_response({
            "success": True,
            "vehicules": collecter_donnees_bd().get("vehicules", []),
        })
    except Exception as e:
        return api_response({"success": False, "error": str(e)}, 500)


@app.route("/api/vehicules/<int:id>/transition", methods=["POST"])
def transition_vehicule(id):
    data = request.get_json() or {}
    result, code = execute_transition("vehicules", id, data.get("event"), "vehicule")
    return api_response(result, code)


@app.route("/api/mesures")
def api_mesures():
    try:
        return api_response({
            "success": True,
            "mesures": collecter_donnees_bd().get("mesures", []),
        })
    except Exception as e:
        return api_response({"success": False, "error": str(e)}, 500)


@app.route("/api/citoyens")
def api_citoyens():
    try:
        return api_response({
            "success": True,
            "citoyens": collecter_donnees_bd().get("citoyens", []),
        })
    except Exception as e:
        return api_response({"success": False, "error": str(e)}, 500)


@app.route("/api/rapport")
def api_rapport():
    try:
        return api_response({
            "success": True,
            "rapport": ia.rapport_journalier(),
            "date": ia.date_aujourd_hui,
        })
    except Exception as e:
        return api_response({"success": False, "error": str(e)}, 500)


@app.route("/api/suggestions")
def api_suggestions():
    try:
        return api_response({
            "success": True,
            "suggestions": ia.suggestions_actions(),
        })
    except Exception as e:
        return api_response({"success": False, "error": str(e)}, 500)


@app.route("/api/chat", methods=["POST"])
def api_chat():
    try:
        data = request.get_json() or {}
        return api_response({
            "success": True,
            "reponse": ia.chat(data.get("question", "Bonjour")),
        })
    except Exception as e:
        return api_response({"success": False, "error": str(e)}, 500)


@app.route("/api/compiler", methods=["POST"])
def api_compiler():
    try:
        data = request.get_json() or {}
        query = data.get("query", "")

        if not query:
            return api_response({"success": False, "error": "Requête vide"}, 400)

        result = db_exec.execute_nl(query)

        if result.success:
            return api_response({
                "success": True,
                "sql": result.sql,
                "rows": result.rows,
                "row_count": result.row_count,
                "nl_input": result.nl_input,
                "errors": [],
            })

        return api_response({
            "success": False,
            "sql": result.sql,
            "errors": [result.error],
            "nl_input": result.nl_input,
        }, 400)

    except Exception as e:
        return api_response({"success": False, "error": str(e)}, 500)


if __name__ == "__main__":
    ensure_columns()
    test_connection()
    socketio.run(app, host="0.0.0.0", port=5000, debug=True, use_reloader=False)
