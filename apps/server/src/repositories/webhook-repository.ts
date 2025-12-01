import {
  webhooks,
  webhookDeliveries,
  type Webhook,
  type NewWebhook,
  type WebhookDelivery,
  type NewWebhookDelivery,
  type WebhookEvent,
  type WebhookDeliveryStatus,
  WEBHOOK_AUTO_DISABLE_THRESHOLD,
} from '@/db/schema/webhooks';
import { db } from '@/db';
import { eq, and, desc, sql, gte, lte, inArray, or, isNull } from 'drizzle-orm';
import type { DrizzleClientOrTransaction } from '@/lib/types/db';

// =============================================================================
// WEBHOOK REPOSITORY
// =============================================================================

export const webhookRepository = (
  drizzle: DrizzleClientOrTransaction = db,
) => ({
  // ---------------------------------------------------------------------------
  // WEBHOOKS CRUD
  // ---------------------------------------------------------------------------

  /**
   * Find all webhooks for a project (including global ones)
   */
  findByProject: (projectId: string) =>
    drizzle.query.webhooks.findMany({
      where: or(eq(webhooks.projectId, projectId), isNull(webhooks.projectId)),
      orderBy: [desc(webhooks.createdAt)],
      with: {
        createdBy: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),

  /**
   * Find all global webhooks
   */
  findGlobal: () =>
    drizzle.query.webhooks.findMany({
      where: isNull(webhooks.projectId),
      orderBy: [desc(webhooks.createdAt)],
      with: {
        createdBy: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),

  /**
   * Find all webhooks
   */
  findAll: (options?: { limit?: number; offset?: number }) =>
    drizzle.query.webhooks.findMany({
      orderBy: [desc(webhooks.createdAt)],
      limit: options?.limit,
      offset: options?.offset,
      with: {
        project: {
          columns: {
            id: true,
            key: true,
            name: true,
          },
        },
        createdBy: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),

  /**
   * Find webhook by ID
   */
  findById: async (id: string): Promise<Webhook | null> => {
    const result = await drizzle.query.webhooks.findFirst({
      where: eq(webhooks.id, id),
      with: {
        project: {
          columns: {
            id: true,
            key: true,
            name: true,
          },
        },
        createdBy: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    return result ?? null;
  },

  /**
   * Find webhooks subscribed to a specific event
   */
  findByEvent: async (
    event: WebhookEvent,
    projectId?: string,
  ): Promise<Webhook[]> => {
    // Find webhooks where events array contains this event
    const conditions = [
      eq(webhooks.isActive, true),
      sql`${webhooks.events} @> ${JSON.stringify([event])}::jsonb`,
    ];

    // Include global webhooks and project-specific ones
    if (projectId) {
      conditions.push(
        or(eq(webhooks.projectId, projectId), isNull(webhooks.projectId))!,
      );
    } else {
      // Only global webhooks if no project specified
      conditions.push(isNull(webhooks.projectId));
    }

    const result = await drizzle.query.webhooks.findMany({
      where: and(...conditions),
    });

    return result;
  },

  /**
   * Create a new webhook
   */
  create: async (data: NewWebhook): Promise<Webhook> => {
    const [result] = await drizzle.insert(webhooks).values(data).returning();
    return result;
  },

  /**
   * Update a webhook
   */
  update: async (
    id: string,
    data: Partial<Omit<Webhook, 'id' | 'createdAt'>>,
  ): Promise<Webhook> => {
    const [result] = await drizzle
      .update(webhooks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(webhooks.id, id))
      .returning();
    return result;
  },

  /**
   * Delete a webhook
   */
  delete: async (id: string): Promise<Webhook> => {
    const [result] = await drizzle
      .delete(webhooks)
      .where(eq(webhooks.id, id))
      .returning();
    return result;
  },

  /**
   * Increment failure count
   */
  incrementFailureCount: async (id: string): Promise<Webhook> => {
    const [result] = await drizzle
      .update(webhooks)
      .set({
        failureCount: sql`${webhooks.failureCount} + 1`,
        lastFailureAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(webhooks.id, id))
      .returning();

    // Auto-disable if threshold reached
    if (result.failureCount >= WEBHOOK_AUTO_DISABLE_THRESHOLD) {
      return await drizzle
        .update(webhooks)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(webhooks.id, id))
        .returning()
        .then((r) => r[0]);
    }

    return result;
  },

  /**
   * Reset failure count on success
   */
  resetFailureCount: async (id: string): Promise<Webhook> => {
    const [result] = await drizzle
      .update(webhooks)
      .set({
        failureCount: 0,
        lastSuccessAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(webhooks.id, id))
      .returning();
    return result;
  },

  /**
   * Toggle webhook active status
   */
  toggleActive: async (id: string, isActive: boolean): Promise<Webhook> => {
    const [result] = await drizzle
      .update(webhooks)
      .set({
        isActive,
        failureCount: isActive ? 0 : undefined, // Reset failures when re-enabling
        updatedAt: new Date(),
      })
      .where(eq(webhooks.id, id))
      .returning();
    return result;
  },

  // ---------------------------------------------------------------------------
  // WEBHOOK DELIVERIES
  // ---------------------------------------------------------------------------

  /**
   * Create a delivery record
   */
  createDelivery: async (
    data: NewWebhookDelivery,
  ): Promise<WebhookDelivery> => {
    const [result] = await drizzle
      .insert(webhookDeliveries)
      .values(data)
      .returning();
    return result;
  },

  /**
   * Update a delivery record
   */
  updateDelivery: async (
    id: string,
    data: Partial<Omit<WebhookDelivery, 'id' | 'createdAt'>>,
  ): Promise<WebhookDelivery> => {
    const [result] = await drizzle
      .update(webhookDeliveries)
      .set(data)
      .where(eq(webhookDeliveries.id, id))
      .returning();
    return result;
  },

  /**
   * Find deliveries for a webhook
   */
  findDeliveriesByWebhook: (
    webhookId: string,
    options?: { limit?: number; offset?: number },
  ) =>
    drizzle.query.webhookDeliveries.findMany({
      where: eq(webhookDeliveries.webhookId, webhookId),
      orderBy: [desc(webhookDeliveries.createdAt)],
      limit: options?.limit ?? 50,
      offset: options?.offset,
    }),

  /**
   * Find delivery by ID
   */
  findDeliveryById: async (id: string): Promise<WebhookDelivery | null> => {
    const result = await drizzle.query.webhookDeliveries.findFirst({
      where: eq(webhookDeliveries.id, id),
      with: {
        webhook: {
          columns: {
            id: true,
            name: true,
            url: true,
          },
        },
      },
    });
    return result ?? null;
  },

  /**
   * Find deliveries pending retry
   */
  findPendingRetries: async (): Promise<WebhookDelivery[]> => {
    return await drizzle.query.webhookDeliveries.findMany({
      where: and(
        eq(webhookDeliveries.status, 'retrying'),
        lte(webhookDeliveries.nextRetryAt, new Date()),
      ),
      orderBy: [webhookDeliveries.nextRetryAt],
      limit: 100,
    });
  },

  /**
   * Get delivery statistics for a webhook
   */
  getDeliveryStats: async (
    webhookId: string,
    since?: Date,
  ): Promise<{
    total: number;
    success: number;
    failed: number;
    pending: number;
    retrying: number;
    avgDurationMs: number;
  }> => {
    const conditions = [eq(webhookDeliveries.webhookId, webhookId)];
    if (since) {
      conditions.push(gte(webhookDeliveries.createdAt, since));
    }

    const stats = await drizzle
      .select({
        status: webhookDeliveries.status,
        count: sql<number>`count(*)::int`,
        avgDuration: sql<number>`avg(${webhookDeliveries.durationMs})::int`,
      })
      .from(webhookDeliveries)
      .where(and(...conditions))
      .groupBy(webhookDeliveries.status);

    const result = {
      total: 0,
      success: 0,
      failed: 0,
      pending: 0,
      retrying: 0,
      avgDurationMs: 0,
    };

    let totalDuration = 0;
    let durationCount = 0;

    for (const stat of stats) {
      const count = Number(stat.count);
      result.total += count;
      result[stat.status as keyof typeof result] = count;

      if (stat.avgDuration) {
        totalDuration += stat.avgDuration * count;
        durationCount += count;
      }
    }

    if (durationCount > 0) {
      result.avgDurationMs = Math.round(totalDuration / durationCount);
    }

    return result;
  },

  /**
   * Clean old delivery records
   */
  cleanOldDeliveries: async (olderThan: Date): Promise<number> => {
    const result = await drizzle
      .delete(webhookDeliveries)
      .where(lte(webhookDeliveries.createdAt, olderThan))
      .returning();
    return result.length;
  },

  /**
   * Get recent deliveries across all webhooks (for admin dashboard)
   */
  getRecentDeliveries: (options?: {
    limit?: number;
    status?: WebhookDeliveryStatus;
  }) => {
    const conditions = [];
    if (options?.status) {
      conditions.push(eq(webhookDeliveries.status, options.status));
    }

    return drizzle.query.webhookDeliveries.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(webhookDeliveries.createdAt)],
      limit: options?.limit ?? 100,
      with: {
        webhook: {
          columns: {
            id: true,
            name: true,
            url: true,
            projectId: true,
          },
        },
      },
    });
  },
});
