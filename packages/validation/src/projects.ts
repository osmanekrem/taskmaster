import { z } from 'zod';
import { idSchema } from './general';

// =============================================================================
// PROJECT KEY VALIDATION
// =============================================================================

// Project key: 2-10 uppercase letters, used in issue keys (PRJ-123)
export const projectKeySchema = z
  .string()
  .min(2, 'Proje anahtarı en az 2 karakter olmalı')
  .max(10, 'Proje anahtarı en fazla 10 karakter olabilir')
  .regex(/^[A-Z][A-Z0-9]*$/, 'Proje anahtarı büyük harf ile başlamalı ve sadece büyük harf/rakam içermeli')
  .transform((val) => val.toUpperCase());

// =============================================================================
// PROJECT SETTINGS SCHEMA
// =============================================================================

export const projectSettingsSchema = z.object({
  issueKeyPrefix: z.string().max(10).optional(),
  nextIssueNumber: z.number().int().min(1).optional(),
  defaultAssigneeRule: z.enum(['unassigned', 'project_lead', 'component_lead']).optional(),
  enableTimeTracking: z.boolean().optional(),
  enableSprints: z.boolean().optional(),
  enableComponents: z.boolean().optional(),
  enableVersions: z.boolean().optional(),
  notifyOnIssueCreate: z.boolean().optional(),
  notifyOnIssueUpdate: z.boolean().optional(),
  notifyOnComment: z.boolean().optional(),
}).optional();

export type ProjectSettingsSchema = z.infer<typeof projectSettingsSchema>;

// =============================================================================
// PROJECT CRUD SCHEMAS
// =============================================================================

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Proje adı zorunludur').max(100, 'Proje adı en fazla 100 karakter olabilir'),
  key: projectKeySchema,
  description: z.string().max(1000, 'Açıklama en fazla 1000 karakter olabilir').optional(),
  icon: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Geçerli bir hex renk kodu giriniz').optional(),
  leadId: idSchema.optional(),
  defaultWorkflowId: idSchema.optional(),
  settings: projectSettingsSchema,
});

export type CreateProjectSchema = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  projectId: idSchema,
  name: z.string().min(1, 'Proje adı zorunludur').max(100).optional(),
  key: projectKeySchema.optional(),
  description: z.string().max(1000).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  leadId: idSchema.optional().nullable(),
  defaultWorkflowId: idSchema.optional().nullable(),
  settings: projectSettingsSchema,
  isArchived: z.boolean().optional(),
});

export type UpdateProjectSchema = z.infer<typeof updateProjectSchema>;

export const getProjectByIdSchema = z.object({
  projectId: idSchema,
});

export type GetProjectByIdSchema = z.infer<typeof getProjectByIdSchema>;

export const getProjectByKeySchema = z.object({
  key: z.string().min(1),
});

export type GetProjectByKeySchema = z.infer<typeof getProjectByKeySchema>;

export const deleteProjectSchema = z.object({
  projectId: idSchema,
});

export type DeleteProjectSchema = z.infer<typeof deleteProjectSchema>;

export const archiveProjectSchema = z.object({
  projectId: idSchema,
  isArchived: z.boolean(),
});

export type ArchiveProjectSchema = z.infer<typeof archiveProjectSchema>;

// =============================================================================
// PROJECT ISSUE TYPE SCHEMAS
// =============================================================================

export const addIssueTypeToProjectSchema = z.object({
  projectId: idSchema,
  issueTypeId: idSchema,
  workflowId: idSchema.optional(), // If not provided, uses project's default workflow
});

export type AddIssueTypeToProjectSchema = z.infer<typeof addIssueTypeToProjectSchema>;

export const removeIssueTypeFromProjectSchema = z.object({
  projectId: idSchema,
  issueTypeId: idSchema,
});

export type RemoveIssueTypeFromProjectSchema = z.infer<typeof removeIssueTypeFromProjectSchema>;

export const updateProjectIssueTypeWorkflowSchema = z.object({
  projectId: idSchema,
  issueTypeId: idSchema,
  workflowId: idSchema.optional().nullable(), // null = use project's default
});

export type UpdateProjectIssueTypeWorkflowSchema = z.infer<typeof updateProjectIssueTypeWorkflowSchema>;

export const getProjectIssueTypesSchema = z.object({
  projectId: idSchema,
});

export type GetProjectIssueTypesSchema = z.infer<typeof getProjectIssueTypesSchema>;

// Bulk add issue types to project
export const bulkAddIssueTypesToProjectSchema = z.object({
  projectId: idSchema,
  issueTypes: z.array(z.object({
    issueTypeId: idSchema,
    workflowId: idSchema.optional(),
  })),
});

export type BulkAddIssueTypesToProjectSchema = z.infer<typeof bulkAddIssueTypesToProjectSchema>;

// =============================================================================
// PROJECT SETTINGS SCHEMAS
// =============================================================================

export const updateProjectSettingsSchema = z.object({
  projectId: idSchema,
  settings: projectSettingsSchema.unwrap(), // Remove optional wrapper
});

export type UpdateProjectSettingsSchema = z.infer<typeof updateProjectSettingsSchema>;

// =============================================================================
// LIST/FILTER SCHEMAS
// =============================================================================

export const listProjectsSchema = z.object({
  includeArchived: z.boolean().optional().default(false),
  leadId: idSchema.optional(), // Filter by lead
  search: z.string().max(100).optional(), // Search by name or key
});

export type ListProjectsSchema = z.infer<typeof listProjectsSchema>;
