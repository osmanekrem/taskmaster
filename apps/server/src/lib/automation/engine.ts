/**
 * Automation Engine
 *
 * Core execution engine for automation rules.
 * Handles trigger matching, condition evaluation, and action execution.
 */

import {
  automationRuleRepository,
  automationExecutionRepository,
  automationAuditRepository,
} from '@/repositories/automation-repository';
import type {
  AutomationRule,
  AutomationTrigger,
  AutomationCondition,
  AutomationAction,
  ExecutedAction,
  automationTriggerTypeEnum,
} from '@/db/schema/automation';
import {
  evaluateConditions,
  type ConditionEvaluatorContext,
} from './conditions';
import {
  executeActions,
  type ActionExecutorContext,
  type ActionServices,
} from './actions';
import {
  buildIssueContext,
  buildUserContext,
  type SmartValueContext,
  type IssueContext,
  type UserContext,
  type TriggerContext,
  type ChangelogContext,
} from './smart-values';

// ============================================================================
// TYPES
// ============================================================================

export type TriggerType = (typeof automationTriggerTypeEnum.enumValues)[number];

export interface TriggerEvent {
  type: TriggerType;
  projectId?: string;
  issueId?: string;
  userId?: string;
  issue?: IssueData;
  user?: UserData;
  trigger?: TriggerContext;
  changelog?: ChangelogContext;
  metadata?: Record<string, unknown>;
}

export interface IssueData {
  id: string;
  issueKey: string;
  summary: string;
  description?: string | null;
  status?: { id: string; name: string; category: string };
  priority?: { id: string; name: string };
  issueType?: { id: string; name: string; iconUrl?: string };
  assignee?: { id: string; name: string; email: string } | null;
  reporter?: { id: string; name: string; email: string } | null;
  project?: { id: string; key: string; name: string };
  labels?: Array<{ name: string }>;
  components?: Array<{ id: string; name: string }>;
  fixVersions?: Array<{ id: string; name: string }>;
  affectedVersions?: Array<{ id: string; name: string }>;
  fieldValues?: Array<{ fieldId: string; value: unknown }>;
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date | null;
  parent?: IssueData | null;
  subtasks?: IssueData[];
  sprint?: { id: string; name: string };
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

export interface AutomationEngineConfig {
  services: ActionServices;
  maxConcurrentExecutions?: number;
  executionTimeoutMs?: number;
}

export interface ExecutionResult {
  executionId: string;
  ruleId: string;
  success: boolean;
  status: 'success' | 'partial_success' | 'failed' | 'cancelled' | 'timed_out';
  durationMs: number;
  executedActions: ExecutedAction[];
  affectedIssues: string[];
  error?: string;
}

// ============================================================================
// ENGINE
// ============================================================================

export class AutomationEngine {
  private services: ActionServices;
  private maxConcurrentExecutions: number;
  private executionTimeoutMs: number;
  private activeExecutions = 0;

  constructor(config: AutomationEngineConfig) {
    this.services = config.services;
    this.maxConcurrentExecutions = config.maxConcurrentExecutions ?? 10;
    this.executionTimeoutMs = config.executionTimeoutMs ?? 60000; // 1 minute
  }

  /**
   * Process a trigger event
   * Finds matching rules and executes them
   */
  async processTrigger(event: TriggerEvent): Promise<ExecutionResult[]> {
    // Find matching rules
    const rules = await automationRuleRepository.findByTriggerType(
      event.type,
      event.projectId,
    );

    if (rules.length === 0) {
      return [];
    }

    // Execute matching rules
    const results: ExecutionResult[] = [];

    for (const rule of rules) {
      // Check if trigger matches rule's trigger config
      if (!this.matchesTrigger(rule.trigger, event)) {
        continue;
      }

      // Check rate limit
      const withinLimit = await automationRuleRepository.checkRateLimit(
        rule.id,
      );
      if (!withinLimit) {
        console.warn(`[Automation] Rate limit exceeded for rule ${rule.id}`);
        continue;
      }

      // Check concurrent execution limit
      if (this.activeExecutions >= this.maxConcurrentExecutions) {
        console.warn(`[Automation] Max concurrent executions reached`);
        break;
      }

      // Execute rule
      try {
        const result = await this.executeRule(rule, event);
        results.push(result);
      } catch (error) {
        console.error(`[Automation] Error executing rule ${rule.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Execute a single automation rule
   */
  async executeRule(
    rule: AutomationRule,
    event: TriggerEvent,
  ): Promise<ExecutionResult> {
    this.activeExecutions++;
    const startTime = Date.now();

    // Create execution record
    const execution = await automationExecutionRepository.create({
      ruleId: rule.id,
      triggerType: event.type,
      triggerIssueId: event.issueId,
      triggerUserId: event.userId,
      triggerData: event.metadata,
      status: 'running',
      startedAt: new Date(),
    });

    try {
      // Build context
      const context = this.buildContext(event, execution.id);

      // Evaluate conditions
      const conditionResult = evaluateConditions(
        rule.conditions || [],
        context,
      );

      // Log condition evaluation
      await this.logStep(execution.id, 0, 'condition', 'Evaluate conditions', {
        inputData: rule.conditions,
        result: conditionResult,
      });

      if (!conditionResult.matched) {
        // Conditions not met - mark as success but no actions taken
        await automationExecutionRepository.updateStatus(
          execution.id,
          'success',
          {
            completedAt: new Date(),
            durationMs: Date.now() - startTime,
            totalActionsCount: 0,
            successActionsCount: 0,
            failedActionsCount: 0,
          },
        );

        await automationRuleRepository.incrementExecutionCount(rule.id, true);
        this.activeExecutions--;

        return {
          executionId: execution.id,
          ruleId: rule.id,
          success: true,
          status: 'success',
          durationMs: Date.now() - startTime,
          executedActions: [],
          affectedIssues: [],
        };
      }

      // Execute actions with timeout
      const actionContext: ActionExecutorContext = {
        ...context,
        services: this.services,
        executionId: execution.id,
        stepIndex: 1,
        executedActions: [],
        affectedIssues: new Set(),
      };

      const actionResult = await Promise.race([
        executeActions(rule.actions, actionContext),
        new Promise<{ success: false; error: string }>((_, reject) =>
          setTimeout(
            () => reject(new Error('Execution timeout')),
            this.executionTimeoutMs,
          ),
        ),
      ]);

      // Determine final status
      const hasFailures = actionContext.executedActions.some(
        (a) => a.status === 'failed',
      );
      const hasSuccesses = actionContext.executedActions.some(
        (a) => a.status === 'success',
      );

      let status: ExecutionResult['status'];
      if (!actionResult.success) {
        status = 'failed';
      } else if (hasFailures && hasSuccesses) {
        status = 'partial_success';
      } else if (hasFailures) {
        status = 'failed';
      } else {
        status = 'success';
      }

      // Update execution record
      await automationExecutionRepository.updateStatus(execution.id, status, {
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
        executedActions: actionContext.executedActions,
        affectedIssues: Array.from(actionContext.affectedIssues),
        totalActionsCount: actionContext.executedActions.length,
        successActionsCount: actionContext.executedActions.filter(
          (a) => a.status === 'success',
        ).length,
        failedActionsCount: actionContext.executedActions.filter(
          (a) => a.status === 'failed',
        ).length,
        errorMessage: actionResult.error,
      });

      // Update rule stats
      await automationRuleRepository.incrementExecutionCount(
        rule.id,
        status === 'success' || status === 'partial_success',
      );

      this.activeExecutions--;

      return {
        executionId: execution.id,
        ruleId: rule.id,
        success: status === 'success' || status === 'partial_success',
        status,
        durationMs: Date.now() - startTime,
        executedActions: actionContext.executedActions,
        affectedIssues: Array.from(actionContext.affectedIssues),
        error: actionResult.error,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isTimeout = errorMessage === 'Execution timeout';

      await automationExecutionRepository.updateStatus(
        execution.id,
        isTimeout ? 'timed_out' : 'failed',
        {
          completedAt: new Date(),
          durationMs: Date.now() - startTime,
          errorMessage,
          errorStack: error instanceof Error ? error.stack : undefined,
        },
      );

      await automationRuleRepository.incrementExecutionCount(rule.id, false);
      this.activeExecutions--;

      return {
        executionId: execution.id,
        ruleId: rule.id,
        success: false,
        status: isTimeout ? 'timed_out' : 'failed',
        durationMs: Date.now() - startTime,
        executedActions: [],
        affectedIssues: [],
        error: errorMessage,
      };
    }
  }

  /**
   * Check if event matches trigger configuration
   */
  private matchesTrigger(
    trigger: AutomationTrigger,
    event: TriggerEvent,
  ): boolean {
    if (trigger.type !== event.type) {
      return false;
    }

    const config = trigger.config || {};

    // Type-specific matching
    switch (trigger.type) {
      case 'issue_created':
      case 'issue_deleted':
        // Optional: filter by issue types
        if (config.issueTypeIds && Array.isArray(config.issueTypeIds)) {
          const issueTypeId = event.issue?.issueType?.id;
          if (issueTypeId && !config.issueTypeIds.includes(issueTypeId)) {
            return false;
          }
        }
        break;

      case 'issue_updated':
        // Optional: filter by specific fields
        if (config.fields && Array.isArray(config.fields)) {
          const changedField = event.changelog?.fieldName;
          if (changedField && !config.fields.includes(changedField)) {
            return false;
          }
        }
        break;

      case 'issue_transitioned':
        // Optional: filter by from/to status
        if (
          config.fromStatusId &&
          event.changelog?.oldValue !== config.fromStatusId
        ) {
          return false;
        }
        if (
          config.toStatusId &&
          event.changelog?.newValue !== config.toStatusId
        ) {
          return false;
        }
        break;

      case 'field_changed':
        // Required: must match field ID
        if (config.fieldId) {
          const changedField =
            event.changelog?.fieldId || event.changelog?.fieldName;
          if (changedField !== config.fieldId) {
            return false;
          }
        }
        break;

      case 'field_value_set':
      case 'field_value_cleared':
        if (config.fieldId) {
          const changedField =
            event.changelog?.fieldId || event.changelog?.fieldName;
          if (changedField !== config.fieldId) {
            return false;
          }
        }
        break;
    }

    return true;
  }

  /**
   * Build evaluation context from event
   */
  private buildContext(
    event: TriggerEvent,
    executionId: string,
  ): ConditionEvaluatorContext {
    let issueContext: IssueContext | undefined;
    let userContext: UserContext | undefined;

    if (event.issue) {
      issueContext = buildIssueContext(event.issue as any);
    }

    if (event.user) {
      userContext = buildUserContext(event.user);
    }

    return {
      issue: issueContext,
      triggerUser: userContext,
      trigger: event.trigger,
      changelog: event.changelog,
      now: new Date(),
      projectId: event.projectId,
      userId: event.userId,
      variables: {},
    };
  }

  /**
   * Log an execution step
   */
  private async logStep(
    executionId: string,
    stepIndex: number,
    stepType: string,
    stepName: string,
    data: { inputData?: unknown; outputData?: unknown; result?: unknown },
  ): Promise<void> {
    await automationAuditRepository.create({
      executionId,
      stepIndex,
      stepType,
      stepName,
      inputData: data.inputData as Record<string, unknown>,
      outputData: (data.outputData || data.result) as Record<string, unknown>,
      status: 'success',
    });
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let engineInstance: AutomationEngine | null = null;

export function initializeAutomationEngine(
  config: AutomationEngineConfig,
): AutomationEngine {
  engineInstance = new AutomationEngine(config);
  return engineInstance;
}

export function getAutomationEngine(): AutomationEngine {
  if (!engineInstance) {
    throw new Error(
      'Automation engine not initialized. Call initializeAutomationEngine first.',
    );
  }
  return engineInstance;
}
