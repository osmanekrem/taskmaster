import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db";
import {
	notificationSchemes,
	notificationSchemeEvents,
	projectNotificationSchemes,
	type NotificationChannel,
	type NotificationRecipientType,
	type RecipientParams,
} from "../db/schema/notifications";

export interface CreateNotificationSchemeInput {
	name: string;
	description?: string;
	isDefault?: boolean;
}

export interface CreateSchemeEventInput {
	schemeId: string;
	eventType: string;
	recipientType: NotificationRecipientType;
	recipientParams?: RecipientParams;
	channels?: NotificationChannel[];
	isEnabled?: boolean;
}

export interface SchemeEventMapping {
	eventType: string;
	recipientType: NotificationRecipientType;
	recipientParams?: RecipientParams;
	channels: NotificationChannel[];
	isEnabled: boolean;
}

export class NotificationSchemeRepository {
	// =====================================================
	// SCHEME CRUD
	// =====================================================

	/**
	 * Create a new notification scheme
	 */
	async createScheme(input: CreateNotificationSchemeInput) {
		// If setting as default, unset other defaults first
		if (input.isDefault) {
			await db
				.update(notificationSchemes)
				.set({ isDefault: false })
				.where(eq(notificationSchemes.isDefault, true));
		}

		const [scheme] = await db
			.insert(notificationSchemes)
			.values({
				name: input.name,
				description: input.description,
				isDefault: input.isDefault ?? false,
			})
			.returning();

		return scheme;
	}

	/**
	 * Get all notification schemes
	 */
	async getAllSchemes() {
		return await db
			.select()
			.from(notificationSchemes)
			.orderBy(desc(notificationSchemes.isDefault), notificationSchemes.name);
	}

	/**
	 * Get a scheme by ID with its events
	 */
	async getSchemeById(schemeId: string) {
		const scheme = await db
			.select()
			.from(notificationSchemes)
			.where(eq(notificationSchemes.id, schemeId))
			.limit(1);

		if (!scheme[0]) return null;

		const events = await db
			.select()
			.from(notificationSchemeEvents)
			.where(eq(notificationSchemeEvents.schemeId, schemeId));

		return {
			...scheme[0],
			events,
		};
	}

	/**
	 * Get the default notification scheme
	 */
	async getDefaultScheme() {
		const [scheme] = await db
			.select()
			.from(notificationSchemes)
			.where(eq(notificationSchemes.isDefault, true))
			.limit(1);

		return scheme ?? null;
	}

	/**
	 * Update a notification scheme
	 */
	async updateScheme(
		schemeId: string,
		input: Partial<CreateNotificationSchemeInput>
	) {
		// If setting as default, unset other defaults first
		if (input.isDefault) {
			await db
				.update(notificationSchemes)
				.set({ isDefault: false })
				.where(
					and(
						eq(notificationSchemes.isDefault, true),
						sql`${notificationSchemes.id} != ${schemeId}`
					)
				);
		}

		const [scheme] = await db
			.update(notificationSchemes)
			.set({
				...input,
				updatedAt: new Date(),
			})
			.where(eq(notificationSchemes.id, schemeId))
			.returning();

		return scheme;
	}

	/**
	 * Delete a notification scheme
	 * Cannot delete system schemes or schemes in use
	 */
	async deleteScheme(schemeId: string) {
		// Check if it's a system scheme
		const [scheme] = await db
			.select()
			.from(notificationSchemes)
			.where(eq(notificationSchemes.id, schemeId))
			.limit(1);

		if (scheme?.isSystem) {
			throw new Error("Cannot delete system notification schemes");
		}

		// Check if scheme is in use
		const [usage] = await db
			.select({ count: sql<number>`count(*)` })
			.from(projectNotificationSchemes)
			.where(eq(projectNotificationSchemes.schemeId, schemeId));

		if (usage && usage.count > 0) {
			throw new Error(
				"Cannot delete notification scheme that is assigned to projects"
			);
		}

		await db
			.delete(notificationSchemes)
			.where(eq(notificationSchemes.id, schemeId));

		return true;
	}

	// =====================================================
	// SCHEME EVENTS
	// =====================================================

	/**
	 * Add an event mapping to a scheme
	 */
	async addSchemeEvent(input: CreateSchemeEventInput) {
		const [event] = await db
			.insert(notificationSchemeEvents)
			.values({
				schemeId: input.schemeId,
				eventType: input.eventType as any,
				recipientType: input.recipientType,
				recipientParams: input.recipientParams ?? {},
				channels: input.channels ?? ["in_app"],
				isEnabled: input.isEnabled ?? true,
			})
			.returning();

		return event;
	}

	/**
	 * Update a scheme event mapping
	 */
	async updateSchemeEvent(
		eventId: string,
		input: Partial<Omit<CreateSchemeEventInput, "schemeId">>
	) {
		const [event] = await db
			.update(notificationSchemeEvents)
			.set({
				...(input.recipientType && { recipientType: input.recipientType }),
				...(input.recipientParams && { recipientParams: input.recipientParams }),
				...(input.channels && { channels: input.channels }),
				...(typeof input.isEnabled === "boolean" && { isEnabled: input.isEnabled }),
			})
			.where(eq(notificationSchemeEvents.id, eventId))
			.returning();

		return event;
	}

	/**
	 * Remove an event mapping from a scheme
	 */
	async removeSchemeEvent(eventId: string) {
		await db
			.delete(notificationSchemeEvents)
			.where(eq(notificationSchemeEvents.id, eventId));

		return true;
	}

	/**
	 * Get all event mappings for a scheme
	 */
	async getSchemeEvents(schemeId: string) {
		return await db
			.select()
			.from(notificationSchemeEvents)
			.where(eq(notificationSchemeEvents.schemeId, schemeId));
	}

	/**
	 * Get event mappings for a specific event type in a scheme
	 */
	async getSchemeEventsByType(schemeId: string, eventType: string) {
		return await db
			.select()
			.from(notificationSchemeEvents)
			.where(
				and(
					eq(notificationSchemeEvents.schemeId, schemeId),
					eq(notificationSchemeEvents.eventType, eventType as any),
					eq(notificationSchemeEvents.isEnabled, true)
				)
			);
	}

	// =====================================================
	// PROJECT ASSIGNMENTS
	// =====================================================

	/**
	 * Assign a notification scheme to a project
	 */
	async assignSchemeToProject(projectId: string, schemeId: string) {
		// Upsert - replace existing assignment
		const [assignment] = await db
			.insert(projectNotificationSchemes)
			.values({
				projectId,
				schemeId,
			})
			.onConflictDoUpdate({
				target: projectNotificationSchemes.projectId,
				set: {
					schemeId,
					createdAt: new Date(),
				},
			})
			.returning();

		return assignment;
	}

	/**
	 * Remove notification scheme assignment from a project
	 */
	async removeSchemeFromProject(projectId: string) {
		await db
			.delete(projectNotificationSchemes)
			.where(eq(projectNotificationSchemes.projectId, projectId));

		return true;
	}

	/**
	 * Get the notification scheme for a project
	 * Returns default scheme if project has no specific assignment
	 */
	async getProjectScheme(projectId: string) {
		// Check for project-specific assignment
		const [assignment] = await db
			.select({
				scheme: notificationSchemes,
			})
			.from(projectNotificationSchemes)
			.innerJoin(
				notificationSchemes,
				eq(projectNotificationSchemes.schemeId, notificationSchemes.id)
			)
			.where(eq(projectNotificationSchemes.projectId, projectId))
			.limit(1);

		if (assignment) {
			return assignment.scheme;
		}

		// Fall back to default scheme
		return await this.getDefaultScheme();
	}

	/**
	 * Get all projects using a specific scheme
	 */
	async getProjectsUsingScheme(schemeId: string) {
		return await db
			.select({
				projectId: projectNotificationSchemes.projectId,
			})
			.from(projectNotificationSchemes)
			.where(eq(projectNotificationSchemes.schemeId, schemeId));
	}

	// =====================================================
	// NOTIFICATION RESOLUTION
	// =====================================================

	/**
	 * Get notification recipients for a specific event in a project
	 * This is the main method used by the notification system
	 */
	async getRecipientsForEvent(projectId: string, eventType: string) {
		// Get the scheme for this project
		const scheme = await this.getProjectScheme(projectId);

		if (!scheme) {
			return [];
		}

		// Get all recipient mappings for this event type
		const eventMappings = await this.getSchemeEventsByType(scheme.id, eventType);

		return eventMappings.map((mapping) => ({
			recipientType: mapping.recipientType,
			recipientParams: mapping.recipientParams,
			channels: mapping.channels,
		}));
	}
}

export const notificationSchemeRepository = new NotificationSchemeRepository();
