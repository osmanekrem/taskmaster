// =============================================================================
// COMPONENTS ROUTER
// =============================================================================

import { z } from 'zod';
import { router, protectedProcedure } from '../lib/trpc';
import { ComponentService } from '../services/component-service';
import { ComponentRepository } from '../repositories/component-repository';
import { ProjectRepository } from '../repositories/project-repository';
import { db } from '../db';

// Initialize dependencies
const componentRepository = new ComponentRepository(db);
const projectRepository = new ProjectRepository(db);
const componentService = new ComponentService(componentRepository, projectRepository);

export const componentsRouter = router({
  // ===========================================================================
  // COMPONENTS
  // ===========================================================================

  /**
   * Get all components for a project
   */
  list: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ input }) => {
      return componentService.getComponentsByProjectId(input.projectId);
    }),

  /**
   * Get all components for a project with issue counts
   */
  listWithCounts: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ input }) => {
      return componentService.getComponentsWithCounts(input.projectId);
    }),

  /**
   * Get component by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      return componentService.getComponentById(input.id);
    }),

  /**
   * Create a new component
   */
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        leadId: z.string().uuid().optional(),
        defaultAssigneeId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return componentService.createComponent(input);
    }),

  /**
   * Update a component
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional().nullable(),
        leadId: z.string().uuid().optional().nullable(),
        defaultAssigneeId: z.string().uuid().optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return componentService.updateComponent(id, data);
    }),

  /**
   * Delete a component
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await componentService.deleteComponent(input.id);
      return { success: true };
    }),

  // ===========================================================================
  // ISSUE COMPONENTS
  // ===========================================================================

  /**
   * Get components for an issue
   */
  getIssueComponents: protectedProcedure
    .input(z.object({ issueId: z.string().uuid() }))
    .query(async ({ input }) => {
      return componentService.getIssueComponents(input.issueId);
    }),

  /**
   * Add component to issue
   */
  addToIssue: protectedProcedure
    .input(
      z.object({
        issueId: z.string().uuid(),
        componentId: z.string().uuid(),
      })
    )
    .mutation(async ({ input }) => {
      await componentService.addComponentToIssue(input.issueId, input.componentId);
      return { success: true };
    }),

  /**
   * Remove component from issue
   */
  removeFromIssue: protectedProcedure
    .input(
      z.object({
        issueId: z.string().uuid(),
        componentId: z.string().uuid(),
      })
    )
    .mutation(async ({ input }) => {
      await componentService.removeComponentFromIssue(input.issueId, input.componentId);
      return { success: true };
    }),

  /**
   * Set all components for an issue (replace existing)
   */
  setIssueComponents: protectedProcedure
    .input(
      z.object({
        issueId: z.string().uuid(),
        componentIds: z.array(z.string().uuid()),
      })
    )
    .mutation(async ({ input }) => {
      await componentService.setIssueComponents(input.issueId, input.componentIds);
      return { success: true };
    }),

  /**
   * Get components where user is lead
   */
  getMyComponents: protectedProcedure.query(async ({ ctx }) => {
    return componentService.getComponentLeadComponents(ctx.session!.user.id);
  }),
});
