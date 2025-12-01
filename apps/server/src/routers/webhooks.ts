/**
 * Webhooks Router
 *
 * API endpoints for webhook management and delivery.
 */

import { router, protectedProcedure, adminProcedure } from '@/lib/trpc';
import { z } from 'zod';
import { requirePermission } from '@/lib/middleware/permission';
import { webhookService } from '@/services/webhook-service';
import { successResponse } from '@/utils/response';
import { webhookEvents, type WebhookEvent } from '@/db/schema/webhooks';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const webhookEventSchema = z.enum([...webhookEvents] as [
  WebhookEvent,
  ...WebhookEvent[],
]);

const createWebhookSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  projectId: z.string().uuid().optional(),
  url: z.string().url(),
  secret: z.string().min(16).max(255).optional(),
  events: z.array(webhookEventSchema).min(1),
  customHeaders: z.record(z.string(), z.string()).optional(),
});

const updateWebhookSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  url: z.string().url().optional(),
  secret: z.string().min(16).max(255).optional(),
  events: z.array(webhookEventSchema).min(1).optional(),
  customHeaders: z.record(z.string(), z.string()).optional(),
  isActive: z.boolean().optional(),
});

const idSchema = z.object({
  id: z.string().uuid(),
});

const webhookIdSchema = z.object({
  webhookId: z.string().uuid(),
});

const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

const getDeliveriesSchema = z.object({
  webhookId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

const getDeliveryStatsSchema = z.object({
  webhookId: z.string().uuid(),
  since: z.date().optional(),
});

const getRecentDeliveriesSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  status: z.enum(['pending', 'success', 'failed', 'retrying']).optional(),
});

const toggleWebhookSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean(),
});

const projectIdSchema = z.object({
  projectId: z.string().uuid().optional(),
});

// =============================================================================
// ROUTER
// =============================================================================

export const webhooksRouter = router({
  // ---------------------------------------------------------------------------
  // WEBHOOK CRUD
  // ---------------------------------------------------------------------------

  /**
   * List webhooks
   */
  list: protectedProcedure
    .input(projectIdSchema.optional())
    .use(requirePermission('project:view'))
    .query(async ({ input }) => {
      const data = await webhookService.getWebhooks(input?.projectId);
      return successResponse(data, "Webhook'lar başarıyla getirildi");
    }),

  /**
   * Get webhook by ID
   */
  getById: protectedProcedure
    .input(idSchema)
    .use(requirePermission('project:view'))
    .query(async ({ input }) => {
      const data = await webhookService.getWebhook(input.id);
      return successResponse(data, 'Webhook başarıyla getirildi');
    }),

  /**
   * Create a webhook
   */
  create: protectedProcedure
    .input(createWebhookSchema)
    .use(requirePermission('project:edit'))
    .mutation(async ({ input, ctx }) => {
      const data = await webhookService.createWebhook(input as any, {
        userId: ctx.session!.user.id,
      });
      return successResponse(data, 'Webhook başarıyla oluşturuldu');
    }),

  /**
   * Update a webhook
   */
  update: protectedProcedure
    .input(updateWebhookSchema)
    .use(requirePermission('project:edit'))
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;
      const data = await webhookService.updateWebhook(id, updateData as any);
      return successResponse(data, 'Webhook başarıyla güncellendi');
    }),

  /**
   * Delete a webhook
   */
  delete: protectedProcedure
    .input(idSchema)
    .use(requirePermission('project:edit'))
    .mutation(async ({ input }) => {
      await webhookService.deleteWebhook(input.id);
      return successResponse(null, 'Webhook başarıyla silindi');
    }),

  /**
   * Toggle webhook active status
   */
  toggle: protectedProcedure
    .input(toggleWebhookSchema)
    .use(requirePermission('project:edit'))
    .mutation(async ({ input }) => {
      const data = await webhookService.toggleWebhook(input.id, input.isActive);
      return successResponse(
        data,
        input.isActive
          ? 'Webhook etkinleştirildi'
          : 'Webhook devre dışı bırakıldı',
      );
    }),

  /**
   * Test a webhook
   */
  test: protectedProcedure
    .input(idSchema)
    .use(requirePermission('project:edit'))
    .mutation(async ({ input }) => {
      const data = await webhookService.testWebhook(input.id);
      return successResponse(data, 'Test webhook gönderildi');
    }),

  // ---------------------------------------------------------------------------
  // WEBHOOK DELIVERIES
  // ---------------------------------------------------------------------------

  /**
   * Get deliveries for a webhook
   */
  getDeliveries: protectedProcedure
    .input(getDeliveriesSchema)
    .use(requirePermission('project:view'))
    .query(async ({ input }) => {
      const data = await webhookService.getDeliveries(input.webhookId, {
        limit: input.limit,
        offset: input.offset,
      });
      return successResponse(data, 'Teslimatlar başarıyla getirildi');
    }),

  /**
   * Get a specific delivery
   */
  getDelivery: protectedProcedure
    .input(idSchema)
    .use(requirePermission('project:view'))
    .query(async ({ input }) => {
      const data = await webhookService.getDelivery(input.id);
      return successResponse(data, 'Teslimat başarıyla getirildi');
    }),

  /**
   * Redeliver a webhook
   */
  redeliver: protectedProcedure
    .input(idSchema)
    .use(requirePermission('project:edit'))
    .mutation(async ({ input }) => {
      const data = await webhookService.redeliverWebhook(input.id);
      return successResponse(data, 'Webhook yeniden gönderildi');
    }),

  /**
   * Get delivery statistics
   */
  getStats: protectedProcedure
    .input(getDeliveryStatsSchema)
    .use(requirePermission('project:view'))
    .query(async ({ input }) => {
      const data = await webhookService.getDeliveryStats(
        input.webhookId,
        input.since,
      );
      return successResponse(data, 'İstatistikler başarıyla getirildi');
    }),

  // ---------------------------------------------------------------------------
  // ADMIN ENDPOINTS
  // ---------------------------------------------------------------------------

  /**
   * Get all webhooks (admin)
   */
  adminList: adminProcedure
    .input(paginationSchema.optional())
    .query(async ({ input }) => {
      const data = await webhookService.getWebhooks();
      return successResponse(data, "Tüm webhook'lar başarıyla getirildi");
    }),

  /**
   * Get recent deliveries across all webhooks (admin)
   */
  adminRecentDeliveries: adminProcedure
    .input(getRecentDeliveriesSchema.optional())
    .query(async ({ input }) => {
      const data = await webhookService.getRecentDeliveries({
        limit: input?.limit,
        status: input?.status,
      });
      return successResponse(data, 'Son teslimatlar başarıyla getirildi');
    }),

  /**
   * Retry pending deliveries (admin)
   */
  adminRetryPending: adminProcedure.mutation(async () => {
    const count = await webhookService.retryPendingDeliveries();
    return successResponse(
      { retriedCount: count },
      `${count} teslimat yeniden denendi`,
    );
  }),

  // ---------------------------------------------------------------------------
  // METADATA
  // ---------------------------------------------------------------------------

  /**
   * Get available webhook events
   */
  getEvents: protectedProcedure.query(async () => {
    // Group events by category
    const categorizedEvents = {
      issue: webhookEvents.filter((e) => e.startsWith('issue:')),
      comment: webhookEvents.filter((e) => e.startsWith('comment:')),
      sprint: webhookEvents.filter((e) => e.startsWith('sprint:')),
      version: webhookEvents.filter((e) => e.startsWith('version:')),
      project: webhookEvents.filter((e) => e.startsWith('project:')),
      worklog: webhookEvents.filter((e) => e.startsWith('worklog:')),
      user: webhookEvents.filter((e) => e.startsWith('user:')),
      board: webhookEvents.filter((e) => e.startsWith('board:')),
    };

    return successResponse(
      {
        events: webhookEvents,
        categorized: categorizedEvents,
      },
      'Webhook olayları başarıyla getirildi',
    );
  }),
});
