"""
AUTOMATES_DB.PY — Intégration des automates avec PostgreSQL
Connecte les 3 automates (capteur, intervention, véhicule) à la base smartcity.

Usage :
    python automates_db.py
"""

import sys
import os
import datetime

# Ajouter les dossiers nécessaires au path
base = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(base, 'bdd'))

from transitions import Machine
from db_config import get_cursor, test_connection


# ══════════════════════════════════════════════════════════════
# AUTOMATE 1 : CAPTEUR (connecté à la table capteurs)
# ══════════════════════════════════════════════════════════════

class CapteurDB:
    def __init__(self, capteur_id):
        self.capteur_id = capteur_id
        self.hs_since = None

        # Lire l'état actuel depuis la BD
        state = self._lire_statut() or 'INACTIF'

        states = ['INACTIF', 'ACTIF', 'SIGNALE', 'EN_MAINTENANCE', 'HORS_SERVICE']
        transitions = [
            {'trigger': 'activer',     'source': 'INACTIF',        'dest': 'ACTIF'},
            {'trigger': 'signaler',    'source': 'ACTIF',           'dest': 'SIGNALE'},
            {'trigger': 'maintenir',   'source': 'SIGNALE',         'dest': 'EN_MAINTENANCE'},
            {'trigger': 'reparer',     'source': 'EN_MAINTENANCE',  'dest': 'ACTIF'},
            {'trigger': 'declarer_hs', 'source': 'EN_MAINTENANCE',  'dest': 'HORS_SERVICE',
             'after': 'set_hs_time'},
            {'trigger': 'panne',       'source': 'ACTIF',           'dest': 'HORS_SERVICE',
             'after': 'set_hs_time'},
        ]

        self.machine = Machine(
            model=self, states=states,
            transitions=transitions, initial=state
        )

    def _lire_statut(self):
        """Lit le statut actuel depuis PostgreSQL."""
        try:
            with get_cursor() as cur:
                cur.execute("SELECT statut FROM capteurs WHERE id = %s", (self.capteur_id,))
                row = cur.fetchone()
                if row:
                    print(f"  📡 Capteur {self.capteur_id} — statut BD : {row['statut']}")
                    return row['statut']
        except Exception as e:
            print(f"  ⚠️  Lecture BD échouée : {e}")
        return None

    def _sauvegarder_statut(self):
        """Sauvegarde le nouvel état dans PostgreSQL."""
        try:
            with get_cursor() as cur:
                cur.execute(
                    "UPDATE capteurs SET statut = %s WHERE id = %s",
                    (self.state, self.capteur_id)
                )
            print(f"  💾 Capteur {self.capteur_id} → statut '{self.state}' sauvegardé en BD")
        except Exception as e:
            print(f"  ❌ Sauvegarde échouée : {e}")

    def set_hs_time(self):
        self.hs_since = datetime.datetime.now()
        self._sauvegarder_statut()
        print(f"  🚨 ALERTE : Capteur {self.capteur_id} est HORS SERVICE !")

    def transition(self, trigger_name):
        """Déclenche une transition et sauvegarde en BD."""
        print(f"\n  ▶ Événement '{trigger_name}' sur Capteur {self.capteur_id}")
        print(f"    Avant : {self.state}")
        try:
            getattr(self, trigger_name)()
            print(f"    Après : {self.state}")
            if trigger_name not in ('declarer_hs', 'panne'):
                self._sauvegarder_statut()
        except Exception as e:
            print(f"  ❌ Transition invalide : {e}")

    def alerte_hs(self):
        if self.hs_since and (datetime.datetime.now() - self.hs_since).days >= 1:
            print(f"  🚨 ALERTE : Capteur {self.capteur_id} HS depuis plus de 24h !")
        else:
            print(f"  ℹ️  Capteur {self.capteur_id} est HS mais depuis moins de 24h.")


# ══════════════════════════════════════════════════════════════
# AUTOMATE 2 : INTERVENTION (connecté à la table interventions)
# ══════════════════════════════════════════════════════════════

class InterventionDB:
    def __init__(self, intervention_id):
        self.intervention_id = intervention_id

        # Lire l'état actuel depuis la BD
        state = self._lire_statut() or 'DEMANDE'

        states = ['DEMANDE', 'TECH1_ASSIGNE', 'TECH2_VALIDE', 'IA_VALIDE', 'TERMINE']
        transitions = [
            {'trigger': 'assigner_tech1', 'source': 'DEMANDE',       'dest': 'TECH1_ASSIGNE'},
            {'trigger': 'valider_tech2',  'source': 'TECH1_ASSIGNE',  'dest': 'TECH2_VALIDE'},
            {'trigger': 'valider_ia',     'source': 'TECH2_VALIDE',   'dest': 'IA_VALIDE',
             'after': 'notifier_ia'},
            {'trigger': 'terminer',       'source': 'IA_VALIDE',      'dest': 'TERMINE'},
            {'trigger': 'rejeter',        'source': 'TECH1_ASSIGNE',  'dest': 'DEMANDE'},
            {'trigger': 'rejeter',        'source': 'TECH2_VALIDE',   'dest': 'TECH1_ASSIGNE'},
        ]

        self.machine = Machine(
            model=self, states=states,
            transitions=transitions, initial=state
        )

    def _lire_statut(self):
        """Lit le statut actuel depuis PostgreSQL."""
        try:
            with get_cursor() as cur:
                cur.execute("SELECT statut FROM interventions WHERE id = %s",
                            (self.intervention_id,))
                row = cur.fetchone()
                if row:
                    print(f"  🔧 Intervention {self.intervention_id} — statut BD : {row['statut']}")
                    return row['statut']
        except Exception as e:
            print(f"  ⚠️  Lecture BD échouée : {e}")
        return None

    def _sauvegarder_statut(self):
        """Sauvegarde le nouvel état dans PostgreSQL."""
        try:
            with get_cursor() as cur:
                cur.execute(
                    "UPDATE interventions SET statut = %s WHERE id = %s",
                    (self.state, self.intervention_id)
                )
            print(f"  💾 Intervention {self.intervention_id} → statut '{self.state}' sauvegardé")
        except Exception as e:
            print(f"  ❌ Sauvegarde échouée : {e}")

    def notifier_ia(self):
        print(f"  🤖 Intervention {self.intervention_id} validée par l'IA ✅")
        self._sauvegarder_statut()

    def transition(self, trigger_name):
        """Déclenche une transition et sauvegarde en BD."""
        print(f"\n  ▶ Événement '{trigger_name}' sur Intervention {self.intervention_id}")
        print(f"    Avant : {self.state}")
        try:
            getattr(self, trigger_name)()
            print(f"    Après : {self.state}")
            if trigger_name != 'valider_ia':
                self._sauvegarder_statut()
        except Exception as e:
            print(f"  ❌ Transition invalide : {e}")


# ══════════════════════════════════════════════════════════════
# AUTOMATE 3 : VÉHICULE (connecté à la table vehicules)
# ══════════════════════════════════════════════════════════════

class VehiculeDB:
    def __init__(self, vehicule_id):
        self.vehicule_id = vehicule_id

        # Lire l'état actuel depuis la BD
        state = self._lire_statut() or 'STATIONNE'

        states = ['STATIONNE', 'EN_ROUTE', 'EN_PANNE', 'ARRIVE']
        transitions = [
            {'trigger': 'demarrer', 'source': 'STATIONNE',            'dest': 'EN_ROUTE'},
            {'trigger': 'panne',    'source': 'EN_ROUTE',              'dest': 'EN_PANNE'},
            {'trigger': 'reparer',  'source': 'EN_PANNE',              'dest': 'EN_ROUTE'},
            {'trigger': 'arriver',  'source': ['EN_ROUTE', 'EN_PANNE'],'dest': 'ARRIVE',
             'after': 'notifier_arrivee'},
            {'trigger': 'garer',    'source': 'ARRIVE',                'dest': 'STATIONNE'},
        ]

        self.machine = Machine(
            model=self, states=states,
            transitions=transitions, initial=state
        )

    def _lire_statut(self):
        """Lit le statut actuel depuis PostgreSQL."""
        try:
            with get_cursor() as cur:
                cur.execute("SELECT statut FROM vehicules WHERE id = %s", (self.vehicule_id,))
                row = cur.fetchone()
                if row:
                    print(f"  🚗 Véhicule {self.vehicule_id} — statut BD : {row['statut']}")
                    return row['statut']
        except Exception as e:
            print(f"  ⚠️  Lecture BD échouée : {e}")
        return None

    def _sauvegarder_statut(self):
        """Sauvegarde le nouvel état dans PostgreSQL."""
        try:
            with get_cursor() as cur:
                cur.execute(
                    "UPDATE vehicules SET statut = %s WHERE id = %s",
                    (self.state, self.vehicule_id)
                )
            print(f"  💾 Véhicule {self.vehicule_id} → statut '{self.state}' sauvegardé")
        except Exception as e:
            print(f"  ❌ Sauvegarde échouée : {e}")

    def notifier_arrivee(self):
        print(f"  🚗 Véhicule {self.vehicule_id} est arrivé à destination ✅")
        self._sauvegarder_statut()

    def transition(self, trigger_name):
        """Déclenche une transition et sauvegarde en BD."""
        print(f"\n  ▶ Événement '{trigger_name}' sur Véhicule {self.vehicule_id}")
        print(f"    Avant : {self.state}")
        try:
            getattr(self, trigger_name)()
            print(f"    Après : {self.state}")
            if trigger_name != 'arriver':
                self._sauvegarder_statut()
        except Exception as e:
            print(f"  ❌ Transition invalide : {e}")


# ══════════════════════════════════════════════════════════════
# RAPPORT D'ÉTAT DEPUIS LA BD
# ══════════════════════════════════════════════════════════════

def rapport_etat_bd():
    """Affiche l'état actuel de toutes les entités depuis PostgreSQL."""
    print("\n" + "="*55)
    print("  RAPPORT D'ÉTAT — Base de données smartcity")
    print("="*55)

    try:
        with get_cursor() as cur:
            # Capteurs
            cur.execute("SELECT id, statut, zone FROM capteurs ORDER BY id")
            capteurs = cur.fetchall()
            print(f"\n📡 CAPTEURS ({len(capteurs)} total)")
            for c in capteurs:
                flag = " 🚨" if c['statut'] == 'HORS_SERVICE' else ""
                print(f"   ID {c['id']:<5} zone={c['zone']:<10} statut={c['statut']}{flag}")

            # Interventions
            cur.execute("SELECT id, statut, capteur_id FROM interventions ORDER BY id")
            interventions = cur.fetchall()
            print(f"\n🔧 INTERVENTIONS ({len(interventions)} total)")
            for i in interventions:
                flag = " ✅" if i['statut'] == 'TERMINE' else ""
                print(f"   ID {i['id']:<5} capteur={i['capteur_id']:<5} statut={i['statut']}{flag}")

            # Véhicules
            cur.execute("SELECT id, statut, type FROM vehicules ORDER BY id")
            vehicules = cur.fetchall()
            print(f"\n🚗 VÉHICULES ({len(vehicules)} total)")
            for v in vehicules:
                flag = " 🚨" if v['statut'] == 'EN_PANNE' else ""
                print(f"   ID {v['id']:<5} type={v['type']:<10} statut={v['statut']}{flag}")

    except Exception as e:
        print(f"❌ Erreur lecture BD : {e}")

    print("="*55)


# ══════════════════════════════════════════════════════════════
# DÉMONSTRATION COMPLÈTE
# ══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("\n" + "="*55)
    print("  AUTOMATES + POSTGRESQL — Smart City Neo-Sousse")
    print("="*55)

    # Vérifier la connexion
    if not test_connection():
        print("❌ PostgreSQL non disponible. Vérifiez pgAdmin.")
        sys.exit(1)

    # Rapport initial
    rapport_etat_bd()

    # ── Test Capteur ──────────────────────────────
    print("\n\n── TEST AUTOMATE CAPTEUR ──")
    c = CapteurDB(capteur_id=1)
    c.transition("signaler")
    c.transition("maintenir")
    c.transition("reparer")

    # ── Test Intervention ─────────────────────────
    print("\n\n── TEST AUTOMATE INTERVENTION ──")
    i = InterventionDB(intervention_id=1)
    i.transition("assigner_tech1")
    i.transition("valider_tech2")
    i.transition("valider_ia")
    i.transition("terminer")

    # ── Test Véhicule ─────────────────────────────
    print("\n\n── TEST AUTOMATE VÉHICULE ──")
    v = VehiculeDB(vehicule_id=1)
    v.transition("demarrer")
    v.transition("panne")
    v.transition("reparer")
    v.transition("arriver")

    # Rapport final
    rapport_etat_bd()