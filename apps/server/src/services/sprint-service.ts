import {
	SprintRepository,
	SprintIssueRepository,
	SprintHistoryRepository,
	BurndownRepository,
} from "@/repositories/sprint-repository";
import {throwNotFoundError, createAppError} from "@/lib/errors";
import type {SprintStatus, SprintHistoryAction} from "@/db/schema/sprints";
import {
	emitSprintCreated,
	emitSprintStarted,
	emitSprintCompleted,
	emitSprintIssueAdded,
	emitSprintIssueRemoved,
} from "@/lib/events/event-bus";

// Types inline to avoid import issues
type CreateSprint = {
	projectId: string;
	name: string;
	goal?: string;
	startDate?: Date;
	endDate?: Date;
};

type UpdateSprint = {
	name?: string;
	goal?: string | null;
	startDate?: Date | null;
	endDate?: Date | null;
};

type GetSprints = {
	projectId: string;
	status?: SprintStatus;
	includeMetrics?: boolean;
	page?: number;
	limit?: number;
};

type StartSprint = {
	id: string;
	startDate?: Date;
	endDate: Date;
	goal?: string;
};

type CompleteSprint = {
	id: string;
	moveIncompleteIssuesTo?: 'backlog' | 'next_sprint';
	nextSprintId?: string;
};

type AddIssueToSprint = {
	sprintId: string;
	issueId: string;
	position?: number;
};

type AddIssuesToSprint = {
	sprintId: string;
	issueIds: string[];
};

type MoveIssueToSprint = {
	issueId: string;
	targetSprintId: string | null;
	position?: number;
};

type ReorderSprintIssues = {
	sprintId: string;
	issueId: string;
	newPosition: number;
};

type GetSprintIssues = {
	sprintId: string;
	page?: number;
	limit?: number;
};

type GetBacklogIssues = {
	projectId: string;
	issueTypeId?: string;
	statusId?: string;
	assigneeId?: string;
	page?: number;
	limit?: number;
};

type GetSprintHistory = {
	sprintId: string;
	action?: SprintHistoryAction;
	page?: number;
	limit?: number;
};

function throwBusinessLogicError(message: string): never {
	throw createAppError(message, {statusCode: 400, code: 'BUSINESS_LOGIC_ERROR'});
}

export class SprintService {
	constructor(
		private sprintRepo: SprintRepository,
		private sprintIssueRepo: SprintIssueRepository,
		private historyRepo: SprintHistoryRepository,
		private burndownRepo: BurndownRepository,
	) {}

	// =====================================================
	// SPRINT CRUD
	// =====================================================

	/**
	 * Create a new sprint
	 */
	async createSprint(data: CreateSprint, userId: string) {
		const sprint = await this.sprintRepo.create(data, userId);

		// Add history entry
		await this.historyRepo.addEntry(sprint.id, 'sprint_created', userId);

		// Emit event
		emitSprintCreated({
			sprintId: sprint.id,
			projectId: data.projectId,
			actorId: userId,
		});

		return sprint;
	}

	/**
	 * Get sprint by ID
	 */
	async getSprintById(id: string) {
		const sprint = await this.sprintRepo.getById(id);
		if (!sprint) {
			throwNotFoundError("SPRINT_NOT_FOUND");
		}

		// Get sprint stats
		const stats = await this.sprintIssueRepo.getSprintStats(id);

		return {
			...sprint,
			issueCount: stats.totalIssues,
			totalPoints: stats.totalPoints,
			completedIssueCount: stats.completedIssues,
			completedPoints: stats.completedPoints,
		};
	}

	/**
	 * Get sprints with filtering
	 */
	async getSprints(params: GetSprints) {
		const result = await this.sprintRepo.getMany(params);

		// Optionally add metrics to each sprint
		if (params.includeMetrics) {
			const itemsWithMetrics = await Promise.all(
				result.items.map(async (sprint) => {
					const stats = await this.sprintIssueRepo.getSprintStats(sprint.id);
					return {
						...sprint,
						issueCount: stats.totalIssues,
						totalPoints: stats.totalPoints,
						completedIssueCount: stats.completedIssues,
					};
				})
			);
			return {...result, items: itemsWithMetrics};
		}

		return result;
	}

	/**
	 * Get active sprint for a project
	 */
	async getActiveSprint(projectId: string) {
		const sprint = await this.sprintRepo.getActiveSprint(projectId);
		if (!sprint) {
			return null;
		}

		const stats = await this.sprintIssueRepo.getSprintStats(sprint.id);
		return {
			...sprint,
			issueCount: stats.totalIssues,
			totalPoints: stats.totalPoints,
			completedIssueCount: stats.completedIssues,
			completedPoints: stats.completedPoints,
		};
	}

	/**
	 * Update sprint
	 */
	async updateSprint(id: string, data: UpdateSprint, userId: string) {
		const existing = await this.sprintRepo.getById(id);
		if (!existing) {
			throwNotFoundError("SPRINT_NOT_FOUND");
		}

		const sprint = await this.sprintRepo.update(id, data);

		// Track specific changes
		if (data.goal !== undefined && data.goal !== existing.goal) {
			await this.historyRepo.addEntry(id, 'goal_updated', userId, {
				oldValue: existing.goal,
				newValue: data.goal,
			});
		}

		if (
			(data.startDate !== undefined && data.startDate !== existing.startDate) ||
			(data.endDate !== undefined && data.endDate !== existing.endDate)
		) {
			await this.historyRepo.addEntry(id, 'dates_updated', userId, {
				oldValue: {startDate: existing.startDate, endDate: existing.endDate},
				newValue: {startDate: data.startDate ?? existing.startDate, endDate: data.endDate ?? existing.endDate},
			});
		}

		return sprint;
	}

	/**
	 * Start a sprint
	 */
	async startSprint(data: StartSprint, userId: string) {
		const sprint = await this.sprintRepo.getById(data.id);
		if (!sprint) {
			throwNotFoundError("SPRINT_NOT_FOUND");
		}

		if (sprint.status !== 'planned') {
			throwBusinessLogicError('Only planned sprints can be started');
		}

		// Check if project already has an active sprint
		const hasActive = await this.sprintRepo.hasActiveSprint(sprint.projectId, data.id);
		if (hasActive) {
			throwBusinessLogicError('Project already has an active sprint. Complete it first.');
		}

		// Calculate initial metrics
		const stats = await this.sprintIssueRepo.getSprintStats(data.id);

		// Update sprint
		await this.sprintRepo.update(data.id, {
			startDate: data.startDate ?? new Date(),
			endDate: data.endDate,
			goal: data.goal,
		});

		await this.sprintRepo.updateMetrics(data.id, {
			plannedPoints: stats.totalPoints,
			plannedIssueCount: stats.totalIssues,
			completedPoints: 0,
			completedIssueCount: 0,
			addedPoints: 0,
			addedIssueCount: 0,
			removedPoints: 0,
			removedIssueCount: 0,
		});

		const updated = await this.sprintRepo.updateStatus(data.id, 'active');

		// Add history entry
		await this.historyRepo.addEntry(data.id, 'sprint_started', userId, {
			newValue: {
				startDate: data.startDate ?? new Date(),
				endDate: data.endDate,
				plannedPoints: stats.totalPoints,
				plannedIssues: stats.totalIssues,
			},
		});

		// Initialize burndown data
		await this.recordBurndownData(data.id);

		// Emit event
		emitSprintStarted({
			sprintId: data.id,
			projectId: sprint.projectId,
			actorId: userId,
		});

		return updated;
	}

	/**
	 * Complete a sprint
	 */
	async completeSprint(data: CompleteSprint, userId: string) {
		const sprint = await this.sprintRepo.getById(data.id);
		if (!sprint) {
			throwNotFoundError("SPRINT_NOT_FOUND");
		}

		if (sprint.status !== 'active') {
			throwBusinessLogicError('Only active sprints can be completed');
		}

		// Get final stats
		const stats = await this.sprintIssueRepo.getSprintStats(data.id);

		// Handle incomplete issues
		let movedIssueIds: string[] = [];
		if (data.moveIncompleteIssuesTo === 'next_sprint' && data.nextSprintId) {
			movedIssueIds = await this.sprintIssueRepo.moveIncompleteIssues(
				data.id,
				data.nextSprintId
			);
		} else {
			movedIssueIds = await this.sprintIssueRepo.moveIncompleteIssues(data.id, null);
		}

		// Update metrics
		const currentMetrics = sprint.metrics || {};
		await this.sprintRepo.updateMetrics(data.id, {
			...currentMetrics,
			completedPoints: stats.completedPoints,
			completedIssueCount: stats.completedIssues,
			velocity: stats.completedPoints,
		});

		// Update status
		const updated = await this.sprintRepo.updateStatus(data.id, 'completed', userId);

		// Add history entry
		await this.historyRepo.addEntry(data.id, 'sprint_completed', userId, {
			newValue: {
				completedPoints: stats.completedPoints,
				completedIssues: stats.completedIssues,
				movedIssues: movedIssueIds.length,
				moveTo: data.moveIncompleteIssuesTo,
			},
		});

		// Emit event
		emitSprintCompleted({
			sprintId: data.id,
			projectId: sprint.projectId,
			actorId: userId,
			issueIds: movedIssueIds,
		});

		return {
			sprint: updated,
			movedIssueCount: movedIssueIds.length,
		};
	}

	/**
	 * Cancel a sprint
	 */
	async cancelSprint(id: string, userId: string, reason?: string) {
		const sprint = await this.sprintRepo.getById(id);
		if (!sprint) {
			throwNotFoundError("SPRINT_NOT_FOUND");
		}

		if (sprint.status === 'completed' || sprint.status === 'cancelled') {
			throwBusinessLogicError('Cannot cancel a completed or already cancelled sprint');
		}

		// Move all issues to backlog
		const movedIssueIds = await this.sprintIssueRepo.moveIncompleteIssues(id, null);

		// Update status
		const updated = await this.sprintRepo.updateStatus(id, 'cancelled', userId);

		// Add history entry
		await this.historyRepo.addEntry(id, 'sprint_cancelled', userId, {
			reason,
			newValue: {movedIssues: movedIssueIds.length},
		});

		return {
			sprint: updated,
			movedIssueCount: movedIssueIds.length,
		};
	}

	/**
	 * Delete a sprint
	 */
	async deleteSprint(id: string, moveIssuesTo: 'backlog' | 'another_sprint', targetSprintId?: string) {
		const sprint = await this.sprintRepo.getById(id);
		if (!sprint) {
			throwNotFoundError("SPRINT_NOT_FOUND");
		}

		// Cannot delete active sprint
		if (sprint.status === 'active') {
			throwBusinessLogicError('Cannot delete an active sprint. Complete or cancel it first.');
		}

		// Move issues if needed
		if (moveIssuesTo === 'another_sprint' && targetSprintId) {
			await this.sprintIssueRepo.moveIncompleteIssues(id, targetSprintId);
		}

		// Delete sprint (cascade will remove sprint_issues)
		await this.sprintRepo.delete(id);

		return {success: true};
	}

	// =====================================================
	// SPRINT ISSUES
	// =====================================================

	/**
	 * Add issue to sprint
	 */
	async addIssueToSprint(data: AddIssueToSprint, userId: string) {
		const sprint = await this.sprintRepo.getById(data.sprintId);
		if (!sprint) {
			throwNotFoundError("SPRINT_NOT_FOUND");
		}

		const sprintIssue = await this.sprintIssueRepo.addIssue(
			data.sprintId,
			data.issueId,
			userId,
			data.position
		);

		// Add history entry
		await this.historyRepo.addEntry(data.sprintId, 'issue_added', userId, {
			issueId: data.issueId,
			storyPoints: sprintIssue.storyPointsSnapshot ?? undefined,
		});

		// Update metrics if sprint is active
		if (sprint.status === 'active') {
			const currentMetrics = sprint.metrics || {};
			await this.sprintRepo.updateMetrics(data.sprintId, {
				...currentMetrics,
				addedPoints: (currentMetrics.addedPoints || 0) + (sprintIssue.storyPointsSnapshot || 0),
				addedIssueCount: (currentMetrics.addedIssueCount || 0) + 1,
			});
		}

		// Emit event
		emitSprintIssueAdded({
			sprintId: data.sprintId,
			projectId: sprint.projectId,
			issueId: data.issueId,
			actorId: userId,
		});

		return sprintIssue;
	}

	/**
	 * Add multiple issues to sprint
	 */
	async addIssuesToSprint(data: AddIssuesToSprint, userId: string) {
		const sprint = await this.sprintRepo.getById(data.sprintId);
		if (!sprint) {
			throwNotFoundError("SPRINT_NOT_FOUND");
		}

		const sprintIssues = await this.sprintIssueRepo.addIssues(
			data.sprintId,
			data.issueIds,
			userId
		);

		// Add history entries
		for (const si of sprintIssues) {
			await this.historyRepo.addEntry(data.sprintId, 'issue_added', userId, {
				issueId: si.issueId,
				storyPoints: si.storyPointsSnapshot ?? undefined,
			});
		}

		return sprintIssues;
	}

	/**
	 * Remove issue from sprint
	 */
	async removeIssueFromSprint(issueId: string, userId: string) {
		const removed = await this.sprintIssueRepo.removeIssue(issueId);
		if (!removed) {
			throwNotFoundError('NOT_FOUND'); // Issue not found in any sprint');
		}

		// Add history entry
		await this.historyRepo.addEntry(removed.sprintId, 'issue_removed', userId, {
			issueId,
			storyPoints: removed.storyPointsSnapshot ?? undefined,
		});

		// Update metrics if sprint is active
		const sprint = await this.sprintRepo.getById(removed.sprintId);
		if (sprint && sprint.status === 'active') {
			const currentMetrics = sprint.metrics || {};
			await this.sprintRepo.updateMetrics(removed.sprintId, {
				...currentMetrics,
				removedPoints: (currentMetrics.removedPoints || 0) + (removed.storyPointsSnapshot || 0),
				removedIssueCount: (currentMetrics.removedIssueCount || 0) + 1,
			});
		}

		// Emit event
		if (sprint) {
			emitSprintIssueRemoved({
				sprintId: removed.sprintId,
				projectId: sprint.projectId,
				issueId,
				actorId: userId,
			});
		}

		return removed;
	}

	/**
	 * Move issue between sprints
	 */
	async moveIssueToSprint(data: MoveIssueToSprint, userId: string) {
		// First remove from current sprint
		const removed = await this.sprintIssueRepo.removeIssue(data.issueId);

		if (removed) {
			await this.historyRepo.addEntry(removed.sprintId, 'issue_removed', userId, {
				issueId: data.issueId,
				storyPoints: removed.storyPointsSnapshot ?? undefined,
			});
		}

		// If target sprint is null, issue goes to backlog
		if (!data.targetSprintId) {
			return {movedToBacklog: true};
		}

		// Add to target sprint
		const added = await this.sprintIssueRepo.addIssue(
			data.targetSprintId,
			data.issueId,
			userId,
			data.position
		);

		await this.historyRepo.addEntry(data.targetSprintId, 'issue_added', userId, {
			issueId: data.issueId,
			storyPoints: added.storyPointsSnapshot ?? undefined,
		});

		return added;
	}

	/**
	 * Reorder issues within sprint
	 */
	async reorderSprintIssues(data: ReorderSprintIssues) {
		const result = await this.sprintIssueRepo.reorderIssue(
			data.sprintId,
			data.issueId,
			data.newPosition
		);

		if (!result) {
			throwNotFoundError('NOT_FOUND'); // Issue not found in sprint');
		}

		return result;
	}

	/**
	 * Get sprint issues
	 */
	async getSprintIssues(params: GetSprintIssues) {
		return this.sprintIssueRepo.getSprintIssues(
			params.sprintId,
			params.page,
			params.limit
		);
	}

	/**
	 * Get backlog issues
	 */
	async getBacklogIssues(params: GetBacklogIssues) {
		return this.sprintIssueRepo.getBacklogIssues(
			params.projectId,
			{
				issueTypeId: params.issueTypeId,
				statusId: params.statusId,
				assigneeId: params.assigneeId,
			},
			params.page,
			params.limit
		);
	}

	// =====================================================
	// HISTORY & ANALYTICS
	// =====================================================

	/**
	 * Get sprint history
	 */
	async getSprintHistory(params: GetSprintHistory) {
		return this.historyRepo.getHistory(
			params.sprintId,
			params.action,
			params.page,
			params.limit
		);
	}

	/**
	 * Record burndown data point
	 */
	async recordBurndownData(sprintId: string) {
		const sprint = await this.sprintRepo.getById(sprintId);
		if (!sprint || sprint.status !== 'active') {
			return null;
		}

		const stats = await this.sprintIssueRepo.getSprintStats(sprintId);
		const remainingPoints = stats.totalPoints - stats.completedPoints;
		const remainingIssues = stats.totalIssues - stats.completedIssues;

		// Calculate ideal remaining
		let idealRemainingPoints: number | undefined;
		if (sprint.startDate && sprint.endDate) {
			const totalDays = Math.ceil(
				(sprint.endDate.getTime() - sprint.startDate.getTime()) / (1000 * 60 * 60 * 24)
			);
			const daysPassed = Math.ceil(
				(Date.now() - sprint.startDate.getTime()) / (1000 * 60 * 60 * 24)
			);
			const plannedPoints = sprint.metrics?.plannedPoints || stats.totalPoints;
			idealRemainingPoints = Math.max(
				0,
				plannedPoints - (plannedPoints / totalDays) * daysPassed
			);
		}

		const today = new Date();
		today.setHours(0, 0, 0, 0);

		return this.burndownRepo.upsertDataPoint(sprintId, today, {
			remainingPoints,
			remainingIssueCount: remainingIssues,
			completedPoints: stats.completedPoints,
			completedIssueCount: stats.completedIssues,
			idealRemainingPoints,
		});
	}

	/**
	 * Get burndown chart data
	 */
	async getBurndownChart(sprintId: string) {
		const sprint = await this.sprintRepo.getById(sprintId);
		if (!sprint) {
			throwNotFoundError("SPRINT_NOT_FOUND");
		}

		const stats = await this.sprintIssueRepo.getSprintStats(sprintId);
		const dataPoints = await this.burndownRepo.getBurndownData(sprintId);

		// Generate ideal line
		const idealLine: Array<{date: Date; points: number}> = [];
		if (sprint.startDate && sprint.endDate) {
			const totalPoints = sprint.metrics?.plannedPoints || stats.totalPoints;
			const totalDays = Math.ceil(
				(sprint.endDate.getTime() - sprint.startDate.getTime()) / (1000 * 60 * 60 * 24)
			);
			const pointsPerDay = totalPoints / totalDays;

			for (let i = 0; i <= totalDays; i++) {
				const date = new Date(sprint.startDate);
				date.setDate(date.getDate() + i);
				idealLine.push({
					date,
					points: Math.max(0, totalPoints - pointsPerDay * i),
				});
			}
		}

		return {
			sprint: {
				id: sprint.id,
				name: sprint.name,
				startDate: sprint.startDate,
				endDate: sprint.endDate,
				totalPoints: stats.totalPoints,
				totalIssues: stats.totalIssues,
			},
			dataPoints,
			idealLine,
		};
	}

	/**
	 * Get velocity chart data
	 */
	async getVelocityChart(projectId: string, sprintCount = 10) {
		// Get completed sprints
		const result = await this.sprintRepo.getMany({
			projectId,
			status: 'completed',
			page: 1,
			limit: sprintCount,
		});

		const sprints = result.items.map((sprint) => ({
			sprintId: sprint.id,
			sprintName: sprint.name,
			committedPoints: sprint.metrics?.plannedPoints || 0,
			completedPoints: sprint.metrics?.completedPoints || 0,
			completedIssueCount: sprint.metrics?.completedIssueCount || 0,
			startDate: sprint.startDate,
			endDate: sprint.endDate,
		}));

		// Calculate average velocity
		const velocities = sprints.map((s) => s.completedPoints);
		const averageVelocity =
			velocities.length > 0
				? velocities.reduce((a, b) => a + b, 0) / velocities.length
				: 0;

		return {
			sprints,
			averageVelocity,
			predictedCapacity: averageVelocity, // Can be adjusted based on team capacity
		};
	}

	/**
	 * Get sprint board data (for Scrum/Kanban board)
	 */
	async getSprintBoard(sprintId: string) {
		const sprint = await this.getSprintById(sprintId);

		// Get all issues in sprint with their statuses
		const sprintIssues = await this.sprintIssueRepo.getSprintIssues(sprintId, 1, 1000);

		// Group by status
		const statusMap = new Map<
			string,
			{
				status: {id: string; name: string; color: string | null};
				issues: typeof sprintIssues.items;
			}
		>();

		for (const item of sprintIssues.items) {
			if (!item.status) continue;

			const statusId = item.status.id;
			if (!statusMap.has(statusId)) {
				statusMap.set(statusId, {
					status: item.status,
					issues: [],
				});
			}
			statusMap.get(statusId)!.issues.push(item);
		}

		const columns = Array.from(statusMap.values()).map((col) => ({
			status: col.status,
			issues: col.issues.map((i) => ({
				id: i.issue?.id || i.issueId,
				key: i.issue?.key || '',
				summary: i.issue?.summary || '',
				storyPoints: i.issue?.storyPoints ?? null,
				priority: i.issue?.priority ?? null,
				assignee: i.assignee?.id ? i.assignee : null,
				issueType: i.issueType || {id: '', name: '', icon: null},
			})),
			issueCount: col.issues.length,
			totalPoints: col.issues.reduce(
				(sum, i) => sum + (i.issue?.storyPoints || 0),
				0
			),
		}));

		// Calculate stats
		const totalIssues = sprint.issueCount || 0;
		const completedIssues = sprint.completedIssueCount || 0;
		const totalPoints = sprint.totalPoints || 0;
		const completedPoints = sprint.completedPoints || 0;

		let daysRemaining: number | null = null;
		if (sprint.endDate) {
			daysRemaining = Math.max(
				0,
				Math.ceil((sprint.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
			);
		}

		return {
			sprint,
			columns,
			stats: {
				totalIssues,
				completedIssues,
				totalPoints,
				completedPoints,
				daysRemaining,
				percentComplete: totalIssues > 0 ? (completedIssues / totalIssues) * 100 : 0,
			},
		};
	}

	/**
	 * Mark issue as completed in sprint (for history tracking)
	 */
	async markIssueCompleted(issueId: string, userId: string) {
		// Find the sprint the issue belongs to
		const sprintIssues = await this.sprintIssueRepo.getSprintIssues('', 1, 1); // Placeholder
		// This would need a method to find sprint by issue

		// For now, we'll add this when issue status changes to 'done'
		// This should be called from IssueService when status changes
	}
}
