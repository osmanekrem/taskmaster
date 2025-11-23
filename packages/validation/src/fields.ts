import { z } from 'zod';
import { idSchema } from './general';

// Create Field Schema (merged from web addFieldSchema and server createFieldSchema)
// Using server version with optional icon for flexibility
export const createFieldSchema = z.object({
  name: z.string().min(1, 'Alan adı zorunludur'),
  icon: z.string().optional(),
  fieldTypeId: z.string().min(1, "Alan türü ID'si zorunludur"),
});

export type CreateFieldSchema = z.infer<typeof createFieldSchema>;

// Edit Field Schema (merged from web and server versions)
// Using server version with optional icon for flexibility
export const editFieldSchema = z.object({
  fieldId: idSchema,
  name: z.string().min(1, 'Alan adı zorunludur'),
  icon: z.string().optional(),
  fieldTypeId: z.string().min(1, "Alan türü ID'si zorunludur"),
});

export type EditFieldSchema = z.infer<typeof editFieldSchema>;

// Select Option Schema
export const selectOptionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Seçenek adı zorunludur'),
  icon: z.string().optional(),
  order: z.number().min(0, 'Sıra numarası 0 veya daha büyük olmalıdır'),
});

export type SelectOptionSchema = z.infer<typeof selectOptionSchema>;

// Field Option Schema
export const fieldOptionSchema = z.object({
  id: z.string().optional(),
  value: z.string(),
  selectOptions: z.array(selectOptionSchema),
});

export type FieldOptionSchema = z.infer<typeof fieldOptionSchema>;

// Field With Details Schema
export const fieldWithDetailsSchema = z.object({
  id: z.string().optional(),
  options: z.array(fieldOptionSchema),
});

export type FieldWithDetailsSchema = z.infer<typeof fieldWithDetailsSchema>;

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

export const getSelectOptionsByFieldOptionIdRequestSchema = z.object({
  fieldOptionId: idSchema,
});

export type GetSelectOptionsByFieldOptionIdRequestSchema = z.infer<
  typeof getSelectOptionsByFieldOptionIdRequestSchema
>;

export const getSelectOptionsByFieldOptionIdsRequestSchema = z.object({
  fieldOptionIds: z.array(idSchema),
});

export type GetSelectOptionsByFieldOptionIdsRequestSchema = z.infer<
  typeof getSelectOptionsByFieldOptionIdsRequestSchema
>;

export const saveSelectOptionsRequestSchema = z.object({
  fieldOptionId: idSchema,
  options: z.array(selectOptionSchema),
});

export type SaveSelectOptionsRequestSchema = z.infer<
  typeof saveSelectOptionsRequestSchema
>;

export const updateFieldOptionValueRequestSchema = z.object({
  fieldOptionId: idSchema,
  value: z.string(),
});

export type UpdateFieldOptionValueRequestSchema = z.infer<
  typeof updateFieldOptionValueRequestSchema
>;

export const saveIssueTypeFieldsRequestSchema = z.object({
  issueTypeId: idSchema,
  fields: z.array(fieldWithDetailsSchema),
});

export type SaveIssueTypeFieldsRequestSchema = z.infer<
  typeof saveIssueTypeFieldsRequestSchema
>;

export const getIssueTypeFieldsByIssueTypeIdRequestSchema = z.object({
  issueTypeId: idSchema,
});

export type GetIssueTypeFieldsByIssueTypeIdRequestSchema = z.infer<
  typeof getIssueTypeFieldsByIssueTypeIdRequestSchema
>;
