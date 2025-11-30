import {router, protectedProcedure} from "@/lib/trpc";
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
import { requirePermission, extractProjectId } from '@/lib/middleware/permission';

export const sprintsRouter = router({
	// =====================================================
	// SPRINT CRUD
	// =====================================================

	/**
	 * Create a new sprint
	 */
	create: protectedProcedure
		.input(createSprintSchema)
		.use(requirePermission('sprint:create', extractProjectId.fromProjectId))
		.mutation(async ({ctx, input}) => {
			return ctx.services.sprint.createSprint(input, ctx.session!.user.id);
		}),

	/**
	 * Get sprint by ID
	 */
	getById: protectedProcedure
		.input(getSprintByIdSchema)
		.use(requirePermission('sprint:view'))
		.query(async ({ctx, input}) => {
			return ctx.services.sprint.getSprintById(input.id);
		}),

	/**
	 * Get sprints with filtering
	 */
	getMany: protectedProcedure
		.input(getSprintsSchema)
		.use(requirePermission('sprint:view', extractProjectId.fromProjectId))
		.query(async ({ctx, input}) => {
			return ctx.services.sprint.getSprints(input);
		}),

	/**
	 * Get active sprint for a project
	 */
	getActive: protectedProcedure
		.input(getActiveSprintSchema)
		.use(requirePermission('sprint:view', extractProjectId.fromProjectId))
		.query(async ({ctx, input}) => {
			return ctx.services.sprint.getActiveSprint(input.projectId);
		}),

	/**
	 * Update sprint
	 */
	update: protectedProcedure
		.input(z.object({id: z.string()}).merge(updateSprintSchema))
		.use(requirePermission('sprint:edit'))
		.mutation(async ({ctx, input}) => {
			const {id, ...data} = input;
			return ctx.services.sprint.updateSprint(id, data, ctx.session!.user.id);
		}),

	/**
	 * Start a sprint
	 */
	start: protectedProcedure
		.input(startSprintSchema)
		.use(requirePermission('sprint:edit'))
		.mutation(async ({ctx, input}) => {
			return ctx.services.sprint.startSprint(input, ctx.session!.user.id);
		}),

	/**
	 * Complete a sprint
	 */
	complete: protectedProcedure
		.input(completeSprintSchema)
		.use(requirePermission('sprint:edit'))
		.mutation(async ({ctx, input}) => {
			return ctx.services.sprint.completeSprint(input, ctx.session!.user.id);
		}),

	/**
	 * Cancel a sprint
	 */
	cancel: protectedProcedure
		.input(z.object({id: z.string(), reason: z.string().optional()}))
		.use(requirePermission('sprint:edit'))
		.mutation(async ({ctx, input}) => {
			return ctx.services.sprint.cancelSprint(input.id, ctx.session!.user.id, input.reason);
		}),

	/**
	 * Delete a sprint
	 */
	delete: protectedProcedure
		.input(deleteSprintSchema)
		.use(requirePermission('sprint:delete'))
		.mutation(async ({ctx, input}) => {
			return ctx.services.sprint.deleteSprint(
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
	getIssues: protectedProcedure
		.input(getSprintIssuesSchema)
		.use(requirePermission('sprint:view'))
		.query(async ({ctx, input}) => {
			return ctx.services.sprint.getSprintIssues(input);
		}),

	/**
	 * Get backlog issues (not in any sprint)
	 */
	getBacklog: protectedProcedure
		.input(getBacklogIssuesSchema)
		.use(requirePermission('sprint:view', extractProjectId.fromProjectId))
		.query(async ({ctx, input}) => {
			return ctx.services.sprint.getBacklogIssues(input);
		}),

	/**
	 * Add issue to sprint
	 */
	addIssue: protectedProcedure
		.input(addIssueToSprintSchema)
		.use(requirePermission('sprint:manage_issues'))
		.mutation(async ({ctx, input}) => {
			return ctx.services.sprint.addIssueToSprint(input, ctx.session!.user.id);
		}),

	/**
	 * Add multiple issues to sprint
	 */
	addIssues: protectedProcedure
		.input(addIssuesToSprintSchema)
		.use(requirePermission('sprint:manage_issues'))
		.mutation(async ({ctx, input}) => {
			return ctx.services.sprint.addIssuesToSprint(input, ctx.session!.user.id);
		}),

	/**
	 * Remove issue from sprint (move to backlog)
	 */
	removeIssue: protectedProcedure
		.input(removeIssueFromSprintSchema)
		.use(requirePermission('sprint:manage_issues'))
		.mutation(async ({ctx, input}) => {
			return ctx.services.sprint.removeIssueFromSprint(input.issueId, ctx.session!.user.id);
		}),

	/**
	 * Move issue between sprints
	 */
	moveIssue: protectedProcedure
		.input(moveIssueToSprintSchema)
		.use(requirePermission('sprint:manage_issues'))
		.mutation(async ({ctx, input}) => {
			return ctx.services.sprint.moveIssueToSprint(input, ctx.session!.user.id);
		}),

	/**
	 * Reorder issues within sprint
	 */
	reorderIssues: protectedProcedure
		.input(reorderSprintIssuesSchema)
		.use(requirePermission('sprint:manage_issues'))
		.mutation(async ({ctx, input}) => {
			return ctx.services.sprint.reorderSprintIssues(input);
		}),

	// =====================================================
	// SPRINT BOARD & ANALYTICS
	// =====================================================

	/**
	 * Get sprint board data
	 */
	getBoard: protectedProcedure
		.input(z.object({sprintId: z.string()}))
		.use(requirePermission('sprint:view'))
		.query(async ({ctx, input}) => {
			return ctx.services.sprint.getSprintBoard(input.sprintId);
		}),

	/**
	 * Get sprint history
	 */
	getHistory: protectedProcedure
		.input(getSprintHistorySchema)
		.use(requirePermission('sprint:view'))
		.query(async ({ctx, input}) => {
			return ctx.services.sprint.getSprintHistory(input);
		}),

	/**
	 * Get burndown chart data
	 */
	getBurndown: protectedProcedure
		.input(getBurndownSchema)
		.use(requirePermission('sprint:view'))
		.query(async ({ctx, input}) => {
			return ctx.services.sprint.getBurndownChart(input.sprintId);
		}),

	/**
	 * Get velocity chart data
	 */
	getVelocity: protectedProcedure
		.input(getVelocitySchema)
		.use(requirePermission('sprint:view', extractProjectId.fromProjectId))
		.query(async ({ctx, input}) => {
			return ctx.services.sprint.getVelocityChart(input.projectId, input.sprintCount);
		}),

	/**
	 * Record burndown data point (for cron job or manual trigger)
	 */
	recordBurndown: protectedProcedure
		.input(z.object({sprintId: z.string()}))
		.use(requirePermission('sprint:edit'))
		.mutation(async ({ctx, input}) => {
			return ctx.services.sprint.recordBurndownData(input.sprintId);
		}),
});
