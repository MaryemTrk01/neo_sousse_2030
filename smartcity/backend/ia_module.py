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
OLLAMA_MODEL = "llama3.2"  # Comme spécifié dans ia_chat.py


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
                if d.get('date_installation'):
                    d['date_installation'] = str(d['date_installation'])
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
    valeurs = [m['valeur'] for m in mesures if m.get('valeur') is not None]
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
        "options": {"temperature": 0.7}
    }

    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        OLLAMA_URL, data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            result = json.loads(response.read().decode('utf-8'))
            return result['message']['content'].strip()
    except urllib.error.URLError as e:
        return None  # Retourne None si Ollama est indisponible
    except Exception as e:
        return None


def appeler_ollama_chat(historique: list, contexte_bd: str) -> str:
    """
    Appelle Ollama en mode conversation avec historique.
    """
    system_prompt = f"""Tu es ARIA, l'IA officielle de la ville intelligente Neo-Sousse 2030.
Tu réponds en français à toutes les questions des gestionnaires urbains.
Tu analyses les données de la ville, génères des rapports, suggères des actions.
Tu réponds aussi aux questions générales. Sois précis et professionnel.
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

    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        OLLAMA_URL, data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            result = json.loads(response.read().decode('utf-8'))
            return result['message']['content'].strip()
    except urllib.error.URLError as e:
        return f"Ollama non disponible. Detail : {e}"
    except Exception as e:
        return f"[Erreur Ollama] {e}"


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
MESURES: Moyenne={stats['moyenne_mesures']} | Max={stats['max_mesure']} | Min={stats['min_mesure']}
DONNÉES COMPLÈTES:
{json.dumps(donnees, ensure_ascii=False, default=str, indent=2)[:3000]}
"""

    def rapport_journalier(self) -> str:
        """Génère un rapport journalier complet de la ville via Gemini."""
        donnees = collecter_donnees_bd()
        stats = statistiques_rapides(donnees)

        prompt = f"""
Génère un rapport journalier professionnel de la ville intelligente Neo-Sousse 2030 pour le {self.date_aujourd_hui}.

Données du jour :
- Capteurs : {stats['total_capteurs']} total
  * Actifs : {stats['capteurs_actifs']}
  * Hors service : {stats['capteurs_hs']} — zones : {[c['zone'] for c in stats['capteurs_hs_details']]}
  * Signalés : {stats['capteurs_signales']}
  * En maintenance : {stats['capteurs_maintenance']}

- Interventions : {stats['total_interventions']} total
  * En cours : {stats['interventions_en_cours']}
  * Terminées : {stats['interventions_terminees']}

- Mesures récentes :
  * Moyenne : {stats['moyenne_mesures']}
  * Maximum : {stats['max_mesure']}
  * Minimum : {stats['min_mesure']}

- Véhicules :
  * En route : {stats['vehicules_en_route']}
  * En panne : {stats['vehicules_en_panne']}

- Citoyens : {stats['total_citoyens']} | Score écologique moyen = {stats['score_moyen_citoyens']}/100

Le rapport doit contenir :
1. Un résumé exécutif
2. Les points critiques et alertes
3. Les indicateurs positifs
4. Recommandations de conclusion

Format : texte professionnel, structuré avec des titres, 250 mots maximum.
"""
        reponse = appeler_ollama(prompt)
        
        if reponse is None:
            # Fallback local si Ollama est indisponible
            return f"""
╔══════════════════════════════════════════════════════╗
  RAPPORT JOURNALIER — Neo-Sousse 2030 — {self.date_aujourd_hui}
╚══════════════════════════════════════════════════════╝

1. RÉSUMÉ EXÉCUTIF
Le réseau de la ville intelligente est actuellement opérationnel.
Nous comptons {stats['total_capteurs']} capteurs, dont {stats['capteurs_actifs']} actifs et {stats['capteurs_hs']} hors service.
Le score écologique moyen des citoyens est de {stats['score_moyen_citoyens']}/100.

2. POINTS CRITIQUES ET ALERTES
{chr(10).join(f'  ⚠️ Capteur {c["id"]} (Zone {c["zone"]}) - HORS SERVICE' for c in stats['capteurs_hs_details']) if stats['capteurs_hs'] > 0 else '  ✅ Aucun incident critique sur les capteurs.'}
  ⚠️ Véhicules en panne : {stats['vehicules_en_panne']}

3. INDICATEURS POSITIFS
  • Interventions terminées : {stats['interventions_terminees']}
  • Moyenne des mesures récentes : {stats['moyenne_mesures']}
  • Véhicules en route : {stats['vehicules_en_route']}

4. RECOMMANDATIONS
  • Prioriser la réparation des capteurs hors service.
  • Assigner des techniciens aux {stats['interventions_en_cours']} interventions en cours.
  • Maintenir la surveillance de la qualité de l'air.

(Note: Ce rapport est généré localement car le serveur d'IA Ollama n'est pas joignable.)
"""
        return reponse

    def suggestions_actions(self) -> list:
        """
        Génère des suggestions d'actions prioritaires.
        Retourne une liste de dicts : {priorite, message, type}
        """
        donnees = collecter_donnees_bd()
        stats = statistiques_rapides(donnees)

        suggestions = []

        # Suggestions basées sur les données réelles
        for c in stats['capteurs_hs_details']:
            suggestions.append({
                "priorite": "haute",
                "type": "capteur",
                "message": f"🔧 Intervention urgente recommandée sur capteur ID={c['id']} "
                           f"(zone {c['zone']}) : hors service, maintenance ou remplacement requis."
            })

        for v in stats['vehicules_panne_details']:
            suggestions.append({
                "priorite": "haute",
                "type": "vehicule",
                "message": f"🚗 Dépannage requis pour véhicule ID={v['id']} "
                           f"(type: {v['type']}) : en panne, bloquer les nouvelles assignations."
            })

        if stats['interventions_en_cours'] > 3:
            suggestions.append({
                "priorite": "moyenne",
                "type": "intervention",
                "message": f"📋 {stats['interventions_en_cours']} interventions en cours — "
                           f"vérifier la charge des techniciens et réaffecter si nécessaire."
            })

        if stats['score_moyen_citoyens'] < 50:
            suggestions.append({
                "priorite": "moyenne",
                "type": "citoyen",
                "message": f"🌱 Score écologique moyen bas ({stats['score_moyen_citoyens']}/100) — "
                           f"lancer une campagne de sensibilisation environnementale."
            })

        if stats['moyenne_mesures'] > 80:
            suggestions.append({
                "priorite": "haute",
                "type": "mesure",
                "message": f"⚠️ Moyenne des mesures élevée ({stats['moyenne_mesures']}) — "
                           f"dépassement de seuil potentiel, vérifier la qualité de l'air."
            })

        if not suggestions:
            suggestions.append({
                "priorite": "basse",
                "type": "info",
                "message": "✅ Tous les systèmes fonctionnent normalement. Aucune action requise."
            })

        return suggestions

    def valider_transition_automate(self, entite: str, etat_actuel: str,
                                     evenement: str, etat_suivant: str) -> dict:
        """
        Valide une transition d'automate via l'IA Gemini.
        Retourne un dict : {valide, justification, entite, transition}
        """
        # Définir les transitions valides par entité
        transitions_valides = {
            "capteur": {
                ("INACTIF", "activer", "ACTIF"),
                ("ACTIF", "signaler", "SIGNALE"),
                ("SIGNALE", "maintenir", "EN_MAINTENANCE"),
                ("EN_MAINTENANCE", "declarer_hs", "HORS_SERVICE"),
            },
            "intervention": {
                ("DEMANDE", "assigner_tech1", "TECH1_ASSIGNE"),
                ("TECH1_ASSIGNE", "valider_tech2", "TECH2_VALIDE"),
                ("TECH2_VALIDE", "valider_ia", "IA_VALIDE"),
                ("IA_VALIDE", "terminer", "TERMINE"),
            },
            "vehicule": {
                ("STATIONNE", "demarrer", "EN_ROUTE"),
                ("EN_ROUTE", "panne", "EN_PANNE"),
                ("EN_ROUTE", "arriver", "ARRIVE"),
                ("EN_PANNE", "arriver", "ARRIVE"),
            },
        }

        # Vérification locale d'abord
        entite_lower = entite.lower()
        transition = (etat_actuel, evenement, etat_suivant)
        est_valide_localement = transition in transitions_valides.get(entite_lower, set())

        # Enrichissement par Gemini
        prompt = f"""
Dans le système Smart City Neo-Sousse 2030, évalue cette transition d'automate :

Entité      : {entite}
État actuel  : {etat_actuel}
Événement    : {evenement}
État suivant : {etat_suivant}

Transitions valides pour {entite} : {transitions_valides.get(entite_lower, 'inconnues')}
Résultat vérification locale : {'VALIDE' if est_valide_localement else 'INVALIDE'}

Réponds en JSON strict : {{"valide": true/false, "justification": "explication en 1-2 phrases"}}
"""
        reponse = appeler_ollama(prompt)

        # Parser la réponse
        try:
            # Extraire le JSON de la réponse
            import re
            match = re.search(r'\{.*\}', reponse, re.DOTALL)
            if match:
                result = json.loads(match.group())
            else:
                result = {"valide": est_valide_localement, "justification": reponse}
        except (json.JSONDecodeError, Exception):
            result = {"valide": est_valide_localement, "justification": reponse}

        result['entite'] = entite
        result['transition'] = f"{etat_actuel} --[{evenement}]--> {etat_suivant}"
        return result

    def chat(self, question: str) -> str:
        """
        Chat interactif avec ARIA.
        Maintient l'historique de conversation.
        """
        # Rafraîchir le contexte toutes les 5 questions
        if len(self.historique_chat) % 10 == 0:
            self._rafraichir_contexte()

        self.historique_chat.append({"role": "user", "content": question})
        reponse = appeler_ollama_chat(self.historique_chat, self.contexte_bd)
        self.historique_chat.append({"role": "assistant", "content": reponse})

        # Limiter l'historique à 20 messages
        if len(self.historique_chat) > 20:
            self.historique_chat = self.historique_chat[-20:]

        return reponse

    def get_stats(self) -> dict:
        """Retourne les KPIs sous forme de dictionnaire JSON-sérialisable."""
        donnees = collecter_donnees_bd()
        stats = statistiques_rapides(donnees)
        stats['date'] = self.date_aujourd_hui
        # Retirer les détails non sérialisables
        stats.pop('capteurs_hs_details', None)
        stats.pop('vehicules_panne_details', None)
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
        print("❌ PostgreSQL non disponible.")
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
