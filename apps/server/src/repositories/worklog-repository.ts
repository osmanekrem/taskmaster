import {
  worklogs,
  issueTimeTracking,
  timeTrackingSettings,
  type Worklog,
  type NewWorklog,
  type IssueTimeTracking,
  type NewIssueTimeTracking,
  type TimeTrackingSettings,
  type NewTimeTrackingSettings,
} from '@/db/schema/time-tracking';
import { issues } from '@/db/schema/issues';
import { user } from '@/db/schema/auth';
import { db } from '@/db';
import { eq, and, desc, asc, sql, gte, lte, between } from 'drizzle-orm';
import type { DrizzleClientOrTransaction } from '@/lib/types/db';

// =============================================================================
// WORKLOG REPOSITORY
// =============================================================================

export const worklogRepository = (
  drizzle: DrizzleClientOrTransaction = db,
) => ({
  // ---------------------------------------------------------------------------
  // WORKLOGS CRUD
  // ---------------------------------------------------------------------------

  /**
   * Find all worklogs for an issue
   */
  findByIssue: (issueId: string) =>
    drizzle.query.worklogs.findMany({
      where: eq(worklogs.issueId, issueId),
      orderBy: [desc(worklogs.startedAt)],
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    }),

  /**
   * Find all worklogs by a user
   */
  findByUser: (userId: string, options?: { limit?: number; offset?: number }) =>
    drizzle.query.worklogs.findMany({
      where: eq(worklogs.userId, userId),
      orderBy: [desc(worklogs.startedAt)],
      limit: options?.limit,
      offset: options?.offset,
      with: {
        issue: {
          columns: {
            id: true,
            key: true,
            summary: true,
          },
        },
      },
    }),

  /**
   * Find worklogs in a date range
   */
  findByDateRange: (
    startDate: Date,
    endDate: Date,
    filters?: { userId?: string; issueId?: string; projectId?: string },
  ) => {
    const conditions = [between(worklogs.startedAt, startDate, endDate)];

    if (filters?.userId) {
      conditions.push(eq(worklogs.userId, filters.userId));
    }

    if (filters?.issueId) {
      conditions.push(eq(worklogs.issueId, filters.issueId));
    }

    return drizzle.query.worklogs.findMany({
      where: and(...conditions),
      orderBy: [desc(worklogs.startedAt)],
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        issue: {
          columns: {
            id: true,
            key: true,
            summary: true,
            projectId: true,
          },
        },
      },
    });
  },

  /**
   * Find a worklog by ID
   */
  findById: (id: string) =>
    drizzle.query.worklogs.findFirst({
      where: eq(worklogs.id, id),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        issue: {
          columns: {
            id: true,
            key: true,
            summary: true,
          },
        },
      },
    }),

  /**
   * Create a new worklog
   */
  create: async (data: NewWorklog) => {
    const [result] = await drizzle.insert(worklogs).values(data).returning();
    return result;
  },

  /**
   * Update a worklog
   */
  update: async (id: string, data: Partial<NewWorklog>) => {
    const [result] = await drizzle
      .update(worklogs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(worklogs.id, id))
      .returning();
    return result;
  },

  /**
   * Delete a worklog
   */
  delete: async (id: string) => {
    const [result] = await drizzle
      .delete(worklogs)
      .where(eq(worklogs.id, id))
      .returning();
    return result;
  },

  /**
   * Get total time spent on an issue
   */
  getTotalTimeSpent: async (issueId: string): Promise<number> => {
    const result = await drizzle
      .select({
        total: sql<number>`COALESCE(SUM(${worklogs.timeSpentSeconds}), 0)::int`,
      })
      .from(worklogs)
      .where(eq(worklogs.issueId, issueId));
    return result[0]?.total || 0;
  },

  /**
   * Get time spent by user on an issue
   */
  getTimeSpentByUser: async (
    issueId: string,
    userId: string,
  ): Promise<number> => {
    const result = await drizzle
      .select({
        total: sql<number>`COALESCE(SUM(${worklogs.timeSpentSeconds}), 0)::int`,
      })
      .from(worklogs)
      .where(and(eq(worklogs.issueId, issueId), eq(worklogs.userId, userId)));
    return result[0]?.total || 0;
  },

  /**
   * Get worklog summary by user for date range
   */
  getSummaryByUser: async (userId: string, startDate: Date, endDate: Date) => {
    const result = await drizzle
      .select({
        totalTimeSpent: sql<number>`COALESCE(SUM(${worklogs.timeSpentSeconds}), 0)::int`,
        worklogCount: sql<number>`COUNT(*)::int`,
        issueCount: sql<number>`COUNT(DISTINCT ${worklogs.issueId})::int`,
      })
      .from(worklogs)
      .where(
        and(
          eq(worklogs.userId, userId),
          between(worklogs.startedAt, startDate, endDate),
        ),
      );
    return result[0];
  },

  // ---------------------------------------------------------------------------
  // ISSUE TIME TRACKING
  // ---------------------------------------------------------------------------

  /**
   * Get time tracking for an issue
   */
  getIssueTimeTracking: async (
    issueId: string,
  ): Promise<IssueTimeTracking | null> => {
    const result = await drizzle.query.issueTimeTracking.findFirst({
      where: eq(issueTimeTracking.issueId, issueId),
    });
    return result ?? null;
  },

  /**
   * Create or update issue time tracking
   */
  upsertIssueTimeTracking: async (data: NewIssueTimeTracking) => {
    const [result] = await drizzle
      .insert(issueTimeTracking)
      .values(data)
      .onConflictDoUpdate({
        target: [issueTimeTracking.issueId],
        set: {
          originalEstimateSeconds: data.originalEstimateSeconds,
          remainingEstimateSeconds: data.remainingEstimateSeconds,
          timeSpentSeconds: data.timeSpentSeconds,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  },

  /**
   * Update time spent (increment)
   */
  incrementTimeSpent: async (issueId: string, seconds: number) => {
    await drizzle
      .update(issueTimeTracking)
      .set({
        timeSpentSeconds: sql`${issueTimeTracking.timeSpentSeconds} + ${seconds}`,
        updatedAt: new Date(),
      })
      .where(eq(issueTimeTracking.issueId, issueId));
  },

  /**
   * Decrease time spent (for worklog deletion)
   */
  decrementTimeSpent: async (issueId: string, seconds: number) => {
    await drizzle
      .update(issueTimeTracking)
      .set({
        timeSpentSeconds: sql`GREATEST(${issueTimeTracking.timeSpentSeconds} - ${seconds}, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(issueTimeTracking.issueId, issueId));
  },

  /**
   * Update remaining estimate
   */
  updateRemainingEstimate: async (issueId: string, seconds: number) => {
    await drizzle
      .update(issueTimeTracking)
      .set({
        remainingEstimateSeconds: seconds,
        updatedAt: new Date(),
      })
      .where(eq(issueTimeTracking.issueId, issueId));
  },

  /**
   * Recalculate time spent from worklogs
   */
  recalculateTimeSpent: async (issueId: string) => {
    const total = await worklogRepository(drizzle).getTotalTimeSpent(issueId);
    await drizzle
      .update(issueTimeTracking)
      .set({
        timeSpentSeconds: total,
        updatedAt: new Date(),
      })
      .where(eq(issueTimeTracking.issueId, issueId));
    return total;
  },

  // ---------------------------------------------------------------------------
  // TIME TRACKING SETTINGS
  // ---------------------------------------------------------------------------

  /**
   * Get settings for a project (or global default)
   */
  getSettings: async (
    projectId?: string,
  ): Promise<TimeTrackingSettings | null> => {
    // Try project-specific first
    if (projectId) {
      const projectSettings =
        await drizzle.query.timeTrackingSettings.findFirst({
          where: eq(timeTrackingSettings.projectId, projectId),
        });
      if (projectSettings) return projectSettings;
    }

    // Fall back to global default (projectId = null)
    const globalSettings = await drizzle.query.timeTrackingSettings.findFirst({
      where: sql`${timeTrackingSettings.projectId} IS NULL`,
    });
    return globalSettings ?? null;
  },

  /**
   * Create or update settings
   */
  upsertSettings: async (data: NewTimeTrackingSettings) => {
    const [result] = await drizzle
      .insert(timeTrackingSettings)
      .values(data)
      .onConflictDoUpdate({
        target: [timeTrackingSettings.projectId],
        set: {
          workingHoursPerDay: data.workingHoursPerDay,
          workingDaysPerWeek: data.workingDaysPerWeek,
          defaultTimeUnit: data.defaultTimeUnit,
          copyEstimateToRemaining: data.copyEstimateToRemaining,
          activityTypes: data.activityTypes,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  },

  /**
   * Delete project settings
   */
  deleteSettings: async (projectId: string) => {
    const [result] = await drizzle
      .delete(timeTrackingSettings)
      .where(eq(timeTrackingSettings.projectId, projectId))
      .returning();
    return result;
  },
});

// =============================================================================
// CLASS-BASED REPOSITORY (for DI)
// =============================================================================

export class WorklogRepository {
  constructor(private drizzle: DrizzleClientOrTransaction = db) {}

  findById(id: string) {
    return worklogRepository(this.drizzle).findById(id);
  }

  findByIssue(issueId: string) {
    return worklogRepository(this.drizzle).findByIssue(issueId);
  }

  findByUser(userId: string, options?: { limit?: number; offset?: number }) {
    return worklogRepository(this.drizzle).findByUser(userId, options);
  }

  create(data: NewWorklog) {
    return worklogRepository(this.drizzle).create(data);
  }

  update(id: string, data: Partial<NewWorklog>) {
    return worklogRepository(this.drizzle).update(id, data);
  }

  delete(id: string) {
    return worklogRepository(this.drizzle).delete(id);
  }
}
