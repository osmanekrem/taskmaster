/**
 * Automation Service
 *
 * Business logic for managing automation rules.
 */

import crypto from 'crypto';
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

import { jqlService } from '@/services/jql-service';
import { issueRepository } from '@/repositories/issue-repository';

// ============================================================================
// HMAC Validation
// ============================================================================

/**
 * Validate HMAC signature for incoming webhook
 * Supports multiple signature header formats:
 * - X-Hub-Signature-256: sha256=<signature> (GitHub style)
 * - X-Signature: <signature>
 * - X-Webhook-Signature: <signature>
 */
function validateWebhookSignature(
  payload: unknown,
  secret: string,
  headers: Record<string, string>
): { valid: boolean; error?: string } {
  // Get signature from headers (case-insensitive)
  const headerKeys = Object.keys(headers);
  const signatureHeader = headerKeys.find(
    (k) =>
      k.toLowerCase() === 'x-hub-signature-256' ||
      k.toLowerCase() === 'x-signature' ||
      k.toLowerCase() === 'x-webhook-signature'
  );

  if (!signatureHeader) {
    return { valid: false, error: 'Missing signature header' };
  }

  const receivedSignature = headers[signatureHeader];
  if (!receivedSignature) {
    return { valid: false, error: 'Empty signature header' };
  }

  // Parse signature (handle "sha256=<sig>" format)
  let signature = receivedSignature;
  let algorithm = 'sha256';

  if (receivedSignature.includes('=')) {
    const [algo, sig] = receivedSignature.split('=');
    algorithm = algo;
    signature = sig;
  }

  // Calculate expected signature
  const payloadString = typeof payload === 'string' 
    ? payload 
    : JSON.stringify(payload);
  
  const hmac = crypto.createHmac(algorithm, secret);
  hmac.update(payloadString);
  const expectedSignature = hmac.digest('hex');

  // Constant-time comparison to prevent timing attacks
  const valid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  return { valid, error: valid ? undefined : 'Invalid signature' };
}

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
  ): Promise<{ success: boolean; executionId?: string; error?: string }> {
    const webhook = await automationWebhookRepository.findByPath(path);
    if (!webhook || !webhook.isActive) {
      return { success: false, error: 'Webhook not found or inactive' };
    }

    // Validate HMAC signature if secret is configured
    if (webhook.secret) {
      const validation = validateWebhookSignature(payload, webhook.secret, headers);
      if (!validation.valid) {
        console.warn(`[Webhook] HMAC validation failed for path ${path}: ${validation.error}`);
        return { success: false, error: validation.error };
      }
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

  /**
   * Manually trigger an automation rule
   * @param ruleId - The rule to trigger
   * @param issueId - Optional issue ID to run the rule against
   * @param userId - The user triggering the rule
   */
  async triggerManually(
    ruleId: string,
    userId: string,
    issueId?: string,
  ): Promise<{ success: boolean; executionId?: string; error?: string }> {
    const rule = await automationRuleRepository.findById(ruleId);
    
    if (!rule) {
      return { success: false, error: 'Rule not found' };
    }

    if (rule.trigger.type !== 'manual') {
      return { success: false, error: 'Rule does not have a manual trigger' };
    }

    if (!rule.isEnabled) {
      return { success: false, error: 'Rule is disabled' };
    }

    const engine = getAutomationEngine();

    // Build the trigger event
    let event: TriggerEvent = {
      type: 'manual',
      userId,
      metadata: {
        triggeredBy: userId,
        triggeredAt: new Date().toISOString(),
      },
    };

    // If issue ID is provided, fetch the issue and include in context
    if (issueId) {
      const issue = await issueRepository.findById(issueId);
      
      if (!issue) {
        return { success: false, error: 'Issue not found' };
      }

      event = {
        ...event,
        projectId: issue.projectId,
        issueId: issue.id,
        issue: {
          id: issue.id,
          issueKey: issue.key,
          summary: issue.summary || '',
          description: issue.description,
          status: issue.status
            ? { id: issue.status.id, name: issue.status.name, category: issue.status.category || 'TODO' }
            : undefined,
          priority: issue.priority
            ? { id: issue.priority, name: issue.priority }
            : undefined,
          issueType: issue.issueType
            ? { id: issue.issueType.id, name: issue.issueType.name, iconUrl: issue.issueType.icon || undefined }
            : undefined,
          assignee: issue.assignee
            ? { id: issue.assignee.id, name: issue.assignee.name || '', email: issue.assignee.email }
            : null,
          reporter: issue.reporter
            ? { id: issue.reporter.id, name: issue.reporter.name || '', email: issue.reporter.email }
            : undefined,
          project: issue.project
            ? { id: issue.project.id, key: issue.project.key, name: issue.project.name }
            : undefined,
          createdAt: issue.createdAt,
          updatedAt: issue.updatedAt,
          dueDate: issue.dueDate,
        },
        trigger: {
          type: 'manual',
          issueKey: issue.key,
        },
      };
    }

    try {
      const results = await engine.processTrigger(event);
      
      return {
        success: results.length > 0 && results.some((r) => r.success),
        executionId: results[0]?.executionId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[AutomationService] Error executing manual trigger:`, error);
      return { success: false, error: errorMessage };
    }
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

        // For scheduled_jql, execute JQL and trigger for each matching issue
        if (rule.trigger.type === 'scheduled_jql' && job.jqlFilter) {
          await this.processScheduledJql(engine, rule, job);
        } else {
          // Regular scheduled trigger - no issue context
          const event: TriggerEvent = {
            type: rule.trigger.type as any,
            metadata: {
              scheduledJobId: job.id,
              cronExpression: job.cronExpression,
            },
          };
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

  /**
   * Process scheduled_jql trigger - executes JQL and triggers for each matching issue
   */
  private async processScheduledJql(
    engine: ReturnType<typeof getAutomationEngine>,
    rule: AutomationRule,
    job: { id: string; jqlFilter: string | null; cronExpression: string },
  ): Promise<void> {
    if (!job.jqlFilter) {
      console.warn(`[AutomationService] scheduled_jql job ${job.id} has no JQL filter`);
      return;
    }

    try {
      // Execute JQL to get matching issues
      const result = await jqlService.executeSearch(job.jqlFilter, {
        userId: null, // Scheduled jobs run as system
        limit: 1000, // Process up to 1000 issues per scheduled run
      });

      console.log(
        `[AutomationService] scheduled_jql job ${job.id} found ${result.total} matching issues`,
      );

      // Trigger automation for each matching issue
      for (const issue of result.items) {
        const event: TriggerEvent = {
          type: 'scheduled_jql',
          projectId: issue.projectId,
          issueId: issue.id,
          issue: {
            id: issue.id,
            issueKey: issue.key,
            summary: issue.summary,
            description: issue.description,
            status: {
              id: issue.statusId,
              name: issue.statusName,
              category: issue.statusCategory,
            },
            priority: issue.priority ? { id: issue.priority, name: issue.priority } : undefined,
            issueType: {
              id: issue.issueTypeId,
              name: issue.issueTypeName,
              iconUrl: issue.issueTypeIcon || undefined,
            },
            assignee: issue.assigneeId
              ? { id: issue.assigneeId, name: issue.assigneeName || '', email: '' }
              : null,
            reporter: { id: issue.reporterId, name: issue.reporterName || '', email: '' },
            project: { id: issue.projectId, key: issue.projectKey, name: issue.projectName },
            createdAt: issue.createdAt,
            updatedAt: issue.updatedAt,
            dueDate: issue.dueDate,
          },
          trigger: {
            type: 'scheduled_jql',
            jql: job.jqlFilter,
          },
          metadata: {
            scheduledJobId: job.id,
            cronExpression: job.cronExpression,
            jqlFilter: job.jqlFilter,
          },
        };

        // Process each issue - don't fail on individual issues
        try {
          await engine.processTrigger(event);
        } catch (issueError) {
          console.error(
            `[AutomationService] Error processing scheduled_jql for issue ${issue.key}:`,
            issueError,
          );
        }
      }
    } catch (error) {
      console.error(
        `[AutomationService] Error executing JQL for scheduled job ${job.id}:`,
        error,
      );
      throw error;
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
