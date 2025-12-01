import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth';

// =============================================================================
// ENUMS
// =============================================================================

/**
 * Filter share types
 * - private: Only owner can see
 * - group: Shared with specific groups
 * - project: Shared with project members
 * - public: Anyone can see
 */
export const filterShareTypeEnum = pgEnum('filter_share_type', [
  'private',
  'group',
  'project',
  'public',
]);

/**
 * Filter subscription schedule
 */
export const filterSubscriptionScheduleEnum = pgEnum(
  'filter_subscription_schedule',
  ['daily', 'weekly', 'monthly'],
);

// =============================================================================
// TABLES
// =============================================================================

/**
 * Saved filters (saved JQL queries)
 * Users can save JQL queries for later use
 */
export const filters = pgTable(
  'filters',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),

    // JQL query string
    jql: text('jql').notNull(),

    // Ownership
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    // Sharing settings
    shareType: filterShareTypeEnum('share_type').default('private').notNull(),

    // Shared with specific groups (array of group IDs)
    sharedGroups: jsonb('shared_groups').$type<string[]>().default([]),

    // Shared with specific projects (array of project IDs)
    sharedProjects: jsonb('shared_projects').$type<string[]>().default([]),

    // Statistics
    favoriteCount: integer('favorite_count').default(0).notNull(),

    // For ordering
    position: integer('position').default(0).notNull(),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('filters_owner_idx').on(table.ownerId),
    index('filters_share_type_idx').on(table.shareType),
  ],
);

/**
 * User favorite filters
 * Tracks which filters users have favorited
 */
export const filterFavorites = pgTable(
  'filter_favorites',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    filterId: uuid('filter_id')
      .notNull()
      .references(() => filters.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('filter_favorites_unique_idx').on(table.filterId, table.userId),
    index('filter_favorites_user_idx').on(table.userId),
  ],
);

/**
 * Filter subscriptions (scheduled delivery of filter results)
 * Users can subscribe to receive filter results via email
 */
export const filterSubscriptions = pgTable(
  'filter_subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    filterId: uuid('filter_id')
      .notNull()
      .references(() => filters.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    // Schedule configuration
    schedule: filterSubscriptionScheduleEnum('schedule')
      .default('daily')
      .notNull(),

    // Delivery tracking
    lastSentAt: timestamp('last_sent_at'),
    isEnabled: boolean('is_enabled').default(true).notNull(),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('filter_subscriptions_unique_idx').on(
      table.filterId,
      table.userId,
    ),
    index('filter_subscriptions_user_idx').on(table.userId),
    index('filter_subscriptions_schedule_idx').on(
      table.schedule,
      table.isEnabled,
    ),
  ],
);

/**
 * Recent filters per user
 * Tracks recently used/viewed filters for quick access
 */
export const filterRecentlyViewed = pgTable(
  'filter_recently_viewed',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    filterId: uuid('filter_id')
      .notNull()
      .references(() => filters.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    lastViewedAt: timestamp('last_viewed_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('filter_recently_viewed_unique_idx').on(
      table.filterId,
      table.userId,
    ),
    index('filter_recently_viewed_user_idx').on(table.userId),
  ],
);

// =============================================================================
// RELATIONS
// =============================================================================

export const filtersRelations = relations(filters, ({ one, many }) => ({
  owner: one(user, {
    fields: [filters.ownerId],
    references: [user.id],
  }),
  favorites: many(filterFavorites),
  subscriptions: many(filterSubscriptions),
  recentlyViewed: many(filterRecentlyViewed),
}));

export const filterFavoritesRelations = relations(
  filterFavorites,
  ({ one }) => ({
    filter: one(filters, {
      fields: [filterFavorites.filterId],
      references: [filters.id],
    }),
    user: one(user, {
      fields: [filterFavorites.userId],
      references: [user.id],
    }),
  }),
);

export const filterSubscriptionsRelations = relations(
  filterSubscriptions,
  ({ one }) => ({
    filter: one(filters, {
      fields: [filterSubscriptions.filterId],
      references: [filters.id],
    }),
    user: one(user, {
      fields: [filterSubscriptions.userId],
      references: [user.id],
    }),
  }),
);

export const filterRecentlyViewedRelations = relations(
  filterRecentlyViewed,
  ({ one }) => ({
    filter: one(filters, {
      fields: [filterRecentlyViewed.filterId],
      references: [filters.id],
    }),
    user: one(user, {
      fields: [filterRecentlyViewed.userId],
      references: [user.id],
    }),
  }),
);

// =============================================================================
// TYPES
// =============================================================================

export type Filter = typeof filters.$inferSelect;
export type NewFilter = typeof filters.$inferInsert;
export type FilterFavorite = typeof filterFavorites.$inferSelect;
export type NewFilterFavorite = typeof filterFavorites.$inferInsert;
export type FilterSubscription = typeof filterSubscriptions.$inferSelect;
export type NewFilterSubscription = typeof filterSubscriptions.$inferInsert;
export type FilterRecentlyViewed = typeof filterRecentlyViewed.$inferSelect;
export type NewFilterRecentlyViewed = typeof filterRecentlyViewed.$inferInsert;
export type FilterShareType = (typeof filterShareTypeEnum.enumValues)[number];
export type FilterSubscriptionSchedule =
  (typeof filterSubscriptionScheduleEnum.enumValues)[number];
