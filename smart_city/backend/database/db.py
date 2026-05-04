import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    try:
        print("Connecting to DB...")
        print("HOST:", os.environ.get("DB_HOST", "localhost"))
        print("PORT:", os.environ.get("DB_PORT", "5433"))
        print("DB:", os.environ.get("DB_NAME", "smart_city"))
        print("USER:", os.environ.get("DB_USER", "postgres"))

        conn = psycopg2.connect(
            host=os.environ.get("DB_HOST", "localhost"),
            port=os.environ.get("DB_PORT", "5433"),
            database=os.environ.get("DB_NAME", "smart_city"),
            user=os.environ.get("DB_USER", "postgres"),
            password=os.environ.get("DB_PASSWORD", "14614114")
        )

        print("DB CONNECTED OK")
        return conn

    except Exception as e:
        print("DB CONNECTION ERROR:", e)
        return None