"""
COMPILER - Point d'entrée principal du compilateur NL → SQL
Usage :
    from compiler import NLCompiler
    compiler = NLCompiler()
    result = compiler.compile("Affiche les 5 zones les plus polluées")
    print(result.sql)
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from dataclasses import dataclass, field
from typing import Optional, List

from lexer import Lexer, Token
from nl_parser import Parser, ParseError, QueryNode
from semantic import SemanticAnalyzer, SemanticResult
from codegen import SQLGenerator


# ─────────────────────────────────────────────
# Résultat de compilation
# ─────────────────────────────────────────────

@dataclass
class CompileResult:
    success: bool
    sql: Optional[str]
    nl_input: str
    tokens: List[Token] = field(default_factory=list)
    ast: Optional[QueryNode] = None
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    stages: dict = field(default_factory=dict)  # Pour debug

    def __str__(self):
        if self.success:
            lines = [
                f"✅ Compilation réussie",
                f"   NL  : {self.nl_input}",
                f"   SQL : {self.sql}",
            ]
            if self.warnings:
                for w in self.warnings:
                    lines.append(f"   ⚠  {w}")
        else:
            lines = [
                f"❌ Échec de compilation",
                f"   NL : {self.nl_input}",
            ]
            for e in self.errors:
                lines.append(f"   Erreur : {e}")
        return "\n".join(lines)


# ─────────────────────────────────────────────
# Compilateur principal
# ─────────────────────────────────────────────

class NLCompiler:
    """
    Compilateur langage naturel → SQL en 4 phases :
    1. Lexer       : tokenisation
    2. Parser      : construction de l'AST
    3. Sémantique  : validation + corrections
    4. Génération  : production SQL
    """

    def __init__(self, debug: bool = False):
        self.debug = debug

    def compile(self, nl_query: str) -> CompileResult:
        """
        Compile une requête en langage naturel vers SQL.
        Retourne un CompileResult avec le SQL ou les erreurs.
        """
        result = CompileResult(
            success=False,
            sql=None,
            nl_input=nl_query,
        )

        # ── Phase 1 : Lexer ──────────────────────
        try:
            lexer = Lexer(nl_query)
            tokens = lexer.tokenize()
            result.tokens = tokens
            result.stages["lexer"] = [str(t) for t in tokens]

            if self.debug:
                print(f"\n[LEXER] {len(tokens)} tokens générés")
                for t in tokens:
                    print(f"  {t}")

        except Exception as e:
            result.errors.append(f"[Lexer] {str(e)}")
            return result

        # ── Phase 2 : Parser ─────────────────────
        try:
            parser = Parser(tokens)
            ast = parser.parse()
            result.ast = ast
            result.stages["parser"] = str(ast)

            if self.debug:
                print(f"\n[PARSER] AST construit : {ast}")

        except ParseError as e:
            result.errors.append(f"[Parser] {str(e)}")
            return result
        except Exception as e:
            result.errors.append(f"[Parser] Erreur inattendue : {str(e)}")
            return result

        # ── Phase 3 : Analyse sémantique ─────────
        try:
            sem = SemanticAnalyzer(ast)
            sem_result: SemanticResult = sem.analyze()
            result.warnings.extend(sem_result.warnings)

            if self.debug:
                print(f"\n[SEMANTIC] Valide: {sem_result.is_valid}")
                if sem_result.errors:
                    print(f"  Erreurs : {sem_result.errors}")
                if sem_result.warnings:
                    print(f"  Warnings : {sem_result.warnings}")

            if not sem_result.is_valid:
                result.errors.extend(sem_result.errors)
                return result

            validated_ast = sem_result.corrected_node

        except Exception as e:
            result.errors.append(f"[Semantic] {str(e)}")
            return result

        # ── Phase 4 : Génération SQL ──────────────
        try:
            gen = SQLGenerator(validated_ast)
            sql = gen.generate()
            result.sql = sql
            result.success = True
            result.stages["codegen"] = sql

            if self.debug:
                print(f"\n[CODEGEN] SQL généré :\n{sql}")

        except Exception as e:
            result.errors.append(f"[CodeGen] {str(e)}")
            return result

        return result

    def compile_batch(self, queries: List[str]) -> List[CompileResult]:
        """Compile une liste de requêtes."""
        return [self.compile(q) for q in queries]


# ─────────────────────────────────────────────
# CLI interactif
# ─────────────────────────────────────────────

def interactive_mode():
    """Mode interactif en ligne de commande."""
    compiler = NLCompiler(debug=False)
    print("\n" + "="*60)
    print("  Compilateur NL → SQL — Smart City Neo-Sousse 2030")
    print("  Tapez 'quitter' ou 'exit' pour arrêter")
    print("  Tapez 'debug' pour activer/désactiver le mode debug")
    print("="*60 + "\n")

    while True:
        try:
            query = input("NL> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nAu revoir !")
            break

        if not query:
            continue
        if query.lower() in ("quitter", "exit", "quit"):
            print("Au revoir !")
            break
        if query.lower() == "debug":
            compiler.debug = not compiler.debug
            print(f"Debug : {'ON' if compiler.debug else 'OFF'}")
            continue
        if query.lower() == "aide":
            _print_help()
            continue

        result = compiler.compile(query)
        print(result)
        print()


def _print_help():
    """Affiche l'aide."""
    print("""
Exemples de requêtes supportées :
  - "Affiche les 5 zones les plus polluées"
  - "Combien de capteurs sont hors service ?"
  - "Quels citoyens ont un score écologique > 80 ?"
  - "Donne-moi le trajet le plus économique en CO2"
  - "Montre les interventions en cours"
  - "Trouve les capteurs actifs avec un taux d'erreur supérieur à 10"
  - "Liste les véhicules en panne"
  - "Affiche les mesures de la zone nord"
""")


# ─────────────────────────────────────────────
# Point d'entrée
# ─────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Requête passée en argument
        query = " ".join(sys.argv[1:])
        compiler = NLCompiler(debug=True)
        result = compiler.compile(query)
        print(result)
    else:
        interactive_mode()