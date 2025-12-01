import { relations } from 'drizzle-orm';
import {
  index,
  pgTable,
  text,
  timestamp,
  boolean,
  unique,
} from 'drizzle-orm/pg-core';

import { user } from './auth';

// ============================================================================
// GROUPS
// ============================================================================

/**
 * User groups for organizing users
 * Similar to Jira groups - used for permissions, notifications, security levels
 */
export const groups = pgTable(
  'groups',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    /**
     * Group name (unique, lowercase)
     */
    name: text('name').notNull().unique(),

    /**
     * Display name
     */
    displayName: text('display_name').notNull(),

    /**
     * Group description
     */
    description: text('description'),

    /**
     * System group - cannot be deleted or renamed
     * Examples: jira-administrators, jira-users
     */
    isSystem: boolean('is_system').default(false).notNull(),

    /**
     * Active status - inactive groups are hidden from UI
     */
    isActive: boolean('is_active').default(true).notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('groups_name_idx').on(table.name),
    index('groups_is_active_idx').on(table.isActive),
  ],
);

// ============================================================================
// GROUP MEMBERS
// ============================================================================

/**
 * Group membership - users belong to groups
 */
export const groupMembers = pgTable(
  'group_members',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    /**
     * Reference to group
     */
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),

    /**
     * Reference to user
     */
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    /**
     * User who added this member
     */
    addedBy: text('added_by').references(() => user.id, {
      onDelete: 'set null',
    }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    // User can only be in a group once
    unique('group_members_unique').on(table.groupId, table.userId),
    index('group_members_group_idx').on(table.groupId),
    index('group_members_user_idx').on(table.userId),
  ],
);

// ============================================================================
// RELATIONS
// ============================================================================

export const groupsRelations = relations(groups, ({ many }) => ({
  members: many(groupMembers),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
  user: one(user, {
    fields: [groupMembers.userId],
    references: [user.id],
  }),
  addedByUser: one(user, {
    fields: [groupMembers.addedBy],
    references: [user.id],
    relationName: 'addedByUser',
  }),
}));

// ============================================================================
// TYPES
// ============================================================================

export type Group = typeof groups.$inferSelect;
export type InsertGroup = typeof groups.$inferInsert;

export type GroupMember = typeof groupMembers.$inferSelect;
export type InsertGroupMember = typeof groupMembers.$inferInsert;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type GroupWithMembers = Group & {
  members: (GroupMember & {
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
  })[];
};

export type GroupWithMemberCount = Group & {
  memberCount: number;
};
