import { z } from 'zod';

// =============================================================================
// FILTER VALIDATION SCHEMAS
// =============================================================================

/**
 * Filter share types
 */
export const filterShareTypes = ['private', 'group', 'project', 'public'] as const;
export type FilterShareType = (typeof filterShareTypes)[number];

/**
 * Filter subscription schedules
 */
export const filterSubscriptionSchedules = ['daily', 'weekly', 'monthly'] as const;
export type FilterSubscriptionSchedule = (typeof filterSubscriptionSchedules)[number];

/**
 * Create filter schema
 */
export const createFilterSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  jql: z.string().min(1),
  shareType: z.enum(filterShareTypes).optional(),
  sharedGroups: z.array(z.string().uuid()).optional(),
  sharedProjects: z.array(z.string().uuid()).optional(),
});

export type CreateFilterInput = z.infer<typeof createFilterSchema>;

/**
 * Update filter schema
 */
export const updateFilterSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  jql: z.string().min(1).optional(),
  shareType: z.enum(filterShareTypes).optional(),
  sharedGroups: z.array(z.string().uuid()).optional(),
  sharedProjects: z.array(z.string().uuid()).optional(),
  position: z.number().int().min(0).optional(),
});

export type UpdateFilterInput = z.infer<typeof updateFilterSchema>;

/**
 * Filter ID schema
 */
export const filterIdSchema = z.object({
  id: z.string().uuid(),
});

export type FilterIdInput = z.infer<typeof filterIdSchema>;

/**
 * Clone filter schema
 */
export const cloneFilterSchema = z.object({
  sourceId: z.string().uuid(),
  newName: z.string().min(1).max(255),
});

export type CloneFilterInput = z.infer<typeof cloneFilterSchema>;

/**
 * Subscribe to filter schema
 */
export const subscribeToFilterSchema = z.object({
  filterId: z.string().uuid(),
  schedule: z.enum(filterSubscriptionSchedules),
});

export type SubscribeToFilterInput = z.infer<typeof subscribeToFilterSchema>;

/**
 * Execute filter schema
 */
export const executeFilterSchema = z.object({
  filterId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export type ExecuteFilterInput = z.infer<typeof executeFilterSchema>;

/**
 * Search by JQL schema
 */
export const searchJqlSchema = z.object({
  jql: z.string().min(1),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export type SearchJqlInput = z.infer<typeof searchJqlSchema>;

/**
 * Validate JQL schema
 */
export const validateJqlSchema = z.object({
  jql: z.string(),
});

export type ValidateJqlInput = z.infer<typeof validateJqlSchema>;

/**
 * Search filters schema
 */
export const searchFiltersSchema = z.object({
  query: z.string().min(1),
});

export type SearchFiltersInput = z.infer<typeof searchFiltersSchema>;

/**
 * Build JQL schema
 */
export const buildJqlSchema = z.object({
  project: z.string().optional(),
  status: z.union([z.string(), z.array(z.string())]).optional(),
  assignee: z.string().optional(),
  reporter: z.string().optional(),
  issueType: z.union([z.string(), z.array(z.string())]).optional(),
  priority: z.union([z.string(), z.array(z.string())]).optional(),
  sprint: z.string().optional(),
  labels: z.array(z.string()).optional(),
  text: z.string().optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  updatedAfter: z.string().datetime().optional(),
  updatedBefore: z.string().datetime().optional(),
  dueAfter: z.string().datetime().optional(),
  dueBefore: z.string().datetime().optional(),
  resolution: z.string().optional(),
  orderBy: z.string().optional(),
  orderDirection: z.enum(['ASC', 'DESC']).optional(),
});

export type BuildJqlInput = z.infer<typeof buildJqlSchema>;
