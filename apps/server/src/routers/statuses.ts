import { protectedProcedure, router } from '@/lib/trpc';
import { successResponse } from '@/utils/response';
import {
  createStatusSchema,
  updateStatusSchema,
  getStatusByIdSchema,
  deleteStatusSchema,
  createResolutionSchema,
  updateResolutionSchema,
  getResolutionByIdSchema,
  deleteResolutionSchema,
} from '@taskmaster/validation';

export const statusesRouter = router({
  // =============================================================================
  // STATUSES
  // =============================================================================

  /**
   * Get all statuses
   */
  getStatuses: protectedProcedure.query(async ({ ctx }) => {
    const data = await ctx.services.status.getAllStatuses();
    return successResponse(data, 'Statusler başarıyla getirildi');
  }),

  /**
   * Get a status by ID
   */
  getStatusById: protectedProcedure
    .input(getStatusByIdSchema)
    .query(async ({ ctx, input }) => {
      const data = await ctx.services.status.getStatusById(input);
      return successResponse(data, 'Status başarıyla getirildi');
    }),

  /**
   * Create a new status
   */
  createStatus: protectedProcedure
    .input(createStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.status.createStatus(input);
      return successResponse(data, 'Status başarıyla oluşturuldu');
    }),

  /**
   * Update a status
   */
  updateStatus: protectedProcedure
    .input(updateStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.status.updateStatus(input);
      return successResponse(data, 'Status başarıyla güncellendi');
    }),

  /**
   * Delete a status
   */
  deleteStatus: protectedProcedure
    .input(deleteStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.status.deleteStatus(input);
      return successResponse(data, 'Status başarıyla silindi');
    }),

  // =============================================================================
  // RESOLUTIONS
  // =============================================================================

  /**
   * Get all resolutions
   */
  getResolutions: protectedProcedure.query(async ({ ctx }) => {
    const data = await ctx.services.status.getAllResolutions();
    return successResponse(data, 'Resolution\'lar başarıyla getirildi');
  }),

  /**
   * Get a resolution by ID
   */
  getResolutionById: protectedProcedure
    .input(getResolutionByIdSchema)
    .query(async ({ ctx, input }) => {
      const data = await ctx.services.status.getResolutionById(input);
      return successResponse(data, 'Resolution başarıyla getirildi');
    }),

  /**
   * Get default resolution
   */
  getDefaultResolution: protectedProcedure.query(async ({ ctx }) => {
    const data = await ctx.services.status.getDefaultResolution();
    return successResponse(data, 'Varsayılan resolution başarıyla getirildi');
  }),

  /**
   * Create a new resolution
   */
  createResolution: protectedProcedure
    .input(createResolutionSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.status.createResolution(input);
      return successResponse(data, 'Resolution başarıyla oluşturuldu');
    }),

  /**
   * Update a resolution
   */
  updateResolution: protectedProcedure
    .input(updateResolutionSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.status.updateResolution(input);
      return successResponse(data, 'Resolution başarıyla güncellendi');
    }),

  /**
   * Delete a resolution
   */
  deleteResolution: protectedProcedure
    .input(deleteResolutionSchema)
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.services.status.deleteResolution(input);
      return successResponse(data, 'Resolution başarıyla silindi');
    }),
});
