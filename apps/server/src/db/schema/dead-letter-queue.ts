/**
 * Dead Letter Queue Schema
 * 
 * Stores failed jobs for later analysis and retry.
 */

import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  uuid,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// =============================================================================
// DEAD LETTER QUEUE TABLE
// =============================================================================

export const deadLetterQueue = pgTable(
  'dead_letter_queue',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    
    // Job identification
    queueName: text('queue_name').notNull(),
    jobId: text('job_id').notNull(),
    jobName: text('job_name'),
    
    // Job data
    payload: jsonb('payload').notNull(),
    
    // Error information
    errorMessage: text('error_message').notNull(),
    errorStack: text('error_stack'),
    errorCode: text('error_code'),
    
    // Attempt tracking
    attemptsMade: integer('attempts_made').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(3),
    
    // State
    status: text('status').notNull().default('pending'), // pending, retried, resolved, ignored
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedBy: uuid('resolved_by'),
    resolutionNotes: text('resolution_notes'),
    
    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
    
    // Optional correlation
    correlationId: text('correlation_id'),
    projectId: uuid('project_id'),
    userId: uuid('user_id'),
  },
  (table) => ({
    queueNameIdx: index('dlq_queue_name_idx').on(table.queueName),
    statusIdx: index('dlq_status_idx').on(table.status),
    createdAtIdx: index('dlq_created_at_idx').on(table.createdAt),
    correlationIdx: index('dlq_correlation_idx').on(table.correlationId),
  }),
);

// =============================================================================
// TYPES
// =============================================================================

export type DeadLetterEntry = typeof deadLetterQueue.$inferSelect;
export type NewDeadLetterEntry = typeof deadLetterQueue.$inferInsert;
export type DLQStatus = 'pending' | 'retried' | 'resolved' | 'ignored';
