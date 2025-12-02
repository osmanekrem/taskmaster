/**
 * JQL to SQL Builder
 *
 * Converts JQL AST into Drizzle ORM query conditions.
 */

import {
  sql,
  eq,
  ne,
  like,
  ilike,
  gt,
  lt,
  gte,
  lte,
  and,
  or,
  not,
  isNull,
  isNotNull,
  inArray,
  notInArray,
  type SQL,
} from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import type {
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
  OrderByClause,
  JQLQuery,
} from './ast';
import { JQLSemanticError } from './ast';
import { getFieldMapping, SYSTEM_FIELDS } from './fields';
import { evaluateFunction, type FunctionContext } from './functions';
import { issues, issueHistory } from '@/db/schema/issues';
import { statuses } from '@/db/schema/statuses';
import { issueTypes } from '@/db/schema/issue-types';
import { projects } from '@/db/schema/projects';
import { user } from '@/db/schema/auth';
import { sprints, sprintIssues } from '@/db/schema/sprints';
import { components, issueComponents } from '@/db/schema/components';
import {
  versions,
  issueFixVersions,
  issueAffectedVersions,
} from '@/db/schema/versions';
import { labels, issueLabels } from '@/db/schema/labels';
import { resolutions } from '@/db/schema/statuses';
import { issueLinks, issueLinkTypes } from '@/db/schema/issue-links';
import { issueWatchers } from '@/db/schema/notifications';

// =============================================================================
// TYPES
// =============================================================================

export interface SQLBuilderResult {
  where: SQL | undefined;
  orderBy: Array<{ column: SQL; direction: 'asc' | 'desc' }>;
  joins: JoinInfo[];
}

export interface JoinInfo {
  type: 'inner' | 'left';
  table: string;
  alias: string;
  condition: SQL;
}

export interface SQLBuilderOptions {
  context: FunctionContext;
  projectId?: string;
}

// =============================================================================
// SQL BUILDER CLASS
// =============================================================================

export class JQLSQLBuilder {
  private joins: JoinInfo[] = [];
  private context: FunctionContext;
  private options: SQLBuilderOptions;

  constructor(options: SQLBuilderOptions) {
    this.context = options.context;
    this.options = options;
  }

  /**
   * Build SQL from JQL query
   */
  build(query: JQLQuery): SQLBuilderResult {
    this.joins = [];

    const where = query.where ? this.buildExpression(query.where) : undefined;
    const orderBy = query.orderBy ? this.buildOrderBy(query.orderBy) : [];

    return {
      where,
      orderBy,
      joins: this.joins,
    };
  }

  // ---------------------------------------------------------------------------
  // EXPRESSION BUILDING
  // ---------------------------------------------------------------------------

  private buildExpression(expr: Expression): SQL {
    switch (expr.type) {
      case 'BinaryExpression':
        return this.buildBinaryExpression(expr);
      case 'UnaryExpression':
        return this.buildUnaryExpression(expr);
      case 'ComparisonExpression':
        return this.buildComparisonExpression(expr);
      case 'InExpression':
        return this.buildInExpression(expr);
      case 'IsExpression':
        return this.buildIsExpression(expr);
      case 'WasExpression':
        return this.buildWasExpression(expr);
      case 'ChangedExpression':
        return this.buildChangedExpression(expr);
      case 'FunctionCall':
        return this.buildFunctionCall(expr);
      case 'Literal':
        return this.buildLiteral(expr);
      case 'FieldReference':
        return this.buildFieldReference(expr);
      default:
        throw new JQLSemanticError(
          `Unsupported expression type: ${(expr as Expression).type}`,
        );
    }
  }

  private buildBinaryExpression(expr: BinaryExpression): SQL {
    const left = this.buildExpression(expr.left);
    const right = this.buildExpression(expr.right);

    if (expr.operator === 'AND') {
      return and(left, right)!;
    } else {
      return or(left, right)!;
    }
  }

  private buildUnaryExpression(expr: UnaryExpression): SQL {
    const argument = this.buildExpression(expr.argument);
    return not(argument);
  }

  private buildComparisonExpression(expr: ComparisonExpression): SQL {
    const column = this.getColumn(expr.field);
    const value = this.resolveValue(expr.value);

    // Cast column to avoid overload issues with union types
    const col = column as PgColumn<any, any>;

    switch (expr.operator) {
      case '=':
        return eq(col, value);
      case '!=':
        return ne(col, value);
      case '~':
        // Text contains (case-insensitive)
        return ilike(col, `%${value}%`);
      case '!~':
        // Not contains
        return not(ilike(col, `%${value}%`));
      case '>':
        return gt(col, value);
      case '<':
        return lt(col, value);
      case '>=':
        return gte(col, value);
      case '<=':
        return lte(col, value);
      default:
        throw new JQLSemanticError(`Unsupported operator: ${expr.operator}`);
    }
  }

  private buildInExpression(expr: InExpression): SQL {
    const column = this.getColumn(expr.field);
    const values = expr.values.values.map((v) => this.resolveValue(v));

    // Cast column to avoid overload issues with union types
    const col = column as PgColumn<any, any>;

    if (expr.negated) {
      return notInArray(col, values as any[]);
    } else {
      return inArray(col, values as any[]);
    }
  }

  private buildIsExpression(expr: IsExpression): SQL {
    const column = this.getColumn(expr.field);

    // Cast column to avoid overload issues with union types
    const col = column as PgColumn<any, any>;

    if (expr.negated) {
      return isNotNull(col);
    } else {
      return isNull(col);
    }
  }

  /**
   * Build WAS expression - historical field value query
   * Example: status WAS "In Progress" AFTER "2024-01-01"
   * 
   * Queries the issue_history table to find issues where
   * a field had a specific value at some point in time.
   */
  private buildWasExpression(expr: WasExpression): SQL {
    const fieldName = expr.field.name.toLowerCase();
    const value = this.resolveValue(expr.value);
    
    // Map field name to the actual field name in history changes
    const historyFieldName = this.getHistoryFieldName(fieldName);
    
    // Build the base condition: look in issue_history.changes for field with value
    // changes is JSONB array: [{ field: "status", oldValue: "X", newValue: "Y" }, ...]
    const conditions: SQL[] = [];
    
    // Main condition: exists a history entry where this field had this value
    const existsCondition = sql`EXISTS (
      SELECT 1 FROM ${issueHistory}
      WHERE ${issueHistory.issueId} = ${issues.id}
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(${issueHistory.changes}) AS change
        WHERE (
          change->>'field' = ${historyFieldName}
          AND (
            change->>'oldValue' = ${value}::text
            OR change->>'newValue' = ${value}::text
          )
        )
      )`;
    
    conditions.push(existsCondition);
    
    // Add time constraints
    if (expr.after) {
      const afterDate = this.resolveValue(expr.after);
      conditions.push(sql`AND ${issueHistory.createdAt} > ${afterDate}`);
    }
    
    if (expr.before) {
      const beforeDate = this.resolveValue(expr.before);
      conditions.push(sql`AND ${issueHistory.createdAt} < ${beforeDate}`);
    }
    
    if (expr.during) {
      const fromDate = this.resolveValue(expr.during.from);
      const toDate = this.resolveValue(expr.during.to);
      conditions.push(sql`AND ${issueHistory.createdAt} BETWEEN ${fromDate} AND ${toDate}`);
    }
    
    // Close the EXISTS subquery
    conditions.push(sql`)`);
    
    // Combine all conditions
    return sql.join(conditions, sql.raw(' '));
  }

  /**
   * Build CHANGED expression - field change history query
   * Example: status CHANGED FROM "Open" TO "In Progress" BY currentUser()
   * 
   * Queries the issue_history table to find issues where
   * a field was changed, optionally with constraints on old/new values.
   */
  private buildChangedExpression(expr: ChangedExpression): SQL {
    const fieldName = expr.field.name.toLowerCase();
    const historyFieldName = this.getHistoryFieldName(fieldName);
    
    // Build conditions
    const conditions: SQL[] = [];
    
    // Start the EXISTS subquery
    let subquery = sql`EXISTS (
      SELECT 1 FROM ${issueHistory}
      WHERE ${issueHistory.issueId} = ${issues.id}
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(${issueHistory.changes}) AS change
        WHERE change->>'field' = ${historyFieldName}`;
    
    conditions.push(subquery);
    
    // FROM constraint
    if (expr.from) {
      const fromValue = this.resolveValue(expr.from);
      conditions.push(sql`AND change->>'oldValue' = ${fromValue}::text`);
    }
    
    // TO constraint
    if (expr.to) {
      const toValue = this.resolveValue(expr.to);
      conditions.push(sql`AND change->>'newValue' = ${toValue}::text`);
    }
    
    // Close the inner EXISTS
    conditions.push(sql`)`);
    
    // BY constraint (who made the change)
    if (expr.by) {
      const byUser = this.resolveValue(expr.by);
      conditions.push(sql`AND ${issueHistory.userId} = ${byUser}`);
    }
    
    // Time constraints
    if (expr.after) {
      const afterDate = this.resolveValue(expr.after);
      conditions.push(sql`AND ${issueHistory.createdAt} > ${afterDate}`);
    }
    
    if (expr.before) {
      const beforeDate = this.resolveValue(expr.before);
      conditions.push(sql`AND ${issueHistory.createdAt} < ${beforeDate}`);
    }
    
    if (expr.during) {
      const fromDate = this.resolveValue(expr.during.from);
      const toDate = this.resolveValue(expr.during.to);
      conditions.push(sql`AND ${issueHistory.createdAt} BETWEEN ${fromDate} AND ${toDate}`);
    }
    
    // Close the outer EXISTS
    conditions.push(sql`)`);
    
    return sql.join(conditions, sql.raw(' '));
  }

  /**
   * Map JQL field names to the field names stored in issue_history.changes
   */
  private getHistoryFieldName(fieldName: string): string {
    // Map common JQL field names to how they're stored in history
    const fieldMap: Record<string, string> = {
      status: 'status',
      assignee: 'assignee',
      reporter: 'reporter',
      priority: 'priority',
      issuetype: 'issueType',
      type: 'issueType',
      summary: 'summary',
      description: 'description',
      duedate: 'dueDate',
      labels: 'labels',
      fixversion: 'fixVersion',
      affectedversion: 'affectedVersion',
      component: 'component',
      epic: 'epic',
      parent: 'parent',
      resolution: 'resolution',
      sprint: 'sprint',
      storypoints: 'storyPoints',
    };
    
    return fieldMap[fieldName] || fieldName;
  }

  private buildFunctionCall(expr: FunctionCall): SQL {
    // Evaluate the function
    const result = evaluateFunction(expr.name, expr.arguments, this.context);

    if (!result) {
      throw new JQLSemanticError(`Unknown function: ${expr.name}`);
    }

    // Handle special functions that return subqueries
    switch (expr.name.toLowerCase()) {
      case 'opensprints':
        return this.buildOpenSprintsSubquery();
      case 'closedsprints':
        return this.buildClosedSprintsSubquery();
      case 'futuresprints':
        return this.buildFutureSprintsSubquery();
      case 'releasedversions':
        return this.buildReleasedVersionsSubquery(expr.arguments);
      case 'unreleasedversions':
        return this.buildUnreleasedVersionsSubquery(expr.arguments);
      case 'projectsleadbyuser':
        return this.buildProjectsLeadByUserSubquery(expr.arguments);
      case 'componentsleadbyuser':
        return this.buildComponentsLeadByUserSubquery(expr.arguments);
      case 'linkedissues':
        return this.buildLinkedIssuesSubquery(expr.arguments);
      case 'votedissues':
        return this.buildVotedIssuesSubquery(expr.arguments);
      case 'watchedissues':
        return this.buildWatchedIssuesSubquery(expr.arguments);
      case 'subtasksof':
        return this.buildSubtasksOfSubquery(expr.arguments);
      case 'parentof':
        return this.buildParentOfSubquery(expr.arguments);
      case 'epicissues':
        return this.buildEpicIssuesSubquery(expr.arguments);
      default:
        // For simple functions that return a value
        if (result.type === 'Literal') {
          return this.buildLiteral(result);
        }
        throw new JQLSemanticError(
          `Cannot convert function ${expr.name} to SQL`,
        );
    }
  }

  private buildLiteral(expr: Literal): SQL {
    if (expr.valueType === 'duration') {
      // Convert duration to date
      const date = this.parseDuration(expr.raw);
      return sql`${date.toISOString()}`;
    }

    return sql`${expr.value}`;
  }

  private buildFieldReference(expr: FieldReference): SQL {
    const column = this.getColumn(expr);
    return sql`${column}`;
  }

  // ---------------------------------------------------------------------------
  // COLUMN RESOLUTION
  // ---------------------------------------------------------------------------

  private getColumn(field: FieldReference): PgColumn | SQL {
    const mapping = getFieldMapping(field.name);

    if (!mapping) {
      // Check if it's a custom field
      if (field.isCustomField && field.customFieldId) {
        // Custom fields are stored in issue_field_values
        // This requires a join and special handling
        return this.buildCustomFieldColumn(field.customFieldId);
      }
      throw new JQLSemanticError(`Unknown field: ${field.name}`, field.name);
    }

    // Handle fields that require joins
    if (mapping.tableAlias) {
      this.addJoinForField(mapping);
    }

    // Return the column reference
    return this.getColumnFromMapping(mapping);
  }

  private getColumnFromMapping(
    mapping: (typeof SYSTEM_FIELDS)[keyof typeof SYSTEM_FIELDS],
  ): PgColumn | SQL {
    const columnName = mapping.dbColumn;

    // Map to actual Drizzle columns
    switch (columnName) {
      // Issue direct columns
      case 'id':
        return issues.id;
      case 'key':
        return issues.key;
      case 'summary':
        return issues.summary;
      case 'description':
        return issues.description;
      case 'status_id':
        return issues.statusId;
      case 'resolution_id':
        return issues.resolutionId;
      case 'priority':
        return issues.priority;
      case 'issue_type_id':
        return issues.issueTypeId;
      case 'project_id':
        return issues.projectId;
      case 'assignee_id':
        return issues.assigneeId;
      case 'reporter_id':
        return issues.reporterId;
      case 'created_at':
        return issues.createdAt;
      case 'updated_at':
        return issues.updatedAt;
      case 'due_date':
        return issues.dueDate;
      case 'resolved_at':
        return issues.resolvedAt;
      case 'parent_id':
        return issues.parentId;
      case 'epic_id':
        return issues.epicId;
      case 'story_points':
        return issues.storyPoints;

      // Text search (special handling)
      case '_text_search':
        return sql`(${issues.summary} || ' ' || COALESCE(${issues.description}, ''))`;

      // Fields requiring joins - return SQL with alias
      case 'sprint_id':
        return sql`sprint_issues.sprint_id`;
      case 'component_id':
        return sql`issue_components.component_id`;
      case 'label_id':
        return sql`issue_labels.label_id`;
      case 'version_id':
        // This depends on which version field we're querying
        return sql`issue_fix_versions.version_id`;

      default:
        throw new JQLSemanticError(`Cannot map column: ${columnName}`);
    }
  }

  private buildCustomFieldColumn(customFieldId: string): SQL {
    // Custom fields are stored in issue_field_values table
    // We need a subquery or join to access them
    this.joins.push({
      type: 'left',
      table: 'issue_field_values',
      alias: `cf_${customFieldId}`,
      condition: sql`issues.id = cf_${sql.raw(
        customFieldId,
      )}.issue_id AND cf_${sql.raw(customFieldId)}.field_id = ${customFieldId}`,
    });

    return sql`cf_${sql.raw(customFieldId)}.value`;
  }

  private addJoinForField(
    mapping: (typeof SYSTEM_FIELDS)[keyof typeof SYSTEM_FIELDS],
  ): void {
    const alias = mapping.tableAlias!;

    // Check if join already exists
    if (this.joins.some((j) => j.alias === alias)) {
      return;
    }

    switch (alias) {
      case 'sprint_issues':
        this.joins.push({
          type: 'left',
          table: 'sprint_issues',
          alias: 'sprint_issues',
          condition: sql`${issues.id} = sprint_issues.issue_id AND sprint_issues.is_active = true`,
        });
        break;
      case 'issue_components':
        this.joins.push({
          type: 'left',
          table: 'issue_components',
          alias: 'issue_components',
          condition: sql`${issues.id} = issue_components.issue_id`,
        });
        break;
      case 'issue_fix_versions':
        this.joins.push({
          type: 'left',
          table: 'issue_fix_versions',
          alias: 'issue_fix_versions',
          condition: sql`${issues.id} = issue_fix_versions.issue_id`,
        });
        break;
      case 'issue_affected_versions':
        this.joins.push({
          type: 'left',
          table: 'issue_affected_versions',
          alias: 'issue_affected_versions',
          condition: sql`${issues.id} = issue_affected_versions.issue_id`,
        });
        break;
      case 'issue_labels':
        this.joins.push({
          type: 'left',
          table: 'issue_labels',
          alias: 'issue_labels',
          condition: sql`${issues.id} = issue_labels.issue_id`,
        });
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // VALUE RESOLUTION
  // ---------------------------------------------------------------------------

  private resolveValue(expr: Expression): unknown {
    switch (expr.type) {
      case 'Literal':
        if (expr.valueType === 'duration') {
          return this.parseDuration(expr.raw);
        }
        return expr.value;

      case 'FunctionCall':
        const result = evaluateFunction(
          expr.name,
          expr.arguments,
          this.context,
        );
        if (result?.type === 'Literal') {
          return result.value;
        }
        throw new JQLSemanticError(
          `Function ${expr.name} did not return a value`,
        );

      case 'FieldReference':
        // Field-to-field comparison - return the column
        return this.getColumn(expr);

      default:
        throw new JQLSemanticError(
          `Cannot resolve value from expression type: ${expr.type}`,
        );
    }
  }

  private parseDuration(duration: string): Date {
    const now = this.context.now;
    const match = duration.match(/^(-?\d+)([dhwmy])$/i);

    if (!match) {
      return now;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const result = new Date(now);

    switch (unit) {
      case 'd':
        result.setDate(result.getDate() + value);
        break;
      case 'h':
        result.setHours(result.getHours() + value);
        break;
      case 'w':
        result.setDate(result.getDate() + value * 7);
        break;
      case 'm':
        result.setMonth(result.getMonth() + value);
        break;
      case 'y':
        result.setFullYear(result.getFullYear() + value);
        break;
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // SUBQUERY BUILDERS
  // ---------------------------------------------------------------------------

  private buildOpenSprintsSubquery(): SQL {
    return sql`(SELECT id FROM ${sprints} WHERE status = 'active')`;
  }

  private buildClosedSprintsSubquery(): SQL {
    return sql`(SELECT id FROM ${sprints} WHERE status = 'completed')`;
  }

  private buildFutureSprintsSubquery(): SQL {
    return sql`(SELECT id FROM ${sprints} WHERE status = 'planned')`;
  }

  private buildReleasedVersionsSubquery(args: Expression[]): SQL {
    if (args.length > 0) {
      const projectId = this.resolveValue(args[0]);
      return sql`(SELECT id FROM ${versions} WHERE status = 'released' AND project_id = ${projectId})`;
    }
    return sql`(SELECT id FROM ${versions} WHERE status = 'released')`;
  }

  private buildUnreleasedVersionsSubquery(args: Expression[]): SQL {
    if (args.length > 0) {
      const projectId = this.resolveValue(args[0]);
      return sql`(SELECT id FROM ${versions} WHERE status != 'released' AND project_id = ${projectId})`;
    }
    return sql`(SELECT id FROM ${versions} WHERE status != 'released')`;
  }

  private buildProjectsLeadByUserSubquery(args: Expression[]): SQL {
    const userId =
      args.length > 0 ? this.resolveValue(args[0]) : this.context.currentUserId;
    return sql`(SELECT id FROM ${projects} WHERE lead_id = ${userId})`;
  }

  private buildComponentsLeadByUserSubquery(args: Expression[]): SQL {
    const userId =
      args.length > 0 ? this.resolveValue(args[0]) : this.context.currentUserId;
    return sql`(SELECT id FROM ${components} WHERE lead_id = ${userId})`;
  }

  /**
   * linkedIssues(issueKey?, linkType?) - Returns issues linked to given issue
   * If no arguments, uses current issue context
   */
  private buildLinkedIssuesSubquery(args: Expression[]): SQL {
    // If issueKey is provided, find issues linked to that specific issue
    if (args.length > 0) {
      const issueKey = this.resolveValue(args[0]);
      
      if (args.length > 1) {
        // With link type filter
        const linkTypeName = this.resolveValue(args[1]);
        return sql`(
          SELECT DISTINCT 
            CASE 
              WHEN il.source_issue_id = src.id THEN il.target_issue_id
              ELSE il.source_issue_id
            END
          FROM ${issueLinks} il
          JOIN ${issues} src ON src.key = ${issueKey}
          JOIN ${issueLinkTypes} lt ON lt.id = il.link_type_id
          WHERE (il.source_issue_id = src.id OR il.target_issue_id = src.id)
            AND (lt.name ILIKE ${linkTypeName} OR lt.inward_description ILIKE ${linkTypeName} OR lt.outward_description ILIKE ${linkTypeName})
        )`;
      }
      
      // Without link type filter - all linked issues
      return sql`(
        SELECT DISTINCT 
          CASE 
            WHEN il.source_issue_id = src.id THEN il.target_issue_id
            ELSE il.source_issue_id
          END
        FROM ${issueLinks} il
        JOIN ${issues} src ON src.key = ${issueKey}
        WHERE il.source_issue_id = src.id OR il.target_issue_id = src.id
      )`;
    }
    
    // No arguments - return all issues that have any links (for general use)
    return sql`(
      SELECT DISTINCT source_issue_id FROM ${issueLinks}
      UNION
      SELECT DISTINCT target_issue_id FROM ${issueLinks}
    )`;
  }

  /**
   * votedIssues(userId?) - Returns issues voted by user
   * Note: Issue voting table may not exist yet - placeholder implementation
   */
  private buildVotedIssuesSubquery(args: Expression[]): SQL {
    const userId =
      args.length > 0 ? this.resolveValue(args[0]) : this.context.currentUserId;
    
    // If issue_votes table exists, use it. Otherwise return empty set.
    // This is a placeholder - voting feature needs to be implemented
    return sql`(
      SELECT issue_id FROM issue_votes WHERE user_id = ${userId}
    )`;
  }

  /**
   * watchedIssues(userId?) - Returns issues watched by user
   */
  private buildWatchedIssuesSubquery(args: Expression[]): SQL {
    const userId =
      args.length > 0 ? this.resolveValue(args[0]) : this.context.currentUserId;
    
    return sql`(
      SELECT ${issueWatchers.issueId} FROM ${issueWatchers} 
      WHERE ${issueWatchers.userId} = ${userId}
    )`;
  }

  /**
   * subtasksOf(issueKey) - Returns subtasks of given issue
   */
  private buildSubtasksOfSubquery(args: Expression[]): SQL {
    if (args.length === 0) {
      throw new JQLSemanticError('subtasksOf() requires an issue key argument');
    }
    
    const issueKey = this.resolveValue(args[0]);
    
    return sql`(
      SELECT ${issues.id} FROM ${issues} 
      WHERE ${issues.parentId} = (
        SELECT id FROM ${issues} WHERE key = ${issueKey}
      )
    )`;
  }

  /**
   * parentOf(issueKey) - Returns parent of given issue
   */
  private buildParentOfSubquery(args: Expression[]): SQL {
    if (args.length === 0) {
      throw new JQLSemanticError('parentOf() requires an issue key argument');
    }
    
    const issueKey = this.resolveValue(args[0]);
    
    return sql`(
      SELECT ${issues.parentId} FROM ${issues} WHERE key = ${issueKey}
    )`;
  }

  /**
   * epicIssues(epicKey) - Returns issues in given epic
   */
  private buildEpicIssuesSubquery(args: Expression[]): SQL {
    if (args.length === 0) {
      throw new JQLSemanticError('epicIssues() requires an epic key argument');
    }
    
    const epicKey = this.resolveValue(args[0]);
    
    return sql`(
      SELECT ${issues.id} FROM ${issues} 
      WHERE ${issues.epicId} = (
        SELECT id FROM ${issues} WHERE key = ${epicKey}
      )
    )`;
  }

  // ---------------------------------------------------------------------------
  // ORDER BY BUILDING
  // ---------------------------------------------------------------------------

  private buildOrderBy(
    orderBy: OrderByClause,
  ): Array<{ column: SQL; direction: 'asc' | 'desc' }> {
    return orderBy.items.map((item) => ({
      column: this.buildFieldReference(item.field),
      direction: item.direction.toLowerCase() as 'asc' | 'desc',
    }));
  }
}

/**
 * Convenience function to build SQL from JQL
 */
export function buildSQL(
  query: JQLQuery,
  options: SQLBuilderOptions,
): SQLBuilderResult {
  const builder = new JQLSQLBuilder(options);
  return builder.build(query);
}
