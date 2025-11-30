import {z} from 'zod';

// =====================================================
// SPRINT STATUS
// =====================================================

export const SPRINT_STATUSES = ['planned', 'active', 'completed', 'cancelled'] as const;
export const sprintStatusSchema = z.enum(SPRINT_STATUSES);
export type SprintStatus = z.infer<typeof sprintStatusSchema>;

// =====================================================
// SPRINT HISTORY ACTIONS
// =====================================================

export const SPRINT_HISTORY_ACTIONS = [
	'sprint_created',
	'sprint_started',
	'sprint_completed',
	'sprint_cancelled',
	'sprint_updated',
	'issue_added',
	'issue_removed',
	'issue_completed',
	'goal_updated',
	'dates_updated',
] as const;

export const sprintHistoryActionSchema = z.enum(SPRINT_HISTORY_ACTIONS);
export type SprintHistoryAction = z.infer<typeof sprintHistoryActionSchema>;

// =====================================================
// SPRINT SCHEMAS
// =====================================================

/**
 * Sprint response schema
 */
export const sprintSchema = z.object({
	id: z.string(),
	projectId: z.string(),
	name: z.string(),
	goal: z.string().nullable(),
	startDate: z.date().nullable(),
	endDate: z.date().nullable(),
	status: sprintStatusSchema,
	completedAt: z.date().nullable(),
	completedById: z.string().nullable(),
	metrics: z.object({
		plannedPoints: z.number().optional(),
		plannedIssueCount: z.number().optional(),
		completedPoints: z.number().optional(),
		completedIssueCount: z.number().optional(),
		addedPoints: z.number().optional(),
		addedIssueCount: z.number().optional(),
		removedPoints: z.number().optional(),
		removedIssueCount: z.number().optional(),
		velocity: z.number().optional(),
	}).nullable(),
	sortOrder: z.number(),
	createdAt: z.date(),
	updatedAt: z.date(),
	createdById: z.string().nullable(),
	// Extended fields
	issueCount: z.number().optional(),
	totalPoints: z.number().optional(),
	completedIssueCount: z.number().optional(),
	project: z.object({
		id: z.string(),
		name: z.string(),
		key: z.string(),
	}).optional(),
});

/**
 * Create sprint input
 */
export const createSprintSchema = z.object({
	projectId: z.string(),
	name: z.string().min(1).max(100),
	goal: z.string().max(1000).optional(),
	startDate: z.coerce.date().optional(),
	endDate: z.coerce.date().optional(),
}).refine(
	(data) => {
		if (data.startDate && data.endDate) {
			return data.startDate < data.endDate;
		}
		return true;
	},
	{
		message: 'End date must be after start date',
		path: ['endDate'],
	}
);

/**
 * Update sprint input
 */
export const updateSprintSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	goal: z.string().max(1000).optional().nullable(),
	startDate: z.coerce.date().optional().nullable(),
	endDate: z.coerce.date().optional().nullable(),
});

/**
 * Get sprint by ID
 */
export const getSprintByIdSchema = z.object({
	id: z.string(),
	includeIssues: z.boolean().optional().default(false),
	includeHistory: z.boolean().optional().default(false),
	includeBurndown: z.boolean().optional().default(false),
});

/**
 * Get sprints (with filtering)
 */
export const getSprintsSchema = z.object({
	projectId: z.string(),
	status: sprintStatusSchema.optional(),
	includeMetrics: z.boolean().optional().default(false),
	// Pagination
	page: z.number().int().positive().optional().default(1),
	limit: z.number().int().positive().max(100).optional().default(20),
});

/**
 * Start sprint input
 */
export const startSprintSchema = z.object({
	id: z.string(),
	startDate: z.coerce.date().optional(), // Defaults to now
	endDate: z.coerce.date(), // Required when starting
	goal: z.string().max(1000).optional(),
});

/**
 * Complete sprint input
 */
export const completeSprintSchema = z.object({
	id: z.string(),
	// Where to move incomplete issues
	moveIncompleteIssuesTo: z.enum(['backlog', 'next_sprint']).optional().default('backlog'),
	nextSprintId: z.string().optional(), // Required if moveIncompleteIssuesTo is 'next_sprint'
}).refine(
	(data) => {
		if (data.moveIncompleteIssuesTo === 'next_sprint' && !data.nextSprintId) {
			return false;
		}
		return true;
	},
	{
		message: 'Next sprint ID is required when moving issues to next sprint',
		path: ['nextSprintId'],
	}
);

/**
 * Delete sprint input
 */
export const deleteSprintSchema = z.object({
	id: z.string(),
	moveIssuesTo: z.enum(['backlog', 'another_sprint']).optional().default('backlog'),
	targetSprintId: z.string().optional(),
});

// =====================================================
// SPRINT ISSUE SCHEMAS
// =====================================================

/**
 * Sprint issue response schema
 */
export const sprintIssueSchema = z.object({
	id: z.string(),
	sprintId: z.string(),
	issueId: z.string(),
	position: z.number(),
	addedAt: z.date(),
	addedById: z.string().nullable(),
	storyPointsSnapshot: z.number().nullable(),
	// Extended
	issue: z.object({
		id: z.string(),
		key: z.string(),
		summary: z.string(),
		status: z.object({
			id: z.string(),
			name: z.string(),
			color: z.string().nullable(),
		}).optional(),
		issueType: z.object({
			id: z.string(),
			name: z.string(),
			icon: z.string().nullable(),
		}).optional(),
		assignee: z.object({
			id: z.string(),
			name: z.string().nullable(),
			image: z.string().nullable(),
		}).nullable().optional(),
		storyPoints: z.number().nullable().optional(),
		priority: z.string().nullable().optional(),
	}).optional(),
});

/**
 * Add issue to sprint
 */
export const addIssueToSprintSchema = z.object({
	sprintId: z.string(),
	issueId: z.string(),
	position: z.number().int().min(0).optional(), // Defaults to end
});

/**
 * Add multiple issues to sprint
 */
export const addIssuesToSprintSchema = z.object({
	sprintId: z.string(),
	issueIds: z.array(z.string()).min(1),
});

/**
 * Remove issue from sprint
 */
export const removeIssueFromSprintSchema = z.object({
	issueId: z.string(),
});

/**
 * Move issue between sprints
 */
export const moveIssueToSprintSchema = z.object({
	issueId: z.string(),
	targetSprintId: z.string().nullable(), // null = backlog
	position: z.number().int().min(0).optional(),
});

/**
 * Reorder issues within sprint
 */
export const reorderSprintIssuesSchema = z.object({
	sprintId: z.string(),
	issueId: z.string(),
	newPosition: z.number().int().min(0),
});

/**
 * Get sprint issues
 */
export const getSprintIssuesSchema = z.object({
	sprintId: z.string(),
	// Pagination
	page: z.number().int().positive().optional().default(1),
	limit: z.number().int().positive().max(100).optional().default(50),
});

/**
 * Get backlog issues (issues not in any sprint)
 */
export const getBacklogIssuesSchema = z.object({
	projectId: z.string(),
	// Filtering
	issueTypeId: z.string().optional(),
	statusId: z.string().optional(),
	assigneeId: z.string().optional(),
	// Pagination
	page: z.number().int().positive().optional().default(1),
	limit: z.number().int().positive().max(100).optional().default(50),
});

// =====================================================
// SPRINT HISTORY SCHEMAS
// =====================================================

/**
 * Sprint history entry schema
 */
export const sprintHistorySchema = z.object({
	id: z.string(),
	sprintId: z.string(),
	action: sprintHistoryActionSchema,
	issueId: z.string().nullable(),
	data: z.object({
		oldValue: z.unknown().optional(),
		newValue: z.unknown().optional(),
		storyPoints: z.number().optional(),
		reason: z.string().optional(),
	}).nullable(),
	performedById: z.string().nullable(),
	createdAt: z.date(),
	// Extended
	performedBy: z.object({
		id: z.string(),
		name: z.string().nullable(),
		image: z.string().nullable(),
	}).nullable().optional(),
	issue: z.object({
		id: z.string(),
		key: z.string(),
		summary: z.string(),
	}).nullable().optional(),
});

/**
 * Get sprint history
 */
export const getSprintHistorySchema = z.object({
	sprintId: z.string(),
	action: sprintHistoryActionSchema.optional(),
	// Pagination
	page: z.number().int().positive().optional().default(1),
	limit: z.number().int().positive().max(100).optional().default(50),
});

// =====================================================
// BURNDOWN SCHEMAS
// =====================================================

/**
 * Burndown data point schema
 */
export const burndownDataPointSchema = z.object({
	id: z.string(),
	sprintId: z.string(),
	date: z.date(),
	remainingPoints: z.number(),
	remainingIssueCount: z.number(),
	completedPoints: z.number(),
	completedIssueCount: z.number(),
	idealRemainingPoints: z.number().nullable(),
});

/**
 * Get burndown chart data
 */
export const getBurndownSchema = z.object({
	sprintId: z.string(),
});

/**
 * Burndown chart response
 */
export const burndownChartSchema = z.object({
	sprint: z.object({
		id: z.string(),
		name: z.string(),
		startDate: z.date().nullable(),
		endDate: z.date().nullable(),
		totalPoints: z.number(),
		totalIssues: z.number(),
	}),
	dataPoints: z.array(burndownDataPointSchema),
	idealLine: z.array(z.object({
		date: z.date(),
		points: z.number(),
	})),
});

// =====================================================
// VELOCITY SCHEMAS
// =====================================================

/**
 * Get velocity chart data
 */
export const getVelocitySchema = z.object({
	projectId: z.string(),
	sprintCount: z.number().int().positive().max(20).optional().default(10),
});

/**
 * Velocity data point schema
 */
export const velocityDataPointSchema = z.object({
	sprintId: z.string(),
	sprintName: z.string(),
	committedPoints: z.number(),
	completedPoints: z.number(),
	completedIssueCount: z.number(),
	startDate: z.date().nullable(),
	endDate: z.date().nullable(),
});

/**
 * Velocity chart response
 */
export const velocityChartSchema = z.object({
	sprints: z.array(velocityDataPointSchema),
	averageVelocity: z.number(),
	predictedCapacity: z.number(),
});

// =====================================================
// ACTIVE SPRINT SCHEMAS
// =====================================================

/**
 * Get active sprint for a project
 */
export const getActiveSprintSchema = z.object({
	projectId: z.string(),
});

/**
 * Sprint board data (for Kanban/Scrum board)
 */
export const sprintBoardSchema = z.object({
	sprint: sprintSchema,
	columns: z.array(z.object({
		status: z.object({
			id: z.string(),
			name: z.string(),
			color: z.string().nullable(),
		}),
		issues: z.array(z.object({
			id: z.string(),
			key: z.string(),
			summary: z.string(),
			storyPoints: z.number().nullable(),
			priority: z.string().nullable(),
			assignee: z.object({
				id: z.string(),
				name: z.string().nullable(),
				image: z.string().nullable(),
			}).nullable(),
			issueType: z.object({
				id: z.string(),
				name: z.string(),
				icon: z.string().nullable(),
			}),
		})),
		issueCount: z.number(),
		totalPoints: z.number(),
	})),
	stats: z.object({
		totalIssues: z.number(),
		completedIssues: z.number(),
		totalPoints: z.number(),
		completedPoints: z.number(),
		daysRemaining: z.number().nullable(),
		percentComplete: z.number(),
	}),
});

// =====================================================
// TYPE EXPORTS
// =====================================================

export type Sprint = z.infer<typeof sprintSchema>;
export type CreateSprint = z.infer<typeof createSprintSchema>;
export type UpdateSprint = z.infer<typeof updateSprintSchema>;
export type GetSprintById = z.infer<typeof getSprintByIdSchema>;
export type GetSprints = z.infer<typeof getSprintsSchema>;
export type StartSprint = z.infer<typeof startSprintSchema>;
export type CompleteSprint = z.infer<typeof completeSprintSchema>;
export type DeleteSprint = z.infer<typeof deleteSprintSchema>;

export type SprintIssue = z.infer<typeof sprintIssueSchema>;
export type AddIssueToSprint = z.infer<typeof addIssueToSprintSchema>;
export type AddIssuesToSprint = z.infer<typeof addIssuesToSprintSchema>;
export type RemoveIssueFromSprint = z.infer<typeof removeIssueFromSprintSchema>;
export type MoveIssueToSprint = z.infer<typeof moveIssueToSprintSchema>;
export type ReorderSprintIssues = z.infer<typeof reorderSprintIssuesSchema>;
export type GetSprintIssues = z.infer<typeof getSprintIssuesSchema>;
export type GetBacklogIssues = z.infer<typeof getBacklogIssuesSchema>;

export type SprintHistory = z.infer<typeof sprintHistorySchema>;
export type GetSprintHistory = z.infer<typeof getSprintHistorySchema>;

export type BurndownDataPoint = z.infer<typeof burndownDataPointSchema>;
export type GetBurndown = z.infer<typeof getBurndownSchema>;
export type BurndownChart = z.infer<typeof burndownChartSchema>;

export type GetVelocity = z.infer<typeof getVelocitySchema>;
export type VelocityDataPoint = z.infer<typeof velocityDataPointSchema>;
export type VelocityChart = z.infer<typeof velocityChartSchema>;

export type GetActiveSprint = z.infer<typeof getActiveSprintSchema>;
export type SprintBoard = z.infer<typeof sprintBoardSchema>;
