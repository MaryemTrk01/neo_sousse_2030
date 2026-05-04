"""
realtime_simulator.py
=====================
Sousse Smart City - Real-time Sensor Data Simulator

FIX: calls POST /notify/dashboard after each batch insert so the
     WebSocket pushes data immediately instead of waiting up to 10s.
"""

import time
import random
import os
import requests                          # ← added
from datetime import datetime
from dotenv import load_dotenv
import psycopg2

load_dotenv()

INTERVAL_SECONDS  = 10
SENSORS_PER_BATCH = 15
BACKEND_URL       = os.environ.get("BACKEND_URL", "http://127.0.0.1:8000")

TYPES    = ['Air', 'Trafic', 'Energie', 'Dechets']
UNITE_MAP = {'Air': 'ppm', 'Trafic': 'veh/h', 'Energie': 'kWh', 'Dechets': 'kg'}


def get_conn():
    return psycopg2.connect(
        host=os.environ.get("DB_HOST", "127.0.0.1"),
        port=os.environ.get("DB_PORT", "5433"),
        database=os.environ.get("DB_NAME", "smart_city"),
        user=os.environ.get("DB_USER", "postgres"),
        password=os.environ.get("DB_PASSWORD", "14614114")
    )


def fetch_sensor_ids(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT id, type_capteur FROM capteurs ORDER BY id")
        return cur.fetchall()


def fetch_vehicle_ids(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM vehicules ORDER BY id")
        return [r[0] for r in cur.fetchall()]


def random_value(t: str) -> float:
    hour    = datetime.now().hour
    is_peak = 7 <= hour <= 9 or 17 <= hour <= 19
    if t == 'Air':
        return round(random.gauss(80 if is_peak else 40, 15), 2)
    elif t == 'Trafic':
        return round(max(0, random.gauss(95 if is_peak else 25, 20)), 2)
    elif t == 'Energie':
        return round(max(10, random.gauss(150 if is_peak else 70, 30)), 2)
    else:
        return round(max(0, random.gauss(55 if hour >= 20 or hour <= 6 else 25, 10)), 2)


def notify_backend():
    """Tell the backend to push a fresh snapshot to all WS clients."""
    try:
        r = requests.post(f"{BACKEND_URL}/notify/dashboard", timeout=3)
        print(f"  [NOTIFY] Backend notified -> {r.json()}")
    except Exception as e:
        print(f"  [NOTIFY] Could not reach backend: {e}")


def insert_batch(conn, all_sensors, all_vehicles):
    batch_size = min(SENSORS_PER_BATCH, len(all_sensors))
    chosen     = random.sample(all_sensors, batch_size)

    with conn.cursor() as cur:
        # 1. Insert sensor measurements
        for (sid, stype) in chosen:
            val   = random_value(stype)
            unite = UNITE_MAP.get(stype, 'unit')
            cur.execute(
                "INSERT INTO mesures (time, capteur_id, valeur, unite) VALUES (CURRENT_TIMESTAMP, %s, %s, %s)",
                (sid, val, unite)
            )

        # 2. Randomly fail sensors & Create Interventions (Automata start)
        if random.random() < 0.15 and all_sensors:
            target_id, _ = random.choice(all_sensors)
            cur.execute("UPDATE capteurs SET etat = 'HORS_SERVICE' WHERE id = %s", (target_id,))
            cur.execute(
                "INSERT INTO interventions (capteur_id, description, etat) VALUES (%s, %s, 'DEMANDE')",
                (target_id, f"Panne critique détectée sur capteur {target_id}")
            )
            print(f"  [ALERTE] Capteur {target_id} HS -> Intervention créee")

        # 3. Progress existing interventions (Automata transitions)
        # States: DEMANDE -> TECH1_ASSIGNÉ -> TECH2_VALIDE -> IA_VALIDE -> TERMINÉ
        from automata.engine import get_automata
        cur.execute("SELECT id, etat, capteur_id, vehicule_id FROM interventions WHERE etat != 'TERMINÉ' LIMIT 5")
        active_ints = cur.fetchall()
        for (int_id, current_etat, c_id, v_id) in active_ints:
            if random.random() < 0.3:
                try:
                    # Use the actual State Machine engine to determine next state
                    machine = get_automata('intervention', current_etat)
                    
                    # Determine event based on current state
                    event = {
                        'DEMANDE': 'assigner_tech',
                        'TECH1_ASSIGNÉ': 'valider_tech',
                        'TECH2_VALIDE': 'valider_ia',
                        'IA_VALIDE': 'terminer'
                    }.get(current_etat)
                    
                    if event:
                        getattr(machine, event)()
                        next_etat = machine.state
                        
                        cur.execute("UPDATE interventions SET etat = %s WHERE id = %s", (next_etat, int_id))
                        print(f"  [AUTOMATE] Intervention {int_id} ({current_etat}) --{event}--> {next_etat}")
                        
                        if next_etat == 'TERMINÉ':
                            if c_id: cur.execute("UPDATE capteurs SET etat = 'ACTIF' WHERE id = %s", (c_id,))
                            if v_id: cur.execute("UPDATE vehicules SET etat = 'STATIONNÉ' WHERE id = %s", (v_id,))
                except Exception as e:
                    print(f"  [AUTOMATE ERROR] {int_id}: {e}")

        # 4. Realistic Vehicle movement and status
        # This part simulates vehicles going through a full lifecycle: 
        # STATIONNÉ -> EN_ROUTE -> ARRIVÉ -> STATIONNÉ
        if random.random() < 0.6 and all_vehicles: # Increased frequency
            veh_id = random.choice(all_vehicles)
            cur.execute("SELECT etat, localisation_actuelle, niveau_batterie FROM vehicules WHERE id = %s", (veh_id,))
            v_row = cur.fetchone()
            if v_row:
                v_etat, v_loc, v_batt = v_row
                try:
                    machine = get_automata('vehicule', v_etat)
                    
                    # Logique de décision réaliste
                    event = None
                    if v_etat == 'STATIONNÉ' and v_batt > 20:
                        event = 'demarrer'
                    elif v_etat == 'EN_ROUTE':
                        # Un véhicule en route a plus de chances de continuer à rouler qu'arriver tout de suite
                        event = random.choices(['arriver', 'tomber_en_panne', None], weights=[30, 5, 65])[0]
                    elif v_etat == 'ARRIVÉ':
                        event = 'stationner'
                    elif v_etat == 'EN_PANNE':
                        if random.random() < 0.2: event = 'reparer'

                    if event:
                        getattr(machine, event)()
                        new_etat = machine.state
                        new_loc = v_loc
                        
                        # Consommation de batterie graduelle
                        new_batt = v_batt
                        if new_etat == 'EN_ROUTE':
                            new_batt = max(5, v_batt - random.randint(1, 3))
                        elif new_etat == 'STATIONNÉ' and v_batt < 100:
                            new_batt = min(100, v_batt + random.randint(5, 15)) # Recharge au parking
                        
                        if event == 'demarrer' or event == 'arriver':
                            # On change de zone seulement au démarrage ou à l'arrivée
                            new_loc = random.choice([
                                'Sousse Médina', 'Sousse Nord', 'Akouda', 'Kalaa Sghira', 
                                'Hammam Sousse', 'Sousse Riadh', 'Hergla', 'Bouficha', 
                                'Port de Sousse', 'Msaken', 'Khezama Est', 'Sidi Abdelhamid', 'Messaadine'
                            ])
                        
                        cur.execute(
                            "UPDATE vehicules SET etat = %s, niveau_batterie = %s, localisation_actuelle = %s WHERE id = %s",
                            (new_etat, new_batt, new_loc, veh_id)
                        )
                        print(f"  [VEHICULE] {veh_id}: {v_etat} --{event}--> {new_etat} (Batt: {new_batt}%) @ {new_loc}")
                except Exception as e:
                    print(f"  [VEHICULE ERROR] {veh_id}: {e}")

    conn.commit()
    print(f"[{datetime.now().strftime('%H:%M:%S')}] [DONE] Batch processed.")
    notify_backend()


def main():
    print("=" * 60)
    print("  Sousse Smart City - Real-Time Simulator")
    print(f"  Batch size: {SENSORS_PER_BATCH} | Interval: {INTERVAL_SECONDS}s")
    print("=" * 60)

    conn         = None
    all_sensors  = []
    all_vehicles = []

    while True:
        try:
            if conn is None or conn.closed:
                print("Connecting to database...")
                conn = get_conn()
                print("Connected OK")
                all_sensors  = fetch_sensor_ids(conn)
                all_vehicles = fetch_vehicle_ids(conn)
                print(f"  Found {len(all_sensors)} capteurs | {len(all_vehicles)} vehicules")

            insert_batch(conn, all_sensors, all_vehicles)

        except psycopg2.OperationalError as e:
            print(f"[DB ERROR] {e} — reconnecting in 5s...")
            try: conn.close()
            except: pass
            conn = None
            time.sleep(5)
            continue

        except KeyboardInterrupt:
            print("\nSimulator stopped.")
            break

        except Exception as e:
            print(f"[ERROR] {e}")
            try: conn.rollback()
            except: pass

        time.sleep(INTERVAL_SECONDS)

    if conn:
        conn.close()


if __name__ == "__main__":
    main()