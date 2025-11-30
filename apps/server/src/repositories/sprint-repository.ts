import {db} from "@/db";
import {
	sprints,
	sprintIssues,
	sprintHistory,
	sprintBurndown,
	type SprintStatus,
} from "@/db/schema/sprints";
import {issues} from "@/db/schema/issues";
import {statuses} from "@/db/schema/statuses";
import {issueTypes} from "@/db/schema/issue-types";
import {user} from "@/db/schema/auth";
import {projects} from "@/db/schema/projects";
import {eq, and, desc, asc, sql, inArray, lt, gte, gt, lte, count} from "drizzle-orm";

// Types from validation (inline to avoid import issues)
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

type SprintHistoryAction =
	| 'sprint_created'
	| 'sprint_started'
	| 'sprint_completed'
	| 'sprint_cancelled'
	| 'sprint_updated'
	| 'issue_added'
	| 'issue_removed'
	| 'issue_completed'
	| 'goal_updated'
	| 'dates_updated';

// =====================================================
// SPRINT REPOSITORY
// =====================================================

export class SprintRepository {
	/**
	 * Create a new sprint
	 */
	async create(data: CreateSprint, createdById: string) {
		// Get max sort order for project
		const maxOrder = await db
			.select({max: sql<number>`COALESCE(MAX(${sprints.sortOrder}), 0)`})
			.from(sprints)
			.where(eq(sprints.projectId, data.projectId));

		const [sprint] = await db
			.insert(sprints)
			.values({
				projectId: data.projectId,
				name: data.name,
				goal: data.goal,
				startDate: data.startDate,
				endDate: data.endDate,
				sortOrder: (maxOrder[0]?.max ?? 0) + 1,
				createdById,
			})
			.returning();

		return sprint;
	}

	/**
	 * Get sprint by ID
	 */
	async getById(id: string) {
		const [sprint] = await db
			.select({
				id: sprints.id,
				projectId: sprints.projectId,
				name: sprints.name,
				goal: sprints.goal,
				startDate: sprints.startDate,
				endDate: sprints.endDate,
				status: sprints.status,
				completedAt: sprints.completedAt,
				completedById: sprints.completedById,
				metrics: sprints.metrics,
				sortOrder: sprints.sortOrder,
				createdAt: sprints.createdAt,
				updatedAt: sprints.updatedAt,
				createdById: sprints.createdById,
				project: {
					id: projects.id,
					name: projects.name,
					key: projects.key,
				},
			})
			.from(sprints)
			.leftJoin(projects, eq(sprints.projectId, projects.id))
			.where(eq(sprints.id, id));

		return sprint;
	}

	/**
	 * Get sprints with filtering and pagination
	 */
	async getMany(params: GetSprints) {
		const {projectId, status, page = 1, limit = 20} = params;
		const offset = (page - 1) * limit;

		const conditions = [eq(sprints.projectId, projectId)];
		if (status) {
			conditions.push(eq(sprints.status, status));
		}

		const [items, totalResult] = await Promise.all([
			db
				.select({
					id: sprints.id,
					projectId: sprints.projectId,
					name: sprints.name,
					goal: sprints.goal,
					startDate: sprints.startDate,
					endDate: sprints.endDate,
					status: sprints.status,
					completedAt: sprints.completedAt,
					metrics: sprints.metrics,
					sortOrder: sprints.sortOrder,
					createdAt: sprints.createdAt,
					updatedAt: sprints.updatedAt,
				})
				.from(sprints)
				.where(and(...conditions))
				.orderBy(desc(sprints.status), asc(sprints.sortOrder))
				.limit(limit)
				.offset(offset),
			db
				.select({count: count()})
				.from(sprints)
				.where(and(...conditions)),
		]);

		return {
			items,
			total: totalResult[0]?.count ?? 0,
			page,
			limit,
			totalPages: Math.ceil((totalResult[0]?.count ?? 0) / limit),
		};
	}

	/**
	 * Get active sprint for a project
	 */
	async getActiveSprint(projectId: string) {
		const [sprint] = await db
			.select()
			.from(sprints)
			.where(and(eq(sprints.projectId, projectId), eq(sprints.status, 'active')));

		return sprint;
	}

	/**
	 * Update sprint
	 */
	async update(id: string, data: UpdateSprint) {
		const [sprint] = await db
			.update(sprints)
			.set({
				...data,
				updatedAt: new Date(),
			})
			.where(eq(sprints.id, id))
			.returning();

		return sprint;
	}

	/**
	 * Update sprint status
	 */
	async updateStatus(id: string, status: SprintStatus, completedById?: string) {
		const updateData: Record<string, unknown> = {
			status,
			updatedAt: new Date(),
		};

		if (status === 'completed' || status === 'cancelled') {
			updateData.completedAt = new Date();
			updateData.completedById = completedById;
		}

		const [sprint] = await db
			.update(sprints)
			.set(updateData)
			.where(eq(sprints.id, id))
			.returning();

		return sprint;
	}

	/**
	 * Update sprint metrics
	 */
	async updateMetrics(
		id: string,
		metrics: NonNullable<typeof sprints.$inferSelect.metrics>
	) {
		const [sprint] = await db
			.update(sprints)
			.set({
				metrics,
				updatedAt: new Date(),
			})
			.where(eq(sprints.id, id))
			.returning();

		return sprint;
	}

	/**
	 * Delete sprint
	 */
	async delete(id: string) {
		const [sprint] = await db.delete(sprints).where(eq(sprints.id, id)).returning();
		return sprint;
	}

	/**
	 * Check if project has active sprint
	 */
	async hasActiveSprint(projectId: string, excludeSprintId?: string) {
		const conditions = [
			eq(sprints.projectId, projectId),
			eq(sprints.status, 'active'),
		];

		if (excludeSprintId) {
			conditions.push(sql`${sprints.id} != ${excludeSprintId}`);
		}

		const [result] = await db
			.select({count: count()})
			.from(sprints)
			.where(and(...conditions));

		return (result?.count ?? 0) > 0;
	}
}

// =====================================================
// SPRINT ISSUE REPOSITORY
// =====================================================

export class SprintIssueRepository {
	/**
	 * Add issue to sprint (captures storyPoints snapshot)
	 */
	async addIssue(sprintId: string, issueId: string, addedById: string, position?: number) {
		// Get issue's current storyPoints
		const [issue] = await db
			.select({storyPoints: issues.storyPoints})
			.from(issues)
			.where(eq(issues.id, issueId));

		// Get max position if not provided
		let finalPosition = position;
		if (finalPosition === undefined) {
			const [maxPos] = await db
				.select({max: sql<number>`COALESCE(MAX(${sprintIssues.position}), -1)`})
				.from(sprintIssues)
				.where(eq(sprintIssues.sprintId, sprintId));
			finalPosition = (maxPos?.max ?? -1) + 1;
		}

		const [sprintIssue] = await db
			.insert(sprintIssues)
			.values({
				sprintId,
				issueId,
				position: finalPosition,
				addedById,
				storyPointsSnapshot: issue?.storyPoints ?? null,
			})
			.onConflictDoUpdate({
				target: sprintIssues.issueId,
				set: {
					sprintId,
					position: finalPosition,
					addedAt: new Date(),
					addedById,
				},
			})
			.returning();

		return sprintIssue;
	}

	/**
	 * Add multiple issues to sprint (captures storyPoints snapshots)
	 */
	async addIssues(sprintId: string, issueIds: string[], addedById: string) {
		// Get storyPoints for all issues
		const issuePoints = await db
			.select({id: issues.id, storyPoints: issues.storyPoints})
			.from(issues)
			.where(inArray(issues.id, issueIds));

		const pointsMap = new Map(issuePoints.map((i) => [i.id, i.storyPoints]));

		// Get max position
		const [maxPos] = await db
			.select({max: sql<number>`COALESCE(MAX(${sprintIssues.position}), -1)`})
			.from(sprintIssues)
			.where(eq(sprintIssues.sprintId, sprintId));

		let position = (maxPos?.max ?? -1) + 1;

		// Use upsert for each
		const results = [];
		for (const issueId of issueIds) {
			const [result] = await db
				.insert(sprintIssues)
				.values({
					sprintId,
					issueId,
					position: position++,
					addedById,
					storyPointsSnapshot: pointsMap.get(issueId) ?? null,
				})
				.onConflictDoUpdate({
					target: sprintIssues.issueId,
					set: {
						sprintId,
						position: position - 1,
						addedAt: new Date(),
						addedById,
					},
				})
				.returning();
			results.push(result);
		}

		return results;
	}

	/**
	 * Remove issue from sprint
	 */
	async removeIssue(issueId: string) {
		const [removed] = await db
			.delete(sprintIssues)
			.where(eq(sprintIssues.issueId, issueId))
			.returning();

		return removed;
	}

	/**
	 * Get sprint issues with details (includes cached fields)
	 */
	async getSprintIssues(sprintId: string, page = 1, limit = 50) {
		const offset = (page - 1) * limit;

		const items = await db
			.select({
				id: sprintIssues.id,
				sprintId: sprintIssues.sprintId,
				issueId: sprintIssues.issueId,
				position: sprintIssues.position,
				addedAt: sprintIssues.addedAt,
				addedById: sprintIssues.addedById,
				storyPointsSnapshot: sprintIssues.storyPointsSnapshot,
				issue: {
					id: issues.id,
					key: issues.key,
					summary: issues.summary,
					storyPoints: issues.storyPoints,
					priority: issues.priority,
				},
				status: {
					id: statuses.id,
					name: statuses.name,
					color: statuses.color,
				},
				issueType: {
					id: issueTypes.id,
					name: issueTypes.name,
					icon: issueTypes.icon,
				},
				assignee: {
					id: user.id,
					name: user.name,
					image: user.image,
				},
			})
			.from(sprintIssues)
			.innerJoin(issues, eq(sprintIssues.issueId, issues.id))
			.leftJoin(statuses, eq(issues.statusId, statuses.id))
			.leftJoin(issueTypes, eq(issues.issueTypeId, issueTypes.id))
			.leftJoin(user, eq(issues.assigneeId, user.id))
			.where(eq(sprintIssues.sprintId, sprintId))
			.orderBy(asc(sprintIssues.position))
			.limit(limit)
			.offset(offset);

		const [totalResult] = await db
			.select({count: count()})
			.from(sprintIssues)
			.where(eq(sprintIssues.sprintId, sprintId));

		return {
			items,
			total: totalResult?.count ?? 0,
			page,
			limit,
		};
	}

	/**
	 * Get backlog issues (not in any sprint, includes cached fields)
	 */
	async getBacklogIssues(
		projectId: string,
		filters: {issueTypeId?: string; statusId?: string; assigneeId?: string},
		page = 1,
		limit = 50
	) {
		const offset = (page - 1) * limit;

		// Issues not in sprint_issues table
		const subquery = db.select({issueId: sprintIssues.issueId}).from(sprintIssues);

		const conditions = [
			eq(issues.projectId, projectId),
			sql`${issues.id} NOT IN (${subquery})`,
		];

		if (filters.issueTypeId) {
			conditions.push(eq(issues.issueTypeId, filters.issueTypeId));
		}
		if (filters.statusId) {
			conditions.push(eq(issues.statusId, filters.statusId));
		}
		if (filters.assigneeId) {
			conditions.push(eq(issues.assigneeId, filters.assigneeId));
		}

		const items = await db
			.select({
				id: issues.id,
				key: issues.key,
				summary: issues.summary,
				storyPoints: issues.storyPoints,
				priority: issues.priority,
				status: {
					id: statuses.id,
					name: statuses.name,
					color: statuses.color,
				},
				issueType: {
					id: issueTypes.id,
					name: issueTypes.name,
					icon: issueTypes.icon,
				},
				assignee: {
					id: user.id,
					name: user.name,
					image: user.image,
				},
			})
			.from(issues)
			.leftJoin(statuses, eq(issues.statusId, statuses.id))
			.leftJoin(issueTypes, eq(issues.issueTypeId, issueTypes.id))
			.leftJoin(user, eq(issues.assigneeId, user.id))
			.where(and(...conditions))
			.orderBy(desc(issues.createdAt))
			.limit(limit)
			.offset(offset);

		const [totalResult] = await db
			.select({count: count()})
			.from(issues)
			.where(and(...conditions));

		return {
			items,
			total: totalResult?.count ?? 0,
			page,
			limit,
		};
	}

	/**
	 * Reorder issue within sprint
	 */
	async reorderIssue(sprintId: string, issueId: string, newPosition: number) {
		// Get current position
		const [current] = await db
			.select({position: sprintIssues.position})
			.from(sprintIssues)
			.where(
				and(eq(sprintIssues.sprintId, sprintId), eq(sprintIssues.issueId, issueId))
			);

		if (!current) return null;

		const oldPosition = current.position;

		// Shift other items
		if (newPosition < oldPosition) {
			// Moving up - shift items down
			await db
				.update(sprintIssues)
				.set({position: sql`${sprintIssues.position} + 1`})
				.where(
					and(
						eq(sprintIssues.sprintId, sprintId),
						gte(sprintIssues.position, newPosition),
						lt(sprintIssues.position, oldPosition)
					)
				);
		} else if (newPosition > oldPosition) {
			// Moving down - shift items up
			await db
				.update(sprintIssues)
				.set({position: sql`${sprintIssues.position} - 1`})
				.where(
					and(
						eq(sprintIssues.sprintId, sprintId),
						gt(sprintIssues.position, oldPosition),
						lte(sprintIssues.position, newPosition)
					)
				);
		}

		// Update the item's position
		const [updated] = await db
			.update(sprintIssues)
			.set({position: newPosition})
			.where(
				and(eq(sprintIssues.sprintId, sprintId), eq(sprintIssues.issueId, issueId))
			)
			.returning();

		return updated;
	}

	/**
	 * Get sprint statistics (uses cached storyPoints from issues table)
	 */
	async getSprintStats(sprintId: string) {
		// Get total issues and points
		const result = await db
			.select({
				totalIssues: count(),
				totalPoints: sql<number>`COALESCE(SUM(${issues.storyPoints}), 0)`,
			})
			.from(sprintIssues)
			.innerJoin(issues, eq(sprintIssues.issueId, issues.id))
			.where(eq(sprintIssues.sprintId, sprintId));

		// Get completed issues and points (status category = 'done')
		const completedResult = await db
			.select({
				completedIssues: count(),
				completedPoints: sql<number>`COALESCE(SUM(${issues.storyPoints}), 0)`,
			})
			.from(sprintIssues)
			.innerJoin(issues, eq(sprintIssues.issueId, issues.id))
			.innerJoin(statuses, eq(issues.statusId, statuses.id))
			.where(
				and(eq(sprintIssues.sprintId, sprintId), eq(statuses.category, 'done'))
			);

		return {
			totalIssues: result[0]?.totalIssues ?? 0,
			totalPoints: Number(result[0]?.totalPoints ?? 0),
			completedIssues: completedResult[0]?.completedIssues ?? 0,
			completedPoints: Number(completedResult[0]?.completedPoints ?? 0),
		};
	}

	/**
	 * Move all incomplete issues from sprint to another sprint or backlog
	 */
	async moveIncompleteIssues(fromSprintId: string, toSprintId: string | null) {
		// Get incomplete issues (not in 'done' status)
		const incompleteIssues = await db
			.select({
				issueId: sprintIssues.issueId,
				addedById: sprintIssues.addedById,
			})
			.from(sprintIssues)
			.innerJoin(issues, eq(sprintIssues.issueId, issues.id))
			.innerJoin(statuses, eq(issues.statusId, statuses.id))
			.where(
				and(
					eq(sprintIssues.sprintId, fromSprintId),
					sql`${statuses.category} != 'done'`
				)
			);

		if (incompleteIssues.length === 0) return [];

		const issueIds = incompleteIssues.map((i) => i.issueId);

		if (toSprintId) {
			// Move to next sprint
			let position = 0;
			const [maxPos] = await db
				.select({max: sql<number>`COALESCE(MAX(${sprintIssues.position}), -1)`})
				.from(sprintIssues)
				.where(eq(sprintIssues.sprintId, toSprintId));
			position = (maxPos?.max ?? -1) + 1;

			for (const issueId of issueIds) {
				await db
					.update(sprintIssues)
					.set({
						sprintId: toSprintId,
						position: position++,
						addedAt: new Date(),
					})
					.where(eq(sprintIssues.issueId, issueId));
			}
		} else {
			// Move to backlog (delete from sprint_issues)
			await db
				.delete(sprintIssues)
				.where(inArray(sprintIssues.issueId, issueIds));
		}

		return issueIds;
	}
}

// =====================================================
// SPRINT HISTORY REPOSITORY
// =====================================================

export class SprintHistoryRepository {
	/**
	 * Add history entry
	 */
	async addEntry(
		sprintId: string,
		action: SprintHistoryAction,
		performedById: string,
		data?: {
			issueId?: string;
			oldValue?: unknown;
			newValue?: unknown;
			storyPoints?: number;
			reason?: string;
		}
	) {
		const [entry] = await db
			.insert(sprintHistory)
			.values({
				sprintId,
				action,
				issueId: data?.issueId,
				data: data
					? {
							oldValue: data.oldValue,
							newValue: data.newValue,
							storyPoints: data.storyPoints,
							reason: data.reason,
						}
					: null,
				performedById,
			})
			.returning();

		return entry;
	}

	/**
	 * Get sprint history
	 */
	async getHistory(
		sprintId: string,
		action?: SprintHistoryAction,
		page = 1,
		limit = 50
	) {
		const offset = (page - 1) * limit;

		const conditions = [eq(sprintHistory.sprintId, sprintId)];
		if (action) {
			conditions.push(eq(sprintHistory.action, action));
		}

		const items = await db
			.select({
				id: sprintHistory.id,
				sprintId: sprintHistory.sprintId,
				action: sprintHistory.action,
				issueId: sprintHistory.issueId,
				data: sprintHistory.data,
				performedById: sprintHistory.performedById,
				createdAt: sprintHistory.createdAt,
				performedBy: {
					id: user.id,
					name: user.name,
					image: user.image,
				},
			})
			.from(sprintHistory)
			.leftJoin(user, eq(sprintHistory.performedById, user.id))
			.where(and(...conditions))
			.orderBy(desc(sprintHistory.createdAt))
			.limit(limit)
			.offset(offset);

		return items;
	}
}

// =====================================================
// BURNDOWN REPOSITORY
// =====================================================

export class BurndownRepository {
	/**
	 * Add or update burndown data point
	 */
	async upsertDataPoint(
		sprintId: string,
		date: Date,
		data: {
			remainingPoints: number;
			remainingIssueCount: number;
			completedPoints: number;
			completedIssueCount: number;
			idealRemainingPoints?: number;
		}
	) {
		const [point] = await db
			.insert(sprintBurndown)
			.values({
				sprintId,
				date,
				...data,
			})
			.onConflictDoUpdate({
				target: [sprintBurndown.sprintId, sprintBurndown.date],
				set: {
					remainingPoints: data.remainingPoints,
					remainingIssueCount: data.remainingIssueCount,
					completedPoints: data.completedPoints,
					completedIssueCount: data.completedIssueCount,
					idealRemainingPoints: data.idealRemainingPoints,
				},
			})
			.returning();

		return point;
	}

	/**
	 * Get burndown data for a sprint
	 */
	async getBurndownData(sprintId: string) {
		const dataPoints = await db
			.select()
			.from(sprintBurndown)
			.where(eq(sprintBurndown.sprintId, sprintId))
			.orderBy(asc(sprintBurndown.date));

		return dataPoints;
	}
}

// =====================================================
// SPRINT ISSUE RANKING
// =====================================================

export class SprintIssueRankingRepository {
	/**
	 * Update the rank of an issue within a sprint
	 */
	async updateRank(issueId: string, rank: string) {
		const [updated] = await db
			.update(sprintIssues)
			.set({ rank })
			.where(eq(sprintIssues.issueId, issueId))
			.returning();
		return updated;
	}

	/**
	 * Get the first rank in a sprint (for inserting at top)
	 */
	async getFirstRankInSprint(sprintId: string): Promise<string | null> {
		const result = await db.query.sprintIssues.findFirst({
			where: and(
				eq(sprintIssues.sprintId, sprintId),
				sql`${sprintIssues.rank} IS NOT NULL`
			),
			orderBy: asc(sprintIssues.rank),
			columns: { rank: true },
		});
		return result?.rank || null;
	}

	/**
	 * Get the last rank in a sprint (for inserting at bottom)
	 */
	async getLastRankInSprint(sprintId: string): Promise<string | null> {
		const result = await db.query.sprintIssues.findFirst({
			where: and(
				eq(sprintIssues.sprintId, sprintId),
				sql`${sprintIssues.rank} IS NOT NULL`
			),
			orderBy: desc(sprintIssues.rank),
			columns: { rank: true },
		});
		return result?.rank || null;
	}

	/**
	 * Get issues in sprint ordered by rank
	 */
	async getSprintIssuesOrderedByRank(sprintId: string) {
		return db
			.select({
				id: sprintIssues.id,
				issueId: sprintIssues.issueId,
				sprintId: sprintIssues.sprintId,
				position: sprintIssues.position,
				rank: sprintIssues.rank,
				addedAt: sprintIssues.addedAt,
				storyPointsSnapshot: sprintIssues.storyPointsSnapshot,
				// Issue details
				issueKey: issues.key,
				issueSummary: issues.summary,
				issueStatusId: issues.statusId,
				issueTypeId: issues.issueTypeId,
				issueAssigneeId: issues.assigneeId,
				issueStoryPoints: issues.storyPoints,
				issuePriority: issues.priority,
			})
			.from(sprintIssues)
			.innerJoin(issues, eq(sprintIssues.issueId, issues.id))
			.where(eq(sprintIssues.sprintId, sprintId))
			.orderBy(asc(sprintIssues.rank), asc(sprintIssues.position));
	}

	/**
	 * Get adjacent issue ranks in a sprint for reordering
	 */
	async getAdjacentRanks(
		sprintId: string,
		targetRank: string
	): Promise<{ prevRank: string | null; nextRank: string | null }> {
		// Get issue just before target rank
		const prev = await db.query.sprintIssues.findFirst({
			where: and(
				eq(sprintIssues.sprintId, sprintId),
				sql`${sprintIssues.rank} < ${targetRank}`
			),
			orderBy: desc(sprintIssues.rank),
			columns: { rank: true },
		});

		// Get issue just after target rank
		const next = await db.query.sprintIssues.findFirst({
			where: and(
				eq(sprintIssues.sprintId, sprintId),
				sql`${sprintIssues.rank} > ${targetRank}`
			),
			orderBy: asc(sprintIssues.rank),
			columns: { rank: true },
		});

		return {
			prevRank: prev?.rank || null,
			nextRank: next?.rank || null,
		};
	}

	/**
	 * Bulk update ranks for sprint issues
	 */
	async bulkUpdateRanks(updates: { issueId: string; rank: string }[]) {
		return db.transaction(async (tx) => {
			const results = [];
			for (const { issueId, rank } of updates) {
				const [updated] = await tx
					.update(sprintIssues)
					.set({ rank })
					.where(eq(sprintIssues.issueId, issueId))
					.returning();
				results.push(updated);
			}
			return results;
		});
	}

	/**
	 * Set rank when adding issue to sprint
	 */
	async addIssueWithRank(
		sprintId: string,
		issueId: string,
		addedById: string,
		rank: string,
		storyPointsSnapshot?: number | null
	) {
		const [sprintIssue] = await db
			.insert(sprintIssues)
			.values({
				sprintId,
				issueId,
				position: 0, // Legacy field, rank takes precedence
				rank,
				addedById,
				storyPointsSnapshot,
			})
			.onConflictDoUpdate({
				target: sprintIssues.issueId,
				set: {
					sprintId,
					rank,
					addedAt: new Date(),
					addedById,
				},
			})
			.returning();

		return sprintIssue;
	}
}
