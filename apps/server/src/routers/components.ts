// =============================================================================
// COMPONENTS ROUTER
// =============================================================================

import { z } from 'zod';
import { router, protectedProcedure } from '../lib/trpc';
import { ComponentService } from '../services/component-service';
import { ComponentRepository } from '../repositories/component-repository';
import { ProjectRepository } from '../repositories/project-repository';
import { db } from '../db';
import {
  componentProjectIdSchema,
  componentIdSchema,
  createComponentSchema,
  updateComponentSchema,
  issueComponentIdSchema,
  issueComponentSchema,
  setIssueComponentsSchema,
} from '@taskmaster/validation';

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
    .input(componentProjectIdSchema)
    .query(async ({ input }) => {
      return componentService.getComponentsByProjectId(input.projectId);
    }),

  /**
   * Get all components for a project with issue counts
   */
  listWithCounts: protectedProcedure
    .input(componentProjectIdSchema)
    .query(async ({ input }) => {
      return componentService.getComponentsWithCounts(input.projectId);
    }),

  /**
   * Get component by ID
   */
  getById: protectedProcedure
    .input(componentIdSchema)
    .query(async ({ input }) => {
      return componentService.getComponentById(input.id);
    }),

  /**
   * Create a new component
   */
  create: protectedProcedure
    .input(createComponentSchema)
    .mutation(async ({ input }) => {
      return componentService.createComponent(input);
    }),

  /**
   * Update a component
   */
  update: protectedProcedure
    .input(updateComponentSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return componentService.updateComponent(id, data);
    }),

  /**
   * Delete a component
   */
  delete: protectedProcedure
    .input(componentIdSchema)
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
    .input(issueComponentIdSchema)
    .query(async ({ input }) => {
      return componentService.getIssueComponents(input.issueId);
    }),

  /**
   * Add component to issue
   */
  addToIssue: protectedProcedure
    .input(issueComponentSchema)
    .mutation(async ({ input }) => {
      await componentService.addComponentToIssue(input.issueId, input.componentId);
      return { success: true };
    }),

  /**
   * Remove component from issue
   */
  removeFromIssue: protectedProcedure
    .input(issueComponentSchema)
    .mutation(async ({ input }) => {
      await componentService.removeComponentFromIssue(input.issueId, input.componentId);
      return { success: true };
    }),

  /**
   * Set all components for an issue (replace existing)
   */
  setIssueComponents: protectedProcedure
    .input(setIssueComponentsSchema)
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
