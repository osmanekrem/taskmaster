import { z } from "zod";

// =====================================================
// NOTIFICATION TYPES
// =====================================================

/**
 * All possible notification event types
 */
export const notificationTypes = [
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
] as const;

export const notificationTypeSchema = z.enum(notificationTypes);

/**
 * Notification delivery channels
 */
export const notificationChannels = ["in_app", "email", "push"] as const;
export const notificationChannelSchema = z.enum(notificationChannels);

/**
 * Watch reasons
 */
export const watchReasons = [
	"manual",
	"auto_created",
	"auto_assigned",
	"auto_mentioned",
	"auto_commented",
] as const;
export const watchReasonSchema = z.enum(watchReasons);

/**
 * Digest frequencies
 */
export const digestFrequencies = ["none", "daily", "weekly"] as const;
export const digestFrequencySchema = z.enum(digestFrequencies);

// =====================================================
// NOTIFICATION DATA SCHEMAS
// =====================================================

/**
 * Notification data payload schema (flexible)
 */
export const notificationDataSchema = z
	.object({
		// Issue context
		issueKey: z.string().optional(),
		issueTitle: z.string().optional(),
		projectKey: z.string().optional(),
		projectName: z.string().optional(),

		// Status transition context
		oldStatus: z.string().optional(),
		newStatus: z.string().optional(),

		// Comment context
		commentPreview: z.string().optional(),
		parentCommentPreview: z.string().optional(),

		// Actor context
		actorName: z.string().optional(),
		actorEmail: z.string().optional(),
		actorImage: z.string().optional(),

		// Assignment context
		previousAssignee: z.string().optional(),
		newAssignee: z.string().optional(),

		// Field change context
		changedFields: z
			.array(
				z.object({
					field: z.string(),
					oldValue: z.string().optional(),
					newValue: z.string().optional(),
				}),
			)
			.optional(),

		// Mention context
		mentionedIn: z.enum(["issue", "comment"]).optional(),

		// URLs
		issueUrl: z.string().optional(),
		commentUrl: z.string().optional(),
	})
	.passthrough(); // Allow additional properties

// =====================================================
// WATCHER SCHEMAS
// =====================================================

/**
 * Watcher response schema
 */
export const watcherSchema = z.object({
	id: z.string().uuid(),
	issueId: z.string().uuid(),
	userId: z.string(),
	watchReason: watchReasonSchema,
	isMuted: z.boolean(),
	createdAt: z.date(),
	user: z
		.object({
			id: z.string(),
			name: z.string().nullable(),
			email: z.string(),
			image: z.string().nullable(),
		})
		.optional(),
});

/**
 * Add watcher input
 */
export const addWatcherSchema = z.object({
	issueId: z.string().uuid(),
	userId: z.string().optional(), // If not provided, add current user
	reason: watchReasonSchema.optional().default("manual"),
});

/**
 * Remove watcher input
 */
export const removeWatcherSchema = z.object({
	issueId: z.string().uuid(),
	userId: z.string().optional(), // If not provided, remove current user
});

/**
 * Toggle mute for watcher
 */
export const toggleMuteWatcherSchema = z.object({
	issueId: z.string().uuid(),
	isMuted: z.boolean(),
});

/**
 * Get watchers for issue
 */
export const getIssueWatchersSchema = z.object({
	issueId: z.string().uuid(),
});

/**
 * Get issues user is watching
 */
export const getWatchedIssuesSchema = z.object({
	userId: z.string().optional(), // If not provided, use current user
	includeIssueDetails: z.boolean().optional().default(true),
	page: z.number().min(1).optional().default(1),
	limit: z.number().min(1).max(100).optional().default(20),
});

/**
 * Bulk watch/unwatch
 */
export const bulkWatchSchema = z.object({
	issueIds: z.array(z.string().uuid()).min(1).max(50),
	action: z.enum(["watch", "unwatch"]),
});

// =====================================================
// NOTIFICATION SCHEMAS
// =====================================================

/**
 * Notification response schema
 */
export const notificationSchema = z.object({
	id: z.string().uuid(),
	userId: z.string(),
	type: notificationTypeSchema,
	title: z.string(),
	content: z.string().nullable(),
	data: notificationDataSchema,
	issueId: z.string().uuid().nullable(),
	commentId: z.string().uuid().nullable(),
	actorId: z.string().nullable(),
	isRead: z.boolean(),
	readAt: z.date().nullable(),
	isArchived: z.boolean(),
	archivedAt: z.date().nullable(),
	groupKey: z.string().nullable(),
	createdAt: z.date(),
	// Joined relations
	actor: z
		.object({
			id: z.string(),
			name: z.string().nullable(),
			email: z.string(),
			image: z.string().nullable(),
		})
		.nullable()
		.optional(),
	issue: z
		.object({
			id: z.string().uuid(),
			key: z.string(),
			title: z.string(),
		})
		.nullable()
		.optional(),
});

/**
 * Get user notifications
 */
export const getNotificationsSchema = z.object({
	/**
	 * Filter by read status
	 */
	isRead: z.boolean().optional(),
	/**
	 * Filter by notification type
	 */
	type: notificationTypeSchema.optional(),
	/**
	 * Filter by issue
	 */
	issueId: z.string().uuid().optional(),
	/**
	 * Include archived notifications
	 */
	includeArchived: z.boolean().optional().default(false),
	/**
	 * Only notifications from specific date
	 */
	since: z.date().optional(),
	/**
	 * Pagination
	 */
	page: z.number().min(1).optional().default(1),
	limit: z.number().min(1).max(100).optional().default(20),
});

/**
 * Paginated notifications response
 */
export const getNotificationsPaginatedSchema = z.object({
	data: z.array(notificationSchema),
	total: z.number(),
	page: z.number(),
	limit: z.number(),
	hasMore: z.boolean(),
});

/**
 * Mark notification as read
 */
export const markNotificationReadSchema = z.object({
	notificationId: z.string().uuid(),
});

/**
 * Mark multiple notifications as read
 */
export const markNotificationsReadSchema = z.object({
	notificationIds: z.array(z.string().uuid()).min(1).max(100),
});

/**
 * Mark all notifications as read
 */
export const markAllNotificationsReadSchema = z.object({
	/**
	 * Only mark notifications of specific type
	 */
	type: notificationTypeSchema.optional(),
	/**
	 * Only mark notifications from specific issue
	 */
	issueId: z.string().uuid().optional(),
	/**
	 * Only mark notifications before this date
	 */
	before: z.date().optional(),
});

/**
 * Archive notification
 */
export const archiveNotificationSchema = z.object({
	notificationId: z.string().uuid(),
});

/**
 * Archive multiple notifications
 */
export const archiveNotificationsSchema = z.object({
	notificationIds: z.array(z.string().uuid()).min(1).max(100),
});

/**
 * Delete old notifications (cleanup)
 */
export const deleteOldNotificationsSchema = z.object({
	/**
	 * Delete notifications older than this date
	 */
	olderThan: z.date(),
	/**
	 * Only delete archived notifications
	 */
	archivedOnly: z.boolean().optional().default(true),
});

/**
 * Get unread count
 */
export const getUnreadCountSchema = z.object({
	/**
	 * Group by notification type
	 */
	byType: z.boolean().optional().default(false),
});

export const unreadCountResponseSchema = z.object({
	total: z.number(),
	byType: z
		.record(notificationTypeSchema, z.number())
		.optional(),
});

// =====================================================
// NOTIFICATION PREFERENCE SCHEMAS
// =====================================================

/**
 * Notification preference schema
 */
export const notificationPreferenceSchema = z.object({
	id: z.string().uuid(),
	userId: z.string(),
	channel: notificationChannelSchema,
	eventType: notificationTypeSchema,
	isEnabled: z.boolean(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

/**
 * Get user preferences
 */
export const getUserPreferencesSchema = z.object({
	channel: notificationChannelSchema.optional(),
});

/**
 * Update single preference
 */
export const updatePreferenceSchema = z.object({
	channel: notificationChannelSchema,
	eventType: notificationTypeSchema,
	isEnabled: z.boolean(),
});

/**
 * Bulk update preferences
 */
export const bulkUpdatePreferencesSchema = z.object({
	preferences: z
		.array(
			z.object({
				channel: notificationChannelSchema,
				eventType: notificationTypeSchema,
				isEnabled: z.boolean(),
			}),
		)
		.min(1)
		.max(100),
});

/**
 * Enable/disable all for a channel
 */
export const toggleChannelPreferencesSchema = z.object({
	channel: notificationChannelSchema,
	isEnabled: z.boolean(),
});

// =====================================================
// DIGEST SETTINGS SCHEMAS
// =====================================================

/**
 * Digest settings schema
 */
export const digestSettingsSchema = z.object({
	id: z.string().uuid(),
	userId: z.string(),
	frequency: digestFrequencySchema,
	preferredHour: z.number().min(0).max(23),
	preferredDay: z.number().min(0).max(6),
	timezone: z.string(),
	lastDigestAt: z.date().nullable(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

/**
 * Update digest settings
 */
export const updateDigestSettingsSchema = z.object({
	frequency: digestFrequencySchema.optional(),
	preferredHour: z.number().min(0).max(23).optional(),
	preferredDay: z.number().min(0).max(6).optional(),
	timezone: z.string().optional(),
});

// =====================================================
// CREATE NOTIFICATION SCHEMA (Internal use)
// =====================================================

/**
 * Create notification input (used by services internally)
 */
export const createNotificationSchema = z.object({
	userId: z.string(),
	type: notificationTypeSchema,
	title: z.string().min(1).max(200),
	content: z.string().max(1000).optional(),
	data: notificationDataSchema.optional(),
	issueId: z.string().uuid().optional(),
	commentId: z.string().uuid().optional(),
	actorId: z.string().optional(),
	groupKey: z.string().optional(),
});

/**
 * Create multiple notifications (batch)
 */
export const createBatchNotificationsSchema = z.object({
	notifications: z.array(createNotificationSchema).min(1).max(100),
});

// =====================================================
// TYPE EXPORTS
// =====================================================

export type NotificationType = z.infer<typeof notificationTypeSchema>;
export type NotificationChannel = z.infer<typeof notificationChannelSchema>;
export type WatchReason = z.infer<typeof watchReasonSchema>;
export type DigestFrequency = z.infer<typeof digestFrequencySchema>;
export type NotificationData = z.infer<typeof notificationDataSchema>;

export type Watcher = z.infer<typeof watcherSchema>;
export type AddWatcher = z.infer<typeof addWatcherSchema>;
export type RemoveWatcher = z.infer<typeof removeWatcherSchema>;
export type ToggleMuteWatcher = z.infer<typeof toggleMuteWatcherSchema>;
export type GetIssueWatchers = z.infer<typeof getIssueWatchersSchema>;
export type GetWatchedIssues = z.infer<typeof getWatchedIssuesSchema>;
export type BulkWatch = z.infer<typeof bulkWatchSchema>;

export type Notification = z.infer<typeof notificationSchema>;
export type GetNotifications = z.infer<typeof getNotificationsSchema>;
export type MarkNotificationRead = z.infer<typeof markNotificationReadSchema>;
export type MarkNotificationsRead = z.infer<typeof markNotificationsReadSchema>;
export type MarkAllNotificationsRead = z.infer<typeof markAllNotificationsReadSchema>;
export type ArchiveNotification = z.infer<typeof archiveNotificationSchema>;
export type ArchiveNotifications = z.infer<typeof archiveNotificationsSchema>;
export type GetUnreadCount = z.infer<typeof getUnreadCountSchema>;
export type UnreadCountResponse = z.infer<typeof unreadCountResponseSchema>;

export type NotificationPreference = z.infer<typeof notificationPreferenceSchema>;
export type UpdatePreference = z.infer<typeof updatePreferenceSchema>;
export type BulkUpdatePreferences = z.infer<typeof bulkUpdatePreferencesSchema>;
export type ToggleChannelPreferences = z.infer<typeof toggleChannelPreferencesSchema>;

export type DigestSettings = z.infer<typeof digestSettingsSchema>;
export type UpdateDigestSettings = z.infer<typeof updateDigestSettingsSchema>;

export type CreateNotification = z.infer<typeof createNotificationSchema>;
export type CreateBatchNotifications = z.infer<typeof createBatchNotificationsSchema>;
