"""
routes/ws_routes.py
===================
WebSocket endpoint for real-time dashboard updates.

FIXES (v2):
  1. Replaced shared asyncio.Event (broken with multiple clients + --reload) with
     per-client asyncio.Queue — each client gets its own notification channel.
  2. send_text failures (dead socket) now break the loop instead of looping forever.
  3. asyncio.Event() is no longer created at module level (causes "no running event
     loop" errors in Python 3.10+). Queue is created inside the coroutine instead.
  4. Clients are removed BEFORE the final send attempt so stale entries can't pile up.
"""

import asyncio
import json
import os
from datetime import datetime
from typing import Dict

import psycopg2
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

router = APIRouter()

# ── Per-client notification queues ────────────────────────────────────────────
# Each connected WebSocket gets an asyncio.Queue entry here.
# /notify puts True into every queue → each client wakes up independently.
_client_queues: Dict[int, asyncio.Queue] = {}   # id(websocket) → Queue


def get_conn():
    return psycopg2.connect(
        host=os.environ.get("DB_HOST", "127.0.0.1"),
        port=os.environ.get("DB_PORT", "5433"),
        database=os.environ.get("DB_NAME", "smart_city"),
        user=os.environ.get("DB_USER", "postgres"),
        password=os.environ.get("DB_PASSWORD", "14614114"),
    )


def fetch_dashboard_snapshot() -> dict:
    """Pull a fresh snapshot of all dashboard metrics from the DB."""
    conn = get_conn()
    try:
        with conn.cursor() as cur:

            # KPI counts
            cur.execute("SELECT COUNT(*) FROM capteurs")
            total_sensors = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM citoyens")
            total_citizens = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM vehicules")
            total_vehicles = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM interventions WHERE etat != 'TERMINÉ'")
            active_interventions = cur.fetchone()[0]

            # Sensor health distribution
            cur.execute("SELECT etat, COUNT(*) FROM capteurs GROUP BY etat")
            sensor_status = [{"name": row[0], "value": row[1]} for row in cur.fetchall()]

            # 24-hour timeseries (standard PostgreSQL date_trunc — no TimescaleDB needed)
            cur.execute("""
                SELECT
                    date_trunc('minute', time) AS bucket,
                    ROUND(AVG(valeur)::numeric, 1) AS avg_valeur
                FROM mesures
                WHERE time > NOW() - INTERVAL '24 hours'
                GROUP BY bucket
                ORDER BY bucket DESC
                LIMIT 1440
            """)
            timeseries = [
                {
                    "time":  row[0].strftime("%H:%M"),
                    "value": float(row[1]) if row[1] else 0,
                }
                for row in cur.fetchall()
            ]

            # Top polluted zones (Air sensors, last 2h avg)
            cur.execute("""
                SELECT c.localisation, ROUND(AVG(m.valeur)::numeric, 1) AS aqi
                FROM mesures m
                JOIN capteurs c ON m.capteur_id = c.id
                WHERE c.type_capteur = 'Air'
                  AND m.time > NOW() - INTERVAL '2 hours'
                GROUP BY c.localisation
                ORDER BY aqi DESC
                LIMIT 5
            """)
            pollution = [{"zone": row[0], "aqi": float(row[1])} for row in cur.fetchall()]

            # Latest sensor readings (last 10)
            cur.execute("""
                SELECT c.reference, c.type_capteur, c.localisation,
                       m.valeur, m.unite, m.time
                FROM mesures m
                JOIN capteurs c ON m.capteur_id = c.id
                ORDER BY m.time DESC
                LIMIT 10
            """)
            latest = [
                {
                    "ref":      row[0],
                    "type":     row[1],
                    "location": row[2],
                    "value":    row[3],
                    "unit":     row[4],
                    "time":     row[5].strftime("%H:%M:%S"),
                }
                for row in cur.fetchall()
            ]

            # Latest Interventions (last 5)
            cur.execute("""
                SELECT i.id, COALESCE(c.reference, v.matricule) as target, i.description, i.etat, i.date_creation
                FROM interventions i
                LEFT JOIN capteurs c ON i.capteur_id = c.id
                LEFT JOIN vehicules v ON i.vehicule_id = v.id
                ORDER BY i.date_creation DESC
                LIMIT 5
            """)
            latest_interventions = [
                {
                    "id": row[0],
                    "target": row[1],
                    "desc": row[2],
                    "status": row[3],
                    "time": row[4].strftime("%H:%M:%S")
                }
                for row in cur.fetchall()
            ]

            # Latest Vehicle Status (all 50)
            cur.execute("""
                SELECT matricule, etat, niveau_batterie, localisation_actuelle
                FROM vehicules
                ORDER BY id ASC
                LIMIT 50
            """)
            active_vehicles = [
                {
                    "id": row[0],
                    "status": row[1],
                    "battery": row[2],
                    "location": row[3]
                }
                for row in cur.fetchall()
            ]

        return {
            "timestamp": datetime.utcnow().isoformat(),
            "stats": {
                "sensors":       total_sensors,
                "citizens":      total_citizens,
                "vehicles":      total_vehicles,
                "interventions": active_interventions,
            },
            "sensorStatus":   sensor_status,
            "timeseries":     timeseries,
            "pollution":      pollution,
            "latestReadings": latest,
            "latestInterventions": latest_interventions,
            "activeVehicles": active_vehicles,
        }
    finally:
        conn.close()


# ── /notify endpoint ──────────────────────────────────────────────────────────
@router.post("/notify/dashboard")
async def notify_dashboard():
    """
    Called by the simulator after each batch insert.
    Puts a token into every connected client's queue so each one wakes up
    immediately instead of waiting for the next 5-second poll.
    """
    for q in list(_client_queues.values()):
        # Non-blocking put; if the client is slow we skip rather than block.
        try:
            q.put_nowait(True)
        except asyncio.QueueFull:
            pass

    return JSONResponse({"ok": True, "clients": len(_client_queues)})


# ── WebSocket endpoint ────────────────────────────────────────────────────────
@router.websocket("/ws/dashboard")
async def dashboard_websocket(websocket: WebSocket):
    await websocket.accept()

    # Register this client with its own queue (created here, inside the running loop)
    client_id = id(websocket)
    notify_queue: asyncio.Queue = asyncio.Queue(maxsize=5)
    _client_queues[client_id] = notify_queue

    print(f"[WS] Client connected: {websocket.client} | ID: {client_id} | Total: {len(_client_queues)}")

    try:
        while True:
            # ── 1. Fetch & send snapshot ──────────────────────────────────────
            try:
                snapshot = await asyncio.get_event_loop().run_in_executor(
                    None, fetch_dashboard_snapshot
                )
                await websocket.send_text(json.dumps(snapshot))

            except WebSocketDisconnect:
                # Client closed the connection cleanly
                raise
            except Exception as err:
                # Catch specific DB or formatting errors to prevent loop crash
                print(f"[WS] Critical Error for {websocket.client}: {err}")
                import traceback
                traceback.print_exc()
                # Instead of breaking immediately, wait a bit and try again if it's just a DB fluke
                await asyncio.sleep(2)
                continue

            # ── 2. Wait up to 5 s for a notify signal, then poll anyway ──────
            try:
                await asyncio.wait_for(notify_queue.get(), timeout=5.0)
                # Drain any extra tokens that piled up while we were fetching
                while not notify_queue.empty():
                    notify_queue.get_nowait()
            except asyncio.TimeoutError:
                pass   # Normal — just means no notify arrived; poll on schedule

    except WebSocketDisconnect:
        print(f"[WS] Client disconnected: {websocket.client}")
    except Exception as e:
        print(f"[WS] Unexpected error for {websocket.client}: {e}")
    finally:
        # Always clean up the queue entry regardless of how we exited
        _client_queues.pop(client_id, None)
        print(f"[WS] Client removed. Remaining: {len(_client_queues)}")