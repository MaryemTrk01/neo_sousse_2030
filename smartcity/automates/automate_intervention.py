from transitions import Machine

class Intervention:
    def __init__(self, id):
        self.id = id

    # Action automatique déclenchée après validation IA
    def notifier_ia(self):
        print(f"Intervention {self.id} validée par l’IA ✅")

states = ['DEMANDE', 'TECH1_ASSIGNE', 'TECH2_VALIDE', 'IA_VALIDE', 'TERMINE']

transitions = [
    {'trigger': 'assigner_tech1', 'source': 'DEMANDE', 'dest': 'TECH1_ASSIGNE'},
    {'trigger': 'valider_tech2', 'source': 'TECH1_ASSIGNE', 'dest': 'TECH2_VALIDE'},
    {'trigger': 'valider_ia', 'source': 'TECH2_VALIDE', 'dest': 'IA_VALIDE', 'after': 'notifier_ia'},
    {'trigger': 'terminer', 'source': 'IA_VALIDE', 'dest': 'TERMINE'}
]

intervention = Intervention("Intervention-01")
machine = Machine(model=intervention, states=states, transitions=transitions, initial='DEMANDE')

# Simulation
print("État courant :", intervention.state)   # DEMANDE
intervention.assigner_tech1()
print("État courant :", intervention.state)   # TECH1_ASSIGNE
intervention.valider_tech2()
print("État courant :", intervention.state)   # TECH2_VALIDE
intervention.valider_ia()   # déclenche notifier_ia automatiquement
print("État courant :", intervention.state)   # IA_VALIDE
intervention.terminer()
print("État courant :", intervention.state)   # TERMINE
