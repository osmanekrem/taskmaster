import { db } from '@/db';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { PgTransaction, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from '@/db/schema';

// =============================================================================
// TYPES
// =============================================================================

type Schema = typeof schema;
type TablesWithRelations = ExtractTablesWithRelations<Schema>;

/**
 * Transaction type that can be used in place of db
 */
export type Transaction = PgTransaction<
  PgQueryResultHKT,
  Schema,
  TablesWithRelations
>;

/**
 * Database or Transaction type - use this when a function should work with both
 */
export type DbOrTx = typeof db | Transaction;

/**
 * Options for transaction execution
 */
export interface TransactionOptions {
  /**
   * Isolation level for the transaction
   * - 'read uncommitted': Lowest isolation, allows dirty reads
   * - 'read committed': Default PostgreSQL level, prevents dirty reads
   * - 'repeatable read': Prevents non-repeatable reads
   * - 'serializable': Highest isolation, prevents phantom reads
   */
  isolationLevel?: 'read uncommitted' | 'read committed' | 'repeatable read' | 'serializable';
  
  /**
   * Access mode for the transaction
   * - 'read write': Default, allows all operations
   * - 'read only': Prevents write operations
   */
  accessMode?: 'read write' | 'read only';
  
  /**
   * Whether to defer constraint checking until commit
   */
  deferrable?: boolean;
}

// =============================================================================
// TRANSACTION WRAPPER
// =============================================================================

/**
 * Execute a callback within a database transaction
 * 
 * @example
 * // Basic usage
 * const result = await withTransaction(async (tx) => {
 *   const issue = await tx.insert(issues).values({ ... }).returning();
 *   await tx.insert(issueHistory).values({ ... });
 *   return issue;
 * });
 * 
 * @example
 * // With options
 * const result = await withTransaction(
 *   async (tx) => {
 *     // Complex operation that needs serializable isolation
 *     return await processComplexOperation(tx);
 *   },
 *   { isolationLevel: 'serializable' }
 * );
 * 
 * @example
 * // Nested transactions (reuse existing transaction)
 * async function createIssueWithComments(data: any, tx?: DbOrTx) {
 *   const executor = tx ?? db;
 *   // Use executor for all operations
 *   // If tx is passed, it will use the existing transaction
 *   // If not, it will use db directly (consider wrapping in withTransaction)
 * }
 */
export async function withTransaction<T>(
  callback: (tx: Transaction) => Promise<T>,
  options?: TransactionOptions
): Promise<T> {
  return db.transaction(callback, options);
}

/**
 * Execute a callback within a transaction, or use existing db/tx
 * This is useful for functions that can optionally be part of a larger transaction
 * 
 * @example
 * async function createIssue(data: IssueData, dbOrTx?: DbOrTx) {
 *   return withOptionalTransaction(dbOrTx, async (tx) => {
 *     const issue = await tx.insert(issues).values(data).returning();
 *     await tx.insert(issueHistory).values({ ... });
 *     return issue[0];
 *   });
 * }
 * 
 * // Can be called standalone (creates new transaction)
 * const issue1 = await createIssue(data);
 * 
 * // Or as part of a larger transaction
 * await withTransaction(async (tx) => {
 *   const issue2 = await createIssue(data, tx);
 *   const issue3 = await createIssue(data2, tx);
 *   // Both issues created in same transaction
 * });
 */
export async function withOptionalTransaction<T>(
  dbOrTx: DbOrTx | undefined,
  callback: (tx: DbOrTx) => Promise<T>,
  options?: TransactionOptions
): Promise<T> {
  // If a transaction is provided, use it directly
  if (dbOrTx && dbOrTx !== db) {
    return callback(dbOrTx);
  }

  // Otherwise, create a new transaction
  return withTransaction(callback, options);
}

// =============================================================================
// RETRY UTILITIES
// =============================================================================

export interface RetryOptions {
  /**
   * Maximum number of retry attempts
   * @default 3
   */
  maxRetries?: number;
  
  /**
   * Initial delay in milliseconds before first retry
   * @default 100
   */
  initialDelayMs?: number;
  
  /**
   * Multiplier for exponential backoff
   * @default 2
   */
  backoffMultiplier?: number;
  
  /**
   * Maximum delay in milliseconds
   * @default 5000
   */
  maxDelayMs?: number;
  
  /**
   * Error codes that should trigger a retry
   * PostgreSQL serialization failure codes
   */
  retryableCodes?: string[];
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 100,
  backoffMultiplier: 2,
  maxDelayMs: 5000,
  retryableCodes: [
    '40001', // serialization_failure
    '40P01', // deadlock_detected
  ],
};

/**
 * Execute a transaction with automatic retry on transient failures
 * Useful for serializable transactions that may fail due to concurrent modifications
 * 
 * @example
 * const result = await withRetryableTransaction(
 *   async (tx) => {
 *     // Operation that might have serialization conflicts
 *     const currentValue = await tx.query.counters.findFirst();
 *     await tx.update(counters).set({ value: currentValue.value + 1 });
 *     return currentValue.value + 1;
 *   },
 *   { isolationLevel: 'serializable' },
 *   { maxRetries: 5 }
 * );
 */
export async function withRetryableTransaction<T>(
  callback: (tx: Transaction) => Promise<T>,
  transactionOptions?: TransactionOptions,
  retryOptions?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };
  let lastError: Error | undefined;
  let delay = opts.initialDelayMs;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await withTransaction(callback, transactionOptions);
    } catch (error) {
      lastError = error as Error;
      
      // Check if error is retryable
      const errorCode = (error as any)?.code;
      const isRetryable = opts.retryableCodes.includes(errorCode);
      
      if (!isRetryable || attempt >= opts.maxRetries) {
        throw error;
      }

      // Log retry attempt
      console.warn(
        `[Transaction] Retrying after ${errorCode} error (attempt ${attempt + 1}/${opts.maxRetries})`,
        { delay, error: (error as Error).message }
      );

      // Wait before retry with exponential backoff
      await sleep(delay);
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

// =============================================================================
// UTILITIES
// =============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if we're currently in a transaction
 * Note: This is a simple check and may not work in all cases
 */
export function isTransaction(dbOrTx: DbOrTx): dbOrTx is Transaction {
  return dbOrTx !== db;
}
