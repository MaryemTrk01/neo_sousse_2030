from transitions import Machine

class SmartCityEntity:
    pass

class SensorAutomata(SmartCityEntity):
    states = ['INACTIF', 'ACTIF', 'SIGNALÉ', 'EN_MAINTENANCE', 'HORS_SERVICE']
    
    def __init__(self, name, initial_state='INACTIF'):
        self.name = name
        self.machine = Machine(model=self, states=SensorAutomata.states, initial=initial_state)
        
        # Transitions
        self.machine.add_transition('installer', 'INACTIF', 'ACTIF')
        self.machine.add_transition('signaler_panne', 'ACTIF', 'SIGNALÉ')
        self.machine.add_transition('demarrer_maintenance', 'SIGNALÉ', 'EN_MAINTENANCE')
        self.machine.add_transition('reparer', 'EN_MAINTENANCE', 'ACTIF')
        self.machine.add_transition('declarer_hs', 'EN_MAINTENANCE', 'HORS_SERVICE')
        self.machine.add_transition('declarer_hs', 'ACTIF', 'HORS_SERVICE')

class InterventionAutomata(SmartCityEntity):
    states = ['DEMANDE', 'TECH1_ASSIGNÉ', 'TECH2_VALIDE', 'IA_VALIDE', 'TERMINÉ']
    
    def __init__(self, name, initial_state='DEMANDE'):
        self.name = name
        self.machine = Machine(model=self, states=InterventionAutomata.states, initial=initial_state)
        
        # Transitions
        self.machine.add_transition('assigner_tech', 'DEMANDE', 'TECH1_ASSIGNÉ')
        self.machine.add_transition('valider_tech', 'TECH1_ASSIGNÉ', 'TECH2_VALIDE')
        self.machine.add_transition('valider_ia', 'TECH2_VALIDE', 'IA_VALIDE')
        self.machine.add_transition('terminer', 'IA_VALIDE', 'TERMINÉ')

class VehicleAutomata(SmartCityEntity):
    states = ['STATIONNÉ', 'EN_ROUTE', 'EN_PANNE', 'ARRIVÉ']
    
    def __init__(self, name, initial_state='STATIONNÉ'):
        self.name = name
        self.machine = Machine(model=self, states=VehicleAutomata.states, initial=initial_state)
        
        # Transitions
        self.machine.add_transition('demarrer', 'STATIONNÉ', 'EN_ROUTE')
        self.machine.add_transition('tomber_en_panne', 'EN_ROUTE', 'EN_PANNE')
        self.machine.add_transition('reparer', 'EN_PANNE', 'STATIONNÉ')
        self.machine.add_transition('arriver', 'EN_ROUTE', 'ARRIVÉ')
        self.machine.add_transition('stationner', 'ARRIVÉ', 'STATIONNÉ')

def get_automata(entity_type, initial_state):
    if entity_type == 'capteur':
        return SensorAutomata("Sensor", initial_state)
    elif entity_type == 'intervention':
        return InterventionAutomata("Intervention", initial_state)
    elif entity_type == 'vehicule':
        return VehicleAutomata("Vehicle", initial_state)
    else:
        raise ValueError("Unknown entity type")
