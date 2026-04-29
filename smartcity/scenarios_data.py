"""
SCENARIOS_TEST.PY — 10 Scénarios de Test Complets
Smart City Neo-Sousse 2030

Couvre :
- Compilation de requêtes variées
- Fonctionnement des automates
- Génération de rapports IA
- Performances du système

Usage :
    python scenarios_test.py
"""

import sys
import os
import time
import datetime

base = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(base, 'compilateur'))
sys.path.insert(0, os.path.join(base, 'bdd'))

from compiler import NLCompiler
from db_config import get_cursor, test_connection
from transitions import Machine


# ══════════════════════════════════════════════════════════════
# UTILITAIRES
# ══════════════════════════════════════════════════════════════

class TestResult:
    def __init__(self, nom):
        self.nom = nom
        self.etapes = []
        self.success = True
        self.debut = time.time()

    def ajouter_etape(self, desc, ok, details=""):
        self.etapes.append((desc, ok, details))
        if not ok:
            self.success = False

    def duree(self):
        return round(time.time() - self.debut, 3)

    def afficher(self):
        icon = "✅" if self.success else "❌"
        print(f"\n{icon} {self.nom} ({self.duree()}s)")
        for desc, ok, details in self.etapes:
            icon2 = "  ✅" if ok else "  ❌"
            print(f"{icon2} {desc}")
            if details:
                print(f"     → {details}")


compiler = NLCompiler()


# ══════════════════════════════════════════════════════════════
# SCÉNARIO 1 : Cycle complet capteur → intervention
# ══════════════════════════════════════════════════════════════

def scenario_1():
    """
    Scénario complet :
    1. Capteur passe en état signalé
    2. Intervention créée automatiquement
    3. Deux techniciens assignés
    4. Requête NL sur les interventions en cours
    5. Rapport IA généré
    """
    t = TestResult("SCÉNARIO 1 : Cycle capteur → intervention complète")

    # Étape 1 : Automate capteur
    class Capteur:
        pass
    capteur = Capteur()
    machine = Machine(model=capteur,
        states=['INACTIF', 'ACTIF', 'SIGNALE', 'EN_MAINTENANCE', 'HORS_SERVICE'],
        transitions=[
            {'trigger': 'activer',   'source': 'INACTIF', 'dest': 'ACTIF'},
            {'trigger': 'signaler',  'source': 'ACTIF',   'dest': 'SIGNALE'},
            {'trigger': 'maintenir', 'source': 'SIGNALE', 'dest': 'EN_MAINTENANCE'},
            {'trigger': 'reparer',   'source': 'EN_MAINTENANCE', 'dest': 'ACTIF'},
        ],
        initial='INACTIF')

    capteur.activer()
    t.ajouter_etape("Capteur activé (INACTIF→ACTIF)",
                    capteur.state == 'ACTIF', f"État: {capteur.state}")

    capteur.signaler()
    t.ajouter_etape("Capteur signalé (ACTIF→SIGNALE)",
                    capteur.state == 'SIGNALE', f"État: {capteur.state}")

    # Étape 2 : Automate intervention
    class Intervention:
        pass
    inter = Intervention()
    machine2 = Machine(model=inter,
        states=['DEMANDE', 'TECH1_ASSIGNE', 'TECH2_VALIDE', 'IA_VALIDE', 'TERMINE'],
        transitions=[
            {'trigger': 'assigner_tech1', 'source': 'DEMANDE',      'dest': 'TECH1_ASSIGNE'},
            {'trigger': 'valider_tech2',  'source': 'TECH1_ASSIGNE', 'dest': 'TECH2_VALIDE'},
            {'trigger': 'valider_ia',     'source': 'TECH2_VALIDE',  'dest': 'IA_VALIDE'},
            {'trigger': 'terminer',       'source': 'IA_VALIDE',     'dest': 'TERMINE'},
        ],
        initial='DEMANDE')

    inter.assigner_tech1()
    t.ajouter_etape("Tech1 assigné (DEMANDE→TECH1_ASSIGNE)",
                    inter.state == 'TECH1_ASSIGNE', f"État: {inter.state}")

    inter.valider_tech2()
    t.ajouter_etape("Tech2 validé (TECH1_ASSIGNE→TECH2_VALIDE)",
                    inter.state == 'TECH2_VALIDE', f"État: {inter.state}")

    inter.valider_ia()
    t.ajouter_etape("IA validée (TECH2_VALIDE→IA_VALIDE)",
                    inter.state == 'IA_VALIDE', f"État: {inter.state}")

    # Étape 3 : Compilateur NL→SQL
    r = compiler.compile("Quelles interventions sont en cours ?")
    t.ajouter_etape("Compilation NL→SQL : interventions en cours",
                    r.success, r.sql.strip() if r.sql else str(r.errors))

    # Étape 4 : Exécution SQL
    try:
        with get_cursor() as cur:
            cur.execute("SELECT COUNT(*) as n FROM interventions WHERE statut != 'TERMINE'")
            n = cur.fetchone()['n']
        t.ajouter_etape("Exécution SQL sur BD réelle",
                        True, f"{n} intervention(s) en cours")
    except Exception as e:
        t.ajouter_etape("Exécution SQL", False, str(e))

    inter.terminer()
    t.ajouter_etape("Intervention terminée (IA_VALIDE→TERMINE)",
                    inter.state == 'TERMINE', f"État final: {inter.state}")

    return t


# ══════════════════════════════════════════════════════════════
# SCÉNARIO 2 : Compilation de requêtes variées
# ══════════════════════════════════════════════════════════════

def scenario_2():
    """Test de 8 requêtes NL variées avec vérification SQL."""
    t = TestResult("SCÉNARIO 2 : Compilation de requêtes variées")

    requetes = [
        ("Affiche les 5 zones les plus polluées",
         ["limit 5", "capteurs"]),
        ("Combien de capteurs sont hors service ?",
         ["count(*)", "hors_service"]),
        ("Quels citoyens ont un score écologique > 80 ?",
         ["score_ecolo", "80"]),
        ("Liste tous les véhicules",
         ["from vehicules"]),
        ("Montre les interventions terminées",
         ["statut = 'termine'"]),
        ("Affiche les 3 premières interventions",
         ["limit 3"]),
        ("Quels capteurs sont actifs ?",
         ["statut = 'actif'"]),
        ("Combien de citoyens y a-t-il ?",
         ["count(*)", "citoyens"]),
    ]

    for nl, fragments_attendus in requetes:
        r = compiler.compile(nl)
        if r.success:
            sql_lower = r.sql.lower()
            ok = all(f.lower() in sql_lower for f in fragments_attendus)
            t.ajouter_etape(f"'{nl}'", ok,
                            " ".join(r.sql.split()) if ok else
                            f"Manque: {[f for f in fragments_attendus if f not in sql_lower]}")
        else:
            t.ajouter_etape(f"'{nl}'", False, str(r.errors))

    return t


# ══════════════════════════════════════════════════════════════
# SCÉNARIO 3 : Gestion des erreurs du compilateur
# ══════════════════════════════════════════════════════════════

def scenario_3():
    """Test des erreurs et cas limites du compilateur."""
    t = TestResult("SCÉNARIO 3 : Gestion des erreurs compilateur")

    # Requêtes qui doivent échouer
    erreurs = [
        "Affiche les ponts détruits",
        "Montre les bâtiments en feu",
        "",
    ]
    for nl in erreurs:
        r = compiler.compile(nl)
        t.ajouter_etape(f"Erreur détectée : '{nl}'",
                        not r.success,
                        f"Erreur: {r.errors[0][:60] if r.errors else 'non détectée'}")

    # Requêtes ambiguës qui doivent quand même compiler
    ambigues = [
        "Donne les données",
        "Montre tout",
    ]
    for nl in ambigues:
        r = compiler.compile(nl)
        t.ajouter_etape(f"Requête ambiguë gérée : '{nl}'",
                        r.success,
                        " ".join(r.sql.split()) if r.sql else str(r.errors))

    return t


# ══════════════════════════════════════════════════════════════
# SCÉNARIO 4 : Automate véhicule complet
# ══════════════════════════════════════════════════════════════

def scenario_4():
    """Test complet de l'automate véhicule avec cas de panne."""
    t = TestResult("SCÉNARIO 4 : Automate véhicule — trajet avec panne")

    class Vehicule:
        def notifier_arrivee(self):
            pass
    v = Vehicule()
    machine = Machine(model=v,
        states=['STATIONNE', 'EN_ROUTE', 'EN_PANNE', 'ARRIVE'],
        transitions=[
            {'trigger': 'demarrer', 'source': 'STATIONNE',             'dest': 'EN_ROUTE'},
            {'trigger': 'panne',    'source': 'EN_ROUTE',               'dest': 'EN_PANNE'},
            {'trigger': 'reparer',  'source': 'EN_PANNE',               'dest': 'EN_ROUTE'},
            {'trigger': 'arriver',  'source': ['EN_ROUTE', 'EN_PANNE'], 'dest': 'ARRIVE',
             'after': 'notifier_arrivee'},
            {'trigger': 'garer',    'source': 'ARRIVE',                 'dest': 'STATIONNE'},
        ],
        initial='STATIONNE')

    transitions_test = [
        ('demarrer', 'EN_ROUTE'),
        ('panne',    'EN_PANNE'),
        ('reparer',  'EN_ROUTE'),
        ('arriver',  'ARRIVE'),
        ('garer',    'STATIONNE'),
    ]

    for trigger, etat_attendu in transitions_test:
        getattr(v, trigger)()
        t.ajouter_etape(f"Transition '{trigger}' → {etat_attendu}",
                        v.state == etat_attendu, f"État: {v.state}")

    # Test transition invalide
    try:
        v.panne()  # depuis STATIONNE : invalide
        t.ajouter_etape("Transition invalide détectée", False, "Aurait dû lever une exception")
    except Exception:
        t.ajouter_etape("Transition invalide correctement rejetée", True,
                        "Exception levée comme attendu")

    return t


# ══════════════════════════════════════════════════════════════
# SCÉNARIO 5 : Vérification des données BD
# ══════════════════════════════════════════════════════════════

def scenario_5():
    """Vérifie que la BD contient les données attendues."""
    t = TestResult("SCÉNARIO 5 : Vérification des données BD (1000+ enregistrements)")

    try:
        with get_cursor() as cur:
            # Vérifier le nombre d'enregistrements
            tables_min = {
                'capteurs': 10,
                'citoyens': 10,
                'interventions': 10,
                'vehicules': 5,
                'mesures': 100,
            }
            for table, minimum in tables_min.items():
                cur.execute(f"SELECT COUNT(*) as n FROM {table}")
                n = cur.fetchone()['n']
                t.ajouter_etape(f"Table {table} : {n} enregistrements (min {minimum})",
                                n >= minimum, f"Trouvé: {n}")

            # Vérifier les séries temporelles
            cur.execute("SELECT MIN(date) as deb, MAX(date) as fin, COUNT(*) as n FROM mesures")
            row = cur.fetchone()
            t.ajouter_etape("Séries temporelles présentes",
                            row['n'] > 0 and row['deb'] is not None,
                            f"Du {row['deb']} au {row['fin']} ({row['n']} mesures)")

            # Vérifier la diversité des statuts
            cur.execute("SELECT COUNT(DISTINCT statut) as n FROM capteurs")
            n = cur.fetchone()['n']
            t.ajouter_etape("Diversité des statuts capteurs",
                            n >= 2, f"{n} statuts différents")

    except Exception as e:
        t.ajouter_etape("Accès BD", False, str(e))

    return t


# ══════════════════════════════════════════════════════════════
# SCÉNARIO 6 : Pipeline NL→SQL→BD complet
# ══════════════════════════════════════════════════════════════

def scenario_6():
    """Test du pipeline complet NL→SQL→Exécution BD."""
    t = TestResult("SCÉNARIO 6 : Pipeline complet NL → SQL → BD")

    requetes_bd = [
        "Combien de capteurs sont hors service ?",
        "Liste tous les citoyens",
        "Affiche les interventions terminées",
        "Montre les véhicules",
    ]

    for nl in requetes_bd:
        try:
            # Compiler
            r = compiler.compile(nl)
            if not r.success:
                t.ajouter_etape(f"Compilation : '{nl}'", False, str(r.errors))
                continue

            # Exécuter
            with get_cursor() as cur:
                cur.execute(r.sql)
                rows = cur.fetchall()

            t.ajouter_etape(f"Pipeline '{nl}'", True,
                            f"SQL OK → {len(rows)} ligne(s) retournée(s)")
        except Exception as e:
            t.ajouter_etape(f"Pipeline '{nl}'", False, str(e))

    return t


# ══════════════════════════════════════════════════════════════
# SCÉNARIO 7 : Rapport IA locale
# ══════════════════════════════════════════════════════════════

def scenario_7():
    """Test de la génération de rapports IA."""
    t = TestResult("SCÉNARIO 7 : Génération de rapports IA")

    try:
        # Importer le module IA
        sys.path.insert(0, base)
        from ia_generative import IAGenerativeLocale

        ia = IAGenerativeLocale()
        ia.collector.charger_tout()
        stats = ia.collector.analyser()
        donnees = {'capteurs': ia.collector.df_capteurs.to_dict('records')}
        # Test rapport
        ia = IAGenerativeLocale()
        rapport = ia.rapport_journalier()
        t.ajouter_etape("Génération rapport journalier",
                        len(rapport) > 100,
                        f"{len(rapport)} caractères générés")

        # Test suggestions
        suggestions = ia.suggestions_actions()
        t.ajouter_etape("Génération suggestions d'actions",
                        len(suggestions) > 10,
                        f"{len(suggestions)} caractères")

    except Exception as e:
        t.ajouter_etape("Module IA", False, str(e))

    return t


# ══════════════════════════════════════════════════════════════
# SCÉNARIO 8 : Performances du compilateur
# ══════════════════════════════════════════════════════════════

def scenario_8():
    """Test des performances : 50 requêtes compilées en < 2 secondes."""
    t = TestResult("SCÉNARIO 8 : Performances du compilateur")

    requetes = [
        "Affiche les capteurs actifs",
        "Combien de citoyens ?",
        "Liste les interventions",
        "Montre les mesures",
        "Quels véhicules sont en panne ?",
    ] * 10  # 50 requêtes

    debut = time.time()
    succes = 0
    for nl in requetes:
        r = compiler.compile(nl)
        if r.success:
            succes += 1
    duree = time.time() - debut

    t.ajouter_etape(f"{len(requetes)} requêtes compilées",
                    succes == len(requetes),
                    f"{succes}/{len(requetes)} succès")

    t.ajouter_etape(f"Performances : {round(duree, 3)}s (max 2s)",
                    duree < 2.0,
                    f"{round(len(requetes)/duree, 1)} requêtes/seconde")

    return t


# ══════════════════════════════════════════════════════════════
# SCÉNARIO 9 : Cohérence automates ↔ BD
# ══════════════════════════════════════════════════════════════

def scenario_9():
    """Vérifie que les statuts en BD sont des états valides des automates."""
    t = TestResult("SCÉNARIO 9 : Cohérence automates ↔ Base de données")

    etats_valides = {
        'capteurs':      {'ACTIF', 'INACTIF', 'SIGNALE', 'EN_MAINTENANCE', 'HORS_SERVICE'},
        'interventions': {'DEMANDE', 'TECH1_ASSIGNE', 'TECH2_VALIDE', 'IA_VALIDE', 'TERMINE'},
        'vehicules':     {'STATIONNE', 'EN_ROUTE', 'EN_PANNE', 'ARRIVE'},
    }

    try:
        with get_cursor() as cur:
            for table, etats in etats_valides.items():
                cur.execute(f"SELECT DISTINCT statut FROM {table}")
                statuts_bd = {r['statut'] for r in cur.fetchall()}
                invalides = statuts_bd - etats
                t.ajouter_etape(
                    f"Statuts valides dans {table}",
                    len(invalides) == 0,
                    f"Statuts BD: {statuts_bd}" if not invalides
                    else f"Statuts invalides: {invalides}"
                )
    except Exception as e:
        t.ajouter_etape("Vérification cohérence", False, str(e))

    return t


# ══════════════════════════════════════════════════════════════
# SCÉNARIO 10 : Séries temporelles
# ══════════════════════════════════════════════════════════════

def scenario_10():
    """Test des requêtes sur les séries temporelles."""
    t = TestResult("SCÉNARIO 10 : Séries temporelles et agrégations")

    try:
        with get_cursor() as cur:
            # Requête séries temporelles
            cur.execute("""
                SELECT capteur_id, type_mesure,
                       AVG(valeur) as moyenne,
                       MAX(valeur) as maximum,
                       MIN(valeur) as minimum,
                       COUNT(*) as nb_mesures
                FROM mesures
                GROUP BY capteur_id, type_mesure
                ORDER BY nb_mesures DESC
                LIMIT 5
            """)
            rows = cur.fetchall()
            t.ajouter_etape("Agrégation séries temporelles",
                            len(rows) > 0,
                            f"{len(rows)} groupes, ex: moy={round(rows[0]['moyenne'],2) if rows else 0}")

            # Mesures par période
            cur.execute("""
                SELECT DATE_TRUNC('month', date) as mois, COUNT(*) as n
                FROM mesures
                GROUP BY mois
                ORDER BY mois
            """)
            mois = cur.fetchall()
            t.ajouter_etape("Distribution temporelle par mois",
                            len(mois) > 0,
                            f"{len(mois)} mois de données")

            # Tendance pollution
            cur.execute("""
                SELECT type_mesure, ROUND(AVG(valeur)::numeric, 2) as moy
                FROM mesures
                GROUP BY type_mesure
                ORDER BY moy DESC
            """)
            tendances = cur.fetchall()
            t.ajouter_etape("Tendances par type de mesure",
                            len(tendances) > 0,
                            ", ".join(f"{r['type_mesure']}={r['moy']}" for r in tendances[:3]))

            # Test compilateur sur mesures
            r = compiler.compile("Affiche les mesures")
            t.ajouter_etape("Compilateur NL sur mesures",
                            r.success,
                            " ".join(r.sql.split()) if r.sql else str(r.errors))

    except Exception as e:
        t.ajouter_etape("Séries temporelles", False, str(e))

    return t


# ══════════════════════════════════════════════════════════════
# RUNNER PRINCIPAL
# ══════════════════════════════════════════════════════════════

def lancer_tous_les_scenarios():
    print("\n" + "="*65)
    print("  SUITE DE TESTS — Smart City Neo-Sousse 2030")
    print(f"  {datetime.datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print("="*65)

    if not test_connection():
        print("❌ PostgreSQL non disponible.")
        sys.exit(1)

    scenarios = [
        scenario_1, scenario_2, scenario_3, scenario_4, scenario_5,
        scenario_6, scenario_7, scenario_8, scenario_9, scenario_10,
    ]

    resultats = []
    for i, scenario_fn in enumerate(scenarios, 1):
        print(f"\n  ▶ Exécution scénario {i}/10...", end="", flush=True)
        try:
            r = scenario_fn()
            resultats.append(r)
            print(f" {'✅' if r.success else '❌'}")
            r.afficher()
        except Exception as e:
            print(f" ❌ Exception : {e}")

    # Résumé final
    print("\n" + "="*65)
    print("  RÉSUMÉ FINAL")
    print("="*65)
    passes = sum(1 for r in resultats if r.success)
    total_etapes = sum(len(r.etapes) for r in resultats)
    etapes_ok = sum(sum(1 for _, ok, _ in r.etapes if ok) for r in resultats)

    for r in resultats:
        icon = "✅" if r.success else "❌"
        print(f"  {icon} {r.nom[:55]:<55} ({r.duree()}s)")

    print(f"\n  Scénarios  : {passes}/{len(resultats)} réussis")
    print(f"  Étapes     : {etapes_ok}/{total_etapes} réussies")
    print(f"  Durée totale : {round(sum(r.duree() for r in resultats), 2)}s")

    if passes == len(resultats):
        print("\n  🎉 TOUS LES TESTS PASSENT !")
    else:
        print(f"\n  ⚠️  {len(resultats)-passes} scénario(s) en échec")
    print("="*65 + "\n")


if __name__ == "__main__":
    lancer_tous_les_scenarios()