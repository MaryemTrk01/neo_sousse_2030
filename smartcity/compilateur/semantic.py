"""
SEMANTIC ANALYZER - Analyse sémantique
Valide la cohérence de l'AST avant la génération SQL.
Vérifie : types de colonnes, valeurs valides, compatibilité opérateurs.
"""

from dataclasses import dataclass
from typing import List, Optional
from nl_parser import QueryNode, ConditionNode


# ─────────────────────────────────────────────
# Schéma de référence (colonnes et types)
# ─────────────────────────────────────────────

SCHEMA = {
    "capteurs": {
        "id":                "int",
        "type":              "str",
        "zone":              "str",
        "statut":            "enum:actif,inactif,signale,en_maintenance,hors_service",
        "date_installation": "date",
    },
    "interventions": {
        "id":             "int",
        "capteur_id":     "int",
        "technicien1_id": "int",
        "technicien2_id": "int",
        "statut":         "enum:demande,tech1_assigne,tech2_valide,ia_valide,termine,en_cours",
        "date":           "date",
    },
    "citoyens": {
        "id":          "int",
        "nom":         "str",
        "score_ecolo": "float",
        "adresse":     "str",
    },
    "vehicules": {
        "id":        "int",
        "type":      "str",
        "trajet_id": "int",
        "statut":    "enum:stationne,en_route,en_panne,arrive",
    },
    "mesures": {
        "id":          "int",
        "capteur_id":  "int",
        "type_mesure": "str",
        "valeur":      "float",
        "date":        "date",
    },
}

# Opérateurs autorisés par type
ALLOWED_OPS = {
    "int":   ["=", ">", "<", ">=", "<="],
    "float": ["=", ">", "<", ">=", "<="],
    "str":   ["=", "LIKE"],
    "date":  ["=", ">", "<", ">=", "<="],
    "enum":  ["="],
}


# ─────────────────────────────────────────────
# Résultats de l'analyse sémantique
# ─────────────────────────────────────────────

@dataclass
class SemanticResult:
    is_valid: bool
    warnings: List[str]
    errors: List[str]
    corrected_node: Optional[QueryNode]


# ─────────────────────────────────────────────
# Analyseur sémantique
# ─────────────────────────────────────────────

class SemanticAnalyzer:
    def __init__(self, node: QueryNode):
        self.node = node
        self.errors: List[str] = []
        self.warnings: List[str] = []

    def analyze(self) -> SemanticResult:
        """Lance toutes les vérifications sémantiques."""
        self._check_entity()
        self._check_columns()
        self._check_conditions()
        self._check_order_by()
        self._check_limit()
        self._check_aggregate()

        is_valid = len(self.errors) == 0
        return SemanticResult(
            is_valid=is_valid,
            warnings=self.warnings,
            errors=self.errors,
            corrected_node=self.node if is_valid else None,
        )

    def _table_schema(self):
        return SCHEMA.get(self.node.entity, {})

    def _check_entity(self):
        if self.node.entity not in SCHEMA:
            self.errors.append(
                f"Table '{self.node.entity}' inconnue. "
                f"Tables disponibles : {', '.join(SCHEMA.keys())}"
            )

    def _check_columns(self):
        schema = self._table_schema()
        if not schema:
            return
        valid_cols = set(schema.keys())
        valid_cols.add("*")

        for col in self.node.columns:
            if col not in valid_cols:
                self.warnings.append(
                    f"Colonne '{col}' non trouvée dans '{self.node.entity}'. "
                    f"Colonnes disponibles : {', '.join(schema.keys())}"
                )
                # Correction automatique : retirer la colonne inconnue
                self.node.columns = [c for c in self.node.columns if c != col]

    def _check_conditions(self):
        schema = self._table_schema()
        if not schema:
            return

        valid_conditions = []
        for cond in self.node.conditions:
            col = cond.column
            op = cond.operator
            val = cond.value

            if col not in schema:
                self.warnings.append(
                    f"Colonne de condition '{col}' non trouvée dans '{self.node.entity}'. "
                    f"Condition ignorée."
                )
                continue

            col_type = schema[col].split(":")[0]
            allowed = ALLOWED_OPS.get(col_type, ["="])

            if op not in allowed:
                self.warnings.append(
                    f"Opérateur '{op}' non recommandé pour la colonne '{col}' (type {col_type}). "
                    f"Opérateurs valides : {allowed}. Remplacement par '='."
                )
                cond.operator = "="

            # Valider les valeurs d'enum
            if col_type == "enum":
                enum_vals = schema[col].split(":")[1].split(",")
                if str(val) not in enum_vals:
                    self.warnings.append(
                        f"Valeur '{val}' invalide pour '{col}'. "
                        f"Valeurs acceptées : {enum_vals}."
                    )

            # Valider les types numériques
            if col_type in ("int", "float"):
                try:
                    float(val)
                except (ValueError, TypeError):
                    self.errors.append(
                        f"Valeur '{val}' devrait être numérique pour la colonne '{col}'."
                    )
                    continue

            valid_conditions.append(cond)

        self.node.conditions = valid_conditions

    def _check_order_by(self):
        if not self.node.order_by:
            return
        schema = self._table_schema()
        if self.node.order_by not in schema:
            # Tenter de corriger
            self.warnings.append(
                f"Colonne ORDER BY '{self.node.order_by}' inconnue dans '{self.node.entity}'. "
                f"ORDER BY retiré."
            )
            self.node.order_by = None

    def _check_limit(self):
        if self.node.limit is not None:
            if self.node.limit <= 0:
                self.warnings.append(f"LIMIT {self.node.limit} invalide. Valeur ignorée.")
                self.node.limit = None
            elif self.node.limit > 10000:
                self.warnings.append(f"LIMIT {self.node.limit} très élevé. Attention aux performances.")

    def _check_aggregate(self):
        if self.node.aggregate and self.node.agg_column:
            schema = self._table_schema()
            if self.node.agg_column != "*" and self.node.agg_column not in schema:
                self.warnings.append(
                    f"Colonne d'agrégation '{self.node.agg_column}' inconnue. "
                    f"Utilisation de '*' à la place."
                )
                self.node.agg_column = "*"


# ─────────────────────────────────────────────
# Test rapide
# ─────────────────────────────────────────────
if __name__ == "__main__":
    from lexer import Lexer

    queries = [
        "Affiche les 5 zones les plus polluées",
        "Combien de capteurs sont hors service ?",
        "Quels citoyens ont un score écologique > 80 ?",
    ]

    for q in queries:
        print(f"\nRequête : '{q}'")
        lex = Lexer(q)
        tokens = lex.tokenize()
        parser = __import__('parser').Parser(tokens)
        ast = parser.parse()
        sem = SemanticAnalyzer(ast)
        result = sem.analyze()
        print(f"  Valide : {result.is_valid}")
        if result.errors:
            print(f"  Erreurs : {result.errors}")
        if result.warnings:
            print(f"  Avertissements : {result.warnings}")