from fastapi import APIRouter, HTTPException
from database.db import get_db_connection

router = APIRouter()

def fetch_all(query):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    try:
        cursor = conn.cursor()
        cursor.execute(query)
        columns = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()
        return [dict(zip(columns, row)) for row in rows]
    finally:
        conn.close()

@router.get("/sensors")
def get_sensors():
    return fetch_all("SELECT * FROM capteurs ORDER BY id ASC")

@router.get("/interventions")
def get_interventions():
    return fetch_all("SELECT * FROM interventions ORDER BY date_creation DESC")

@router.get("/vehicles")
def get_vehicles():
    return fetch_all("SELECT * FROM vehicules ORDER BY id ASC")

@router.get("/citizens")
def get_citizens():
    return fetch_all("SELECT * FROM citoyens ORDER BY id ASC")

@router.get("/timeseries")
def get_timeseries():
    # TimescaleDB time-bucket query
    query = """
        SELECT time_bucket('1 hour', time) AS bucket, avg(valeur) as avg_valeur
        FROM mesures
        WHERE time > NOW() - INTERVAL '7 days'
        GROUP BY bucket
        ORDER BY bucket ASC
    """
    results = fetch_all(query)
    # Convert datetime to string for JSON serialization
    for r in results:
        if r['bucket']:
            r['bucket'] = r['bucket'].isoformat()
    return results
