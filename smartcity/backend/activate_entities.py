import sys
import os
base = os.path.dirname(os.path.abspath(__file__))
parent = os.path.dirname(base)
sys.path.insert(0, os.path.join(parent, 'bdd'))
from db_config import get_cursor

def activate():
    try:
        with get_cursor() as cur:
            cur.execute("UPDATE capteurs SET statut = 'ACTIF' WHERE id IN (SELECT id FROM capteurs LIMIT 20)")
            print("20 capteurs actives avec succes !")
            
            cur.execute("UPDATE vehicules SET statut = 'EN_ROUTE' WHERE id IN (SELECT id FROM vehicules LIMIT 10)")
            print("10 vehicules mis en route !")
    except Exception as e:
        print(f"Erreur : {e}")

if __name__ == "__main__":
    activate()
