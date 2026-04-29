"""
AMBIGUOUS_HANDLER.PY — Gestion des requêtes ambiguës
Smart City Neo-Sousse 2030
Bonus +5% : gestion intelligente des requêtes ambiguës

Détecte et résout les requêtes ambiguës en proposant des clarifications
ou en choisissant l'interprétation la plus probable.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from compiler import NLCompiler
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class AmbiguousResult:
    """Résultat pour une requête ambiguë."""
    original_query: str
    is_ambiguous: bool
    interpretations: List[dict]   # Liste d'interprétations possibles
    chosen_sql: Optional[str]     # SQL choisi automatiquement
    explanation: str


class AmbiguousHandler:
    """
    Gestionnaire de requêtes ambiguës.
    Détecte l'ambiguïté et propose des interprétations.
    """

    # Requêtes ambiguës connues et leurs interprétations
    AMBIGUOUS_PATTERNS = {
        # "montre tout" → peut vouloir dire n'importe quelle table
        'tout': [
            {'label': 'Tous les capteurs',      'query': 'Affiche tous les capteurs'},
            {'label': 'Toutes les mesures',     'query': 'Affiche les mesures'},
            {'label': 'Toutes les interventions','query': 'Liste les interventions'},
        ],
        # "donne les données" → quelle entité ?
        'données': [
            {'label': 'Données capteurs',       'query': 'Affiche tous les capteurs'},
            {'label': 'Données mesures',        'query': 'Affiche les mesures'},
            {'label': 'Données interventions',  'query': 'Liste les interventions'},
        ],
        # "problèmes" → capteurs HS ou interventions en cours ?
        'problèmes': [
            {'label': 'Capteurs hors service',  'query': 'Quels capteurs sont hors service ?'},
            {'label': 'Interventions en cours', 'query': 'Montre les interventions en cours'},
            {'label': 'Véhicules en panne',     'query': 'Quels véhicules sont en panne ?'},
        ],
        # "état" → état de quoi ?
        'état': [
            {'label': 'État des capteurs',      'query': 'Affiche tous les capteurs'},
            {'label': 'État des interventions', 'query': 'Liste les interventions'},
            {'label': 'État des véhicules',     'query': 'Affiche les véhicules'},
        ],
        # "liste" sans entité
        'liste': [
            {'label': 'Liste des capteurs',     'query': 'Liste tous les capteurs'},
            {'label': 'Liste des citoyens',     'query': 'Liste tous les citoyens'},
            {'label': 'Liste des véhicules',    'query': 'Liste tous les véhicules'},
        ],
        # "statistiques"
        'statistiques': [
            {'label': 'Stats capteurs',         'query': 'Combien de capteurs sont actifs ?'},
            {'label': 'Stats interventions',    'query': 'Combien d interventions sont en cours ?'},
            {'label': 'Stats citoyens',         'query': 'Combien de citoyens y a-t-il ?'},
        ],
        # "affiche" sans entité
        'affiche': [
            {'label': 'Afficher les capteurs',  'query': 'Affiche tous les capteurs'},
            {'label': 'Afficher les mesures',   'query': 'Affiche les mesures'},
        ],
    }

    # Mots qui indiquent une requête ambiguë
    AMBIGUOUS_KEYWORDS = [
        'tout', 'toutes', 'données', 'problèmes', 'problème',
        'état', 'liste', 'statistiques', 'infos', 'information',
        'résumé', 'rapport', 'montre tout', 'donne tout',
        'quoi', 'quelque chose', 'n\'importe'
    ]

    def __init__(self):
        self.compiler = NLCompiler()

    def is_ambiguous(self, query: str) -> bool:
        """Détecte si une requête est ambiguë."""
        query_lower = query.lower().strip()

        # Requête très courte (moins de 3 mots)
        if len(query_lower.split()) <= 2:
            return True

        # Contient des mots ambigus sans entité claire
        entites = ['capteur', 'intervention', 'citoyen', 'véhicule',
                   'mesure', 'zone', 'trajet']
        has_entite = any(e in query_lower for e in entites)

        has_ambiguous = any(kw in query_lower for kw in self.AMBIGUOUS_KEYWORDS)

        # Ambiguë si : a des mots ambigus ET pas d'entité claire
        if has_ambiguous and not has_entite:
            return True

        return False

    def get_interpretations(self, query: str) -> List[dict]:
        """Retourne les interprétations possibles pour une requête ambiguë."""
        query_lower = query.lower()

        for keyword, interpretations in self.AMBIGUOUS_PATTERNS.items():
            if keyword in query_lower:
                return interpretations

        # Interprétation générique
        return [
            {'label': 'Vue d\'ensemble capteurs',
             'query': 'Affiche tous les capteurs'},
            {'label': 'Vue d\'ensemble interventions',
             'query': 'Liste les interventions'},
            {'label': 'Vue d\'ensemble citoyens',
             'query': 'Liste tous les citoyens'},
        ]

    def resolve(self, query: str,
                choice_index: int = 0) -> AmbiguousResult:
        """
        Résout une requête ambiguë.
        choice_index : index de l'interprétation choisie (0 = la plus probable)
        """
        if not self.is_ambiguous(query):
            # Pas ambiguë : compiler normalement
            result = self.compiler.compile(query)
            return AmbiguousResult(
                original_query=query,
                is_ambiguous=False,
                interpretations=[],
                chosen_sql=result.sql if result.success else None,
                explanation="Requête claire, compilation directe."
            )

        # Requête ambiguë : proposer des interprétations
        interpretations = self.get_interpretations(query)

        # Choisir automatiquement la première (la plus probable)
        chosen = interpretations[min(choice_index, len(interpretations)-1)]
        result = self.compiler.compile(chosen['query'])

        return AmbiguousResult(
            original_query=query,
            is_ambiguous=True,
            interpretations=interpretations,
            chosen_sql=result.sql if result.success else None,
            explanation=(
                f"Requête ambiguë détectée. "
                f"Interprétation choisie : '{chosen['label']}'. "
                f"Requête reformulée : '{chosen['query']}'"
            )
        )

    def resolve_with_context(self, query: str,
                              context: str = "") -> AmbiguousResult:
        """
        Résout une requête ambiguë en utilisant le contexte
        de la conversation précédente.
        """
        query_lower = query.lower()
        context_lower = context.lower()

        # Si le contexte mentionne une entité, l'utiliser
        if 'capteur' in context_lower:
            chosen_query = f"Affiche tous les capteurs"
        elif 'intervention' in context_lower:
            chosen_query = f"Liste les interventions"
        elif 'véhicule' in context_lower or 'vehicule' in context_lower:
            chosen_query = f"Affiche les véhicules"
        elif 'citoyen' in context_lower:
            chosen_query = f"Liste tous les citoyens"
        else:
            return self.resolve(query)

        result = self.compiler.compile(chosen_query)
        interpretations = self.get_interpretations(query)

        return AmbiguousResult(
            original_query=query,
            is_ambiguous=True,
            interpretations=interpretations,
            chosen_sql=result.sql if result.success else None,
            explanation=(
                f"Requête ambiguë résolue grâce au contexte. "
                f"Requête reformulée : '{chosen_query}'"
            )
        )


# ══════════════════════════════════════════════════════════════
# TEST
# ══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    handler = AmbiguousHandler()

    print("\n" + "="*60)
    print("  TEST REQUÊTES AMBIGUËS — Bonus +5%")
    print("="*60)

    requetes_test = [
        # Ambiguës
        "Montre tout",
        "Donne les données",
        "Quels sont les problèmes ?",
        "Donne-moi les statistiques",
        "Liste",
        "État",
        # Claires (ne doivent pas être détectées comme ambiguës)
        "Combien de capteurs sont hors service ?",
        "Liste tous les citoyens",
        "Quels véhicules sont en panne ?",
    ]

    for q in requetes_test:
        result = handler.resolve(q)
        print(f"\nRequête : '{q}'")
        print(f"  Ambiguë : {'⚠️  OUI' if result.is_ambiguous else '✅ NON'}")
        print(f"  {result.explanation}")
        if result.chosen_sql:
            sql_line = ' '.join(result.chosen_sql.split())
            print(f"  SQL : {sql_line}")
        if result.is_ambiguous:
            print(f"  Autres options :")
            for i, interp in enumerate(result.interpretations):
                print(f"    [{i}] {interp['label']}")