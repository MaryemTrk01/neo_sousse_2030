"""
PARSER - Analyse syntaxique + Construction de l'AST
Transforme la liste de tokens en un arbre syntaxique abstrait (AST)

Grammaire (BNF simplifiée) :
    query       ::= action_expr entity_expr filter_expr? modifier_expr?
    action_expr ::= SHOW | COUNT | FIND | GET
    entity_expr ::= CAPTEURS | INTERVENTIONS | CITOYENS | VEHICULES | MESURES | ZONES | TRAJETS
    filter_expr ::= WHERE_KW condition (AND condition)*
    condition   ::= attribute comparator value
    attribute   ::= STATUT | NOM | SCORE | POLLUTION | CO2 | TAUX_ERREUR
    comparator  ::= GT | LT | GTE | LTE | EQ
    value       ::= NUMBER | STRING | status_keyword
    modifier_expr ::= (TOP_KW NUMBER?) | (ORDER_KW (DESC_KW | ASC_KW)?) | (LIMIT_KW NUMBER)
"""

from dataclasses import dataclass, field
from typing import List, Optional, Any
from lexer import Lexer, Token, TokenType


# ─────────────────────────────────────────────
# Nœuds de l'AST
# ─────────────────────────────────────────────

@dataclass
class ASTNode:
    """Nœud de base de l'AST."""
    node_type: str

    def __repr__(self):
        return f"<{self.node_type}>"


@dataclass
class QueryNode(ASTNode):
    """Nœud racine d'une requête."""
    action: str          # "SELECT", "COUNT"
    entity: str          # Nom de la table
    columns: List[str]   # Colonnes à sélectionner
    conditions: List['ConditionNode'] = field(default_factory=list)
    order_by: Optional[str] = None
    order_dir: str = "DESC"
    limit: Optional[int] = None
    aggregate: Optional[str] = None   # AVG, MAX, MIN, SUM
    agg_column: Optional[str] = None

    def __repr__(self):
        return (f"QueryNode(action={self.action}, entity={self.entity}, "
                f"cols={self.columns}, conds={self.conditions}, "
                f"order={self.order_by} {self.order_dir}, limit={self.limit})")


@dataclass
class ConditionNode(ASTNode):
    """Nœud représentant une condition WHERE."""
    column: str
    operator: str   # "=", ">", "<", ">=", "<="
    value: Any

    def __repr__(self):
        return f"Condition({self.column} {self.operator} {self.value!r})"


# ─────────────────────────────────────────────
# Mappings entités → tables/colonnes
# ─────────────────────────────────────────────

ENTITY_TABLE = {
    TokenType.CAPTEURS:      "capteurs",
    TokenType.INTERVENTIONS: "interventions",
    TokenType.CITOYENS:      "citoyens",
    TokenType.VEHICULES:     "vehicules",
    TokenType.MESURES:       "mesures",
    TokenType.ZONES:         "capteurs",
    TokenType.TRAJETS:       "vehicules",
}

ENTITY_DEFAULT_COLS = {
    "capteurs":      ["id", "type", "zone", "statut", "date_installation"],
    "interventions": ["id", "capteur_id", "technicien1_id", "technicien2_id", "statut", "date"],
    "citoyens":      ["id", "nom", "score_ecolo", "adresse"],
    "vehicules":     ["id", "type", "trajet_id", "statut"],
    "mesures":       ["id", "capteur_id", "type_mesure", "valeur", "date"],
}

ATTRIBUTE_COLUMN = {
    TokenType.STATUT:      "statut",
    TokenType.NOM:         "nom",
    TokenType.SCORE:       "score_ecolo",
    TokenType.POLLUTION:   "valeur",
    TokenType.CO2:         "valeur",
    TokenType.TAUX_ERREUR: "valeur",
    TokenType.DATE:        "date",
    TokenType.ZONE:        "zone",
}

COMPARATOR_MAP = {
    TokenType.GT:  ">",
    TokenType.LT:  "<",
    TokenType.GTE: ">=",
    TokenType.LTE: "<=",
    TokenType.EQ:  "=",
}

STATUS_VALUE = {
    TokenType.HORS_SERVICE: "HORS_SERVICE",  # majuscules
    TokenType.ACTIF:        "ACTIF",
    TokenType.INACTIF:      "INACTIF",
    TokenType.EN_COURS:     "en_cours",
    TokenType.TERMINE:      "TERMINE",
    TokenType.EN_PANNE:     "EN_PANNE",
}

AGGREGATE_MAP = {
    TokenType.AVG_KW: "AVG",
    TokenType.MAX_KW: "MAX",
    TokenType.MIN_KW: "MIN",
    TokenType.SUM_KW: "SUM",
}


# ─────────────────────────────────────────────
# Classe Parser
# ─────────────────────────────────────────────

class ParseError(Exception):
    pass


class Parser:
    def __init__(self, tokens: List[Token]):
        self.tokens = tokens
        self.pos = 0
        self.errors: List[str] = []

    # ── Navigation dans le flux de tokens ──

    def current(self) -> Token:
        return self.tokens[self.pos] if self.pos < len(self.tokens) else Token(TokenType.EOF, '', -1)

    def peek(self, offset: int = 1) -> Token:
        idx = self.pos + offset
        return self.tokens[idx] if idx < len(self.tokens) else Token(TokenType.EOF, '', -1)

    def advance(self) -> Token:
        tok = self.current()
        self.pos += 1
        return tok

    def match(self, *types: TokenType) -> bool:
        return self.current().type in types

    def consume(self, *types: TokenType) -> Optional[Token]:
        if self.match(*types):
            return self.advance()
        return None

    def remaining_types(self) -> List[TokenType]:
        return [t.type for t in self.tokens[self.pos:] if t.type != TokenType.EOF]

    # ── Règles de la grammaire ──

    def parse(self) -> QueryNode:
        """Point d'entrée : parse une requête complète."""
        action = self._parse_action()
        aggregate = self._parse_aggregate()
        entity = self._parse_entity()

        if entity is None:
            # Tentative de récupération : chercher une entité n'importe où
            entity = self._search_entity_anywhere()
            if entity is None:
                raise ParseError("Entité non reconnue. Entités supportées : capteurs, interventions, citoyens, véhicules, mesures, zones, trajets.")

        # Colonnes par défaut
        columns = list(ENTITY_DEFAULT_COLS.get(entity, ["*"]))

        # Limite implicite dans le texte (ex: "les 5 zones")
        limit = self._parse_top()

        # Conditions WHERE
        conditions = self._parse_conditions(entity)

        # Modificateurs ORDER BY / LIMIT supplémentaires
        order_by, order_dir, extra_limit = self._parse_modifiers(entity)

        if extra_limit and not limit:
            limit = extra_limit

        # Colonne d'agrégation
        agg_column = self._resolve_agg_column(aggregate, entity)

        # Action finale
        sql_action = "COUNT" if action == TokenType.COUNT else "SELECT"

        node = QueryNode(
            node_type="Query",
            action=sql_action,
            entity=entity,
            columns=columns,
            conditions=conditions,
            order_by=order_by,
            order_dir=order_dir,
            limit=limit,
            aggregate=aggregate,
            agg_column=agg_column,
        )
        return node

    def _parse_action(self) -> Optional[TokenType]:
        """Détecte le mot d'action (SHOW, COUNT, FIND, GET)."""
        action_types = (TokenType.SHOW, TokenType.COUNT, TokenType.FIND, TokenType.GET)
        tok = self.consume(*action_types)
        if tok:
            return tok.type
        # Si pas d'action explicite, regarder si c'est une question (combien ?)
        if self.match(TokenType.COUNT):
            return self.advance().type
        return TokenType.SHOW  # Défaut

    def _parse_aggregate(self) -> Optional[str]:
        """Détecte une fonction d'agrégation."""
        tok = self.consume(*AGGREGATE_MAP.keys())
        if tok:
            return AGGREGATE_MAP[tok.type]
        return None

    def _parse_entity(self) -> Optional[str]:
        """Cherche une entité dans les prochains tokens."""
        entity_types = tuple(ENTITY_TABLE.keys())
        # Chercher dans les 6 prochains tokens
        for i in range(min(6, len(self.tokens) - self.pos)):
            tok = self.tokens[self.pos + i]
            if tok.type in entity_types:
                self.pos += i + 1
                return ENTITY_TABLE[tok.type]
        return None

    def _search_entity_anywhere(self) -> Optional[str]:
        """Cherche une entité dans tous les tokens restants."""
        entity_types = tuple(ENTITY_TABLE.keys())
        for tok in self.tokens[self.pos:]:
            if tok.type in entity_types:
                return ENTITY_TABLE[tok.type]
        return None

    def _parse_top(self) -> Optional[int]:
        """Détecte 'les X' ou 'top X' → limite. Cherche dans tous les tokens."""
        entity_types = tuple(ENTITY_TABLE.keys())

        # Chercher dans TOUS les tokens (pas seulement restants)
        for i, tok in enumerate(self.tokens):
            if tok.type == TokenType.TOP_KW:
                import re
                m = re.search(r'\d+', tok.value)
                if m:
                    return int(m.group())
                # Chercher le nombre dans les tokens voisins
                for j in range(max(0, i-2), min(i+3, len(self.tokens))):
                    if self.tokens[j].type == TokenType.NUMBER:
                        return int(self.tokens[j].value)

            # Pattern : NUMBER directement suivi d'une entité (ex: "5 zones")
            if tok.type == TokenType.NUMBER:
                for j in range(i + 1, min(i + 4, len(self.tokens))):
                    if self.tokens[j].type in entity_types:
                        return int(tok.value)
        return None

    def _parse_conditions(self, entity: str) -> List[ConditionNode]:
        """Parse les conditions après WHERE_KW."""
        conditions = []

        # Chercher les tokens pertinents pour construire des conditions
        remaining = self.tokens[self.pos:]
        idx = 0

        while idx < len(remaining):
            tok = remaining[idx]

            # Condition implicite par statut (ex: "capteurs hors service", "véhicules en panne")
            if tok.type in STATUS_VALUE:
                col = "statut"
                val = STATUS_VALUE[tok.type]
                # Éviter les doublons
                if not any(c.column == col and c.value == val for c in conditions):
                    conditions.append(ConditionNode("Condition", col, "=", val))
                idx += 1
                continue

            # Condition explicite : attribut + comparateur + valeur
            if tok.type in ATTRIBUTE_COLUMN:
                col = ATTRIBUTE_COLUMN[tok.type]
                idx += 1
                op = "="

                # Chercher l'opérateur dans les prochains tokens (jusqu'à 3)
                for lookahead in range(min(3, len(remaining) - idx)):
                    next_tok = remaining[idx + lookahead]
                    if next_tok.type in COMPARATOR_MAP:
                        op = COMPARATOR_MAP[next_tok.type]
                        idx += lookahead + 1
                        break

                # Valeur numérique, chaîne ou statut
                if idx < len(remaining):
                    val_tok = remaining[idx]
                    if val_tok.type == TokenType.NUMBER:
                        val = float(val_tok.value) if '.' in val_tok.value else int(val_tok.value)
                        conditions.append(ConditionNode("Condition", col, op, val))
                        idx += 1
                    elif val_tok.type == TokenType.STRING:
                        conditions.append(ConditionNode("Condition", col, op, val_tok.value))
                        idx += 1
                    elif val_tok.type in STATUS_VALUE:
                        conditions.append(ConditionNode("Condition", col, op, STATUS_VALUE[val_tok.type]))
                        idx += 1
                continue

            # Détecter comparateur isolé (ex: "score > 80" où '>' est tokenisé seul)
            if tok.type in COMPARATOR_MAP:
                op = COMPARATOR_MAP[tok.type]
                idx += 1
                if idx < len(remaining) and remaining[idx].type == TokenType.NUMBER:
                    col = self._find_recent_attribute(remaining, idx)
                    if col:
                        val = float(remaining[idx].value) if '.' in remaining[idx].value else int(remaining[idx].value)
                        # Mettre à jour ou ajouter la condition
                        updated = False
                        for cond in conditions:
                            if cond.column == col and cond.operator == "=":
                                cond.operator = op
                                cond.value = val
                                updated = True
                                break
                        if not updated:
                            conditions.append(ConditionNode("Condition", col, op, val))
                    idx += 1
                continue

            idx += 1

        return conditions

    def _find_recent_attribute(self, tokens: List[Token], before_idx: int) -> Optional[str]:
        """Cherche l'attribut le plus récent avant une position donnée."""
        for tok in reversed(tokens[:before_idx]):
            if tok.type in ATTRIBUTE_COLUMN:
                return ATTRIBUTE_COLUMN[tok.type]
        # Défaut selon contexte
        return None

    def _parse_modifiers(self, entity: str):
        """Parse ORDER BY, LIMIT dans les tokens restants."""
        order_by = None
        order_dir = "DESC"
        limit = None

        remaining = self.tokens[self.pos:]

        for i, tok in enumerate(remaining):
            # ORDER
            if tok.type == TokenType.ORDER_KW:
                # Deviner la colonne d'ordre selon l'entité
                order_by = self._default_order_col(entity)

            # Direction
            if tok.type == TokenType.DESC_KW:
                order_dir = "DESC"
            if tok.type == TokenType.ASC_KW:
                order_dir = "ASC"

            # LIMIT explicite
            if tok.type == TokenType.LIMIT_KW:
                if i + 1 < len(remaining) and remaining[i + 1].type == TokenType.NUMBER:
                    limit = int(remaining[i + 1].value)

        # Inférence d'ORDER BY selon le contexte
        if not order_by:
            order_by = self._infer_order_by(entity, remaining)

        return order_by, order_dir, limit

    def _default_order_col(self, entity: str) -> str:
        defaults = {
            "zones":    "pollution_avg",
            "citoyens": "score_ecolo",
            "capteurs": "taux_erreur",
            "trajets":  "economie_co2",
            "mesures":  "valeur",
        }
        return defaults.get(entity, "id")

    def _infer_order_by(self, entity: str, tokens: List[Token]) -> Optional[str]:
        """Infère ORDER BY depuis le contexte."""
        for tok in tokens:
            if tok.type == TokenType.POLLUTION:
                return "pollution_avg" if entity == "zones" else "valeur"
            if tok.type == TokenType.CO2:
                return "economie_co2"
            if tok.type == TokenType.SCORE:
                return "score_ecolo"
            if tok.type == TokenType.TAUX_ERREUR:
                return "taux_erreur"
        return None

    def _resolve_agg_column(self, aggregate: Optional[str], entity: str) -> Optional[str]:
        """Détermine la colonne d'agrégation selon l'entité."""
        if not aggregate:
            return None
        defaults = {
            "mesures":  "valeur",
            "zones":    "pollution_avg",
            "capteurs": "taux_erreur",
            "citoyens": "score_ecolo",
            "trajets":  "economie_co2",
        }
        return defaults.get(entity, "*")


# ─────────────────────────────────────────────
# Test rapide
# ─────────────────────────────────────────────
if __name__ == "__main__":
    queries = [
        "Affiche les 5 zones les plus polluées",
        "Combien de capteurs sont hors service ?",
        "Quels citoyens ont un score écologique > 80 ?",
        "Donne-moi le trajet le plus économique en CO2",
        "Montre les interventions en cours",
    ]

    for q in queries:
        print(f"\nRequête : '{q}'")
        lex = Lexer(q)
        tokens = lex.tokenize()
        try:
            parser = Parser(tokens)
            ast = parser.parse()
            print(f"AST : {ast}")
        except Exception as e:
            print(f"Erreur parser : {e}")