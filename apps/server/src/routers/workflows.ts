import { protectedProcedure, router } from '@/lib/trpc';
import { successResponse } from '@/utils/response';
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  getWorkflowByIdSchema,
  deleteWorkflowSchema,
  addStatusToWorkflowSchema,
  removeStatusFromWorkflowSchema,
  updateWorkflowStatusSchema,
  getWorkflowStatusesSchema,
  reorderWorkflowStatusesSchema,
  createTransitionSchema,
  updateTransitionSchema,
  deleteTransitionSchema,
  getTransitionsByWorkflowSchema,
  getAvailableTransitionsSchema,
} from '@taskmaster/validation';

export const workflowsRouter = router({
  // =============================================================================
  // WORKFLOWS
  // =============================================================================

  /**
   * Get all workflows
   */
  getWorkflows: protectedProcedure.query(async ({ ctx }) => {
    const data = await ctx.services.workflow.getAllWorkflows();
    return successResponse(data, 'Workflow\'lar başarıyla getirildi');
  }),

  /**
   * Get a workflow by ID with full details
   */
  getWorkflowById: protectedProcedure
    .input(getWorkflowByIdSchema)
    .query(async ({ ctx, input }) => {
      const data = await ctx.services.workflow.getWorkflowById(input);
      return successResponse(data, 'Workflow başarıyla getirildi');
    }),

  /**
   * Get default workflow
   */
  getDefaultWorkflow: protectedProcedure.query(async ({ ctx }) => {
    const data = await ctx.services.workflow.getDefaultWorkflow();
    return successResponse(data, 'Varsayılan workflow başarıyla getirildi');
  }),

  /**
   * Create a new workflow
   */
  createWorkflow: protectedProcedure
    .input(createWorkflowSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.workflow.createWorkflow(input);
      return successResponse(data, 'Workflow başarıyla oluşturuldu');
    }),

  /**
   * Update a workflow
   */
  updateWorkflow: protectedProcedure
    .input(updateWorkflowSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.workflow.updateWorkflow(input);
      return successResponse(data, 'Workflow başarıyla güncellendi');
    }),

  /**
   * Delete a workflow
   */
  deleteWorkflow: protectedProcedure
    .input(deleteWorkflowSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.workflow.deleteWorkflow(input);
      return successResponse(data, 'Workflow başarıyla silindi');
    }),

  // =============================================================================
  // WORKFLOW STATUSES
  // =============================================================================

  /**
   * Get all statuses in a workflow
   */
  getWorkflowStatuses: protectedProcedure
    .input(getWorkflowStatusesSchema)
    .query(async ({ ctx, input }) => {
      const data = await ctx.services.workflow.getWorkflowStatuses(input);
      return successResponse(data, 'Workflow statusleri başarıyla getirildi');
    }),

  /**
   * Add a status to a workflow
   */
  addStatusToWorkflow: protectedProcedure
    .input(addStatusToWorkflowSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.workflow.addStatusToWorkflow(input);
      return successResponse(data, 'Status workflow\'a başarıyla eklendi');
    }),

  /**
   * Update a status in a workflow
   */
  updateWorkflowStatus: protectedProcedure
    .input(updateWorkflowStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.workflow.updateWorkflowStatus(input);
      return successResponse(data, 'Workflow status başarıyla güncellendi');
    }),

  /**
   * Remove a status from a workflow
   */
  removeStatusFromWorkflow: protectedProcedure
    .input(removeStatusFromWorkflowSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.workflow.removeStatusFromWorkflow(input);
      return successResponse(data, 'Status workflow\'dan başarıyla kaldırıldı');
    }),

  /**
   * Reorder statuses in a workflow
   */
  reorderWorkflowStatuses: protectedProcedure
    .input(reorderWorkflowStatusesSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.workflow.reorderWorkflowStatuses(input);
      return successResponse(data, 'Workflow statusleri başarıyla sıralandı');
    }),

  // =============================================================================
  // WORKFLOW TRANSITIONS
  // =============================================================================

  /**
   * Get all transitions in a workflow
   */
  getTransitions: protectedProcedure
    .input(getTransitionsByWorkflowSchema)
    .query(async ({ ctx, input }) => {
      const data = await ctx.services.workflow.getTransitionsByWorkflow(input);
      return successResponse(data, 'Transition\'lar başarıyla getirildi');
    }),

  /**
   * Get available transitions from a status
   */
  getAvailableTransitions: protectedProcedure
    .input(getAvailableTransitionsSchema)
    .query(async ({ ctx, input }) => {
      const data = await ctx.services.workflow.getAvailableTransitions(input);
      return successResponse(data, 'Mevcut transition\'lar başarıyla getirildi');
    }),

  /**
   * Create a new transition
   */
  createTransition: protectedProcedure
    .input(createTransitionSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.workflow.createTransition(input);
      return successResponse(data, 'Transition başarıyla oluşturuldu');
    }),

  /**
   * Update a transition
   */
  updateTransition: protectedProcedure
    .input(updateTransitionSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.workflow.updateTransition(input);
      return successResponse(data, 'Transition başarıyla güncellendi');
    }),

  /**
   * Delete a transition
   */
  deleteTransition: protectedProcedure
    .input(deleteTransitionSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.workflow.deleteTransition(input);
      return successResponse(data, 'Transition başarıyla silindi');
    }),
});
