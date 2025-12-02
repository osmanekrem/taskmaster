// =============================================================================
// ISSUE LINKS SCHEMA
// Issue linking system (blocks, clones, duplicates, relates to, etc.)
// =============================================================================

import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { issues } from './issues';
import { user } from './auth';

// =============================================================================
// ISSUE LINK TYPES
// =============================================================================

/**
 * Issue link types define the relationship between linked issues
 * Examples: Blocks/is blocked by, Clones/is cloned by, Duplicates/is duplicated by
 */
export const issueLinkTypes = pgTable('issue_link_types', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),

  // Type names
  name: varchar('name', { length: 100 }).notNull().unique(),

  // Directional names (how the link reads from each direction)
  inwardName: varchar('inward_name', { length: 100 }).notNull(), // "is blocked by"
  outwardName: varchar('outward_name', { length: 100 }).notNull(), // "blocks"

  // Optional description
  description: text('description'),

  // System link types cannot be deleted
  isSystem: boolean('is_system').default(false),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// =============================================================================
// ISSUE LINKS
// =============================================================================

/**
 * Links between issues
 * source_issue -> outward_name -> target_issue
 * target_issue -> inward_name -> source_issue
 */
export const issueLinks = pgTable(
  'issue_links',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // Link type
    linkTypeId: text('link_type_id')
      .notNull()
      .references(() => issueLinkTypes.id, { onDelete: 'restrict' }),

    // Source issue (outward)
    sourceIssueId: text('source_issue_id')
      .notNull()
      .references(() => issues.id, { onDelete: 'cascade' }),

    // Target issue (inward)
    targetIssueId: text('target_issue_id')
      .notNull()
      .references(() => issues.id, { onDelete: 'cascade' }),

    // Who created the link
    createdBy: text('created_by').references(() => user.id, {
      onDelete: 'set null',
    }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // Indexes for querying links by issue
    index('issue_links_source_issue_idx').on(table.sourceIssueId),
    index('issue_links_target_issue_idx').on(table.targetIssueId),
    index('issue_links_link_type_idx').on(table.linkTypeId),

    // Prevent duplicate links (same source, target, type)
    unique('issue_links_unique').on(
      table.sourceIssueId,
      table.targetIssueId,
      table.linkTypeId,
    ),
  ],
);

// =============================================================================
// RELATIONS
// =============================================================================

export const issueLinkTypesRelations = relations(
  issueLinkTypes,
  ({ many }) => ({
    links: many(issueLinks),
  }),
);

export const issueLinksRelations = relations(issueLinks, ({ one }) => ({
  linkType: one(issueLinkTypes, {
    fields: [issueLinks.linkTypeId],
    references: [issueLinkTypes.id],
  }),
  sourceIssue: one(issues, {
    fields: [issueLinks.sourceIssueId],
    references: [issues.id],
    relationName: 'outwardLinks',
  }),
  targetIssue: one(issues, {
    fields: [issueLinks.targetIssueId],
    references: [issues.id],
    relationName: 'inwardLinks',
  }),
  creator: one(user, {
    fields: [issueLinks.createdBy],
    references: [user.id],
  }),
}));

// =============================================================================
// TYPES
// =============================================================================

export type IssueLinkType = typeof issueLinkTypes.$inferSelect;
export type NewIssueLinkType = typeof issueLinkTypes.$inferInsert;
export type IssueLink = typeof issueLinks.$inferSelect;
export type NewIssueLink = typeof issueLinks.$inferInsert;

// Default link types
export const DEFAULT_LINK_TYPES = [
  {
    name: 'Blocks',
    inwardName: 'is blocked by',
    outwardName: 'blocks',
    description: 'Issue blocks another issue from progressing',
    isSystem: true,
  },
  {
    name: 'Clones',
    inwardName: 'is cloned by',
    outwardName: 'clones',
    description: 'Issue is a clone of another issue',
    isSystem: true,
  },
  {
    name: 'Duplicates',
    inwardName: 'is duplicated by',
    outwardName: 'duplicates',
    description: 'Issue is a duplicate of another issue',
    isSystem: true,
  },
  {
    name: 'Relates',
    inwardName: 'relates to',
    outwardName: 'relates to',
    description: 'Issue is related to another issue',
    isSystem: true,
  },
  {
    name: 'Causes',
    inwardName: 'is caused by',
    outwardName: 'causes',
    description: 'Issue causes another issue',
    isSystem: true,
  },
  {
    name: 'Parent-Child',
    inwardName: 'is child of',
    outwardName: 'is parent of',
    description: 'Parent-child relationship between issues',
    isSystem: true,
  },
] as const;
