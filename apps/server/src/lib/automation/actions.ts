/**
 * Automation Action Executor
 *
 * Executes automation rule actions with smart value resolution.
 */

import type {
  AutomationAction,
  AutomationCondition,
  ExecutedAction,
  automationActionTypeEnum,
} from '@/db/schema/automation';
import type { SmartValueContext } from './smart-values';
import { resolveSmartValue, resolveSmartValues } from './smart-values';
import {
  evaluateConditions,
  type ConditionEvaluatorContext,
} from './conditions';

// ============================================================================
// TYPES
// ============================================================================

export type ActionType = (typeof automationActionTypeEnum.enumValues)[number];

export interface ActionExecutorContext extends ConditionEvaluatorContext {
  // Services for execution
  services: ActionServices;
  // Execution tracking
  executionId: string;
  stepIndex: number;
  // Results collection
  executedActions: ExecutedAction[];
  affectedIssues: Set<string>;
}

export interface ActionServices {
  // Issue operations
  updateIssue: (
    issueId: string,
    data: Record<string, unknown>,
  ) => Promise<void>;
  transitionIssue: (issueId: string, transitionId: string) => Promise<void>;
  createIssue: (
    data: Record<string, unknown>,
  ) => Promise<{ id: string; key: string }>;
  deleteIssue: (issueId: string) => Promise<void>;

  // Comment operations
  addComment: (
    issueId: string,
    content: string,
    authorId: string,
  ) => Promise<void>;

  // Watcher operations
  addWatcher: (issueId: string, userId: string) => Promise<void>;
  removeWatcher: (issueId: string, userId: string) => Promise<void>;

  // Sprint operations
  addToSprint: (issueId: string, sprintId: string) => Promise<void>;
  removeFromSprint: (issueId: string, sprintId: string) => Promise<void>;
  moveToBacklog: (issueId: string) => Promise<void>;

  // Link operations
  linkIssues: (
    sourceId: string,
    targetId: string,
    linkTypeId: string,
  ) => Promise<void>;
  unlinkIssues: (
    sourceId: string,
    targetId: string,
    linkTypeId: string,
  ) => Promise<void>;

  // Label operations
  addLabels: (issueId: string, labelIds: string[]) => Promise<void>;
  removeLabels: (issueId: string, labelIds: string[]) => Promise<void>;

  // Component operations
  addComponent: (issueId: string, componentId: string) => Promise<void>;
  removeComponent: (issueId: string, componentId: string) => Promise<void>;

  // Version operations
  setFixVersion: (issueId: string, versionId: string) => Promise<void>;
  removeFixVersion: (issueId: string, versionId: string) => Promise<void>;
  setAffectedVersion: (issueId: string, versionId: string) => Promise<void>;
  removeAffectedVersion: (issueId: string, versionId: string) => Promise<void>;

  // Time tracking
  logWork: (
    issueId: string,
    timeSpent: number,
    description: string,
    userId: string,
  ) => Promise<void>;
  setEstimate: (issueId: string, estimate: number) => Promise<void>;

  // Notification
  sendEmail: (to: string, subject: string, body: string) => Promise<void>;
  sendNotification: (
    userId: string,
    title: string,
    message: string,
  ) => Promise<void>;
  sendWebhook: (
    url: string,
    method: string,
    body: unknown,
    headers?: Record<string, string>,
  ) => Promise<void>;

  // JQL
  runJql: (jql: string) => Promise<Array<{ id: string; key: string }>>;

  // Lookup
  lookupUser: (query: string) => Promise<{ id: string } | null>;
  lookupIssue: (query: string) => Promise<{ id: string; key: string } | null>;
}

export interface ActionResult {
  success: boolean;
  error?: string;
  result?: Record<string, unknown>;
  affectedIssueIds?: string[];
}

// ============================================================================
// EXECUTOR
// ============================================================================

/**
 * Execute an array of actions
 */
export async function executeActions(
  actions: AutomationAction[],
  context: ActionExecutorContext,
): Promise<ActionResult> {
  for (const action of actions) {
    const result = await executeAction(action, context);

    if (!result.success) {
      return result;
    }

    context.stepIndex++;
  }

  return { success: true };
}

/**
 * Execute a single action
 */
export async function executeAction(
  action: AutomationAction,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const startTime = Date.now();
  const config = action.config || {};

  try {
    let result: ActionResult;

    switch (action.type) {
      // =========================================================================
      // ISSUE ACTIONS
      // =========================================================================

      case 'edit_issue':
        result = await executeEditIssue(config, context);
        break;

      case 'transition_issue':
        result = await executeTransitionIssue(config, context);
        break;

      case 'assign_issue':
        result = await executeAssignIssue(config, context);
        break;

      case 'unassign_issue':
        result = await executeUnassignIssue(config, context);
        break;

      case 'add_comment':
        result = await executeAddComment(config, context);
        break;

      case 'add_labels':
        result = await executeAddLabels(config, context);
        break;

      case 'remove_labels':
        result = await executeRemoveLabels(config, context);
        break;

      case 'set_priority':
        result = await executeSetPriority(config, context);
        break;

      case 'set_due_date':
        result = await executeSetDueDate(config, context);
        break;

      case 'clear_due_date':
        result = await executeClearDueDate(config, context);
        break;

      case 'add_watcher':
        result = await executeAddWatcher(config, context);
        break;

      case 'remove_watcher':
        result = await executeRemoveWatcher(config, context);
        break;

      case 'set_field_value':
        result = await executeSetFieldValue(config, context);
        break;

      case 'clear_field_value':
        result = await executeClearFieldValue(config, context);
        break;

      // =========================================================================
      // CREATE ACTIONS
      // =========================================================================

      case 'create_issue':
        result = await executeCreateIssue(config, context);
        break;

      case 'create_subtask':
        result = await executeCreateSubtask(config, context);
        break;

      case 'clone_issue':
        result = await executeCloneIssue(config, context);
        break;

      case 'link_issues':
        result = await executeLinkIssues(config, context);
        break;

      case 'unlink_issues':
        result = await executeUnlinkIssues(config, context);
        break;

      // =========================================================================
      // SPRINT ACTIONS
      // =========================================================================

      case 'add_to_sprint':
        result = await executeAddToSprint(config, context);
        break;

      case 'remove_from_sprint':
        result = await executeRemoveFromSprint(config, context);
        break;

      case 'move_to_backlog':
        result = await executeMoveToBacklog(config, context);
        break;

      // =========================================================================
      // VERSION ACTIONS
      // =========================================================================

      case 'set_fix_version':
        result = await executeSetFixVersion(config, context);
        break;

      case 'remove_fix_version':
        result = await executeRemoveFixVersion(config, context);
        break;

      case 'set_affected_version':
        result = await executeSetAffectedVersion(config, context);
        break;

      case 'remove_affected_version':
        result = await executeRemoveAffectedVersion(config, context);
        break;

      // =========================================================================
      // COMPONENT ACTIONS
      // =========================================================================

      case 'add_component':
        result = await executeAddComponent(config, context);
        break;

      case 'remove_component':
        result = await executeRemoveComponent(config, context);
        break;

      // =========================================================================
      // NOTIFICATION ACTIONS
      // =========================================================================

      case 'send_email':
        result = await executeSendEmail(config, context);
        break;

      case 'send_notification':
        result = await executeSendNotification(config, context);
        break;

      case 'send_webhook':
        result = await executeSendWebhook(config, context);
        break;

      // =========================================================================
      // TIME TRACKING ACTIONS
      // =========================================================================

      case 'log_work':
        result = await executeLogWork(config, context);
        break;

      case 'set_estimate':
        result = await executeSetEstimate(config, context);
        break;

      // =========================================================================
      // CONDITIONAL ACTIONS
      // =========================================================================

      case 'if_else':
        result = await executeIfElse(action, context);
        break;

      case 'for_each':
        result = await executeForEach(action, context);
        break;

      // =========================================================================
      // ADVANCED ACTIONS
      // =========================================================================

      case 'run_jql':
        result = await executeRunJql(config, context);
        break;

      case 'lookup_issues':
        result = await executeLookupIssues(config, context);
        break;

      case 'branch_rule':
        result = await executeBranchRule(action, context);
        break;

      default:
        result = {
          success: false,
          error: `Unknown action type: ${action.type}`,
        };
    }

    // Record executed action
    const executedAction: ExecutedAction = {
      type: action.type,
      stepIndex: context.stepIndex,
      status: result.success ? 'success' : 'failed',
      durationMs: Date.now() - startTime,
      errorMessage: result.error,
      result: result.result,
    };
    context.executedActions.push(executedAction);

    // Track affected issues
    if (result.affectedIssueIds) {
      for (const issueId of result.affectedIssueIds) {
        context.affectedIssues.add(issueId);
      }
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Record failed action
    const executedAction: ExecutedAction = {
      type: action.type,
      stepIndex: context.stepIndex,
      status: 'failed',
      durationMs: Date.now() - startTime,
      errorMessage,
    };
    context.executedActions.push(executedAction);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// ============================================================================
// ISSUE ACTION IMPLEMENTATIONS
// ============================================================================

async function executeEditIssue(
  config: Record<string, unknown>,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const issueId = context.issue?.id;
  if (!issueId) {
    return { success: false, error: 'No issue in context' };
  }

  const fields = resolveSmartValue(
    (config.fields as Record<string, unknown>) || {},
    context,
  );

  await context.services.updateIssue(issueId, fields);

  return {
    success: true,
    affectedIssueIds: [issueId],
    result: { fields },
  };
}

async function executeTransitionIssue(
  config: Record<string, unknown>,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const issueId = context.issue?.id;
  if (!issueId) {
    return { success: false, error: 'No issue in context' };
  }

  const transitionId = resolveSmartValues(
    String(config.transitionId || ''),
    context,
  );

  await context.services.transitionIssue(issueId, transitionId);

  return {
    success: true,
    affectedIssueIds: [issueId],
    result: { transitionId },
  };
}

async function executeAssignIssue(
  config: Record<string, unknown>,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const issueId = context.issue?.id;
  if (!issueId) {
    return { success: false, error: 'No issue in context' };
  }

  const assigneeId = resolveSmartValues(
    String(config.assigneeId || ''),
    context,
  );

  await context.services.updateIssue(issueId, { assigneeId });

  return {
    success: true,
    affectedIssueIds: [issueId],
    result: { assigneeId },
  };
}

async function executeUnassignIssue(
  _config: Record<string, unknown>,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const issueId = context.issue?.id;
  if (!issueId) {
    return { success: false, error: 'No issue in context' };
  }

  await context.services.updateIssue(issueId, { assigneeId: null });

  return {
    success: true,
    affectedIssueIds: [issueId],
  };
}

async function executeAddComment(
  config: Record<string, unknown>,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const issueId = context.issue?.id;
  if (!issueId) {
    return { success: false, error: 'No issue in context' };
  }

  const content = resolveSmartValues(String(config.content || ''), context);
  const authorId = context.userId || context.triggerUser?.id;

  if (!authorId) {
    return { success: false, error: 'No author for comment' };
  }

  await context.services.addComment(issueId, content, authorId);

  return {
    success: true,
    affectedIssueIds: [issueId],
    result: { content },
  };
}

async function executeAddLabels(
  config: Record<string, unknown>,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const issueId = context.issue?.id;
  if (!issueId) {
    return { success: false, error: 'No issue in context' };
  }

  const labelIds = resolveSmartValue(
    (config.labelIds as string[]) || [],
    context,
  );

  await context.services.addLabels(issueId, labelIds);

  return {
    success: true,
    affectedIssueIds: [issueId],
    result: { labelIds },
  };
}

async function executeRemoveLabels(
  config: Record<string, unknown>,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const issueId = context.issue?.id;
  if (!issueId) {
    return { success: false, error: 'No issue in context' };
  }

  const labelIds = resolveSmartValue(
    (config.labelIds as string[]) || [],
    context,
  );

  await context.services.removeLabels(issueId, labelIds);

  return {
    success: true,
    affectedIssueIds: [issueId],
    result: { labelIds },
  };
}

async function executeSetPriority(
  config: Record<string, unknown>,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const issueId = context.issue?.id;
  if (!issueId) {
    return { success: false, error: 'No issue in context' };
  }

  const priorityId = resolveSmartValues(
    String(config.priorityId || ''),
    context,
  );

  await context.services.updateIssue(issueId, { priorityId });

  return {
    success: true,
    affectedIssueIds: [issueId],
    result: { priorityId },
  };
}

async function executeSetDueDate(
  config: Record<string, unknown>,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const issueId = context.issue?.id;
  if (!issueId) {
    return { success: false, error: 'No issue in context' };
  }

  const dueDateValue = resolveSmartValue(config.dueDate, context);
  const dueDate =
    dueDateValue instanceof Date
      ? dueDateValue
      : new Date(String(dueDateValue));

  await context.services.updateIssue(issueId, { dueDate });

  return {
    success: true,
    affectedIssueIds: [issueId],
    result: { dueDate: dueDate.toISOString() },
  };
}

async function executeClearDueDate(
  _config: Record<string, unknown>,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const issueId = context.issue?.id;
  if (!issueId) {
    return { success: false, error: 'No issue in context' };
  }

  await context.services.updateIssue(issueId, { dueDate: null });

  return {
    success: true,
    affectedIssueIds: [issueId],
  };
}

async function executeAddWatcher(
  config: Record<string, unknown>,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const issueId = context.issue?.id;
  if (!issueId) {
    return { success: false, error: 'No issue in context' };
  }

  const userId = resolveSmartValues(String(config.userId || ''), context);

  await context.services.addWatcher(issueId, userId);

  return {
    success: true,
    affectedIssueIds: [issueId],
    result: { userId },
  };
}

async function executeRemoveWatcher(
  config: Record<string, unknown>,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const issueId = context.issue?.id;
  if (!issueId) {
    return { success: false, error: 'No issue in context' };
  }

  const userId = resolveSmartValues(String(config.userId || ''), context);

  await context.services.removeWatcher(issueId, userId);

  return {
    success: true,
    affectedIssueIds: [issueId],
    result: { userId },
  };
}

async function executeSetFieldValue(
  config: Record<string, unknown>,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const issueId = context.issue?.id;
  if (!issueId) {
    return { success: false, error: 'No issue in context' };
  }

  const fieldId = String(config.fieldId || '');
  const value = resolveSmartValue(config.value, context);

  await context.services.updateIssue(issueId, { [fieldId]: value });

  return {
    success: true,
    affectedIssueIds: [issueId],
    result: { fieldId, value },
  };
}

async function executeClearFieldValue(
  config: Record<string, unknown>,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const issueId = context.issue?.id;
  if (!issueId) {
    return { success: false, error: 'No issue in context' };
  }

  const fieldId = String(config.fieldId || '');

  await context.services.updateIssue(issueId, { [fieldId]: null });

  return {
    success: true,
    affectedIssueIds: [issueId],
    result: { fieldId },
  };
}

// ============================================================================
// CREATE ACTION IMPLEMENTATIONS
// ============================================================================

async function executeCreateIssue(
  config: Record<string, unknown>,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const issueData = resolveSmartValue(
    (config.issue as Record<string, unknown>) || {},
    context,
  );

  const created = await context.services.createIssue(issueData);

  return {
    success: true,
    affectedIssueIds: [created.id],
    result: { issueId: created.id, issueKey: created.key },
  };
}

async function executeCreateSubtask(
  config: Record<string, unknown>,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const parentIssueId = context.issue?.id;
  if (!parentIssueId) {
    return { success: false, error: 'No parent issue in context' };
  }

  const subtaskData = resolveSmartValue(
    (config.subtask as Record<string, unknown>) || {},
    context,
  );

  const created = await context.services.createIssue({
    ...subtaskData,
    parentIssueId,
  });

  return {
    success: true,
    affectedIssueIds: [parentIssueId, created.id],
    result: { issueId: created.id, issueKey: created.key },
  };
}

async function executeCloneIssue(
  config: Record<string, unknown>,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const sourceIssue = context.issue;
  if (!sourceIssue) {
    return { success: false, error: 'No issue to clone' };
  }

  const includeFields = (config.includeFields as string[]) || [
    'summary',
    'description',
    'priority',
  ];
  const overrides = resolveSmartValue(
    (config.overrides as Record<string, unknown>) || {},
    context,
  );

  const cloneData: Record<string, unknown> = {};
  for (const field of includeFields) {
    if (field in sourceIssue) {
      cloneData[field] = (sourceIssue as unknown as Record<string, unknown>)[
        field
      ];
    }
  }

  const created = await context.services.createIssue({
    ...cloneData,
    ...overrides,
    projectId: sourceIssue.project?.id,
    issueTypeId: sourceIssue.issueType?.id,
  });

  return {
    success: true,
    affectedIssueIds: [sourceIssue.id, created.id],
    result: { issueId: created.id, issueKey: created.key },
  };
}

async function executeLinkIssues(
  config: Record<string, unknown>,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const sourceId = context.issue?.id;
  if (!sourceId) {
    return { success: false, error: 'No source issue in context' };
  }

  const targetIssueId = resolveSmartValues(
    String(config.targetIssueId || ''),
    context,
  );
  const linkTypeId = resolveSmartValues(
    String(config.linkTypeId || ''),
    context,
  );

  await context.services.linkIssues(sourceId, targetIssueId, linkTypeId);

  return {
    success: true,
    affectedIssueIds: [sourceId, targetIssueId],
    result: { targetIssueId, linkTypeId },
  };
}

async function executeUnlinkIssues(
  config: Record<string, unknown>,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const sourceId = context.issue?.id;
  if (!sourceId) {
    return { success: false, error: 'No source issue in context' };
  }

  const targetIssueId = resolveSmartValues(
    String(config.targetIssueId || ''),
    context,
  );
  const linkTypeId = resolveSmartValues(
    String(config.linkTypeId || ''),
    context,
  );

  await context.services.unlinkIssues(sourceId, targetIssueId, linkTypeId);

  return {
    success: true,
    affectedIssueIds: [sourceId, targetIssueId],
    result: { targetIssueId, linkTypeId },
  };
}

// ============================================================================
// SPRINT ACTION IMPLEMENTATIONS
// ============================================================================

async function executeAddToSprint(
  config: Record<string, unknown>,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const issueId = context.issue?.id;
  if (!issueId) {
    return { success: false, error: 'No issue in context' };
  }

  const sprintId = resolveSmartValues(String(config.sprintId || ''), context);

  await context.services.addToSprint(issueId, sprintId);

  return {
    success: true,
    affectedIssueIds: [issueId],
    result: { sprintId },
  };
}

async function executeRemoveFromSprint(
  config: Record<string, unknown>,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const issueId = context.issue?.id;
  if (!issueId) {
    return { success: false, error: 'No issue in context' };
  }

  const sprintId = resolveSmartValues(String(config.sprintId || ''), context);

  await context.services.removeFromSprint(issueId, sprintId);

  return {
    success: true,
    affectedIssueIds: [issueId],
    result: { sprintId },
  };
}

async function executeMoveToBacklog(
  _config: Record<string, unknown>,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const issueId = context.issue?.id;
  if (!issueId) {
    return { success: false, error: 'No issue in context' };
  }

  await context.services.moveToBacklog(issueId);

  return {
    success: true,
    affectedIssueIds: [issueId],
  };
}

// ============================================================================
// VERSION ACTION IMPLEMENTATIONS
// ============================================================================

async function executeSetFixVersion(
  config: Record<string, unknown>,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const issueId = context.issue?.id;
  if (!issueId) {
    return { success: false, error: 'No issue in context' };
  }

  const versionId = resolveSmartValues(String(config.versionId || ''), context);

  await context.services.setFixVersion(issueId, versionId);

  return {
    success: true,
    affectedIssueIds: [issueId],
    result: { versionId },
  };
}

async function executeRemoveFixVersion(
  config: Record<string, unknown>,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const issueId = context.issue?.id;
  if (!issueId) {
    return { success: false, error: 'No issue in context' };
  }

  const versionId = resolveSmartValues(String(config.versionId || ''), context);

  await context.services.removeFixVersion(issueId, versionId);

  return {
    success: true,
    affectedIssueIds: [issueId],
    result: { versionId },
  };
}

async function executeSetAffectedVersion(
  config: Record<string, unknown>,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const issueId = context.issue?.id;
  if (!issueId) {
    return { success: false, error: 'No issue in context' };
  }

  const versionId = resolveSmartValues(String(config.versionId || ''), context);

  await context.services.setAffectedVersion(issueId, versionId);

  return {
    success: true,
    affectedIssueIds: [issueId],
    result: { versionId },
  };
}

async function executeRemoveAffectedVersion(
  config: Record<string, unknown>,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const issueId = context.issue?.id;
  if (!issueId) {
    return { success: false, error: 'No issue in context' };
  }

  const versionId = resolveSmartValues(String(config.versionId || ''), context);

  await context.services.removeAffectedVersion(issueId, versionId);

  return {
    success: true,
    affectedIssueIds: [issueId],
    result: { versionId },
  };
}

// ============================================================================
// COMPONENT ACTION IMPLEMENTATIONS
// ============================================================================

async function executeAddComponent(
  config: Record<string, unknown>,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const issueId = context.issue?.id;
  if (!issueId) {
    return { success: false, error: 'No issue in context' };
  }

  const componentId = resolveSmartValues(
    String(config.componentId || ''),
    context,
  );

  await context.services.addComponent(issueId, componentId);

  return {
    success: true,
    affectedIssueIds: [issueId],
    result: { componentId },
  };
}

async function executeRemoveComponent(
  config: Record<string, unknown>,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const issueId = context.issue?.id;
  if (!issueId) {
    return { success: false, error: 'No issue in context' };
  }

  const componentId = resolveSmartValues(
    String(config.componentId || ''),
    context,
  );

  await context.services.removeComponent(issueId, componentId);

  return {
    success: true,
    affectedIssueIds: [issueId],
    result: { componentId },
  };
}

// ============================================================================
// NOTIFICATION ACTION IMPLEMENTATIONS
// ============================================================================

async function executeSendEmail(
  config: Record<string, unknown>,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const to = resolveSmartValues(String(config.to || ''), context);
  const subject = resolveSmartValues(String(config.subject || ''), context);
  const body = resolveSmartValues(String(config.body || ''), context);

  await context.services.sendEmail(to, subject, body);

  return {
    success: true,
    result: { to, subject },
  };
}

async function executeSendNotification(
  config: Record<string, unknown>,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const userId = resolveSmartValues(String(config.userId || ''), context);
  const title = resolveSmartValues(String(config.title || ''), context);
  const message = resolveSmartValues(String(config.message || ''), context);

  await context.services.sendNotification(userId, title, message);

  return {
    success: true,
    result: { userId, title },
  };
}

async function executeSendWebhook(
  config: Record<string, unknown>,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const url = resolveSmartValues(String(config.url || ''), context);
  const method = String(config.method || 'POST');
  const body = resolveSmartValue(config.body, context);
  const headers = resolveSmartValue(
    (config.headers as Record<string, string>) || {},
    context,
  );

  await context.services.sendWebhook(url, method, body, headers);

  return {
    success: true,
    result: { url, method },
  };
}

// ============================================================================
// TIME TRACKING ACTION IMPLEMENTATIONS
// ============================================================================

async function executeLogWork(
  config: Record<string, unknown>,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const issueId = context.issue?.id;
  if (!issueId) {
    return { success: false, error: 'No issue in context' };
  }

  const timeSpent = Number(resolveSmartValue(config.timeSpent, context)) || 0;
  const description = resolveSmartValues(
    String(config.description || ''),
    context,
  );
  const userId = context.userId || context.triggerUser?.id;

  if (!userId) {
    return { success: false, error: 'No user for worklog' };
  }

  await context.services.logWork(issueId, timeSpent, description, userId);

  return {
    success: true,
    affectedIssueIds: [issueId],
    result: { timeSpent, description },
  };
}

async function executeSetEstimate(
  config: Record<string, unknown>,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const issueId = context.issue?.id;
  if (!issueId) {
    return { success: false, error: 'No issue in context' };
  }

  const estimate = Number(resolveSmartValue(config.estimate, context)) || 0;

  await context.services.setEstimate(issueId, estimate);

  return {
    success: true,
    affectedIssueIds: [issueId],
    result: { estimate },
  };
}

// ============================================================================
// CONDITIONAL ACTION IMPLEMENTATIONS
// ============================================================================

async function executeIfElse(
  action: AutomationAction,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const conditions = action.conditions || [];
  const conditionResult = await evaluateConditions(conditions, context);

  if (conditionResult.matched) {
    // Execute then actions
    const thenActions = action.thenActions || [];
    if (thenActions.length > 0) {
      return executeActions(thenActions, context);
    }
  } else {
    // Execute else actions
    const elseActions = action.elseActions || [];
    if (elseActions.length > 0) {
      return executeActions(elseActions, context);
    }
  }

  return { success: true };
}

async function executeForEach(
  action: AutomationAction,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const itemsExpression = action.items || '';
  const items = resolveSmartValue(itemsExpression, context);

  if (!Array.isArray(items)) {
    return { success: false, error: 'Items must be an array' };
  }

  const iteratorAction = action.iteratorAction;
  if (!iteratorAction) {
    return { success: false, error: 'No iterator action defined' };
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const iterContext: ActionExecutorContext = {
      ...context,
      variables: {
        ...context.variables,
        item,
        itemIndex: i,
      },
    };

    const result = await executeAction(iteratorAction, iterContext);
    if (!result.success) {
      return result;
    }
  }

  return { success: true };
}

// ============================================================================
// ADVANCED ACTION IMPLEMENTATIONS
// ============================================================================

async function executeRunJql(
  config: Record<string, unknown>,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const jql = resolveSmartValues(String(config.jql || ''), context);

  const issues = await context.services.runJql(jql);

  // Store results in variables for subsequent actions
  context.variables = {
    ...context.variables,
    jqlResults: issues,
    jqlResultCount: issues.length,
  };

  return {
    success: true,
    affectedIssueIds: issues.map((i) => i.id),
    result: { jql, resultCount: issues.length },
  };
}

async function executeLookupIssues(
  config: Record<string, unknown>,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  const query = resolveSmartValues(String(config.query || ''), context);

  const issue = await context.services.lookupIssue(query);

  if (issue) {
    context.variables = {
      ...context.variables,
      lookupIssue: issue,
    };
  }

  return {
    success: true,
    result: { found: !!issue },
  };
}

async function executeBranchRule(
  action: AutomationAction,
  context: ActionExecutorContext,
): Promise<ActionResult> {
  // Branch rule executes different action sets based on multiple conditions
  // This is like a switch statement
  const branches =
    (action.config?.branches as Array<{
      conditions: AutomationCondition[];
      actions: AutomationAction[];
    }>) || [];

  for (const branch of branches) {
    const conditionResult = await evaluateConditions(branch.conditions, context);
    if (conditionResult.matched) {
      return executeActions(branch.actions, context);
    }
  }

  // Execute default branch if no condition matched
  const defaultActions = action.elseActions || [];
  if (defaultActions.length > 0) {
    return executeActions(defaultActions, context);
  }

  return { success: true };
}
