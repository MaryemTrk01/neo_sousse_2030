"""
Module 2.3 - IA Generative avec OLLAMA (modele local)
Plateforme Smart City Neo-Sousse 2030

Installation :
    pip install requests psycopg2-binary

Lancement Ollama (dans un autre terminal) :
    ollama serve
    ollama pull mistral
"""

import requests
import psycopg2
from datetime import datetime

# ─────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────
OLLAMA_URL   = "http://localhost:11434/api/chat"
OLLAMA_MODEL = "mistral"

DB_CONFIG = {
    "dbname":   "smartcity",
    "user":     "postgres",
    "password": "14614114",
    "host":     "localhost",
    "port":     "5433"
}


# ─────────────────────────────────────────
# CONNEXION BASE DE DONNEES
# ─────────────────────────────────────────
def get_data(query, params=None):
    conn = psycopg2.connect(**DB_CONFIG)
    cur  = conn.cursor()
    cur.execute(query, params or ())
    rows = cur.fetchall()
    conn.close()
    return rows


# ─────────────────────────────────────────
# APPEL OLLAMA
# ─────────────────────────────────────────
def appeler_ollama(system_prompt, user_prompt):
    payload = {
        "model":  OLLAMA_MODEL,
        "stream": False,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt}
        ]
    }
    try:
        resp = requests.post(OLLAMA_URL, json=payload, timeout=400)
        resp.raise_for_status()
        return resp.json()["message"]["content"]
    except requests.exceptions.ConnectionError:
        return "[ERREUR] Ollama n'est pas lance. Tapez 'ollama serve' dans un terminal."
    except Exception as e:
        return "[ERREUR Ollama] " + str(e)


# ═══════════════════════════════════════════════════════
# FONCTIONNALITE 1 — RAPPORTS TEXTUELS
# ═══════════════════════════════════════════════════════

def generer_rapport():
    """
    Rapport general sur l'etat de la ville.
    (remplace l'ancienne version avec transformers/gpt2)
    """
    capteurs = get_data("SELECT type, zone, statut FROM capteurs;")

    interventions = get_data("SELECT statut FROM interventions;")

    total      = len(capteurs)
    hs         = [c for c in capteurs if c[2] == "HORS_SERVICE"]
    actifs     = [c for c in capteurs if c[2] == "ACTIF"]
    en_attente = [i for i in interventions if i[0] == "DEMANDE"]

    contexte = (
        "Etat du parc de capteurs :\n"
        "  - Total    : {}\n"
        "  - Actifs   : {}\n"
        "  - Hors service : {}\n\n"
        "Interventions :\n"
        "  - Total      : {}\n"
        "  - En attente : {}"
    ).format(total, len(actifs), len(hs), len(interventions), len(en_attente))

    system_prompt = (
        "Tu es le systeme IA de la plateforme Smart City Neo-Sousse 2030.\n"
        "Tu rediges des rapports d'etat concis pour les gestionnaires urbains.\n"
        "Structure : RESUME | ETAT DES CAPTEURS | INTERVENTIONS | RECOMMANDATION\n"
        "Reponds en francais, 150 mots maximum."
    )
    user_prompt = (
        "Genere un rapport d'etat general de la ville pour le {}.\n\n{}"
    ).format(datetime.today().strftime("%d/%m/%Y"), contexte)

    return appeler_ollama(system_prompt, user_prompt)


def rapport_qualite_air(date=None):
    """Rapport qualite de l'air. Ex: rapport_qualite_air('2026-03-15')"""
    date = date or datetime.today().strftime("%Y-%m-%d")

    try:
        rows = get_data("""
            SELECT z.nom_zone,
                   ROUND(AVG(m.valeur_pollution)::numeric, 1),
                   MAX(m.valeur_pollution),
                   COUNT(*)
            FROM   mesures  m
            JOIN   capteurs c ON m.capteur_id = c.id
            JOIN   zones    z ON c.zone_id    = z.id
            WHERE  DATE(m.horodatage) = %s
            GROUP  BY z.nom_zone
            ORDER  BY 2 DESC
        """, (date,))
    except Exception:
        rows = []

    seuil           = 50
    zones_depassees = [r for r in rows if r[1] and float(r[1]) > seuil]

    if rows:
        donnees = "\n".join(
            "  * {:<18} moy={}ug/m3  max={}  mesures={}".format(r[0], r[1], r[2], r[3])
            for r in rows
        )
    else:
        donnees = "  Aucune mesure pour cette date."

    system_prompt = (
        "Tu es le systeme IA de la plateforme Smart City Neo-Sousse 2030.\n"
        "Tu rediges des rapports officiels sur la qualite de l'air.\n"
        "Format :\n"
        "  RAPPORT QUALITE DE L'AIR - [DATE]\n"
        "  RESUME : ...\n"
        "  DONNEES PAR ZONE : ...\n"
        "  ALERTES : ...\n"
        "  RECOMMANDATION : ...\n"
        "Reponds en francais."
    )
    user_prompt = (
        "Genere le rapport qualite de l'air du {}.\n\n"
        "Donnees :\n{}\n\n"
        "Zones depassant {} ug/m3 : {} zone(s) - {}"
    ).format(
        date, donnees, seuil,
        len(zones_depassees),
        ", ".join(r[0] for r in zones_depassees) or "aucune"
    )

    return appeler_ollama(system_prompt, user_prompt)


def rapport_capteurs():
    """Rapport sur l'etat du parc de capteurs."""
    stats = get_data("SELECT statut, COUNT(*) FROM capteurs GROUP BY statut ORDER BY 2 DESC")
    critiques = get_data("""
                         SELECT c.id, c.type, c.zone, c.statut,
                                ROUND(EXTRACT(EPOCH FROM (NOW() - c.derniere_maj)) / 3600) AS heures_depuis_maj
               FROM capteurs c

        JOIN   zones    z ON c.zone_id = z.id
        WHERE  c.statut = 'HORS_SERVICE'
        ORDER  BY 4 DESC LIMIT 5
    """)

    total     = sum(r[1] for r in stats)
    stats_str = "\n".join(
        "  * {:<20} {} capteurs ({}%)".format(r[0], r[1], round(r[1]/total*100))
        for r in stats
    )
    crit_str = "\n".join(
        "  * C-{} | Zone: {} | Type: {} | HS depuis {}h".format(*r)
        for r in critiques
    ) or "  Aucun capteur critique."

    system_prompt = (
        "Tu es le systeme IA de la plateforme Smart City Neo-Sousse 2030.\n"
        "Tu generes des rapports d'etat sur les capteurs urbains.\n"
        "Identifie les priorites et propose un plan d'action. Reponds en francais."
    )
    user_prompt = (
        "Rapport d'etat des capteurs. Total : {} capteurs.\n\n"
        "Repartition :\n{}\n\n"
        "Capteurs critiques :\n{}"
    ).format(total, stats_str, crit_str)

    return appeler_ollama(system_prompt, user_prompt)


def rapport_interventions():
    """Rapport de suivi des interventions en cours."""
    rows = get_data("""
        SELECT i.id, i.statut, i.date_demande
        FROM interventions i
       
        JOIN   capteurs      c ON i.capteur_id = c.id
        JOIN   zones         z ON c.zone_id    = z.id
        WHERE  i.statut != 'TERMINE'
        ORDER  BY i.date_demande ASC
    """)

    if rows:
        details = "\n".join(
            "  * #{} | {} | Zone: {} | {}h | Capteur: {}".format(*r)
            for r in rows
        )
        retards = [r for r in rows if r[3] and float(r[3]) > 24]
    else:
        details = "  Aucune intervention en cours."
        retards = []

    system_prompt = (
        "Tu es le systeme IA de la plateforme Smart City Neo-Sousse 2030.\n"
        "Tu generes des rapports de suivi des interventions techniques.\n"
        "Identifie les retards et priorise. Reponds en francais."
    )
    user_prompt = (
        "Rapport interventions. Actives: {} | En retard (>24h): {}\n\n"
        "Detail :\n{}"
    ).format(len(rows), len(retards), details)

    return appeler_ollama(system_prompt, user_prompt)


# ═══════════════════════════════════════════════════════
# FONCTIONNALITE 2 — SUGGESTIONS D'ACTIONS
# ═══════════════════════════════════════════════════════

def generer_suggestions():
    """
    Suggestions generales.
    (remplace l'ancienne version generer_suggestions())
    """
    interventions = get_data("SELECT statut FROM interventions;")
    en_attente    = [i for i in interventions if i[0] == "DEMANDE"]
    capteurs_hs   = get_data("SELECT COUNT(*) FROM capteurs WHERE statut='HORS_SERVICE'")
    nb_hs         = capteurs_hs[0][0] if capteurs_hs else 0

    if en_attente or nb_hs > 0:
        contexte = (
            "{} intervention(s) en attente d'assignation.\n"
            "{} capteur(s) hors service."
        ).format(len(en_attente), nb_hs)
    else:
        return "Toutes les interventions sont en cours ou terminees. Systeme nominal."

    system_prompt = (
        "Tu es le systeme de recommandation IA de Smart City Neo-Sousse 2030.\n"
        "Tu generes des suggestions courtes et directes pour les gestionnaires.\n"
        "Format : 'Suggestion : [action concrete]'\n"
        "Reponds en francais, 2-3 phrases max."
    )
    user_prompt = "Situation actuelle :\n{}\nGenere les suggestions.".format(contexte)

    return appeler_ollama(system_prompt, user_prompt)


def suggerer_actions_capteur(capteur_id):
    """
    3 actions correctives pour un capteur defaillant.
    Ex: suggerer_actions_capteur(452)
    -> 'Intervention recommandee sur le capteur C-452 : taux d'erreur de 15%'
    """
    rows = get_data("""
        SELECT c.id, c.statut, c.type , z.nom,
               ROUND(EXTRACT(EPOCH FROM (NOW() - c.derniere_maj))/3600)
        FROM   capteurs c
        JOIN   zones    z ON c.zone_id = z.id
        WHERE  c.id = %s
    """, (capteur_id,))

    if not rows:
        return "Capteur C-{} introuvable.".format(capteur_id)

    r = rows[0]
    info = (
        "C-{} | Type: {} | Zone: {} | Statut: {} | "
        "Taux erreur: {}% | Inactif depuis: {}h"
    ).format(r[0], r[2], r[3], r[1], r[4], r[5])

    system_prompt = (
        "Tu es le systeme de recommandation IA de Smart City Neo-Sousse 2030.\n"
        "Propose exactement 3 actions correctives pour un capteur defaillant.\n"
        "Format pour chaque action :\n"
        "  ACTION [N] - PRIORITE : HAUTE / MOYENNE / BASSE\n"
        "  -> Intervention : ...\n"
        "  -> Justification : ...\n"
        "  -> Delai : ...\n"
        "Reponds en francais."
    )
    user_prompt = (
        "Analyse ce capteur et propose 3 actions :\n\n{}\n\n"
        "Seuils : taux erreur > 10% = critique | inactif > 24h = urgence"
    ).format(info)

    return appeler_ollama(system_prompt, user_prompt)


def suggerer_actions_zone(zone_id):
    """
    3 mesures d'amelioration pour une zone urbaine.
    Ex: suggerer_actions_zone(1)
    """
    rows = get_data("""
        SELECT z.nom ,
               ROUND(AVG(m.valeur)::numeric, 1),
               COUNT(DISTINCT c.id),
               SUM(CASE WHEN c.statut='HORS_SERVICE' THEN 1 ELSE 0 END),
               ROUND(AVG(ci.score_ecolo)::numeric, 1)
        FROM   zones    z
        JOIN   capteurs c  ON c.zone_id = z.id
        LEFT JOIN mesures m  ON m.capteur_id = c.id
    
        LEFT JOIN citoyens ci ON ci.zone_id = z.id
        WHERE  z.id = %s
        GROUP  BY z.nom
    """, (zone_id,))

    if not rows:
        return "Zone {} introuvable.".format(zone_id)

    r = rows[0]
    info = (
        "Zone: {} | Pollution moy: {}ug/m3 | "
        "Capteurs: {} (dont {} HS) | Score ecolo: {}/100"
    ).format(r[0], r[1], r[2], r[3], r[4])

    system_prompt = (
        "Tu es le conseiller strategique IA de Smart City Neo-Sousse 2030.\n"
        "Propose 3 mesures d'amelioration pour une zone urbaine.\n"
        "Format :\n"
        "  MESURE [N] - [DOMAINE]\n"
        "  -> Action : ...\n"
        "  -> Impact : ...\n"
        "  -> Priorite : HAUTE / MOYENNE / BASSE\n"
        "Reponds en francais."
    )
    user_prompt = (
        "Analyse cette zone et propose 3 mesures :\n\n{}\n\n"
        "Seuils : pollution > 50ug/m3 = alerte | HS > 20% = critique"
    ).format(info)

    return appeler_ollama(system_prompt, user_prompt)


# ═══════════════════════════════════════════════════════
# FONCTIONNALITE 3 — VALIDATION DES AUTOMATES
# ═══════════════════════════════════════════════════════

AUTOMATES = {
    "capteur": {
        "initial": "INACTIF",
        "transitions": {
            "INACTIF":        {"installation":       "ACTIF"},
            "ACTIF":          {"detection_anomalie": "SIGNALE"},
            "SIGNALE":        {"assignation":        "EN_MAINTENANCE",
                               "panne":              "HORS_SERVICE"},
            "EN_MAINTENANCE": {"reparation":         "ACTIF",
                               "panne":              "HORS_SERVICE"},
            "HORS_SERVICE":   {}
        }
    },
    "intervention": {
        "initial": "DEMANDE",
        "transitions": {
            "DEMANDE":       {"assignation_tech1": "TECH1_ASSIGNE"},
            "TECH1_ASSIGNE": {"validation_tech2":  "TECH2_VALIDE"},
            "TECH2_VALIDE":  {"validation_ia":     "IA_VALIDE"},
            "IA_VALIDE":     {"cloture":           "TERMINE"},
            "TERMINE":       {}
        }
    },
    "vehicule": {
        "initial": "STATIONNE",
        "transitions": {
            "STATIONNE": {"demarrage": "EN_ROUTE"},
            "EN_ROUTE":  {"panne":     "EN_PANNE",
                          "arrivee":   "ARRIVE"},
            "EN_PANNE":  {"reparation":"EN_ROUTE"},
            "ARRIVE":    {}
        }
    }
}


def simuler_automate(type_automate, sequence):
    """Simule les transitions d'un automate a etats finis."""
    if type_automate not in AUTOMATES:
        return {"valide": False, "etat_final": None, "historique": [],
                "erreur": "Type inconnu: {}".format(type_automate)}

    auto = AUTOMATES[type_automate]
    etat = auto["initial"]
    hist = []

    for ev in sequence:
        possibles = auto["transitions"].get(etat, {})
        if ev not in possibles:
            return {
                "valide": False, "etat_final": etat, "historique": hist,
                "erreur": (
                    "Transition INVALIDE : '{}' impossible depuis '{}'.\n"
                    "Evenements acceptes : {}"
                ).format(ev, etat, list(possibles.keys()) or ["aucun (etat terminal)"])
            }
        suivant = possibles[ev]
        hist.append("{}  --[{}]-->  {}".format(etat, ev, suivant))
        etat = suivant

    return {"valide": True, "etat_final": etat, "historique": hist, "erreur": None}


def valider_sequence_ia(type_automate, sequence):
    """
    Valide une sequence ET analyse sa coherence metier avec l'IA.
    Ex: valider_sequence_ia("capteur", ["installation", "detection_anomalie", "assignation"])
    """
    res      = simuler_automate(type_automate, sequence)
    hist_str = "\n  ".join(res["historique"]) or "  (aucune transition)"
    seq_str  = " -> ".join(sequence) if sequence else "(vide)"
    statut   = (
        "VALIDE - Etat final : {}".format(res["etat_final"])
        if res["valide"]
        else "INVALIDE - {}".format(res["erreur"])
    )

    system_prompt = (
        "Tu es le validateur IA d'automates de Smart City Neo-Sousse 2030.\n"
        "Tu analyses une sequence de transitions et fournis :\n"
        "  1. Confirmation du statut\n"
        "  2. Coherence metier dans le contexte urbain\n"
        "  3. Risques ou anomalies detectes\n"
        "  4. Suite recommandee\n"
        "150 mots max. Reponds en francais."
    )
    user_prompt = (
        "Automate '{}' - Sequence : {}\n"
        "Statut moteur : {}\n\n"
        "Historique :\n  {}"
    ).format(type_automate, seq_str, statut, hist_str)

    analyse = appeler_ollama(system_prompt, user_prompt)

    sep = "=" * 50
    return (
        "\n{}\n"
        "VALIDATION AUTOMATE : {}\n"
        "{}\n"
        "Sequence : {}\n"
        "Statut   : {}\n\n"
        "Historique :\n  {}\n\n"
        "Analyse IA :\n{}\n"
        "{}"
    ).format(sep, type_automate.upper(), sep,
             seq_str, statut, hist_str, analyse, sep)


# ═══════════════════════════════════════════════════════
# PROGRAMME PRINCIPAL
# ═══════════════════════════════════════════════════════
if __name__ == "__main__":
    sep = "=" * 50

    print(sep)
    print("  MODULE IA GENERATIVE - Smart City Neo-Sousse 2030")
    print("  Modele Ollama : {}".format(OLLAMA_MODEL))
    print(sep)

    # ── Fonctionnalite 1 : Rapports ──────────────────────
    print("\n[1] RAPPORT GENERAL")
    print("-" * 40)
    print(generer_rapport())

    print("\n[2] RAPPORT QUALITE DE L'AIR")
    print("-" * 40)
    print(rapport_qualite_air("2026-03-15"))

    print("\n[3] RAPPORT ETAT DES CAPTEURS")
    print("-" * 40)
    print(rapport_capteurs())

    print("\n[4] RAPPORT INTERVENTIONS")
    print("-" * 40)
    print(rapport_interventions())

    # ── Fonctionnalite 2 : Suggestions ───────────────────
    print("\n[5] SUGGESTIONS GENERALES")
    print("-" * 40)
    print(generer_suggestions())

    print("\n[6] SUGGESTIONS CAPTEUR C-452")
    print("-" * 40)
    print(suggerer_actions_capteur(452))

    print("\n[7] SUGGESTIONS ZONE NORD (id=1)")
    print("-" * 40)
    print(suggerer_actions_zone(1))

    # ── Fonctionnalite 3 : Validation automates ──────────
    print("\n[8] VALIDATION AUTOMATE CAPTEUR - sequence valide")
    print("-" * 40)
    print(valider_sequence_ia(
        "capteur",
        ["installation", "detection_anomalie", "assignation", "reparation"]
    ))

    print("\n[9] VALIDATION AUTOMATE INTERVENTION - sequence invalide")
    print("-" * 40)
    print(valider_sequence_ia(
        "intervention",
        ["assignation_tech1", "cloture"]
    ))