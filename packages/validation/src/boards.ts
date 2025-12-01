import { z } from 'zod';

// =============================================================================
// BOARD VALIDATION SCHEMAS
// =============================================================================

/**
 * Board types
 */
export const boardTypes = ['scrum', 'kanban'] as const;
export type BoardType = (typeof boardTypes)[number];

/**
 * Swimlane types
 */
export const swimlaneTypes = [
  'none',
  'assignee',
  'epic',
  'parent',
  'priority',
  'custom_field',
] as const;
export type SwimlaneType = (typeof swimlaneTypes)[number];

/**
 * Constraint types
 */
export const constraintTypes = ['none', 'warn', 'block'] as const;
export type ConstraintType = (typeof constraintTypes)[number];

/**
 * Card sizes
 */
export const cardSizes = ['compact', 'medium', 'detailed'] as const;
export type CardSize = (typeof cardSizes)[number];

/**
 * Create board schema
 */
export const createBoardSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  type: z.enum(boardTypes),
  projectId: z.string().uuid(),
  filterJql: z.string().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  createDefaultColumns: z.boolean().optional().default(true),
});

export type CreateBoardInput = z.infer<typeof createBoardSchema>;

/**
 * Update board schema
 */
export const updateBoardSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  filterJql: z.string().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;

/**
 * Board ID schema
 */
export const boardIdSchema = z.object({
  id: z.string().uuid(),
});

export type BoardIdInput = z.infer<typeof boardIdSchema>;

/**
 * Create board column schema
 */
export const createBoardColumnSchema = z.object({
  boardId: z.string().uuid(),
  name: z.string().min(1).max(255),
  statusIds: z.array(z.string().uuid()).optional().default([]),
  position: z.number().int().min(0).optional(),
  minIssues: z.number().int().min(0).optional(),
  maxIssues: z.number().int().min(0).optional(),
  constraintType: z.enum(constraintTypes).optional(),
  color: z.string().optional(),
});

export type CreateBoardColumnInput = z.infer<typeof createBoardColumnSchema>;

/**
 * Update board column schema
 */
export const updateBoardColumnSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  statusIds: z.array(z.string().uuid()).optional(),
  minIssues: z.number().int().min(0).optional().nullable(),
  maxIssues: z.number().int().min(0).optional().nullable(),
  constraintType: z.enum(constraintTypes).optional(),
  color: z.string().optional().nullable(),
});

export type UpdateBoardColumnInput = z.infer<typeof updateBoardColumnSchema>;

/**
 * Reorder board columns schema
 */
export const reorderBoardColumnsSchema = z.object({
  boardId: z.string().uuid(),
  columnOrder: z.array(
    z.object({
      id: z.string().uuid(),
      position: z.number().int().min(0),
    }),
  ),
});

export type ReorderBoardColumnsInput = z.infer<typeof reorderBoardColumnsSchema>;

/**
 * Set swimlane schema
 */
export const setBoardSwimlaneSchema = z.object({
  boardId: z.string().uuid(),
  type: z.enum(swimlaneTypes),
  customFieldId: z.string().uuid().optional().nullable(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export type SetBoardSwimlaneInput = z.infer<typeof setBoardSwimlaneSchema>;

/**
 * Create quick filter schema
 */
export const createBoardQuickFilterSchema = z.object({
  boardId: z.string().uuid(),
  name: z.string().min(1).max(255),
  jql: z.string().min(1),
  position: z.number().int().min(0).optional(),
  isDefault: z.boolean().optional(),
});

export type CreateBoardQuickFilterInput = z.infer<typeof createBoardQuickFilterSchema>;

/**
 * Update quick filter schema
 */
export const updateBoardQuickFilterSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  jql: z.string().min(1).optional(),
  isDefault: z.boolean().optional(),
});

export type UpdateBoardQuickFilterInput = z.infer<typeof updateBoardQuickFilterSchema>;

/**
 * Reorder quick filters schema
 */
export const reorderBoardQuickFiltersSchema = z.object({
  boardId: z.string().uuid(),
  filterOrder: z.array(
    z.object({
      id: z.string().uuid(),
      position: z.number().int().min(0),
    }),
  ),
});

export type ReorderBoardQuickFiltersInput = z.infer<typeof reorderBoardQuickFiltersSchema>;

/**
 * Set card layout schema
 */
export const setBoardCardLayoutSchema = z.object({
  boardId: z.string().uuid(),
  cardColorFieldId: z.string().uuid().optional().nullable(),
  cardColorMapping: z.record(z.string(), z.string()).optional(),
  visibleFields: z.array(z.string().uuid()).optional(),
  showAvatar: z.boolean().optional(),
  showPriority: z.boolean().optional(),
  showIssueType: z.boolean().optional(),
  showLabels: z.boolean().optional(),
  showDueDate: z.boolean().optional(),
  showEstimate: z.boolean().optional(),
  cardSize: z.enum(cardSizes).optional(),
});

export type SetBoardCardLayoutInput = z.infer<typeof setBoardCardLayoutSchema>;

/**
 * Set user board settings schema
 */
export const setBoardUserSettingsSchema = z.object({
  boardId: z.string().uuid(),
  collapsedSwimlanes: z.array(z.string()).optional(),
  activeQuickFilters: z.array(z.string().uuid()).optional(),
  collapsedColumns: z.array(z.string().uuid()).optional(),
});

export type SetBoardUserSettingsInput = z.infer<typeof setBoardUserSettingsSchema>;

/**
 * Get board data schema
 */
export const getBoardDataSchema = z.object({
  boardId: z.string().uuid(),
  sprintId: z.string().uuid().optional(),
  quickFilterIds: z.array(z.string().uuid()).optional(),
});

export type GetBoardDataInput = z.infer<typeof getBoardDataSchema>;

/**
 * Clone board schema
 */
export const cloneBoardSchema = z.object({
  sourceId: z.string().uuid(),
  newName: z.string().min(1).max(255),
});

export type CloneBoardInput = z.infer<typeof cloneBoardSchema>;
