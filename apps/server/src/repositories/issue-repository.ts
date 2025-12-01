import { db } from '@/db';
import {
  issues,
  issueFieldValues,
  issueHistory,
  type FieldValue,
  type HistoryChange,
} from '@/db/schema/issues';
import { projects } from '@/db/schema/projects';
import {
  eq,
  and,
  or,
  desc,
  asc,
  sql,
  ilike,
  inArray,
  isNull,
  gte,
  lte,
} from 'drizzle-orm';
import type { IssueFilters } from '@taskmaster/validation';

export class IssueRepository {
  // ==========================================================================
  // ISSUE CRUD
  // ==========================================================================

  async findById(id: string) {
    return db.query.issues.findFirst({
      where: eq(issues.id, id),
      with: {
        project: true,
        issueType: true,
        status: true,
        resolution: true,
        reporter: {
          columns: { id: true, name: true, email: true, image: true },
        },
        assignee: {
          columns: { id: true, name: true, email: true, image: true },
        },
        parent: {
          columns: { id: true, key: true },
          with: { issueType: { columns: { name: true, icon: true } } },
        },
        epic: {
          columns: { id: true, key: true },
          with: { issueType: { columns: { name: true, icon: true } } },
        },
        fieldValues: {
          with: { field: true },
        },
      },
    });
  }

  async findByKey(key: string) {
    return db.query.issues.findFirst({
      where: eq(issues.key, key),
      with: {
        project: true,
        issueType: true,
        status: true,
        resolution: true,
        reporter: {
          columns: { id: true, name: true, email: true, image: true },
        },
        assignee: {
          columns: { id: true, name: true, email: true, image: true },
        },
        parent: {
          columns: { id: true, key: true },
          with: { issueType: { columns: { name: true, icon: true } } },
        },
        epic: {
          columns: { id: true, key: true },
          with: { issueType: { columns: { name: true, icon: true } } },
        },
        fieldValues: {
          with: { field: true },
        },
      },
    });
  }

  async findMany(filters: IssueFilters) {
    const { page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions: any[] = [];

    if (filters.projectId) {
      conditions.push(eq(issues.projectId, filters.projectId));
    }
    if (filters.issueTypeId) {
      conditions.push(eq(issues.issueTypeId, filters.issueTypeId));
    }
    if (filters.issueTypeIds?.length) {
      conditions.push(inArray(issues.issueTypeId, filters.issueTypeIds));
    }
    if (filters.statusId) {
      conditions.push(eq(issues.statusId, filters.statusId));
    }
    if (filters.statusIds?.length) {
      conditions.push(inArray(issues.statusId, filters.statusIds));
    }
    if (filters.reporterId) {
      conditions.push(eq(issues.reporterId, filters.reporterId));
    }
    if (filters.assigneeId !== undefined) {
      if (filters.assigneeId === null) {
        conditions.push(isNull(issues.assigneeId));
      } else {
        conditions.push(eq(issues.assigneeId, filters.assigneeId));
      }
    }
    if (filters.isUnassigned) {
      conditions.push(isNull(issues.assigneeId));
    }
    if (filters.parentId !== undefined) {
      if (filters.parentId === null) {
        conditions.push(isNull(issues.parentId));
      } else {
        conditions.push(eq(issues.parentId, filters.parentId));
      }
    }
    if (filters.epicId !== undefined) {
      if (filters.epicId === null) {
        conditions.push(isNull(issues.epicId));
      } else {
        conditions.push(eq(issues.epicId, filters.epicId));
      }
    }
    if (filters.hasParent === true) {
      conditions.push(sql`${issues.parentId} IS NOT NULL`);
    } else if (filters.hasParent === false) {
      conditions.push(isNull(issues.parentId));
    }
    if (filters.isResolved === true) {
      conditions.push(sql`${issues.resolutionId} IS NOT NULL`);
    } else if (filters.isResolved === false) {
      conditions.push(isNull(issues.resolutionId));
    }
    if (filters.search) {
      conditions.push(
        or(
          ilike(issues.key, `%${filters.search}%`),
          ilike(issues.summary, `%${filters.search}%`),
          ilike(issues.description, `%${filters.search}%`),
        ),
      );
    }
    if (filters.createdAfter) {
      conditions.push(gte(issues.createdAt, filters.createdAfter));
    }
    if (filters.createdBefore) {
      conditions.push(lte(issues.createdAt, filters.createdBefore));
    }
    if (filters.updatedAfter) {
      conditions.push(gte(issues.updatedAt, filters.updatedAfter));
    }
    if (filters.dueBefore) {
      conditions.push(lte(issues.dueDate, filters.dueBefore));
    }

    // Determine sort order
    let orderBy: any = desc(issues.createdAt);
    if (filters.sortBy) {
      const direction = filters.sortOrder === 'asc' ? asc : desc;
      switch (filters.sortBy) {
        case 'created':
          orderBy = direction(issues.createdAt);
          break;
        case 'updated':
          orderBy = direction(issues.updatedAt);
          break;
        case 'key':
          orderBy = direction(issues.issueNumber);
          break;
        case 'dueDate':
          orderBy = direction(issues.dueDate);
          break;
        // status and priority would need joins
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, countResult] = await Promise.all([
      db.query.issues.findMany({
        where: whereClause,
        orderBy,
        limit,
        offset,
        with: {
          project: { columns: { id: true, key: true, name: true } },
          issueType: { columns: { id: true, name: true, icon: true } },
          status: true,
          resolution: true,
          assignee: {
            columns: { id: true, name: true, email: true, image: true },
          },
          parent: {
            columns: { id: true, key: true },
          },
          epic: {
            columns: { id: true, key: true },
          },
        },
      }),
      db
        .select({ count: sql<number>`count(*)` })
        .from(issues)
        .where(whereClause),
    ]);

    const total = Number(countResult[0]?.count || 0);

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

  async findChildren(parentId: string) {
    return db.query.issues.findMany({
      where: eq(issues.parentId, parentId),
      with: {
        issueType: { columns: { id: true, name: true, icon: true } },
        status: true,
        assignee: {
          columns: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: asc(issues.issueNumber),
    });
  }

  async findEpicChildren(epicId: string) {
    return db.query.issues.findMany({
      where: eq(issues.epicId, epicId),
      with: {
        issueType: { columns: { id: true, name: true, icon: true } },
        status: true,
        assignee: {
          columns: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: asc(issues.issueNumber),
    });
  }

  async create(data: {
    key: string;
    issueNumber: number;
    projectId: string;
    issueTypeId: string;
    statusId: string;
    reporterId: string;
    assigneeId?: string | null;
    parentId?: string | null;
    epicId?: string | null;
    dueDate?: Date | null;
    rank?: string | null;
  }) {
    const [issue] = await db.insert(issues).values(data).returning();
    return issue;
  }

  async update(
    id: string,
    data: Partial<{
      issueTypeId: string;
      statusId: string;
      resolutionId: string | null;
      assigneeId: string | null;
      parentId: string | null;
      epicId: string | null;
      dueDate: Date | null;
      resolvedAt: Date | null;
      updatedAt: Date;
    }>,
  ) {
    const [updated] = await db
      .update(issues)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(issues.id, id))
      .returning();
    return updated;
  }

  async delete(id: string) {
    const [deleted] = await db
      .delete(issues)
      .where(eq(issues.id, id))
      .returning();
    return deleted;
  }

  async countByProject(projectId: string) {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(issues)
      .where(eq(issues.projectId, projectId));
    return Number(result[0]?.count || 0);
  }

  async countByProjectAndIssueType(projectId: string, issueTypeId: string) {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(issues)
      .where(
        and(
          eq(issues.projectId, projectId),
          eq(issues.issueTypeId, issueTypeId),
        ),
      );
    return Number(result[0]?.count || 0);
  }

  // ==========================================================================
  // ISSUE KEY GENERATION (Atomic)
  // ==========================================================================

  async getNextIssueNumber(
    projectId: string,
  ): Promise<{ key: string; issueNumber: number }> {
    // Use a transaction with row-level locking for atomicity
    return db.transaction(async (tx) => {
      // Lock the project row and get current settings
      const [project] = await tx
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .for('update');

      if (!project) {
        throw new Error('Project not found');
      }

      const settings = (project.settings as any) || {};
      const nextNumber = (settings.nextIssueNumber || 1) as number;
      const prefix = settings.issueKeyPrefix || project.key;

      // Increment the counter
      await tx
        .update(projects)
        .set({
          settings: {
            ...settings,
            nextIssueNumber: nextNumber + 1,
          },
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId));

      return {
        key: `${prefix}-${nextNumber}`,
        issueNumber: nextNumber,
      };
    });
  }

  // ==========================================================================
  // FIELD VALUES
  // ==========================================================================

  async getFieldValues(issueId: string) {
    return db.query.issueFieldValues.findMany({
      where: eq(issueFieldValues.issueId, issueId),
      with: { field: true },
    });
  }

  async setFieldValue(issueId: string, fieldId: string, value: FieldValue) {
    // Upsert: insert or update using onConflictDoUpdate
    const [result] = await db
      .insert(issueFieldValues)
      .values({ issueId, fieldId, value })
      .onConflictDoUpdate({
        target: [issueFieldValues.issueId, issueFieldValues.fieldId],
        set: {
          value,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async setFieldValues(
    issueId: string,
    fieldValues: { fieldId: string; value: FieldValue }[],
  ) {
    if (fieldValues.length === 0) return [];

    // Batch upsert: insert all values in one query
    const valuesToInsert = fieldValues.map((fv) => ({
      issueId,
      fieldId: fv.fieldId,
      value: fv.value,
    }));

    const results = await db
      .insert(issueFieldValues)
      .values(valuesToInsert)
      .onConflictDoUpdate({
        target: [issueFieldValues.issueId, issueFieldValues.fieldId],
        set: {
          value: sql`excluded.value`,
          updatedAt: new Date(),
        },
      })
      .returning();

    return results;
  }

  async deleteFieldValue(issueId: string, fieldId: string) {
    const [deleted] = await db
      .delete(issueFieldValues)
      .where(
        and(
          eq(issueFieldValues.issueId, issueId),
          eq(issueFieldValues.fieldId, fieldId),
        ),
      )
      .returning();
    return deleted;
  }

  // ==========================================================================
  // HISTORY
  // ==========================================================================

  async addHistory(issueId: string, userId: string, changes: HistoryChange[]) {
    const [history] = await db
      .insert(issueHistory)
      .values({ issueId, userId, changes })
      .returning();
    return history;
  }

  async getHistory(issueId: string, page = 1, limit = 50) {
    const offset = (page - 1) * limit;

    const [data, countResult] = await Promise.all([
      db.query.issueHistory.findMany({
        where: eq(issueHistory.issueId, issueId),
        orderBy: desc(issueHistory.createdAt),
        limit,
        offset,
        with: {
          user: {
            columns: { id: true, name: true, email: true, image: true },
          },
        },
      }),
      db
        .select({ count: sql<number>`count(*)` })
        .from(issueHistory)
        .where(eq(issueHistory.issueId, issueId)),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total: Number(countResult[0]?.count || 0),
      },
    };
  }

  // ==========================================================================
  // HIERARCHY CHECKS
  // ==========================================================================

  async isAncestorOf(
    potentialAncestorId: string,
    issueId: string,
  ): Promise<boolean> {
    // Check if potentialAncestor is an ancestor of issue (to prevent cycles)
    let current = await this.findById(issueId);
    const visited = new Set<string>();

    while (current?.parentId) {
      if (visited.has(current.parentId)) {
        return true; // Already in a cycle
      }
      if (current.parentId === potentialAncestorId) {
        return true;
      }
      visited.add(current.parentId);
      current = await this.findById(current.parentId);
    }

    return false;
  }

  // ==========================================================================
  // IN-USE CHECKS (for delete validation)
  // ==========================================================================

  async countByStatusId(statusId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(issues)
      .where(eq(issues.statusId, statusId));
    return Number(result?.count || 0);
  }

  async countByResolutionId(resolutionId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(issues)
      .where(eq(issues.resolutionId, resolutionId));
    return Number(result?.count || 0);
  }

  async countByProjectId(projectId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(issues)
      .where(eq(issues.projectId, projectId));
    return Number(result?.count || 0);
  }

  async countByIssueTypeId(issueTypeId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(issues)
      .where(eq(issues.issueTypeId, issueTypeId));
    return Number(result?.count || 0);
  }

  // ==========================================================================
  // RANKING / ORDERING
  // ==========================================================================

  /**
   * Update the rank of an issue
   */
  async updateRank(id: string, rank: string) {
    const [updated] = await db
      .update(issues)
      .set({ rank, updatedAt: new Date() })
      .where(eq(issues.id, id))
      .returning();
    return updated;
  }

  /**
   * Get the first issue rank in a project (for inserting at top)
   */
  async getFirstRankInProject(projectId: string): Promise<string | null> {
    const result = await db.query.issues.findFirst({
      where: and(
        eq(issues.projectId, projectId),
        sql`${issues.rank} IS NOT NULL`,
      ),
      orderBy: asc(issues.rank),
      columns: { rank: true },
    });
    return result?.rank || null;
  }

  /**
   * Get the last issue rank in a project (for inserting at bottom)
   */
  async getLastRankInProject(projectId: string): Promise<string | null> {
    const result = await db.query.issues.findFirst({
      where: and(
        eq(issues.projectId, projectId),
        sql`${issues.rank} IS NOT NULL`,
      ),
      orderBy: desc(issues.rank),
      columns: { rank: true },
    });
    return result?.rank || null;
  }

  /**
   * Get issues ordered by rank for a project
   */
  async findByProjectOrderedByRank(projectId: string, limit = 100) {
    return db.query.issues.findMany({
      where: eq(issues.projectId, projectId),
      orderBy: [asc(issues.rank), asc(issues.createdAt)],
      limit,
      with: {
        issueType: { columns: { id: true, name: true, icon: true } },
        status: true,
        assignee: {
          columns: { id: true, name: true, email: true, image: true },
        },
      },
    });
  }

  /**
   * Get adjacent issues for reordering (previous and next by rank)
   */
  async getAdjacentIssueRanks(
    projectId: string,
    targetRank: string,
  ): Promise<{ prevRank: string | null; nextRank: string | null }> {
    // Get issue just before target rank
    const prev = await db.query.issues.findFirst({
      where: and(
        eq(issues.projectId, projectId),
        sql`${issues.rank} < ${targetRank}`,
      ),
      orderBy: desc(issues.rank),
      columns: { rank: true },
    });

    // Get issue just after target rank
    const next = await db.query.issues.findFirst({
      where: and(
        eq(issues.projectId, projectId),
        sql`${issues.rank} > ${targetRank}`,
      ),
      orderBy: asc(issues.rank),
      columns: { rank: true },
    });

    return {
      prevRank: prev?.rank || null,
      nextRank: next?.rank || null,
    };
  }

  /**
   * Bulk update ranks for multiple issues
   */
  async bulkUpdateRanks(updates: { id: string; rank: string }[]) {
    // Use a transaction for consistency
    return db.transaction(async (tx) => {
      const results = [];
      for (const { id, rank } of updates) {
        const [updated] = await tx
          .update(issues)
          .set({ rank, updatedAt: new Date() })
          .where(eq(issues.id, id))
          .returning();
        results.push(updated);
      }
      return results;
    });
  }
}
