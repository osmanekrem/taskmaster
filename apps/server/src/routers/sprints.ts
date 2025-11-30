import {router, protectedProcedure} from "@/lib/trpc";
import {getContainer} from "@/lib/context";
import {
	createSprintSchema,
	updateSprintSchema,
	getSprintByIdSchema,
	getSprintsSchema,
	startSprintSchema,
	completeSprintSchema,
	deleteSprintSchema,
	addIssueToSprintSchema,
	addIssuesToSprintSchema,
	removeIssueFromSprintSchema,
	moveIssueToSprintSchema,
	reorderSprintIssuesSchema,
	getSprintIssuesSchema,
	getBacklogIssuesSchema,
	getSprintHistorySchema,
	getBurndownSchema,
	getVelocitySchema,
	getActiveSprintSchema,
} from "@taskmaster/validation";
import {z} from "zod";

export const sprintsRouter = router({
	// =====================================================
	// SPRINT CRUD
	// =====================================================

	/**
	 * Create a new sprint
	 */
	create: protectedProcedure.input(createSprintSchema).mutation(async ({ctx, input}) => {
		const container = getContainer();
		return container.sprint.createSprint(input, ctx.session.user.id);
	}),

	/**
	 * Get sprint by ID
	 */
	getById: protectedProcedure.input(getSprintByIdSchema).query(async ({input}) => {
		const container = getContainer();
		return container.sprint.getSprintById(input.id);
	}),

	/**
	 * Get sprints with filtering
	 */
	getMany: protectedProcedure.input(getSprintsSchema).query(async ({input}) => {
		const container = getContainer();
		return container.sprint.getSprints(input);
	}),

	/**
	 * Get active sprint for a project
	 */
	getActive: protectedProcedure.input(getActiveSprintSchema).query(async ({input}) => {
		const container = getContainer();
		return container.sprint.getActiveSprint(input.projectId);
	}),

	/**
	 * Update sprint
	 */
	update: protectedProcedure
		.input(z.object({id: z.string()}).merge(updateSprintSchema))
		.mutation(async ({ctx, input}) => {
			const container = getContainer();
			const {id, ...data} = input;
			return container.sprint.updateSprint(id, data, ctx.session.user.id);
		}),

	/**
	 * Start a sprint
	 */
	start: protectedProcedure.input(startSprintSchema).mutation(async ({ctx, input}) => {
		const container = getContainer();
		return container.sprint.startSprint(input, ctx.session.user.id);
	}),

	/**
	 * Complete a sprint
	 */
	complete: protectedProcedure.input(completeSprintSchema).mutation(async ({ctx, input}) => {
		const container = getContainer();
		return container.sprint.completeSprint(input, ctx.session.user.id);
	}),

	/**
	 * Cancel a sprint
	 */
	cancel: protectedProcedure
		.input(z.object({id: z.string(), reason: z.string().optional()}))
		.mutation(async ({ctx, input}) => {
			const container = getContainer();
			return container.sprint.cancelSprint(input.id, ctx.session.user.id, input.reason);
		}),

	/**
	 * Delete a sprint
	 */
	delete: protectedProcedure.input(deleteSprintSchema).mutation(async ({input}) => {
		const container = getContainer();
		return container.sprint.deleteSprint(
			input.id,
			input.moveIssuesTo,
			input.targetSprintId
		);
	}),

	// =====================================================
	// SPRINT ISSUES
	// =====================================================

	/**
	 * Get sprint issues
	 */
	getIssues: protectedProcedure.input(getSprintIssuesSchema).query(async ({input}) => {
		const container = getContainer();
		return container.sprint.getSprintIssues(input);
	}),

	/**
	 * Get backlog issues (not in any sprint)
	 */
	getBacklog: protectedProcedure.input(getBacklogIssuesSchema).query(async ({input}) => {
		const container = getContainer();
		return container.sprint.getBacklogIssues(input);
	}),

	/**
	 * Add issue to sprint
	 */
	addIssue: protectedProcedure.input(addIssueToSprintSchema).mutation(async ({ctx, input}) => {
		const container = getContainer();
		return container.sprint.addIssueToSprint(input, ctx.session.user.id);
	}),

	/**
	 * Add multiple issues to sprint
	 */
	addIssues: protectedProcedure.input(addIssuesToSprintSchema).mutation(async ({ctx, input}) => {
		const container = getContainer();
		return container.sprint.addIssuesToSprint(input, ctx.session.user.id);
	}),

	/**
	 * Remove issue from sprint (move to backlog)
	 */
	removeIssue: protectedProcedure
		.input(removeIssueFromSprintSchema)
		.mutation(async ({ctx, input}) => {
			const container = getContainer();
			return container.sprint.removeIssueFromSprint(input.issueId, ctx.session.user.id);
		}),

	/**
	 * Move issue between sprints
	 */
	moveIssue: protectedProcedure.input(moveIssueToSprintSchema).mutation(async ({ctx, input}) => {
		const container = getContainer();
		return container.sprint.moveIssueToSprint(input, ctx.session.user.id);
	}),

	/**
	 * Reorder issues within sprint
	 */
	reorderIssues: protectedProcedure
		.input(reorderSprintIssuesSchema)
		.mutation(async ({input}) => {
			const container = getContainer();
			return container.sprint.reorderSprintIssues(input);
		}),

	// =====================================================
	// SPRINT BOARD & ANALYTICS
	// =====================================================

	/**
	 * Get sprint board data
	 */
	getBoard: protectedProcedure
		.input(z.object({sprintId: z.string()}))
		.query(async ({input}) => {
			const container = getContainer();
			return container.sprint.getSprintBoard(input.sprintId);
		}),

	/**
	 * Get sprint history
	 */
	getHistory: protectedProcedure.input(getSprintHistorySchema).query(async ({input}) => {
		const container = getContainer();
		return container.sprint.getSprintHistory(input);
	}),

	/**
	 * Get burndown chart data
	 */
	getBurndown: protectedProcedure.input(getBurndownSchema).query(async ({input}) => {
		const container = getContainer();
		return container.sprint.getBurndownChart(input.sprintId);
	}),

	/**
	 * Get velocity chart data
	 */
	getVelocity: protectedProcedure.input(getVelocitySchema).query(async ({input}) => {
		const container = getContainer();
		return container.sprint.getVelocityChart(input.projectId, input.sprintCount);
	}),

	/**
	 * Record burndown data point (for cron job or manual trigger)
	 */
	recordBurndown: protectedProcedure
		.input(z.object({sprintId: z.string()}))
		.mutation(async ({input}) => {
			const container = getContainer();
			return container.sprint.recordBurndownData(input.sprintId);
		}),
});
