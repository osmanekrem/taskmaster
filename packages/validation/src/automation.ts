import { z } from 'zod';

// ============================================================================
// AUTOMATION CONSTANTS
// ============================================================================

/**
 * Automation trigger types
 */
export const AUTOMATION_TRIGGER_TYPES = [
  'issue_created',
  'issue_updated',
  'issue_transitioned',
  'issue_commented',
  'issue_assigned',
  'issue_deleted',
  'field_changed',
  'field_value_set',
  'field_value_cleared',
  'sprint_created',
  'sprint_started',
  'sprint_completed',
  'sprint_deleted',
  'version_created',
  'version_released',
  'version_archived',
  'comment_created',
  'comment_updated',
  'comment_deleted',
  'worklog_created',
  'worklog_updated',
  'worklog_deleted',
  'scheduled',
  'scheduled_jql',
  'manual',
  'incoming_webhook',
] as const;

/**
 * Automation condition types
 */
export const AUTOMATION_CONDITION_TYPES = [
  'field_equals',
  'field_not_equals',
  'field_contains',
  'field_not_contains',
  'field_is_empty',
  'field_is_not_empty',
  'field_greater_than',
  'field_less_than',
  'field_in',
  'field_not_in',
  'field_changed',
  'field_changed_to',
  'field_changed_from',
  'issue_type',
  'issue_status',
  'issue_priority',
  'issue_has_subtasks',
  'issue_is_subtask',
  'issue_has_parent',
  'jql_match',
  'user_in_group',
  'user_in_project_role',
  'user_is_assignee',
  'user_is_reporter',
  'time_since_created',
  'time_since_updated',
  'time_in_status',
  'due_date_approaching',
  'and',
  'or',
  'not',
] as const;

/**
 * Automation action types
 */
export const AUTOMATION_ACTION_TYPES = [
  'edit_issue',
  'transition_issue',
  'assign_issue',
  'unassign_issue',
  'add_comment',
  'add_labels',
  'remove_labels',
  'set_priority',
  'set_due_date',
  'clear_due_date',
  'add_watcher',
  'remove_watcher',
  'set_field_value',
  'clear_field_value',
  'create_issue',
  'create_subtask',
  'clone_issue',
  'link_issues',
  'unlink_issues',
  'add_to_sprint',
  'remove_from_sprint',
  'move_to_backlog',
  'set_fix_version',
  'remove_fix_version',
  'set_affected_version',
  'remove_affected_version',
  'add_component',
  'remove_component',
  'send_email',
  'send_notification',
  'send_webhook',
  'log_work',
  'set_estimate',
  'if_else',
  'for_each',
  'run_jql',
  'lookup_issues',
  'branch_rule',
] as const;

// ============================================================================
// AUTOMATION VALIDATION SCHEMAS
// ============================================================================

/**
 * Trigger schema for automation rules
 */
export const triggerSchema = z.object({
  type: z.enum(AUTOMATION_TRIGGER_TYPES),
  config: z.record(z.string(), z.unknown()).optional(),
});

export type TriggerInput = z.infer<typeof triggerSchema>;

/**
 * Condition schema for automation rules (recursive)
 */
export const conditionSchema: z.ZodType<{
  type: string;
  config?: Record<string, unknown>;
  conditions?: Array<{ type: string; config?: Record<string, unknown> }>;
}> = z.object({
  type: z.enum(AUTOMATION_CONDITION_TYPES),
  config: z.record(z.string(), z.unknown()).optional(),
  conditions: z.lazy(() => z.array(conditionSchema)).optional(),
});

export type ConditionInput = z.infer<typeof conditionSchema>;

/**
 * Action schema for automation rules (recursive)
 */
export const actionSchema: z.ZodType<{
  type: string;
  config?: Record<string, unknown>;
  conditions?: Array<{ type: string; config?: Record<string, unknown> }>;
  thenActions?: Array<{ type: string; config?: Record<string, unknown> }>;
  elseActions?: Array<{ type: string; config?: Record<string, unknown> }>;
  items?: string;
  iteratorAction?: { type: string; config?: Record<string, unknown> };
}> = z.object({
  type: z.enum(AUTOMATION_ACTION_TYPES),
  config: z.record(z.string(), z.unknown()).optional(),
  conditions: z.array(conditionSchema).optional(),
  thenActions: z.lazy(() => z.array(actionSchema)).optional(),
  elseActions: z.lazy(() => z.array(actionSchema)).optional(),
  items: z.string().optional(),
  iteratorAction: z.lazy(() => actionSchema).optional(),
});

export type ActionInput = z.infer<typeof actionSchema>;

/**
 * Create automation rule schema
 */
export const createAutomationRuleSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  projectId: z.string().uuid().optional(),
  isGlobal: z.boolean().optional(),
  trigger: triggerSchema,
  conditions: z.array(conditionSchema).optional(),
  actions: z.array(actionSchema).min(1),
  isEnabled: z.boolean().optional(),
  priority: z.number().int().min(1).max(1000).optional(),
  rateLimitPerHour: z.number().int().min(1).max(10000).optional(),
});

export type CreateAutomationRuleInput = z.infer<typeof createAutomationRuleSchema>;

/**
 * Update automation rule schema
 */
export const updateAutomationRuleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  trigger: triggerSchema.optional(),
  conditions: z.array(conditionSchema).optional(),
  actions: z.array(actionSchema).min(1).optional(),
  isEnabled: z.boolean().optional(),
  priority: z.number().int().min(1).max(1000).optional(),
  rateLimitPerHour: z.number().int().min(1).max(10000).optional(),
});

export type UpdateAutomationRuleInput = z.infer<typeof updateAutomationRuleSchema>;

/**
 * Automation rule ID schema
 */
export const automationRuleIdSchema = z.object({
  id: z.string().uuid(),
});

export type AutomationRuleIdInput = z.infer<typeof automationRuleIdSchema>;

/**
 * List automation rules schema
 */
export const listAutomationRulesSchema = z.object({
  projectId: z.string().uuid().optional(),
  isEnabled: z.boolean().optional(),
  includeGlobal: z.boolean().optional(),
});

export type ListAutomationRulesInput = z.infer<typeof listAutomationRulesSchema>;

/**
 * Execute automation rule schema
 */
export const executeAutomationRuleSchema = z.object({
  ruleId: z.string().uuid(),
  issueId: z.string().uuid().optional(),
});

export type ExecuteAutomationRuleInput = z.infer<typeof executeAutomationRuleSchema>;

/**
 * Automation execution history schema
 */
export const automationExecutionHistorySchema = z.object({
  ruleId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

export type AutomationExecutionHistoryInput = z.infer<typeof automationExecutionHistorySchema>;
