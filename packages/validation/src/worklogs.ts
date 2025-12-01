import { z } from 'zod';

// =============================================================================
// TIME FORMAT VALIDATION
// =============================================================================

/**
 * Time format regex: supports patterns like "1w 2d 3h 30m 45s"
 * or raw seconds as number
 */
const timeFormatPattern = /^(\d+(?:\.\d+)?\s*[wdhms]\s*)+$/i;
const rawNumberPattern = /^\d+$/;

/**
 * Validates time format string
 */
export const timeFormatSchema = z.string().refine(
  (val) => {
    const trimmed = val.trim().toLowerCase();
    return rawNumberPattern.test(trimmed) || timeFormatPattern.test(trimmed);
  },
  {
    message:
      'Invalid time format. Use format like "2h 30m", "1w 2d", or raw seconds',
  },
);

// =============================================================================
// WORKLOG SCHEMAS
// =============================================================================

export const createWorklogSchema = z.object({
  issueId: z.string().min(1, 'Issue ID is required'),
  timeSpent: timeFormatSchema,
  startedAt: z.coerce.date(),
  description: z.string().max(4000).optional(),
  billable: z.boolean().optional().default(true),
  activityType: z.string().max(100).optional(),
  remainingEstimate: timeFormatSchema.optional(),
});

export const updateWorklogSchema = z.object({
  timeSpent: timeFormatSchema.optional(),
  startedAt: z.coerce.date().optional(),
  description: z.string().max(4000).optional(),
  billable: z.boolean().optional(),
  activityType: z.string().max(100).optional(),
});

export const worklogIdSchema = z.object({
  id: z.string().min(1, 'Worklog ID is required'),
});

export const issueWorklogSchema = z.object({
  issueId: z.string().min(1, 'Issue ID is required'),
});

// =============================================================================
// TIME TRACKING SCHEMAS
// =============================================================================

export const setEstimateSchema = z.object({
  issueId: z.string().min(1, 'Issue ID is required'),
  estimate: timeFormatSchema,
});

export const timeTrackingQuerySchema = z.object({
  issueId: z.string().min(1, 'Issue ID is required'),
});

// =============================================================================
// DATE RANGE SCHEMAS
// =============================================================================

export const worklogDateRangeSchema = z
  .object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    userId: z.string().optional(),
    issueId: z.string().optional(),
    projectId: z.string().optional(),
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: 'Start date must be before or equal to end date',
    path: ['endDate'],
  });

export const userWorklogsQuerySchema = z.object({
  userId: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

export const userSummaryQuerySchema = z
  .object({
    userId: z.string().optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: 'Start date must be before or equal to end date',
    path: ['endDate'],
  });

// =============================================================================
// SETTINGS SCHEMAS
// =============================================================================

export const timeTrackingSettingsSchema = z.object({
  projectId: z.string().nullable().optional(),
  workingHoursPerDay: z.number().int().min(1).max(24).optional().default(8),
  workingDaysPerWeek: z.number().int().min(1).max(7).optional().default(5),
  defaultTimeUnit: z.enum(['hour', 'day', 'week']).optional().default('hour'),
  copyEstimateToRemaining: z.boolean().optional().default(true),
  activityTypes: z
    .array(z.string().max(100))
    .max(20)
    .optional()
    .default(['development', 'review', 'testing', 'documentation', 'meeting']),
});

export const getSettingsQuerySchema = z.object({
  projectId: z.string().optional(),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CreateWorklogInput = z.infer<typeof createWorklogSchema>;
export type UpdateWorklogInput = z.infer<typeof updateWorklogSchema>;
export type WorklogDateRangeQuery = z.infer<typeof worklogDateRangeSchema>;
export type UserWorklogsQuery = z.infer<typeof userWorklogsQuerySchema>;
export type TimeTrackingSettingsInput = z.infer<
  typeof timeTrackingSettingsSchema
>;
