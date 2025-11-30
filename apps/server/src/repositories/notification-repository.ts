import { and, desc, eq, inArray, isNull, lt, sql, type SQL } from "drizzle-orm";

import { db as database } from "../db";
import {
	issueWatchers,
	notifications,
	notificationPreferences,
	notificationDigestSettings,
	type NotificationData,
	type WatchReason,
	type NotificationType,
	type NotificationChannel,
} from "../db/schema";

// =====================================================
// WATCHER REPOSITORY
// =====================================================

export class WatcherRepository {
	constructor(private db: typeof database = database) {}

	// ===== CREATE =====

	/**
	 * Add a watcher to an issue
	 */
	async addWatcher(
		issueId: string,
		userId: string,
		reason: WatchReason = "manual",
	) {
		const [watcher] = await this.db
			.insert(issueWatchers)
			.values({
				issueId,
				userId,
				watchReason: reason,
			})
			.onConflictDoNothing({
				target: [issueWatchers.issueId, issueWatchers.userId],
			})
			.returning();

		return watcher;
	}

	/**
	 * Add multiple watchers to an issue
	 */
	async addWatchersBatch(
		issueId: string,
		userIds: string[],
		reason: WatchReason = "manual",
	) {
		if (userIds.length === 0) return [];

		const values = userIds.map((userId) => ({
			issueId,
			userId,
			watchReason: reason,
		}));

		return this.db
			.insert(issueWatchers)
			.values(values)
			.onConflictDoNothing({
				target: [issueWatchers.issueId, issueWatchers.userId],
			})
			.returning();
	}

	// ===== READ =====

	/**
	 * Get all watchers for an issue
	 */
	async getIssueWatchers(issueId: string) {
		return this.db.query.issueWatchers.findMany({
			where: eq(issueWatchers.issueId, issueId),
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
			orderBy: [desc(issueWatchers.createdAt)],
		});
	}

	/**
	 * Get all issues a user is watching
	 */
	async getUserWatchedIssues(
		userId: string,
		options: {
			page?: number;
			limit?: number;
			includeIssueDetails?: boolean;
		} = {},
	) {
		const { page = 1, limit = 20, includeIssueDetails = true } = options;
		const offset = (page - 1) * limit;

		const watchList = await this.db.query.issueWatchers.findMany({
			where: eq(issueWatchers.userId, userId),
			with: includeIssueDetails
				? {
						issue: {
							columns: {
								id: true,
								key: true,
								statusId: true,
								updatedAt: true,
							},
						},
					}
				: undefined,
			orderBy: [desc(issueWatchers.createdAt)],
			limit,
			offset,
		});

		// Get total count
		const [countResult] = await this.db
			.select({ count: sql<number>`count(*)::int` })
			.from(issueWatchers)
			.where(eq(issueWatchers.userId, userId));

		return {
			data: watchList,
			total: countResult?.count ?? 0,
			page,
			limit,
			hasMore: offset + watchList.length < (countResult?.count ?? 0),
		};
	}

	/**
	 * Check if user is watching an issue
	 */
	async isWatching(issueId: string, userId: string) {
		const watcher = await this.db.query.issueWatchers.findFirst({
			where: and(
				eq(issueWatchers.issueId, issueId),
				eq(issueWatchers.userId, userId),
			),
		});
		return !!watcher;
	}

	/**
	 * Get watcher record
	 */
	async getWatcher(issueId: string, userId: string) {
		return this.db.query.issueWatchers.findFirst({
			where: and(
				eq(issueWatchers.issueId, issueId),
				eq(issueWatchers.userId, userId),
			),
		});
	}

	/**
	 * Get watcher user IDs for an issue (for notification dispatch)
	 * Excludes muted watchers
	 */
	async getActiveWatcherIds(issueId: string, excludeUserId?: string) {
		const conditions: SQL[] = [
			eq(issueWatchers.issueId, issueId),
			eq(issueWatchers.isMuted, false),
		];

		if (excludeUserId) {
			conditions.push(sql`${issueWatchers.userId} != ${excludeUserId}`);
		}

		const watchers = await this.db
			.select({ userId: issueWatchers.userId })
			.from(issueWatchers)
			.where(and(...conditions));

		return watchers.map((w) => w.userId);
	}

	// ===== UPDATE =====

	/**
	 * Toggle mute status for a watcher
	 */
	async toggleMute(issueId: string, userId: string, isMuted: boolean) {
		const [updated] = await this.db
			.update(issueWatchers)
			.set({ isMuted })
			.where(
				and(
					eq(issueWatchers.issueId, issueId),
					eq(issueWatchers.userId, userId),
				),
			)
			.returning();

		return updated;
	}

	// ===== DELETE =====

	/**
	 * Remove a watcher from an issue
	 */
	async removeWatcher(issueId: string, userId: string) {
		const [deleted] = await this.db
			.delete(issueWatchers)
			.where(
				and(
					eq(issueWatchers.issueId, issueId),
					eq(issueWatchers.userId, userId),
				),
			)
			.returning();

		return deleted;
	}

	/**
	 * Remove all watchers from an issue
	 */
	async removeAllWatchers(issueId: string) {
		return this.db
			.delete(issueWatchers)
			.where(eq(issueWatchers.issueId, issueId))
			.returning();
	}

	/**
	 * Remove user from all watched issues
	 */
	async removeUserFromAllIssues(userId: string) {
		return this.db
			.delete(issueWatchers)
			.where(eq(issueWatchers.userId, userId))
			.returning();
	}
}

// =====================================================
// NOTIFICATION REPOSITORY
// =====================================================

export class NotificationRepository {
	constructor(private db: typeof database = database) {}

	// ===== CREATE =====

	/**
	 * Create a single notification
	 */
	async create(data: {
		userId: string;
		type: NotificationType;
		title: string;
		content?: string;
		data?: NotificationData;
		issueId?: string;
		commentId?: string;
		actorId?: string;
		groupKey?: string;
	}) {
		const [notification] = await this.db
			.insert(notifications)
			.values({
				userId: data.userId,
				type: data.type,
				title: data.title,
				content: data.content ?? null,
				data: data.data ?? {},
				issueId: data.issueId ?? null,
				commentId: data.commentId ?? null,
				actorId: data.actorId ?? null,
				groupKey: data.groupKey ?? null,
			})
			.returning();

		return notification;
	}

	/**
	 * Create multiple notifications in batch
	 */
	async createBatch(
		notificationList: Array<{
			userId: string;
			type: NotificationType;
			title: string;
			content?: string;
			data?: NotificationData;
			issueId?: string;
			commentId?: string;
			actorId?: string;
			groupKey?: string;
		}>,
	) {
		if (notificationList.length === 0) return [];

		const values = notificationList.map((n) => ({
			userId: n.userId,
			type: n.type,
			title: n.title,
			content: n.content ?? null,
			data: n.data ?? {},
			issueId: n.issueId ?? null,
			commentId: n.commentId ?? null,
			actorId: n.actorId ?? null,
			groupKey: n.groupKey ?? null,
		}));

		return this.db.insert(notifications).values(values).returning();
	}

	// ===== READ =====

	/**
	 * Get notification by ID
	 */
	async getById(id: string) {
		return this.db.query.notifications.findFirst({
			where: eq(notifications.id, id),
			with: {
				actor: {
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
					},
				},
			},
		});
	}

	/**
	 * Get user notifications with filters
	 */
	async getUserNotifications(
		userId: string,
		options: {
			page?: number;
			limit?: number;
			isRead?: boolean;
			type?: NotificationType;
			issueId?: string;
			includeArchived?: boolean;
			since?: Date;
		} = {},
	) {
		const {
			page = 1,
			limit = 20,
			isRead,
			type,
			issueId,
			includeArchived = false,
			since,
		} = options;
		const offset = (page - 1) * limit;

		// Build conditions
		const conditions: SQL[] = [eq(notifications.userId, userId)];

		if (!includeArchived) {
			conditions.push(eq(notifications.isArchived, false));
		}

		if (isRead !== undefined) {
			conditions.push(eq(notifications.isRead, isRead));
		}

		if (type) {
			conditions.push(eq(notifications.type, type));
		}

		if (issueId) {
			conditions.push(eq(notifications.issueId, issueId));
		}

		if (since) {
			conditions.push(sql`${notifications.createdAt} >= ${since}`);
		}

		const whereClause = and(...conditions);

		const notificationList = await this.db.query.notifications.findMany({
			where: whereClause,
			with: {
				actor: {
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
					},
				},
			},
			orderBy: [desc(notifications.createdAt)],
			limit,
			offset,
		});

		// Get total count
		const [countResult] = await this.db
			.select({ count: sql<number>`count(*)::int` })
			.from(notifications)
			.where(whereClause);

		return {
			data: notificationList,
			total: countResult?.count ?? 0,
			page,
			limit,
			hasMore: offset + notificationList.length < (countResult?.count ?? 0),
		};
	}

	/**
	 * Get unread count for user
	 */
	async getUnreadCount(userId: string) {
		const [result] = await this.db
			.select({ count: sql<number>`count(*)::int` })
			.from(notifications)
			.where(
				and(
					eq(notifications.userId, userId),
					eq(notifications.isRead, false),
					eq(notifications.isArchived, false),
				),
			);

		return result?.count ?? 0;
	}

	/**
	 * Get unread count grouped by type
	 */
	async getUnreadCountByType(userId: string) {
		const results = await this.db
			.select({
				type: notifications.type,
				count: sql<number>`count(*)::int`,
			})
			.from(notifications)
			.where(
				and(
					eq(notifications.userId, userId),
					eq(notifications.isRead, false),
					eq(notifications.isArchived, false),
				),
			)
			.groupBy(notifications.type);

		const counts: Record<string, number> = {};
		let total = 0;

		for (const r of results) {
			counts[r.type] = r.count;
			total += r.count;
		}

		return { total, byType: counts };
	}

	// ===== UPDATE =====

	/**
	 * Mark notification as read
	 */
	async markAsRead(id: string) {
		const [updated] = await this.db
			.update(notifications)
			.set({
				isRead: true,
				readAt: new Date(),
			})
			.where(eq(notifications.id, id))
			.returning();

		return updated;
	}

	/**
	 * Mark multiple notifications as read
	 */
	async markManyAsRead(ids: string[]) {
		if (ids.length === 0) return [];

		return this.db
			.update(notifications)
			.set({
				isRead: true,
				readAt: new Date(),
			})
			.where(inArray(notifications.id, ids))
			.returning();
	}

	/**
	 * Mark all user notifications as read
	 */
	async markAllAsRead(
		userId: string,
		options: {
			type?: NotificationType;
			issueId?: string;
			before?: Date;
		} = {},
	) {
		const conditions: SQL[] = [
			eq(notifications.userId, userId),
			eq(notifications.isRead, false),
		];

		if (options.type) {
			conditions.push(eq(notifications.type, options.type));
		}

		if (options.issueId) {
			conditions.push(eq(notifications.issueId, options.issueId));
		}

		if (options.before) {
			conditions.push(lt(notifications.createdAt, options.before));
		}

		return this.db
			.update(notifications)
			.set({
				isRead: true,
				readAt: new Date(),
			})
			.where(and(...conditions))
			.returning();
	}

	/**
	 * Archive notification
	 */
	async archive(id: string) {
		const [updated] = await this.db
			.update(notifications)
			.set({
				isArchived: true,
				archivedAt: new Date(),
			})
			.where(eq(notifications.id, id))
			.returning();

		return updated;
	}

	/**
	 * Archive multiple notifications
	 */
	async archiveMany(ids: string[]) {
		if (ids.length === 0) return [];

		return this.db
			.update(notifications)
			.set({
				isArchived: true,
				archivedAt: new Date(),
			})
			.where(inArray(notifications.id, ids))
			.returning();
	}

	// ===== DELETE =====

	/**
	 * Delete old notifications
	 */
	async deleteOldNotifications(olderThan: Date, archivedOnly = true) {
		const conditions: SQL[] = [lt(notifications.createdAt, olderThan)];

		if (archivedOnly) {
			conditions.push(eq(notifications.isArchived, true));
		}

		return this.db
			.delete(notifications)
			.where(and(...conditions))
			.returning();
	}

	/**
	 * Delete notification by ID
	 */
	async delete(id: string) {
		const [deleted] = await this.db
			.delete(notifications)
			.where(eq(notifications.id, id))
			.returning();

		return deleted;
	}
}

// =====================================================
// NOTIFICATION PREFERENCES REPOSITORY
// =====================================================

export class NotificationPreferencesRepository {
	constructor(private db: typeof database = database) {}

	/**
	 * Get user preferences
	 */
	async getUserPreferences(userId: string, channel?: NotificationChannel) {
		const conditions: SQL[] = [eq(notificationPreferences.userId, userId)];

		if (channel) {
			conditions.push(eq(notificationPreferences.channel, channel));
		}

		return this.db.query.notificationPreferences.findMany({
			where: and(...conditions),
		});
	}

	/**
	 * Get specific preference
	 */
	async getPreference(
		userId: string,
		channel: NotificationChannel,
		eventType: NotificationType,
	) {
		return this.db.query.notificationPreferences.findFirst({
			where: and(
				eq(notificationPreferences.userId, userId),
				eq(notificationPreferences.channel, channel),
				eq(notificationPreferences.eventType, eventType),
			),
		});
	}

	/**
	 * Check if notification is enabled for user
	 * Returns true by default if no preference is set
	 */
	async isEnabled(
		userId: string,
		channel: NotificationChannel,
		eventType: NotificationType,
	) {
		const pref = await this.getPreference(userId, channel, eventType);
		return pref?.isEnabled ?? true; // Default to enabled
	}

	/**
	 * Upsert preference
	 */
	async upsertPreference(
		userId: string,
		channel: NotificationChannel,
		eventType: NotificationType,
		isEnabled: boolean,
	) {
		const [preference] = await this.db
			.insert(notificationPreferences)
			.values({
				userId,
				channel,
				eventType,
				isEnabled,
			})
			.onConflictDoUpdate({
				target: [
					notificationPreferences.userId,
					notificationPreferences.channel,
					notificationPreferences.eventType,
				],
				set: {
					isEnabled,
					updatedAt: new Date(),
				},
			})
			.returning();

		return preference;
	}

	/**
	 * Bulk upsert preferences
	 */
	async bulkUpsertPreferences(
		userId: string,
		preferences: Array<{
			channel: NotificationChannel;
			eventType: NotificationType;
			isEnabled: boolean;
		}>,
	) {
		if (preferences.length === 0) return [];

		const results = [];
		for (const pref of preferences) {
			const result = await this.upsertPreference(
				userId,
				pref.channel,
				pref.eventType,
				pref.isEnabled,
			);
			results.push(result);
		}

		return results;
	}

	/**
	 * Toggle all preferences for a channel
	 */
	async toggleChannelPreferences(
		userId: string,
		channel: NotificationChannel,
		isEnabled: boolean,
	) {
		return this.db
			.update(notificationPreferences)
			.set({
				isEnabled,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(notificationPreferences.userId, userId),
					eq(notificationPreferences.channel, channel),
				),
			)
			.returning();
	}
}

// =====================================================
// DIGEST SETTINGS REPOSITORY
// =====================================================

export class DigestSettingsRepository {
	constructor(private db: typeof database = database) {}

	/**
	 * Get user digest settings
	 */
	async getSettings(userId: string) {
		return this.db.query.notificationDigestSettings.findFirst({
			where: eq(notificationDigestSettings.userId, userId),
		});
	}

	/**
	 * Create or update digest settings
	 */
	async upsertSettings(
		userId: string,
		settings: {
			frequency?: string;
			preferredHour?: number;
			preferredDay?: number;
			timezone?: string;
		},
	) {
		const existing = await this.getSettings(userId);

		if (existing) {
			const [updated] = await this.db
				.update(notificationDigestSettings)
				.set({
					...settings,
					updatedAt: new Date(),
				})
				.where(eq(notificationDigestSettings.userId, userId))
				.returning();

			return updated;
		}

		const [created] = await this.db
			.insert(notificationDigestSettings)
			.values({
				userId,
				frequency: settings.frequency ?? "none",
				preferredHour: settings.preferredHour ?? 9,
				preferredDay: settings.preferredDay ?? 1,
				timezone: settings.timezone ?? "UTC",
			})
			.returning();

		return created;
	}

	/**
	 * Update last digest sent time
	 */
	async updateLastDigestAt(userId: string) {
		const [updated] = await this.db
			.update(notificationDigestSettings)
			.set({
				lastDigestAt: new Date(),
			})
			.where(eq(notificationDigestSettings.userId, userId))
			.returning();

		return updated;
	}

	/**
	 * Get users due for digest
	 * Used by cron job to send digests
	 */
	async getUsersDueForDigest(frequency: "daily" | "weekly", hour: number) {
		const now = new Date();
		const dayOfWeek = now.getUTCDay();

		const conditions: SQL[] = [
			eq(notificationDigestSettings.frequency, frequency),
			eq(notificationDigestSettings.preferredHour, hour),
		];

		if (frequency === "weekly") {
			conditions.push(eq(notificationDigestSettings.preferredDay, dayOfWeek));
		}

		// Check if digest wasn't sent recently
		conditions.push(
			sql`(${notificationDigestSettings.lastDigestAt} IS NULL OR ${notificationDigestSettings.lastDigestAt} < NOW() - INTERVAL '1 hour')`,
		);

		return this.db.query.notificationDigestSettings.findMany({
			where: and(...conditions),
			with: {
				user: {
					columns: {
						id: true,
						name: true,
						email: true,
					},
				},
			},
		});
	}
}
