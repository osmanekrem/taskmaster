import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "@/lib/trpc";
import {
	addWatcherSchema,
	removeWatcherSchema,
	toggleMuteWatcherSchema,
	getIssueWatchersSchema,
	getWatchedIssuesSchema,
	bulkWatchSchema,
	getNotificationsSchema,
	markNotificationReadSchema,
	markNotificationsReadSchema,
	markAllNotificationsReadSchema,
	archiveNotificationSchema,
	archiveNotificationsSchema,
	getUnreadCountSchema,
	getUserPreferencesSchema,
	updatePreferenceSchema,
	bulkUpdatePreferencesSchema,
	toggleChannelPreferencesSchema,
	updateDigestSettingsSchema,
} from "@taskmaster/validation";
import { requirePermission } from "@/lib/middleware/permission";

// =====================================================
// NOTIFICATIONS ROUTER
// =====================================================

export const notificationsRouter = router({
// ===== WATCHER ENDPOINTS =====

/**
 * Get all watchers for an issue
 */
getIssueWatchers: protectedProcedure
.input(getIssueWatchersSchema)
.use(requirePermission('issue:view'))
.query(async ({ ctx, input }) => {
			const watchers = await ctx.services.notification.getIssueWatchers(input.issueId);
			return watchers;
		}),

	/**
	 * Get issues the current user is watching
	 */
	getWatchedIssues: protectedProcedure
		.input(getWatchedIssuesSchema)
		.use(requirePermission('issue:view'))
		.query(async ({ ctx, input }) => {
			const userId = input.userId ?? ctx.session.user.id;
			return ctx.services.notification.getWatchedIssues(userId, {
page: input.page,
limit: input.limit,
includeIssueDetails: input.includeIssueDetails,
});
		}),

	/**
	 * Check if current user is watching an issue
	 */
	isWatching: protectedProcedure
		.input(z.object({ issueId: z.string().uuid() }))
		.use(requirePermission('issue:view'))
		.query(async ({ ctx, input }) => {
			const isWatching = await ctx.services.notification.isWatching(
input.issueId,
ctx.session.user.id,
);
			return { isWatching };
		}),

	/**
	 * Watch an issue
	 */
	watchIssue: protectedProcedure
		.input(addWatcherSchema)
		.use(requirePermission('issue:view'))
		.mutation(async ({ ctx, input }) => {
			const userId = input.userId ?? ctx.session.user.id;
			const watcher = await ctx.services.notification.watchIssue(
input.issueId,
userId,
input.reason,
);
			return watcher;
		}),

	/**
	 * Unwatch an issue
	 */
	unwatchIssue: protectedProcedure
		.input(removeWatcherSchema)
		.use(requirePermission('issue:view'))
		.mutation(async ({ ctx, input }) => {
			const userId = input.userId ?? ctx.session.user.id;
			const removed = await ctx.services.notification.unwatchIssue(
input.issueId,
userId,
);
			return { success: !!removed };
		}),

	/**
	 * Toggle watch status
	 */
	toggleWatch: protectedProcedure
		.input(z.object({ issueId: z.string().uuid() }))
		.use(requirePermission('issue:view'))
		.mutation(async ({ ctx, input }) => {
			return ctx.services.notification.toggleWatch(input.issueId, ctx.session.user.id);
		}),

	/**
	 * Toggle mute for a watched issue
	 */
	toggleMute: protectedProcedure
		.input(toggleMuteWatcherSchema)
		.use(requirePermission('issue:view'))
		.mutation(async ({ ctx, input }) => {
			const updated = await ctx.services.notification.toggleMute(
input.issueId,
ctx.session.user.id,
input.isMuted,
);

			if (!updated) {
				throw new TRPCError({
code: "NOT_FOUND",
message: "Watch not found",
});
			}

			return updated;
		}),

	/**
	 * Bulk watch/unwatch issues
	 */
	bulkWatch: protectedProcedure
		.input(bulkWatchSchema)
		.use(requirePermission('issue:view'))
		.mutation(async ({ ctx, input }) => {
			return ctx.services.notification.bulkWatch(
input.issueIds,
ctx.session.user.id,
input.action,
);
		}),

	// ===== NOTIFICATION ENDPOINTS =====

	/**
	 * Get user notifications
	 */
	getNotifications: protectedProcedure
		.input(getNotificationsSchema)
		.query(async ({ ctx, input }) => {
			return ctx.services.notification.getNotifications(ctx.session.user.id, {
page: input.page,
limit: input.limit,
isRead: input.isRead,
type: input.type,
issueId: input.issueId,
includeArchived: input.includeArchived,
since: input.since,
});
		}),

	/**
	 * Get notification by ID
	 */
	getNotificationById: protectedProcedure
		.input(z.object({ notificationId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const notification = await ctx.services.notification.getNotificationById(
input.notificationId,
);

			if (!notification || notification.userId !== ctx.session.user.id) {
				throw new TRPCError({
code: "NOT_FOUND",
message: "Notification not found",
});
			}

			return notification;
		}),

	/**
	 * Get unread notification count
	 */
	getUnreadCount: protectedProcedure
		.input(getUnreadCountSchema)
		.query(async ({ ctx, input }) => {
			return ctx.services.notification.getUnreadCount(ctx.session.user.id, input.byType);
		}),

	/**
	 * Mark a notification as read
	 */
	markAsRead: protectedProcedure
		.input(markNotificationReadSchema)
		.mutation(async ({ ctx, input }) => {
			const updated = await ctx.services.notification.markAsRead(
input.notificationId,
ctx.session.user.id,
);

			if (!updated) {
				throw new TRPCError({
code: "NOT_FOUND",
message: "Notification not found",
});
			}

			return updated;
		}),

	/**
	 * Mark multiple notifications as read
	 */
	markManyAsRead: protectedProcedure
		.input(markNotificationsReadSchema)
		.mutation(async ({ ctx, input }) => {
			return ctx.services.notification.markManyAsRead(
input.notificationIds,
ctx.session.user.id,
);
		}),

	/**
	 * Mark all notifications as read
	 */
	markAllAsRead: protectedProcedure
		.input(markAllNotificationsReadSchema)
		.mutation(async ({ ctx, input }) => {
			return ctx.services.notification.markAllAsRead(ctx.session.user.id, {
type: input.type,
issueId: input.issueId,
before: input.before,
});
		}),

	/**
	 * Archive a notification
	 */
	archiveNotification: protectedProcedure
		.input(archiveNotificationSchema)
		.mutation(async ({ ctx, input }) => {
			const archived = await ctx.services.notification.archiveNotification(
input.notificationId,
ctx.session.user.id,
);

			if (!archived) {
				throw new TRPCError({
code: "NOT_FOUND",
message: "Notification not found",
});
			}

			return archived;
		}),

	/**
	 * Archive multiple notifications
	 */
	archiveNotifications: protectedProcedure
		.input(archiveNotificationsSchema)
		.mutation(async ({ ctx, input }) => {
			return ctx.services.notification.archiveNotifications(
input.notificationIds,
ctx.session.user.id,
);
		}),

	// ===== PREFERENCE ENDPOINTS =====

	/**
	 * Get user notification preferences
	 */
	getPreferences: protectedProcedure
		.input(getUserPreferencesSchema)
		.query(async ({ ctx, input }) => {
			return ctx.services.notification.getPreferences(ctx.session.user.id, input.channel);
		}),

	/**
	 * Update a notification preference
	 */
	updatePreference: protectedProcedure
		.input(updatePreferenceSchema)
		.mutation(async ({ ctx, input }) => {
			return ctx.services.notification.updatePreference(
ctx.session.user.id,
input.channel,
input.eventType,
input.isEnabled,
);
		}),

	/**
	 * Bulk update preferences
	 */
	bulkUpdatePreferences: protectedProcedure
		.input(bulkUpdatePreferencesSchema)
		.mutation(async ({ ctx, input }) => {
			return ctx.services.notification.bulkUpdatePreferences(
ctx.session.user.id,
input.preferences,
);
		}),

	/**
	 * Toggle all preferences for a channel
	 */
	toggleChannelPreferences: protectedProcedure
		.input(toggleChannelPreferencesSchema)
		.mutation(async ({ ctx, input }) => {
			return ctx.services.notification.toggleChannelPreferences(
ctx.session.user.id,
input.channel,
input.isEnabled,
);
		}),

	// ===== DIGEST SETTINGS ENDPOINTS =====

	/**
	 * Get user digest settings
	 */
	getDigestSettings: protectedProcedure.query(async ({ ctx }) => {
		return ctx.services.notification.getDigestSettings(ctx.session.user.id);
	}),

	/**
	 * Update digest settings
	 */
	updateDigestSettings: protectedProcedure
		.input(updateDigestSettingsSchema)
		.mutation(async ({ ctx, input }) => {
			return ctx.services.notification.updateDigestSettings(ctx.session.user.id, input);
		}),
});

export type NotificationsRouter = typeof notificationsRouter;
