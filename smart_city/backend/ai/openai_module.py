import os
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

client = OpenAI(
    api_key=os.environ.get("OPENAI_API_KEY"),
)

def generate_report(data_summary: str) -> str:
    """
    Generates an analytical report based on database query results.
    """
    prompt = f"""
    En tant qu'expert en gestion de ville intelligente pour Neo-Sousse 2030,
    analyse les données suivantes et rédige un rapport concis en français.
    Propose également une ou deux actions aux gestionnaires urbains.
    
    Données :
    {data_summary}
    """
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "Tu es l'IA gestionnaire de la ville intelligente Neo-Sousse 2030. Tes rapports sont professionnels et structurés."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=300,
            temperature=0.7
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Erreur lors de la génération du rapport : {str(e)}"

def validate_transition(entity_type: str, event: str, current_state: str) -> bool:
    """
    Bonus: Validate an automata transition using OpenAI.
    """
    prompt = f"Est-ce que la transition '{event}' est logique pour une entité '{entity_type}' passant de l'état '{current_state}' ? Répond par OUI ou NON."
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "Tu es un validateur logique d'automates à états finis."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=10,
            temperature=0
        )
        answer = response.choices[0].message.content.strip().upper()
        return "OUI" in answer
    except Exception as e:
        return False
