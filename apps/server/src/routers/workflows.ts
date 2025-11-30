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
  getAvailableTransitionsForIssueSchema,
  executeTransitionSchema,
  validateTransitionRequestSchema,
} from '@taskmaster/validation';
import { requirePermission } from '@/lib/middleware/permission';

export const workflowsRouter = router({
  // =============================================================================
  // WORKFLOWS
  // =============================================================================

  /**
   * Get all workflows
   */
  getWorkflows: protectedProcedure
    .use(requirePermission('workflow:view'))
    .query(async ({ ctx }) => {
      const data = await ctx.services.workflow.getAllWorkflows();
      return successResponse(data, 'Workflow\'lar başarıyla getirildi');
    }),

  /**
   * Get a workflow by ID with full details
   */
  getWorkflowById: protectedProcedure
    .input(getWorkflowByIdSchema)
    .use(requirePermission('workflow:view'))
    .query(async ({ ctx, input }) => {
      const data = await ctx.services.workflow.getWorkflowById(input);
      return successResponse(data, 'Workflow başarıyla getirildi');
    }),

  /**
   * Get default workflow
   */
  getDefaultWorkflow: protectedProcedure
    .use(requirePermission('workflow:view'))
    .query(async ({ ctx }) => {
      const data = await ctx.services.workflow.getDefaultWorkflow();
      return successResponse(data, 'Varsayılan workflow başarıyla getirildi');
    }),

  /**
   * Create a new workflow
   */
  createWorkflow: protectedProcedure
    .input(createWorkflowSchema)
    .use(requirePermission('admin:manage_workflows'))
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.workflow.createWorkflow(input);
      return successResponse(data, 'Workflow başarıyla oluşturuldu');
    }),

  /**
   * Update a workflow
   */
  updateWorkflow: protectedProcedure
    .input(updateWorkflowSchema)
    .use(requirePermission('workflow:edit'))
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.workflow.updateWorkflow(input);
      return successResponse(data, 'Workflow başarıyla güncellendi');
    }),

  /**
   * Delete a workflow
   */
  deleteWorkflow: protectedProcedure
    .input(deleteWorkflowSchema)
    .use(requirePermission('admin:manage_workflows'))
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
    .use(requirePermission('workflow:view'))
    .query(async ({ ctx, input }) => {
      const data = await ctx.services.workflow.getWorkflowStatuses(input);
      return successResponse(data, 'Workflow statusleri başarıyla getirildi');
    }),

  /**
   * Add a status to a workflow
   */
  addStatusToWorkflow: protectedProcedure
    .input(addStatusToWorkflowSchema)
    .use(requirePermission('workflow:edit'))
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.workflow.addStatusToWorkflow(input);
      return successResponse(data, 'Status workflow\'a başarıyla eklendi');
    }),

  /**
   * Update a status in a workflow
   */
  updateWorkflowStatus: protectedProcedure
    .input(updateWorkflowStatusSchema)
    .use(requirePermission('workflow:edit'))
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.workflow.updateWorkflowStatus(input);
      return successResponse(data, 'Workflow status başarıyla güncellendi');
    }),

  /**
   * Remove a status from a workflow
   */
  removeStatusFromWorkflow: protectedProcedure
    .input(removeStatusFromWorkflowSchema)
    .use(requirePermission('workflow:edit'))
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.workflow.removeStatusFromWorkflow(input);
      return successResponse(data, 'Status workflow\'dan başarıyla kaldırıldı');
    }),

  /**
   * Reorder statuses in a workflow
   */
  reorderWorkflowStatuses: protectedProcedure
    .input(reorderWorkflowStatusesSchema)
    .use(requirePermission('workflow:edit'))
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
    .use(requirePermission('workflow:view'))
    .query(async ({ ctx, input }) => {
      const data = await ctx.services.workflow.getTransitionsByWorkflow(input);
      return successResponse(data, 'Transition\'lar başarıyla getirildi');
    }),

  /**
   * Get available transitions from a status
   */
  getAvailableTransitions: protectedProcedure
    .input(getAvailableTransitionsSchema)
    .use(requirePermission('workflow:view'))
    .query(async ({ ctx, input }) => {
      const data = await ctx.services.workflow.getAvailableTransitions(input);
      return successResponse(data, 'Mevcut transition\'lar başarıyla getirildi');
    }),

  /**
   * Create a new transition
   */
  createTransition: protectedProcedure
    .input(createTransitionSchema)
    .use(requirePermission('workflow:edit'))
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.workflow.createTransition(input);
      return successResponse(data, 'Transition başarıyla oluşturuldu');
    }),

  /**
   * Update a transition
   */
  updateTransition: protectedProcedure
    .input(updateTransitionSchema)
    .use(requirePermission('workflow:edit'))
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.workflow.updateTransition(input);
      return successResponse(data, 'Transition başarıyla güncellendi');
    }),

  /**
   * Delete a transition
   */
  deleteTransition: protectedProcedure
    .input(deleteTransitionSchema)
    .use(requirePermission('workflow:edit'))
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.workflow.deleteTransition(input);
      return successResponse(data, 'Transition başarıyla silindi');
    }),

  // =============================================================================
  // WORKFLOW ENGINE ENDPOINTS
  // =============================================================================

  /**
   * Get available transitions for an issue using the workflow engine
   * Evaluates conditions to determine which transitions the user can execute
   */
  getAvailableTransitionsForIssue: protectedProcedure
    .input(getAvailableTransitionsForIssueSchema)
    .use(requirePermission('issue:view'))
    .query(async ({ ctx, input }) => {
      const data = await ctx.services.workflow.getAvailableTransitionsForIssue({
        ...input,
        userId: ctx.session!.user.id,
      });
      return successResponse(data, 'Mevcut transition\'lar başarıyla getirildi');
    }),

  /**
   * Execute a workflow transition on an issue
   */
  executeTransition: protectedProcedure
    .input(executeTransitionSchema)
    .use(requirePermission('issue:edit'))
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.workflow.executeTransition({
        ...input,
        userId: ctx.session!.user.id,
      });
      return successResponse(data, 'Transition başarıyla çalıştırıldı');
    }),

  /**
   * Validate a transition without executing it
   */
  validateTransitionRequest: protectedProcedure
    .input(validateTransitionRequestSchema)
    .use(requirePermission('issue:view'))
    .query(async ({ ctx, input }) => {
      const data = await ctx.services.workflow.validateTransitionRequest({
        ...input,
        userId: ctx.session!.user.id,
      });
      return successResponse(data, 'Transition doğrulaması tamamlandı');
    }),
});
