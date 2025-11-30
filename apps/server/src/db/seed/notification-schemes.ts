import { db } from "../index";
import {
	notificationSchemes,
	notificationSchemeEvents,
	type NotificationChannel,
} from "../schema/notifications";

/**
 * Default Notification Scheme
 * Standard notification settings for most projects
 */
const DEFAULT_SCHEME_EVENTS = [
	// Issue Created - notify project lead and all watchers
	{
		eventType: "issue_created" as const,
		recipients: [
			{ type: "project_lead" as const, channels: ["in_app", "email"] },
			{ type: "all_watchers" as const, channels: ["in_app"] },
		],
	},
	// Issue Assigned - notify assignee
	{
		eventType: "issue_assigned" as const,
		recipients: [
			{ type: "current_assignee" as const, channels: ["in_app", "email"] },
			{ type: "reporter" as const, channels: ["in_app"] },
		],
	},
	// Issue Unassigned - notify previous assignee
	{
		eventType: "issue_unassigned" as const,
		recipients: [
			{ type: "previous_assignee" as const, channels: ["in_app"] },
		],
	},
	// Issue Updated - notify assignee, reporter, watchers
	{
		eventType: "issue_updated" as const,
		recipients: [
			{ type: "current_assignee" as const, channels: ["in_app"] },
			{ type: "reporter" as const, channels: ["in_app"] },
			{ type: "all_watchers" as const, channels: ["in_app"] },
		],
	},
	// Issue Status Changed - notify assignee, reporter, watchers
	{
		eventType: "issue_status_changed" as const,
		recipients: [
			{ type: "current_assignee" as const, channels: ["in_app", "email"] },
			{ type: "reporter" as const, channels: ["in_app", "email"] },
			{ type: "all_watchers" as const, channels: ["in_app"] },
		],
	},
	// Issue Commented - notify assignee, reporter, watchers
	{
		eventType: "issue_commented" as const,
		recipients: [
			{ type: "current_assignee" as const, channels: ["in_app"] },
			{ type: "reporter" as const, channels: ["in_app"] },
			{ type: "all_watchers" as const, channels: ["in_app"] },
		],
	},
	// Issue Mentioned - notify the mentioned user
	{
		eventType: "issue_mentioned" as const,
		recipients: [
			// This will be handled specially - mentioned users
		],
	},
	// Comment Replied - notify parent comment author
	{
		eventType: "comment_replied" as const,
		recipients: [
			// This will be handled specially - parent comment author
		],
	},
	// Comment Mentioned - notify mentioned user
	{
		eventType: "comment_mentioned" as const,
		recipients: [
			// Handled specially - mentioned users in comment
		],
	},
	// Issue Deleted - notify reporter and project lead
	{
		eventType: "issue_deleted" as const,
		recipients: [
			{ type: "reporter" as const, channels: ["in_app", "email"] },
			{ type: "project_lead" as const, channels: ["in_app"] },
		],
	},
	// Sprint Started - notify project lead and all watchers
	{
		eventType: "sprint_started" as const,
		recipients: [
			{ type: "project_lead" as const, channels: ["in_app", "email"] },
		],
	},
	// Sprint Completed - notify project lead
	{
		eventType: "sprint_completed" as const,
		recipients: [
			{ type: "project_lead" as const, channels: ["in_app", "email"] },
		],
	},
	// Workflow Transition - notify assignee and watchers
	{
		eventType: "workflow_transition" as const,
		recipients: [
			{ type: "current_assignee" as const, channels: ["in_app"] },
			{ type: "all_watchers" as const, channels: ["in_app"] },
		],
	},
];

/**
 * Minimal Notification Scheme
 * Only critical notifications
 */
const MINIMAL_SCHEME_EVENTS = [
	// Only notify on assignment
	{
		eventType: "issue_assigned" as const,
		recipients: [
			{ type: "current_assignee" as const, channels: ["in_app", "email"] },
		],
	},
	// And mentions
	{
		eventType: "issue_mentioned" as const,
		recipients: [],
	},
	{
		eventType: "comment_mentioned" as const,
		recipients: [],
	},
];

/**
 * Aggressive Notification Scheme
 * Notify on everything via all channels
 */
const AGGRESSIVE_SCHEME_EVENTS = [
	{
		eventType: "issue_created" as const,
		recipients: [
			{ type: "project_lead" as const, channels: ["in_app", "email"] },
			{ type: "all_watchers" as const, channels: ["in_app", "email"] },
		],
	},
	{
		eventType: "issue_assigned" as const,
		recipients: [
			{ type: "current_assignee" as const, channels: ["in_app", "email"] },
			{ type: "reporter" as const, channels: ["in_app", "email"] },
			{ type: "previous_assignee" as const, channels: ["in_app", "email"] },
		],
	},
	{
		eventType: "issue_updated" as const,
		recipients: [
			{ type: "current_assignee" as const, channels: ["in_app", "email"] },
			{ type: "reporter" as const, channels: ["in_app", "email"] },
			{ type: "all_watchers" as const, channels: ["in_app", "email"] },
		],
	},
	{
		eventType: "issue_status_changed" as const,
		recipients: [
			{ type: "current_assignee" as const, channels: ["in_app", "email"] },
			{ type: "reporter" as const, channels: ["in_app", "email"] },
			{ type: "all_watchers" as const, channels: ["in_app", "email"] },
			{ type: "project_lead" as const, channels: ["in_app", "email"] },
		],
	},
	{
		eventType: "issue_commented" as const,
		recipients: [
			{ type: "current_assignee" as const, channels: ["in_app", "email"] },
			{ type: "reporter" as const, channels: ["in_app", "email"] },
			{ type: "all_watchers" as const, channels: ["in_app", "email"] },
		],
	},
	{
		eventType: "sprint_started" as const,
		recipients: [
			{ type: "project_lead" as const, channels: ["in_app", "email"] },
		],
	},
	{
		eventType: "sprint_completed" as const,
		recipients: [
			{ type: "project_lead" as const, channels: ["in_app", "email"] },
		],
	},
];

export async function seedNotificationSchemes() {
	console.log("🔔 Seeding notification schemes...");

	// Create Default Scheme
	const [defaultScheme] = await db
		.insert(notificationSchemes)
		.values({
			name: "Default Notification Scheme",
			description:
				"Standard notification settings for most projects. Notifies relevant parties on important events.",
			isDefault: true,
			isSystem: true,
		})
		.onConflictDoNothing()
		.returning();

	if (defaultScheme) {
		// Insert event mappings for default scheme
		for (const eventConfig of DEFAULT_SCHEME_EVENTS) {
			for (const recipient of eventConfig.recipients) {
				await db
					.insert(notificationSchemeEvents)
					.values({
						schemeId: defaultScheme.id,
						eventType: eventConfig.eventType,
						recipientType: recipient.type,
						channels: recipient.channels as NotificationChannel[],
						isEnabled: true,
					})
					.onConflictDoNothing();
			}
		}
		console.log("  ✅ Created Default Notification Scheme");
	}

	// Create Minimal Scheme
	const [minimalScheme] = await db
		.insert(notificationSchemes)
		.values({
			name: "Minimal Notification Scheme",
			description:
				"Only critical notifications - assignments and mentions. Good for high-volume projects.",
			isDefault: false,
			isSystem: true,
		})
		.onConflictDoNothing()
		.returning();

	if (minimalScheme) {
		for (const eventConfig of MINIMAL_SCHEME_EVENTS) {
			for (const recipient of eventConfig.recipients) {
				await db
					.insert(notificationSchemeEvents)
					.values({
						schemeId: minimalScheme.id,
						eventType: eventConfig.eventType,
						recipientType: recipient.type,
						channels: recipient.channels as NotificationChannel[],
						isEnabled: true,
					})
					.onConflictDoNothing();
			}
		}
		console.log("  ✅ Created Minimal Notification Scheme");
	}

	// Create Aggressive Scheme
	const [aggressiveScheme] = await db
		.insert(notificationSchemes)
		.values({
			name: "All Notifications Scheme",
			description:
				"Notify on all events via all channels. Best for small teams that need full visibility.",
			isDefault: false,
			isSystem: true,
		})
		.onConflictDoNothing()
		.returning();

	if (aggressiveScheme) {
		for (const eventConfig of AGGRESSIVE_SCHEME_EVENTS) {
			for (const recipient of eventConfig.recipients) {
				await db
					.insert(notificationSchemeEvents)
					.values({
						schemeId: aggressiveScheme.id,
						eventType: eventConfig.eventType,
						recipientType: recipient.type,
						channels: recipient.channels as NotificationChannel[],
						isEnabled: true,
					})
					.onConflictDoNothing();
			}
		}
		console.log("  ✅ Created All Notifications Scheme");
	}

	console.log("✅ Notification schemes seeded successfully!");
}
