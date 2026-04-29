from transitions import Machine
import datetime

class Capteur:
    def __init__(self, name):
        self.name = name
        self.hs_since = None  # date/heure quand le capteur est passé HS

    # Callback appelé automatiquement après la transition vers HORS_SERVICE
    def set_hs_time(self):
        self.hs_since = datetime.datetime.now()

    # Action automatique : vérifier si HS > 24h
    def alerte_hs(self):
        if self.hs_since and (datetime.datetime.now() - self.hs_since).days >= 1:
            print(f"Alerte : {self.name} hors service depuis plus de 24h !")
        else:
            print(f"{self.name} est HS mais depuis moins de 24h.")

# États du capteur
states = ['INACTIF', 'ACTIF', 'SIGNALE', 'EN_MAINTENANCE', 'HORS_SERVICE']

# Transitions avec callback
transitions = [
    {'trigger': 'activer', 'source': 'INACTIF', 'dest': 'ACTIF'},
    {'trigger': 'signaler', 'source': 'ACTIF', 'dest': 'SIGNALE'},
    {'trigger': 'maintenir', 'source': 'SIGNALE', 'dest': 'EN_MAINTENANCE'},
    {'trigger': 'declarer_hs', 'source': 'EN_MAINTENANCE', 'dest': 'HORS_SERVICE', 'after': 'set_hs_time'}
]

# Création de l’automate
capteur = Capteur("Capteur-01")
machine = Machine(model=capteur, states=states, transitions=transitions, initial='INACTIF')

# Simulation
print("État courant :", capteur.state)   # INACTIF
capteur.activer()
capteur.signaler()
capteur.maintenir()
capteur.declarer_hs()
print("État courant :", capteur.state)   # HORS_SERVICE

# Vérification automatique
capteur.alerte_hs()
