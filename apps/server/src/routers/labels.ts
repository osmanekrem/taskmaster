// =============================================================================
// LABELS ROUTER
// =============================================================================

import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../lib/trpc';
import { LabelService } from '../services/label-service';
import { LabelRepository } from '../repositories/label-repository';
import { ProjectRepository } from '../repositories/project-repository';
import { db } from '../db';
import { LABEL_COLORS } from '../db/schema/labels';
import {
  labelProjectIdSchema,
  labelIdSchema,
  searchLabelsSchema,
  createLabelSchema,
  createGlobalLabelSchema,
  updateLabelSchema,
  issueLabelIdSchema,
  issueLabelSchema,
  setIssueLabelsSchema,
  getIssuesByLabelSchema,
  getMostUsedLabelsSchema,
} from '@taskmaster/validation';

// Initialize dependencies
const labelRepository = new LabelRepository(db);
const projectRepository = new ProjectRepository(db);
const labelService = new LabelService(labelRepository, projectRepository);

export const labelsRouter = router({
  // ===========================================================================
  // LABELS
  // ===========================================================================

  /**
   * Get all labels for a project (including global)
   */
  list: protectedProcedure
    .input(labelProjectIdSchema)
    .query(async ({ input }) => {
      return labelService.getLabelsByProjectId(input.projectId);
    }),

  /**
   * Get all labels for a project with issue counts
   */
  listWithCounts: protectedProcedure
    .input(labelProjectIdSchema)
    .query(async ({ input }) => {
      return labelService.getLabelsWithCounts(input.projectId);
    }),

  /**
   * Get global labels only
   */
  listGlobal: protectedProcedure.query(async () => {
    return labelService.getGlobalLabels();
  }),

  /**
   * Get label by ID
   */
  getById: protectedProcedure
    .input(labelIdSchema)
    .query(async ({ input }) => {
      return labelService.getLabelById(input.id);
    }),

  /**
   * Search labels
   */
  search: protectedProcedure
    .input(searchLabelsSchema)
    .query(async ({ input }) => {
      return labelService.searchLabels(input.query, input.projectId);
    }),

  /**
   * Create a new label
   */
  create: protectedProcedure
    .input(createLabelSchema)
    .mutation(async ({ input }) => {
      return labelService.createLabel(input);
    }),

  /**
   * Create a global label (admin only)
   */
  createGlobal: adminProcedure
    .input(createGlobalLabelSchema)
    .mutation(async ({ input }) => {
      return labelService.createLabel(input);
    }),

  /**
   * Update a label
   */
  update: protectedProcedure
    .input(updateLabelSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return labelService.updateLabel(id, data);
    }),

  /**
   * Delete a label
   */
  delete: protectedProcedure
    .input(labelIdSchema)
    .mutation(async ({ input }) => {
      await labelService.deleteLabel(input.id);
      return { success: true };
    }),

  /**
   * Create default labels for a project
   */
  createDefaults: protectedProcedure
    .input(labelProjectIdSchema)
    .mutation(async ({ input }) => {
      return labelService.createDefaultLabels(input.projectId);
    }),

  /**
   * Get available colors
   */
  getColors: protectedProcedure.query(async () => {
    return LABEL_COLORS;
  }),

  // ===========================================================================
  // ISSUE LABELS
  // ===========================================================================

  /**
   * Get labels for an issue
   */
  getIssueLabels: protectedProcedure
    .input(issueLabelIdSchema)
    .query(async ({ input }) => {
      return labelService.getIssueLabels(input.issueId);
    }),

  /**
   * Add label to issue
   */
  addToIssue: protectedProcedure
    .input(issueLabelSchema)
    .mutation(async ({ input }) => {
      await labelService.addLabelToIssue(input.issueId, input.labelId);
      return { success: true };
    }),

  /**
   * Remove label from issue
   */
  removeFromIssue: protectedProcedure
    .input(issueLabelSchema)
    .mutation(async ({ input }) => {
      await labelService.removeLabelFromIssue(input.issueId, input.labelId);
      return { success: true };
    }),

  /**
   * Set all labels for an issue
   */
  setIssueLabels: protectedProcedure
    .input(setIssueLabelsSchema)
    .mutation(async ({ input }) => {
      await labelService.setIssueLabels(input.issueId, input.labelIds);
      return { success: true };
    }),

  /**
   * Get issue IDs by label
   */
  getIssuesByLabel: protectedProcedure
    .input(getIssuesByLabelSchema)
    .query(async ({ input }) => {
      return labelService.getIssueIdsByLabel(input.labelId);
    }),

  /**
   * Get most used labels for a project
   */
  getMostUsed: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ input }) => {
      return labelService.getMostUsedLabels(input.projectId, input.limit);
    }),
});
