import { z } from 'zod';
import { protectedProcedure, router } from '@/lib/trpc';
import { successResponse } from '@/utils/response';
import { worklogService } from '@/services/worklog-service';
import { requirePermission } from '@/lib/middleware/permission';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const createWorklogSchema = z.object({
  issueId: z.string().min(1),
  timeSpent: z.string().min(1), // e.g., "2h 30m"
  startedAt: z.coerce.date(),
  description: z.string().optional(),
  billable: z.boolean().optional(),
  activityType: z.string().optional(),
  remainingEstimate: z.string().optional(),
});

const updateWorklogSchema = z.object({
  id: z.string().min(1),
  timeSpent: z.string().min(1).optional(),
  startedAt: z.coerce.date().optional(),
  description: z.string().optional(),
  billable: z.boolean().optional(),
  activityType: z.string().optional(),
});

const worklogIdSchema = z.object({
  id: z.string().min(1),
});

const issueIdSchema = z.object({
  issueId: z.string().min(1),
});

const setEstimateSchema = z.object({
  issueId: z.string().min(1),
  estimate: z.string().min(1),
});

const dateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  userId: z.string().optional(),
  issueId: z.string().optional(),
  projectId: z.string().optional(),
});

const userWorklogsSchema = z.object({
  userId: z.string().optional(), // If not provided, use current user
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

const updateSettingsSchema = z.object({
  projectId: z.string().nullable(),
  workingHoursPerDay: z.number().int().min(1).max(24).optional(),
  workingDaysPerWeek: z.number().int().min(1).max(7).optional(),
  defaultTimeUnit: z.enum(['hour', 'day', 'week']).optional(),
  copyEstimateToRemaining: z.boolean().optional(),
  activityTypes: z.array(z.string()).optional(),
});

const getSettingsSchema = z.object({
  projectId: z.string().optional(),
});

// =============================================================================
// WORKLOGS ROUTER
// =============================================================================

export const worklogsRouter = router({
  // ---------------------------------------------------------------------------
  // WORKLOGS CRUD
  // ---------------------------------------------------------------------------

  /**
   * Get worklogs for an issue
   */
  getByIssue: protectedProcedure
    .input(issueIdSchema)
    .use(requirePermission('worklog:view'))
    .query(async ({ input }) => {
      const data = await worklogService.getWorklogsForIssue(input.issueId);
      return successResponse(data, 'İş kayıtları başarıyla getirildi');
    }),

  /**
   * Get worklogs by user
   */
  getByUser: protectedProcedure
    .input(userWorklogsSchema)
    .use(requirePermission('worklog:view'))
    .query(async ({ ctx, input }) => {
      const userId = input.userId || ctx.session!.user.id;
      const data = await worklogService.getWorklogsByUser(userId, {
        limit: input.limit,
        offset: input.offset,
      });
      return successResponse(data, 'İş kayıtları başarıyla getirildi');
    }),

  /**
   * Get worklogs in date range
   */
  getByDateRange: protectedProcedure
    .input(dateRangeSchema)
    .use(requirePermission('worklog:view'))
    .query(async ({ input }) => {
      const data = await worklogService.getWorklogsByDateRange(
        input.startDate,
        input.endDate,
        {
          userId: input.userId,
          issueId: input.issueId,
          projectId: input.projectId,
        },
      );
      return successResponse(data, 'İş kayıtları başarıyla getirildi');
    }),

  /**
   * Get a single worklog
   */
  getById: protectedProcedure
    .input(worklogIdSchema)
    .use(requirePermission('worklog:view'))
    .query(async ({ input }) => {
      const data = await worklogService.getWorklog(input.id);
      return successResponse(data, 'İş kaydı başarıyla getirildi');
    }),

  /**
   * Create a new worklog
   */
  create: protectedProcedure
    .input(createWorklogSchema)
    .use(requirePermission('worklog:create'))
    .mutation(async ({ ctx, input }) => {
      const data = await worklogService.createWorklog(input, {
        userId: ctx.session!.user.id,
      });
      return successResponse(data, 'İş kaydı başarıyla oluşturuldu');
    }),

  /**
   * Update a worklog
   */
  update: protectedProcedure
    .input(updateWorklogSchema)
    .use(requirePermission('worklog:edit'))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      const data = await worklogService.updateWorklog(id, updateData, {
        userId: ctx.session!.user.id,
      });
      return successResponse(data, 'İş kaydı başarıyla güncellendi');
    }),

  /**
   * Delete a worklog
   */
  delete: protectedProcedure
    .input(worklogIdSchema)
    .use(requirePermission('worklog:delete'))
    .mutation(async ({ ctx, input }) => {
      await worklogService.deleteWorklog(input.id, {
        userId: ctx.session!.user.id,
      });
      return successResponse(null, 'İş kaydı başarıyla silindi');
    }),

  // ---------------------------------------------------------------------------
  // TIME TRACKING
  // ---------------------------------------------------------------------------

  /**
   * Get time tracking for an issue
   */
  getTimeTracking: protectedProcedure
    .input(issueIdSchema)
    .use(requirePermission('issue:view'))
    .query(async ({ input }) => {
      const data = await worklogService.getTimeTrackingFormatted(input.issueId);
      return successResponse(data, 'Zaman takibi başarıyla getirildi');
    }),

  /**
   * Set original estimate
   */
  setOriginalEstimate: protectedProcedure
    .input(setEstimateSchema)
    .use(requirePermission('issue:edit'))
    .mutation(async ({ ctx, input }) => {
      const data = await worklogService.setOriginalEstimate(
        input.issueId,
        input.estimate,
        { userId: ctx.session!.user.id },
      );
      return successResponse(data, 'Orijinal tahmin başarıyla güncellendi');
    }),

  /**
   * Set remaining estimate
   */
  setRemainingEstimate: protectedProcedure
    .input(setEstimateSchema)
    .use(requirePermission('issue:edit'))
    .mutation(async ({ ctx, input }) => {
      await worklogService.setRemainingEstimate(input.issueId, input.estimate, {
        userId: ctx.session!.user.id,
      });
      return successResponse(null, 'Kalan tahmin başarıyla güncellendi');
    }),

  // ---------------------------------------------------------------------------
  // SUMMARIES
  // ---------------------------------------------------------------------------

  /**
   * Get user worklog summary
   */
  getUserSummary: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
      }),
    )
    .use(requirePermission('worklog:view'))
    .query(async ({ ctx, input }) => {
      const userId = input.userId || ctx.session!.user.id;
      const data = await worklogService.getUserWorklogSummary(
        userId,
        input.startDate,
        input.endDate,
      );
      return successResponse(data, 'Özet başarıyla getirildi');
    }),

  // ---------------------------------------------------------------------------
  // SETTINGS
  // ---------------------------------------------------------------------------

  /**
   * Get time tracking settings
   */
  getSettings: protectedProcedure
    .input(getSettingsSchema)
    .use(requirePermission('project:view'))
    .query(async ({ input }) => {
      const data = await worklogService.getSettings(input.projectId);
      return successResponse(data, 'Ayarlar başarıyla getirildi');
    }),

  /**
   * Update time tracking settings
   */
  updateSettings: protectedProcedure
    .input(updateSettingsSchema)
    .use(requirePermission('project:edit'))
    .mutation(async ({ input }) => {
      const { projectId, ...settings } = input;
      const data = await worklogService.updateSettings(projectId, settings);
      return successResponse(data, 'Ayarlar başarıyla güncellendi');
    }),
});
