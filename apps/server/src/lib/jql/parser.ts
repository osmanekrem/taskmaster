/**
 * JQL Parser
 *
 * Recursive descent parser that converts tokens into an AST.
 * Grammar:
 *
 * query      → expression orderBy? EOF
 * expression → orExpr
 * orExpr     → andExpr (OR andExpr)*
 * andExpr    → unaryExpr (AND unaryExpr)*
 * unaryExpr  → NOT unaryExpr | primary
 * primary    → comparison | inExpr | isExpr | wasExpr | changedExpr | "(" expression ")"
 * comparison → field operator value
 * inExpr     → field NOT? IN "(" valueList ")"
 * isExpr     → field IS NOT? (EMPTY | NULL)
 * wasExpr    → field WAS value (DURING dateRange | BEFORE value | AFTER value)?
 * changedExpr → field CHANGED (FROM value)? (TO value)? (DURING dateRange | BEFORE value | AFTER value | BY value)*
 * field      → IDENTIFIER | "cf" "[" NUMBER "]"
 * value      → STRING | NUMBER | function | field
 * function   → IDENTIFIER "(" valueList? ")"
 * valueList  → value ("," value)*
 * orderBy    → ORDER BY orderItem ("," orderItem)*
 * orderItem  → field (ASC | DESC)?
 */

import type {
  Token,
  JQLQuery,
  Expression,
  BinaryExpression,
  UnaryExpression,
  ComparisonExpression,
  InExpression,
  IsExpression,
  WasExpression,
  ChangedExpression,
  FunctionCall,
  FieldReference,
  Literal,
  ListLiteral,
  OrderByClause,
  OrderByItem,
} from './ast';
import { TokenType, JQLSyntaxError } from './ast';
import { JQLLexer } from './lexer';

// =============================================================================
// PARSER CLASS
// =============================================================================

export class JQLParser {
  private tokens: Token[] = [];
  private current: number = 0;

  constructor(private input: string) {}

  /**
   * Parse the JQL string into an AST
   */
  parse(): JQLQuery {
    const lexer = new JQLLexer(this.input);
    this.tokens = lexer.tokenize();
    this.current = 0;

    const query: JQLQuery = {};

    // Parse WHERE clause (expression)
    if (!this.check(TokenType.ORDER) && !this.check(TokenType.EOF)) {
      query.where = this.parseExpression();
    }

    // Parse ORDER BY clause
    if (this.check(TokenType.ORDER)) {
      query.orderBy = this.parseOrderBy();
    }

    // Expect end of input
    if (!this.check(TokenType.EOF)) {
      throw this.error(this.peek(), `Unexpected token '${this.peek().value}'`);
    }

    return query;
  }

  // ---------------------------------------------------------------------------
  // EXPRESSION PARSING
  // ---------------------------------------------------------------------------

  private parseExpression(): Expression {
    return this.parseOrExpression();
  }

  private parseOrExpression(): Expression {
    let left = this.parseAndExpression();

    while (this.match(TokenType.OR)) {
      const right = this.parseAndExpression();
      left = {
        type: 'BinaryExpression',
        operator: 'OR',
        left,
        right,
      } as BinaryExpression;
    }

    return left;
  }

  private parseAndExpression(): Expression {
    let left = this.parseUnaryExpression();

    while (this.match(TokenType.AND)) {
      const right = this.parseUnaryExpression();
      left = {
        type: 'BinaryExpression',
        operator: 'AND',
        left,
        right,
      } as BinaryExpression;
    }

    return left;
  }

  private parseUnaryExpression(): Expression {
    if (this.match(TokenType.NOT)) {
      const argument = this.parseUnaryExpression();
      return {
        type: 'UnaryExpression',
        operator: 'NOT',
        argument,
      } as UnaryExpression;
    }

    return this.parsePrimary();
  }

  private parsePrimary(): Expression {
    // Grouped expression: (expr)
    if (this.match(TokenType.LPAREN)) {
      const expr = this.parseExpression();
      this.consume(TokenType.RPAREN, "Expected ')' after expression");
      return expr;
    }

    // Must be a field-based expression
    const field = this.parseField();

    // Check what kind of expression follows
    if (
      this.check(TokenType.IN) ||
      (this.check(TokenType.NOT) && this.checkNext(TokenType.IN))
    ) {
      return this.parseInExpression(field);
    }

    if (this.check(TokenType.IS)) {
      return this.parseIsExpression(field);
    }

    if (this.check(TokenType.WAS)) {
      return this.parseWasExpression(field);
    }

    if (this.check(TokenType.CHANGED)) {
      return this.parseChangedExpression(field);
    }

    // Must be a comparison
    return this.parseComparison(field);
  }

  private parseComparison(field: FieldReference): ComparisonExpression {
    const operatorToken = this.advance();
    const operator = this.tokenToOperator(operatorToken);

    if (!operator) {
      throw this.error(
        operatorToken,
        `Expected comparison operator, got '${operatorToken.value}'`,
      );
    }

    const value = this.parseValue();

    return {
      type: 'ComparisonExpression',
      operator,
      field,
      value,
    };
  }

  private parseInExpression(field: FieldReference): InExpression {
    const negated = this.match(TokenType.NOT);
    this.consume(TokenType.IN, "Expected 'IN'");
    this.consume(TokenType.LPAREN, "Expected '(' after 'IN'");

    const values = this.parseValueList();

    this.consume(TokenType.RPAREN, "Expected ')' after value list");

    return {
      type: 'InExpression',
      negated,
      field,
      values: {
        type: 'ListLiteral',
        values,
      },
    };
  }

  private parseIsExpression(field: FieldReference): IsExpression {
    this.consume(TokenType.IS, "Expected 'IS'");
    const negated = this.match(TokenType.NOT);

    let check: 'EMPTY' | 'NULL';
    if (this.match(TokenType.EMPTY)) {
      check = 'EMPTY';
    } else if (this.match(TokenType.NULL)) {
      check = 'NULL';
    } else {
      throw this.error(this.peek(), "Expected 'EMPTY' or 'NULL'");
    }

    return {
      type: 'IsExpression',
      negated,
      field,
      check,
    };
  }

  private parseWasExpression(field: FieldReference): WasExpression {
    this.consume(TokenType.WAS, "Expected 'WAS'");
    const value = this.parseValue();

    const expr: WasExpression = {
      type: 'WasExpression',
      field,
      value,
    };

    // Parse optional clauses: DURING, BEFORE, AFTER
    while (
      this.checkIdentifier('DURING') ||
      this.checkIdentifier('BEFORE') ||
      this.checkIdentifier('AFTER')
    ) {
      const clause = this.advance().value.toUpperCase();

      if (clause === 'DURING') {
        this.consume(TokenType.LPAREN, "Expected '(' after 'DURING'");
        const from = this.parseValue();
        this.consume(TokenType.COMMA, "Expected ',' in date range");
        const to = this.parseValue();
        this.consume(TokenType.RPAREN, "Expected ')' after date range");
        expr.during = { from, to };
      } else if (clause === 'BEFORE') {
        expr.before = this.parseValue();
      } else if (clause === 'AFTER') {
        expr.after = this.parseValue();
      }
    }

    return expr;
  }

  private parseChangedExpression(field: FieldReference): ChangedExpression {
    this.consume(TokenType.CHANGED, "Expected 'CHANGED'");

    const expr: ChangedExpression = {
      type: 'ChangedExpression',
      field,
    };

    // Parse optional clauses: FROM, TO, DURING, BEFORE, AFTER, BY
    while (
      this.checkIdentifier('FROM') ||
      this.checkIdentifier('TO') ||
      this.checkIdentifier('DURING') ||
      this.checkIdentifier('BEFORE') ||
      this.checkIdentifier('AFTER') ||
      this.checkIdentifier('BY')
    ) {
      const clause = this.advance().value.toUpperCase();

      if (clause === 'FROM') {
        expr.from = this.parseValue();
      } else if (clause === 'TO') {
        expr.to = this.parseValue();
      } else if (clause === 'DURING') {
        this.consume(TokenType.LPAREN, "Expected '(' after 'DURING'");
        const from = this.parseValue();
        this.consume(TokenType.COMMA, "Expected ',' in date range");
        const to = this.parseValue();
        this.consume(TokenType.RPAREN, "Expected ')' after date range");
        expr.during = { from, to };
      } else if (clause === 'BEFORE') {
        expr.before = this.parseValue();
      } else if (clause === 'AFTER') {
        expr.after = this.parseValue();
      } else if (clause === 'BY') {
        expr.by = this.parseValue();
      }
    }

    return expr;
  }

  // ---------------------------------------------------------------------------
  // FIELD PARSING
  // ---------------------------------------------------------------------------

  private parseField(): FieldReference {
    const token = this.advance();

    // Check for custom field: cf[10001]
    if (
      token.type === TokenType.IDENTIFIER &&
      token.value.toLowerCase() === 'cf'
    ) {
      this.consume(TokenType.LBRACKET, "Expected '[' after 'cf'");
      const idToken = this.consume(
        TokenType.NUMBER,
        'Expected custom field ID',
      );
      this.consume(TokenType.RBRACKET, "Expected ']' after custom field ID");

      return {
        type: 'FieldReference',
        name: `cf[${idToken.value}]`,
        isCustomField: true,
        customFieldId: idToken.value,
      };
    }

    if (token.type !== TokenType.IDENTIFIER) {
      throw this.error(token, `Expected field name, got '${token.value}'`);
    }

    return {
      type: 'FieldReference',
      name: token.value,
      isCustomField: false,
    };
  }

  // ---------------------------------------------------------------------------
  // VALUE PARSING
  // ---------------------------------------------------------------------------

  private parseValue(): Expression {
    const token = this.peek();

    // String literal
    if (this.match(TokenType.STRING)) {
      return {
        type: 'Literal',
        valueType: 'string',
        value: token.value,
        raw: token.value,
      } as Literal;
    }

    // Number literal (possibly with duration suffix)
    if (this.match(TokenType.NUMBER)) {
      const value = token.value;
      const isDuration = /[dhwmy]$/i.test(value);

      return {
        type: 'Literal',
        valueType: isDuration ? 'duration' : 'number',
        value: isDuration ? value : parseFloat(value),
        raw: value,
      } as Literal;
    }

    // Function or identifier
    if (this.check(TokenType.IDENTIFIER)) {
      const name = this.advance().value;

      // Check if it's a function call
      if (this.match(TokenType.LPAREN)) {
        const args: Expression[] = [];

        if (!this.check(TokenType.RPAREN)) {
          args.push(...this.parseValueList());
        }

        this.consume(TokenType.RPAREN, "Expected ')' after function arguments");

        return {
          type: 'FunctionCall',
          name,
          arguments: args,
        } as FunctionCall;
      }

      // It's a field reference (used as value)
      return {
        type: 'FieldReference',
        name,
        isCustomField: false,
      } as FieldReference;
    }

    // Handle keywords that can be values (like EMPTY)
    if (this.match(TokenType.EMPTY)) {
      return {
        type: 'Literal',
        valueType: 'string',
        value: 'EMPTY',
        raw: 'EMPTY',
      } as Literal;
    }

    throw this.error(this.peek(), `Expected value, got '${this.peek().value}'`);
  }

  private parseValueList(): Expression[] {
    const values: Expression[] = [this.parseValue()];

    while (this.match(TokenType.COMMA)) {
      values.push(this.parseValue());
    }

    return values;
  }

  // ---------------------------------------------------------------------------
  // ORDER BY PARSING
  // ---------------------------------------------------------------------------

  private parseOrderBy(): OrderByClause {
    this.consume(TokenType.ORDER, "Expected 'ORDER'");
    this.consume(TokenType.BY, "Expected 'BY'");

    const items: OrderByItem[] = [this.parseOrderByItem()];

    while (this.match(TokenType.COMMA)) {
      items.push(this.parseOrderByItem());
    }

    return {
      type: 'OrderByClause',
      items,
    };
  }

  private parseOrderByItem(): OrderByItem {
    const field = this.parseField();

    let direction: 'ASC' | 'DESC' = 'ASC';
    if (this.match(TokenType.ASC)) {
      direction = 'ASC';
    } else if (this.match(TokenType.DESC)) {
      direction = 'DESC';
    }

    return { field, direction };
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private peek(): Token {
    return this.tokens[this.current];
  }

  private peekNext(): Token {
    if (this.current + 1 < this.tokens.length) {
      return this.tokens[this.current + 1];
    }
    return this.tokens[this.tokens.length - 1]; // EOF
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current++;
    }
    return this.tokens[this.current - 1];
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private checkNext(type: TokenType): boolean {
    return this.peekNext().type === type;
  }

  private checkIdentifier(value: string): boolean {
    return (
      this.check(TokenType.IDENTIFIER) &&
      this.peek().value.toUpperCase() === value.toUpperCase()
    );
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) {
      return this.advance();
    }
    throw this.error(this.peek(), message);
  }

  private error(token: Token, message: string): JQLSyntaxError {
    return new JQLSyntaxError(
      message,
      token.position,
      token.line,
      token.column,
      this.input.substring(
        Math.max(0, token.position - 10),
        token.position + 20,
      ),
    );
  }

  private tokenToOperator(
    token: Token,
  ): ComparisonExpression['operator'] | null {
    switch (token.type) {
      case TokenType.EQUALS:
        return '=';
      case TokenType.NOT_EQUALS:
        return '!=';
      case TokenType.CONTAINS:
        return '~';
      case TokenType.NOT_CONTAINS:
        return '!~';
      case TokenType.GREATER:
        return '>';
      case TokenType.LESS:
        return '<';
      case TokenType.GREATER_EQ:
        return '>=';
      case TokenType.LESS_EQ:
        return '<=';
      default:
        return null;
    }
  }
}

/**
 * Convenience function to parse JQL
 */
export function parse(input: string): JQLQuery {
  const parser = new JQLParser(input);
  return parser.parse();
}
