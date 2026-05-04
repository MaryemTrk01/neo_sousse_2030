import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def add_vehicles():
    try:
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST'),
            port=os.getenv('DB_PORT'),
            database=os.getenv('DB_NAME'),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD')
        )
        cur = conn.cursor()
        
        vehicles = [
            ('TRUCK-001', 5000, 'STATIONNÉ', 90, 0, 'Port de Sousse'),
            ('TRUCK-002', 5000, 'STATIONNÉ', 85, 0, 'Messaadine'),
            ('MOTO-001', 50, 'STATIONNÉ', 100, 0, 'Sousse Médina'),
            ('MOTO-002', 50, 'STATIONNÉ', 95, 0, 'Hammam Sousse'),
            ('BUS-001', 500, 'STATIONNÉ', 80, 0, 'Akouda'),
            ('BUS-002', 500, 'STATIONNÉ', 75, 0, 'Sousse Riadh')
        ]
        
        for v in vehicles:
            cur.execute(
                "INSERT INTO vehicules (matricule, capacite, etat, niveau_batterie, co2_economise_kg, localisation_actuelle) VALUES (%s, %s, %s, %s, %s, %s)",
                v
            )
        
        conn.commit()
        print(f"Successfully added {len(vehicles)} new vehicles.")
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    add_vehicles()
