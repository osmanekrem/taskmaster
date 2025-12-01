/**
 * Automation Service
 *
 * Business logic for managing automation rules.
 */

import {
  automationRuleRepository,
  automationExecutionRepository,
  automationAuditRepository,
  automationScheduledJobRepository,
  automationWebhookRepository,
} from '@/repositories/automation-repository';
import type {
  AutomationRule,
  NewAutomationRule,
  AutomationExecution,
  AutomationTrigger,
  AutomationCondition,
  AutomationAction,
} from '@/db/schema/automation';
import {
  getAutomationEngine,
  type TriggerEvent,
  type IssueData,
  type UserData,
} from '@/lib/automation/engine';
import { parseCronExpression, getNextCronDate } from '@/lib/automation/cron';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateRuleInput {
  name: string;
  description?: string;
  projectId?: string;
  isGlobal?: boolean;
  trigger: AutomationTrigger;
  conditions?: AutomationCondition[];
  actions: AutomationAction[];
  isEnabled?: boolean;
  priority?: number;
  rateLimitPerHour?: number;
}

export interface UpdateRuleInput {
  name?: string;
  description?: string;
  trigger?: AutomationTrigger;
  conditions?: AutomationCondition[];
  actions?: AutomationAction[];
  isEnabled?: boolean;
  priority?: number;
  rateLimitPerHour?: number;
}

export interface RuleListOptions {
  projectId?: string;
  enabledOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface TriggerIssueEventInput {
  type:
    | 'issue_created'
    | 'issue_updated'
    | 'issue_transitioned'
    | 'issue_assigned'
    | 'issue_deleted'
    | 'issue_commented';
  issue: IssueData;
  user: UserData;
  projectId: string;
  changelog?: {
    fieldName: string;
    fieldId?: string;
    oldValue?: unknown;
    newValue?: unknown;
    oldDisplayValue?: string;
    newDisplayValue?: string;
  };
}

export interface TriggerSprintEventInput {
  type:
    | 'sprint_created'
    | 'sprint_started'
    | 'sprint_completed'
    | 'sprint_deleted';
  sprint: { id: string; name: string };
  projectId: string;
  user: UserData;
}

export interface TriggerVersionEventInput {
  type: 'version_created' | 'version_released' | 'version_archived';
  version: { id: string; name: string };
  projectId: string;
  user: UserData;
}

export interface TriggerCommentEventInput {
  type: 'comment_created' | 'comment_updated' | 'comment_deleted';
  issue: IssueData;
  comment: { id: string; body: string };
  user: UserData;
  projectId: string;
}

export interface TriggerWorklogEventInput {
  type: 'worklog_created' | 'worklog_updated' | 'worklog_deleted';
  issue: IssueData;
  worklog: { id: string; timeSpent: number; description?: string };
  user: UserData;
  projectId: string;
}

// ============================================================================
// SERVICE
// ============================================================================

export class AutomationService {
  // =========================================================================
  // RULE MANAGEMENT
  // =========================================================================

  /**
   * Create a new automation rule
   */
  async createRule(
    input: CreateRuleInput,
    createdBy: string,
  ): Promise<AutomationRule> {
    // Validate trigger
    this.validateTrigger(input.trigger);

    // Validate actions
    this.validateActions(input.actions);

    const rule = await automationRuleRepository.create({
      name: input.name,
      description: input.description,
      projectId: input.isGlobal ? undefined : input.projectId,
      isGlobal: input.isGlobal ?? false,
      trigger: input.trigger,
      conditions: input.conditions,
      actions: input.actions,
      isEnabled: input.isEnabled ?? true,
      priority: input.priority ?? 100,
      rateLimitPerHour: input.rateLimitPerHour ?? 1000,
      createdBy,
    });

    // Create scheduled job if needed
    if (
      input.trigger.type === 'scheduled' ||
      input.trigger.type === 'scheduled_jql'
    ) {
      await this.createScheduledJob(rule);
    }

    // Create webhook if needed
    if (input.trigger.type === 'incoming_webhook') {
      await this.createWebhookEndpoint(rule);
    }

    return rule;
  }

  /**
   * Update an automation rule
   */
  async updateRule(
    id: string,
    input: UpdateRuleInput,
    updatedBy: string,
  ): Promise<AutomationRule | null> {
    const existingRule = await automationRuleRepository.findById(id);
    if (!existingRule) {
      return null;
    }

    // Validate if provided
    if (input.trigger) {
      this.validateTrigger(input.trigger);
    }
    if (input.actions) {
      this.validateActions(input.actions);
    }

    const updatedRule = await automationRuleRepository.update(id, {
      ...input,
      updatedBy,
    });

    if (!updatedRule) {
      return null;
    }

    // Handle scheduled job updates
    const newTriggerType = input.trigger?.type ?? existingRule.trigger.type;
    const wasScheduled =
      existingRule.trigger.type === 'scheduled' ||
      existingRule.trigger.type === 'scheduled_jql';
    const isScheduled =
      newTriggerType === 'scheduled' || newTriggerType === 'scheduled_jql';

    if (wasScheduled && !isScheduled) {
      await automationScheduledJobRepository.deleteByRuleId(id);
    } else if (isScheduled) {
      await automationScheduledJobRepository.deleteByRuleId(id);
      await this.createScheduledJob(updatedRule);
    }

    // Handle webhook updates
    const wasWebhook = existingRule.trigger.type === 'incoming_webhook';
    const isWebhook = newTriggerType === 'incoming_webhook';

    if (wasWebhook && !isWebhook) {
      await automationWebhookRepository.deleteByRuleId(id);
    } else if (isWebhook && !wasWebhook) {
      await this.createWebhookEndpoint(updatedRule);
    }

    return updatedRule;
  }

  /**
   * Delete an automation rule
   */
  async deleteRule(id: string): Promise<boolean> {
    // Cascade delete will handle scheduled jobs and webhooks
    return automationRuleRepository.delete(id);
  }

  /**
   * Get rule by ID
   */
  async getRule(id: string): Promise<AutomationRule | null> {
    return automationRuleRepository.findById(id);
  }

  /**
   * List rules
   */
  async listRules(options: RuleListOptions): Promise<{
    rules: AutomationRule[];
    total: number;
  }> {
    if (options.projectId) {
      return automationRuleRepository.findByProject(options.projectId, options);
    }

    // Get global rules
    const rules = await automationRuleRepository.findGlobalRules(
      options.enabledOnly,
    );
    return { rules, total: rules.length };
  }

  /**
   * Toggle rule enabled status
   */
  async toggleRule(
    id: string,
    enabled: boolean,
  ): Promise<AutomationRule | null> {
    const rule = await automationRuleRepository.toggleEnabled(id, enabled);

    if (rule) {
      // Update scheduled job status
      const job = await automationScheduledJobRepository.findByRuleId(id);
      if (job) {
        await automationScheduledJobRepository.toggleActive(job.id, enabled);
      }
    }

    return rule;
  }

  /**
   * Clone a rule
   */
  async cloneRule(
    id: string,
    options: { name?: string; projectId?: string },
    createdBy: string,
  ): Promise<AutomationRule | null> {
    const original = await automationRuleRepository.findById(id);
    if (!original) {
      return null;
    }

    return this.createRule(
      {
        name: options.name ?? `${original.name} (Copy)`,
        description: original.description ?? undefined,
        projectId: options.projectId ?? original.projectId ?? undefined,
        isGlobal: !options.projectId && original.isGlobal,
        trigger: original.trigger,
        conditions: original.conditions ?? undefined,
        actions: original.actions,
        isEnabled: false, // Cloned rules start disabled
        priority: original.priority,
        rateLimitPerHour: original.rateLimitPerHour ?? undefined,
      },
      createdBy,
    );
  }

  // =========================================================================
  // TRIGGER EVENTS
  // =========================================================================

  /**
   * Trigger an issue event
   */
  async triggerIssueEvent(input: TriggerIssueEventInput): Promise<void> {
    const engine = getAutomationEngine();

    const event: TriggerEvent = {
      type: input.type,
      projectId: input.projectId,
      issueId: input.issue.id,
      userId: input.user.id,
      issue: input.issue,
      user: input.user,
      changelog: input.changelog,
    };

    // Fire and forget - don't block the main operation
    engine.processTrigger(event).catch((error) => {
      console.error('[AutomationService] Error processing issue event:', error);
    });
  }

  /**
   * Trigger a sprint event
   */
  async triggerSprintEvent(input: TriggerSprintEventInput): Promise<void> {
    const engine = getAutomationEngine();

    const event: TriggerEvent = {
      type: input.type,
      projectId: input.projectId,
      userId: input.user.id,
      user: input.user,
      trigger: {
        type: input.type,
        sprint: input.sprint,
      },
    };

    engine.processTrigger(event).catch((error) => {
      console.error(
        '[AutomationService] Error processing sprint event:',
        error,
      );
    });
  }

  /**
   * Trigger a version event
   */
  async triggerVersionEvent(input: TriggerVersionEventInput): Promise<void> {
    const engine = getAutomationEngine();

    const event: TriggerEvent = {
      type: input.type,
      projectId: input.projectId,
      userId: input.user.id,
      user: input.user,
      trigger: {
        type: input.type,
        version: input.version,
      },
    };

    engine.processTrigger(event).catch((error) => {
      console.error(
        '[AutomationService] Error processing version event:',
        error,
      );
    });
  }

  /**
   * Trigger a comment event
   */
  async triggerCommentEvent(input: TriggerCommentEventInput): Promise<void> {
    const engine = getAutomationEngine();

    const event: TriggerEvent = {
      type: input.type,
      projectId: input.projectId,
      issueId: input.issue.id,
      userId: input.user.id,
      issue: input.issue,
      user: input.user,
      trigger: {
        type: input.type,
        comment: {
          id: input.comment.id,
          body: input.comment.body,
          author: {
            id: input.user.id,
            name: input.user.name,
            email: input.user.email,
          },
          createdAt: new Date(),
        },
      },
    };

    engine.processTrigger(event).catch((error) => {
      console.error(
        '[AutomationService] Error processing comment event:',
        error,
      );
    });
  }

  /**
   * Trigger a worklog event
   */
  async triggerWorklogEvent(input: TriggerWorklogEventInput): Promise<void> {
    const engine = getAutomationEngine();

    const event: TriggerEvent = {
      type: input.type,
      projectId: input.projectId,
      issueId: input.issue.id,
      userId: input.user.id,
      issue: input.issue,
      user: input.user,
      trigger: {
        type: input.type,
        worklog: {
          id: input.worklog.id,
          timeSpent: input.worklog.timeSpent,
          description: input.worklog.description,
          author: {
            id: input.user.id,
            name: input.user.name,
            email: input.user.email,
          },
        },
      },
    };

    engine.processTrigger(event).catch((error) => {
      console.error(
        '[AutomationService] Error processing worklog event:',
        error,
      );
    });
  }

  /**
   * Trigger from incoming webhook
   */
  async triggerFromWebhook(
    path: string,
    payload: unknown,
    headers: Record<string, string>,
  ): Promise<{ success: boolean; executionId?: string }> {
    const webhook = await automationWebhookRepository.findByPath(path);
    if (!webhook || !webhook.isActive) {
      return { success: false };
    }

    // Validate secret if configured
    if (webhook.secret) {
      // TODO: Implement HMAC validation
    }

    const rule = await automationRuleRepository.findById(webhook.ruleId);
    if (!rule || !rule.isEnabled) {
      return { success: false };
    }

    // Increment call count
    await automationWebhookRepository.incrementCallCount(webhook.id);

    // Execute rule
    const engine = getAutomationEngine();
    const event: TriggerEvent = {
      type: 'incoming_webhook',
      metadata: {
        payload,
        headers,
        webhookPath: path,
      },
    };

    const results = await engine.processTrigger(event);

    return {
      success: results.length > 0 && results.some((r) => r.success),
      executionId: results[0]?.executionId,
    };
  }

  // =========================================================================
  // EXECUTIONS
  // =========================================================================

  /**
   * Get execution by ID
   */
  async getExecution(id: string): Promise<AutomationExecution | null> {
    return automationExecutionRepository.findById(id);
  }

  /**
   * List executions for a rule
   */
  async listExecutions(
    ruleId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{ executions: AutomationExecution[]; total: number }> {
    return automationExecutionRepository.findByRule(ruleId, options);
  }

  /**
   * Get recent executions
   */
  async getRecentExecutions(
    projectId?: string,
    limit = 20,
  ): Promise<AutomationExecution[]> {
    return automationExecutionRepository.findRecent(projectId, limit);
  }

  /**
   * Get execution statistics
   */
  async getExecutionStatistics(
    ruleId?: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<{
    total: number;
    success: number;
    failed: number;
    avgDurationMs: number;
  }> {
    return automationExecutionRepository.getStatistics(
      ruleId,
      fromDate,
      toDate,
    );
  }

  /**
   * Get audit logs for execution
   */
  async getExecutionAuditLogs(executionId: string) {
    return automationAuditRepository.findByExecution(executionId);
  }

  // =========================================================================
  // SCHEDULED JOBS
  // =========================================================================

  /**
   * Process due scheduled jobs
   */
  async processDueJobs(): Promise<void> {
    const dueJobs = await automationScheduledJobRepository.findDueJobs();

    for (const job of dueJobs) {
      try {
        const rule = await automationRuleRepository.findById(job.ruleId);
        if (!rule || !rule.isEnabled) {
          continue;
        }

        // Execute the rule
        const engine = getAutomationEngine();
        const event: TriggerEvent = {
          type: rule.trigger.type as any,
          metadata: {
            scheduledJobId: job.id,
            cronExpression: job.cronExpression,
          },
        };

        // For scheduled_jql, execute JQL and trigger for each issue
        if (rule.trigger.type === 'scheduled_jql' && job.jqlFilter) {
          // TODO: Execute JQL and trigger for each issue
        } else {
          await engine.processTrigger(event);
        }

        // Calculate next run
        const nextRun = getNextCronDate(job.cronExpression, job.timezone);
        await automationScheduledJobRepository.updateAfterRun(job.id, nextRun);
      } catch (error) {
        console.error(
          `[AutomationService] Error processing scheduled job ${job.id}:`,
          error,
        );
      }
    }
  }

  // =========================================================================
  // CLEANUP
  // =========================================================================

  /**
   * Clean up old execution data
   */
  async cleanupOldData(retentionDays = 30): Promise<{
    deletedExecutions: number;
    deletedAuditLogs: number;
  }> {
    const [deletedExecutions, deletedAuditLogs] = await Promise.all([
      automationExecutionRepository.deleteOlderThan(retentionDays),
      automationAuditRepository.deleteOlderThan(retentionDays),
    ]);

    return { deletedExecutions, deletedAuditLogs };
  }

  // =========================================================================
  // PRIVATE HELPERS
  // =========================================================================

  private validateTrigger(trigger: AutomationTrigger): void {
    if (!trigger.type) {
      throw new Error('Trigger type is required');
    }

    // Validate scheduled triggers
    if (trigger.type === 'scheduled' || trigger.type === 'scheduled_jql') {
      const cronExpression = trigger.config?.cronExpression as string;
      if (!cronExpression) {
        throw new Error('Cron expression is required for scheduled triggers');
      }
      // Validate cron expression
      try {
        parseCronExpression(cronExpression);
      } catch {
        throw new Error('Invalid cron expression');
      }
    }

    // Validate webhook triggers
    if (trigger.type === 'incoming_webhook') {
      const path = trigger.config?.path as string;
      if (!path) {
        throw new Error('Webhook path is required');
      }
    }
  }

  private validateActions(actions: AutomationAction[]): void {
    if (!actions || actions.length === 0) {
      throw new Error('At least one action is required');
    }

    for (const action of actions) {
      if (!action.type) {
        throw new Error('Action type is required');
      }
    }
  }

  private async createScheduledJob(rule: AutomationRule): Promise<void> {
    const cronExpression = rule.trigger.config?.cronExpression as string;
    const timezone = (rule.trigger.config?.timezone as string) || 'UTC';
    const jqlFilter =
      rule.trigger.type === 'scheduled_jql'
        ? (rule.trigger.config?.jql as string)
        : undefined;

    const nextRunAt = getNextCronDate(cronExpression, timezone);

    await automationScheduledJobRepository.create({
      ruleId: rule.id,
      cronExpression,
      timezone,
      jqlFilter,
      isActive: rule.isEnabled,
      nextRunAt,
    });
  }

  private async createWebhookEndpoint(rule: AutomationRule): Promise<void> {
    const path =
      (rule.trigger.config?.path as string) || `/automation/webhook/${rule.id}`;
    const secret = rule.trigger.config?.secret as string | undefined;

    await automationWebhookRepository.create({
      ruleId: rule.id,
      path,
      secret,
      isActive: rule.isEnabled,
    });
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const automationService = new AutomationService();
