import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth';
import { projects } from './projects';

// ============================================================================
// ENUMS
// ============================================================================

export const automationTriggerTypeEnum = pgEnum('automation_trigger_type', [
  // Issue triggers
  'issue_created',
  'issue_updated',
  'issue_transitioned',
  'issue_commented',
  'issue_assigned',
  'issue_deleted',

  // Field triggers
  'field_changed',
  'field_value_set',
  'field_value_cleared',

  // Sprint triggers
  'sprint_created',
  'sprint_started',
  'sprint_completed',
  'sprint_deleted',

  // Version triggers
  'version_created',
  'version_released',
  'version_archived',

  // Comment triggers
  'comment_created',
  'comment_updated',
  'comment_deleted',

  // Worklog triggers
  'worklog_created',
  'worklog_updated',
  'worklog_deleted',

  // Scheduled triggers
  'scheduled',
  'scheduled_jql',

  // Manual triggers
  'manual',

  // Webhook triggers
  'incoming_webhook',
]);

export const automationConditionTypeEnum = pgEnum('automation_condition_type', [
  // Field conditions
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

  // Issue conditions
  'issue_type',
  'issue_status',
  'issue_priority',
  'issue_has_subtasks',
  'issue_is_subtask',
  'issue_has_parent',

  // JQL conditions
  'jql_match',

  // User conditions
  'user_in_group',
  'user_in_project_role',
  'user_is_assignee',
  'user_is_reporter',

  // Time conditions
  'time_since_created',
  'time_since_updated',
  'time_in_status',
  'due_date_approaching',

  // Logical conditions
  'and',
  'or',
  'not',
]);

export const automationActionTypeEnum = pgEnum('automation_action_type', [
  // Issue actions
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

  // Create actions
  'create_issue',
  'create_subtask',
  'clone_issue',
  'link_issues',
  'unlink_issues',

  // Sprint actions
  'add_to_sprint',
  'remove_from_sprint',
  'move_to_backlog',

  // Version actions
  'set_fix_version',
  'set_affected_version',
  'remove_fix_version',
  'remove_affected_version',

  // Component actions
  'add_component',
  'remove_component',

  // Notification actions
  'send_email',
  'send_notification',
  'send_webhook',

  // Time tracking actions
  'log_work',
  'set_estimate',

  // Conditional actions
  'if_else',
  'for_each',

  // Advanced actions
  'run_jql',
  'lookup_issues',
  'branch_rule',
]);

export const automationExecutionStatusEnum = pgEnum(
  'automation_execution_status',
  [
    'pending',
    'running',
    'success',
    'partial_success',
    'failed',
    'cancelled',
    'timed_out',
  ],
);

// ============================================================================
// TABLES
// ============================================================================

/**
 * Automation rules - Rule definitions
 */
export const automationRules = pgTable(
  'automation_rules',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // Basic info
    name: text('name').notNull(),
    description: text('description'),

    // Scope
    projectId: text('project_id').references(() => projects.id, {
      onDelete: 'cascade',
    }),
    isGlobal: boolean('is_global').default(false).notNull(),

    // Rule configuration (JSONB for flexibility)
    trigger: jsonb('trigger').$type<AutomationTrigger>().notNull(),
    conditions: jsonb('conditions').$type<AutomationCondition[]>(),
    actions: jsonb('actions').$type<AutomationAction[]>().notNull(),

    // State
    isEnabled: boolean('is_enabled').default(true).notNull(),
    priority: integer('priority').default(100).notNull(), // Lower = higher priority

    // Stats
    executionCount: integer('execution_count').default(0).notNull(),
    successCount: integer('success_count').default(0).notNull(),
    failureCount: integer('failure_count').default(0).notNull(),
    lastExecutedAt: timestamp('last_executed_at', { withTimezone: true }),
    lastErrorAt: timestamp('last_error_at', { withTimezone: true }),
    lastErrorMessage: text('last_error_message'),

    // Rate limiting
    rateLimitPerHour: integer('rate_limit_per_hour').default(1000),
    executionsThisHour: integer('executions_this_hour').default(0),
    hourResetAt: timestamp('hour_reset_at', { withTimezone: true }),

    // Ownership
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id),
    updatedBy: text('updated_by').references(() => user.id),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('automation_rules_project_id_idx').on(table.projectId),
    index('automation_rules_is_enabled_idx').on(table.isEnabled),
    index('automation_rules_is_global_idx').on(table.isGlobal),
    index('automation_rules_created_by_idx').on(table.createdBy),
    uniqueIndex('automation_rules_name_project_idx').on(
      table.name,
      table.projectId,
    ),
  ],
);

/**
 * Automation executions - Execution logs
 */
export const automationExecutions = pgTable(
  'automation_executions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // Rule reference
    ruleId: text('rule_id')
      .notNull()
      .references(() => automationRules.id, { onDelete: 'cascade' }),

    // Trigger context
    triggerType: automationTriggerTypeEnum('trigger_type').notNull(),
    triggerIssueId: text('trigger_issue_id'),
    triggerUserId: text('trigger_user_id').references(() => user.id),
    triggerData: jsonb('trigger_data').$type<Record<string, unknown>>(),

    // Execution details
    status: automationExecutionStatusEnum('status')
      .default('pending')
      .notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    durationMs: integer('duration_ms'),

    // Results
    executedActions: jsonb('executed_actions').$type<ExecutedAction[]>(),
    affectedIssues: jsonb('affected_issues').$type<string[]>(),
    totalActionsCount: integer('total_actions_count').default(0),
    successActionsCount: integer('success_actions_count').default(0),
    failedActionsCount: integer('failed_actions_count').default(0),

    // Error info
    errorMessage: text('error_message'),
    errorStack: text('error_stack'),
    failedAtStep: text('failed_at_step'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('automation_executions_rule_id_idx').on(table.ruleId),
    index('automation_executions_status_idx').on(table.status),
    index('automation_executions_trigger_type_idx').on(table.triggerType),
    index('automation_executions_trigger_issue_id_idx').on(
      table.triggerIssueId,
    ),
    index('automation_executions_created_at_idx').on(table.createdAt),
  ],
);

/**
 * Automation audit - Detailed step-by-step logs
 */
export const automationAudit = pgTable(
  'automation_audit',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // Execution reference
    executionId: text('execution_id')
      .notNull()
      .references(() => automationExecutions.id, { onDelete: 'cascade' }),

    // Step info
    stepIndex: integer('step_index').notNull(),
    stepType: text('step_type').notNull(), // 'trigger', 'condition', 'action'
    stepName: text('step_name').notNull(),

    // I/O
    inputData: jsonb('input_data').$type<Record<string, unknown>>(),
    outputData: jsonb('output_data').$type<Record<string, unknown>>(),

    // Result
    status: automationExecutionStatusEnum('status').notNull(),
    errorMessage: text('error_message'),
    durationMs: integer('duration_ms'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('automation_audit_execution_id_idx').on(table.executionId),
    index('automation_audit_step_type_idx').on(table.stepType),
    index('automation_audit_created_at_idx').on(table.createdAt),
  ],
);

/**
 * Automation scheduled jobs - For scheduled triggers
 */
export const automationScheduledJobs = pgTable(
  'automation_scheduled_jobs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // Rule reference
    ruleId: text('rule_id')
      .notNull()
      .references(() => automationRules.id, { onDelete: 'cascade' }),

    // Schedule config
    cronExpression: text('cron_expression').notNull(),
    timezone: text('timezone').default('UTC').notNull(),

    // JQL filter (for scheduled_jql triggers)
    jqlFilter: text('jql_filter'),

    // State
    isActive: boolean('is_active').default(true).notNull(),
    lastRunAt: timestamp('last_run_at', { withTimezone: true }),
    nextRunAt: timestamp('next_run_at', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('automation_scheduled_jobs_rule_id_idx').on(table.ruleId),
    index('automation_scheduled_jobs_next_run_at_idx').on(table.nextRunAt),
    index('automation_scheduled_jobs_is_active_idx').on(table.isActive),
  ],
);

/**
 * Automation webhooks - For incoming webhook triggers
 */
export const automationWebhooks = pgTable(
  'automation_webhooks',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // Rule reference
    ruleId: text('rule_id')
      .notNull()
      .references(() => automationRules.id, { onDelete: 'cascade' }),

    // Webhook config
    path: text('path').notNull(), // URL path for webhook
    secret: text('secret'), // Optional secret for HMAC validation

    // State
    isActive: boolean('is_active').default(true).notNull(),
    lastCalledAt: timestamp('last_called_at', { withTimezone: true }),
    callCount: integer('call_count').default(0).notNull(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('automation_webhooks_rule_id_idx').on(table.ruleId),
    uniqueIndex('automation_webhooks_path_idx').on(table.path),
  ],
);

// ============================================================================
// RELATIONS
// ============================================================================

export const automationRulesRelations = relations(
  automationRules,
  ({ one, many }) => ({
    project: one(projects, {
      fields: [automationRules.projectId],
      references: [projects.id],
    }),
    creator: one(user, {
      fields: [automationRules.createdBy],
      references: [user.id],
      relationName: 'ruleCreator',
    }),
    updater: one(user, {
      fields: [automationRules.updatedBy],
      references: [user.id],
      relationName: 'ruleUpdater',
    }),
    executions: many(automationExecutions),
    scheduledJob: one(automationScheduledJobs),
    webhook: one(automationWebhooks),
  }),
);

export const automationExecutionsRelations = relations(
  automationExecutions,
  ({ one, many }) => ({
    rule: one(automationRules, {
      fields: [automationExecutions.ruleId],
      references: [automationRules.id],
    }),
    triggerUser: one(user, {
      fields: [automationExecutions.triggerUserId],
      references: [user.id],
    }),
    auditLogs: many(automationAudit),
  }),
);

export const automationAuditRelations = relations(
  automationAudit,
  ({ one }) => ({
    execution: one(automationExecutions, {
      fields: [automationAudit.executionId],
      references: [automationExecutions.id],
    }),
  }),
);

export const automationScheduledJobsRelations = relations(
  automationScheduledJobs,
  ({ one }) => ({
    rule: one(automationRules, {
      fields: [automationScheduledJobs.ruleId],
      references: [automationRules.id],
    }),
  }),
);

export const automationWebhooksRelations = relations(
  automationWebhooks,
  ({ one }) => ({
    rule: one(automationRules, {
      fields: [automationWebhooks.ruleId],
      references: [automationRules.id],
    }),
  }),
);

// ============================================================================
// TYPES
// ============================================================================

/**
 * Trigger configuration
 */
export interface AutomationTrigger {
  type: (typeof automationTriggerTypeEnum.enumValues)[number];
  config?: Record<string, unknown>;
}

/**
 * Condition configuration
 */
export interface AutomationCondition {
  type: (typeof automationConditionTypeEnum.enumValues)[number];
  config?: Record<string, unknown>;
  // For logical operators
  conditions?: AutomationCondition[];
}

/**
 * Action configuration
 */
export interface AutomationAction {
  type: (typeof automationActionTypeEnum.enumValues)[number];
  config?: Record<string, unknown>;
  // For conditional actions
  conditions?: AutomationCondition[];
  thenActions?: AutomationAction[];
  elseActions?: AutomationAction[];
  // For loop actions
  items?: string; // Smart value to iterate
  iteratorAction?: AutomationAction;
}

/**
 * Executed action result
 */
export interface ExecutedAction {
  type: string;
  stepIndex: number;
  status: 'success' | 'failed' | 'skipped';
  durationMs?: number;
  errorMessage?: string;
  result?: Record<string, unknown>;
}

// Type exports
export type AutomationRule = typeof automationRules.$inferSelect;
export type NewAutomationRule = typeof automationRules.$inferInsert;
export type AutomationExecution = typeof automationExecutions.$inferSelect;
export type NewAutomationExecution = typeof automationExecutions.$inferInsert;
export type AutomationAuditLog = typeof automationAudit.$inferSelect;
export type NewAutomationAuditLog = typeof automationAudit.$inferInsert;
export type AutomationScheduledJob =
  typeof automationScheduledJobs.$inferSelect;
export type NewAutomationScheduledJob =
  typeof automationScheduledJobs.$inferInsert;
export type AutomationWebhook = typeof automationWebhooks.$inferSelect;
export type NewAutomationWebhook = typeof automationWebhooks.$inferInsert;
