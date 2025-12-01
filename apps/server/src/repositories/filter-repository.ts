import {
  filters,
  filterFavorites,
  filterSubscriptions,
  filterRecentlyViewed,
  type Filter,
  type NewFilter,
  type FilterFavorite,
  type NewFilterFavorite,
  type FilterSubscription,
  type NewFilterSubscription,
  type FilterRecentlyViewed,
  type FilterShareType,
  type FilterSubscriptionSchedule,
} from '@/db/schema/filters';
import { user } from '@/db/schema/auth';
import { db } from '@/db';
import { eq, and, or, desc, asc, sql, inArray } from 'drizzle-orm';
import type { DrizzleClientOrTransaction } from '@/lib/types/db';

// =============================================================================
// FILTER REPOSITORY
// =============================================================================

export const filterRepository = (drizzle: DrizzleClientOrTransaction = db) => ({
  // ---------------------------------------------------------------------------
  // FILTERS CRUD
  // ---------------------------------------------------------------------------

  /**
   * Find all filters accessible by a user
   */
  findAccessibleFilters: (
    userId: string,
    groupIds: string[] = [],
    projectIds: string[] = [],
  ) =>
    drizzle.query.filters.findMany({
      where: or(
        // Owner
        eq(filters.ownerId, userId),
        // Public
        eq(filters.shareType, 'public'),
        // Shared with user's groups
        groupIds.length > 0
          ? and(
              eq(filters.shareType, 'group'),
              sql`${filters.sharedGroups} && ARRAY[${sql.join(
                groupIds.map((g) => sql`${g}`),
                sql`, `,
              )}]::text[]`,
            )
          : undefined,
        // Shared with user's projects
        projectIds.length > 0
          ? and(
              eq(filters.shareType, 'project'),
              sql`${filters.sharedProjects} && ARRAY[${sql.join(
                projectIds.map((p) => sql`${p}`),
                sql`, `,
              )}]::text[]`,
            )
          : undefined,
      ),
      orderBy: [desc(filters.updatedAt)],
      with: {
        owner: {
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
   * Find filters owned by a user
   */
  findByOwner: (ownerId: string) =>
    drizzle.query.filters.findMany({
      where: eq(filters.ownerId, ownerId),
      orderBy: [asc(filters.position), desc(filters.updatedAt)],
      with: {
        owner: {
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
   * Find a filter by ID
   */
  findById: (id: string) =>
    drizzle.query.filters.findFirst({
      where: eq(filters.id, id),
      with: {
        owner: {
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
   * Create a new filter
   */
  create: async (data: NewFilter) => {
    const [result] = await drizzle.insert(filters).values(data).returning();
    return result;
  },

  /**
   * Update a filter
   */
  update: async (id: string, data: Partial<NewFilter>) => {
    const [result] = await drizzle
      .update(filters)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(filters.id, id))
      .returning();
    return result;
  },

  /**
   * Delete a filter
   */
  delete: async (id: string) => {
    const [result] = await drizzle
      .delete(filters)
      .where(eq(filters.id, id))
      .returning();
    return result;
  },

  /**
   * Increment favorite count
   */
  incrementFavoriteCount: async (id: string) => {
    await drizzle
      .update(filters)
      .set({ favoriteCount: sql`${filters.favoriteCount} + 1` })
      .where(eq(filters.id, id));
  },

  /**
   * Decrement favorite count
   */
  decrementFavoriteCount: async (id: string) => {
    await drizzle
      .update(filters)
      .set({ favoriteCount: sql`GREATEST(${filters.favoriteCount} - 1, 0)` })
      .where(eq(filters.id, id));
  },

  // ---------------------------------------------------------------------------
  // FAVORITES
  // ---------------------------------------------------------------------------

  /**
   * Get user's favorite filters
   */
  findFavoritesByUser: (userId: string) =>
    drizzle.query.filterFavorites.findMany({
      where: eq(filterFavorites.userId, userId),
      orderBy: [desc(filterFavorites.createdAt)],
      with: {
        filter: {
          with: {
            owner: {
              columns: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    }),

  /**
   * Check if a filter is favorited by user
   */
  isFavorited: async (filterId: string, userId: string): Promise<boolean> => {
    const result = await drizzle.query.filterFavorites.findFirst({
      where: and(
        eq(filterFavorites.filterId, filterId),
        eq(filterFavorites.userId, userId),
      ),
    });
    return !!result;
  },

  /**
   * Add filter to favorites
   */
  addFavorite: async (data: NewFilterFavorite) => {
    const [result] = await drizzle
      .insert(filterFavorites)
      .values(data)
      .onConflictDoNothing()
      .returning();
    return result;
  },

  /**
   * Remove filter from favorites
   */
  removeFavorite: async (filterId: string, userId: string) => {
    const [result] = await drizzle
      .delete(filterFavorites)
      .where(
        and(
          eq(filterFavorites.filterId, filterId),
          eq(filterFavorites.userId, userId),
        ),
      )
      .returning();
    return result;
  },

  // ---------------------------------------------------------------------------
  // SUBSCRIPTIONS
  // ---------------------------------------------------------------------------

  /**
   * Get user's filter subscriptions
   */
  findSubscriptionsByUser: (userId: string) =>
    drizzle.query.filterSubscriptions.findMany({
      where: eq(filterSubscriptions.userId, userId),
      with: {
        filter: {
          with: {
            owner: {
              columns: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    }),

  /**
   * Get subscriptions for a filter
   */
  findSubscriptionsByFilter: (filterId: string) =>
    drizzle.query.filterSubscriptions.findMany({
      where: eq(filterSubscriptions.filterId, filterId),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),

  /**
   * Get active subscriptions by schedule (for cron jobs)
   */
  findActiveSubscriptionsBySchedule: (schedule: FilterSubscriptionSchedule) =>
    drizzle.query.filterSubscriptions.findMany({
      where: and(
        eq(filterSubscriptions.schedule, schedule),
        eq(filterSubscriptions.isEnabled, true),
      ),
      with: {
        filter: true,
        user: {
          columns: {
            id: true,
            email: true,
          },
        },
      },
    }),

  /**
   * Get user's subscription for a filter
   */
  findSubscription: (filterId: string, userId: string) =>
    drizzle.query.filterSubscriptions.findFirst({
      where: and(
        eq(filterSubscriptions.filterId, filterId),
        eq(filterSubscriptions.userId, userId),
      ),
    }),

  /**
   * Create or update a subscription
   */
  upsertSubscription: async (data: NewFilterSubscription) => {
    const [result] = await drizzle
      .insert(filterSubscriptions)
      .values(data)
      .onConflictDoUpdate({
        target: [filterSubscriptions.filterId, filterSubscriptions.userId],
        set: {
          schedule: data.schedule,
          isEnabled: data.isEnabled,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  },

  /**
   * Delete a subscription
   */
  deleteSubscription: async (filterId: string, userId: string) => {
    const [result] = await drizzle
      .delete(filterSubscriptions)
      .where(
        and(
          eq(filterSubscriptions.filterId, filterId),
          eq(filterSubscriptions.userId, userId),
        ),
      )
      .returning();
    return result;
  },

  /**
   * Update last sent time
   */
  updateLastSent: async (id: string) => {
    await drizzle
      .update(filterSubscriptions)
      .set({ lastSentAt: new Date() })
      .where(eq(filterSubscriptions.id, id));
  },

  // ---------------------------------------------------------------------------
  // RECENTLY VIEWED
  // ---------------------------------------------------------------------------

  /**
   * Get user's recently viewed filters
   */
  findRecentlyViewedByUser: (userId: string, limit: number = 10) =>
    drizzle.query.filterRecentlyViewed.findMany({
      where: eq(filterRecentlyViewed.userId, userId),
      orderBy: [desc(filterRecentlyViewed.lastViewedAt)],
      limit,
      with: {
        filter: {
          with: {
            owner: {
              columns: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    }),

  /**
   * Record filter view
   */
  recordView: async (filterId: string, userId: string) => {
    await drizzle
      .insert(filterRecentlyViewed)
      .values({ filterId, userId })
      .onConflictDoUpdate({
        target: [filterRecentlyViewed.filterId, filterRecentlyViewed.userId],
        set: { lastViewedAt: new Date() },
      });
  },

  /**
   * Clear old recently viewed entries (keep last N)
   */
  cleanupRecentlyViewed: async (userId: string, keepCount: number = 50) => {
    // Get IDs to keep
    const toKeep = await drizzle
      .select({ id: filterRecentlyViewed.id })
      .from(filterRecentlyViewed)
      .where(eq(filterRecentlyViewed.userId, userId))
      .orderBy(desc(filterRecentlyViewed.lastViewedAt))
      .limit(keepCount);

    const keepIds = toKeep.map((r) => r.id);

    if (keepIds.length > 0) {
      await drizzle.delete(filterRecentlyViewed).where(
        and(
          eq(filterRecentlyViewed.userId, userId),
          sql`${filterRecentlyViewed.id} NOT IN (${sql.join(
            keepIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        ),
      );
    }
  },

  // ---------------------------------------------------------------------------
  // SEARCH
  // ---------------------------------------------------------------------------

  /**
   * Search filters by name
   */
  searchByName: (
    userId: string,
    query: string,
    groupIds: string[] = [],
    projectIds: string[] = [],
  ) =>
    drizzle.query.filters.findMany({
      where: and(
        sql`${filters.name} ILIKE ${`%${query}%`}`,
        or(
          eq(filters.ownerId, userId),
          eq(filters.shareType, 'public'),
          groupIds.length > 0
            ? and(
                eq(filters.shareType, 'group'),
                sql`${filters.sharedGroups} && ARRAY[${sql.join(
                  groupIds.map((g) => sql`${g}`),
                  sql`, `,
                )}]::text[]`,
              )
            : undefined,
          projectIds.length > 0
            ? and(
                eq(filters.shareType, 'project'),
                sql`${filters.sharedProjects} && ARRAY[${sql.join(
                  projectIds.map((p) => sql`${p}`),
                  sql`, `,
                )}]::text[]`,
              )
            : undefined,
        ),
      ),
      orderBy: [desc(filters.favoriteCount), desc(filters.updatedAt)],
      limit: 20,
      with: {
        owner: {
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    }),

  // ---------------------------------------------------------------------------
  // POPULAR FILTERS
  // ---------------------------------------------------------------------------

  /**
   * Get popular public filters
   */
  findPopularFilters: (limit: number = 10) =>
    drizzle.query.filters.findMany({
      where: eq(filters.shareType, 'public'),
      orderBy: [desc(filters.favoriteCount)],
      limit,
      with: {
        owner: {
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    }),
});

// =============================================================================
// CLASS-BASED REPOSITORY (for DI)
// =============================================================================

export class FilterRepository {
  constructor(private drizzle: DrizzleClientOrTransaction = db) {}

  findById(id: string) {
    return filterRepository(this.drizzle).findById(id);
  }

  findByOwner(ownerId: string) {
    return filterRepository(this.drizzle).findByOwner(ownerId);
  }

  create(data: NewFilter) {
    return filterRepository(this.drizzle).create(data);
  }

  update(id: string, data: Partial<NewFilter>) {
    return filterRepository(this.drizzle).update(id, data);
  }

  delete(id: string) {
    return filterRepository(this.drizzle).delete(id);
  }
}
