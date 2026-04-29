"""
GENERATE_DATA.PY — Génération de données réalistes pour Smart City Neo-Sousse 2030
"""

import sys
import os
import random
import datetime

base = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(base, 'bdd'))

from db_config import get_cursor, test_connection

# ══════════════════════════════════════════════════════════════
# DONNÉES
# ══════════════════════════════════════════════════════════════

ZONES = ['centre', 'nord', 'sud', 'est', 'ouest', 'port', 'medina', 'corniche']
TYPES_CAPTEURS = ['pollution', 'temperature', 'humidite', 'bruit', 'co2', 'trafic']
STATUTS_CAPTEURS = ['ACTIF', 'INACTIF', 'SIGNALE', 'EN_MAINTENANCE', 'HORS_SERVICE']
STATUTS_INTERVENTIONS = ['DEMANDE', 'TECH1_ASSIGNE', 'TECH2_VALIDE', 'IA_VALIDE', 'TERMINE']
STATUTS_VEHICULES = ['STATIONNE', 'EN_ROUTE', 'EN_PANNE', 'ARRIVE']
TYPES_VEHICULES = ['bus', 'voiture', 'camion', 'moto', 'scooter']

NOMS = ['Ali', 'Salma', 'Omar', 'Fatma', 'Mohamed', 'Amira']
ADRESSES = ['Sousse', 'Tunis', 'Sfax', 'Monastir']

# ══════════════════════════════════════════════════════════════
# TABLES
# ══════════════════════════════════════════════════════════════

def creer_tables():
    with get_cursor() as cur:

        cur.execute("""
        CREATE TABLE IF NOT EXISTS capteurs (
            id SERIAL PRIMARY KEY,
            type VARCHAR(50),
            zone VARCHAR(50),
            statut VARCHAR(30),
            date_installation DATE
        );
        """)

        cur.execute("""
        CREATE TABLE IF NOT EXISTS citoyens (
            id SERIAL PRIMARY KEY,
            nom VARCHAR(100),
            score_ecolo NUMERIC,
            adresse VARCHAR(100)
        );
        """)

        cur.execute("""
        CREATE TABLE IF NOT EXISTS interventions (
            id SERIAL PRIMARY KEY,
            capteur_id INTEGER REFERENCES capteurs(id),
            technicien1_id INTEGER,
            technicien2_id INTEGER,
            statut VARCHAR(30),
            date DATE
        );
        """)

        cur.execute("""
        CREATE TABLE IF NOT EXISTS vehicules (
            id SERIAL PRIMARY KEY,
            type VARCHAR(50),
            trajet_id INTEGER,
            statut VARCHAR(30)
        );
        """)

        cur.execute("""
        CREATE TABLE IF NOT EXISTS mesures (
            id SERIAL PRIMARY KEY,
            capteur_id INTEGER REFERENCES capteurs(id),
            type_mesure VARCHAR(50),
            valeur NUMERIC,
            date TIMESTAMP
        );
        """)

# ══════════════════════════════════════════════════════════════
# GÉNÉRATION
# ══════════════════════════════════════════════════════════════

def generer_capteurs(nb=50):
    capteurs = []

    with get_cursor() as cur:
        cur.execute("TRUNCATE capteurs CASCADE;")

        for i in range(nb):
            cur.execute("""
            INSERT INTO capteurs (type, zone, statut, date_installation)
            VALUES (%s,%s,%s,%s) RETURNING id
            """, (
                random.choice(TYPES_CAPTEURS),
                random.choice(ZONES),
                random.choice(STATUTS_CAPTEURS),
                datetime.date.today()
            ))

            capteurs.append(cur.fetchone()['id'])

    return capteurs


def generer_citoyens(nb=100):
    with get_cursor() as cur:
        cur.execute("TRUNCATE citoyens;")

        for i in range(nb):
            cur.execute("""
            INSERT INTO citoyens (nom, score_ecolo, adresse)
            VALUES (%s,%s,%s)
            """, (
                random.choice(NOMS),
                random.randint(20, 100),
                random.choice(ADRESSES)
            ))


def generer_vehicules(nb=30):
    with get_cursor() as cur:
        cur.execute("TRUNCATE vehicules;")

        for i in range(nb):
            cur.execute("""
            INSERT INTO vehicules (type, trajet_id, statut)
            VALUES (%s,%s,%s)
            """, (
                random.choice(TYPES_VEHICULES),
                random.randint(1, 20),
                random.choice(STATUTS_VEHICULES)
            ))


def generer_interventions(capteurs, nb=80):
    with get_cursor() as cur:
        cur.execute("TRUNCATE interventions;")

        for i in range(nb):
            cur.execute("""
            INSERT INTO interventions (capteur_id, technicien1_id, technicien2_id, statut, date)
            VALUES (%s,%s,%s,%s,%s)
            """, (
                random.choice(capteurs),
                random.randint(1, 10),
                random.randint(1, 10),
                random.choice(STATUTS_INTERVENTIONS),
                datetime.date.today()
            ))


def generer_mesures(capteurs, nb=1000):
    with get_cursor() as cur:
        cur.execute("TRUNCATE mesures;")

        for i in range(nb):
            cur.execute("""
            INSERT INTO mesures (capteur_id, type_mesure, valeur, date)
            VALUES (%s,%s,%s,%s)
            """, (
                random.choice(capteurs),
                "pollution",
                round(random.uniform(10, 150), 2),
                datetime.datetime.now()
            ))

# ══════════════════════════════════════════════════════════════
# ANALYSE INTELLIGENTE 🔥
# ══════════════════════════════════════════════════════════════

def detecter_anomalies():
    print("\n🚨 Détection anomalies")

    with get_cursor() as cur:
        cur.execute("""
        SELECT COUNT(*) as n FROM mesures
        WHERE type_mesure='pollution' AND valeur > 120
        """)

        n = cur.fetchone()['n']
        print(f"⚠️ {n} anomalies détectées")


def generer_rapport_ia():
    print("\n🤖 Rapport IA")

    with get_cursor() as cur:
        cur.execute("SELECT COUNT(*) as n FROM capteurs WHERE statut='HORS_SERVICE'")
        hs = cur.fetchone()['n']

        cur.execute("SELECT AVG(valeur) as avg FROM mesures")
        avg = cur.fetchone()['avg']

        print(f"Capteurs HS : {hs}")
        print(f"Moyenne pollution : {round(avg,2)}")

        if hs > 5:
            print("⚠️ Intervention recommandée")


def verifier_alertes():
    print("\n🔔 Alertes")

    with get_cursor() as cur:
        cur.execute("SELECT COUNT(*) as n FROM capteurs WHERE statut='HORS_SERVICE'")
        n = cur.fetchone()['n']

        if n > 10:
            print("🚨 ALERTE CRITIQUE")
        elif n > 5:
            print("⚠️ ALERTE")
        else:
            print("✅ OK")

# ══════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════

if __name__ == "__main__":

    if not test_connection():
        print("❌ DB non connectée")
        sys.exit(1)

    creer_tables()

    capteurs = generer_capteurs()
    generer_citoyens()
    generer_vehicules()
    generer_interventions(capteurs)
    generer_mesures(capteurs)

    # 🔥 INTELLIGENCE
    detecter_anomalies()
    generer_rapport_ia()
    verifier_alertes()

    print("\n✅ DONE")