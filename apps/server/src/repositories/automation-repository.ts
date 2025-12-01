import {
  and,
  eq,
  desc,
  asc,
  sql,
  inArray,
  isNull,
  or,
  lte,
  gte,
  count,
} from 'drizzle-orm';
import { db } from '@/db';
import {
  automationRules,
  automationExecutions,
  automationAudit,
  automationScheduledJobs,
  automationWebhooks,
  type AutomationRule,
  type NewAutomationRule,
  type AutomationExecution,
  type NewAutomationExecution,
  type AutomationAuditLog,
  type NewAutomationAuditLog,
  type AutomationScheduledJob,
  type NewAutomationScheduledJob,
  type AutomationWebhook,
  type NewAutomationWebhook,
  type AutomationTrigger,
  automationTriggerTypeEnum,
} from '@/db/schema/automation';

// ============================================================================
// AUTOMATION RULES
// ============================================================================

export class AutomationRuleRepository {
  /**
   * Create a new automation rule
   */
  async create(data: NewAutomationRule): Promise<AutomationRule> {
    const [rule] = await db.insert(automationRules).values(data).returning();
    return rule;
  }

  /**
   * Find rule by ID
   */
  async findById(id: string): Promise<AutomationRule | null> {
    const [rule] = await db
      .select()
      .from(automationRules)
      .where(eq(automationRules.id, id))
      .limit(1);
    return rule || null;
  }

  /**
   * Find rules by project
   */
  async findByProject(
    projectId: string,
    options?: {
      enabledOnly?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ rules: AutomationRule[]; total: number }> {
    const conditions = [eq(automationRules.projectId, projectId)];

    if (options?.enabledOnly) {
      conditions.push(eq(automationRules.isEnabled, true));
    }

    const [rules, [{ total }]] = await Promise.all([
      db
        .select()
        .from(automationRules)
        .where(and(...conditions))
        .orderBy(asc(automationRules.priority), desc(automationRules.createdAt))
        .limit(options?.limit ?? 50)
        .offset(options?.offset ?? 0),
      db
        .select({ total: count() })
        .from(automationRules)
        .where(and(...conditions)),
    ]);

    return { rules, total };
  }

  /**
   * Find global rules
   */
  async findGlobalRules(enabledOnly = true): Promise<AutomationRule[]> {
    const conditions = [eq(automationRules.isGlobal, true)];

    if (enabledOnly) {
      conditions.push(eq(automationRules.isEnabled, true));
    }

    return db
      .select()
      .from(automationRules)
      .where(and(...conditions))
      .orderBy(asc(automationRules.priority));
  }

  /**
   * Find rules by trigger type
   */
  async findByTriggerType(
    triggerType: (typeof automationTriggerTypeEnum.enumValues)[number],
    projectId?: string,
  ): Promise<AutomationRule[]> {
    // Use raw SQL for JSONB query
    const triggerTypeCondition = sql`${automationRules.trigger}->>'type' = ${triggerType}`;

    const conditions = [
      triggerTypeCondition,
      eq(automationRules.isEnabled, true),
    ];

    if (projectId) {
      conditions.push(
        or(
          eq(automationRules.projectId, projectId),
          eq(automationRules.isGlobal, true),
        )!,
      );
    } else {
      conditions.push(eq(automationRules.isGlobal, true));
    }

    return db
      .select()
      .from(automationRules)
      .where(and(...conditions))
      .orderBy(asc(automationRules.priority));
  }

  /**
   * Update a rule
   */
  async update(
    id: string,
    data: Partial<Omit<NewAutomationRule, 'id' | 'createdAt' | 'createdBy'>>,
  ): Promise<AutomationRule | null> {
    const [rule] = await db
      .update(automationRules)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(automationRules.id, id))
      .returning();
    return rule || null;
  }

  /**
   * Delete a rule
   */
  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(automationRules)
      .where(eq(automationRules.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Toggle rule enabled status
   */
  async toggleEnabled(
    id: string,
    enabled: boolean,
  ): Promise<AutomationRule | null> {
    return this.update(id, { isEnabled: enabled });
  }

  /**
   * Increment execution count
   */
  async incrementExecutionCount(id: string, success: boolean): Promise<void> {
    const updateData: Record<string, unknown> = {
      executionCount: sql`${automationRules.executionCount} + 1`,
      lastExecutedAt: new Date(),
      updatedAt: new Date(),
    };

    if (success) {
      updateData.successCount = sql`${automationRules.successCount} + 1`;
    } else {
      updateData.failureCount = sql`${automationRules.failureCount} + 1`;
      updateData.lastErrorAt = new Date();
    }

    await db
      .update(automationRules)
      .set(updateData)
      .where(eq(automationRules.id, id));
  }

  /**
   * Check and update rate limit
   */
  async checkRateLimit(id: string): Promise<boolean> {
    const [rule] = await db
      .select({
        rateLimitPerHour: automationRules.rateLimitPerHour,
        executionsThisHour: automationRules.executionsThisHour,
        hourResetAt: automationRules.hourResetAt,
      })
      .from(automationRules)
      .where(eq(automationRules.id, id))
      .limit(1);

    if (!rule) return false;

    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Reset counter if hour has passed
    if (!rule.hourResetAt || rule.hourResetAt < hourAgo) {
      await db
        .update(automationRules)
        .set({
          executionsThisHour: 1,
          hourResetAt: now,
        })
        .where(eq(automationRules.id, id));
      return true;
    }

    // Check if under limit
    if ((rule.executionsThisHour || 0) < (rule.rateLimitPerHour || 1000)) {
      await db
        .update(automationRules)
        .set({
          executionsThisHour: sql`${automationRules.executionsThisHour} + 1`,
        })
        .where(eq(automationRules.id, id));
      return true;
    }

    return false;
  }
}

// ============================================================================
// AUTOMATION EXECUTIONS
// ============================================================================

export class AutomationExecutionRepository {
  /**
   * Create a new execution record
   */
  async create(data: NewAutomationExecution): Promise<AutomationExecution> {
    const [execution] = await db
      .insert(automationExecutions)
      .values(data)
      .returning();
    return execution;
  }

  /**
   * Find execution by ID
   */
  async findById(id: string): Promise<AutomationExecution | null> {
    const [execution] = await db
      .select()
      .from(automationExecutions)
      .where(eq(automationExecutions.id, id))
      .limit(1);
    return execution || null;
  }

  /**
   * Find executions by rule
   */
  async findByRule(
    ruleId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: (typeof automationExecutions.$inferSelect)['status'];
    },
  ): Promise<{ executions: AutomationExecution[]; total: number }> {
    const conditions = [eq(automationExecutions.ruleId, ruleId)];

    if (options?.status) {
      conditions.push(eq(automationExecutions.status, options.status));
    }

    const [executions, [{ total }]] = await Promise.all([
      db
        .select()
        .from(automationExecutions)
        .where(and(...conditions))
        .orderBy(desc(automationExecutions.createdAt))
        .limit(options?.limit ?? 50)
        .offset(options?.offset ?? 0),
      db
        .select({ total: count() })
        .from(automationExecutions)
        .where(and(...conditions)),
    ]);

    return { executions, total };
  }

  /**
   * Find recent executions
   */
  async findRecent(
    projectId?: string,
    limit = 20,
  ): Promise<AutomationExecution[]> {
    if (projectId) {
      // Need to join with rules to filter by project
      const rules = await db
        .select({ id: automationRules.id })
        .from(automationRules)
        .where(eq(automationRules.projectId, projectId));

      const ruleIds = rules.map((r) => r.id);
      if (ruleIds.length === 0) return [];

      return db
        .select()
        .from(automationExecutions)
        .where(inArray(automationExecutions.ruleId, ruleIds))
        .orderBy(desc(automationExecutions.createdAt))
        .limit(limit);
    }

    return db
      .select()
      .from(automationExecutions)
      .orderBy(desc(automationExecutions.createdAt))
      .limit(limit);
  }

  /**
   * Update execution status
   */
  async updateStatus(
    id: string,
    status: (typeof automationExecutions.$inferSelect)['status'],
    updates?: Partial<
      Pick<
        AutomationExecution,
        | 'completedAt'
        | 'durationMs'
        | 'errorMessage'
        | 'errorStack'
        | 'failedAtStep'
        | 'executedActions'
        | 'affectedIssues'
        | 'totalActionsCount'
        | 'successActionsCount'
        | 'failedActionsCount'
      >
    >,
  ): Promise<AutomationExecution | null> {
    const [execution] = await db
      .update(automationExecutions)
      .set({
        status,
        ...updates,
      })
      .where(eq(automationExecutions.id, id))
      .returning();
    return execution || null;
  }

  /**
   * Delete old executions (cleanup)
   */
  async deleteOlderThan(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await db
      .delete(automationExecutions)
      .where(lte(automationExecutions.createdAt, cutoffDate));

    return result.rowCount ?? 0;
  }

  /**
   * Get execution statistics
   */
  async getStatistics(
    ruleId?: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<{
    total: number;
    success: number;
    failed: number;
    avgDurationMs: number;
  }> {
    const conditions = [];

    if (ruleId) {
      conditions.push(eq(automationExecutions.ruleId, ruleId));
    }
    if (fromDate) {
      conditions.push(gte(automationExecutions.createdAt, fromDate));
    }
    if (toDate) {
      conditions.push(lte(automationExecutions.createdAt, toDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [result] = await db
      .select({
        total: count(),
        success: sql<number>`COUNT(*) FILTER (WHERE ${automationExecutions.status} = 'success')`,
        failed: sql<number>`COUNT(*) FILTER (WHERE ${automationExecutions.status} = 'failed')`,
        avgDurationMs: sql<number>`AVG(${automationExecutions.durationMs})`,
      })
      .from(automationExecutions)
      .where(whereClause);

    return {
      total: result.total || 0,
      success: Number(result.success) || 0,
      failed: Number(result.failed) || 0,
      avgDurationMs: Math.round(Number(result.avgDurationMs) || 0),
    };
  }
}

// ============================================================================
// AUTOMATION AUDIT
// ============================================================================

export class AutomationAuditRepository {
  /**
   * Create audit log entry
   */
  async create(data: NewAutomationAuditLog): Promise<AutomationAuditLog> {
    const [audit] = await db.insert(automationAudit).values(data).returning();
    return audit;
  }

  /**
   * Create multiple audit entries
   */
  async createMany(
    data: NewAutomationAuditLog[],
  ): Promise<AutomationAuditLog[]> {
    if (data.length === 0) return [];
    return db.insert(automationAudit).values(data).returning();
  }

  /**
   * Find audit logs by execution
   */
  async findByExecution(executionId: string): Promise<AutomationAuditLog[]> {
    return db
      .select()
      .from(automationAudit)
      .where(eq(automationAudit.executionId, executionId))
      .orderBy(asc(automationAudit.stepIndex));
  }

  /**
   * Delete old audit logs
   */
  async deleteOlderThan(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await db
      .delete(automationAudit)
      .where(lte(automationAudit.createdAt, cutoffDate));

    return result.rowCount ?? 0;
  }
}

// ============================================================================
// AUTOMATION SCHEDULED JOBS
// ============================================================================

export class AutomationScheduledJobRepository {
  /**
   * Create scheduled job
   */
  async create(
    data: NewAutomationScheduledJob,
  ): Promise<AutomationScheduledJob> {
    const [job] = await db
      .insert(automationScheduledJobs)
      .values(data)
      .returning();
    return job;
  }

  /**
   * Find job by rule ID
   */
  async findByRuleId(ruleId: string): Promise<AutomationScheduledJob | null> {
    const [job] = await db
      .select()
      .from(automationScheduledJobs)
      .where(eq(automationScheduledJobs.ruleId, ruleId))
      .limit(1);
    return job || null;
  }

  /**
   * Find due jobs
   */
  async findDueJobs(): Promise<AutomationScheduledJob[]> {
    const now = new Date();

    return db
      .select()
      .from(automationScheduledJobs)
      .where(
        and(
          eq(automationScheduledJobs.isActive, true),
          or(
            isNull(automationScheduledJobs.nextRunAt),
            lte(automationScheduledJobs.nextRunAt, now),
          ),
        ),
      );
  }

  /**
   * Update job after run
   */
  async updateAfterRun(
    id: string,
    nextRunAt: Date,
  ): Promise<AutomationScheduledJob | null> {
    const [job] = await db
      .update(automationScheduledJobs)
      .set({
        lastRunAt: new Date(),
        nextRunAt,
        updatedAt: new Date(),
      })
      .where(eq(automationScheduledJobs.id, id))
      .returning();
    return job || null;
  }

  /**
   * Toggle job active status
   */
  async toggleActive(
    id: string,
    isActive: boolean,
  ): Promise<AutomationScheduledJob | null> {
    const [job] = await db
      .update(automationScheduledJobs)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(automationScheduledJobs.id, id))
      .returning();
    return job || null;
  }

  /**
   * Delete job by rule ID
   */
  async deleteByRuleId(ruleId: string): Promise<boolean> {
    const result = await db
      .delete(automationScheduledJobs)
      .where(eq(automationScheduledJobs.ruleId, ruleId));
    return (result.rowCount ?? 0) > 0;
  }
}

// ============================================================================
// AUTOMATION WEBHOOKS
// ============================================================================

export class AutomationWebhookRepository {
  /**
   * Create webhook
   */
  async create(data: NewAutomationWebhook): Promise<AutomationWebhook> {
    const [webhook] = await db
      .insert(automationWebhooks)
      .values(data)
      .returning();
    return webhook;
  }

  /**
   * Find webhook by path
   */
  async findByPath(path: string): Promise<AutomationWebhook | null> {
    const [webhook] = await db
      .select()
      .from(automationWebhooks)
      .where(eq(automationWebhooks.path, path))
      .limit(1);
    return webhook || null;
  }

  /**
   * Find webhook by rule ID
   */
  async findByRuleId(ruleId: string): Promise<AutomationWebhook | null> {
    const [webhook] = await db
      .select()
      .from(automationWebhooks)
      .where(eq(automationWebhooks.ruleId, ruleId))
      .limit(1);
    return webhook || null;
  }

  /**
   * Update webhook call count
   */
  async incrementCallCount(id: string): Promise<void> {
    await db
      .update(automationWebhooks)
      .set({
        callCount: sql`${automationWebhooks.callCount} + 1`,
        lastCalledAt: new Date(),
      })
      .where(eq(automationWebhooks.id, id));
  }

  /**
   * Delete webhook by rule ID
   */
  async deleteByRuleId(ruleId: string): Promise<boolean> {
    const result = await db
      .delete(automationWebhooks)
      .where(eq(automationWebhooks.ruleId, ruleId));
    return (result.rowCount ?? 0) > 0;
  }
}

// ============================================================================
// SINGLETON EXPORTS
// ============================================================================

export const automationRuleRepository = new AutomationRuleRepository();
export const automationExecutionRepository =
  new AutomationExecutionRepository();
export const automationAuditRepository = new AutomationAuditRepository();
export const automationScheduledJobRepository =
  new AutomationScheduledJobRepository();
export const automationWebhookRepository = new AutomationWebhookRepository();
