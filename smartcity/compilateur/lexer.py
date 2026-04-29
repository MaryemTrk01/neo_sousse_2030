"""
LEXER - Tokenisation des requêtes en langage naturel
Transforme une chaîne de texte en une liste de tokens typés
"""

import re
from dataclasses import dataclass
from enum import Enum, auto
from typing import List, Optional


# ─────────────────────────────────────────────
# Types de tokens
# ─────────────────────────────────────────────
class TokenType(Enum):
    # Mots-clés d'action (déclencheurs de requêtes)
    SHOW      = auto()   # affiche, montre, donne, liste
    COUNT     = auto()   # combien, compte
    FIND      = auto()   # trouve, cherche
    GET       = auto()   # récupère, obtiens

    # Entités (tables)
    CAPTEURS      = auto()
    INTERVENTIONS = auto()
    CITOYENS      = auto()
    VEHICULES     = auto()
    MESURES       = auto()
    ZONES         = auto()
    TRAJETS       = auto()

    # Colonnes / attributs
    STATUT        = auto()
    NOM           = auto()
    SCORE         = auto()
    POLLUTION     = auto()
    CO2           = auto()
    TAUX_ERREUR   = auto()
    DATE          = auto()
    ZONE          = auto()

    # Opérateurs de comparaison
    GT   = auto()   # >, supérieur, plus grand
    LT   = auto()   # <, inférieur, plus petit
    GTE  = auto()   # >=
    LTE  = auto()   # <=
    EQ   = auto()   # =, égal, est

    # Valeurs littérales
    NUMBER  = auto()
    STRING  = auto()

    # Mots-clés de filtre
    WHERE_KW  = auto()   # qui, où, avec, ayant, dont
    TOP_KW    = auto()   # les X plus, top X
    ORDER_KW  = auto()   # ordonné, classé
    DESC_KW   = auto()   # décroissant, plus grand d'abord
    ASC_KW    = auto()   # croissant
    LIMIT_KW  = auto()   # limite, seulement

    # Agrégation
    AVG_KW  = auto()   # moyenne, moyen
    MAX_KW  = auto()   # maximum, le plus
    MIN_KW  = auto()   # minimum, le moins
    SUM_KW  = auto()   # total, somme

    # Statuts prédéfinis
    HORS_SERVICE  = auto()
    ACTIF         = auto()
    INACTIF       = auto()
    EN_COURS      = auto()
    TERMINE       = auto()
    EN_PANNE      = auto()

    # Divers
    AND   = auto()
    OR    = auto()
    NOT   = auto()
    EOF   = auto()
    UNKNOWN = auto()


@dataclass
class Token:
    type: TokenType
    value: str
    position: int

    def __repr__(self):
        return f"Token({self.type.name}, '{self.value}', pos={self.position})"


# ─────────────────────────────────────────────
# Dictionnaire de correspondances (FR → TokenType)
# ─────────────────────────────────────────────
KEYWORDS: dict = {
    # Actions
    r'\b(affiche|afficher|montre|montrer|donne|donner|liste|lister|voir|afficher)\b': TokenType.SHOW,
    r'\b(combien|compte|compter|nombre)\b': TokenType.COUNT,
    r'\b(trouve|trouver|cherche|chercher|recherche)\b': TokenType.FIND,
    r'\b(récupère|récupérer|obtiens|obtenir|retourne|retourner)\b': TokenType.GET,

    # Entités
    r'\b(capteurs?|sensor)\b': TokenType.CAPTEURS,
    r'\b(interventions?|intervention)\b': TokenType.INTERVENTIONS,
    r'\b(citoyens?|citoyen|habitants?)\b': TokenType.CITOYENS,
    r'\b(véhicules?|voitures?|vehicules?)\b': TokenType.VEHICULES,
    r'\b(mesures?|données?|readings?|tout|toutes?|all)\b': TokenType.MESURES,
    r'\b(zones?)\b': TokenType.ZONES,
    r'\b(trajets?|parcours?|routes?)\b': TokenType.TRAJETS,

    # Attributs
    r'\b(statut|état|status)\b': TokenType.STATUT,
    r'\b(nom|noms?|name)\b': TokenType.NOM,
    r'\b(score|scores?)\b': TokenType.SCORE,
    r'\b(pollution|polluées?|polluants?)\b': TokenType.POLLUTION,
    r'\b(co2|carbone|émissions?)\b': TokenType.CO2,
    r"\b(taux[_ ]d'erreur|erreurs?|pannes?)\b": TokenType.TAUX_ERREUR,
    r'\b(date|dates?|jour)\b': TokenType.DATE,
    r'\b(zone|secteur)\b': TokenType.ZONE,

    # Opérateurs textuels
    r'\b(supérieur|plus grand|greater|au-dessus|dépasse)\b': TokenType.GT,
    r'\b(inférieur|plus petit|less|en-dessous)\b': TokenType.LT,
    r'\b(supérieur ou égal|au moins|minimum de)\b': TokenType.GTE,
    r'\b(inférieur ou égal|au plus|maximum de)\b': TokenType.LTE,
    r'\b(égal|est|vaut|équivaut)\b': TokenType.EQ,

    # Statuts prédéfinis
    r'\b(hors[_ ]service|hors-service|défaillants?)\b': TokenType.HORS_SERVICE,
    r'\b(actifs?|en fonctionnement|opérationnels?)\b': TokenType.ACTIF,
    r'\b(inactifs?|désactivés?|éteints?)\b': TokenType.INACTIF,
    r'\b(en[_ ]cours|encours|actives?|pendent?)\b': TokenType.EN_COURS,
    r'\b(termin\w+|complét\w+|fini[se]?s?|achev\w+)\b': TokenType.TERMINE,
    r'\b(en[_ ]panne|tombés?[_ ]en[_ ]panne|pannes?)\b': TokenType.EN_PANNE,

    # Modificateurs
    r'\b(qui|où|avec|ayant|dont|ayant|lequel|lesquels|lesquelles)\b': TokenType.WHERE_KW,
    r'\b(les?\s+\d+\s+plus|top\s+\d+|premiers?\s+\d+)\b': TokenType.TOP_KW,
    r'\b(ordonné|classé|trié|rangé|ordonnés?)\b': TokenType.ORDER_KW,
    r'\b(décroissant|descendant|desc|plus grand d\'abord)\b': TokenType.DESC_KW,
    r'\b(croissant|ascendant|asc|plus petit d\'abord)\b': TokenType.ASC_KW,
    r'\b(limite|limiter|seulement|uniquement)\b': TokenType.LIMIT_KW,

    # Agrégation
    r'\b(moyenne?|moyen|avg)\b': TokenType.AVG_KW,
    r'\b(maximum|max|le plus élevé|le plus grand)\b': TokenType.MAX_KW,
    r'\b(minimum|min|le moins élevé|le plus petit)\b': TokenType.MIN_KW,
    r'\b(total|somme|sum)\b': TokenType.SUM_KW,

    # Logique
    r'\b(et|and)\b': TokenType.AND,
    r'\b(ou|or)\b': TokenType.OR,
    r'\b(pas|non|not|sans)\b': TokenType.NOT,
}


# ─────────────────────────────────────────────
# Classe Lexer
# ─────────────────────────────────────────────
class Lexer:
    def __init__(self, text: str):
        self.text = text.lower().strip()
        self.tokens: List[Token] = []
        self.errors: List[str] = []

    def tokenize(self) -> List[Token]:
        """Point d'entrée principal : retourne la liste de tokens."""
        text = self.text
        pos = 0
        matched_ranges = []  # pour éviter les doubles correspondances

        # 1. Extraire les nombres
        for m in re.finditer(r'\b\d+(\.\d+)?\b', text):
            self.tokens.append(Token(TokenType.NUMBER, m.group(), m.start()))
            matched_ranges.append((m.start(), m.end()))

        # 2. Extraire les chaînes entre guillemets
        for m in re.finditer(r"'([^']+)'|\"([^\"]+)\"", text):
            val = m.group(1) or m.group(2)
            self.tokens.append(Token(TokenType.STRING, val, m.start()))
            matched_ranges.append((m.start(), m.end()))

        # 3. Extraire les opérateurs symboliques (>=, <=, >, <, =)
        for m in re.finditer(r'>=|<=|>|<|=', text):
            overlap = any(s <= m.start() < e for s, e in matched_ranges)
            if not overlap:
                op_map = {'>': TokenType.GT, '<': TokenType.LT,
                          '>=': TokenType.GTE, '<=': TokenType.LTE, '=': TokenType.EQ}
                ttype = op_map.get(m.group(), TokenType.UNKNOWN)
                self.tokens.append(Token(ttype, m.group(), m.start()))
                matched_ranges.append((m.start(), m.end()))

        # 4. Appliquer les mots-clés
        for pattern, ttype in KEYWORDS.items():
            for m in re.finditer(pattern, text, re.IGNORECASE):
                # Vérifier que la position n'est pas déjà prise
                overlap = any(s <= m.start() < e for s, e in matched_ranges)
                if not overlap:
                    self.tokens.append(Token(ttype, m.group(), m.start()))
                    matched_ranges.append((m.start(), m.end()))

        # 5. Extraire les nombres intégrés dans TOP_KW (ex: "les 5 plus")
        self._extract_top_numbers()

        # 6. Trier par position
        self.tokens.sort(key=lambda t: t.position)

        # 7. Ajouter EOF
        self.tokens.append(Token(TokenType.EOF, '', len(text)))

        return self.tokens

    def _extract_top_numbers(self):
        """Extrait le nombre depuis un token TOP_KW comme 'les 5 plus'."""
        for tok in self.tokens:
            if tok.type == TokenType.TOP_KW:
                m = re.search(r'\d+', tok.value)
                if m:
                    # Insérer un token NUMBER avec cette valeur
                    num_tok = Token(TokenType.NUMBER, m.group(), tok.position + m.start())
                    if not any(t.type == TokenType.NUMBER and t.value == m.group()
                               and abs(t.position - num_tok.position) < 5
                               for t in self.tokens):
                        self.tokens.append(num_tok)

    def get_token_stream(self) -> List[Token]:
        """Retourne uniquement les tokens non-EOF pour debug."""
        return [t for t in self.tokens if t.type != TokenType.EOF]

    def print_tokens(self):
        """Affiche les tokens pour débogage."""
        print(f"\n{'='*50}")
        print(f"Texte : '{self.text}'")
        print(f"{'='*50}")
        for tok in self.tokens:
            print(f"  {tok}")
        print()


# ─────────────────────────────────────────────
# Test rapide
# ─────────────────────────────────────────────
if __name__ == "__main__":
    tests = [
        "Affiche les 5 zones les plus polluées",
        "Combien de capteurs sont hors service ?",
        "Quels citoyens ont un score écologique > 80 ?",
        "Donne-moi le trajet le plus économique en CO2",
        "Montre les interventions en cours",
        "Trouve les capteurs actifs avec un taux d'erreur supérieur à 10",
    ]
    for t in tests:
        lex = Lexer(t)
        lex.tokenize()
        lex.print_tokens()