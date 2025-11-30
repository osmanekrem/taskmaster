import { z } from "zod";

import { protectedProcedure, router } from "@/lib/trpc";
import { notificationSchemeRepository } from "@/repositories/notification-scheme-repository";
import { TRPCError } from "@trpc/server";

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const createSchemeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isDefault: z.boolean().optional(),
});

const updateSchemeSchema = z.object({
  schemeId: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isDefault: z.boolean().optional(),
});

const addSchemeEventSchema = z.object({
  schemeId: z.string().uuid(),
  eventType: z.string(),
  recipientType: z.enum([
    'current_assignee',
    'reporter',
    'project_lead',
    'component_lead',
    'all_watchers',
    'users_in_role',
    'single_user',
    'group',
    'custom_field_user',
    'current_user',
    'previous_assignee',
  ]),
  recipientParams: z.object({
    userId: z.string().optional(),
    roleId: z.string().optional(),
    groupId: z.string().optional(),
    fieldId: z.string().optional(),
  }).optional(),
  channels: z.array(z.enum(['in_app', 'email', 'push'])).optional(),
  isEnabled: z.boolean().optional(),
});

const updateSchemeEventSchema = z.object({
  eventId: z.string().uuid(),
  recipientType: z.enum([
    'current_assignee',
    'reporter',
    'project_lead',
    'component_lead',
    'all_watchers',
    'users_in_role',
    'single_user',
    'group',
    'custom_field_user',
    'current_user',
    'previous_assignee',
  ]).optional(),
  recipientParams: z.object({
    userId: z.string().optional(),
    roleId: z.string().optional(),
    groupId: z.string().optional(),
    fieldId: z.string().optional(),
  }).optional(),
  channels: z.array(z.enum(['in_app', 'email', 'push'])).optional(),
  isEnabled: z.boolean().optional(),
});

const assignSchemeSchema = z.object({
  projectId: z.string(),
  schemeId: z.string().uuid(),
});

// =====================================================
// NOTIFICATION SCHEMES ROUTER
// =====================================================

export const notificationSchemesRouter = router({
  /**
   * Get all notification schemes
   */
  list: protectedProcedure
    .query(async () => {
      return await notificationSchemeRepository.getAllSchemes();
    }),

  /**
   * Get a notification scheme by ID
   */
  getById: protectedProcedure
    .input(z.object({ schemeId: z.string().uuid() }))
    .query(async ({ input }) => {
      const scheme = await notificationSchemeRepository.getSchemeById(input.schemeId);
      
      if (!scheme) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Notification scheme not found',
        });
      }
      
      return scheme;
    }),

  /**
   * Get the default notification scheme
   */
  getDefault: protectedProcedure
    .query(async () => {
      return await notificationSchemeRepository.getDefaultScheme();
    }),

  /**
   * Create a new notification scheme
   */
  create: protectedProcedure
    .input(createSchemeSchema)
    .mutation(async ({ input }) => {
      return await notificationSchemeRepository.createScheme(input);
    }),

  /**
   * Update a notification scheme
   */
  update: protectedProcedure
    .input(updateSchemeSchema)
    .mutation(async ({ input }) => {
      const { schemeId, ...updates } = input;
      
      const scheme = await notificationSchemeRepository.updateScheme(schemeId, updates);
      
      if (!scheme) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Notification scheme not found',
        });
      }
      
      return scheme;
    }),

  /**
   * Delete a notification scheme
   */
  delete: protectedProcedure
    .input(z.object({ schemeId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      try {
        await notificationSchemeRepository.deleteScheme(input.schemeId);
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error instanceof Error ? error.message : 'Failed to delete scheme',
        });
      }
    }),

  /**
   * Add an event mapping to a scheme
   */
  addEvent: protectedProcedure
    .input(addSchemeEventSchema)
    .mutation(async ({ input }) => {
      return await notificationSchemeRepository.addSchemeEvent({
        schemeId: input.schemeId,
        eventType: input.eventType,
        recipientType: input.recipientType,
        recipientParams: input.recipientParams,
        channels: input.channels,
        isEnabled: input.isEnabled,
      });
    }),

  /**
   * Update an event mapping
   */
  updateEvent: protectedProcedure
    .input(updateSchemeEventSchema)
    .mutation(async ({ input }) => {
      const { eventId, ...updates } = input;
      
      const event = await notificationSchemeRepository.updateSchemeEvent(eventId, updates);
      
      if (!event) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event mapping not found',
        });
      }
      
      return event;
    }),

  /**
   * Remove an event mapping
   */
  removeEvent: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await notificationSchemeRepository.removeSchemeEvent(input.eventId);
      return { success: true };
    }),

  /**
   * Get the notification scheme for a project
   */
  getProjectScheme: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      return await notificationSchemeRepository.getProjectScheme(input.projectId);
    }),

  /**
   * Assign a notification scheme to a project
   */
  assignToProject: protectedProcedure
    .input(assignSchemeSchema)
    .mutation(async ({ input }) => {
      return await notificationSchemeRepository.assignSchemeToProject(
        input.projectId,
        input.schemeId
      );
    }),

  /**
   * Remove notification scheme assignment from a project
   */
  removeFromProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ input }) => {
      await notificationSchemeRepository.removeSchemeFromProject(input.projectId);
      return { success: true };
    }),

  /**
   * Get all projects using a specific scheme
   */
  getProjectsUsingScheme: protectedProcedure
    .input(z.object({ schemeId: z.string().uuid() }))
    .query(async ({ input }) => {
      return await notificationSchemeRepository.getProjectsUsingScheme(input.schemeId);
    }),
});
