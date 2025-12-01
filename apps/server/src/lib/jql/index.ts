/**
 * JQL (Jira Query Language) Module
 *
 * Provides parsing and execution of JQL queries for issue search.
 *
 * @example
 * ```typescript
 * import { parseJQL, executeJQL } from '@/lib/jql';
 *
 * // Parse a JQL query
 * const query = parseJQL('status = "Done" AND assignee = currentUser() ORDER BY created DESC');
 *
 * // Execute with context
 * const result = await executeJQL(query, {
 *   currentUserId: 'user-123',
 *   currentUserEmail: 'user@example.com',
 *   currentUserGroups: ['developers'],
 *   timezone: 'UTC',
 *   now: new Date(),
 * });
 * ```
 */

// Re-export types
export type {
  Token,
  TokenType,
  ASTNode,
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
  JQLQuery,
  JQLFieldMapping,
} from './ast';

export { JQLSyntaxError, JQLSemanticError } from './ast';

// Re-export lexer
export { JQLLexer, tokenize } from './lexer';

// Re-export parser
export { JQLParser, parse } from './parser';

// Re-export fields
export {
  SYSTEM_FIELDS,
  getFieldMapping,
  getSupportedFields,
  fieldSupportsOperator,
} from './fields';

// Re-export functions
export type {
  FunctionContext,
  JQLFunctionDefinition,
  JQLFunctionHandler,
} from './functions';
export { FUNCTIONS, getFunction, evaluateFunction } from './functions';

// Re-export SQL builder
export type {
  SQLBuilderResult,
  JoinInfo,
  SQLBuilderOptions,
} from './sql-builder';
export { JQLSQLBuilder, buildSQL } from './sql-builder';

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

import { parse } from './parser';
import {
  buildSQL,
  type SQLBuilderOptions,
  type SQLBuilderResult,
} from './sql-builder';
import type { JQLQuery } from './ast';
import type { FunctionContext } from './functions';

/**
 * Parse a JQL string into an AST
 */
export function parseJQL(jql: string): JQLQuery {
  return parse(jql);
}

/**
 * Parse and build SQL from a JQL string
 */
export function jqlToSQL(
  jql: string,
  options: SQLBuilderOptions,
): SQLBuilderResult {
  const query = parse(jql);
  return buildSQL(query, options);
}

/**
 * Validate a JQL string (returns null if valid, error message if invalid)
 */
export function validateJQL(jql: string): string | null {
  try {
    parse(jql);
    return null;
  } catch (error) {
    if (error instanceof Error) {
      return error.message;
    }
    return 'Invalid JQL query';
  }
}

/**
 * Create a function context from user session
 */
export function createFunctionContext(
  userId: string | null,
  userEmail: string | null = null,
  userGroups: string[] = [],
  timezone: string = 'UTC',
): FunctionContext {
  return {
    currentUserId: userId,
    currentUserEmail: userEmail,
    currentUserGroups: userGroups,
    timezone,
    now: new Date(),
  };
}
