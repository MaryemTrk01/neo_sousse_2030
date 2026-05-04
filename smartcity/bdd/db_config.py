"""
DATABASE CONFIG — Connexion PostgreSQL Smart City
Base : smartcity | User : postgres | Host : localhost
"""

import psycopg2
import psycopg2.extras
from contextlib import contextmanager

# ─────────────────────────────────────────────
# Configuration de connexion
# ─────────────────────────────────────────────

DB_CONFIG = {
    "host":     "localhost",
    "port":     5433,
    "dbname":   "smartcity",
    "user":     "postgres",
    "password": "14614114"
}

# ─────────────────────────────────────────────
# Connexion
# ─────────────────────────────────────────────

def get_connection():
    """Retourne une connexion PostgreSQL."""
    return psycopg2.connect(**DB_CONFIG)

@contextmanager
def get_cursor():
    """
    Context manager : ouvre connexion + curseur, commit auto, ferme proprement.
    Usage :
        with get_cursor() as cur:
            cur.execute("SELECT * FROM capteurs")
            rows = cur.fetchall()
    """
    conn = get_connection()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        yield cur
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cur.close()
        conn.close()

def test_connection():
    """Teste la connexion à la base de données."""
    try:
        with get_cursor() as cur:
            cur.execute("SELECT version();")
            version = cur.fetchone()
            print(f"[OK] Connexion reussie !")
            print(f"   PostgreSQL : {version['version'][:50]}")
            return True
    except Exception as e:
        print(f"[ERROR] Connexion echouee : {e}")
        return False

if __name__ == "__main__":
    test_connection()