class ASTNode:
    pass

class SelectQueryNode(ASTNode):
    def __init__(self, table, columns, where_clause=None, order_clause=None, limit_clause=None):
        self.table = table
        self.columns = columns
        self.where_clause = where_clause
        self.order_clause = order_clause
        self.limit_clause = limit_clause

    def __repr__(self):
        return f"SelectQueryNode({self.table}, {self.columns}, {self.where_clause}, {self.order_clause}, {self.limit_clause})"

class CountQueryNode(ASTNode):
    def __init__(self, table, where_clause=None):
        self.table = table
        self.where_clause = where_clause

    def __repr__(self):
        return f"CountQueryNode({self.table}, {self.where_clause})"

class WhereNode(ASTNode):
    def __init__(self, conditions):
        self.conditions = conditions # List of ConditionNode

    def __repr__(self):
        return f"WhereNode({self.conditions})"

class ConditionNode(ASTNode):
    def __init__(self, column, operator, value):
        self.column = column
        self.operator = operator
        self.value = value

    def __repr__(self):
        return f"ConditionNode({self.column} {self.operator} {self.value})"

class OrderNode(ASTNode):
    def __init__(self, column, direction):
        self.column = column
        self.direction = direction

    def __repr__(self):
        return f"OrderNode({self.column} {self.direction})"

class LimitNode(ASTNode):
    def __init__(self, limit):
        self.limit = limit

    def __repr__(self):
        return f"LimitNode({self.limit})"
