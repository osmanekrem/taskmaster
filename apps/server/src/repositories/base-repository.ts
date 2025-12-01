// =============================================================================
// BASE REPOSITORY
// Abstract base class for all repositories with common CRUD operations
// =============================================================================

import { db } from '@/db';
import type { SQL, Table } from 'drizzle-orm';
import { eq, sql, count, and, isNull } from 'drizzle-orm';
import type { PgTable, TableConfig } from 'drizzle-orm/pg-core';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type * as schema from '@/db/schema';

// Type helper for schema
type Schema = typeof schema;
type SchemaTableNames = keyof ExtractTablesWithRelations<Schema>;

// =============================================================================
// TYPES
// =============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt?: Date | null;
  deletedAt?: Date | null;
}

export interface SoftDeleteEntity extends BaseEntity {
  deletedAt: Date | null;
}

// =============================================================================
// BASE REPOSITORY CLASS
// =============================================================================

/**
 * Abstract base repository class providing common CRUD operations
 *
 * @template T - The entity type (select type)
 * @template TInsert - The insert type
 * @template TUpdate - The update type (partial of insert, excluding id)
 */
export abstract class BaseRepository<
  T extends BaseEntity,
  TInsert extends Record<string, unknown>,
  TUpdate extends Partial<Omit<TInsert, 'id'>> = Partial<Omit<TInsert, 'id'>>,
> {
  protected abstract readonly tableName: string;

  /**
   * Get the Drizzle table reference
   */
  protected abstract getTable(): PgTable<TableConfig>;

  /**
   * Check if this entity supports soft delete
   */
  protected supportsSoftDelete(): boolean {
    return false;
  }

  /**
   * Get the soft delete column if supported
   */
  protected getDeletedAtColumn(): SQL | null {
    return null;
  }

  // ===========================================================================
  // READ OPERATIONS
  // ===========================================================================

  /**
   * Find a single entity by ID
   */
  async findById(id: string): Promise<T | null> {
    const table = this.getTable();
    const conditions: SQL[] = [eq((table as any).id, id)];

    // Add soft delete filter if supported
    if (this.supportsSoftDelete()) {
      const deletedAtCol = this.getDeletedAtColumn();
      if (deletedAtCol) {
        conditions.push(isNull(deletedAtCol));
      }
    }

    const result = await db
      .select()
      .from(table)
      .where(and(...conditions))
      .limit(1);

    return (result[0] as T) ?? null;
  }

  /**
   * Find all entities with optional filters
   */
  async findAll(where?: SQL): Promise<T[]> {
    const table = this.getTable();
    const conditions: SQL[] = [];

    if (where) {
      conditions.push(where);
    }

    // Add soft delete filter if supported
    if (this.supportsSoftDelete()) {
      const deletedAtCol = this.getDeletedAtColumn();
      if (deletedAtCol) {
        conditions.push(isNull(deletedAtCol));
      }
    }

    const query = db.select().from(table);

    if (conditions.length > 0) {
      return (await query.where(and(...conditions))) as T[];
    }

    return (await query) as T[];
  }

  /**
   * Find entities with pagination
   */
  async findPaginated(
    params: PaginationParams,
    where?: SQL,
  ): Promise<PaginatedResult<T>> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const offset = (page - 1) * limit;

    const table = this.getTable();
    const conditions: SQL[] = [];

    if (where) {
      conditions.push(where);
    }

    // Add soft delete filter if supported
    if (this.supportsSoftDelete()) {
      const deletedAtCol = this.getDeletedAtColumn();
      if (deletedAtCol) {
        conditions.push(isNull(deletedAtCol));
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get data
    let dataQuery = db.select().from(table).limit(limit).offset(offset);
    if (whereClause) {
      dataQuery = dataQuery.where(whereClause) as typeof dataQuery;
    }
    const data = (await dataQuery) as T[];

    // Get total count
    let countQuery = db.select({ count: count() }).from(table);
    if (whereClause) {
      countQuery = countQuery.where(whereClause) as typeof countQuery;
    }
    const [{ count: total }] = await countQuery;

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Count entities with optional filter
   */
  async count(where?: SQL): Promise<number> {
    const table = this.getTable();
    const conditions: SQL[] = [];

    if (where) {
      conditions.push(where);
    }

    // Add soft delete filter if supported
    if (this.supportsSoftDelete()) {
      const deletedAtCol = this.getDeletedAtColumn();
      if (deletedAtCol) {
        conditions.push(isNull(deletedAtCol));
      }
    }

    let query = db.select({ count: count() }).from(table);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const [result] = await query;
    return result.count;
  }

  /**
   * Check if an entity exists
   */
  async exists(id: string): Promise<boolean> {
    const entity = await this.findById(id);
    return entity !== null;
  }

  // ===========================================================================
  // WRITE OPERATIONS
  // ===========================================================================

  /**
   * Create a new entity
   */
  async create(data: TInsert): Promise<T> {
    const table = this.getTable();

    const [result] = await db
      .insert(table)
      .values(data as any)
      .returning();

    return result as unknown as T;
  }

  /**
   * Create multiple entities
   */
  async createMany(data: TInsert[]): Promise<T[]> {
    if (data.length === 0) return [];

    const table = this.getTable();

    const results = await db
      .insert(table)
      .values(data as any[])
      .returning();

    return results as unknown as T[];
  }

  /**
   * Update an entity by ID
   */
  async update(id: string, data: TUpdate): Promise<T> {
    const table = this.getTable();

    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    const [result] = await db
      .update(table)
      .set(updateData as any)
      .where(eq((table as any).id, id))
      .returning();

    return result as T;
  }

  /**
   * Hard delete an entity by ID
   * Use softDelete when available
   */
  async delete(id: string): Promise<void> {
    const table = this.getTable();

    await db.delete(table).where(eq((table as any).id, id));
  }

  /**
   * Soft delete an entity by ID (if supported)
   * Falls back to hard delete if soft delete not supported
   */
  async softDelete(id: string): Promise<void> {
    if (!this.supportsSoftDelete()) {
      return this.delete(id);
    }

    const table = this.getTable();

    await db
      .update(table)
      .set({ deletedAt: new Date() } as any)
      .where(eq((table as any).id, id));
  }

  /**
   * Restore a soft-deleted entity
   */
  async restore(id: string): Promise<T | null> {
    if (!this.supportsSoftDelete()) {
      return null;
    }

    const table = this.getTable();

    const [result] = await db
      .update(table)
      .set({ deletedAt: null, updatedAt: new Date() } as any)
      .where(eq((table as any).id, id))
      .returning();

    return (result as T) ?? null;
  }

  // ===========================================================================
  // TRANSACTION SUPPORT
  // ===========================================================================

  /**
   * Execute operations within a transaction
   * Usage:
   * ```
   * await repository.transaction(async (tx) => {
   *   await tx.insert(table).values(data);
   *   await tx.update(table).set(updates).where(condition);
   * });
   * ```
   */
  async transaction<TResult>(
    callback: (tx: typeof db) => Promise<TResult>,
  ): Promise<TResult> {
    return await db.transaction(async (tx) => {
      return await callback(tx as unknown as typeof db);
    });
  }
}

// =============================================================================
// REPOSITORY WITH SOFT DELETE
// =============================================================================

/**
 * Base repository with soft delete support
 */
export abstract class SoftDeleteRepository<
  T extends SoftDeleteEntity,
  TInsert extends Record<string, unknown>,
  TUpdate extends Partial<Omit<TInsert, 'id'>> = Partial<Omit<TInsert, 'id'>>,
> extends BaseRepository<T, TInsert, TUpdate> {
  protected supportsSoftDelete(): boolean {
    return true;
  }

  protected getDeletedAtColumn(): SQL {
    const table = this.getTable();
    return (table as any).deletedAt;
  }

  /**
   * Find including soft-deleted entities
   */
  async findByIdIncludingDeleted(id: string): Promise<T | null> {
    const table = this.getTable();

    const result = await db
      .select()
      .from(table)
      .where(eq((table as any).id, id))
      .limit(1);

    return (result[0] as T) ?? null;
  }

  /**
   * Find all including soft-deleted entities
   */
  async findAllIncludingDeleted(where?: SQL): Promise<T[]> {
    const table = this.getTable();

    if (where) {
      return (await db.select().from(table).where(where)) as T[];
    }

    return (await db.select().from(table)) as T[];
  }

  /**
   * Find only soft-deleted entities
   */
  async findDeleted(where?: SQL): Promise<T[]> {
    const table = this.getTable();
    const deletedAtCol = (table as any).deletedAt;

    const conditions: SQL[] = [sql`${deletedAtCol} IS NOT NULL`];

    if (where) {
      conditions.push(where);
    }

    return (await db
      .select()
      .from(table)
      .where(and(...conditions))) as T[];
  }
}
