/**
 * Automation Condition Evaluator
 *
 * Evaluates automation rule conditions against issue/trigger context.
 */

import type {
  AutomationCondition,
  automationConditionTypeEnum,
} from '@/db/schema/automation';
import type { SmartValueContext } from './smart-values';
import { resolveSmartValues, resolveSmartValue } from './smart-values';

// ============================================================================
// TYPES
// ============================================================================

export type ConditionType =
  (typeof automationConditionTypeEnum.enumValues)[number];

export interface ConditionEvaluatorContext extends SmartValueContext {
  // Additional context for condition evaluation
  projectId?: string;
  userId?: string;
  userGroups?: string[];
  userProjectRoles?: string[];
}

export interface ConditionResult {
  matched: boolean;
  reason?: string;
  evaluatedConditions?: ConditionResult[];
}

// ============================================================================
// EVALUATOR
// ============================================================================

/**
 * Evaluate a condition or array of conditions
 */
export function evaluateConditions(
  conditions: AutomationCondition[] | undefined,
  context: ConditionEvaluatorContext,
): ConditionResult {
  if (!conditions || conditions.length === 0) {
    return { matched: true, reason: 'No conditions defined' };
  }

  // Multiple conditions are implicitly ANDed
  const results: ConditionResult[] = [];

  for (const condition of conditions) {
    const result = evaluateCondition(condition, context);
    results.push(result);

    if (!result.matched) {
      return {
        matched: false,
        reason: `Condition ${condition.type} not matched: ${result.reason}`,
        evaluatedConditions: results,
      };
    }
  }

  return {
    matched: true,
    reason: 'All conditions matched',
    evaluatedConditions: results,
  };
}

/**
 * Evaluate a single condition
 */
export function evaluateCondition(
  condition: AutomationCondition,
  context: ConditionEvaluatorContext,
): ConditionResult {
  const config = condition.config || {};

  switch (condition.type) {
    // =========================================================================
    // FIELD CONDITIONS
    // =========================================================================

    case 'field_equals':
      return evaluateFieldEquals(config, context);

    case 'field_not_equals':
      return evaluateFieldNotEquals(config, context);

    case 'field_contains':
      return evaluateFieldContains(config, context);

    case 'field_not_contains':
      return evaluateFieldNotContains(config, context);

    case 'field_is_empty':
      return evaluateFieldIsEmpty(config, context);

    case 'field_is_not_empty':
      return evaluateFieldIsNotEmpty(config, context);

    case 'field_greater_than':
      return evaluateFieldGreaterThan(config, context);

    case 'field_less_than':
      return evaluateFieldLessThan(config, context);

    case 'field_in':
      return evaluateFieldIn(config, context);

    case 'field_not_in':
      return evaluateFieldNotIn(config, context);

    case 'field_changed':
      return evaluateFieldChanged(config, context);

    case 'field_changed_to':
      return evaluateFieldChangedTo(config, context);

    case 'field_changed_from':
      return evaluateFieldChangedFrom(config, context);

    // =========================================================================
    // ISSUE CONDITIONS
    // =========================================================================

    case 'issue_type':
      return evaluateIssueType(config, context);

    case 'issue_status':
      return evaluateIssueStatus(config, context);

    case 'issue_priority':
      return evaluateIssuePriority(config, context);

    case 'issue_has_subtasks':
      return evaluateIssueHasSubtasks(config, context);

    case 'issue_is_subtask':
      return evaluateIssueIsSubtask(config, context);

    case 'issue_has_parent':
      return evaluateIssueHasParent(config, context);

    // =========================================================================
    // JQL CONDITIONS
    // =========================================================================

    case 'jql_match':
      return evaluateJqlMatch(config, context);

    // =========================================================================
    // USER CONDITIONS
    // =========================================================================

    case 'user_in_group':
      return evaluateUserInGroup(config, context);

    case 'user_in_project_role':
      return evaluateUserInProjectRole(config, context);

    case 'user_is_assignee':
      return evaluateUserIsAssignee(config, context);

    case 'user_is_reporter':
      return evaluateUserIsReporter(config, context);

    // =========================================================================
    // TIME CONDITIONS
    // =========================================================================

    case 'time_since_created':
      return evaluateTimeSinceCreated(config, context);

    case 'time_since_updated':
      return evaluateTimeSinceUpdated(config, context);

    case 'time_in_status':
      return evaluateTimeInStatus(config, context);

    case 'due_date_approaching':
      return evaluateDueDateApproaching(config, context);

    // =========================================================================
    // LOGICAL CONDITIONS
    // =========================================================================

    case 'and':
      return evaluateAnd(condition, context);

    case 'or':
      return evaluateOr(condition, context);

    case 'not':
      return evaluateNot(condition, context);

    default:
      return {
        matched: false,
        reason: `Unknown condition type: ${condition.type}`,
      };
  }
}

// ============================================================================
// FIELD CONDITION IMPLEMENTATIONS
// ============================================================================

function getFieldValue(
  fieldId: string,
  context: ConditionEvaluatorContext,
): unknown {
  const issue = context.issue;
  if (!issue) return undefined;

  // System fields mapping
  const systemFields: Record<string, () => unknown> = {
    summary: () => issue.summary,
    description: () => issue.description,
    status: () => issue.status?.id,
    'status.name': () => issue.status?.name,
    priority: () => issue.priority?.id,
    'priority.name': () => issue.priority?.name,
    issueType: () => issue.issueType?.id,
    'issueType.name': () => issue.issueType?.name,
    assignee: () => issue.assignee?.id,
    'assignee.name': () => issue.assignee?.name,
    reporter: () => issue.reporter?.id,
    'reporter.name': () => issue.reporter?.name,
    project: () => issue.project?.id,
    'project.key': () => issue.project?.key,
    labels: () => issue.labels,
    components: () => issue.components?.map((c) => c.id),
    fixVersions: () => issue.fixVersions?.map((v) => v.id),
    affectedVersions: () => issue.affectedVersions?.map((v) => v.id),
    dueDate: () => issue.dueDate,
    createdAt: () => issue.createdAt,
    updatedAt: () => issue.updatedAt,
    sprint: () => issue.sprint?.id,
    'sprint.name': () => issue.sprint?.name,
  };

  if (fieldId in systemFields) {
    return systemFields[fieldId]();
  }

  // Custom fields
  if (issue.fields && fieldId in issue.fields) {
    return issue.fields[fieldId];
  }

  return undefined;
}

function evaluateFieldEquals(
  config: Record<string, unknown>,
  context: ConditionEvaluatorContext,
): ConditionResult {
  const fieldId = String(config.fieldId || '');
  const expectedValue = resolveSmartValue(config.value, context);
  const actualValue = getFieldValue(fieldId, context);

  const matched =
    actualValue === expectedValue ||
    (Array.isArray(actualValue) && actualValue.includes(expectedValue));

  return {
    matched,
    reason: matched
      ? `${fieldId} equals ${expectedValue}`
      : `${fieldId} (${actualValue}) does not equal ${expectedValue}`,
  };
}

function evaluateFieldNotEquals(
  config: Record<string, unknown>,
  context: ConditionEvaluatorContext,
): ConditionResult {
  const result = evaluateFieldEquals(config, context);
  return {
    matched: !result.matched,
    reason: result.matched
      ? `${config.fieldId} equals ${config.value}`
      : `${config.fieldId} does not equal ${config.value}`,
  };
}

function evaluateFieldContains(
  config: Record<string, unknown>,
  context: ConditionEvaluatorContext,
): ConditionResult {
  const fieldId = String(config.fieldId || '');
  const searchValue = String(resolveSmartValue(config.value, context) || '');
  const actualValue = getFieldValue(fieldId, context);

  let matched = false;
  if (typeof actualValue === 'string') {
    matched = actualValue.toLowerCase().includes(searchValue.toLowerCase());
  } else if (Array.isArray(actualValue)) {
    matched = actualValue.some((v) =>
      String(v).toLowerCase().includes(searchValue.toLowerCase()),
    );
  }

  return {
    matched,
    reason: matched
      ? `${fieldId} contains "${searchValue}"`
      : `${fieldId} does not contain "${searchValue}"`,
  };
}

function evaluateFieldNotContains(
  config: Record<string, unknown>,
  context: ConditionEvaluatorContext,
): ConditionResult {
  const result = evaluateFieldContains(config, context);
  return {
    matched: !result.matched,
    reason: result.matched
      ? `${config.fieldId} contains ${config.value}`
      : `${config.fieldId} does not contain ${config.value}`,
  };
}

function evaluateFieldIsEmpty(
  config: Record<string, unknown>,
  context: ConditionEvaluatorContext,
): ConditionResult {
  const fieldId = String(config.fieldId || '');
  const actualValue = getFieldValue(fieldId, context);

  const isEmpty =
    actualValue === null ||
    actualValue === undefined ||
    actualValue === '' ||
    (Array.isArray(actualValue) && actualValue.length === 0);

  return {
    matched: isEmpty,
    reason: isEmpty ? `${fieldId} is empty` : `${fieldId} is not empty`,
  };
}

function evaluateFieldIsNotEmpty(
  config: Record<string, unknown>,
  context: ConditionEvaluatorContext,
): ConditionResult {
  const result = evaluateFieldIsEmpty(config, context);
  return {
    matched: !result.matched,
    reason: result.matched
      ? `${config.fieldId} is empty`
      : `${config.fieldId} is not empty`,
  };
}

function evaluateFieldGreaterThan(
  config: Record<string, unknown>,
  context: ConditionEvaluatorContext,
): ConditionResult {
  const fieldId = String(config.fieldId || '');
  const threshold = Number(resolveSmartValue(config.value, context)) || 0;
  const actualValue = Number(getFieldValue(fieldId, context)) || 0;

  const matched = actualValue > threshold;

  return {
    matched,
    reason: matched
      ? `${fieldId} (${actualValue}) > ${threshold}`
      : `${fieldId} (${actualValue}) is not > ${threshold}`,
  };
}

function evaluateFieldLessThan(
  config: Record<string, unknown>,
  context: ConditionEvaluatorContext,
): ConditionResult {
  const fieldId = String(config.fieldId || '');
  const threshold = Number(resolveSmartValue(config.value, context)) || 0;
  const actualValue = Number(getFieldValue(fieldId, context)) || 0;

  const matched = actualValue < threshold;

  return {
    matched,
    reason: matched
      ? `${fieldId} (${actualValue}) < ${threshold}`
      : `${fieldId} (${actualValue}) is not < ${threshold}`,
  };
}

function evaluateFieldIn(
  config: Record<string, unknown>,
  context: ConditionEvaluatorContext,
): ConditionResult {
  const fieldId = String(config.fieldId || '');
  const expectedValues =
    resolveSmartValue(config.values as unknown[], context) || [];
  const actualValue = getFieldValue(fieldId, context);

  const matched =
    Array.isArray(expectedValues) && expectedValues.includes(actualValue);

  return {
    matched,
    reason: matched
      ? `${fieldId} is in [${expectedValues.join(', ')}]`
      : `${fieldId} (${actualValue}) is not in [${expectedValues.join(', ')}]`,
  };
}

function evaluateFieldNotIn(
  config: Record<string, unknown>,
  context: ConditionEvaluatorContext,
): ConditionResult {
  const result = evaluateFieldIn(config, context);
  return {
    matched: !result.matched,
    reason: !result.matched
      ? `${config.fieldId} is not in the specified values`
      : `${config.fieldId} is in the specified values`,
  };
}

function evaluateFieldChanged(
  config: Record<string, unknown>,
  context: ConditionEvaluatorContext,
): ConditionResult {
  const fieldId = String(config.fieldId || '');
  const changelog = context.changelog;

  if (!changelog) {
    return { matched: false, reason: 'No changelog available' };
  }

  const matched =
    changelog.fieldName === fieldId || changelog.fieldId === fieldId;

  return {
    matched,
    reason: matched
      ? `${fieldId} was changed`
      : `${fieldId} was not changed (changed field: ${changelog.fieldName})`,
  };
}

function evaluateFieldChangedTo(
  config: Record<string, unknown>,
  context: ConditionEvaluatorContext,
): ConditionResult {
  const fieldId = String(config.fieldId || '');
  const expectedValue = resolveSmartValue(config.value, context);
  const changelog = context.changelog;

  if (!changelog) {
    return { matched: false, reason: 'No changelog available' };
  }

  const isTargetField =
    changelog.fieldName === fieldId || changelog.fieldId === fieldId;
  const matched = isTargetField && changelog.newValue === expectedValue;

  return {
    matched,
    reason: matched
      ? `${fieldId} changed to ${expectedValue}`
      : `${fieldId} did not change to ${expectedValue}`,
  };
}

function evaluateFieldChangedFrom(
  config: Record<string, unknown>,
  context: ConditionEvaluatorContext,
): ConditionResult {
  const fieldId = String(config.fieldId || '');
  const expectedValue = resolveSmartValue(config.value, context);
  const changelog = context.changelog;

  if (!changelog) {
    return { matched: false, reason: 'No changelog available' };
  }

  const isTargetField =
    changelog.fieldName === fieldId || changelog.fieldId === fieldId;
  const matched = isTargetField && changelog.oldValue === expectedValue;

  return {
    matched,
    reason: matched
      ? `${fieldId} changed from ${expectedValue}`
      : `${fieldId} did not change from ${expectedValue}`,
  };
}

// ============================================================================
// ISSUE CONDITION IMPLEMENTATIONS
// ============================================================================

function evaluateIssueType(
  config: Record<string, unknown>,
  context: ConditionEvaluatorContext,
): ConditionResult {
  const issueTypeIds = (config.issueTypeIds as string[]) || [];
  const actualTypeId = context.issue?.issueType?.id;

  const matched = issueTypeIds.includes(actualTypeId || '');

  return {
    matched,
    reason: matched
      ? `Issue type matches`
      : `Issue type ${actualTypeId} not in [${issueTypeIds.join(', ')}]`,
  };
}

function evaluateIssueStatus(
  config: Record<string, unknown>,
  context: ConditionEvaluatorContext,
): ConditionResult {
  const statusIds = (config.statusIds as string[]) || [];
  const actualStatusId = context.issue?.status?.id;

  const matched = statusIds.includes(actualStatusId || '');

  return {
    matched,
    reason: matched
      ? `Issue status matches`
      : `Issue status ${actualStatusId} not in [${statusIds.join(', ')}]`,
  };
}

function evaluateIssuePriority(
  config: Record<string, unknown>,
  context: ConditionEvaluatorContext,
): ConditionResult {
  const priorityIds = (config.priorityIds as string[]) || [];
  const actualPriorityId = context.issue?.priority?.id;

  const matched = priorityIds.includes(actualPriorityId || '');

  return {
    matched,
    reason: matched
      ? `Issue priority matches`
      : `Issue priority ${actualPriorityId} not in [${priorityIds.join(', ')}]`,
  };
}

function evaluateIssueHasSubtasks(
  _config: Record<string, unknown>,
  context: ConditionEvaluatorContext,
): ConditionResult {
  const hasSubtasks = (context.issue?.subtasks?.length || 0) > 0;

  return {
    matched: hasSubtasks,
    reason: hasSubtasks ? `Issue has subtasks` : `Issue has no subtasks`,
  };
}

function evaluateIssueIsSubtask(
  _config: Record<string, unknown>,
  context: ConditionEvaluatorContext,
): ConditionResult {
  const isSubtask =
    context.issue?.parent !== null && context.issue?.parent !== undefined;

  return {
    matched: isSubtask,
    reason: isSubtask ? `Issue is a subtask` : `Issue is not a subtask`,
  };
}

function evaluateIssueHasParent(
  _config: Record<string, unknown>,
  context: ConditionEvaluatorContext,
): ConditionResult {
  const hasParent =
    context.issue?.parent !== null && context.issue?.parent !== undefined;

  return {
    matched: hasParent,
    reason: hasParent ? `Issue has a parent` : `Issue has no parent`,
  };
}

// ============================================================================
// JQL CONDITION IMPLEMENTATION
// ============================================================================

function evaluateJqlMatch(
  config: Record<string, unknown>,
  _context: ConditionEvaluatorContext,
): ConditionResult {
  // JQL matching is complex and requires database queries
  // This is a placeholder - actual implementation would call JQL service
  const _jql = String(config.jql || '');

  // TODO: Implement JQL matching via JQL service
  // For now, return true as placeholder
  return {
    matched: true,
    reason: 'JQL matching not fully implemented (placeholder)',
  };
}

// ============================================================================
// USER CONDITION IMPLEMENTATIONS
// ============================================================================

function evaluateUserInGroup(
  config: Record<string, unknown>,
  context: ConditionEvaluatorContext,
): ConditionResult {
  const groupId = String(config.groupId || '');
  const userGroups = context.userGroups || [];

  const matched = userGroups.includes(groupId);

  return {
    matched,
    reason: matched
      ? `User is in group ${groupId}`
      : `User is not in group ${groupId}`,
  };
}

function evaluateUserInProjectRole(
  config: Record<string, unknown>,
  context: ConditionEvaluatorContext,
): ConditionResult {
  const roleId = String(config.roleId || '');
  const userRoles = context.userProjectRoles || [];

  const matched = userRoles.includes(roleId);

  return {
    matched,
    reason: matched
      ? `User has project role ${roleId}`
      : `User does not have project role ${roleId}`,
  };
}

function evaluateUserIsAssignee(
  _config: Record<string, unknown>,
  context: ConditionEvaluatorContext,
): ConditionResult {
  const isAssignee = context.issue?.assignee?.id === context.userId;

  return {
    matched: isAssignee,
    reason: isAssignee ? `User is the assignee` : `User is not the assignee`,
  };
}

function evaluateUserIsReporter(
  _config: Record<string, unknown>,
  context: ConditionEvaluatorContext,
): ConditionResult {
  const isReporter = context.issue?.reporter?.id === context.userId;

  return {
    matched: isReporter,
    reason: isReporter ? `User is the reporter` : `User is not the reporter`,
  };
}

// ============================================================================
// TIME CONDITION IMPLEMENTATIONS
// ============================================================================

function evaluateTimeSinceCreated(
  config: Record<string, unknown>,
  context: ConditionEvaluatorContext,
): ConditionResult {
  const operator = String(config.operator || '>');
  const durationMs = Number(config.durationMs || 0);
  const createdAt = context.issue?.createdAt;

  if (!createdAt) {
    return { matched: false, reason: 'No creation date available' };
  }

  const now = context.now || new Date();
  const timeSince = now.getTime() - new Date(createdAt).getTime();

  const matched = compareNumbers(timeSince, durationMs, operator);

  return {
    matched,
    reason: matched
      ? `Time since created (${timeSince}ms) ${operator} ${durationMs}ms`
      : `Time since created condition not met`,
  };
}

function evaluateTimeSinceUpdated(
  config: Record<string, unknown>,
  context: ConditionEvaluatorContext,
): ConditionResult {
  const operator = String(config.operator || '>');
  const durationMs = Number(config.durationMs || 0);
  const updatedAt = context.issue?.updatedAt;

  if (!updatedAt) {
    return { matched: false, reason: 'No update date available' };
  }

  const now = context.now || new Date();
  const timeSince = now.getTime() - new Date(updatedAt).getTime();

  const matched = compareNumbers(timeSince, durationMs, operator);

  return {
    matched,
    reason: matched
      ? `Time since updated (${timeSince}ms) ${operator} ${durationMs}ms`
      : `Time since updated condition not met`,
  };
}

function evaluateTimeInStatus(
  _config: Record<string, unknown>,
  _context: ConditionEvaluatorContext,
): ConditionResult {
  // This requires status history which is complex to implement
  // Placeholder for now
  return {
    matched: true,
    reason: 'Time in status not fully implemented (placeholder)',
  };
}

function evaluateDueDateApproaching(
  config: Record<string, unknown>,
  context: ConditionEvaluatorContext,
): ConditionResult {
  const withinDays = Number(config.withinDays || 7);
  const dueDate = context.issue?.dueDate;

  if (!dueDate) {
    return { matched: false, reason: 'No due date set' };
  }

  const now = context.now || new Date();
  const dueDateObj = new Date(dueDate);
  const diffMs = dueDateObj.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  const matched = diffDays >= 0 && diffDays <= withinDays;

  return {
    matched,
    reason: matched
      ? `Due date is within ${withinDays} days (${diffDays.toFixed(
          1,
        )} days remaining)`
      : `Due date is not within ${withinDays} days`,
  };
}

// ============================================================================
// LOGICAL CONDITION IMPLEMENTATIONS
// ============================================================================

function evaluateAnd(
  condition: AutomationCondition,
  context: ConditionEvaluatorContext,
): ConditionResult {
  const conditions = condition.conditions || [];
  const results: ConditionResult[] = [];

  for (const subCondition of conditions) {
    const result = evaluateCondition(subCondition, context);
    results.push(result);

    if (!result.matched) {
      return {
        matched: false,
        reason: 'AND condition not fully met',
        evaluatedConditions: results,
      };
    }
  }

  return {
    matched: true,
    reason: 'All AND conditions met',
    evaluatedConditions: results,
  };
}

function evaluateOr(
  condition: AutomationCondition,
  context: ConditionEvaluatorContext,
): ConditionResult {
  const conditions = condition.conditions || [];
  const results: ConditionResult[] = [];

  for (const subCondition of conditions) {
    const result = evaluateCondition(subCondition, context);
    results.push(result);

    if (result.matched) {
      return {
        matched: true,
        reason: 'OR condition met',
        evaluatedConditions: results,
      };
    }
  }

  return {
    matched: false,
    reason: 'No OR conditions met',
    evaluatedConditions: results,
  };
}

function evaluateNot(
  condition: AutomationCondition,
  context: ConditionEvaluatorContext,
): ConditionResult {
  const innerCondition = condition.conditions?.[0];

  if (!innerCondition) {
    return { matched: true, reason: 'No inner condition for NOT' };
  }

  const result = evaluateCondition(innerCondition, context);

  return {
    matched: !result.matched,
    reason: `NOT condition: ${result.reason}`,
    evaluatedConditions: [result],
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function compareNumbers(a: number, b: number, operator: string): boolean {
  switch (operator) {
    case '>':
      return a > b;
    case '>=':
      return a >= b;
    case '<':
      return a < b;
    case '<=':
      return a <= b;
    case '=':
    case '==':
      return a === b;
    case '!=':
      return a !== b;
    default:
      return false;
  }
}
