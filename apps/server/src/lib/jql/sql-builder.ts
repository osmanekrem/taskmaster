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
  FunctionCall,
  FieldReference,
  Literal,
  OrderByClause,
  JQLQuery,
} from './ast';
import { JQLSemanticError } from './ast';
import { getFieldMapping, SYSTEM_FIELDS } from './fields';
import { evaluateFunction, type FunctionContext } from './functions';
import { issues } from '@/db/schema/issues';
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
