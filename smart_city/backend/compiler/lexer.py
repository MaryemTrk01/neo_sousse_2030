import re

class Token:
    def __init__(self, type, value):
        self.type = type
        self.value = value

    def __repr__(self):
        return f"Token({self.type}, {self.value})"


class Lexer:
    def __init__(self, text):
        self.text = text
        self.tokens = []
        self.tokenize()

    def tokenize(self):
        token_specification = [
            ('COMMAND_SELECT', r'\b(Affiche|Montre|Donne-moi|Quels)\b'),
            ('COMMAND_COUNT',  r'\bCombien de\b'),
            ('TIME_BUCKET',    r'\bmesures des dernières 24 heures\b'),

            ('HORS_SERVICE',   r'\bhors service\b'),
            ('SCORE_ECO',      r'\bscore écologique\b'),
            ('CO2_ECONOMISE',  r'\b(économique en CO2|CO2)\b'),
            ('POLLU_INDEX',    r'\bpolluées\b'),

            ('ORDER_ASC',      r'\b(les moins|le moins)\b'),
            ('ORDER_DESC',     r'\b(les plus|le plus)\b'),
            ('LIMIT_PREFIX',   r'\bles\b'),
            ('LIMIT_SUFFIX',   r'\bpremiers\b'),

            ('TABLE',          r'\b(zones|capteurs|citoyens|interventions|vehicules|mesures)\b'),
            ('WHERE',          r'\b(qui|dont|sont|ayant|ont|de|un|une)\b'),
            ('AND',            r'\bet\b'),

            ('OP_GREATER',     r'>'),
            ('OP_LESS',        r'<'),
            ('OP_EQUAL',       r'='),

            ('NUMBER',         r'\b\d+\b'),
            ('ID',             r'[A-Za-z_À-ÿ][A-Za-z0-9_À-ÿ]*'),
            ('SKIP',           r'[ \t\n]+'),
            ('MISMATCH',       r'.'),
        ]

        tok_regex = '|'.join(f'(?P<{name}>{pattern})' for name, pattern in token_specification)

        for mo in re.finditer(tok_regex, self.text, re.IGNORECASE):
            kind = mo.lastgroup
            value = mo.group()

            if kind == 'SKIP':
                continue

            if kind == 'MISMATCH':
                if value in "?.,":
                    continue
                kind = 'WORD'

            self.tokens.append(Token(kind, value))

        self.tokens.append(Token('EOF', ''))

    def get_tokens(self):
        return self.tokens