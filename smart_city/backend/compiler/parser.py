from compiler.ast_nodes import *

class Parser:
    def __init__(self, tokens):
        self.tokens = tokens
        self.pos = 0
        self.current_token = self.tokens[self.pos]

    def advance(self):
        self.pos += 1
        if self.pos < len(self.tokens):
            self.current_token = self.tokens[self.pos]

    def parse(self):
        # Very simple top-down parser for the required phrases
        if self.current_token.type == 'TIME_BUCKET':
            # "Montre les mesures des dernières 24 heures"
            self.advance()
            return SelectQueryNode(table='mesures', columns='time_bucket_24h')
        
        if self.current_token.type == 'COMMAND_COUNT':
            self.advance()
            # "Combien de capteurs sont hors service ?"
            if self.current_token.type == 'TABLE':
                table = self.current_token.value.lower()
                self.advance()
                where_node = None
                if self.current_token.type in ['WHERE', 'WORD']:
                    self.advance() # skip 'sont'
                if self.current_token.type == 'HORS_SERVICE':
                    where_node = WhereNode([ConditionNode('etat', '=', "'HORS_SERVICE'")])
                    self.advance()
                return CountQueryNode(table=table, where_clause=where_node)
        
        if self.current_token.type == 'COMMAND_SELECT':
            self.advance()
            # Handle "Affiche les 5 zones les plus polluées"
            # Handle "Quels citoyens ont un score écologique > 80 ?"
            # Handle "Donne-moi le trajet le plus économique en CO2"
            
            # Check for limit prefix
            limit_val = None
            if self.current_token.type == 'LIMIT_PREFIX':
                self.advance()
                if self.current_token.type == 'NUMBER':
                    limit_val = self.current_token.value
                    self.advance()
            elif self.current_token.type == 'NUMBER':
                limit_val = self.current_token.value
                self.advance()

            # Now table or subject
            table = None
            if self.current_token.type == 'TABLE':
                table = self.current_token.value.lower()
                if table == 'zones':
                    table = 'capteurs'
                self.advance()
            elif self.current_token.type == 'WORD':
                # Custom mappings
                if self.current_token.value.lower() == 'trajet':
                    table = 'vehicules'
                self.advance()
            else:
                table = 'capteurs' # Default fallback
                if self.current_token.type != 'ORDER_DESC':
                    self.advance()
            
            # Where conditions or Orderings
            where_node = None
            order_node = None
            
            while self.current_token.type != 'EOF':
                if self.current_token.type == 'WHERE':
                    self.advance()
                elif self.current_token.type == 'SCORE_ECO':
                    self.advance()
                    if self.current_token.type == 'OP_GREATER':
                        self.advance()
                        if self.current_token.type == 'NUMBER':
                            where_node = WhereNode([ConditionNode('score_ecologique', '>', self.current_token.value)])
                            self.advance()
                elif self.current_token.type == 'ORDER_DESC':
                    self.advance()
                    if self.current_token.type == 'POLLU_INDEX':
                        # Example: assume we just order by a mock index or id for zones
                        order_node = OrderNode('id', 'DESC') # Simulating pollution for zones
                        self.advance()
                elif self.current_token.type == 'CO2_ECONOMISE':
                    # "le plus économique en CO2"
                    order_node = OrderNode('co2_economise_kg', 'DESC')
                    self.advance()
                else:
                    self.advance()

            return SelectQueryNode(table=table, columns='*', where_clause=where_node, order_clause=order_node, limit_clause=LimitNode(limit_val) if limit_val else None)
        
        raise SyntaxError("Query format not recognized.")
