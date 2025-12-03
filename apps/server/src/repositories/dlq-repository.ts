/**
 * Dead Letter Queue Repository
 * 
 * Provides data access for failed jobs.
 */

import { db } from '@/db';
import { deadLetterQueue, type NewDeadLetterEntry, type DLQStatus } from '@/db/schema/dead-letter-queue';
import { eq, and, desc, sql, lt } from 'drizzle-orm';
import type { DrizzleClientOrTransaction } from '@/lib/types/db';

export class DLQRepository {
  constructor(private database: DrizzleClientOrTransaction = db) {}

  /**
   * Add a failed job to DLQ
   */
  async add(entry: NewDeadLetterEntry) {
    const [result] = await this.database
      .insert(deadLetterQueue)
      .values(entry)
      .returning();
    return result;
  }

  /**
   * Get DLQ entries with optional filtering
   */
  async findMany(options: {
    queueName?: string;
    status?: DLQStatus;
    limit?: number;
    offset?: number;
  } = {}) {
    const { queueName, status, limit = 50, offset = 0 } = options;

    const conditions = [];
    if (queueName) conditions.push(eq(deadLetterQueue.queueName, queueName));
    if (status) conditions.push(eq(deadLetterQueue.status, status));

    const items = await this.database
      .select()
      .from(deadLetterQueue)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(deadLetterQueue.createdAt))
      .limit(limit)
      .offset(offset);

    return items;
  }

  /**
   * Get a single entry by ID
   */
  async findById(id: string) {
    const [entry] = await this.database
      .select()
      .from(deadLetterQueue)
      .where(eq(deadLetterQueue.id, id));
    return entry || null;
  }

  /**
   * Update entry status
   */
  async updateStatus(
    id: string,
    status: DLQStatus,
    options?: {
      resolvedBy?: string;
      resolutionNotes?: string;
    },
  ) {
    const [result] = await this.database
      .update(deadLetterQueue)
      .set({
        status,
        resolvedAt: status === 'resolved' || status === 'ignored' ? new Date() : null,
        resolvedBy: options?.resolvedBy,
        resolutionNotes: options?.resolutionNotes,
        updatedAt: new Date(),
      })
      .where(eq(deadLetterQueue.id, id))
      .returning();
    return result;
  }

  /**
   * Get counts by queue and status
   */
  async getCounts() {
    const result = await this.database
      .select({
        queueName: deadLetterQueue.queueName,
        status: deadLetterQueue.status,
        count: sql<number>`count(*)::int`,
      })
      .from(deadLetterQueue)
      .groupBy(deadLetterQueue.queueName, deadLetterQueue.status);

    return result;
  }

  /**
   * Delete old resolved entries
   */
  async cleanupOldEntries(olderThanDays: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.database
      .delete(deadLetterQueue)
      .where(
        and(
          eq(deadLetterQueue.status, 'resolved'),
          lt(deadLetterQueue.resolvedAt, cutoffDate),
        ),
      )
      .returning({ id: deadLetterQueue.id });

    return result.length;
  }

  /**
   * Mark entry as retried
   */
  async markRetried(id: string) {
    return this.updateStatus(id, 'retried');
  }

  /**
   * Mark entry as resolved
   */
  async markResolved(id: string, userId: string, notes?: string) {
    return this.updateStatus(id, 'resolved', {
      resolvedBy: userId,
      resolutionNotes: notes,
    });
  }

  /**
   * Mark entry as ignored
   */
  async markIgnored(id: string, userId: string, notes?: string) {
    return this.updateStatus(id, 'ignored', {
      resolvedBy: userId,
      resolutionNotes: notes,
    });
  }
}

// Singleton instance
export const dlqRepository = new DLQRepository();
