// =============================================================================
// WORKFLOW REPOSITORY
// Repository for workflow, workflow statuses, and transitions
// =============================================================================

import { workflows, workflowStatuses, workflowTransitions } from '@/db/schema/workflows';
import { db } from '@/db';
import { eq, and, asc, isNull, or, sql, count } from 'drizzle-orm';
import type { DrizzleClientOrTransaction } from '@/lib/types/db';
import type {
  CreateWorkflowSchema,
  UpdateWorkflowSchema,
  AddStatusToWorkflowSchema,
  UpdateWorkflowStatusSchema,
  CreateTransitionSchema,
  UpdateTransitionSchema,
} from '@taskmaster/validation';
import type { Workflow, WorkflowStatus, WorkflowTransition, NewWorkflow, NewWorkflowStatus, NewWorkflowTransition } from '@/db/schema/workflows';

// =============================================================================
// TYPES
// =============================================================================

export interface WorkflowWithDetails extends Workflow {
  statuses: (WorkflowStatus & { status: { id: string; name: string; category: string; color: string | null } })[];
  transitions: (WorkflowTransition & {
    fromStatus: { id: string; name: string; category: string } | null;
    toStatus: { id: string; name: string; category: string };
  })[];
}

export interface WorkflowUsageCount {
  projectCount: number;
  issueTypeCount: number;
  total: number;
}

// =============================================================================
// WORKFLOW REPOSITORY CLASS
// =============================================================================

export class WorkflowRepository {
  constructor(private readonly drizzle: DrizzleClientOrTransaction = db) {}

  // ===========================================================================
  // WORKFLOWS
  // ===========================================================================

  async findAll(): Promise<Workflow[]> {
    return this.drizzle
      .select()
      .from(workflows)
      .orderBy(asc(workflows.name));
  }

  async findById(id: string): Promise<WorkflowWithDetails | undefined> {
    return this.drizzle.query.workflows.findFirst({
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
    }) as Promise<WorkflowWithDetails | undefined>;
  }

  async findByName(name: string): Promise<Workflow | undefined> {
    return this.drizzle.query.workflows.findFirst({
      where: eq(workflows.name, name),
    });
  }

  async findDefault(): Promise<WorkflowWithDetails | undefined> {
    return this.drizzle.query.workflows.findFirst({
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
    }) as Promise<WorkflowWithDetails | undefined>;
  }

  async create(input: CreateWorkflowSchema): Promise<Workflow> {
    const [result] = await this.drizzle
      .insert(workflows)
      .values({
        name: input.name,
        description: input.description,
        isDefault: input.isDefault ?? false,
      })
      .returning();
    return result;
  }

  async update(input: UpdateWorkflowSchema): Promise<Workflow> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.isDefault !== undefined) updateData.isDefault = input.isDefault;

    const [result] = await this.drizzle
      .update(workflows)
      .set(updateData)
      .where(eq(workflows.id, input.workflowId))
      .returning();
    return result;
  }

  async delete(id: string): Promise<Workflow | undefined> {
    const [result] = await this.drizzle
      .delete(workflows)
      .where(eq(workflows.id, id))
      .returning();
    return result;
  }

  async clearDefault(): Promise<void> {
    await this.drizzle
      .update(workflows)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(workflows.isDefault, true));
  }

  // ===========================================================================
  // WORKFLOW STATUSES
  // ===========================================================================

  async findWorkflowStatuses(workflowId: string) {
    return this.drizzle.query.workflowStatuses.findMany({
      where: eq(workflowStatuses.workflowId, workflowId),
      orderBy: [asc(workflowStatuses.sortOrder)],
      with: {
        status: true,
      },
    });
  }

  async findWorkflowStatus(workflowId: string, statusId: string) {
    return this.drizzle.query.workflowStatuses.findFirst({
      where: and(
        eq(workflowStatuses.workflowId, workflowId),
        eq(workflowStatuses.statusId, statusId),
      ),
    });
  }

  async findInitialStatus(workflowId: string) {
    return this.drizzle.query.workflowStatuses.findFirst({
      where: and(
        eq(workflowStatuses.workflowId, workflowId),
        eq(workflowStatuses.isInitial, true),
      ),
      with: {
        status: true,
      },
    });
  }

  async addStatusToWorkflow(input: AddStatusToWorkflowSchema): Promise<WorkflowStatus> {
    const [result] = await this.drizzle
      .insert(workflowStatuses)
      .values({
        workflowId: input.workflowId,
        statusId: input.statusId,
        isInitial: input.isInitial ?? false,
        sortOrder: input.sortOrder ?? 0,
      })
      .returning();
    return result;
  }

  async updateWorkflowStatus(input: UpdateWorkflowStatusSchema): Promise<WorkflowStatus> {
    const updateData: Record<string, unknown> = {};

    if (input.isInitial !== undefined) updateData.isInitial = input.isInitial;
    if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;

    const [result] = await this.drizzle
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
  }

  async removeStatusFromWorkflow(workflowId: string, statusId: string): Promise<WorkflowStatus | undefined> {
    const [result] = await this.drizzle
      .delete(workflowStatuses)
      .where(
        and(
          eq(workflowStatuses.workflowId, workflowId),
          eq(workflowStatuses.statusId, statusId),
        ),
      )
      .returning();
    return result;
  }

  async clearInitialStatus(workflowId: string): Promise<void> {
    await this.drizzle
      .update(workflowStatuses)
      .set({ isInitial: false })
      .where(
        and(
          eq(workflowStatuses.workflowId, workflowId),
          eq(workflowStatuses.isInitial, true),
        ),
      );
  }

  async updateWorkflowStatusOrder(workflowId: string, statusId: string, sortOrder: number): Promise<void> {
    await this.drizzle
      .update(workflowStatuses)
      .set({ sortOrder })
      .where(
        and(
          eq(workflowStatuses.workflowId, workflowId),
          eq(workflowStatuses.statusId, statusId),
        ),
      );
  }

  // ===========================================================================
  // WORKFLOW TRANSITIONS
  // ===========================================================================

  async findTransitionsByWorkflow(workflowId: string) {
    return this.drizzle.query.workflowTransitions.findMany({
      where: eq(workflowTransitions.workflowId, workflowId),
      orderBy: [asc(workflowTransitions.sortOrder)],
      with: {
        fromStatus: true,
        toStatus: true,
      },
    });
  }

  async findTransitionById(id: string) {
    return this.drizzle.query.workflowTransitions.findFirst({
      where: eq(workflowTransitions.id, id),
      with: {
        fromStatus: true,
        toStatus: true,
      },
    });
  }

  async findAvailableTransitions(workflowId: string, fromStatusId?: string) {
    return this.drizzle.query.workflowTransitions.findMany({
      where: and(
        eq(workflowTransitions.workflowId, workflowId),
        fromStatusId
          ? or(
              eq(workflowTransitions.fromStatusId, fromStatusId),
              isNull(workflowTransitions.fromStatusId),
            )
          : isNull(workflowTransitions.fromStatusId),
      ),
      orderBy: [asc(workflowTransitions.sortOrder)],
      with: {
        fromStatus: true,
        toStatus: true,
      },
    });
  }

  async createTransition(input: CreateTransitionSchema): Promise<WorkflowTransition> {
    const [result] = await this.drizzle
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
  }

  async updateTransition(input: UpdateTransitionSchema): Promise<WorkflowTransition> {
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

    const [result] = await this.drizzle
      .update(workflowTransitions)
      .set(updateData)
      .where(eq(workflowTransitions.id, input.transitionId))
      .returning();
    return result;
  }

  async deleteTransition(id: string): Promise<WorkflowTransition | undefined> {
    const [result] = await this.drizzle
      .delete(workflowTransitions)
      .where(eq(workflowTransitions.id, id))
      .returning();
    return result;
  }

  async deleteTransitionsByStatus(workflowId: string, statusId: string): Promise<void> {
    await this.drizzle
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
  }

  // ===========================================================================
  // IN-USE CHECKS
  // ===========================================================================

  async countWorkflowUsage(workflowId: string): Promise<WorkflowUsageCount> {
    const { projects: projectsTable } = await import('@/db/schema/projects');
    const { projectIssueTypes } = await import('@/db/schema/issue-type-junctions');

    // Check projects using this workflow as default
    const [projectCount] = await this.drizzle
      .select({ count: sql<number>`count(*)` })
      .from(projectsTable)
      .where(eq(projectsTable.defaultWorkflowId, workflowId));

    // Check project issue types using this workflow
    const [issueTypeCount] = await this.drizzle
      .select({ count: sql<number>`count(*)` })
      .from(projectIssueTypes)
      .where(eq(projectIssueTypes.workflowId, workflowId));

    return {
      projectCount: Number(projectCount?.count || 0),
      issueTypeCount: Number(issueTypeCount?.count || 0),
      total: Number(projectCount?.count || 0) + Number(issueTypeCount?.count || 0),
    };
  }

  async countStatusUsageInWorkflows(statusId: string): Promise<number> {
    const [result] = await this.drizzle
      .select({ count: sql<number>`count(*)` })
      .from(workflowStatuses)
      .where(eq(workflowStatuses.statusId, statusId));

    return Number(result?.count || 0);
  }

  // ===========================================================================
  // TRANSACTION SUPPORT
  // ===========================================================================

  /**
   * Create a new repository instance with a transaction
   */
  withTransaction(tx: DrizzleClientOrTransaction): WorkflowRepository {
    return new WorkflowRepository(tx);
  }
}

// =============================================================================
// FACTORY FUNCTION (for backward compatibility)
// =============================================================================

/**
 * @deprecated Use `new WorkflowRepository()` instead
 */
export const workflowRepository = (drizzle: DrizzleClientOrTransaction = db) => {
  const repo = new WorkflowRepository(drizzle);
  
  return {
    // Workflows
    findAllWorkflows: () => repo.findAll(),
    findWorkflowById: (id: string) => repo.findById(id),
    findWorkflowByName: (name: string) => repo.findByName(name),
    findDefaultWorkflow: () => repo.findDefault(),
    createWorkflow: (input: CreateWorkflowSchema) => repo.create(input),
    updateWorkflow: (input: UpdateWorkflowSchema) => repo.update(input),
    deleteWorkflow: (id: string) => repo.delete(id),
    clearDefaultWorkflow: () => repo.clearDefault(),
    
    // Workflow Statuses
    findWorkflowStatuses: (workflowId: string) => repo.findWorkflowStatuses(workflowId),
    findWorkflowStatus: (workflowId: string, statusId: string) => repo.findWorkflowStatus(workflowId, statusId),
    findInitialStatus: (workflowId: string) => repo.findInitialStatus(workflowId),
    addStatusToWorkflow: (input: AddStatusToWorkflowSchema) => repo.addStatusToWorkflow(input),
    updateWorkflowStatus: (input: UpdateWorkflowStatusSchema) => repo.updateWorkflowStatus(input),
    removeStatusFromWorkflow: (workflowId: string, statusId: string) => repo.removeStatusFromWorkflow(workflowId, statusId),
    clearInitialStatus: (workflowId: string) => repo.clearInitialStatus(workflowId),
    updateWorkflowStatusOrder: (workflowId: string, statusId: string, sortOrder: number) => repo.updateWorkflowStatusOrder(workflowId, statusId, sortOrder),
    
    // Workflow Transitions
    findTransitionsByWorkflow: (workflowId: string) => repo.findTransitionsByWorkflow(workflowId),
    findTransitionById: (id: string) => repo.findTransitionById(id),
    findAvailableTransitions: (workflowId: string, fromStatusId?: string) => repo.findAvailableTransitions(workflowId, fromStatusId),
    createTransition: (input: CreateTransitionSchema) => repo.createTransition(input),
    updateTransition: (input: UpdateTransitionSchema) => repo.updateTransition(input),
    deleteTransition: (id: string) => repo.deleteTransition(id),
    deleteTransitionsByStatus: (workflowId: string, statusId: string) => repo.deleteTransitionsByStatus(workflowId, statusId),
    
    // In-Use Checks
    countWorkflowUsage: (workflowId: string) => repo.countWorkflowUsage(workflowId),
    countStatusUsageInWorkflows: (statusId: string) => repo.countStatusUsageInWorkflows(statusId),
  };
};
