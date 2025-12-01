import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { projects } from './projects';
import { user } from './auth';
import { fields } from './field';

// =============================================================================
// BOARDS - Board tanımları
// =============================================================================

/**
 * Boards - Scrum and Kanban board definitions
 *
 * Each board belongs to a project and displays issues in a visual format.
 */
export const boards = pgTable(
  'boards',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    description: text('description'),

    // Board type: scrum or kanban
    type: text('type').notNull(), // 'scrum' | 'kanban'

    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),

    // JQL filter for the board (determines which issues appear)
    filterJql: text('filter_jql'),

    // Board settings (JSON for flexibility)
    // e.g., { enableBacklog: true, enableSprints: true, ... }
    settings: jsonb('settings').notNull().default({}),

    // Owner of the board
    ownerId: text('owner_id').references(() => user.id, {
      onDelete: 'set null',
    }),

    isDefault: boolean('is_default').default(false).notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    projectIdIdx: index('boards_project_id_idx').on(table.projectId),
    ownerIdIdx: index('boards_owner_id_idx').on(table.ownerId),
  }),
);

// =============================================================================
// BOARD COLUMNS - Sütun tanımları
// =============================================================================

/**
 * Board Columns - Visual columns on the board
 *
 * Each column can contain one or more statuses.
 * WIP limits can be set to enforce workflow constraints.
 */
export const boardColumns = pgTable(
  'board_columns',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    boardId: text('board_id')
      .notNull()
      .references(() => boards.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),

    // Status IDs that map to this column (JSON array)
    statusIds: jsonb('status_ids').notNull().default([]),

    position: integer('position').notNull().default(0),

    // WIP limits
    minIssues: integer('min_issues'),
    maxIssues: integer('max_issues'),

    // What happens when WIP limit is exceeded
    constraintType: text('constraint_type').notNull().default('none'), // 'none' | 'warn' | 'block'

    // Column appearance
    color: text('color'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    boardIdIdx: index('board_columns_board_id_idx').on(table.boardId),
  }),
);

// =============================================================================
// BOARD SWIMLANES - Yüzme şeritleri
// =============================================================================

/**
 * Board Swimlanes - Horizontal groupings on the board
 *
 * Issues can be grouped by assignee, epic, priority, etc.
 */
export const boardSwimlanes = pgTable(
  'board_swimlanes',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    boardId: text('board_id')
      .notNull()
      .references(() => boards.id, { onDelete: 'cascade' }),

    // Swimlane type
    type: text('type').notNull(), // 'none' | 'assignee' | 'epic' | 'parent' | 'priority' | 'custom_field'

    // For custom field swimlanes
    customFieldId: text('custom_field_id').references(() => fields.id, {
      onDelete: 'set null',
    }),

    // Additional settings (e.g., grouping options)
    settings: jsonb('settings').notNull().default({}),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    boardIdIdx: index('board_swimlanes_board_id_idx').on(table.boardId),
    uniqueBoardSwimlane: unique('board_swimlanes_unique').on(table.boardId),
  }),
);

// =============================================================================
// BOARD QUICK FILTERS - Hızlı filtreler
// =============================================================================

/**
 * Board Quick Filters - One-click filters for the board
 *
 * Users can toggle these filters to quickly narrow down visible issues.
 */
export const boardQuickFilters = pgTable(
  'board_quick_filters',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    boardId: text('board_id')
      .notNull()
      .references(() => boards.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),

    // JQL filter expression
    jql: text('jql').notNull(),

    position: integer('position').notNull().default(0),

    // Is this filter enabled by default?
    isDefault: boolean('is_default').default(false).notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    boardIdIdx: index('board_quick_filters_board_id_idx').on(table.boardId),
  }),
);

// =============================================================================
// BOARD CARD LAYOUTS - Kart görünüm ayarları
// =============================================================================

/**
 * Board Card Layouts - How issue cards appear on the board
 *
 * Defines which fields are visible on cards and card coloring.
 */
export const boardCardLayouts = pgTable(
  'board_card_layouts',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    boardId: text('board_id')
      .notNull()
      .references(() => boards.id, { onDelete: 'cascade' }),

    // Field used for card coloring (e.g., priority, issue type)
    cardColorFieldId: text('card_color_field_id').references(() => fields.id, {
      onDelete: 'set null',
    }),

    // Color mapping for the field values (JSON object)
    // e.g., { "high": "#ff0000", "medium": "#ffff00", "low": "#00ff00" }
    cardColorMapping: jsonb('card_color_mapping').notNull().default({}),

    // Fields visible on the card (JSON array of field IDs)
    visibleFields: jsonb('visible_fields').notNull().default([]),

    // Display options
    showAvatar: boolean('show_avatar').default(true).notNull(),
    showPriority: boolean('show_priority').default(true).notNull(),
    showIssueType: boolean('show_issue_type').default(true).notNull(),
    showLabels: boolean('show_labels').default(false).notNull(),
    showDueDate: boolean('show_due_date').default(false).notNull(),
    showEstimate: boolean('show_estimate').default(false).notNull(),

    // Card size
    cardSize: text('card_size').notNull().default('medium'), // 'compact' | 'medium' | 'detailed'

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    uniqueBoardLayout: unique('board_card_layouts_unique').on(table.boardId),
  }),
);

// =============================================================================
// BOARD USER SETTINGS - Kullanıcı tercihleri
// =============================================================================

/**
 * Board User Settings - Per-user board preferences
 *
 * Stores user-specific settings like collapsed swimlanes and active filters.
 */
export const boardUserSettings = pgTable(
  'board_user_settings',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    boardId: text('board_id')
      .notNull()
      .references(() => boards.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    // Collapsed swimlane IDs (JSON array)
    collapsedSwimlanes: jsonb('collapsed_swimlanes').notNull().default([]),

    // Active quick filter IDs (JSON array)
    activeQuickFilters: jsonb('active_quick_filters').notNull().default([]),

    // Collapsed column IDs (JSON array)
    collapsedColumns: jsonb('collapsed_columns').notNull().default([]),

    // Last viewed at (for "My recent boards")
    lastViewedAt: timestamp('last_viewed_at'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    boardIdIdx: index('board_user_settings_board_id_idx').on(table.boardId),
    userIdIdx: index('board_user_settings_user_id_idx').on(table.userId),
    uniqueBoardUser: unique('board_user_settings_unique').on(
      table.boardId,
      table.userId,
    ),
  }),
);

// =============================================================================
// RELATIONS
// =============================================================================

export const boardRelations = relations(boards, ({ one, many }) => ({
  project: one(projects, {
    fields: [boards.projectId],
    references: [projects.id],
  }),
  owner: one(user, {
    fields: [boards.ownerId],
    references: [user.id],
  }),
  columns: many(boardColumns),
  swimlane: many(boardSwimlanes),
  quickFilters: many(boardQuickFilters),
  cardLayout: many(boardCardLayouts),
  userSettings: many(boardUserSettings),
}));

export const boardColumnRelations = relations(boardColumns, ({ one }) => ({
  board: one(boards, {
    fields: [boardColumns.boardId],
    references: [boards.id],
  }),
}));

export const boardSwimlaneRelations = relations(boardSwimlanes, ({ one }) => ({
  board: one(boards, {
    fields: [boardSwimlanes.boardId],
    references: [boards.id],
  }),
  customField: one(fields, {
    fields: [boardSwimlanes.customFieldId],
    references: [fields.id],
  }),
}));

export const boardQuickFilterRelations = relations(
  boardQuickFilters,
  ({ one }) => ({
    board: one(boards, {
      fields: [boardQuickFilters.boardId],
      references: [boards.id],
    }),
  }),
);

export const boardCardLayoutRelations = relations(
  boardCardLayouts,
  ({ one }) => ({
    board: one(boards, {
      fields: [boardCardLayouts.boardId],
      references: [boards.id],
    }),
    cardColorField: one(fields, {
      fields: [boardCardLayouts.cardColorFieldId],
      references: [fields.id],
    }),
  }),
);

export const boardUserSettingsRelations = relations(
  boardUserSettings,
  ({ one }) => ({
    board: one(boards, {
      fields: [boardUserSettings.boardId],
      references: [boards.id],
    }),
    user: one(user, {
      fields: [boardUserSettings.userId],
      references: [user.id],
    }),
  }),
);

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type Board = typeof boards.$inferSelect;
export type NewBoard = typeof boards.$inferInsert;

export type BoardColumn = typeof boardColumns.$inferSelect;
export type NewBoardColumn = typeof boardColumns.$inferInsert;

export type BoardSwimlane = typeof boardSwimlanes.$inferSelect;
export type NewBoardSwimlane = typeof boardSwimlanes.$inferInsert;

export type BoardQuickFilter = typeof boardQuickFilters.$inferSelect;
export type NewBoardQuickFilter = typeof boardQuickFilters.$inferInsert;

export type BoardCardLayout = typeof boardCardLayouts.$inferSelect;
export type NewBoardCardLayout = typeof boardCardLayouts.$inferInsert;

export type BoardUserSettings = typeof boardUserSettings.$inferSelect;
export type NewBoardUserSettings = typeof boardUserSettings.$inferInsert;

// Board types
export type BoardType = 'scrum' | 'kanban';
export type ColumnConstraintType = 'none' | 'warn' | 'block';
export type SwimlaneType =
  | 'none'
  | 'assignee'
  | 'epic'
  | 'parent'
  | 'priority'
  | 'custom_field';
export type CardSize = 'compact' | 'medium' | 'detailed';

// Board settings type
export interface BoardSettings {
  enableBacklog?: boolean;
  enableSprints?: boolean;
  enableEstimation?: boolean;
  estimationField?: string; // Field ID for story points etc.
  defaultQuickFilterId?: string;
  rankFieldId?: string; // LexoRank field
}
