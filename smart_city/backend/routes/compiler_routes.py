from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database.db import get_db_connection
from datetime import date, datetime
from decimal import Decimal
from openai import OpenAI
import re

router = APIRouter()

# Ollama runs locally — no API key needed, just point to localhost
client = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama"  # required by the library but ignored by Ollama
)

OLLAMA_MODEL = "qwen2.5-coder:7b"


class QueryRequest(BaseModel):
    query: str


def make_json_safe(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return value


def clean_sql(sql: str) -> str:
    sql = sql.strip()
    sql = sql.replace("```sql", "")
    sql = sql.replace("```", "")
    sql = sql.strip()

    if not sql.endswith(";"):
        sql += ";"

    return sql


def validate_sql(sql: str) -> str:
    sql = sql.strip()
    sql_upper = sql.upper()

    if not sql_upper.startswith("SELECT"):
        raise ValueError("Only SELECT queries are allowed.")

    forbidden = [
        "INSERT", "UPDATE", "DELETE", "DROP", "ALTER",
        "CREATE", "TRUNCATE", "GRANT", "REVOKE", "COPY",
        "EXEC", "CALL"
    ]

    for word in forbidden:
        if re.search(rf"\b{word}\b", sql_upper):
            raise ValueError(f"Forbidden SQL keyword detected: {word}")

    allowed_tables = [
        "capteurs",
        "citoyens",
        "interventions",
        "vehicules",
        "mesures"
    ]

    if not any(table in sql.lower() for table in allowed_tables):
        raise ValueError("SQL must use an allowed table.")

    return sql


def ai_generate_sql(question: str) -> str:
    prompt = f"""You are an intelligent SQL translator.

Your job:
Convert ANY user question into a correct PostgreSQL SELECT query.

The user may:
- speak French, English, or mix
- make spelling mistakes
- use bad grammar

You MUST:
1. Understand the meaning
2. Choose the correct table
3. Generate the correct SQL

----------------------
DATABASE SCHEMA
----------------------

capteurs(id, reference, type_capteur, localisation, etat, date_installation)
citoyens(id, nom, email, score_ecologique, date_inscription)
interventions(id, capteur_id, vehicule_id, description, etat, date_creation)
vehicules(id, matricule, capacite, etat, niveau_batterie, co2_economise_kg, localisation_actuelle)
mesures(time, capteur_id, valeur)

----------------------
WORD → TABLE MAPPING
----------------------

capteur / capteurs / sensor / sensors → capteurs
citoyen / citoyens / citizen / citizens / people → citoyens
vehicule / vehicules / véhicule / véhicules / vehicle / vehicles / car → vehicules
intervention → interventions
mesure / measurement → mesures

----------------------
LOGIC RULES
----------------------

- "combien", "how many", "count", "number" → use COUNT(*)
- "actif" / "active" → etat = 'ACTIF'
- "inactif" / "inactive" → etat = 'INACTIF'
- "hors service" / "broken" / "panne" → etat = 'HORS_SERVICE'
- "maintenance" → etat = 'EN_MAINTENANCE'
- "score > 80" → score_ecologique > 80
- "last 24 hours" → time > NOW() - INTERVAL '24 hours'
- "latest" → ORDER BY id DESC
- if listing → LIMIT 20

----------------------
STRICT RULES
----------------------

- Return ONLY the raw SQL query
- Only SELECT queries are allowed
- No explanation, no comments
- No markdown, no backticks

----------------------
USER QUESTION:
{question}"""

    try:
        response = client.chat.completions.create(
            model=OLLAMA_MODEL,
            messages=[
                {"role": "system", "content": "You convert natural language to PostgreSQL SELECT queries. Return only raw SQL, nothing else."},
                {"role": "user", "content": prompt}
            ],
            temperature=0
        )

        sql = response.choices[0].message.content.strip()
        sql = clean_sql(sql)

        print("Ollama SQL:", sql)
        return sql

    except Exception as e:
        print("Ollama error:", str(e))
        raise ValueError(f"Ollama is not reachable. Make sure it is running with: ollama serve\nError: {str(e)}")


@router.post("/compile")
def compile_query(req: QueryRequest):
    print("\n=== OLLAMA COMPILE START ===")
    print("Question:", req.query)

    try:
        sql = ai_generate_sql(req.query)

        # Generate debug info for the "Lab"
        tokens = re.findall(r"\w+", req.query.lower())
        
        # Simple rule-based AST extraction for visualization
        ast = {
            "type": "SelectStatement",
            "table": "mesures" if "mesure" in req.query.lower() else ("capteurs" if "capteur" in req.query.lower() else "unknown"),
            "filters": [t for t in tokens if t in ["actif", "inactif", "panne", "sousse"]],
            "limit": 20
        }

        return {
            "tokens": tokens,
            "ast": ast,
            "sql": sql,
            "source": "ollama_local"
        }

    except Exception as e:
        print("COMPILE ERROR:", str(e))
        raise HTTPException(status_code=400, detail=f"Compile error: {str(e)}")


@router.post("/execute")
def execute_query(req: QueryRequest):
    print("\n=== EXECUTE START ===")
    print("SQL:", req.query)

    conn = get_db_connection()

    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        sql = validate_sql(req.query)

        cursor = conn.cursor()
        cursor.execute(sql)

        if cursor.description:
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()

            results = []

            for row in rows:
                item = {}
                for col, val in zip(columns, row):
                    item[col] = make_json_safe(val)
                results.append(item)

            print("Rows returned:", len(results))
            return {"results": results}

        return {"results": []}

    except Exception as e:
        conn.rollback()
        print("EXECUTE ERROR:", str(e))
        raise HTTPException(status_code=400, detail=f"Execute error: {str(e)}")

    finally:
        conn.close()