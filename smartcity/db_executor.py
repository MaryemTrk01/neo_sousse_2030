"""
DB EXECUTOR — Exécute les requêtes SQL générées par le compilateur NL→SQL
sur la base de données PostgreSQL smartcity.

Usage :
    from db_executor import DBExecutor
    db = DBExecutor()
    results = db.execute_nl("Combien de capteurs sont hors service ?")
    print(results)
"""

import sys
import os

# Ajouter tous les sous-dossiers au path
base = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(base, 'compilateur'))
sys.path.insert(0, os.path.join(base, 'bdd'))

from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from compiler import NLCompiler
from db_config import get_cursor


# ─────────────────────────────────────────────
# Résultat d'exécution
# ─────────────────────────────────────────────

@dataclass
class QueryResult:
    success: bool
    nl_input: str
    sql: Optional[str]
    rows: List[Dict]
    row_count: int
    error: Optional[str] = None

    def __str__(self):
        if not self.success:
            return f"❌ Erreur : {self.error}"
        lines = [
            f"✅ Requête exécutée",
            f"   NL  : {self.nl_input}",
            f"   SQL : {' '.join(self.sql.split())}",
            f"   Résultats : {self.row_count} ligne(s)",
        ]
        for row in self.rows[:10]:  # Afficher max 10 lignes
            lines.append(f"   → {dict(row)}")
        if self.row_count > 10:
            lines.append(f"   ... ({self.row_count - 10} lignes supplémentaires)")
        return "\n".join(lines)


# ─────────────────────────────────────────────
# Exécuteur principal
# ─────────────────────────────────────────────

class DBExecutor:
    def __init__(self):
        self.compiler = NLCompiler()

    def execute_nl(self, nl_query: str) -> QueryResult:
        """
        Pipeline complet : NL → SQL → Exécution PostgreSQL → Résultats
        """
        # 1. Compiler NL → SQL
        compile_result = self.compiler.compile(nl_query)

        if not compile_result.success:
            return QueryResult(
                success=False,
                nl_input=nl_query,
                sql=None,
                rows=[],
                row_count=0,
                error=f"Erreur compilation : {compile_result.errors}"
            )

        # 2. Exécuter le SQL
        return self.execute_sql(nl_query, compile_result.sql)

    def execute_sql(self, nl_input: str, sql: str) -> QueryResult:
        """Exécute une requête SQL et retourne les résultats."""
        try:
            with get_cursor() as cur:
                cur.execute(sql)
                rows = cur.fetchall()
                return QueryResult(
                    success=True,
                    nl_input=nl_input,
                    sql=sql,
                    rows=[dict(r) for r in rows],
                    row_count=len(rows)
                )
        except Exception as e:
            return QueryResult(
                success=False,
                nl_input=nl_input,
                sql=sql,
                rows=[],
                row_count=0,
                error=str(e)
            )


# ─────────────────────────────────────────────
# Mode interactif
# ─────────────────────────────────────────────

if __name__ == "__main__":
    from db_config import test_connection

    print("\n" + "="*60)
    print("  Smart City — NL → SQL → PostgreSQL")
    print("="*60)

    if not test_connection():
        print("Vérifiez que PostgreSQL est démarré dans pgAdmin.")
        sys.exit(1)

    db = DBExecutor()

    queries = [
        "Combien de capteurs sont hors service ?",
        "Affiche les 5 zones les plus polluées",
        "Montre les interventions en cours",
        "Liste tous les citoyens",
    ]

    for q in queries:
        print(f"\n{'─'*60}")
        result = db.execute_nl(q)
        print(result)