from transitions import Machine

class Vehicule:
    def __init__(self, id):
        self.id = id

    # Action automatique déclenchée après l’arrivée
    def notifier_arrivee(self):
        print(f"Véhicule {self.id} est arrivé à destination 🚗")

states = ['STATIONNE', 'EN_ROUTE', 'EN_PANNE', 'ARRIVE']

transitions = [
    {'trigger': 'demarrer', 'source': 'STATIONNE', 'dest': 'EN_ROUTE'},
    {'trigger': 'panne', 'source': 'EN_ROUTE', 'dest': 'EN_PANNE'},
    {'trigger': 'arriver', 'source': ['EN_ROUTE', 'EN_PANNE'], 'dest': 'ARRIVE', 'after': 'notifier_arrivee'}
]

vehicule = Vehicule("Vehicule-01")
machine = Machine(model=vehicule, states=states, transitions=transitions, initial='STATIONNE')

# Simulation
print("État courant :", vehicule.state)   # STATIONNE
vehicule.demarrer()
print("État courant :", vehicule.state)   # EN_ROUTE
vehicule.panne()
print("État courant :", vehicule.state)   # EN_PANNE
vehicule.arriver()   # déclenche notifier_arrivee automatiquement
print("État courant :", vehicule.state)   # ARRIVE
