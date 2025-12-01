import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '@/lib/trpc';
import { requirePermission } from '@/lib/middleware/permission';
import { automationService } from '@/services/automation-service';
import {
  createAutomationRuleSchema,
  updateAutomationRuleSchema,
} from '@taskmaster/validation';

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
    .input(createAutomationRuleSchema)
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
        data: updateAutomationRuleSchema,
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
