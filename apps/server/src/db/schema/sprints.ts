import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { projects } from './projects';
import { issues } from './issues';
import { user } from './auth';

// =====================================================
// SPRINT STATUS ENUM
// =====================================================

/**
 * Sprint durumları
 * - planned: Planlanan, henüz başlamamış
 * - active: Aktif sprint
 * - completed: Tamamlanmış
 * - cancelled: İptal edilmiş
 */
export const SPRINT_STATUSES = [
  'planned',
  'active',
  'completed',
  'cancelled',
] as const;
export type SprintStatus = (typeof SPRINT_STATUSES)[number];

// Sprint history action types
export const SPRINT_HISTORY_ACTIONS = [
  'sprint_created',
  'sprint_started',
  'sprint_completed',
  'sprint_cancelled',
  'sprint_updated',
  'issue_added',
  'issue_removed',
  'issue_completed',
  'goal_updated',
  'dates_updated',
] as const;
export type SprintHistoryAction = (typeof SPRINT_HISTORY_ACTIONS)[number];

// =====================================================
// SPRINTS TABLE
// =====================================================

/**
 * Sprint tablosu
 * Her project birden fazla sprint'e sahip olabilir
 * Aynı anda sadece bir sprint active olabilir
 */
export const sprints = pgTable(
  'sprints',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // Project relationship
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),

    // Sprint info
    name: text('name').notNull(),
    goal: text('goal'), // Sprint hedefi

    // Dates
    startDate: timestamp('start_date'),
    endDate: timestamp('end_date'),

    // Status
    status: text('status').$type<SprintStatus>().notNull().default('planned'),

    // Completion info
    completedAt: timestamp('completed_at'),
    completedById: text('completed_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),

    // Sprint metrics (calculated and stored for historical reference)
    metrics: jsonb('metrics').$type<{
      // Planned at sprint start
      plannedPoints?: number;
      plannedIssueCount?: number;

      // Completed at sprint end
      completedPoints?: number;
      completedIssueCount?: number;

      // Added during sprint
      addedPoints?: number;
      addedIssueCount?: number;

      // Removed during sprint
      removedPoints?: number;
      removedIssueCount?: number;

      // Velocity (story points per sprint)
      velocity?: number;
    }>(),

    // Ordering within project
    sortOrder: integer('sort_order').notNull().default(0),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),

    // Optimistic concurrency control
    version: integer('version').notNull().default(1),

    // Audit fields
    createdById: text('created_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    updatedBy: text('updated_by').references(() => user.id, {
      onDelete: 'set null',
    }),
  },
  (table) => [
    index('sprints_project_id_idx').on(table.projectId),
    index('sprints_status_idx').on(table.status),
    index('sprints_project_status_idx').on(table.projectId, table.status),
  ],
);

// =====================================================
// SPRINT ISSUES TABLE (Junction)
// =====================================================

/**
 * Sprint-Issue ilişki tablosu
 * Bir issue aynı anda sadece bir sprint'te olabilir
 * Backlog: sprintId null olan issue'lar
 */
export const sprintIssues = pgTable(
  'sprint_issues',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    sprintId: text('sprint_id')
      .notNull()
      .references(() => sprints.id, { onDelete: 'cascade' }),

    issueId: text('issue_id')
      .notNull()
      .references(() => issues.id, { onDelete: 'cascade' }),

    // Position within sprint backlog (legacy integer)
    position: integer('position').notNull().default(0),

    // LexoRank for sprint ordering (new - preferred over position)
    // Allows insertion between any two items without rebalancing
    rank: text('rank'),

    // When added to sprint (for tracking scope changes)
    addedAt: timestamp('added_at').defaultNow().notNull(),
    addedById: text('added_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),

    // Story points at time of addition (snapshot)
    storyPointsSnapshot: integer('story_points_snapshot'),
  },
  (table) => [
    // Her issue sadece bir sprint'te olabilir
    unique('sprint_issues_issue_unique').on(table.issueId),
    index('sprint_issues_sprint_id_idx').on(table.sprintId),
    index('sprint_issues_position_idx').on(table.sprintId, table.position),
    index('sprint_issues_rank_idx').on(table.sprintId, table.rank),
  ],
);

// =====================================================
// SPRINT HISTORY TABLE
// =====================================================

/**
 * Sprint değişiklik geçmişi
 * Issue eklenme/çıkarılma, status değişiklikleri
 */
export const sprintHistory = pgTable(
  'sprint_history',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    sprintId: text('sprint_id')
      .notNull()
      .references(() => sprints.id, { onDelete: 'cascade' }),

    // Action type (uses exported SprintHistoryAction type)
    action: text('action').$type<SprintHistoryAction>().notNull(),

    // Related issue (for issue_added, issue_removed, issue_completed)
    issueId: text('issue_id').references(() => issues.id, {
      onDelete: 'set null',
    }),

    // Change details
    data: jsonb('data').$type<{
      oldValue?: unknown;
      newValue?: unknown;
      storyPoints?: number;
      reason?: string;
    }>(),

    // Who made the change
    performedById: text('performed_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('sprint_history_sprint_id_idx').on(table.sprintId),
    index('sprint_history_created_at_idx').on(table.createdAt),
  ],
);

// =====================================================
// BURNDOWN DATA TABLE
// =====================================================

/**
 * Burndown chart verileri
 * Her gün için remaining work snapshot
 */
export const sprintBurndown = pgTable(
  'sprint_burndown',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    sprintId: text('sprint_id')
      .notNull()
      .references(() => sprints.id, { onDelete: 'cascade' }),

    // Date for this data point
    date: timestamp('date').notNull(),

    // Metrics at this point
    remainingPoints: integer('remaining_points').notNull().default(0),
    remainingIssueCount: integer('remaining_issue_count').notNull().default(0),
    completedPoints: integer('completed_points').notNull().default(0),
    completedIssueCount: integer('completed_issue_count').notNull().default(0),

    // Ideal burndown line value
    idealRemainingPoints: integer('ideal_remaining_points'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    // Her sprint için her gün tek kayıt
    unique('sprint_burndown_sprint_date_unique').on(table.sprintId, table.date),
    index('sprint_burndown_sprint_id_idx').on(table.sprintId),
  ],
);

// =====================================================
// RELATIONS
// =====================================================

export const sprintsRelations = relations(sprints, ({ one, many }) => ({
  project: one(projects, {
    fields: [sprints.projectId],
    references: [projects.id],
  }),
  createdBy: one(user, {
    fields: [sprints.createdById],
    references: [user.id],
    relationName: 'sprintCreator',
  }),
  completedBy: one(user, {
    fields: [sprints.completedById],
    references: [user.id],
    relationName: 'sprintCompleter',
  }),
  sprintIssues: many(sprintIssues),
  history: many(sprintHistory),
  burndown: many(sprintBurndown),
}));

export const sprintIssuesRelations = relations(sprintIssues, ({ one }) => ({
  sprint: one(sprints, {
    fields: [sprintIssues.sprintId],
    references: [sprints.id],
  }),
  issue: one(issues, {
    fields: [sprintIssues.issueId],
    references: [issues.id],
  }),
  addedBy: one(user, {
    fields: [sprintIssues.addedById],
    references: [user.id],
  }),
}));

export const sprintHistoryRelations = relations(sprintHistory, ({ one }) => ({
  sprint: one(sprints, {
    fields: [sprintHistory.sprintId],
    references: [sprints.id],
  }),
  issue: one(issues, {
    fields: [sprintHistory.issueId],
    references: [issues.id],
  }),
  performedBy: one(user, {
    fields: [sprintHistory.performedById],
    references: [user.id],
  }),
}));

export const sprintBurndownRelations = relations(sprintBurndown, ({ one }) => ({
  sprint: one(sprints, {
    fields: [sprintBurndown.sprintId],
    references: [sprints.id],
  }),
}));
