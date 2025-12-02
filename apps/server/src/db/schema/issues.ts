import {
  pgTable,
  text,
  timestamp,
  jsonb,
  integer,
  index,
  unique,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { user } from './auth';
import { projects } from './projects';
import { issueTypes } from './issue-types';
import { statuses, resolutions } from './statuses';
import { fields } from './field';
import { securityLevels } from './security';

// =============================================================================
// ISSUES - Ana issue tablosu
// =============================================================================

export const issues = pgTable(
  'issues',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // Issue Key (DEMO-1, TASK-42, etc.)
    key: text('key').notNull().unique(),
    issueNumber: integer('issue_number').notNull(), // Proje içindeki sıra numarası

    // Project & Type
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    issueTypeId: text('issue_type_id')
      .notNull()
      .references(() => issueTypes.id, { onDelete: 'restrict' }),

    // Status & Resolution
    statusId: text('status_id')
      .notNull()
      .references(() => statuses.id, { onDelete: 'restrict' }),
    resolutionId: text('resolution_id').references(() => resolutions.id, {
      onDelete: 'set null',
    }),

    // Security Level (for issue-level security)
    securityLevelId: text('security_level_id').references(
      () => securityLevels.id,
      { onDelete: 'set null' },
    ),

    // People
    reporterId: text('reporter_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    assigneeId: text('assignee_id').references(() => user.id, {
      onDelete: 'set null',
    }),

    // Hierarchy (for subtasks and epic linking)
    parentId: text('parent_id').references((): any => issues.id, {
      onDelete: 'cascade',
    }),
    epicId: text('epic_id').references((): any => issues.id, {
      onDelete: 'set null',
    }),

    // =============================================================================
    // RANKING - LexoRank for ordering
    // =============================================================================
    // LexoRank format: "0|hzzzzz:" - allows insertion between any two items
    // without rebalancing the entire list
    rank: text('rank'), // Global backlog rank within project

    // =============================================================================
    // DENORMALIZED CACHE FIELDS (synced from field_values for performance)
    // =============================================================================
    // These fields are cached copies of dynamic field values for:
    // 1. Fast queries (no JOIN needed)
    // 2. Sprint analytics (SUM, COUNT operations)
    // 3. List/Board views (frequently accessed)
    // Source of truth is still field_values - these are auto-synced
    summary: text('summary'), // Cache: "Summary" field
    description: text('description'), // Cache: "Description" field
    storyPoints: integer('story_points'), // Cache: "Story Points" field
    priority: text('priority'), // Cache: "Priority" field (e.g., "highest", "high", "medium", "low", "lowest")
    labels: jsonb('labels').$type<string[]>(), // Cache: "Labels" field

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    resolvedAt: timestamp('resolved_at'),
    dueDate: timestamp('due_date'),

    // Soft delete (for trash/recovery)
    isDeleted: boolean('is_deleted').default(false),
    deletedAt: timestamp('deleted_at'),
    deletedBy: text('deleted_by').references(() => user.id, {
      onDelete: 'set null',
    }),

    // Optimistic concurrency control
    version: integer('version').notNull().default(1),

    // Audit field (reporterId serves as createdBy)
    updatedBy: text('updated_by').references(() => user.id, {
      onDelete: 'set null',
    }),
  },
  (table) => ({
    // Performance indexes
    projectIdx: index('issues_project_idx').on(table.projectId),
    statusIdx: index('issues_status_idx').on(table.statusId),
    assigneeIdx: index('issues_assignee_idx').on(table.assigneeId),
    reporterIdx: index('issues_reporter_idx').on(table.reporterId),
    parentIdx: index('issues_parent_idx').on(table.parentId),
    epicIdx: index('issues_epic_idx').on(table.epicId),
    // Security level index
    securityLevelIdx: index('issues_security_level_idx').on(
      table.securityLevelId,
    ),
    // Rank index for ordering
    rankIdx: index('issues_rank_idx').on(table.rank),
    projectRankIdx: index('issues_project_rank_idx').on(
      table.projectId,
      table.rank,
    ),
    // Composite indexes for common queries
    projectStatusIdx: index('issues_project_status_idx').on(
      table.projectId,
      table.statusId,
    ),
    projectTypeIdx: index('issues_project_type_idx').on(
      table.projectId,
      table.issueTypeId,
    ),
    // Cache field indexes
    storyPointsIdx: index('issues_story_points_idx').on(table.storyPoints),
    priorityIdx: index('issues_priority_idx').on(table.priority),
    // Unique constraint: issue number per project
    uniqueProjectIssueNumber: unique('issues_project_number_unique').on(
      table.projectId,
      table.issueNumber,
    ),
    // Text search indexes (using btree for ILIKE, GIN would need pg_trgm extension)
    summaryIdx: index('issues_summary_idx').on(table.summary),
    createdAtIdx: index('issues_created_at_idx').on(table.createdAt),
    dueDateIdx: index('issues_due_date_idx').on(table.dueDate),
  }),
);

// =============================================================================
// ISSUE FIELD VALUES - Dinamik field değerleri
// =============================================================================

// Herhangi bir field değerini saklayabilecek esnek tip
export type FieldValue =
  | string
  | number
  | boolean
  | string[] // multi-select
  | { id: string; name: string }[] // user-picker array
  | { url: string; name?: string } // url with optional name
  | null;

export const issueFieldValues = pgTable(
  'issue_field_values',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    issueId: text('issue_id')
      .notNull()
      .references(() => issues.id, { onDelete: 'cascade' }),
    fieldId: text('field_id')
      .notNull()
      .references(() => fields.id, { onDelete: 'cascade' }),

    // Value stored as JSONB for flexibility
    // Can be: string, number, boolean, array, object, null
    value: jsonb('value').$type<FieldValue>(),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    issueIdx: index('issue_field_values_issue_idx').on(table.issueId),
    fieldIdx: index('issue_field_values_field_idx').on(table.fieldId),
    // Each field can only have one value per issue
    uniqueIssueField: unique('issue_field_values_unique').on(
      table.issueId,
      table.fieldId,
    ),
  }),
);

// =============================================================================
// CHANGE GROUPS - Gruplandırılmış değişiklik kayıtları (Jira-style)
// =============================================================================

// Change action types
export const CHANGE_ACTION_TYPES = [
  'created',
  'updated',
  'transitioned',
  'assigned',
  'commented',
  'attachment_added',
  'attachment_removed',
  'linked',
  'unlinked',
  'moved',
  'cloned',
  'worklog_added',
  'worklog_updated',
  'worklog_deleted',
] as const;

export type ChangeActionType = (typeof CHANGE_ACTION_TYPES)[number];

export const changeGroups = pgTable(
  'change_groups',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    issueId: text('issue_id')
      .notNull()
      .references(() => issues.id, { onDelete: 'cascade' }),

    // Who made the change
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),

    // Action type (created, updated, transitioned, etc.)
    action: text('action').$type<ChangeActionType>().notNull(),

    // When
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    issueIdx: index('change_groups_issue_idx').on(table.issueId),
    userIdx: index('change_groups_user_idx').on(table.userId),
    createdAtIdx: index('change_groups_created_at_idx').on(table.createdAt),
    actionIdx: index('change_groups_action_idx').on(table.action),
    // Composite: Get all changes for an issue sorted by time
    issueCreatedAtIdx: index('change_groups_issue_created_at_idx').on(
      table.issueId,
      table.createdAt,
    ),
  }),
);

// =============================================================================
// CHANGE ITEMS - Bireysel field değişiklikleri
// =============================================================================

export const changeItems = pgTable(
  'change_items',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    changeGroupId: text('change_group_id')
      .notNull()
      .references(() => changeGroups.id, { onDelete: 'cascade' }),

    // What field changed
    field: text('field').notNull(), // Display name (e.g., "Status", "Assignee", "Story Points")
    fieldId: text('field_id'), // Optional: Reference to custom field ID
    fieldType: text('field_type'), // Optional: "system" | "custom"

    // Old and new values as strings for display
    oldString: text('old_string'), // Human-readable old value (e.g., "John Doe", "To Do")
    newString: text('new_string'), // Human-readable new value

    // Old and new values as IDs/raw values for programmatic use
    oldValue: text('old_value'), // Raw old value (e.g., user ID, status ID)
    newValue: text('new_value'), // Raw new value
  },
  (table) => ({
    changeGroupIdx: index('change_items_change_group_idx').on(
      table.changeGroupId,
    ),
    fieldIdx: index('change_items_field_idx').on(table.field),
  }),
);

// =============================================================================
// LEGACY: ISSUE HISTORY (Deprecated - migrate to change_groups)
// Kept for backwards compatibility during migration
// =============================================================================

export type HistoryChange = {
  field: string;
  fieldId?: string;
  oldValue: any;
  newValue: any;
};

export const issueHistory = pgTable(
  'issue_history',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    issueId: text('issue_id')
      .notNull()
      .references(() => issues.id, { onDelete: 'cascade' }),

    // Who made the change
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),

    // What changed (array of changes for batch updates)
    changes: jsonb('changes').$type<HistoryChange[]>().notNull(),

    // When
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    issueIdx: index('issue_history_issue_idx').on(table.issueId),
    userIdx: index('issue_history_user_idx').on(table.userId),
    createdAtIdx: index('issue_history_created_at_idx').on(table.createdAt),
  }),
);

// =============================================================================
// RELATIONS
// =============================================================================

export const issueRelations = relations(issues, ({ one, many }) => ({
  project: one(projects, {
    fields: [issues.projectId],
    references: [projects.id],
  }),
  issueType: one(issueTypes, {
    fields: [issues.issueTypeId],
    references: [issueTypes.id],
  }),
  status: one(statuses, {
    fields: [issues.statusId],
    references: [statuses.id],
  }),
  resolution: one(resolutions, {
    fields: [issues.resolutionId],
    references: [resolutions.id],
  }),
  reporter: one(user, {
    fields: [issues.reporterId],
    references: [user.id],
    relationName: 'reporter',
  }),
  assignee: one(user, {
    fields: [issues.assigneeId],
    references: [user.id],
    relationName: 'assignee',
  }),
  parent: one(issues, {
    fields: [issues.parentId],
    references: [issues.id],
    relationName: 'parent',
  }),
  children: many(issues, {
    relationName: 'parent',
  }),
  epic: one(issues, {
    fields: [issues.epicId],
    references: [issues.id],
    relationName: 'epic',
  }),
  epicChildren: many(issues, {
    relationName: 'epic',
  }),
  fieldValues: many(issueFieldValues),
  history: many(issueHistory),
  changeGroups: many(changeGroups),
}));

export const issueFieldValueRelations = relations(
  issueFieldValues,
  ({ one }) => ({
    issue: one(issues, {
      fields: [issueFieldValues.issueId],
      references: [issues.id],
    }),
    field: one(fields, {
      fields: [issueFieldValues.fieldId],
      references: [fields.id],
    }),
  }),
);

export const changeGroupRelations = relations(
  changeGroups,
  ({ one, many }) => ({
    issue: one(issues, {
      fields: [changeGroups.issueId],
      references: [issues.id],
    }),
    user: one(user, {
      fields: [changeGroups.userId],
      references: [user.id],
    }),
    items: many(changeItems),
  }),
);

export const changeItemRelations = relations(changeItems, ({ one }) => ({
  changeGroup: one(changeGroups, {
    fields: [changeItems.changeGroupId],
    references: [changeGroups.id],
  }),
}));

export const issueHistoryRelations = relations(issueHistory, ({ one }) => ({
  issue: one(issues, {
    fields: [issueHistory.issueId],
    references: [issues.id],
  }),
  user: one(user, {
    fields: [issueHistory.userId],
    references: [user.id],
  }),
}));

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type Issue = typeof issues.$inferSelect;
export type NewIssue = typeof issues.$inferInsert;
export type IssueFieldValue = typeof issueFieldValues.$inferSelect;
export type NewIssueFieldValue = typeof issueFieldValues.$inferInsert;
export type ChangeGroup = typeof changeGroups.$inferSelect;
export type NewChangeGroup = typeof changeGroups.$inferInsert;
export type ChangeItem = typeof changeItems.$inferSelect;
export type NewChangeItem = typeof changeItems.$inferInsert;
// Legacy types (deprecated)
export type IssueHistory = typeof issueHistory.$inferSelect;
export type NewIssueHistory = typeof issueHistory.$inferInsert;
