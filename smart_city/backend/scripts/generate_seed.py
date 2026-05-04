import random
from datetime import datetime, timedelta
import os

def generate_sql():
    sql = ["-- Seed Data for Neo-Sousse 2030 Smart City (with TimescaleDB)\n"]
    
    # 1. Citoyens (100 citizens)
    sql.append("-- Citoyens")
    first_names = ["Ali", "Sara", "Mohamed", "Fatma", "Youssef", "Amina", "Omar", "Leila", "Karim", "Nour"]
    last_names = ["Ben Ali", "Trabelsi", "Gharbi", "Mansour", "Bouazizi", "Jaziri", "Mabrouk", "Haddad", "Khemiri"]
    
    for i in range(1, 101):
        nom = f"{random.choice(first_names)} {random.choice(last_names)}"
        email = f"citoyen{i}@neosousse.tn"
        score = random.randint(20, 100)
        sql.append(f"INSERT INTO citoyens (nom, email, score_ecologique) VALUES ('{nom}', '{email}', {score});")
    sql.append("")

    # 2. Vehicules (20 vehicles)
    sql.append("-- Vehicules")
    etats_v = ['STATIONNÉ', 'EN_ROUTE', 'EN_PANNE', 'ARRIVÉ']
    for i in range(1, 21):
        matricule = f"NS-2030-{i:03d}"
        capacite = random.choice([2, 4, 10, 20])
        etat = random.choice(etats_v)
        batterie = random.randint(10, 100)
        co2 = round(random.uniform(10.0, 500.0), 2)
        loc = f"Zone {random.randint(1, 10)}"
        sql.append(f"INSERT INTO vehicules (matricule, capacite, etat, niveau_batterie, co2_economise_kg, localisation_actuelle) VALUES ('{matricule}', {capacite}, '{etat}', {batterie}, {co2}, '{loc}');")
    sql.append("")

    # 3. Capteurs (50 sensors)
    sql.append("-- Capteurs")
    types_c = ['Air', 'Trafic', 'Energie', 'Dechets']
    etats_c = ['INACTIF', 'ACTIF', 'SIGNALÉ', 'EN_MAINTENANCE', 'HORS_SERVICE']
    for i in range(1, 51):
        ref = f"C-{i:03d}"
        type_c = random.choice(types_c)
        loc = f"Secteur {random.randint(1, 15)}"
        etat = random.choices(etats_c, weights=[5, 70, 10, 10, 5])[0]
        sql.append(f"INSERT INTO capteurs (reference, type_capteur, localisation, etat) VALUES ('{ref}', '{type_c}', '{loc}', '{etat}');")
    sql.append("")

    # 4. Interventions (100 interventions)
    sql.append("-- Interventions")
    etats_i = ['DEMANDE', 'TECH1_ASSIGNÉ', 'TECH2_VALIDE', 'IA_VALIDE', 'TERMINÉ']
    for i in range(1, 101):
        target_type = random.choice(['capteur', 'vehicule'])
        etat = random.choice(etats_i)
        desc = "Maintenance de routine" if random.random() > 0.3 else "Reparation suite a une panne"
        if target_type == 'capteur':
            cap_id = random.randint(1, 50)
            sql.append(f"INSERT INTO interventions (capteur_id, description, etat) VALUES ({cap_id}, '{desc}', '{etat}');")
        else:
            veh_id = random.randint(1, 20)
            sql.append(f"INSERT INTO interventions (vehicule_id, description, etat) VALUES ({veh_id}, '{desc}', '{etat}');")
    sql.append("")

    # 5. Mesures (1000 measurements for TimescaleDB hypertable)
    sql.append("-- Mesures (Time-series data for TimescaleDB hypertable)")
    base_time = datetime.now() - timedelta(days=7)
    
    for i in range(1000):
        time_offset = timedelta(minutes=random.randint(0, 7 * 24 * 60))
        measure_time = base_time + time_offset
        time_str = measure_time.strftime('%Y-%m-%d %H:%M:%S')
        cap_id = random.randint(1, 50)
        valeur = round(random.uniform(0.0, 100.0), 2)
        unite = random.choice(['ppm', 'Celsius', 'kWh', 'veh/h'])
        
        sql.append(f"INSERT INTO mesures (time, capteur_id, valeur, unite) VALUES ('{time_str}', {cap_id}, {valeur}, '{unite}');")

    # Save to the database directory
    output_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'database', 'seed_data.sql')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(sql))
    
    print(f"seed_data.sql generated successfully at {output_path}.")

if __name__ == "__main__":
    generate_sql()
