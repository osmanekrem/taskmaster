/**
 * JQL Lexer (Tokenizer)
 *
 * Converts JQL string into a stream of tokens.
 * Handles strings, numbers, identifiers, operators, and keywords.
 */

import type { Token } from './ast';
import { TokenType, JQLSyntaxError } from './ast';

// =============================================================================
// KEYWORDS
// =============================================================================

const KEYWORDS: Record<string, TokenType> = {
  AND: TokenType.AND,
  OR: TokenType.OR,
  NOT: TokenType.NOT,
  IN: TokenType.IN,
  IS: TokenType.IS,
  WAS: TokenType.WAS,
  CHANGED: TokenType.CHANGED,
  EMPTY: TokenType.EMPTY,
  NULL: TokenType.NULL,
  ORDER: TokenType.ORDER,
  BY: TokenType.BY,
  ASC: TokenType.ASC,
  DESC: TokenType.DESC,
};

// =============================================================================
// LEXER CLASS
// =============================================================================

export class JQLLexer {
  private input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];

  constructor(input: string) {
    this.input = input;
  }

  /**
   * Tokenize the entire input
   */
  tokenize(): Token[] {
    this.tokens = [];
    this.position = 0;
    this.line = 1;
    this.column = 1;

    while (!this.isAtEnd()) {
      this.skipWhitespace();
      if (!this.isAtEnd()) {
        this.scanToken();
      }
    }

    this.tokens.push({
      type: TokenType.EOF,
      value: '',
      position: this.position,
      line: this.line,
      column: this.column,
    });

    return this.tokens;
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private isAtEnd(): boolean {
    return this.position >= this.input.length;
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.input[this.position];
  }

  private peekNext(): string {
    if (this.position + 1 >= this.input.length) return '\0';
    return this.input[this.position + 1];
  }

  private advance(): string {
    const char = this.input[this.position];
    this.position++;
    if (char === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return char;
  }

  private match(expected: string): boolean {
    if (this.isAtEnd()) return false;
    if (this.input[this.position] !== expected) return false;
    this.advance();
    return true;
  }

  private skipWhitespace(): void {
    while (!this.isAtEnd()) {
      const char = this.peek();
      if (char === ' ' || char === '\t' || char === '\r' || char === '\n') {
        this.advance();
      } else {
        break;
      }
    }
  }

  private addToken(type: TokenType, value: string): void {
    this.tokens.push({
      type,
      value,
      position: this.position - value.length,
      line: this.line,
      column: this.column - value.length,
    });
  }

  // ---------------------------------------------------------------------------
  // SCANNING
  // ---------------------------------------------------------------------------

  private scanToken(): void {
    const startPosition = this.position;
    const startLine = this.line;
    const startColumn = this.column;
    const char = this.advance();

    switch (char) {
      case '(':
        this.addToken(TokenType.LPAREN, '(');
        break;
      case ')':
        this.addToken(TokenType.RPAREN, ')');
        break;
      case '[':
        this.addToken(TokenType.LBRACKET, '[');
        break;
      case ']':
        this.addToken(TokenType.RBRACKET, ']');
        break;
      case ',':
        this.addToken(TokenType.COMMA, ',');
        break;
      case '=':
        this.addToken(TokenType.EQUALS, '=');
        break;
      case '!':
        if (this.match('=')) {
          this.addToken(TokenType.NOT_EQUALS, '!=');
        } else if (this.match('~')) {
          this.addToken(TokenType.NOT_CONTAINS, '!~');
        } else {
          throw new JQLSyntaxError(
            `Unexpected character '!' at position ${startPosition}`,
            startPosition,
            startLine,
            startColumn,
          );
        }
        break;
      case '~':
        this.addToken(TokenType.CONTAINS, '~');
        break;
      case '>':
        if (this.match('=')) {
          this.addToken(TokenType.GREATER_EQ, '>=');
        } else {
          this.addToken(TokenType.GREATER, '>');
        }
        break;
      case '<':
        if (this.match('=')) {
          this.addToken(TokenType.LESS_EQ, '<=');
        } else {
          this.addToken(TokenType.LESS, '<');
        }
        break;
      case '"':
      case "'":
        this.scanString(char);
        break;
      default:
        if (this.isDigit(char) || (char === '-' && this.isDigit(this.peek()))) {
          this.scanNumber(char);
        } else if (this.isAlpha(char)) {
          this.scanIdentifier(char);
        } else {
          throw new JQLSyntaxError(
            `Unexpected character '${char}' at position ${startPosition}`,
            startPosition,
            startLine,
            startColumn,
          );
        }
    }
  }

  private scanString(quote: string): void {
    const startPosition = this.position - 1;
    const startLine = this.line;
    const startColumn = this.column - 1;
    let value = '';

    while (!this.isAtEnd() && this.peek() !== quote) {
      if (this.peek() === '\\') {
        this.advance(); // Skip backslash
        if (!this.isAtEnd()) {
          const escaped = this.advance();
          switch (escaped) {
            case 'n':
              value += '\n';
              break;
            case 't':
              value += '\t';
              break;
            case 'r':
              value += '\r';
              break;
            case '\\':
              value += '\\';
              break;
            case '"':
              value += '"';
              break;
            case "'":
              value += "'";
              break;
            default:
              value += escaped;
          }
        }
      } else {
        value += this.advance();
      }
    }

    if (this.isAtEnd()) {
      throw new JQLSyntaxError(
        `Unterminated string starting at position ${startPosition}`,
        startPosition,
        startLine,
        startColumn,
      );
    }

    this.advance(); // Closing quote
    this.addToken(TokenType.STRING, value);
  }

  private scanNumber(firstChar: string): void {
    let value = firstChar;

    // Handle negative numbers
    while (!this.isAtEnd() && this.isDigit(this.peek())) {
      value += this.advance();
    }

    // Check for decimal
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      value += this.advance(); // .
      while (!this.isAtEnd() && this.isDigit(this.peek())) {
        value += this.advance();
      }
    }

    // Check for duration suffix (e.g., -7d, 2w, 3h, 30m)
    const suffix = this.peek().toLowerCase();
    if ('dhwmy'.includes(suffix)) {
      value += this.advance();
    }

    this.addToken(TokenType.NUMBER, value);
  }

  private scanIdentifier(firstChar: string): void {
    let value = firstChar;

    while (!this.isAtEnd() && this.isAlphaNumeric(this.peek())) {
      value += this.advance();
    }

    // Check if it's a keyword
    const upperValue = value.toUpperCase();
    const keywordType = KEYWORDS[upperValue];

    if (keywordType) {
      this.addToken(keywordType, upperValue);
    } else {
      this.addToken(TokenType.IDENTIFIER, value);
    }
  }

  // ---------------------------------------------------------------------------
  // CHARACTER CLASSIFICATION
  // ---------------------------------------------------------------------------

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlpha(char: string): boolean {
    return (
      (char >= 'a' && char <= 'z') ||
      (char >= 'A' && char <= 'Z') ||
      char === '_' ||
      char === '-'
    );
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }
}

/**
 * Convenience function to tokenize JQL
 */
export function tokenize(input: string): Token[] {
  const lexer = new JQLLexer(input);
  return lexer.tokenize();
}
