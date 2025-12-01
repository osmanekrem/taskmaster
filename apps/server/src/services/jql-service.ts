/**
 * JQL Service
 *
 * Provides high-level JQL query execution and validation.
 */

import { db } from '@/db';
import { issues } from '@/db/schema/issues';
import { statuses } from '@/db/schema/statuses';
import { issueTypes } from '@/db/schema/issue-types';
import { projects } from '@/db/schema/projects';
import { user } from '@/db/schema/auth';
import { eq, desc, asc, sql, and, or, SQL } from 'drizzle-orm';
import type { DrizzleClientOrTransaction } from '@/lib/types/db';
import {
  parseJQL,
  jqlToSQL,
  validateJQL,
  createFunctionContext,
  type JQLQuery,
  type SQLBuilderResult,
  type FunctionContext,
  JQLSyntaxError,
  JQLSemanticError,
} from '@/lib/jql';

// =============================================================================
// TYPES
// =============================================================================

export interface JQLExecutionOptions {
  userId: string | null;
  userEmail?: string | null;
  userGroups?: string[];
  projectId?: string;
  limit?: number;
  offset?: number;
}

export interface JQLExecutionResult<T> {
  items: T[];
  total: number;
  jql: string;
  parsedQuery: JQLQuery;
}

export interface JQLValidationResult {
  isValid: boolean;
  error?: string;
  errorPosition?: number;
  errorLine?: number;
  errorColumn?: number;
  suggestions?: string[];
}

export interface IssueSearchResult {
  id: string;
  key: string;
  summary: string;
  description: string | null;
  statusId: string;
  statusName: string;
  statusCategory: string;
  issueTypeId: string;
  issueTypeName: string;
  issueTypeIcon: string | null;
  projectId: string;
  projectKey: string;
  projectName: string;
  priority: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeAvatar: string | null;
  reporterId: string;
  reporterName: string | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// JQL SERVICE
// =============================================================================

export class JQLService {
  private drizzle: DrizzleClientOrTransaction;

  constructor(drizzle: DrizzleClientOrTransaction = db) {
    this.drizzle = drizzle;
  }

  /**
   * Validate a JQL query
   */
  validate(jql: string): JQLValidationResult {
    try {
      parseJQL(jql);
      return { isValid: true };
    } catch (error) {
      if (error instanceof JQLSyntaxError) {
        return {
          isValid: false,
          error: error.message,
          errorPosition: error.position,
          errorLine: error.line,
          errorColumn: error.column,
          suggestions: this.getSuggestionsForError(error),
        };
      }
      if (error instanceof JQLSemanticError) {
        return {
          isValid: false,
          error: error.message,
          suggestions: this.getSuggestionsForSemanticError(error),
        };
      }
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Parse a JQL query into an AST
   */
  parse(jql: string): JQLQuery {
    return parseJQL(jql);
  }

  /**
   * Execute a JQL query and return issues
   */
  async executeSearch(
    jql: string,
    options: JQLExecutionOptions,
  ): Promise<JQLExecutionResult<IssueSearchResult>> {
    // Parse and validate
    const parsedQuery = parseJQL(jql);

    // Create function context
    const context = createFunctionContext(
      options.userId,
      options.userEmail || null,
      options.userGroups || [],
    );

    // Build SQL
    const sqlResult = jqlToSQL(jql, { context, projectId: options.projectId });

    // Execute query
    const { items, total } = await this.executeQuery(
      sqlResult,
      options.limit || 50,
      options.offset || 0,
    );

    return {
      items,
      total,
      jql,
      parsedQuery,
    };
  }

  /**
   * Execute a JQL query and return issue IDs only
   */
  async executeSearchIds(
    jql: string,
    options: JQLExecutionOptions,
  ): Promise<string[]> {
    // Parse and validate
    parseJQL(jql);

    // Create function context
    const context = createFunctionContext(
      options.userId,
      options.userEmail || null,
      options.userGroups || [],
    );

    // Build SQL
    const sqlResult = jqlToSQL(jql, { context, projectId: options.projectId });

    // Execute query (IDs only)
    const result = await this.drizzle
      .select({ id: issues.id })
      .from(issues)
      .where(sqlResult.where)
      .limit(options.limit || 1000)
      .offset(options.offset || 0);

    return result.map((r) => r.id);
  }

  /**
   * Count issues matching a JQL query
   */
  async countMatches(
    jql: string,
    options: JQLExecutionOptions,
  ): Promise<number> {
    // Parse and validate
    parseJQL(jql);

    // Create function context
    const context = createFunctionContext(
      options.userId,
      options.userEmail || null,
      options.userGroups || [],
    );

    // Build SQL
    const sqlResult = jqlToSQL(jql, { context, projectId: options.projectId });

    // Count query
    const result = await this.drizzle
      .select({ count: sql<number>`count(*)::int` })
      .from(issues)
      .where(sqlResult.where);

    return result[0]?.count || 0;
  }

  /**
   * Build a simple JQL query from filters
   */
  buildJQL(filters: {
    project?: string;
    status?: string | string[];
    assignee?: string;
    reporter?: string;
    issueType?: string | string[];
    priority?: string | string[];
    sprint?: string;
    labels?: string[];
    text?: string;
    createdAfter?: Date;
    createdBefore?: Date;
    updatedAfter?: Date;
    updatedBefore?: Date;
    dueAfter?: Date;
    dueBefore?: Date;
    resolution?: string | 'unresolved';
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
  }): string {
    const clauses: string[] = [];

    if (filters.project) {
      clauses.push(`project = "${filters.project}"`);
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        clauses.push(
          `status IN (${filters.status.map((s) => `"${s}"`).join(', ')})`,
        );
      } else {
        clauses.push(`status = "${filters.status}"`);
      }
    }

    if (filters.assignee) {
      if (filters.assignee === 'currentUser()') {
        clauses.push('assignee = currentUser()');
      } else if (filters.assignee === 'EMPTY') {
        clauses.push('assignee IS EMPTY');
      } else {
        clauses.push(`assignee = "${filters.assignee}"`);
      }
    }

    if (filters.reporter) {
      if (filters.reporter === 'currentUser()') {
        clauses.push('reporter = currentUser()');
      } else {
        clauses.push(`reporter = "${filters.reporter}"`);
      }
    }

    if (filters.issueType) {
      if (Array.isArray(filters.issueType)) {
        clauses.push(
          `issueType IN (${filters.issueType.map((t) => `"${t}"`).join(', ')})`,
        );
      } else {
        clauses.push(`issueType = "${filters.issueType}"`);
      }
    }

    if (filters.priority) {
      if (Array.isArray(filters.priority)) {
        clauses.push(
          `priority IN (${filters.priority.map((p) => `"${p}"`).join(', ')})`,
        );
      } else {
        clauses.push(`priority = "${filters.priority}"`);
      }
    }

    if (filters.sprint) {
      if (filters.sprint === 'openSprints()') {
        clauses.push('sprint IN openSprints()');
      } else {
        clauses.push(`sprint = "${filters.sprint}"`);
      }
    }

    if (filters.labels && filters.labels.length > 0) {
      clauses.push(
        `labels IN (${filters.labels.map((l) => `"${l}"`).join(', ')})`,
      );
    }

    if (filters.text) {
      clauses.push(`text ~ "${filters.text}"`);
    }

    if (filters.createdAfter) {
      clauses.push(`created >= "${filters.createdAfter.toISOString()}"`);
    }

    if (filters.createdBefore) {
      clauses.push(`created <= "${filters.createdBefore.toISOString()}"`);
    }

    if (filters.updatedAfter) {
      clauses.push(`updated >= "${filters.updatedAfter.toISOString()}"`);
    }

    if (filters.updatedBefore) {
      clauses.push(`updated <= "${filters.updatedBefore.toISOString()}"`);
    }

    if (filters.dueAfter) {
      clauses.push(`dueDate >= "${filters.dueAfter.toISOString()}"`);
    }

    if (filters.dueBefore) {
      clauses.push(`dueDate <= "${filters.dueBefore.toISOString()}"`);
    }

    if (filters.resolution) {
      if (filters.resolution === 'unresolved') {
        clauses.push('resolution IS EMPTY');
      } else {
        clauses.push(`resolution = "${filters.resolution}"`);
      }
    }

    let jql = clauses.join(' AND ');

    if (filters.orderBy) {
      jql += ` ORDER BY ${filters.orderBy} ${filters.orderDirection || 'DESC'}`;
    }

    return jql || 'ORDER BY created DESC';
  }

  // ---------------------------------------------------------------------------
  // PRIVATE METHODS
  // ---------------------------------------------------------------------------

  private async executeQuery(
    sqlResult: SQLBuilderResult,
    limit: number,
    offset: number,
  ): Promise<{ items: IssueSearchResult[]; total: number }> {
    // Build the base query with joins
    let query = this.drizzle
      .select({
        id: issues.id,
        key: issues.key,
        summary: issues.summary,
        description: issues.description,
        statusId: issues.statusId,
        statusName: statuses.name,
        statusCategory: statuses.category,
        issueTypeId: issues.issueTypeId,
        issueTypeName: issueTypes.name,
        issueTypeIcon: issueTypes.icon,
        projectId: issues.projectId,
        projectKey: projects.key,
        projectName: projects.name,
        priority: issues.priority,
        assigneeId: issues.assigneeId,
        assigneeName: sql<string>`assignee.name`,
        assigneeAvatar: sql<string>`assignee.image`,
        reporterId: issues.reporterId,
        reporterName: sql<string>`reporter.name`,
        dueDate: issues.dueDate,
        createdAt: issues.createdAt,
        updatedAt: issues.updatedAt,
      })
      .from(issues)
      .leftJoin(statuses, eq(issues.statusId, statuses.id))
      .leftJoin(issueTypes, eq(issues.issueTypeId, issueTypes.id))
      .leftJoin(projects, eq(issues.projectId, projects.id))
      .leftJoin(
        sql`${user} as assignee`,
        sql`${issues.assigneeId} = assignee.id`,
      )
      .leftJoin(
        sql`${user} as reporter`,
        sql`${issues.reporterId} = reporter.id`,
      );

    // Apply dynamic joins from JQL
    // Note: This is simplified - in production, you'd need more sophisticated join handling

    // Apply WHERE clause
    if (sqlResult.where) {
      query = query.where(sqlResult.where) as typeof query;
    }

    // Get total count
    const countResult = await this.drizzle
      .select({ count: sql<number>`count(*)::int` })
      .from(issues)
      .where(sqlResult.where);
    const total = countResult[0]?.count || 0;

    // Apply ORDER BY
    let orderedQuery = query as typeof query & {
      orderBy: (arg: SQL) => typeof query;
    };
    if (sqlResult.orderBy.length > 0) {
      for (const order of sqlResult.orderBy) {
        if (order.direction === 'desc') {
          orderedQuery = orderedQuery.orderBy(
            desc(order.column),
          ) as typeof orderedQuery;
        } else {
          orderedQuery = orderedQuery.orderBy(
            asc(order.column),
          ) as typeof orderedQuery;
        }
      }
    } else {
      // Default ordering
      orderedQuery = orderedQuery.orderBy(
        desc(issues.createdAt),
      ) as typeof orderedQuery;
    }

    // Apply pagination
    const items = await orderedQuery.limit(limit).offset(offset);

    return {
      items: items as IssueSearchResult[],
      total,
    };
  }

  private getSuggestionsForError(error: JQLSyntaxError): string[] {
    const suggestions: string[] = [];

    if (error.message.includes('Unexpected character')) {
      suggestions.push('Check for invalid characters in your query');
      suggestions.push('Make sure strings are properly quoted');
    }

    if (error.message.includes('Expected')) {
      suggestions.push('Check the JQL syntax near the error position');
    }

    return suggestions;
  }

  private getSuggestionsForSemanticError(error: JQLSemanticError): string[] {
    const suggestions: string[] = [];

    if (error.field) {
      suggestions.push(`Check if "${error.field}" is a valid field name`);
      suggestions.push('Use autocomplete to see available fields');
    }

    if (error.operator) {
      suggestions.push(
        `The operator "${error.operator}" may not be supported for this field`,
      );
    }

    return suggestions;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const jqlService = new JQLService();
