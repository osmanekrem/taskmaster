/**
 * Admin Router
 * 
 * Endpoints for system administration including:
 * - Dead Letter Queue management
 * - Queue statistics
 * - System health
 */

import { router, adminProcedure, protectedProcedure } from '@/lib/trpc';
import { z } from 'zod';
import { dlqRepository, DLQRepository } from '@/repositories/dlq-repository';
import {
  getDLQStats,
  retryDLQEntry,
  processPendingDLQRetries,
  cleanupDLQ,
  getAllQueueStats,
  getQueueStats,
  type DLQRetryResult,
} from '@/lib/queue';
import { QUEUE_NAMES } from '@taskmaster/constants';

// =============================================================================
// DLQ ENDPOINTS
// =============================================================================

export const adminRouter = router({
  /**
   * Get DLQ entries with pagination and filtering
   */
  getDLQEntries: adminProcedure
    .input(
      z.object({
        queueName: z.string().optional(),
        status: z.enum(['pending', 'retried', 'resolved', 'ignored']).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ input }) => {
      const entries = await dlqRepository.findMany({
        queueName: input.queueName,
        status: input.status,
        limit: input.limit,
        offset: input.offset,
      });

      return entries;
    }),

  /**
   * Get a single DLQ entry by ID
   */
  getDLQEntry: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const entry = await dlqRepository.findById(input.id);

      if (!entry) {
        throw new Error('DLQ entry not found');
      }

      return entry;
    }),

  /**
   * Get aggregated DLQ statistics
   */
  getDLQStats: adminProcedure.query(async () => {
    return getDLQStats();
  }),

  /**
   * Retry a specific DLQ entry
   */
  retryDLQEntry: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      return retryDLQEntry(input.id);
    }),

  /**
   * Retry multiple DLQ entries
   */
  retryDLQEntries: adminProcedure
    .input(z.object({ ids: z.array(z.string().uuid()) }))
    .mutation(async ({ input }) => {
      const results: DLQRetryResult[] = [];

      for (const id of input.ids) {
        const result = await retryDLQEntry(id);
        results.push(result);
      }

      return {
        total: results.length,
        success: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      };
    }),

  /**
   * Retry all pending DLQ entries
   */
  retryAllPendingDLQ: adminProcedure.mutation(async () => {
    return processPendingDLQRetries();
  }),

  /**
   * Resolve a DLQ entry (mark as fixed)
   */
  resolveDLQEntry: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const result = await dlqRepository.markResolved(
        input.id,
        ctx.session!.user.id,
        input.notes,
      );

      if (!result) {
        throw new Error('DLQ entry not found');
      }

      return result;
    }),

  /**
   * Ignore a DLQ entry (mark as intentionally skipped)
   */
  ignoreDLQEntry: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const result = await dlqRepository.markIgnored(
        input.id,
        ctx.session!.user.id,
        input.notes,
      );

      if (!result) {
        throw new Error('DLQ entry not found');
      }

      return result;
    }),

  /**
   * Cleanup old DLQ entries
   */
  cleanupDLQ: adminProcedure
    .input(
      z.object({
        olderThanDays: z.number().min(1).max(365).default(30),
      }),
    )
    .mutation(async ({ input }) => {
      const deleted = await cleanupDLQ(input.olderThanDays);
      return { deleted };
    }),

  // =============================================================================
  // QUEUE STATS
  // =============================================================================

  /**
   * Get all queue statistics
   */
  getAllQueueStats: adminProcedure.query(async () => {
    return getAllQueueStats();
  }),

  /**
   * Get stats for a specific queue
   */
  getQueueStats: adminProcedure
    .input(
      z.object({
        queueName: z.enum([
          QUEUE_NAMES.NOTIFICATION,
          QUEUE_NAMES.EMAIL,
          QUEUE_NAMES.WEBHOOK,
          QUEUE_NAMES.AUTOMATION,
          QUEUE_NAMES.OUTBOX,
          QUEUE_NAMES.BURNDOWN,
        ] as const),
      }),
    )
    .query(async ({ input }) => {
      return getQueueStats(input.queueName);
    }),
});
