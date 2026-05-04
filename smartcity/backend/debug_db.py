import sys
import os
base = os.path.dirname(os.path.abspath(__file__))
parent = os.path.dirname(base)
sys.path.insert(0, os.path.join(parent, 'bdd'))
from db_config import get_cursor

def check_db():
    try:
        with get_cursor() as cur:
            cur.execute("SELECT statut, COUNT(*) FROM capteurs GROUP BY statut")
            print("Status distribution:")
            for r in cur.fetchall():
                print(r)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_db()
