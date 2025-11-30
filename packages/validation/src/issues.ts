import { z } from 'zod';
import { paginationSchema } from './general';

// =============================================================================
// FIELD VALUE SCHEMAS (Dinamik field değerleri için)
// =============================================================================

// Base field value - JSONB olarak saklanacak
export const fieldValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()), // multi-select
  z.array(z.object({ id: z.string(), name: z.string() })), // user-picker array
  z.object({ url: z.string().url(), name: z.string().optional() }), // url
  z.null(),
]);

export type FieldValueType = z.infer<typeof fieldValueSchema>;

// Field value for create/update
export const issueFieldValueInputSchema = z.object({
  fieldId: z.string().uuid(),
  value: fieldValueSchema,
});

// =============================================================================
// ISSUE SCHEMAS
// =============================================================================

// Issue key format: PRJ-123
export const issueKeySchema = z.string().regex(
  /^[A-Z]{2,10}-\d+$/,
  'Issue key must be in format: PRJ-123'
);

// Create Issue
export const createIssueSchema = z.object({
  projectId: z.string().uuid(),
  issueTypeId: z.string().uuid(),
  
  // Optional initial status (if not provided, uses workflow's initial status)
  statusId: z.string().uuid().optional(),
  
  // Optional assignee
  assigneeId: z.string().uuid().optional(),
  
  // Parent/Epic for hierarchy
  parentId: z.string().uuid().optional(),
  epicId: z.string().uuid().optional(),
  
  // Due date
  dueDate: z.coerce.date().optional(),
  
  // Field values
  fieldValues: z.array(issueFieldValueInputSchema).optional(),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;

// Update Issue (partial update)
export const updateIssueSchema = z.object({
  issueTypeId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  epicId: z.string().uuid().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
});

export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;

// Update Field Values (batch update)
export const updateFieldValuesSchema = z.object({
  fieldValues: z.array(issueFieldValueInputSchema),
});

export type UpdateFieldValuesInput = z.infer<typeof updateFieldValuesSchema>;

// Status Transition
export const transitionIssueSchema = z.object({
  toStatusId: z.string().uuid(),
  resolutionId: z.string().uuid().optional(), // Required for "done" statuses
  comment: z.string().max(5000).optional(),
});

export type TransitionIssueInput = z.infer<typeof transitionIssueSchema>;

// =============================================================================
// QUERY/FILTER SCHEMAS
// =============================================================================

export const issueFiltersSchema = z.object({
  // Pagination
  ...paginationSchema.shape,
  
  // Project filter (required for most queries)
  projectId: z.string().uuid().optional(),
  projectKey: z.string().optional(),
  
  // Type filters
  issueTypeId: z.string().uuid().optional(),
  issueTypeIds: z.array(z.string().uuid()).optional(),
  
  // Status filters
  statusId: z.string().uuid().optional(),
  statusIds: z.array(z.string().uuid()).optional(),
  statusCategory: z.enum(['todo', 'in_progress', 'done']).optional(),
  
  // Resolution filter
  resolutionId: z.string().uuid().nullable().optional(),
  isResolved: z.boolean().optional(),
  
  // People filters
  reporterId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  isUnassigned: z.boolean().optional(),
  
  // Hierarchy filters
  parentId: z.string().uuid().nullable().optional(),
  epicId: z.string().uuid().nullable().optional(),
  hasParent: z.boolean().optional(),
  
  // Search
  search: z.string().optional(), // Searches in key and field values
  
  // Date filters
  createdAfter: z.coerce.date().optional(),
  createdBefore: z.coerce.date().optional(),
  updatedAfter: z.coerce.date().optional(),
  dueBefore: z.coerce.date().optional(),
  
  // Sorting
  sortBy: z.enum(['created', 'updated', 'key', 'status', 'priority', 'dueDate']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type IssueFilters = z.infer<typeof issueFiltersSchema>;

// Get Issue by ID or Key
export const getIssueSchema = z.object({
  id: z.string().uuid().optional(),
  key: issueKeySchema.optional(),
}).refine(
  (data) => data.id || data.key,
  { message: 'Either id or key must be provided' }
);

// =============================================================================
// HISTORY SCHEMAS
// =============================================================================

export const historyChangeSchema = z.object({
  field: z.string(), // Field name (e.g., "status", "assignee", "Başlık")
  fieldId: z.string().uuid().optional(), // For custom fields
  oldValue: z.any(),
  newValue: z.any(),
});

export const issueHistoryFiltersSchema = z.object({
  issueId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  ...paginationSchema.shape,
});

// =============================================================================
// MOVE ISSUE (change project)
// =============================================================================

export const moveIssueSchema = z.object({
  targetProjectId: z.string().uuid(),
  // Optionally change issue type if needed
  targetIssueTypeId: z.string().uuid().optional(),
});

export type MoveIssueInput = z.infer<typeof moveIssueSchema>;

// =============================================================================
// BULK OPERATIONS
// =============================================================================

export const bulkUpdateIssuesSchema = z.object({
  issueIds: z.array(z.string().uuid()).min(1).max(100),
  update: z.object({
    assigneeId: z.string().uuid().nullable().optional(),
    statusId: z.string().uuid().optional(),
    epicId: z.string().uuid().nullable().optional(),
  }),
});

export type BulkUpdateIssuesInput = z.infer<typeof bulkUpdateIssuesSchema>;
