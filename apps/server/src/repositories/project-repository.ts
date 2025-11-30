import { projects, templates } from '@/db/schema/projects';
import { projectIssueTypes, templateIssueTypes } from '@/db/schema/issue-type-junctions';
import { db } from '@/db';
import { eq, and, asc, or, ilike } from 'drizzle-orm';
import type { DrizzleClientOrTransaction } from '@/lib/types/db';
import type {
  CreateProjectSchema,
  UpdateProjectSchema,
  AddIssueTypeToProjectSchema,
  UpdateProjectIssueTypeWorkflowSchema,
  ListProjectsSchema,
} from '@taskmaster/validation';

export const projectRepository = (drizzle: DrizzleClientOrTransaction = db) => ({
  // =============================================================================
  // PROJECTS
  // =============================================================================

  findAllProjects: (filters?: ListProjectsSchema) =>
    drizzle.query.projects.findMany({
      where: filters?.includeArchived
        ? filters?.leadId
          ? eq(projects.leadId, filters.leadId)
          : undefined
        : filters?.leadId
          ? and(eq(projects.isArchived, false), eq(projects.leadId, filters.leadId))
          : eq(projects.isArchived, false),
      orderBy: [asc(projects.name)],
      with: {
        lead: true,
        defaultWorkflow: true,
      },
    }),

  findProjectById: (id: string) =>
    drizzle.query.projects.findFirst({
      where: eq(projects.id, id),
      with: {
        lead: true,
        defaultWorkflow: {
          with: {
            statuses: {
              with: {
                status: true,
              },
            },
          },
        },
      },
    }),

  findProjectByKey: (key: string) =>
    drizzle.query.projects.findFirst({
      where: eq(projects.key, key.toUpperCase()),
      with: {
        lead: true,
        defaultWorkflow: true,
      },
    }),

  findProjectByName: (name: string) =>
    drizzle.query.projects.findFirst({
      where: eq(projects.name, name),
    }),

  createProject: async (input: CreateProjectSchema) => {
    const [result] = await drizzle
      .insert(projects)
      .values({
        name: input.name,
        key: input.key.toUpperCase(),
        description: input.description,
        icon: input.icon,
        color: input.color ?? '#6B7280',
        leadId: input.leadId ?? null,
        defaultWorkflowId: input.defaultWorkflowId ?? null,
        settings: input.settings ?? {},
        isArchived: false,
      })
      .returning();
    return result;
  },

  updateProject: async (input: UpdateProjectSchema) => {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.key !== undefined) updateData.key = input.key.toUpperCase();
    if (input.description !== undefined) updateData.description = input.description;
    if (input.icon !== undefined) updateData.icon = input.icon;
    if (input.color !== undefined) updateData.color = input.color;
    if (input.leadId !== undefined) updateData.leadId = input.leadId;
    if (input.defaultWorkflowId !== undefined) updateData.defaultWorkflowId = input.defaultWorkflowId;
    if (input.settings !== undefined) updateData.settings = input.settings;
    if (input.isArchived !== undefined) updateData.isArchived = input.isArchived;

    const [result] = await drizzle
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, input.projectId))
      .returning();
    return result;
  },

  deleteProject: async (id: string) => {
    const [result] = await drizzle
      .delete(projects)
      .where(eq(projects.id, id))
      .returning();
    return result;
  },

  archiveProject: async (id: string, isArchived: boolean) => {
    const [result] = await drizzle
      .update(projects)
      .set({ isArchived, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return result;
  },

  // =============================================================================
  // PROJECT ISSUE TYPES
  // =============================================================================

  findProjectIssueTypes: (projectId: string) =>
    drizzle.query.projectIssueTypes.findMany({
      where: eq(projectIssueTypes.projectId, projectId),
      with: {
        issueType: true,
        workflow: {
          with: {
            statuses: {
              with: {
                status: true,
              },
            },
          },
        },
      },
    }),

  findProjectIssueType: (projectId: string, issueTypeId: string) =>
    drizzle.query.projectIssueTypes.findFirst({
      where: and(
        eq(projectIssueTypes.projectId, projectId),
        eq(projectIssueTypes.issueTypeId, issueTypeId),
      ),
      with: {
        issueType: true,
        workflow: true,
      },
    }),

  addIssueTypeToProject: async (input: AddIssueTypeToProjectSchema) => {
    const [result] = await drizzle
      .insert(projectIssueTypes)
      .values({
        projectId: input.projectId,
        issueTypeId: input.issueTypeId,
        workflowId: input.workflowId ?? null,
      })
      .returning();
    return result;
  },

  updateProjectIssueTypeWorkflow: async (input: UpdateProjectIssueTypeWorkflowSchema) => {
    const [result] = await drizzle
      .update(projectIssueTypes)
      .set({ workflowId: input.workflowId ?? null })
      .where(
        and(
          eq(projectIssueTypes.projectId, input.projectId),
          eq(projectIssueTypes.issueTypeId, input.issueTypeId),
        ),
      )
      .returning();
    return result;
  },

  removeIssueTypeFromProject: async (projectId: string, issueTypeId: string) => {
    const [result] = await drizzle
      .delete(projectIssueTypes)
      .where(
        and(
          eq(projectIssueTypes.projectId, projectId),
          eq(projectIssueTypes.issueTypeId, issueTypeId),
        ),
      )
      .returning();
    return result;
  },

  // Bulk add issue types
  bulkAddIssueTypesToProject: async (
    projectId: string,
    issueTypes: { issueTypeId: string; workflowId?: string }[],
  ) => {
    if (issueTypes.length === 0) return [];

    const values = issueTypes.map((it) => ({
      projectId,
      issueTypeId: it.issueTypeId,
      workflowId: it.workflowId ?? null,
    }));

    const result = await drizzle
      .insert(projectIssueTypes)
      .values(values)
      .returning();
    return result;
  },

  // =============================================================================
  // TEMPLATES
  // =============================================================================

  findAllTemplates: () =>
    drizzle.query.templates.findMany({
      orderBy: [asc(templates.name)],
      with: {
        defaultWorkflow: true,
      },
    }),

  findTemplateById: (id: string) =>
    drizzle.query.templates.findFirst({
      where: eq(templates.id, id),
      with: {
        defaultWorkflow: true,
      },
    }),

  findTemplateIssueTypes: (templateId: string) =>
    drizzle.query.templateIssueTypes.findMany({
      where: eq(templateIssueTypes.templateId, templateId),
      with: {
        issueType: true,
        workflow: true,
      },
    }),
});
