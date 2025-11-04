import { z } from 'zod';

export const createFieldSchema = z.object({
  name: z.string().min(1, 'Alan adı zorunludur'),
  description: z.string().optional(),
  icon: z.string().optional(),
  fieldTypeId: z.string().min(1, "Alan türü ID'si zorunludur"),
});

export type CreateFieldSchema = z.infer<typeof createFieldSchema>;

export const editFieldSchema = z.object({
  fieldId: z.string().min(1, "Alan ID'si zorunludur"),
  name: z.string().min(1, 'Alan adı zorunludur'),
  description: z.string().optional(),
  icon: z.string().optional(),
  fieldTypeId: z.string().min(1, "Alan türü ID'si zorunludur"),
});

export type EditFieldSchema = z.infer<typeof editFieldSchema>;

export const selectOptionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Seçenek adı zorunludur'),
  icon: z.string().optional(),
  fieldOptionId: z.string().min(1, "Alan seçeneği ID'si zorunludur"),
  order: z.number().min(0, 'Sıra numarası 0 veya daha büyük olmalıdır'),
});

export type SelectOptionSchema = z.infer<typeof selectOptionSchema>;

export const fieldOptionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Alan seçeneği adı zorunludur'),
  value: z.string().min(1, 'Alan seçeneği değeri zorunludur'),
  selectOptions: z.array(selectOptionSchema),
});

export type FieldOptionSchema = z.infer<typeof fieldOptionSchema>;

export const fieldWithDetailsSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Alan adı zorunludur'),
  description: z.string().optional(),
  icon: z.string().optional(),
  fieldTypeId: z.string().min(1, "Alan türü ID'si zorunludur"),
  options: z.array(fieldOptionSchema),
});

export type FieldWithDetailsSchema = z.infer<typeof fieldWithDetailsSchema>;
