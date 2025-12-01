import { z } from 'zod';

// =============================================================================
// SCREEN VALIDATION SCHEMAS
// =============================================================================

/**
 * Screen operation types
 */
export const screenOperations = ['create', 'edit', 'view'] as const;
export type ScreenOperation = (typeof screenOperations)[number];

/**
 * Create screen schema
 */
export const createScreenSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
});

export type CreateScreenInput = z.infer<typeof createScreenSchema>;

/**
 * Update screen schema
 */
export const updateScreenSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
});

export type UpdateScreenInput = z.infer<typeof updateScreenSchema>;

/**
 * Screen ID schema
 */
export const screenIdSchema = z.object({
  id: z.string().uuid(),
});

export type ScreenIdInput = z.infer<typeof screenIdSchema>;

/**
 * Create screen tab schema
 */
export const createScreenTabSchema = z.object({
  screenId: z.string().uuid(),
  name: z.string().min(1).max(255),
  position: z.number().int().min(0).optional(),
});

export type CreateScreenTabInput = z.infer<typeof createScreenTabSchema>;

/**
 * Update screen tab schema
 */
export const updateScreenTabSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  position: z.number().int().min(0).optional(),
});

export type UpdateScreenTabInput = z.infer<typeof updateScreenTabSchema>;

/**
 * Reorder screen tabs schema
 */
export const reorderScreenTabsSchema = z.object({
  screenId: z.string().uuid(),
  tabOrder: z.array(
    z.object({
      id: z.string().uuid(),
      position: z.number().int().min(0),
    }),
  ),
});

export type ReorderScreenTabsInput = z.infer<typeof reorderScreenTabsSchema>;

/**
 * Add field to tab schema
 */
export const addFieldToTabSchema = z.object({
  tabId: z.string().uuid(),
  fieldId: z.string().uuid(),
  position: z.number().int().min(0).optional(),
  isRequiredOverride: z.boolean().optional(),
});

export type AddFieldToTabInput = z.infer<typeof addFieldToTabSchema>;

/**
 * Update tab field schema
 */
export const updateTabFieldSchema = z.object({
  id: z.string().uuid(),
  position: z.number().int().min(0).optional(),
  isRequiredOverride: z.boolean().optional().nullable(),
});

export type UpdateTabFieldInput = z.infer<typeof updateTabFieldSchema>;

/**
 * Reorder tab fields schema
 */
export const reorderTabFieldsSchema = z.object({
  tabId: z.string().uuid(),
  fieldOrder: z.array(
    z.object({
      id: z.string().uuid(),
      position: z.number().int().min(0),
    }),
  ),
});

export type ReorderTabFieldsInput = z.infer<typeof reorderTabFieldsSchema>;

/**
 * Create screen scheme schema
 */
export const createScreenSchemeSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export type CreateScreenSchemeInput = z.infer<typeof createScreenSchemeSchema>;

/**
 * Update screen scheme schema
 */
export const updateScreenSchemeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
});

export type UpdateScreenSchemeInput = z.infer<typeof updateScreenSchemeSchema>;

/**
 * Create screen scheme item schema
 */
export const createScreenSchemeItemSchema = z.object({
  schemeId: z.string().uuid(),
  issueTypeId: z.string().uuid().optional().nullable(),
  operation: z.enum(screenOperations),
  screenId: z.string().uuid(),
});

export type CreateScreenSchemeItemInput = z.infer<typeof createScreenSchemeItemSchema>;

/**
 * Update screen scheme item schema
 */
export const updateScreenSchemeItemSchema = z.object({
  id: z.string().uuid(),
  screenId: z.string().uuid(),
});

export type UpdateScreenSchemeItemInput = z.infer<typeof updateScreenSchemeItemSchema>;

/**
 * Assign screen scheme to project schema
 */
export const assignScreenSchemeToProjectSchema = z.object({
  projectId: z.string().uuid(),
  schemeId: z.string().uuid(),
});

export type AssignScreenSchemeToProjectInput = z.infer<typeof assignScreenSchemeToProjectSchema>;

/**
 * Resolve screen schema
 */
export const resolveScreenSchema = z.object({
  projectId: z.string().uuid(),
  issueTypeId: z.string().uuid(),
  operation: z.enum(screenOperations),
});

export type ResolveScreenInput = z.infer<typeof resolveScreenSchema>;

/**
 * Clone screen schema
 */
export const cloneScreenSchema = z.object({
  sourceId: z.string().uuid(),
  newName: z.string().min(1).max(255),
});

export type CloneScreenInput = z.infer<typeof cloneScreenSchema>;
