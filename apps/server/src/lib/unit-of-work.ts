// =============================================================================
// UNIT OF WORK PATTERN
// Coordinates transactions across multiple repositories
// =============================================================================

import { db } from '@/db';
import type { DbOrTx } from './transaction';
import { withTransaction } from './transaction';

// Repository imports
import { IssueRepository } from '@/repositories/issue-repository';
import { IssueLinkRepository } from '@/repositories/issue-link-repository';
import { ProjectRepository } from '@/repositories/project-repository';
import {
  CommentRepository,
  AttachmentRepository,
} from '@/repositories/comment-repository';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Unit of Work provides a single transaction context for multiple repository operations
 *
 * Usage:
 * ```typescript
 * const result = await UnitOfWork.execute(async (uow) => {
 *   const issue = await uow.issues.findById(id);
 *   await uow.issueLinks.createLink({ ... });
 *   await uow.comments.create({ ... });
 *   return issue;
 * });
 * ```
 */
export class UnitOfWork {
  private _issues: IssueRepository | null = null;
  private _issueLinks: IssueLinkRepository | null = null;
  private _projects: ProjectRepository | null = null;
  private _comments: CommentRepository | null = null;
  private _attachments: AttachmentRepository | null = null;

  private constructor(private readonly tx: DbOrTx) {}

  // ===========================================================================
  // REPOSITORY GETTERS (lazy initialization)
  // ===========================================================================

  get issues(): IssueRepository {
    this._issues ??= new IssueRepository();
    return this._issues;
  }

  get issueLinks(): IssueLinkRepository {
    this._issueLinks ??= new IssueLinkRepository(this.tx);
    return this._issueLinks;
  }

  get projects(): ProjectRepository {
    this._projects ??= new ProjectRepository(this.tx);
    return this._projects;
  }

  get comments(): CommentRepository {
    this._comments ??= new CommentRepository(this.tx);
    return this._comments;
  }

  get attachments(): AttachmentRepository {
    this._attachments ??= new AttachmentRepository(this.tx);
    return this._attachments;
  }

  // ===========================================================================
  // STATIC FACTORY METHODS
  // ===========================================================================

  /**
   * Execute operations within a transaction using Unit of Work pattern
   * All repository operations share the same transaction context
   *
   * @param callback - Function receiving the Unit of Work instance
   * @returns Result of the callback
   *
   * @example
   * ```typescript
   * const result = await UnitOfWork.execute(async (uow) => {
   *   // All operations use the same transaction
   *   const issue = await uow.issues.create({ ... });
   *   await uow.comments.create({ issueId: issue.id, ... });
   *   return issue;
   * });
   * ```
   */
  static async execute<T>(
    callback: (uow: UnitOfWork) => Promise<T>,
  ): Promise<T> {
    return withTransaction(async (tx) => {
      const uow = new UnitOfWork(tx);
      return callback(uow);
    });
  }

  /**
   * Create a Unit of Work instance without automatic transaction
   * Use this when you need to control the transaction manually
   *
   * @param dbOrTx - Database instance or existing transaction
   * @returns Unit of Work instance
   */
  static create(dbOrTx: DbOrTx = db): UnitOfWork {
    return new UnitOfWork(dbOrTx);
  }

  /**
   * Execute operations within a serializable transaction
   * Use for operations requiring highest isolation level
   */
  static async executeSerializable<T>(
    callback: (uow: UnitOfWork) => Promise<T>,
  ): Promise<T> {
    return withTransaction(
      async (tx) => {
        const uow = new UnitOfWork(tx);
        return callback(uow);
      },
      { isolationLevel: 'serializable' },
    );
  }

  /**
   * Execute read-only operations within a transaction
   * Optimized for queries that don't modify data
   */
  static async executeReadOnly<T>(
    callback: (uow: UnitOfWork) => Promise<T>,
  ): Promise<T> {
    return withTransaction(
      async (tx) => {
        const uow = new UnitOfWork(tx);
        return callback(uow);
      },
      { accessMode: 'read only' },
    );
  }
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export const executeInTransaction = UnitOfWork.execute;
export const createUnitOfWork = UnitOfWork.create;
