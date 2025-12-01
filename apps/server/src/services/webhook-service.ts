/**
 * Webhook Service
 *
 * Provides business logic for webhook management and delivery.
 */

import { webhookRepository } from '@/repositories/webhook-repository';
import { ProjectRepository } from '@/repositories/project-repository';
import {
  throwNotFoundError,
  throwForbiddenError,
  throwValidationError,
} from '@/lib/errors';
import {
  type Webhook,
  type NewWebhook,
  type WebhookDelivery,
  type WebhookEvent,
  type WebhookPayload,
  webhookEvents,
  WEBHOOK_MAX_RETRIES,
  WEBHOOK_RETRY_DELAYS,
  WEBHOOK_TIMEOUT_MS,
} from '@/db/schema/webhooks';
import crypto from 'crypto';

// Project repository instance
const projectRepo = new ProjectRepository();

// =============================================================================
// TYPES
// =============================================================================

export interface CreateWebhookInput {
  name: string;
  description?: string;
  projectId?: string;
  url: string;
  secret?: string;
  events: WebhookEvent[];
  customHeaders?: Record<string, string>;
}

export interface UpdateWebhookInput {
  name?: string;
  description?: string;
  url?: string;
  secret?: string;
  events?: WebhookEvent[];
  customHeaders?: Record<string, string>;
  isActive?: boolean;
}

export interface TriggerWebhookInput {
  event: WebhookEvent;
  projectId?: string;
  entityId?: string;
  entityType?: string;
  data: Record<string, unknown>;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface WebhookContext {
  userId: string;
}

// =============================================================================
// WEBHOOK SERVICE
// =============================================================================

export class WebhookService {
  // ---------------------------------------------------------------------------
  // WEBHOOK MANAGEMENT
  // ---------------------------------------------------------------------------

  /**
   * Get all webhooks (optionally filtered by project)
   */
  async getWebhooks(projectId?: string): Promise<Webhook[]> {
    if (projectId) {
      return await webhookRepository().findByProject(projectId);
    }
    return await webhookRepository().findAll();
  }

  /**
   * Get a webhook by ID
   */
  async getWebhook(id: string): Promise<Webhook> {
    const webhook = await webhookRepository().findById(id);
    if (!webhook) {
      throwNotFoundError('NOT_FOUND', { resource: 'webhook', id });
    }
    return webhook;
  }

  /**
   * Create a new webhook
   */
  async createWebhook(
    input: CreateWebhookInput,
    ctx: WebhookContext,
  ): Promise<Webhook> {
    // Validate URL
    this.validateWebhookUrl(input.url);

    // Validate events
    this.validateEvents(input.events);

    // Validate project exists if provided
    if (input.projectId) {
      const project = await projectRepo.findById(input.projectId);
      if (!project) {
        throwNotFoundError('NOT_FOUND', {
          resource: 'project',
          id: input.projectId,
        });
      }
    }

    // Generate secret if not provided
    const secret = input.secret || this.generateSecret();

    return await webhookRepository().create({
      name: input.name,
      description: input.description,
      projectId: input.projectId,
      url: input.url,
      secret,
      events: input.events,
      customHeaders: input.customHeaders || {},
      createdById: ctx.userId,
    });
  }

  /**
   * Update a webhook
   */
  async updateWebhook(id: string, input: UpdateWebhookInput): Promise<Webhook> {
    const webhook = await this.getWebhook(id);

    // Validate URL if changed
    if (input.url) {
      this.validateWebhookUrl(input.url);
    }

    // Validate events if changed
    if (input.events) {
      this.validateEvents(input.events);
    }

    return await webhookRepository().update(id, {
      name: input.name,
      description: input.description,
      url: input.url,
      secret: input.secret,
      events: input.events,
      customHeaders: input.customHeaders,
      isActive: input.isActive,
    });
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(id: string): Promise<void> {
    const webhook = await this.getWebhook(id);
    await webhookRepository().delete(id);
  }

  /**
   * Toggle webhook active status
   */
  async toggleWebhook(id: string, isActive: boolean): Promise<Webhook> {
    const webhook = await this.getWebhook(id);
    return await webhookRepository().toggleActive(id, isActive);
  }

  /**
   * Test a webhook by sending a test payload
   */
  async testWebhook(id: string): Promise<WebhookDelivery> {
    const webhook = await this.getWebhook(id);

    const testPayload: WebhookPayload = {
      id: crypto.randomUUID(),
      event: 'issue:created' as WebhookEvent,
      timestamp: new Date().toISOString(),
      webhookId: webhook.id,
      data: {
        test: true,
        message: 'This is a test webhook delivery',
      },
    };

    return await this.deliverWebhook(webhook, testPayload, 'test', 'test');
  }

  // ---------------------------------------------------------------------------
  // WEBHOOK TRIGGERING
  // ---------------------------------------------------------------------------

  /**
   * Trigger webhooks for an event
   * Returns the number of webhooks triggered
   */
  async triggerWebhooks(input: TriggerWebhookInput): Promise<number> {
    // Find all webhooks subscribed to this event
    const webhooks = await webhookRepository().findByEvent(
      input.event,
      input.projectId,
    );

    if (webhooks.length === 0) {
      return 0;
    }

    // Build payload
    const basePayload: Omit<WebhookPayload, 'webhookId'> = {
      id: crypto.randomUUID(),
      event: input.event,
      timestamp: new Date().toISOString(),
      data: input.data,
      user: input.user,
    };

    // Deliver to each webhook (async, fire-and-forget for better performance)
    const deliveryPromises = webhooks.map((webhook) =>
      this.deliverWebhook(
        webhook,
        { ...basePayload, webhookId: webhook.id },
        input.entityId,
        input.entityType,
      ).catch((error) => {
        // Log error but don't fail the overall operation
        console.error(`[Webhook] Delivery failed for ${webhook.id}:`, error);
      }),
    );

    // Wait for all deliveries to at least start
    await Promise.allSettled(deliveryPromises);

    return webhooks.length;
  }

  /**
   * Deliver a payload to a webhook
   */
  private async deliverWebhook(
    webhook: Webhook,
    payload: WebhookPayload,
    entityId?: string,
    entityType?: string,
  ): Promise<WebhookDelivery> {
    // Create delivery record
    const delivery = await webhookRepository().createDelivery({
      webhookId: webhook.id,
      eventType: payload.event,
      requestBody: payload as unknown as Record<string, unknown>,
      entityId,
      entityType,
      status: 'pending',
      attemptNumber: 1,
    });

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'TaskMaster-Webhook/1.0',
      'X-Webhook-ID': webhook.id,
      'X-Delivery-ID': delivery.id,
      'X-Event-Type': payload.event,
      ...webhook.customHeaders,
    };

    // Sign payload if secret exists
    if (webhook.secret) {
      const signature = this.signPayload(
        JSON.stringify(payload),
        webhook.secret,
      );
      headers['X-Webhook-Signature'] = signature;
      headers['X-Hub-Signature-256'] = `sha256=${signature}`;
    }

    // Make the request
    const startTime = Date.now();
    let responseStatus: number | undefined;
    let responseBody: string | undefined;
    let responseHeaders: Record<string, string> | undefined;
    let errorMessage: string | undefined;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      responseStatus = response.status;
      responseBody = await response.text().catch(() => undefined);
      responseHeaders = Object.fromEntries(response.headers.entries());

      const isSuccess = responseStatus >= 200 && responseStatus < 300;

      // Update delivery record
      const updatedDelivery = await webhookRepository().updateDelivery(
        delivery.id,
        {
          responseStatus,
          responseBody: responseBody?.substring(0, 10000), // Limit stored body
          responseHeaders,
          durationMs: Date.now() - startTime,
          status: isSuccess ? 'success' : 'failed',
          completedAt: new Date(),
          errorMessage: isSuccess ? undefined : `HTTP ${responseStatus}`,
        },
      );

      // Update webhook status
      if (isSuccess) {
        await webhookRepository().resetFailureCount(webhook.id);
      } else {
        await webhookRepository().incrementFailureCount(webhook.id);
      }

      return updatedDelivery;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Determine if we should retry
      const shouldRetry = delivery.attemptNumber < WEBHOOK_MAX_RETRIES;
      const nextRetryDelay =
        WEBHOOK_RETRY_DELAYS[delivery.attemptNumber - 1] ||
        WEBHOOK_RETRY_DELAYS[WEBHOOK_RETRY_DELAYS.length - 1];

      const updatedDelivery = await webhookRepository().updateDelivery(
        delivery.id,
        {
          durationMs: Date.now() - startTime,
          status: shouldRetry ? 'retrying' : 'failed',
          completedAt: shouldRetry ? undefined : new Date(),
          errorMessage,
          nextRetryAt: shouldRetry
            ? new Date(Date.now() + nextRetryDelay)
            : undefined,
        },
      );

      await webhookRepository().incrementFailureCount(webhook.id);

      return updatedDelivery;
    }
  }

  /**
   * Retry failed deliveries
   */
  async retryPendingDeliveries(): Promise<number> {
    const pendingDeliveries = await webhookRepository().findPendingRetries();

    let retryCount = 0;
    for (const delivery of pendingDeliveries) {
      const webhook = await webhookRepository().findById(delivery.webhookId);
      if (!webhook || !webhook.isActive) {
        // Mark as failed if webhook is gone or disabled
        await webhookRepository().updateDelivery(delivery.id, {
          status: 'failed',
          completedAt: new Date(),
          errorMessage: webhook ? 'Webhook disabled' : 'Webhook deleted',
        });
        continue;
      }

      // Rebuild payload from stored request body
      if (delivery.requestBody) {
        const payload = delivery.requestBody as unknown as WebhookPayload;

        // Increment attempt number
        await webhookRepository().updateDelivery(delivery.id, {
          attemptNumber: delivery.attemptNumber + 1,
          status: 'pending',
          nextRetryAt: undefined,
        });

        // Re-deliver
        await this.deliverWebhook(
          webhook,
          payload,
          delivery.entityId ?? undefined,
          delivery.entityType ?? undefined,
        );

        retryCount++;
      }
    }

    return retryCount;
  }

  // ---------------------------------------------------------------------------
  // DELIVERY HISTORY
  // ---------------------------------------------------------------------------

  /**
   * Get deliveries for a webhook
   */
  async getDeliveries(
    webhookId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<WebhookDelivery[]> {
    // Verify webhook exists
    await this.getWebhook(webhookId);
    return await webhookRepository().findDeliveriesByWebhook(
      webhookId,
      options,
    );
  }

  /**
   * Get a specific delivery
   */
  async getDelivery(id: string): Promise<WebhookDelivery> {
    const delivery = await webhookRepository().findDeliveryById(id);
    if (!delivery) {
      throwNotFoundError('NOT_FOUND', { resource: 'webhook_delivery', id });
    }
    return delivery;
  }

  /**
   * Redeliver a specific delivery
   */
  async redeliverWebhook(deliveryId: string): Promise<WebhookDelivery> {
    const delivery = await this.getDelivery(deliveryId);
    const webhook = await this.getWebhook(delivery.webhookId);

    if (!webhook.isActive) {
      throwForbiddenError('FORBIDDEN', { reason: 'Webhook is disabled' });
    }

    if (!delivery.requestBody) {
      throwValidationError('VALIDATION_ERROR', {
        field: 'requestBody',
        error: 'No payload stored for this delivery',
      });
    }

    // Create new delivery for redelivery attempt
    const newDelivery = await webhookRepository().createDelivery({
      webhookId: webhook.id,
      eventType: delivery.eventType,
      requestBody: delivery.requestBody as unknown as Record<string, unknown>,
      entityId: delivery.entityId,
      entityType: delivery.entityType,
      status: 'pending',
      attemptNumber: 1,
    });

    // Deliver
    return await this.deliverWebhook(
      webhook,
      delivery.requestBody as unknown as WebhookPayload,
      delivery.entityId ?? undefined,
      delivery.entityType ?? undefined,
    );
  }

  /**
   * Get delivery statistics
   */
  async getDeliveryStats(webhookId: string, since?: Date) {
    await this.getWebhook(webhookId);
    return await webhookRepository().getDeliveryStats(webhookId, since);
  }

  /**
   * Get recent deliveries across all webhooks (admin)
   */
  async getRecentDeliveries(options?: { limit?: number; status?: string }) {
    return await webhookRepository().getRecentDeliveries({
      limit: options?.limit,
      status: options?.status as any,
    });
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private validateWebhookUrl(url: string): void {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throwValidationError('VALIDATION_ERROR', {
          field: 'url',
          error: 'URL must use HTTP or HTTPS protocol',
        });
      }

      // Block localhost in production (optional security measure)
      // if (process.env.NODE_ENV === 'production') {
      //   if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      //     throwValidationError('VALIDATION_ERROR', {
      //       field: 'url',
      //       error: 'Localhost URLs are not allowed in production',
      //     });
      //   }
      // }
    } catch (error) {
      if ((error as any).code === 'VALIDATION_ERROR') {
        throw error;
      }
      throwValidationError('VALIDATION_ERROR', {
        field: 'url',
        error: 'Invalid URL format',
      });
    }
  }

  private validateEvents(events: WebhookEvent[]): void {
    if (!events || events.length === 0) {
      throwValidationError('VALIDATION_ERROR', {
        field: 'events',
        error: 'At least one event must be selected',
      });
    }

    for (const event of events) {
      if (!webhookEvents.includes(event)) {
        throwValidationError('VALIDATION_ERROR', {
          field: 'events',
          error: `Invalid event type: ${event}`,
        });
      }
    }
  }

  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private signPayload(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const webhookService = new WebhookService();
