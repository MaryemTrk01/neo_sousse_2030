"""
IA_CHAT.PY — Assistant IA Interactif avec Ollama/Mistral (100% gratuit et local)
Smart City Neo-Sousse 2030
"""

import sys
import os
import json
import datetime
import urllib.request
import urllib.error

base = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(base, 'bdd'))

from db_config import get_cursor, test_connection

OLLAMA_URL   = "http://localhost:11434/api/chat"
OLLAMA_MODEL = "llama3.2"


def collecter_contexte_bd() -> str:
    try:
        with get_cursor() as cur:
            cur.execute("SELECT id, type, zone, statut FROM capteurs ORDER BY id")
            capteurs = [dict(r) for r in cur.fetchall()]
            cur.execute("SELECT id, capteur_id, statut, date FROM interventions ORDER BY id")
            interventions = []
            for r in cur.fetchall():
                d = dict(r)
                d['date'] = str(d.get('date', ''))
                interventions.append(d)
            cur.execute("SELECT capteur_id, type_mesure, valeur, date FROM mesures ORDER BY date DESC LIMIT 10")
            mesures = []
            for r in cur.fetchall():
                d = dict(r)
                d['date'] = str(d.get('date', ''))
                mesures.append(d)
            cur.execute("SELECT id, nom, score_ecolo, adresse FROM citoyens")
            citoyens = [dict(r) for r in cur.fetchall()]
            cur.execute("SELECT id, type, statut FROM vehicules")
            vehicules = [dict(r) for r in cur.fetchall()]

        nb_hs = len([c for c in capteurs if c['statut'] == 'HORS_SERVICE'])
        nb_actifs = len([c for c in capteurs if c['statut'] == 'ACTIF'])
        scores = [c['score_ecolo'] for c in citoyens if c.get('score_ecolo')]
        score_moyen = round(sum(scores)/len(scores), 1) if scores else 0

        return f"""
=== DONNÉES TEMPS RÉEL — Smart City Neo-Sousse 2030 — {datetime.date.today()} ===
CAPTEURS ({len(capteurs)} total | {nb_actifs} actifs | {nb_hs} hors service) :
{json.dumps(capteurs, ensure_ascii=False, indent=2)}
INTERVENTIONS :
{json.dumps(interventions, ensure_ascii=False, indent=2)}
MESURES RÉCENTES :
{json.dumps(mesures, ensure_ascii=False, indent=2)}
CITOYENS (score moyen: {score_moyen}/100) :
{json.dumps(citoyens, ensure_ascii=False, indent=2)}
VÉHICULES :
{json.dumps(vehicules, ensure_ascii=False, indent=2)}
"""
    except Exception as e:
        return f"[Erreur BD : {e}]"


def appeler_ollama(historique: list, contexte_bd: str) -> str:
    system_prompt = f"""Tu es ARIA (Assistant de Renseignement Intelligent et Analytique),
l'IA officielle de la ville intelligente Neo-Sousse 2030.
Tu reponds TOUJOURS en francais a toutes les questions des gestionnaires urbains.
Tu analyses les donnees de la ville, generes des rapports, suggeres des actions.
Tu reponds aussi aux questions generales. Sois precis et professionnel.
{contexte_bd}"""

    messages = [{"role": "system", "content": system_prompt}]
    for msg in historique:
        messages.append({"role": msg["role"], "content": msg["content"]})

    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "options": {"num_predict": 1000, "temperature": 0.7}
    }

    try:
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            OLLAMA_URL, data=data,
            headers={"Content-Type": "application/json"}, method="POST"
        )
        with urllib.request.urlopen(req, timeout=120) as response:
            result = json.loads(response.read().decode('utf-8'))
            return result['message']['content'].strip()
    except urllib.error.URLError as e:
        return f"Ollama non disponible. Lance : ollama serve\nDetail : {e}"
    except Exception as e:
        return f"Erreur : {e}"


class AssistantIA:
    def __init__(self):
        self.historique = []
        self.contexte_bd = ""

    def rafraichir_contexte(self):
        print("  Chargement des donnees depuis PostgreSQL...")
        self.contexte_bd = collecter_contexte_bd()
        print("  Donnees chargees.\n")

    def poser_question(self, question: str) -> str:
        self.historique.append({"role": "user", "content": question})
        reponse = appeler_ollama(self.historique, self.contexte_bd)
        self.historique.append({"role": "assistant", "content": reponse})
        if len(self.historique) > 20:
            self.historique = self.historique[-20:]
        return reponse


def mode_interactif():
    print("\n" + "="*60)
    print("  ARIA — Assistant IA Smart City Neo-Sousse 2030")
    print("  Propulse par Ollama/Mistral (100% local et gratuit)")
    print("="*60)
    print("  'rafraichir' -> recharger les donnees BD")
    print("  'effacer'    -> effacer l'historique")
    print("  'quitter'    -> quitter")
    print("="*60 + "\n")

    if not test_connection():
        print("PostgreSQL non disponible.")
        sys.exit(1)

    assistant = AssistantIA()
    assistant.rafraichir_contexte()
    print("  Posez vos questions en francais\n")

    while True:
        try:
            question = input("Vous > ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nAu revoir !")
            break

        if not question:
            continue
        if question.lower() == "quitter":
            print("Au revoir !")
            break
        if question.lower() == "rafraichir":
            assistant.rafraichir_contexte()
            continue
        if question.lower() == "effacer":
            assistant.historique = []
            print("  Historique efface.\n")
            continue

        print("\nARIA > ", end="", flush=True)
        reponse = assistant.poser_question(question)
        print(reponse + "\n")


if __name__ == "__main__":
    mode_interactif()