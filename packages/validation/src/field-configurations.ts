import { z } from 'zod';

// =============================================================================
// FIELD CONFIGURATION VALIDATION SCHEMAS
// =============================================================================

/**
 * Create field configuration schema
 */
export const createFieldConfigSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export type CreateFieldConfigInput = z.infer<typeof createFieldConfigSchema>;

/**
 * Update field configuration schema
 */
export const updateFieldConfigSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
});

export type UpdateFieldConfigInput = z.infer<typeof updateFieldConfigSchema>;

/**
 * Field configuration ID schema
 */
export const fieldConfigIdSchema = z.object({
  id: z.string().uuid(),
});

export type FieldConfigIdInput = z.infer<typeof fieldConfigIdSchema>;

/**
 * Create field configuration item schema
 */
export const createFieldConfigItemSchema = z.object({
  configId: z.string().uuid(),
  fieldId: z.string().uuid(),
  isRequired: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  renderer: z.string().optional().nullable(),
  defaultValue: z.string().optional().nullable(),
  descriptionOverride: z.string().optional().nullable(),
});

export type CreateFieldConfigItemInput = z.infer<typeof createFieldConfigItemSchema>;

/**
 * Update field configuration item schema
 */
export const updateFieldConfigItemSchema = z.object({
  id: z.string().uuid(),
  isRequired: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  renderer: z.string().optional().nullable(),
  defaultValue: z.string().optional().nullable(),
  descriptionOverride: z.string().optional().nullable(),
});

export type UpdateFieldConfigItemInput = z.infer<typeof updateFieldConfigItemSchema>;

/**
 * Upsert field configuration item schema
 */
export const upsertFieldConfigItemSchema = z.object({
  configId: z.string().uuid(),
  fieldId: z.string().uuid(),
  isRequired: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  renderer: z.string().optional().nullable(),
  defaultValue: z.string().optional().nullable(),
  descriptionOverride: z.string().optional().nullable(),
});

export type UpsertFieldConfigItemInput = z.infer<typeof upsertFieldConfigItemSchema>;

/**
 * Create field configuration scheme schema
 */
export const createFieldConfigSchemeSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export type CreateFieldConfigSchemeInput = z.infer<typeof createFieldConfigSchemeSchema>;

/**
 * Update field configuration scheme schema
 */
export const updateFieldConfigSchemeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
});

export type UpdateFieldConfigSchemeInput = z.infer<typeof updateFieldConfigSchemeSchema>;

/**
 * Create field configuration scheme item schema
 */
export const createFieldConfigSchemeItemSchema = z.object({
  schemeId: z.string().uuid(),
  issueTypeId: z.string().uuid().optional().nullable(),
  configId: z.string().uuid(),
});

export type CreateFieldConfigSchemeItemInput = z.infer<typeof createFieldConfigSchemeItemSchema>;

/**
 * Update field configuration scheme item schema
 */
export const updateFieldConfigSchemeItemSchema = z.object({
  id: z.string().uuid(),
  configId: z.string().uuid(),
});

export type UpdateFieldConfigSchemeItemInput = z.infer<typeof updateFieldConfigSchemeItemSchema>;

/**
 * Assign scheme to project schema
 */
export const assignFieldConfigSchemeToProjectSchema = z.object({
  projectId: z.string().uuid(),
  schemeId: z.string().uuid(),
});

export type AssignFieldConfigSchemeToProjectInput = z.infer<typeof assignFieldConfigSchemeToProjectSchema>;

/**
 * Resolve field configuration schema
 */
export const resolveFieldConfigSchema = z.object({
  projectId: z.string().uuid(),
  issueTypeId: z.string().uuid(),
});

export type ResolveFieldConfigInput = z.infer<typeof resolveFieldConfigSchema>;

/**
 * Resolve field behavior schema
 */
export const resolveFieldBehaviorSchema = z.object({
  projectId: z.string().uuid(),
  issueTypeId: z.string().uuid(),
  fieldId: z.string().uuid(),
});

export type ResolveFieldBehaviorInput = z.infer<typeof resolveFieldBehaviorSchema>;

/**
 * Clone field configuration schema
 */
export const cloneFieldConfigSchema = z.object({
  sourceId: z.string().uuid(),
  newName: z.string().min(1).max(255),
});

export type CloneFieldConfigInput = z.infer<typeof cloneFieldConfigSchema>;
