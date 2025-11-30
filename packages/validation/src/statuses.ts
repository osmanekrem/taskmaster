import { z } from 'zod';
import { idSchema } from './general';

// =============================================================================
// STATUS CATEGORY
// =============================================================================

export const statusCategorySchema = z.enum(['todo', 'in_progress', 'done']);
export type StatusCategorySchema = z.infer<typeof statusCategorySchema>;

// =============================================================================
// STATUS SCHEMAS
// =============================================================================

export const createStatusSchema = z.object({
  name: z.string().min(1, 'Status adı zorunludur').max(100, 'Status adı en fazla 100 karakter olabilir'),
  description: z.string().max(500, 'Açıklama en fazla 500 karakter olabilir').optional(),
  category: statusCategorySchema,
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Geçerli bir hex renk kodu giriniz').optional(),
  icon: z.string().max(50).optional(),
});

export type CreateStatusSchema = z.infer<typeof createStatusSchema>;

export const updateStatusSchema = z.object({
  statusId: idSchema,
  name: z.string().min(1, 'Status adı zorunludur').max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  category: statusCategorySchema.optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Geçerli bir hex renk kodu giriniz').optional(),
  icon: z.string().max(50).optional().nullable(),
});

export type UpdateStatusSchema = z.infer<typeof updateStatusSchema>;

export const getStatusByIdSchema = z.object({
  statusId: idSchema,
});

export type GetStatusByIdSchema = z.infer<typeof getStatusByIdSchema>;

export const deleteStatusSchema = z.object({
  statusId: idSchema,
});

export type DeleteStatusSchema = z.infer<typeof deleteStatusSchema>;

// =============================================================================
// RESOLUTION SCHEMAS
// =============================================================================

export const createResolutionSchema = z.object({
  name: z.string().min(1, 'Resolution adı zorunludur').max(100, 'Resolution adı en fazla 100 karakter olabilir'),
  description: z.string().max(500, 'Açıklama en fazla 500 karakter olabilir').optional(),
  isDefault: z.boolean().optional(),
});

export type CreateResolutionSchema = z.infer<typeof createResolutionSchema>;

export const updateResolutionSchema = z.object({
  resolutionId: idSchema,
  name: z.string().min(1, 'Resolution adı zorunludur').max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  isDefault: z.boolean().optional(),
});

export type UpdateResolutionSchema = z.infer<typeof updateResolutionSchema>;

export const getResolutionByIdSchema = z.object({
  resolutionId: idSchema,
});

export type GetResolutionByIdSchema = z.infer<typeof getResolutionByIdSchema>;

export const deleteResolutionSchema = z.object({
  resolutionId: idSchema,
});

export type DeleteResolutionSchema = z.infer<typeof deleteResolutionSchema>;
