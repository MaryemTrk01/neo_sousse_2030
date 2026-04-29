import psycopg2

def get_data(query):
    conn = None
    try:
        conn = psycopg2.connect(
            dbname="smartcity",       # nom de ta base
            user="postgres",          # ton utilisateur
            password="salma",   # ton mot de passe
            host="localhost",         # serveur
            port="5434"               # port par défaut
        )
        conn.set_client_encoding('UTF8')  # 🔹 corrige les problèmes d'accents
        cur = conn.cursor()
        cur.execute(query)
        rows = cur.fetchall()
        return rows
    except Exception as e:
        print("❌ Erreur lors de l’exécution :", e)
        return []
    finally:
        if conn is not None:
            conn.close()
