import type {
	NotificationRepository,
	WatcherRepository,
	NotificationPreferencesRepository,
	DigestSettingsRepository,
} from "../repositories/notification-repository";
import type {
	NotificationType,
	NotificationData,
	WatchReason,
	NotificationChannel,
} from "../db/schema";
import { resend } from "@/lib/mail";
import { env } from "@/config/env";
import { db } from "@/db";
import { projectRoleMembers } from "@/db/schema/permissions";
import { user } from "@/db/schema/auth";
import { eq } from "drizzle-orm";

// =====================================================
// NOTIFICATION SERVICE
// =====================================================

/**
 * Service for managing notifications and watchers
 * Handles notification dispatch, preferences checking, and watcher management
 */
export class NotificationService {
	constructor(
		private notificationRepo: NotificationRepository,
		private watcherRepo: WatcherRepository,
		private preferencesRepo: NotificationPreferencesRepository,
		private digestRepo: DigestSettingsRepository,
	) {}

	// =====================================================
	// WATCHER MANAGEMENT
	// =====================================================

	/**
	 * Add a watcher to an issue
	 */
	async watchIssue(
		issueId: string,
		userId: string,
		reason: WatchReason = "manual",
	) {
		return this.watcherRepo.addWatcher(issueId, userId, reason);
	}

	/**
	 * Remove a watcher from an issue
	 */
	async unwatchIssue(issueId: string, userId: string) {
		return this.watcherRepo.removeWatcher(issueId, userId);
	}

	/**
	 * Toggle watch status
	 */
	async toggleWatch(
		issueId: string,
		userId: string,
		reason: WatchReason = "manual",
	) {
		const isWatching = await this.watcherRepo.isWatching(issueId, userId);

		if (isWatching) {
			await this.watcherRepo.removeWatcher(issueId, userId);
			return { isWatching: false };
		}

		await this.watcherRepo.addWatcher(issueId, userId, reason);
		return { isWatching: true };
	}

	/**
	 * Check if user is watching an issue
	 */
	async isWatching(issueId: string, userId: string) {
		return this.watcherRepo.isWatching(issueId, userId);
	}

	/**
	 * Get all watchers for an issue
	 */
	async getIssueWatchers(issueId: string) {
		return this.watcherRepo.getIssueWatchers(issueId);
	}

	/**
	 * Get issues a user is watching
	 */
	async getWatchedIssues(
		userId: string,
		options?: {
			page?: number;
			limit?: number;
			includeIssueDetails?: boolean;
		},
	) {
		return this.watcherRepo.getUserWatchedIssues(userId, options);
	}

	/**
	 * Toggle mute for a watch
	 */
	async toggleMute(issueId: string, userId: string, isMuted: boolean) {
		return this.watcherRepo.toggleMute(issueId, userId, isMuted);
	}

	/**
	 * Auto-watch an issue based on user activity
	 * Called when user creates, is assigned to, or comments on an issue
	 */
	async autoWatch(issueId: string, userId: string, reason: WatchReason) {
		// Only auto-watch if not already watching
		const isWatching = await this.watcherRepo.isWatching(issueId, userId);
		if (!isWatching) {
			await this.watcherRepo.addWatcher(issueId, userId, reason);
		}
	}

	/**
	 * Bulk watch/unwatch issues
	 */
	async bulkWatch(
		issueIds: string[],
		userId: string,
		action: "watch" | "unwatch",
	) {
		const results: Array<{ issueId: string; success: boolean }> = [];

		for (const issueId of issueIds) {
			try {
				if (action === "watch") {
					await this.watcherRepo.addWatcher(issueId, userId, "manual");
				} else {
					await this.watcherRepo.removeWatcher(issueId, userId);
				}
				results.push({ issueId, success: true });
			} catch {
				results.push({ issueId, success: false });
			}
		}

		return results;
	}

	// =====================================================
	// NOTIFICATION DISPATCH
	// =====================================================

	/**
	 * Dispatch notification to a single user
	 * Checks preferences before creating notification
	 */
	async notify(
		userId: string,
		type: NotificationType,
		title: string,
		options?: {
			content?: string;
			data?: NotificationData;
			issueId?: string;
			commentId?: string;
			actorId?: string;
			groupKey?: string;
			channel?: NotificationChannel;
		},
	) {
		const channel = options?.channel ?? "in_app";

		// Check user preferences
		const isEnabled = await this.preferencesRepo.isEnabled(
			userId,
			channel,
			type,
		);

		if (!isEnabled) {
			return null; // User has disabled this notification type
		}

		return this.notificationRepo.create({
			userId,
			type,
			title,
			content: options?.content,
			data: options?.data,
			issueId: options?.issueId,
			commentId: options?.commentId,
			actorId: options?.actorId,
			groupKey: options?.groupKey,
		});
	}

	/**
	 * Dispatch notification to all watchers of an issue
	 * Excludes the actor (person who triggered the event)
	 */
	async notifyWatchers(
		issueId: string,
		type: NotificationType,
		title: string,
		options?: {
			content?: string;
			data?: NotificationData;
			commentId?: string;
			actorId?: string;
			groupKey?: string;
			excludeUserIds?: string[];
		},
	) {
		// Get active watchers (excluding muted)
		let watcherIds = await this.watcherRepo.getActiveWatcherIds(
			issueId,
			options?.actorId,
		);

		// Also exclude any additional users
		if (options?.excludeUserIds?.length) {
			const excludeSet = new Set(options.excludeUserIds);
			watcherIds = watcherIds.filter((id) => !excludeSet.has(id));
		}

		if (watcherIds.length === 0) {
			return [];
		}

		// Check preferences and create notifications
		const notifications: Array<{
			userId: string;
			type: NotificationType;
			title: string;
			content?: string;
			data?: NotificationData;
			issueId: string;
			commentId?: string;
			actorId?: string;
			groupKey?: string;
		}> = [];

		for (const userId of watcherIds) {
			const isEnabled = await this.preferencesRepo.isEnabled(
				userId,
				"in_app",
				type,
			);

			if (isEnabled) {
				notifications.push({
					userId,
					type,
					title,
					content: options?.content,
					data: options?.data,
					issueId,
					commentId: options?.commentId,
					actorId: options?.actorId,
					groupKey: options?.groupKey,
				});
			}
		}

		if (notifications.length === 0) {
			return [];
		}

		return this.notificationRepo.createBatch(notifications);
	}

	/**
	 * Notify specific users (e.g., mentioned users)
	 */
	async notifyUsers(
		userIds: string[],
		type: NotificationType,
		title: string,
		options?: {
			content?: string;
			data?: NotificationData;
			issueId?: string;
			commentId?: string;
			actorId?: string;
			groupKey?: string;
		},
	) {
		if (userIds.length === 0) {
			return [];
		}

		const notifications: Array<{
			userId: string;
			type: NotificationType;
			title: string;
			content?: string;
			data?: NotificationData;
			issueId?: string;
			commentId?: string;
			actorId?: string;
			groupKey?: string;
		}> = [];

		for (const userId of userIds) {
			// Don't notify the actor
			if (userId === options?.actorId) continue;

			const isEnabled = await this.preferencesRepo.isEnabled(
				userId,
				"in_app",
				type,
			);

			if (isEnabled) {
				notifications.push({
					userId,
					type,
					title,
					content: options?.content,
					data: options?.data,
					issueId: options?.issueId,
					commentId: options?.commentId,
					actorId: options?.actorId,
					groupKey: options?.groupKey,
				});
			}
		}

		if (notifications.length === 0) {
			return [];
		}

		return this.notificationRepo.createBatch(notifications);
	}

	// =====================================================
	// NOTIFICATION EVENTS
	// =====================================================

	/**
	 * Notify when an issue is assigned
	 */
	async notifyIssueAssigned(
		issueId: string,
		assigneeId: string,
		actorId: string,
		issueData: { key: string; title: string },
		actorData: { name: string; email: string },
	) {
		// Notify the assignee
		await this.notify(assigneeId, "issue_assigned", `Issue ${issueData.key} assigned to you`, {
			data: {
				issueKey: issueData.key,
				issueTitle: issueData.title,
				actorName: actorData.name,
				actorEmail: actorData.email,
			},
			issueId,
			actorId,
		});

		// Auto-watch for the assignee
		await this.autoWatch(issueId, assigneeId, "auto_assigned");

		// Notify watchers
		await this.notifyWatchers(
			issueId,
			"watching_issue_updated",
			`${issueData.key} was assigned to someone`,
			{
				data: {
					issueKey: issueData.key,
					issueTitle: issueData.title,
					newAssignee: assigneeId,
					actorName: actorData.name,
				},
				actorId,
				excludeUserIds: [assigneeId], // Don't double-notify assignee
			},
		);
	}

	/**
	 * Notify when an issue status changes
	 */
	async notifyStatusChanged(
		issueId: string,
		actorId: string,
		issueData: { key: string; title: string },
		statusData: { oldStatus: string; newStatus: string },
		actorData: { name: string; email: string },
	) {
		await this.notifyWatchers(
			issueId,
			"watching_issue_status_changed",
			`${issueData.key} status changed to ${statusData.newStatus}`,
			{
				data: {
					issueKey: issueData.key,
					issueTitle: issueData.title,
					oldStatus: statusData.oldStatus,
					newStatus: statusData.newStatus,
					actorName: actorData.name,
					actorEmail: actorData.email,
				},
				actorId,
			},
		);
	}

	/**
	 * Notify when a comment is added
	 */
	async notifyCommentAdded(
		issueId: string,
		commentId: string,
		actorId: string,
		issueData: { key: string; title: string },
		commentPreview: string,
		actorData: { name: string; email: string },
	) {
		// Auto-watch for the commenter
		await this.autoWatch(issueId, actorId, "auto_commented");

		// Notify watchers
		await this.notifyWatchers(
			issueId,
			"watching_issue_commented",
			`New comment on ${issueData.key}`,
			{
				content: commentPreview,
				data: {
					issueKey: issueData.key,
					issueTitle: issueData.title,
					commentPreview,
					actorName: actorData.name,
					actorEmail: actorData.email,
				},
				commentId,
				actorId,
			},
		);
	}

	/**
	 * Notify mentioned users
	 */
	async notifyMentions(
		mentionedUserIds: string[],
		issueId: string,
		actorId: string,
		issueData: { key: string; title: string },
		actorData: { name: string; email: string },
		options?: { commentId?: string; commentPreview?: string },
	) {
		await this.notifyUsers(
			mentionedUserIds,
			options?.commentId ? "comment_mentioned" : "issue_mentioned",
			`You were mentioned in ${issueData.key}`,
			{
				content: options?.commentPreview,
				data: {
					issueKey: issueData.key,
					issueTitle: issueData.title,
					commentPreview: options?.commentPreview,
					mentionedIn: options?.commentId ? "comment" : "issue",
					actorName: actorData.name,
					actorEmail: actorData.email,
				},
				issueId,
				commentId: options?.commentId,
				actorId,
			},
		);

		// Auto-watch for mentioned users
		for (const userId of mentionedUserIds) {
			await this.autoWatch(issueId, userId, "auto_mentioned");
		}
	}

	/**
	 * Notify when a comment is replied to
	 */
	async notifyCommentReply(
		parentCommentAuthorId: string,
		issueId: string,
		commentId: string,
		actorId: string,
		issueData: { key: string; title: string },
		commentPreview: string,
		actorData: { name: string; email: string },
	) {
		// Don't notify if replying to own comment
		if (parentCommentAuthorId === actorId) return;

		await this.notify(
			parentCommentAuthorId,
			"comment_replied",
			`Reply to your comment on ${issueData.key}`,
			{
				content: commentPreview,
				data: {
					issueKey: issueData.key,
					issueTitle: issueData.title,
					commentPreview,
					actorName: actorData.name,
					actorEmail: actorData.email,
				},
				issueId,
				commentId,
				actorId,
			},
		);
	}

	// =====================================================
	// NOTIFICATION READING
	// =====================================================

	/**
	 * Get user notifications
	 */
	async getNotifications(
		userId: string,
		options?: {
			page?: number;
			limit?: number;
			isRead?: boolean;
			type?: NotificationType;
			issueId?: string;
			includeArchived?: boolean;
			since?: Date;
		},
	) {
		return this.notificationRepo.getUserNotifications(userId, options);
	}

	/**
	 * Get notification by ID
	 */
	async getNotificationById(id: string) {
		return this.notificationRepo.getById(id);
	}

	/**
	 * Get unread notification count
	 */
	async getUnreadCount(userId: string, byType = false) {
		if (byType) {
			return this.notificationRepo.getUnreadCountByType(userId);
		}
		const count = await this.notificationRepo.getUnreadCount(userId);
		return { total: count };
	}

	/**
	 * Mark notification as read
	 */
	async markAsRead(notificationId: string, userId: string) {
		const notification = await this.notificationRepo.getById(notificationId);
		if (!notification || notification.userId !== userId) {
			return null;
		}
		return this.notificationRepo.markAsRead(notificationId);
	}

	/**
	 * Mark multiple notifications as read
	 */
	async markManyAsRead(notificationIds: string[], userId: string) {
		// Verify ownership of all notifications
		const notifications = await Promise.all(
			notificationIds.map((id) => this.notificationRepo.getById(id)),
		);

		const validIds = notifications
			.filter((n) => n && n.userId === userId)
			.map((n) => n!.id);

		if (validIds.length === 0) {
			return [];
		}

		return this.notificationRepo.markManyAsRead(validIds);
	}

	/**
	 * Mark all notifications as read
	 */
	async markAllAsRead(
		userId: string,
		options?: {
			type?: NotificationType;
			issueId?: string;
			before?: Date;
		},
	) {
		return this.notificationRepo.markAllAsRead(userId, options);
	}

	/**
	 * Archive notification
	 */
	async archiveNotification(notificationId: string, userId: string) {
		const notification = await this.notificationRepo.getById(notificationId);
		if (!notification || notification.userId !== userId) {
			return null;
		}
		return this.notificationRepo.archive(notificationId);
	}

	/**
	 * Archive multiple notifications
	 */
	async archiveNotifications(notificationIds: string[], userId: string) {
		const notifications = await Promise.all(
			notificationIds.map((id) => this.notificationRepo.getById(id)),
		);

		const validIds = notifications
			.filter((n) => n && n.userId === userId)
			.map((n) => n!.id);

		if (validIds.length === 0) {
			return [];
		}

		return this.notificationRepo.archiveMany(validIds);
	}

	// =====================================================
	// PREFERENCES MANAGEMENT
	// =====================================================

	/**
	 * Get user notification preferences
	 */
	async getPreferences(userId: string, channel?: NotificationChannel) {
		return this.preferencesRepo.getUserPreferences(userId, channel);
	}

	/**
	 * Update a notification preference
	 */
	async updatePreference(
		userId: string,
		channel: NotificationChannel,
		eventType: NotificationType,
		isEnabled: boolean,
	) {
		return this.preferencesRepo.upsertPreference(
			userId,
			channel,
			eventType,
			isEnabled,
		);
	}

	/**
	 * Bulk update preferences
	 */
	async bulkUpdatePreferences(
		userId: string,
		preferences: Array<{
			channel: NotificationChannel;
			eventType: NotificationType;
			isEnabled: boolean;
		}>,
	) {
		return this.preferencesRepo.bulkUpsertPreferences(userId, preferences);
	}

	/**
	 * Toggle all preferences for a channel
	 */
	async toggleChannelPreferences(
		userId: string,
		channel: NotificationChannel,
		isEnabled: boolean,
	) {
		return this.preferencesRepo.toggleChannelPreferences(
			userId,
			channel,
			isEnabled,
		);
	}

	// =====================================================
	// DIGEST SETTINGS
	// =====================================================

	/**
	 * Get user digest settings
	 */
	async getDigestSettings(userId: string) {
		return this.digestRepo.getSettings(userId);
	}

	/**
	 * Update digest settings
	 */
	async updateDigestSettings(
		userId: string,
		settings: {
			frequency?: string;
			preferredHour?: number;
			preferredDay?: number;
			timezone?: string;
		},
	) {
		return this.digestRepo.upsertSettings(userId, settings);
	}

	// =====================================================
	// EMAIL DISPATCH
	// =====================================================

	/**
	 * Send email notification to a user
	 * Checks email preferences before sending
	 */
	async sendEmailNotification(
		userId: string,
		type: NotificationType,
		subject: string,
		options: {
			content: string;
			htmlContent?: string;
			data?: NotificationData;
		},
	) {
		// Check if user has email notifications enabled for this type
		const isEnabled = await this.preferencesRepo.isEnabled(
			userId,
			"email",
			type,
		);

		if (!isEnabled) {
			return { sent: false, reason: "User has disabled email for this type" };
		}

		// Get user email
		const userRecord = await db
			.select({ email: user.email, name: user.name })
			.from(user)
			.where(eq(user.id, userId))
			.limit(1);

		if (!userRecord.length || !userRecord[0].email) {
			return { sent: false, reason: "User email not found" };
		}

		try {
			await resend.emails.send({
				from: env.RESEND_SMTP_FROM || "onboarding@resend.dev",
				to: userRecord[0].email,
				subject,
				html: options.htmlContent || this.generateEmailHtml(subject, options.content),
			});

			return { sent: true };
		} catch (error) {
			console.error("[NotificationService] Email send failed:", error);
			return { sent: false, reason: "Email send failed" };
		}
	}

	/**
	 * Send email notifications to multiple users
	 */
	async sendBulkEmailNotifications(
		userIds: string[],
		type: NotificationType,
		subject: string,
		options: {
			content: string;
			htmlContent?: string;
			data?: NotificationData;
			excludeUserIds?: string[];
		},
	) {
		const results: Array<{ userId: string; sent: boolean; reason?: string }> = [];

		// Filter out excluded users
		const targetUserIds = options.excludeUserIds
			? userIds.filter((id) => !options.excludeUserIds!.includes(id))
			: userIds;

		for (const userId of targetUserIds) {
			const result = await this.sendEmailNotification(userId, type, subject, options);
			results.push({ userId, ...result });
		}

		return results;
	}

	/**
	 * Generate simple HTML email content
	 */
	private generateEmailHtml(title: string, content: string): string {
		return `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="UTF-8">
				<title>${title}</title>
				<style>
					body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
					.container { max-width: 600px; margin: 0 auto; padding: 20px; }
					.header { background: #1c2d45; color: white; padding: 20px; text-align: center; }
					.content { padding: 20px; background: #f9f9f9; }
					.footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
				</style>
			</head>
			<body>
				<div class="container">
					<div class="header">
						<h1>Taskmaster</h1>
					</div>
					<div class="content">
						<h2>${title}</h2>
						<p>${content}</p>
					</div>
					<div class="footer">
						<p>Bu bir otomatik bildirimdir.</p>
					</div>
				</div>
			</body>
			</html>
		`;
	}

	// =====================================================
	// PROJECT MEMBER NOTIFICATIONS
	// =====================================================

	/**
	 * Notify all members of a project
	 */
	async notifyProjectMembers(
		projectId: string,
		type: NotificationType,
		title: string,
		options?: {
			content?: string;
			data?: NotificationData;
			issueId?: string;
			actorId?: string;
			excludeUserIds?: string[];
			includeEmail?: boolean;
		},
	) {
		// Get all project members (users with any role in the project)
		const members = await db
			.select({ userId: projectRoleMembers.userId })
			.from(projectRoleMembers)
			.where(eq(projectRoleMembers.projectId, projectId));

		let memberIds = members.map((m) => m.userId);

		// Exclude actor and any specified users
		if (options?.actorId) {
			memberIds = memberIds.filter((id) => id !== options.actorId);
		}
		if (options?.excludeUserIds?.length) {
			const excludeSet = new Set(options.excludeUserIds);
			memberIds = memberIds.filter((id) => !excludeSet.has(id));
		}

		if (memberIds.length === 0) {
			return { inApp: [], email: [] };
		}

		// Send in-app notifications
		const inAppResults = await this.notifyUsers(memberIds, type, title, {
			content: options?.content,
			data: options?.data,
			issueId: options?.issueId,
			actorId: options?.actorId,
		});

		// Send email notifications if requested
		let emailResults: Array<{ userId: string; sent: boolean; reason?: string }> = [];
		if (options?.includeEmail) {
			emailResults = await this.sendBulkEmailNotifications(
				memberIds,
				type,
				title,
				{
					content: options?.content || title,
					data: options?.data,
				},
			);
		}

		return { inApp: inAppResults, email: emailResults };
	}

	/**
	 * Notify project admins
	 */
	async notifyProjectAdmins(
		projectId: string,
		type: NotificationType,
		title: string,
		options?: {
			content?: string;
			data?: NotificationData;
			issueId?: string;
			actorId?: string;
			includeEmail?: boolean;
		},
	) {
		// Get project admins (members with admin role)
		const admins = await db
			.select({ userId: projectRoleMembers.userId })
			.from(projectRoleMembers)
			.where(eq(projectRoleMembers.projectId, projectId));
		// Note: Would need to filter by role if role column exists

		let adminIds = admins.map((m) => m.userId);

		if (options?.actorId) {
			adminIds = adminIds.filter((id) => id !== options.actorId);
		}

		if (adminIds.length === 0) {
			return { inApp: [], email: [] };
		}

		// Send notifications
		const inAppResults = await this.notifyUsers(adminIds, type, title, {
			content: options?.content,
			data: options?.data,
			issueId: options?.issueId,
			actorId: options?.actorId,
		});

		let emailResults: Array<{ userId: string; sent: boolean; reason?: string }> = [];
		if (options?.includeEmail) {
			emailResults = await this.sendBulkEmailNotifications(
				adminIds,
				type,
				title,
				{
					content: options?.content || title,
					data: options?.data,
				},
			);
		}

		return { inApp: inAppResults, email: emailResults };
	}

	/**
	 * Notify users with combined in-app and email
	 * This is the unified method for multi-channel notifications
	 */
	async notifyMultiChannel(
		userIds: string[],
		type: NotificationType,
		title: string,
		options: {
			content?: string;
			data?: NotificationData;
			issueId?: string;
			commentId?: string;
			actorId?: string;
			channels?: NotificationChannel[];
		},
	): Promise<{
		inApp: Awaited<ReturnType<NotificationService['notifyUsers']>>;
		email: Array<{ userId: string; sent: boolean; reason?: string }>;
	}> {
		const channels = options.channels || ["in_app"];
		const results: {
			inApp: Awaited<ReturnType<NotificationService['notifyUsers']>>;
			email: Array<{ userId: string; sent: boolean; reason?: string }>;
		} = {
			inApp: [],
			email: [],
		};

		// Send in-app notifications
		if (channels.includes("in_app")) {
			results.inApp = await this.notifyUsers(userIds, type, title, {
				content: options.content,
				data: options.data,
				issueId: options.issueId,
				commentId: options.commentId,
				actorId: options.actorId,
			});
		}

		// Send email notifications
		if (channels.includes("email")) {
			results.email = await this.sendBulkEmailNotifications(
				userIds,
				type,
				title,
				{
					content: options.content || title,
					data: options.data,
					excludeUserIds: options.actorId ? [options.actorId] : undefined,
				},
			);
		}

		return results;
	}
}
