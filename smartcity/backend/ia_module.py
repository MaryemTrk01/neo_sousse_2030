"""
IA_MODULE.PY — Module d'Intelligence Artificielle Générative
Smart City Neo-Sousse 2030 — Propulsé par Google Gemini

Ce module fournit :
  - Collecte de données temps réel depuis PostgreSQL
  - Génération de rapports journaliers professionnels
  - Suggestions d'actions prioritaires pour les gestionnaires
  - Validation intelligente des transitions d'automates
  - Chat interactif avec ARIA (assistant IA de la ville)

Usage :
    from ia_module import IAGenerative
    ia = IAGenerative()
    rapport = ia.rapport_journalier()
"""

import sys
import os
import json
import datetime
import urllib.request
import urllib.error

# ── Configuration des chemins ──
base = os.path.dirname(os.path.abspath(__file__))
parent = os.path.dirname(base)
sys.path.insert(0, os.path.join(parent, 'bdd'))

from db_config import get_cursor, get_connection

# ── Configuration Ollama (Local) ──
OLLAMA_URL   = "http://localhost:11434/api/chat"
OLLAMA_MODEL = "llama3.2" 


# ══════════════════════════════════════════════════════════════
# COLLECTE DES DONNÉES DEPUIS POSTGRESQL
# ══════════════════════════════════════════════════════════════

def collecter_donnees_bd() -> dict:
    """Collecte toutes les données utiles depuis la base smartcity."""
    donnees = {}
    try:
        with get_cursor() as cur:
            # Capteurs
            cur.execute("SELECT id, type, zone, statut, date_installation FROM capteurs ORDER BY id")
            donnees['capteurs'] = [dict(r) for r in cur.fetchall()]

            # Interventions
            cur.execute("""
                SELECT id, capteur_id, technicien1_id, technicien2_id, statut, date
                FROM interventions ORDER BY id
            """)
            interventions = []
            for r in cur.fetchall():
                d = dict(r)
                if d.get('date'):
                    d['date'] = str(d['date'])
                interventions.append(d)
            donnees['interventions'] = interventions

            # Mesures (les 50 dernières pour les graphiques)
            cur.execute("""
                SELECT id, capteur_id, type_mesure, valeur, date
                FROM mesures ORDER BY date DESC LIMIT 50
            """)
            mesures = []
            for r in cur.fetchall():
                d = dict(r)
                if d.get('date'):
                    d['date'] = str(d['date'])
                mesures.append(d)
            donnees['mesures'] = mesures

            # Citoyens
            cur.execute("SELECT id, nom, score_ecolo, adresse FROM citoyens ORDER BY id")
            donnees['citoyens'] = [dict(r) for r in cur.fetchall()]

            # Véhicules
            cur.execute("SELECT id, type, trajet_id, statut FROM vehicules ORDER BY id")
            donnees['vehicules'] = [dict(r) for r in cur.fetchall()]

    except Exception as e:
        print(f"[Erreur collecte BD] {e}")
    return donnees


def statistiques_rapides(donnees: dict) -> dict:
    """Calcule des KPIs depuis les données collectées."""
    stats = {}

    # Capteurs
    capteurs = donnees.get('capteurs', [])
    stats['total_capteurs'] = len(capteurs)
    stats['capteurs_actifs'] = len([c for c in capteurs if c.get('statut') == 'ACTIF'])
    stats['capteurs_hs'] = len([c for c in capteurs if c.get('statut') == 'HORS_SERVICE'])
    stats['capteurs_signales'] = len([c for c in capteurs if c.get('statut') == 'SIGNALE'])
    stats['capteurs_maintenance'] = len([c for c in capteurs if c.get('statut') == 'EN_MAINTENANCE'])
    stats['capteurs_hs_details'] = [c for c in capteurs if c.get('statut') == 'HORS_SERVICE']

    # Interventions
    interventions = donnees.get('interventions', [])
    stats['total_interventions'] = len(interventions)
    stats['interventions_en_cours'] = len([i for i in interventions if i.get('statut') not in ('TERMINE',)])
    stats['interventions_terminees'] = len([i for i in interventions if i.get('statut') == 'TERMINE'])

    # Mesures
    mesures = donnees.get('mesures', [])
    valeurs = [float(m['valeur']) for m in mesures if m.get('valeur') is not None]
    stats['moyenne_mesures'] = round(sum(valeurs) / len(valeurs), 2) if valeurs else 0
    stats['max_mesure'] = round(max(valeurs), 2) if valeurs else 0
    stats['min_mesure'] = round(min(valeurs), 2) if valeurs else 0

    # Véhicules
    vehicules = donnees.get('vehicules', [])
    stats['total_vehicules'] = len(vehicules)
    stats['vehicules_en_route'] = len([v for v in vehicules if v.get('statut') == 'EN_ROUTE'])
    stats['vehicules_en_panne'] = len([v for v in vehicules if v.get('statut') == 'EN_PANNE'])
    stats['vehicules_panne_details'] = [v for v in vehicules if v.get('statut') == 'EN_PANNE']

    # Citoyens
    citoyens = donnees.get('citoyens', [])
    scores = [c['score_ecolo'] for c in citoyens if c.get('score_ecolo') is not None]
    stats['score_moyen_citoyens'] = round(sum(scores) / len(scores), 2) if scores else 0
    stats['total_citoyens'] = len(citoyens)

    return stats


# ══════════════════════════════════════════════════════════════
# APPEL À L'API OLLAMA (Local)
# ══════════════════════════════════════════════════════════════

def rapport_professionnel_local(stats: dict, date_rapport: str) -> str:
    """Construit un rapport professionnel sans dependance a l'IA externe."""
    total_capteurs = stats.get('total_capteurs', 0)
    capteurs_actifs = stats.get('capteurs_actifs', 0)
    capteurs_hs = stats.get('capteurs_hs', 0)
    capteurs_signales = stats.get('capteurs_signales', 0)
    capteurs_maintenance = stats.get('capteurs_maintenance', 0)
    total_interventions = stats.get('total_interventions', 0)
    interventions_en_cours = stats.get('interventions_en_cours', 0)
    interventions_terminees = stats.get('interventions_terminees', 0)
    total_vehicules = stats.get('total_vehicules', 0)
    vehicules_en_route = stats.get('vehicules_en_route', 0)
    vehicules_en_panne = stats.get('vehicules_en_panne', 0)
    total_citoyens = stats.get('total_citoyens', 0)
    score_citoyens = stats.get('score_moyen_citoyens', 0)
    moyenne_mesures = stats.get('moyenne_mesures', 0)
    max_mesure = stats.get('max_mesure', 0)

    disponibilite = round((capteurs_actifs / total_capteurs) * 100, 1) if total_capteurs else 0
    taux_interventions = round((interventions_terminees / total_interventions) * 100, 1) if total_interventions else 0
    taux_panne_flotte = round((vehicules_en_panne / total_vehicules) * 100, 1) if total_vehicules else 0

    niveau_risque = "faible"
    if capteurs_hs > 0 or vehicules_en_panne > 0 or capteurs_signales > total_capteurs * 0.25:
        niveau_risque = "eleve"
    elif capteurs_signales > 0 or interventions_en_cours > 0:
        niveau_risque = "modere"

    priorites = []
    if capteurs_hs:
        priorites.append(f"- Priorite haute : traiter {capteurs_hs} capteur(s) hors service.")
    if vehicules_en_panne:
        priorites.append(f"- Priorite haute : deployer une equipe pour {vehicules_en_panne} vehicule(s) en panne.")
    if capteurs_signales:
        priorites.append(f"- Priorite moyenne : verifier {capteurs_signales} capteur(s) signale(s).")
    if interventions_en_cours:
        priorites.append(f"- Priorite moyenne : suivre {interventions_en_cours} intervention(s) encore ouverte(s).")
    if not priorites:
        priorites.append("- Priorite basse : maintenir la surveillance et conserver le rythme de controle actuel.")

    return f"""RAPPORT STRATEGIQUE IA - NEO-SOUSSE 2030
Date : {date_rapport}
Statut global : risque {niveau_risque.upper()}

1. Resume executif
Le reseau urbain Neo-Sousse 2030 est compose de {total_capteurs} capteurs, {total_vehicules} vehicules connectes, {total_interventions} interventions suivies et {total_citoyens} citoyens references. La disponibilite des capteurs est estimee a {disponibilite}%, avec {capteurs_actifs} capteurs actifs, {capteurs_signales} signales, {capteurs_maintenance} en maintenance et {capteurs_hs} hors service.

2. Infrastructures et capteurs
Les donnees capteurs indiquent une moyenne de mesures de {moyenne_mesures}, avec un pic observe a {max_mesure}. Les capteurs signales et hors service doivent rester le principal point de vigilance, car ils impactent directement la qualite des tableaux de bord, des alertes et des decisions operationnelles.

3. Interventions techniques
Le portefeuille d'interventions contient {interventions_terminees} mission(s) terminee(s) et {interventions_en_cours} mission(s) en cours. Le taux de cloture operationnelle est de {taux_interventions}%. Les interventions non terminees doivent etre priorisees selon leur lien avec les capteurs critiques et les zones a forte activite.

4. Mobilite urbaine
La flotte compte {vehicules_en_route} vehicule(s) en circulation et {vehicules_en_panne} vehicule(s) en panne. Le taux de panne de flotte est de {taux_panne_flotte}%. Une panne active doit declencher une action de maintenance ou de redeploiement pour eviter une baisse de couverture urbaine.

5. Experience citoyenne
Le score ecologique citoyen moyen est de {score_citoyens}/100. Cet indicateur doit etre suivi avec les mesures environnementales pour orienter les campagnes de sensibilisation et les actions de proximite.

6. Recommandations prioritaires
{chr(10).join(priorites)}

7. Conclusion
La situation reste pilotable si les alertes capteurs, les vehicules en panne et les interventions ouvertes sont traites dans le prochain cycle operationnel. Le systeme doit continuer a synchroniser les pages en temps reel et a valider les transitions d'etats par les automates."""


def appeler_ollama(prompt: str, system: str = "") -> str:
    """
    Appelle l'API Ollama locale pour générer du texte.
    """
    system_text = system or (
        "Tu es ARIA, l'IA officielle de la ville intelligente Neo-Sousse 2030. "
        "Tu génères des rapports clairs, concis et professionnels en français "
        "à partir de données urbaines. Sois précis, factuel et structuré."
    )

    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system_text},
            {"role": "user", "content": prompt}
        ],
        "stream": False,
        "options": {"temperature": 0.4}
    }

    try:
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            OLLAMA_URL, data=data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode('utf-8'))
            return result['message']['content'].strip()
    except Exception as e:
        print(f"[ERROR] Erreur Ollama: {e}")
        return None


def appeler_ollama_chat(historique: list, contexte_bd: str) -> str:
    """
    Appelle Ollama en mode conversation avec historique.
    """
    system_prompt = f"""Tu es ARIA, l'IA officielle de la ville intelligente Neo-Sousse 2030.
Tu réponds en français à toutes les questions des gestionnaires urbains.
Tu analyses les données de la ville, génères des rapports, suggères des actions.
Voici les données actuelles de la ville :
{contexte_bd}"""

    messages = [{"role": "system", "content": system_prompt}]
    for msg in historique:
        messages.append({"role": msg["role"], "content": msg["content"]})

    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "options": {"temperature": 0.7}
    }

    try:
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            OLLAMA_URL, data=data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode('utf-8'))
            return result['message']['content'].strip()
    except Exception as e:
        return f"Désolé, je rencontre des difficultés techniques (Ollama non disponible). Erreur: {e}"


# ══════════════════════════════════════════════════════════════
# CLASSE PRINCIPALE — IA GÉNÉRATIVE
# ══════════════════════════════════════════════════════════════

class IAGenerative:
    """
    Module principal d'IA Générative pour Smart City Neo-Sousse 2030.
    Génère des rapports, suggestions et valide les transitions d'automates.
    """

    def __init__(self):
        self.date_aujourd_hui = datetime.date.today().strftime("%d/%m/%Y")
        self.historique_chat = []
        self.contexte_bd = ""

    def _rafraichir_contexte(self):
        """Rafraîchit le contexte BD pour le chat."""
        donnees = collecter_donnees_bd()
        stats = statistiques_rapides(donnees)
        self.contexte_bd = f"""
=== DONNÉES TEMPS RÉEL — Neo-Sousse 2030 — {self.date_aujourd_hui} ===
CAPTEURS: {stats['total_capteurs']} total | {stats['capteurs_actifs']} actifs | {stats['capteurs_hs']} HS
INTERVENTIONS: {stats['total_interventions']} total | {stats['interventions_en_cours']} en cours
VÉHICULES: {stats['total_vehicules']} total | {stats['vehicules_en_route']} en route | {stats['vehicules_en_panne']} en panne
CITOYENS: {stats['total_citoyens']} | Score moyen: {stats['score_moyen_citoyens']}/100
"""

    def rapport_journalier(self) -> str:
        """Génère un rapport journalier complet de la ville via Ollama."""
        donnees = collecter_donnees_bd()
        stats = statistiques_rapides(donnees)

        prompt = f"""
Génère un rapport journalier professionnel de la ville intelligente Neo-Sousse 2030 pour le {self.date_aujourd_hui}.
Données du jour :
- Capteurs : {stats['total_capteurs']} total ({stats['capteurs_actifs']} actifs, {stats['capteurs_hs']} HS)
- Interventions : {stats['total_interventions']} total ({stats['interventions_en_cours']} en cours)
- Véhicules : {stats['total_vehicules']} total ({stats['vehicules_en_route']} en route)
- Citoyens : {stats['total_citoyens']} (Score écolo moyen: {stats['score_moyen_citoyens']}/100)
- Mesures : Moyenne {stats['moyenne_mesures']}, Max {stats['max_mesure']}

Structure :
1. Résumé exécutif
2. Analyse des infrastructures (Capteurs/Véhicules)
3. Gestion des interventions
4. Perspectives et recommandations
Format : Texte pro, titres clairs, max 300 mots.
"""
        reponse = appeler_ollama(prompt)
        if reponse is None or len(reponse.strip()) < 250:
            return rapport_professionnel_local(stats, self.date_aujourd_hui)
        
        if reponse is None:
            return f"Rapport indisponible (Ollama déconnecté). Résumé : {stats['total_capteurs']} capteurs, {stats['capteurs_hs']} HS."
        return reponse

    def suggestions_actions(self) -> list:
        """Génère des suggestions d'actions prioritaires."""
        donnees = collecter_donnees_bd()
        stats = statistiques_rapides(donnees)
        suggestions = []

        if stats['capteurs_hs'] > 0:
            suggestions.append({"priorite": "haute", "type": "capteur", "message": f"Réparer les {stats['capteurs_hs']} capteurs HORS SERVICE immédiatement."})
        if stats['vehicules_en_panne'] > 0:
            suggestions.append({"priorite": "haute", "type": "vehicule", "message": f"Dépêcher une équipe pour les {stats['vehicules_en_panne']} véhicules en panne."})
        if stats['score_moyen_citoyens'] < 60:
            suggestions.append({"priorite": "moyenne", "type": "citoyen", "message": "Lancer une campagne de sensibilisation au tri sélectif."})
        
        if not suggestions:
            suggestions.append({"priorite": "basse", "type": "info", "message": "Systèmes nominaux. Aucune action critique requise."})
        return suggestions

    def compile_nl_to_sql(self, nl_query: str) -> dict:
        """
        Convertit le langage naturel en SQL SELECT sécurisé via Ollama.
        """
        system_prompt = """Tu es un compilateur SQL expert pour Neo-Sousse. 
Tu génères UNIQUEMENT des requêtes SELECT pour PostgreSQL.
SCHEMA:
- capteurs(id, type, zone, statut, date_installation)
- interventions(id, capteur_id, technicien1_id, technicien2_id, statut, date)
- mesures(id, capteur_id, type_mesure, valeur, date)
- vehicules(id, type, trajet_id, statut)
- citoyens(id, nom, score_ecolo, adresse)

REGLES STRICTES:
1. Uniquement des requêtes SELECT.
2. Interdiction absolue: INSERT, UPDATE, DELETE, DROP, TRUNCATE, ALTER.
3. Réponds UNIQUEMENT avec le code SQL brut, sans markdown, sans texte autour.
4. Si la requête demande une modification, réponds 'BLOCKED'."""

        sql_gen = appeler_ollama(nl_query, system=system_prompt)
        
        if not sql_gen:
            return {"success": False, "error": "Ollama indisponible"}

        sql_clean = sql_gen.strip().replace('```sql', '').replace('```', '').strip()
        
        # Sécurité supplémentaire
        forbidden = ['DELETE', 'UPDATE', 'DROP', 'INSERT', 'ALTER', 'TRUNCATE', ';']
        if any(word in sql_clean.upper() for word in forbidden) or not sql_clean.upper().startswith('SELECT'):
            return {"success": False, "error": "Requête non autorisée ou invalide", "sql": sql_clean}

        try:
            with get_cursor() as cur:
                cur.execute(sql_clean)
                rows = cur.fetchall()
                explanation_prompt = f"Explique brièvement en français ce que fait cette requête SQL : {sql_clean}"
                explanation = appeler_ollama(explanation_prompt)
                return {
                    "success": True,
                    "sql": sql_clean,
                    "rows": [dict(r) for r in rows],
                    "explanation": explanation
                }
        except Exception as e:
            return {"success": False, "error": str(e), "sql": sql_clean}

    def chat(self, question: str) -> str:
        """Chat interactif avec ARIA."""
        if len(self.historique_chat) % 5 == 0:
            self._rafraichir_contexte()

        self.historique_chat.append({"role": "user", "content": question})
        reponse = appeler_ollama_chat(self.historique_chat, self.contexte_bd)
        self.historique_chat.append({"role": "assistant", "content": reponse})

        if len(self.historique_chat) > 10:
            self.historique_chat = self.historique_chat[-10:]
        return reponse

    def get_stats(self) -> dict:
        """Retourne les KPIs."""
        donnees = collecter_donnees_bd()
        stats = statistiques_rapides(donnees)
        stats['date'] = self.date_aujourd_hui
        return stats


    def get_donnees_completes(self) -> dict:
        """Retourne toutes les données brutes de la BD."""
        donnees = collecter_donnees_bd()
        # Convertir les dates
        for table in donnees.values():
            if isinstance(table, list):
                for row in table:
                    for key, val in row.items():
                        if isinstance(val, (datetime.date, datetime.datetime)):
                            row[key] = str(val)
        return donnees


# ══════════════════════════════════════════════════════════════
# POINT D'ENTRÉE — TEST
# ══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    from db_config import test_connection

    print("\n" + "=" * 60)
    print("  MODULE IA GÉNÉRATIVE — Smart City Neo-Sousse 2030")
    print("  Propulsé par Ollama (Local)")
    print("=" * 60)

    if not test_connection():
        print("[ERROR] PostgreSQL non disponible.")
        sys.exit(1)

    ia = IAGenerative()

    print("\n📄 RAPPORT JOURNALIER")
    print("─" * 55)
    print(ia.rapport_journalier())

    print("\n💡 SUGGESTIONS D'ACTIONS")
    print("─" * 55)
    for s in ia.suggestions_actions():
        print(f"  [{s['priorite'].upper()}] {s['message']}")

    print("\n📊 STATISTIQUES")
    print("─" * 55)
    print(json.dumps(ia.get_stats(), indent=2, ensure_ascii=False))
