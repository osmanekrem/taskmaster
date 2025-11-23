import { z } from 'zod';
import { idSchema } from './general';

export const createFieldTypeSchema = z.object({
  name: z.string().min(1, 'Alan türü adı zorunludur'),
  component: z.string().min(1, 'Bileşen adı zorunludur'),
  icon: z.string().min(1, 'İkon zorunludur'),
});

export type CreateFieldTypeSchema = z.infer<typeof createFieldTypeSchema>;

export const editFieldTypeSchema = z.object({
  fieldTypeId: idSchema,
  name: z.string().min(1, 'Alan türü adı zorunludur'),
  component: z.string().min(1, 'Bileşen adı zorunludur'),
  icon: z.string().min(1, 'İkon zorunludur'),
});

export type EditFieldTypeSchema = z.infer<typeof editFieldTypeSchema>;

export const getFieldTypeByIdRequestSchema = z.object({
  fieldTypeId: idSchema,
});

export type GetFieldTypeByIdRequestSchema = z.infer<
  typeof getFieldTypeByIdRequestSchema
>;

export const getFieldTypeWithOptionsByIdRequestSchema = z.object({
  fieldTypeId: idSchema,
});

export type GetFieldTypeWithOptionsByIdRequestSchema = z.infer<
  typeof getFieldTypeWithOptionsByIdRequestSchema
>;

export const deleteFieldTypeRequestSchema = z.object({
  fieldTypeId: idSchema,
});

export type DeleteFieldTypeRequestSchema = z.infer<
  typeof deleteFieldTypeRequestSchema
>;
