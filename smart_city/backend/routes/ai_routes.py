from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ai.openai_module import generate_report
from database.db import get_db_connection

router = APIRouter()

class ReportRequest(BaseModel):
    query: str
    
@router.post("/report")
def create_report(req: ReportRequest):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="La connexion à la base de données a échoué.")
        
    try:
        cursor = conn.cursor()
        print(f"[AI REPORT] Executing query: {req.query}")
        cursor.execute(req.query)
        
        if cursor.description is None:
            data_summary = "La requête n'a retourné aucun résultat structuré."
        else:
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            
            # Format data as text
            data_summary = ""
            for i, row in enumerate(rows):
                if i >= 20: # Limit data sent to API to avoid token overflow
                    data_summary += "... [Données tronquées pour l'analyse] ..."
                    break
                data_summary += str(dict(zip(columns, row))) + "\n"
            
            if not data_summary:
                data_summary = "Aucune donnée trouvée dans la base de données pour cette demande."
            
        print(f"[AI REPORT] Sending to OpenAI: {len(data_summary)} chars")
        report = generate_report(data_summary)
        return {"report": report}
        
    except Exception as e:
        print(f"[AI REPORT] Error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Erreur d'analyse des données : {str(e)}")
    finally:
        conn.close()
