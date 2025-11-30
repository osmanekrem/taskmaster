import { workflows, workflowStatuses, workflowTransitions } from '@/db/schema/workflows';
import { statuses } from '@/db/schema/statuses';
import { db } from '@/db';
import { eq, and, asc, isNull, or } from 'drizzle-orm';
import type { DrizzleClientOrTransaction } from '@/lib/types/db';
import type {
  CreateWorkflowSchema,
  UpdateWorkflowSchema,
  AddStatusToWorkflowSchema,
  UpdateWorkflowStatusSchema,
  CreateTransitionSchema,
  UpdateTransitionSchema,
} from '@taskmaster/validation';

export const workflowRepository = (drizzle: DrizzleClientOrTransaction = db) => ({
  // =============================================================================
  // WORKFLOWS
  // =============================================================================

  findAllWorkflows: () =>
    drizzle
      .select()
      .from(workflows)
      .orderBy(asc(workflows.name)),

  findWorkflowById: (id: string) =>
    drizzle.query.workflows.findFirst({
      where: eq(workflows.id, id),
      with: {
        statuses: {
          orderBy: [asc(workflowStatuses.sortOrder)],
          with: {
            status: true,
          },
        },
        transitions: {
          orderBy: [asc(workflowTransitions.sortOrder)],
          with: {
            fromStatus: true,
            toStatus: true,
          },
        },
      },
    }),

  findWorkflowByName: (name: string) =>
    drizzle.query.workflows.findFirst({
      where: eq(workflows.name, name),
    }),

  findDefaultWorkflow: () =>
    drizzle.query.workflows.findFirst({
      where: eq(workflows.isDefault, true),
      with: {
        statuses: {
          orderBy: [asc(workflowStatuses.sortOrder)],
          with: {
            status: true,
          },
        },
        transitions: {
          orderBy: [asc(workflowTransitions.sortOrder)],
        },
      },
    }),

  createWorkflow: async (input: CreateWorkflowSchema) => {
    const [result] = await drizzle
      .insert(workflows)
      .values({
        name: input.name,
        description: input.description,
        isDefault: input.isDefault ?? false,
      })
      .returning();
    return result;
  },

  updateWorkflow: async (input: UpdateWorkflowSchema) => {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.isDefault !== undefined) updateData.isDefault = input.isDefault;

    const [result] = await drizzle
      .update(workflows)
      .set(updateData)
      .where(eq(workflows.id, input.workflowId))
      .returning();
    return result;
  },

  deleteWorkflow: async (id: string) => {
    const [result] = await drizzle
      .delete(workflows)
      .where(eq(workflows.id, id))
      .returning();
    return result;
  },

  clearDefaultWorkflow: async () => {
    await drizzle
      .update(workflows)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(workflows.isDefault, true));
  },

  // =============================================================================
  // WORKFLOW STATUSES
  // =============================================================================

  findWorkflowStatuses: (workflowId: string) =>
    drizzle.query.workflowStatuses.findMany({
      where: eq(workflowStatuses.workflowId, workflowId),
      orderBy: [asc(workflowStatuses.sortOrder)],
      with: {
        status: true,
      },
    }),

  findWorkflowStatus: (workflowId: string, statusId: string) =>
    drizzle.query.workflowStatuses.findFirst({
      where: and(
        eq(workflowStatuses.workflowId, workflowId),
        eq(workflowStatuses.statusId, statusId),
      ),
    }),

  findInitialStatus: (workflowId: string) =>
    drizzle.query.workflowStatuses.findFirst({
      where: and(
        eq(workflowStatuses.workflowId, workflowId),
        eq(workflowStatuses.isInitial, true),
      ),
      with: {
        status: true,
      },
    }),

  addStatusToWorkflow: async (input: AddStatusToWorkflowSchema) => {
    const [result] = await drizzle
      .insert(workflowStatuses)
      .values({
        workflowId: input.workflowId,
        statusId: input.statusId,
        isInitial: input.isInitial ?? false,
        sortOrder: input.sortOrder ?? 0,
      })
      .returning();
    return result;
  },

  updateWorkflowStatus: async (input: UpdateWorkflowStatusSchema) => {
    const updateData: Record<string, unknown> = {};

    if (input.isInitial !== undefined) updateData.isInitial = input.isInitial;
    if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;

    const [result] = await drizzle
      .update(workflowStatuses)
      .set(updateData)
      .where(
        and(
          eq(workflowStatuses.workflowId, input.workflowId),
          eq(workflowStatuses.statusId, input.statusId),
        ),
      )
      .returning();
    return result;
  },

  removeStatusFromWorkflow: async (workflowId: string, statusId: string) => {
    const [result] = await drizzle
      .delete(workflowStatuses)
      .where(
        and(
          eq(workflowStatuses.workflowId, workflowId),
          eq(workflowStatuses.statusId, statusId),
        ),
      )
      .returning();
    return result;
  },

  clearInitialStatus: async (workflowId: string) => {
    await drizzle
      .update(workflowStatuses)
      .set({ isInitial: false })
      .where(
        and(
          eq(workflowStatuses.workflowId, workflowId),
          eq(workflowStatuses.isInitial, true),
        ),
      );
  },

  // Bulk update for reordering
  updateWorkflowStatusOrder: async (workflowId: string, statusId: string, sortOrder: number) => {
    await drizzle
      .update(workflowStatuses)
      .set({ sortOrder })
      .where(
        and(
          eq(workflowStatuses.workflowId, workflowId),
          eq(workflowStatuses.statusId, statusId),
        ),
      );
  },

  // =============================================================================
  // WORKFLOW TRANSITIONS
  // =============================================================================

  findTransitionsByWorkflow: (workflowId: string) =>
    drizzle.query.workflowTransitions.findMany({
      where: eq(workflowTransitions.workflowId, workflowId),
      orderBy: [asc(workflowTransitions.sortOrder)],
      with: {
        fromStatus: true,
        toStatus: true,
      },
    }),

  findTransitionById: (id: string) =>
    drizzle.query.workflowTransitions.findFirst({
      where: eq(workflowTransitions.id, id),
      with: {
        fromStatus: true,
        toStatus: true,
      },
    }),

  // Get available transitions from a specific status (or global if fromStatusId is null)
  findAvailableTransitions: (workflowId: string, fromStatusId?: string) =>
    drizzle.query.workflowTransitions.findMany({
      where: and(
        eq(workflowTransitions.workflowId, workflowId),
        fromStatusId
          ? or(
              eq(workflowTransitions.fromStatusId, fromStatusId),
              isNull(workflowTransitions.fromStatusId), // Global transitions
            )
          : isNull(workflowTransitions.fromStatusId),
      ),
      orderBy: [asc(workflowTransitions.sortOrder)],
      with: {
        fromStatus: true,
        toStatus: true,
      },
    }),

  createTransition: async (input: CreateTransitionSchema) => {
    const [result] = await drizzle
      .insert(workflowTransitions)
      .values({
        workflowId: input.workflowId,
        name: input.name,
        description: input.description,
        fromStatusId: input.fromStatusId ?? null,
        toStatusId: input.toStatusId,
        conditions: input.conditions ?? [],
        validators: input.validators ?? [],
        postFunctions: input.postFunctions ?? [],
        screenId: input.screenId ?? null,
        sortOrder: input.sortOrder ?? 0,
      })
      .returning();
    return result;
  },

  updateTransition: async (input: UpdateTransitionSchema) => {
    const updateData: Record<string, unknown> = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.fromStatusId !== undefined) updateData.fromStatusId = input.fromStatusId;
    if (input.toStatusId !== undefined) updateData.toStatusId = input.toStatusId;
    if (input.conditions !== undefined) updateData.conditions = input.conditions;
    if (input.validators !== undefined) updateData.validators = input.validators;
    if (input.postFunctions !== undefined) updateData.postFunctions = input.postFunctions;
    if (input.screenId !== undefined) updateData.screenId = input.screenId;
    if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;

    const [result] = await drizzle
      .update(workflowTransitions)
      .set(updateData)
      .where(eq(workflowTransitions.id, input.transitionId))
      .returning();
    return result;
  },

  deleteTransition: async (id: string) => {
    const [result] = await drizzle
      .delete(workflowTransitions)
      .where(eq(workflowTransitions.id, id))
      .returning();
    return result;
  },

  // Delete all transitions involving a status (when removing status from workflow)
  deleteTransitionsByStatus: async (workflowId: string, statusId: string) => {
    await drizzle
      .delete(workflowTransitions)
      .where(
        and(
          eq(workflowTransitions.workflowId, workflowId),
          or(
            eq(workflowTransitions.fromStatusId, statusId),
            eq(workflowTransitions.toStatusId, statusId),
          ),
        ),
      );
  },

  // =============================================================================
  // IN-USE CHECKS
  // =============================================================================

  // Check if workflow is in use by any project or issue type
  countWorkflowUsage: async (workflowId: string) => {
    const { projects: projectsTable } = await import('@/db/schema/projects');
    const { projectIssueTypes } = await import('@/db/schema/issue-type-junctions');
    const { sql } = await import('drizzle-orm');

    // Check projects using this workflow as default
    const [projectCount] = await drizzle
      .select({ count: sql<number>`count(*)` })
      .from(projectsTable)
      .where(eq(projectsTable.defaultWorkflowId, workflowId));

    // Check project issue types using this workflow
    const [issueTypeCount] = await drizzle
      .select({ count: sql<number>`count(*)` })
      .from(projectIssueTypes)
      .where(eq(projectIssueTypes.workflowId, workflowId));

    return {
      projectCount: Number(projectCount?.count || 0),
      issueTypeCount: Number(issueTypeCount?.count || 0),
      total: Number(projectCount?.count || 0) + Number(issueTypeCount?.count || 0),
    };
  },

  // Check if status is used in any workflow
  countStatusUsageInWorkflows: async (statusId: string) => {
    const { sql } = await import('drizzle-orm');

    const [result] = await drizzle
      .select({ count: sql<number>`count(*)` })
      .from(workflowStatuses)
      .where(eq(workflowStatuses.statusId, statusId));

    return Number(result?.count || 0);
  },
});
