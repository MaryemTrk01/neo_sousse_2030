from compiler.ast_nodes import *

class SQLGenerator:
    def __init__(self, ast):
        self.ast = ast

    def generate(self):
        if isinstance(self.ast, SelectQueryNode):
            return self._generate_select(self.ast)
        elif isinstance(self.ast, CountQueryNode):
            return self._generate_count(self.ast)
        else:
            raise ValueError("Unknown AST Node type")

    def _generate_select(self, node):
        if node.columns == 'time_bucket_24h' and node.table == 'mesures':
            # Use native PostgreSQL date_trunc instead of TimescaleDB time_bucket
            return "SELECT date_trunc('hour', time) AS bucket, AVG(valeur) AS avg_value FROM mesures WHERE time > NOW() - INTERVAL '24 hours' GROUP BY bucket ORDER BY bucket DESC;"

        query = f"SELECT {node.columns} FROM {node.table}"
        
        if node.where_clause:
            conditions = " AND ".join([f"{c.column} {c.operator} {c.value}" for c in node.where_clause.conditions])
            query += f" WHERE {conditions}"
            
        if node.order_clause:
            query += f" ORDER BY {node.order_clause.column} {node.order_clause.direction}"
            
        if node.limit_clause and node.limit_clause.limit:
            query += f" LIMIT {node.limit_clause.limit}"
            
        return query + ";"

    def _generate_count(self, node):
        query = f"SELECT COUNT(*) FROM {node.table}"
        if node.where_clause:
            conditions = " AND ".join([f"{c.column} {c.operator} {c.value}" for c in node.where_clause.conditions])
            query += f" WHERE {conditions}"
        return query + ";"
