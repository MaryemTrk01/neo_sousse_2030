"""
CODE GENERATOR - Génération SQL depuis l'AST
Transforme un QueryNode validé en requête SQL exécutable.
"""

from typing import Optional
from nl_parser import QueryNode, ConditionNode


class SQLGenerator:
    def __init__(self, node: QueryNode):
        self.node = node

    def generate(self) -> str:
        """Génère la requête SQL complète."""
        if self.node.action == "COUNT":
            return self._generate_count()
        else:
            return self._generate_select()

    # ─────────────────────────────────────────────
    # SELECT
    # ─────────────────────────────────────────────

    def _generate_select(self) -> str:
        parts = []

        # SELECT clause
        parts.append(f"SELECT {self._build_select_clause()}")

        # FROM clause
        parts.append(f"FROM {self.node.entity}")

        # WHERE clause
        where = self._build_where_clause()
        if where:
            parts.append(f"WHERE {where}")

        # GROUP BY (si agrégation avec ORDER BY)
        if self.node.aggregate and self.node.order_by:
            group_col = self._get_group_by_column()
            if group_col:
                parts.append(f"GROUP BY {group_col}")

        # ORDER BY clause
        if self.node.order_by:
            parts.append(f"ORDER BY {self._build_order_clause()} {self.node.order_dir}")

        # LIMIT clause
        if self.node.limit:
            parts.append(f"LIMIT {self.node.limit}")

        return "\n".join(parts) + ";"

    def _build_select_clause(self) -> str:
        """Construit la liste des colonnes SELECT."""
        if self.node.aggregate and self.node.agg_column:
            agg = self.node.aggregate
            col = self.node.agg_column
            agg_expr = f"{agg}({col}) AS {agg.lower()}_{col}"

            # Garder aussi la colonne de regroupement si ORDER BY existe
            if self.node.order_by and self.node.order_by != col:
                return f"{self.node.order_by}, {agg_expr}"
            return agg_expr

        if not self.node.columns or self.node.columns == ["*"]:
            return "*"

        return ", ".join(self.node.columns)

    def _build_where_clause(self) -> str:
        """Construit la clause WHERE depuis les conditions."""
        if not self.node.conditions:
            return ""
        parts = []
        for cond in self.node.conditions:
            parts.append(self._format_condition(cond))
        return " AND ".join(parts)

    def _format_condition(self, cond: ConditionNode) -> str:
        """Formate une condition en SQL."""
        col = cond.column
        op = cond.operator
        val = cond.value

        if self.node.entity == "interventions" and col == "statut" and val == "en_cours":
            return "statut != 'TERMINE'"

        if isinstance(val, str):
            return f"{col} {op} '{val}'"
        elif isinstance(val, float):
            return f"{col} {op} {val}"
        else:
            return f"{col} {op} {val}"

    def _build_order_clause(self) -> str:
        """Construit l'expression ORDER BY."""
        if self.node.aggregate and self.node.agg_column:
            return f"{self.node.aggregate}({self.node.agg_column})"
        return self.node.order_by

    def _get_group_by_column(self) -> Optional[str]:
        """Détermine la colonne GROUP BY pour les agrégations."""
        group_map = {
            "zones":    "zone_id, nom",
            "mesures":  "zone",
            "capteurs": "zone",
        }
        return group_map.get(self.node.entity, None)

    # ─────────────────────────────────────────────
    # COUNT
    # ─────────────────────────────────────────────

    def _generate_count(self) -> str:
        parts = ["SELECT COUNT(*) AS total"]
        parts.append(f"FROM {self.node.entity}")

        where = self._build_where_clause()
        if where:
            parts.append(f"WHERE {where}")

        return "\n".join(parts) + ";"

    # ─────────────────────────────────────────────
    # Utilitaires
    # ─────────────────────────────────────────────

    def to_single_line(self) -> str:
        """Retourne la requête SQL sur une seule ligne."""
        return " ".join(self.generate().split())


# ─────────────────────────────────────────────
# Test rapide
# ─────────────────────────────────────────────
if __name__ == "__main__":
    from lexer import Lexer
    from nl_parser import Parser
    from semantic import SemanticAnalyzer

    queries = [
        "Affiche les 5 zones les plus polluées",
        "Combien de capteurs sont hors service ?",
        "Quels citoyens ont un score écologique > 80 ?",
        "Donne-moi le trajet le plus économique en CO2",
        "Montre les interventions en cours",
        "Trouve les capteurs actifs avec un taux d'erreur supérieur à 10",
    ]

    for q in queries:
        print(f"\n{'='*55}")
        print(f"NL  : {q}")
        lex = Lexer(q)
        tokens = lex.tokenize()
        parser = Parser(tokens)
        try:
            ast = parser.parse()
            sem = SemanticAnalyzer(ast)
            result = sem.analyze()
            if result.is_valid:
                gen = SQLGenerator(result.corrected_node)
                sql = gen.generate()
                print(f"SQL :\n{sql}")
                if result.warnings:
                    print(f"⚠  {result.warnings}")
            else:
                print(f"❌ Erreurs : {result.errors}")
        except Exception as e:
            print(f"❌ Exception : {e}")
