import { z } from 'zod';
import { idSchema } from './general';

// Field config schema - JSONB config object
export const fieldConfigSchema = z.record(z.string(), z.unknown()).optional();

export type FieldConfigSchema = z.infer<typeof fieldConfigSchema>;

// Select option schema for field options
export const fieldSelectOptionSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Seçenek adı zorunludur'),
  icon: z.string().optional(),
  order: z.number().min(0),
});

export type FieldSelectOptionSchema = z.infer<typeof fieldSelectOptionSchema>;

// Create Field Schema
export const createFieldSchema = z.object({
  name: z.string().min(1, 'Alan adı zorunludur'),
  fieldType: z.string().min(1, 'Alan türü zorunludur'),
  icon: z.string().optional(),
  config: fieldConfigSchema,
  options: z.array(fieldSelectOptionSchema).optional(),
});

export type CreateFieldSchema = z.infer<typeof createFieldSchema>;

// Edit Field Schema
export const editFieldSchema = z.object({
  fieldId: idSchema,
  name: z.string().min(1, 'Alan adı zorunludur').optional(),
  icon: z.string().optional(),
  config: fieldConfigSchema,
  options: z.array(fieldSelectOptionSchema).optional(),
});

export type EditFieldSchema = z.infer<typeof editFieldSchema>;

// Legacy schemas (kept for backward compatibility during migration)
// Select Option Schema
export const selectOptionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Seçenek adı zorunludur'),
  icon: z.string().optional(),
  order: z.number().min(0, 'Sıra numarası 0 veya daha büyük olmalıdır'),
});

export type SelectOptionSchema = z.infer<typeof selectOptionSchema>;

// Issue Type Field Schema (for saving fields to issue type)
export const issueTypeFieldSchema = z.object({
  fieldId: idSchema, // Field ID
  order: z.number().min(0).optional(),
  configOverride: fieldConfigSchema,
  optionsOverride: z.array(fieldSelectOptionSchema).optional().nullable(),
});

export type IssueTypeFieldSchema = z.infer<typeof issueTypeFieldSchema>;

export const getFieldByIdRequestSchema = z.object({
  fieldId: idSchema,
});

export type GetFieldByIdRequestSchema = z.infer<
  typeof getFieldByIdRequestSchema
>;

export const deleteFieldRequestSchema = z.object({
  fieldId: idSchema,
});

export type DeleteFieldRequestSchema = z.infer<typeof deleteFieldRequestSchema>;

// Save Issue Type Fields Schema
export const saveIssueTypeFieldsRequestSchema = z.object({
  issueTypeId: idSchema,
  fields: z.array(issueTypeFieldSchema),
});

export type SaveIssueTypeFieldsRequestSchema = z.infer<
  typeof saveIssueTypeFieldsRequestSchema
>;

// Get Issue Type Fields Schema
export const getIssueTypeFieldsByIssueTypeIdRequestSchema = z.object({
  issueTypeId: idSchema,
});

export type GetIssueTypeFieldsByIssueTypeIdRequestSchema = z.infer<
  typeof getIssueTypeFieldsByIssueTypeIdRequestSchema
>;

// Update Issue Type Field Override Schema
export const updateIssueTypeFieldOverrideRequestSchema = z.object({
  issueTypeId: idSchema,
  fieldId: idSchema,
  configOverride: fieldConfigSchema,
  optionsOverride: z.array(fieldSelectOptionSchema).optional().nullable(),
});

export type UpdateIssueTypeFieldOverrideRequestSchema = z.infer<
  typeof updateIssueTypeFieldOverrideRequestSchema
>;

// Add Field to Issue Type Schema
export const addFieldToIssueTypeRequestSchema = z.object({
  issueTypeId: idSchema,
  fieldId: idSchema,
  order: z.number().min(0).optional(),
  configOverride: fieldConfigSchema,
  optionsOverride: z.array(fieldSelectOptionSchema).optional().nullable(),
});

export type AddFieldToIssueTypeRequestSchema = z.infer<
  typeof addFieldToIssueTypeRequestSchema
>;

// Remove Field from Issue Type Schema
export const removeFieldFromIssueTypeRequestSchema = z.object({
  issueTypeId: idSchema,
  fieldId: idSchema,
});

export type RemoveFieldFromIssueTypeRequestSchema = z.infer<
  typeof removeFieldFromIssueTypeRequestSchema
>;

// Update Issue Type Field Schema (for repository)
export const updateIssueTypeFieldSchema = z.object({
  order: z.number().min(0).optional(),
  configOverride: fieldConfigSchema,
  optionsOverride: z.array(fieldSelectOptionSchema).optional().nullable(),
});

export type UpdateIssueTypeFieldSchema = z.infer<
  typeof updateIssueTypeFieldSchema
>;
