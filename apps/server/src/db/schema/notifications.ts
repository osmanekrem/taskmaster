import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { issues } from "./issues";
import { issueComments } from "./comments";

// =====================================================
// ENUMS
// =====================================================

/**
 * Notification event types
 * Comprehensive list of events that can trigger notifications
 */
export const notificationTypeEnum = pgEnum("notification_type", [
	// Issue events
	"issue_assigned",
	"issue_unassigned",
	"issue_mentioned",
	"issue_status_changed",
	"issue_updated",
	"issue_commented",
	"issue_created",
	"issue_deleted",
	// Comment events
	"comment_replied",
	"comment_mentioned",
	"comment_reaction_added",
	// Watcher events
	"watching_issue_updated",
	"watching_issue_commented",
	"watching_issue_status_changed",
	// Assignment events
	"added_as_watcher",
	"removed_as_watcher",
]);

/**
 * Notification delivery channels
 */
export const notificationChannelEnum = pgEnum("notification_channel", [
	"in_app",
	"email",
	"push", // Future: mobile push notifications
]);

// =====================================================
// ISSUE WATCHERS
// =====================================================

/**
 * Issue Watchers Junction Table
 * Users who want to be notified about issue activities
 */
export const issueWatchers = pgTable(
	"issue_watchers",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		issueId: text("issue_id")
			.notNull()
			.references(() => issues.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		/**
		 * How the user started watching:
		 * - manual: User explicitly clicked "Watch"
		 * - auto_created: User created the issue
		 * - auto_assigned: User was assigned to the issue
		 * - auto_mentioned: User was mentioned in issue or comment
		 * - auto_commented: User commented on the issue
		 */
		watchReason: text("watch_reason").notNull().default("manual"),

		/**
		 * Whether notifications are muted for this watch
		 * User can watch but temporarily mute notifications
		 */
		isMuted: boolean("is_muted").notNull().default(false),

		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [
		// Each user can only watch an issue once
		unique("issue_watchers_unique").on(table.issueId, table.userId),
		// Find all watchers for an issue
		index("issue_watchers_issue_id_idx").on(table.issueId),
		// Find all issues a user is watching
		index("issue_watchers_user_id_idx").on(table.userId),
	],
);

export const issueWatchersRelations = relations(issueWatchers, ({ one }) => ({
	issue: one(issues, {
		fields: [issueWatchers.issueId],
		references: [issues.id],
	}),
	user: one(user, {
		fields: [issueWatchers.userId],
		references: [user.id],
	}),
}));

// =====================================================
// NOTIFICATIONS
// =====================================================

/**
 * Notifications Table
 * Stores all notifications sent to users
 */
export const notifications = pgTable(
	"notifications",
	{
		id: uuid("id").primaryKey().defaultRandom(),

		/**
		 * The user who receives this notification
		 */
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		/**
		 * Type of notification event
		 */
		type: notificationTypeEnum("type").notNull(),

		/**
		 * Title for the notification (short)
		 */
		title: text("title").notNull(),

		/**
		 * Main content/message of the notification
		 */
		content: text("content"),

		/**
		 * Flexible data payload
		 * Contains context-specific information like:
		 * - issueKey, issueTitle for issue notifications
		 * - commentPreview for comment notifications
		 * - oldStatus, newStatus for transition notifications
		 * - actorName, actorEmail for who triggered the event
		 */
		data: jsonb("data").$type<NotificationData>().notNull().default({}),

		/**
		 * Related issue (optional but common)
		 */
		issueId: text("issue_id").references(() => issues.id, {
			onDelete: "set null",
		}),

		/**
		 * Related comment (for comment-specific notifications)
		 */
		commentId: text("comment_id").references(() => issueComments.id, {
			onDelete: "set null",
		}),

		/**
		 * User who triggered this notification
		 * Null for system-generated notifications
		 */
		actorId: text("actor_id").references(() => user.id, {
			onDelete: "set null",
		}),

		/**
		 * Read status tracking
		 */
		isRead: boolean("is_read").notNull().default(false),
		readAt: timestamp("read_at"),

		/**
		 * Archived notifications (for cleanup but keeping history)
		 */
		isArchived: boolean("is_archived").notNull().default(false),
		archivedAt: timestamp("archived_at"),

		/**
		 * For grouping related notifications (e.g., multiple updates to same issue)
		 */
		groupKey: text("group_key"),

		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => [
		// Primary query: User's unread notifications
		index("notifications_user_unread_idx").on(table.userId, table.isRead),
		// User's notifications by type
		index("notifications_user_type_idx").on(table.userId, table.type),
		// Find notifications for an issue
		index("notifications_issue_id_idx").on(table.issueId),
		// Find notifications by group (for batching/deduping)
		index("notifications_group_key_idx").on(table.groupKey),
		// Cleanup old read/archived notifications
		index("notifications_archived_idx").on(table.isArchived, table.createdAt),
	],
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
	user: one(user, {
		fields: [notifications.userId],
		references: [user.id],
		relationName: "notificationRecipient",
	}),
	actor: one(user, {
		fields: [notifications.actorId],
		references: [user.id],
		relationName: "notificationActor",
	}),
	issue: one(issues, {
		fields: [notifications.issueId],
		references: [issues.id],
	}),
	comment: one(issueComments, {
		fields: [notifications.commentId],
		references: [issueComments.id],
	}),
}));

// =====================================================
// NOTIFICATION PREFERENCES
// =====================================================

/**
 * User notification preferences
 * Controls which events trigger notifications via which channels
 */
export const notificationPreferences = pgTable(
	"notification_preferences",
	{
		id: uuid("id").primaryKey().defaultRandom(),

		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),

		/**
		 * Delivery channel this preference applies to
		 */
		channel: notificationChannelEnum("channel").notNull(),

		/**
		 * Event type this preference applies to
		 */
		eventType: notificationTypeEnum("event_type").notNull(),

		/**
		 * Whether notifications are enabled for this channel/event combo
		 */
		isEnabled: boolean("is_enabled").notNull().default(true),

		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => [
		// Each user has one preference per channel/event combo
		unique("notification_preferences_unique").on(
			table.userId,
			table.channel,
			table.eventType,
		),
		// Find all preferences for a user
		index("notification_preferences_user_idx").on(table.userId),
	],
);

export const notificationPreferencesRelations = relations(
	notificationPreferences,
	({ one }) => ({
		user: one(user, {
			fields: [notificationPreferences.userId],
			references: [user.id],
		}),
	}),
);

// =====================================================
// NOTIFICATION DIGEST SETTINGS
// =====================================================

/**
 * User digest settings
 * For email digests (daily/weekly summaries)
 */
export const notificationDigestSettings = pgTable(
	"notification_digest_settings",
	{
		id: uuid("id").primaryKey().defaultRandom(),

		userId: text("user_id")
			.notNull()
			.unique()
			.references(() => user.id, { onDelete: "cascade" }),

		/**
		 * Digest frequency
		 * - none: No digest, only real-time notifications
		 * - daily: Once per day summary
		 * - weekly: Once per week summary
		 */
		frequency: text("frequency").notNull().default("none"),

		/**
		 * Preferred hour for daily digest (0-23)
		 */
		preferredHour: integer("preferred_hour").notNull().default(9),

		/**
		 * Preferred day for weekly digest (0=Sunday, 6=Saturday)
		 */
		preferredDay: integer("preferred_day").notNull().default(1),

		/**
		 * Timezone for digest delivery
		 */
		timezone: text("timezone").notNull().default("UTC"),

		/**
		 * Last time a digest was sent
		 */
		lastDigestAt: timestamp("last_digest_at"),

		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
);

export const notificationDigestSettingsRelations = relations(
	notificationDigestSettings,
	({ one }) => ({
		user: one(user, {
			fields: [notificationDigestSettings.userId],
			references: [user.id],
		}),
	}),
);

// =====================================================
// TYPES
// =====================================================

/**
 * Flexible notification data payload
 */
export interface NotificationData {
	// Issue context
	issueKey?: string;
	issueTitle?: string;
	projectKey?: string;
	projectName?: string;

	// Status transition context
	oldStatus?: string;
	newStatus?: string;

	// Comment context
	commentPreview?: string;
	parentCommentPreview?: string;

	// Actor context (who triggered)
	actorName?: string;
	actorEmail?: string;
	actorImage?: string;

	// Assignment context
	previousAssignee?: string;
	newAssignee?: string;

	// Field change context
	changedFields?: Array<{
		field: string;
		oldValue?: string;
		newValue?: string;
	}>;

	// Mention context
	mentionedIn?: "issue" | "comment";

	// URLs for navigation
	issueUrl?: string;
	commentUrl?: string;

	// Custom data for extensibility
	[key: string]: unknown;
}

/**
 * Watch reasons
 */
export type WatchReason =
	| "manual"
	| "auto_created"
	| "auto_assigned"
	| "auto_mentioned"
	| "auto_commented";

/**
 * Notification type values
 */
export type NotificationType = (typeof notificationTypeEnum.enumValues)[number];

/**
 * Notification channel values
 */
export type NotificationChannel =
	(typeof notificationChannelEnum.enumValues)[number];

/**
 * Digest frequency
 */
export type DigestFrequency = "none" | "daily" | "weekly";
