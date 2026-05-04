from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from automata.engine import get_automata
from database.db import get_db_connection
from ai.openai_module import validate_transition

router = APIRouter()

class TransitionRequest(BaseModel):
    entity_type: str
    entity_id: int
    event: str

@router.get("/{entity_type}/{entity_id}")
def get_automata_state(entity_type: str, entity_id: int):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    table_map = {
        'capteur': 'capteurs',
        'intervention': 'interventions',
        'vehicule': 'vehicules'
    }
    
    if entity_type not in table_map:
        raise HTTPException(status_code=400, detail="Invalid entity type")
        
    try:
        cursor = conn.cursor()
        cursor.execute(f"SELECT etat FROM {table_map[entity_type]} WHERE id = %s", (entity_id,))
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Entity not found")
            
        return {"entity_type": entity_type, "entity_id": entity_id, "state": result[0]}
    finally:
        conn.close()

@router.post("/transition")
def trigger_transition(req: TransitionRequest):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
        
    table_map = {
        'capteur': 'capteurs',
        'intervention': 'interventions',
        'vehicule': 'vehicules'
    }
    
    if req.entity_type not in table_map:
        raise HTTPException(status_code=400, detail="Invalid entity type")
        
    try:
        cursor = conn.cursor()
        cursor.execute(f"SELECT etat FROM {table_map[req.entity_type]} WHERE id = %s", (req.entity_id,))
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Entity not found")
            
        current_state = result[0]
        
        # Optionally validate with AI
        if req.entity_type == 'intervention' and req.event == 'valider_ia':
            is_valid = validate_transition(req.entity_type, req.event, current_state)
            if not is_valid:
                raise HTTPException(status_code=400, detail="AI Validation failed for this transition")

        machine = get_automata(req.entity_type, current_state)
        
        try:
            # Trigger the event
            getattr(machine, req.event)()
            new_state = machine.state
            
            # Update DB
            cursor.execute(f"UPDATE {table_map[req.entity_type]} SET etat = %s WHERE id = %s", (new_state, req.entity_id))
            conn.commit()
            
            return {"message": "Transition successful", "new_state": new_state}
            
        except AttributeError:
            raise HTTPException(status_code=400, detail=f"Invalid event '{req.event}' for state '{current_state}'")
        except Exception as e:
             raise HTTPException(status_code=400, detail=f"Transition error: {str(e)}")

    finally:
        conn.close()
