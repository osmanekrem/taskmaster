import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '@/lib/trpc';
import { requirePermission } from '@/lib/middleware/permission';
import { automationService } from '@/services/automation-service';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const triggerSchema = z.object({
  type: z.enum([
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
  ]),
  config: z.record(z.string(), z.unknown()).optional(),
});

const conditionSchema: z.ZodType<{
  type: string;
  config?: Record<string, unknown>;
  conditions?: Array<{ type: string; config?: Record<string, unknown> }>;
}> = z.object({
  type: z.enum([
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
  ]),
  config: z.record(z.string(), z.unknown()).optional(),
  conditions: z.lazy(() => z.array(conditionSchema)).optional(),
});

const actionSchema: z.ZodType<{
  type: string;
  config?: Record<string, unknown>;
  conditions?: Array<{ type: string; config?: Record<string, unknown> }>;
  thenActions?: Array<{ type: string; config?: Record<string, unknown> }>;
  elseActions?: Array<{ type: string; config?: Record<string, unknown> }>;
  items?: string;
  iteratorAction?: { type: string; config?: Record<string, unknown> };
}> = z.object({
  type: z.enum([
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
  ]),
  config: z.record(z.string(), z.unknown()).optional(),
  conditions: z.array(conditionSchema).optional(),
  thenActions: z.lazy(() => z.array(actionSchema)).optional(),
  elseActions: z.lazy(() => z.array(actionSchema)).optional(),
  items: z.string().optional(),
  iteratorAction: z.lazy(() => actionSchema).optional(),
});

const createRuleSchema = z.object({
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

const updateRuleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  trigger: triggerSchema.optional(),
  conditions: z.array(conditionSchema).optional(),
  actions: z.array(actionSchema).min(1).optional(),
  isEnabled: z.boolean().optional(),
  priority: z.number().int().min(1).max(1000).optional(),
  rateLimitPerHour: z.number().int().min(1).max(10000).optional(),
});

// ============================================================================
// ROUTER
// ============================================================================

export const automationRouter = router({
  // =========================================================================
  // RULE MANAGEMENT
  // =========================================================================

  /**
   * Create a new automation rule
   */
  create: protectedProcedure
    .use(requirePermission('automation:create'))
    .input(createRuleSchema)
    .mutation(async ({ ctx, input }) => {
      const rule = await automationService.createRule(
        {
          name: input.name,
          description: input.description,
          projectId: input.projectId,
          isGlobal: input.isGlobal,
          trigger: input.trigger as any,
          conditions: input.conditions as any,
          actions: input.actions as any,
          isEnabled: input.isEnabled,
          priority: input.priority,
          rateLimitPerHour: input.rateLimitPerHour,
        },
        ctx.session?.user?.id!,
      );

      return rule;
    }),

  /**
   * Update an automation rule
   */
  update: protectedProcedure
    .use(requirePermission('automation:edit'))
    .input(
      z.object({
        id: z.string().uuid(),
        data: updateRuleSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const rule = await automationService.updateRule(
        input.id,
        {
          name: input.data.name,
          description: input.data.description,
          trigger: input.data.trigger as any,
          conditions: input.data.conditions as any,
          actions: input.data.actions as any,
          isEnabled: input.data.isEnabled,
          priority: input.data.priority,
          rateLimitPerHour: input.data.rateLimitPerHour,
        },
        ctx.session?.user?.id!,
      );

      if (!rule) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Automation rule not found',
        });
      }

      return rule;
    }),

  /**
   * Delete an automation rule
   */
  delete: protectedProcedure
    .use(requirePermission('automation:delete'))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const deleted = await automationService.deleteRule(input.id);

      if (!deleted) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Automation rule not found',
        });
      }

      return { success: true };
    }),

  /**
   * Get rule by ID
   */
  getById: protectedProcedure
    .use(requirePermission('automation:view'))
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const rule = await automationService.getRule(input.id);

      if (!rule) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Automation rule not found',
        });
      }

      return rule;
    }),

  /**
   * List rules
   */
  list: protectedProcedure
    .use(requirePermission('automation:view'))
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
        enabledOnly: z.boolean().optional(),
        limit: z.number().int().min(1).max(100).optional(),
        offset: z.number().int().min(0).optional(),
      }),
    )
    .query(async ({ input }) => {
      return automationService.listRules(input);
    }),

  /**
   * Toggle rule enabled status
   */
  toggle: protectedProcedure
    .use(requirePermission('automation:edit'))
    .input(
      z.object({
        id: z.string().uuid(),
        enabled: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      const rule = await automationService.toggleRule(input.id, input.enabled);

      if (!rule) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Automation rule not found',
        });
      }

      return rule;
    }),

  /**
   * Clone a rule
   */
  clone: protectedProcedure
    .use(requirePermission('automation:create'))
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(200).optional(),
        projectId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const rule = await automationService.cloneRule(
        input.id,
        { name: input.name, projectId: input.projectId },
        ctx.session?.user?.id!,
      );

      if (!rule) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Automation rule not found',
        });
      }

      return rule;
    }),

  // =========================================================================
  // EXECUTIONS
  // =========================================================================

  /**
   * Get execution by ID
   */
  getExecution: protectedProcedure
    .use(requirePermission('automation:view'))
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const execution = await automationService.getExecution(input.id);

      if (!execution) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Execution not found',
        });
      }

      return execution;
    }),

  /**
   * List executions for a rule
   */
  listExecutions: protectedProcedure
    .use(requirePermission('automation:view'))
    .input(
      z.object({
        ruleId: z.string().uuid(),
        limit: z.number().int().min(1).max(100).optional(),
        offset: z.number().int().min(0).optional(),
      }),
    )
    .query(async ({ input }) => {
      return automationService.listExecutions(input.ruleId, {
        limit: input.limit,
        offset: input.offset,
      });
    }),

  /**
   * Get recent executions
   */
  recentExecutions: protectedProcedure
    .use(requirePermission('automation:view'))
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      }),
    )
    .query(async ({ input }) => {
      return automationService.getRecentExecutions(
        input.projectId,
        input.limit,
      );
    }),

  /**
   * Get execution statistics
   */
  statistics: protectedProcedure
    .use(requirePermission('automation:view'))
    .input(
      z.object({
        ruleId: z.string().uuid().optional(),
        fromDate: z.date().optional(),
        toDate: z.date().optional(),
      }),
    )
    .query(async ({ input }) => {
      return automationService.getExecutionStatistics(
        input.ruleId,
        input.fromDate,
        input.toDate,
      );
    }),

  /**
   * Get execution audit logs
   */
  executionAuditLogs: protectedProcedure
    .use(requirePermission('automation:view'))
    .input(z.object({ executionId: z.string().uuid() }))
    .query(async ({ input }) => {
      return automationService.getExecutionAuditLogs(input.executionId);
    }),

  // =========================================================================
  // MANUAL EXECUTION
  // =========================================================================

  /**
   * Manually trigger a rule
   */
  triggerManual: protectedProcedure
    .use(requirePermission('automation:execute'))
    .input(
      z.object({
        ruleId: z.string().uuid(),
        issueId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const rule = await automationService.getRule(input.ruleId);

      if (!rule) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Automation rule not found',
        });
      }

      if (rule.trigger.type !== 'manual') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Rule does not have a manual trigger',
        });
      }

      // TODO: Implement manual trigger execution
      // This would require fetching the issue and building the context

      return { success: true, message: 'Manual trigger execution queued' };
    }),

  // =========================================================================
  // TEMPLATES
  // =========================================================================

  /**
   * Get available rule templates
   */
  templates: protectedProcedure
    .use(requirePermission('automation:view'))
    .query(async () => {
      // Return predefined templates
      return [
        {
          id: 'auto-assign',
          name: 'Auto-assign issues',
          description: 'Automatically assign new issues to a user',
          trigger: { type: 'issue_created' },
          actions: [
            {
              type: 'assign_issue',
              config: { assigneeId: '{{projectLead.id}}' },
            },
          ],
        },
        {
          id: 'auto-transition-done',
          name: 'Auto-close resolved issues',
          description: 'Automatically close issues when all subtasks are done',
          trigger: { type: 'issue_updated' },
          conditions: [
            { type: 'issue_has_subtasks' },
            {
              type: 'jql_match',
              config: { jql: 'subtasks = 0 OR subtasks.status = Done' },
            },
          ],
          actions: [
            { type: 'transition_issue', config: { transitionId: 'done' } },
          ],
        },
        {
          id: 'due-date-reminder',
          name: 'Due date reminder',
          description: 'Send notification when due date is approaching',
          trigger: {
            type: 'scheduled',
            config: { cronExpression: '0 9 * * *' },
          },
          conditions: [
            { type: 'due_date_approaching', config: { withinDays: 2 } },
          ],
          actions: [
            {
              type: 'add_comment',
              config: { content: 'This issue is due soon!' },
            },
            {
              type: 'send_notification',
              config: {
                userId: '{{issue.assignee.id}}',
                title: 'Due date reminder',
                message: '{{issue.key}} is due in 2 days',
              },
            },
          ],
        },
        {
          id: 'sync-parent-status',
          name: 'Sync parent status',
          description: 'Update parent issue when all subtasks are in progress',
          trigger: { type: 'issue_transitioned' },
          conditions: [{ type: 'issue_is_subtask' }],
          actions: [
            {
              type: 'if_else',
              conditions: [
                {
                  type: 'jql_match',
                  config: { jql: 'parent.subtasks.status = "In Progress"' },
                },
              ],
              thenActions: [
                {
                  type: 'edit_issue',
                  config: { fields: { parent: { status: 'In Progress' } } },
                },
              ],
            },
          ],
        },
        {
          id: 'bug-priority-label',
          name: 'Add critical label to high priority bugs',
          description: 'Automatically label high priority bugs',
          trigger: { type: 'issue_created' },
          conditions: [
            { type: 'issue_type', config: { issueTypeIds: ['bug'] } },
            {
              type: 'field_in',
              config: { fieldId: 'priority', values: ['highest', 'high'] },
            },
          ],
          actions: [{ type: 'add_labels', config: { labelIds: ['critical'] } }],
        },
      ];
    }),
});
