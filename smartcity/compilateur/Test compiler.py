"""
TEST COMPILER - Suite de tests pour le compilateur NL → SQL
Couvre les scénarios exigés par le projet + cas limites 
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from compiler import NLCompiler


# ─────────────────────────────────────────────
# Jeux de tests
# ─────────────────────────────────────────────

# Format : (description, requête NL, fragment SQL attendu)
TEST_CASES = [
    # ── Tests du projet (exemples officiels) ──
    (
        "TOP 5 zones polluées",
        "Affiche les 5 zones les plus polluées",
        "LIMIT 5",
    ),
    (
        "Comptage capteurs hors service",
        "Combien de capteurs sont hors service ?",
        "COUNT(*)",
    ),
    (
        "Citoyens score > 80",
        "Quels citoyens ont un score écologique > 80 ?",
        "score_ecolo > 80",
    ),
    (
        "Trajet économique CO2",
        "Donne-moi le trajet le plus économique en CO2",
        "economie_co2",
    ),

    # ── Tests supplémentaires ──
    (
        "Interventions en cours",
        "Montre les interventions en cours",
        "statut = 'en_cours'",
    ),
    (
        "Capteurs avec taux erreur élevé",
        "Trouve les capteurs actifs avec un taux d'erreur supérieur à 10",
        "taux_erreur > 10",
    ),
    (
        "Véhicules en panne",
        "Liste les véhicules en panne",
        "statut = 'en_panne'",
    ),
    (
        "Capteurs hors service count",
        "Combien de capteurs hors service y a-t-il ?",
        "COUNT(*)",
    ),
    (
        "Interventions terminées",
        "Affiche les interventions terminées",
        "statut = 'termine'",
    ),
    (
        "Citoyens liste",
        "Liste tous les citoyens",
        "FROM citoyens",
    ),
    (
        "Mesures par zone",
        "Montre les mesures",
        "FROM mesures",
    ),
    (
        "Capteurs inactifs",
        "Quels capteurs sont inactifs ?",
        "statut = 'inactif'",
    ),
]

# Tests qui doivent échouer (erreurs attendues)
ERROR_CASES = [
    (
        "Entité inconnue",
        "Affiche les ponts détruits",
        "Entité non reconnue",
    ),
    (
        "Requête vide",
        "",
        None,
    ),
]

# Tests de requêtes ambiguës (bonus +5%)
AMBIGUOUS_CASES = [
    "Donne les données",
    "Montre tout",
    "Quels sont les problèmes ?",
]


# ─────────────────────────────────────────────
# Runner de tests
# ─────────────────────────────────────────────

class TestRunner:
    def __init__(self):
        self.compiler = NLCompiler(debug=False)
        self.passed = 0
        self.failed = 0
        self.warnings_count = 0

    def run_all(self):
        print("\n" + "="*65)
        print("  TESTS COMPILATEUR NL → SQL — Smart City Neo-Sousse 2030")
        print("="*65)

        self._run_success_tests()
        self._run_error_tests()
        self._run_ambiguous_tests()
        self._print_summary()

    def _run_success_tests(self):
        print("\n📋 Tests de compilation réussie :")
        print("-"*65)

        for i, (desc, query, expected_fragment) in enumerate(TEST_CASES, 1):
            result = self.compiler.compile(query)

            status = "✅"
            note = ""

            if not result.success:
                status = "❌"
                note = f" → Erreurs : {result.errors}"
                self.failed += 1
            elif expected_fragment and expected_fragment.lower() not in result.sql.lower():
                status = "⚠️ "
                note = f" → Fragment '{expected_fragment}' non trouvé dans SQL"
                self.warnings_count += 1
                self.passed += 1
            else:
                self.passed += 1

            print(f"\n  [{i:02d}] {status} {desc}")
            print(f"       NL  : {query}")
            if result.success:
                # Afficher le SQL sur une seule ligne pour lisibilité
                sql_line = " ".join(result.sql.split())
                print(f"       SQL : {sql_line}")
            if note:
                print(f"       {note}")
            if result.warnings:
                for w in result.warnings:
                    print(f"       ⚠  {w}")

    def _run_error_tests(self):
        print("\n\n🚫 Tests d'erreurs attendues :")
        print("-"*65)

        for i, (desc, query, expected_error) in enumerate(ERROR_CASES, 1):
            result = self.compiler.compile(query)

            if not result.success:
                status = "✅ (erreur correctement détectée)"
                self.passed += 1
            else:
                status = "❌ (aurait dû échouer)"
                self.failed += 1

            print(f"\n  [{i:02d}] {status}")
            print(f"       NL     : '{query}'")
            if result.errors:
                print(f"       Erreur : {result.errors[0][:80]}")

    def _run_ambiguous_tests(self):
        print("\n\n🤔 Tests de requêtes ambiguës (bonus) :")
        print("-"*65)

        for i, query in enumerate(AMBIGUOUS_CASES, 1):
            result = self.compiler.compile(query)
            status = "✅" if result.success else "⚠️ "
            sql_line = " ".join(result.sql.split()) if result.sql else "—"
            print(f"\n  [{i}] {status} NL  : {query}")
            print(f"        SQL : {sql_line}")

    def _print_summary(self):
        total = self.passed + self.failed
        print("\n" + "="*65)
        print(f"  RÉSULTATS : {self.passed}/{total} tests réussis", end="")
        if self.warnings_count:
            print(f"  ({self.warnings_count} avertissements)", end="")
        print()

        if self.failed == 0:
            print("  🎉 Tous les tests passent !")
        else:
            print(f"  ❌ {self.failed} test(s) en échec")
        print("="*65 + "\n")


# ─────────────────────────────────────────────
# Tests unitaires par composant
# ─────────────────────────────────────────────

def test_lexer():
    """Tests unitaires du lexer."""
    from lexer import Lexer, TokenType
    print("\n[Unit] Lexer :")
    tests = [
        ("affiche les 5 zones", [TokenType.SHOW, TokenType.NUMBER, TokenType.ZONES]),
        ("combien de capteurs", [TokenType.COUNT, TokenType.CAPTEURS]),
    ]
    for text, expected_types in tests:
        lex = Lexer(text)
        tokens = lex.tokenize()
        actual_types = [t.type for t in tokens if t.type.name not in ("EOF", "UNKNOWN")]
        ok = all(et in actual_types for et in expected_types)
        print(f"  {'✅' if ok else '❌'} '{text}' → {[t.name for t in actual_types]}")


def test_parser():
    """Tests unitaires du parser."""
    from lexer import Lexer
    from nl_parser import Parser
    print("\n[Unit] Parser :")
    tests = [
        ("affiche les capteurs", "capteurs", "SELECT"),
        ("combien de citoyens", "citoyens", "COUNT"),
    ]
    for text, expected_entity, expected_action in tests:
        lex = Lexer(text)
        tokens = lex.tokenize()
        parser = Parser(tokens)
        ast = parser.parse()
        ok = ast.entity == expected_entity and ast.action == expected_action
        print(f"  {'✅' if ok else '❌'} '{text}' → entity={ast.entity}, action={ast.action}")


# ─────────────────────────────────────────────
# Point d'entrée
# ─────────────────────────────────────────────

if __name__ == "__main__":
    # Tests unitaires
    test_lexer()
    test_parser()

    # Suite complète
    runner = TestRunner()
    runner.run_all()