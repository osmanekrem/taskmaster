import { db } from '@/db';
import { projectRepository } from '@/repositories/project-repository';
import { workflowRepository } from '@/repositories/workflow-repository';
import type {
  CreateProjectSchema,
  UpdateProjectSchema,
  GetProjectByIdSchema,
  GetProjectByKeySchema,
  DeleteProjectSchema,
  ArchiveProjectSchema,
  AddIssueTypeToProjectSchema,
  RemoveIssueTypeFromProjectSchema,
  UpdateProjectIssueTypeWorkflowSchema,
  GetProjectIssueTypesSchema,
  BulkAddIssueTypesToProjectSchema,
  UpdateProjectSettingsSchema,
  ListProjectsSchema,
} from '@taskmaster/validation';
import { throwNotFoundError, throwValidationError } from '@/lib/errors';
import type { DrizzleClientOrTransaction } from '@/lib/types/db';

export const projectService = (drizzle: DrizzleClientOrTransaction = db) => {
  const repository = projectRepository(drizzle);
  const workflowRepo = workflowRepository(drizzle);

  return {
    // =============================================================================
    // PROJECTS
    // =============================================================================

    /**
     * Get all projects
     */
    getAllProjects: (filters?: ListProjectsSchema) => repository.findAllProjects(filters),

    /**
     * Get a project by ID
     */
    getProjectById: async (input: GetProjectByIdSchema) => {
      const project = await repository.findProjectById(input.projectId);
      if (!project) {
        throwNotFoundError('PROJECT_NOT_FOUND', { projectId: input.projectId });
      }
      return project;
    },

    /**
     * Get a project by key
     */
    getProjectByKey: async (input: GetProjectByKeySchema) => {
      const project = await repository.findProjectByKey(input.key);
      if (!project) {
        throwNotFoundError('PROJECT_NOT_FOUND', { key: input.key });
      }
      return project;
    },

    /**
     * Create a new project
     */
    createProject: async (input: CreateProjectSchema) => {
      // Check if key exists
      const existingKey = await repository.findProjectByKey(input.key);
      if (existingKey) {
        throwValidationError('PROJECT_KEY_EXISTS', { key: input.key });
      }

      // Check if name exists
      const existingName = await repository.findProjectByName(input.name);
      if (existingName) {
        throwValidationError('PROJECT_NAME_EXISTS', { name: input.name });
      }

      // Validate workflow exists if provided
      if (input.defaultWorkflowId) {
        const workflow = await workflowRepo.findWorkflowById(input.defaultWorkflowId);
        if (!workflow) {
          throwNotFoundError('WORKFLOW_NOT_FOUND', { workflowId: input.defaultWorkflowId });
        }
      }

      return await repository.createProject(input);
    },

    /**
     * Update a project
     */
    updateProject: async (input: UpdateProjectSchema) => {
      const existing = await repository.findProjectById(input.projectId);
      if (!existing) {
        throwNotFoundError('PROJECT_NOT_FOUND', { projectId: input.projectId });
      }

      // Check if new key conflicts
      if (input.key && input.key.toUpperCase() !== existing.key) {
        const keyExists = await repository.findProjectByKey(input.key);
        if (keyExists) {
          throwValidationError('PROJECT_KEY_EXISTS', { key: input.key });
        }
      }

      // Check if new name conflicts
      if (input.name && input.name !== existing.name) {
        const nameExists = await repository.findProjectByName(input.name);
        if (nameExists) {
          throwValidationError('PROJECT_NAME_EXISTS', { name: input.name });
        }
      }

      // Validate workflow if changing
      if (input.defaultWorkflowId && input.defaultWorkflowId !== existing.defaultWorkflowId) {
        const workflow = await workflowRepo.findWorkflowById(input.defaultWorkflowId);
        if (!workflow) {
          throwNotFoundError('WORKFLOW_NOT_FOUND', { workflowId: input.defaultWorkflowId });
        }
      }

      return await repository.updateProject(input);
    },

    /**
     * Delete a project
     */
    deleteProject: async (input: DeleteProjectSchema) => {
      const existing = await repository.findProjectById(input.projectId);
      if (!existing) {
        throwNotFoundError('PROJECT_NOT_FOUND', { projectId: input.projectId });
      }

      // Cannot delete archived project
      if (existing.isArchived) {
        throwValidationError('CANNOT_DELETE_ARCHIVED_PROJECT', { projectId: input.projectId });
      }

      // TODO: Check if project has issues
      // This will be implemented when we have issues

      return await repository.deleteProject(input.projectId);
    },

    /**
     * Archive/unarchive a project
     */
    archiveProject: async (input: ArchiveProjectSchema) => {
      const existing = await repository.findProjectById(input.projectId);
      if (!existing) {
        throwNotFoundError('PROJECT_NOT_FOUND', { projectId: input.projectId });
      }

      return await repository.archiveProject(input.projectId, input.isArchived);
    },

    /**
     * Update project settings
     */
    updateProjectSettings: async (input: UpdateProjectSettingsSchema) => {
      const existing = await repository.findProjectById(input.projectId);
      if (!existing) {
        throwNotFoundError('PROJECT_NOT_FOUND', { projectId: input.projectId });
      }

      // Merge new settings with existing
      const mergedSettings = {
        ...(existing.settings || {}),
        ...input.settings,
      };

      return await repository.updateProject({
        projectId: input.projectId,
        settings: mergedSettings,
      });
    },

    // =============================================================================
    // PROJECT ISSUE TYPES
    // =============================================================================

    /**
     * Get all issue types in a project
     */
    getProjectIssueTypes: async (input: GetProjectIssueTypesSchema) => {
      const project = await repository.findProjectById(input.projectId);
      if (!project) {
        throwNotFoundError('PROJECT_NOT_FOUND', { projectId: input.projectId });
      }

      return await repository.findProjectIssueTypes(input.projectId);
    },

    /**
     * Add an issue type to a project
     */
    addIssueTypeToProject: async (input: AddIssueTypeToProjectSchema) => {
      // Verify project exists
      const project = await repository.findProjectById(input.projectId);
      if (!project) {
        throwNotFoundError('PROJECT_NOT_FOUND', { projectId: input.projectId });
      }

      // Check if already added
      const existing = await repository.findProjectIssueType(input.projectId, input.issueTypeId);
      if (existing) {
        throwValidationError('ISSUE_TYPE_ALREADY_IN_PROJECT', {
          projectId: input.projectId,
          issueTypeId: input.issueTypeId,
        });
      }

      // Validate workflow if provided
      if (input.workflowId) {
        const workflow = await workflowRepo.findWorkflowById(input.workflowId);
        if (!workflow) {
          throwNotFoundError('WORKFLOW_NOT_FOUND', { workflowId: input.workflowId });
        }
      }

      return await repository.addIssueTypeToProject(input);
    },

    /**
     * Update workflow for an issue type in a project
     */
    updateProjectIssueTypeWorkflow: async (input: UpdateProjectIssueTypeWorkflowSchema) => {
      // Verify project issue type exists
      const existing = await repository.findProjectIssueType(input.projectId, input.issueTypeId);
      if (!existing) {
        throwNotFoundError('PROJECT_ISSUE_TYPE_NOT_FOUND', {
          projectId: input.projectId,
          issueTypeId: input.issueTypeId,
        });
      }

      // Validate workflow if provided
      if (input.workflowId) {
        const workflow = await workflowRepo.findWorkflowById(input.workflowId);
        if (!workflow) {
          throwNotFoundError('WORKFLOW_NOT_FOUND', { workflowId: input.workflowId });
        }
      }

      return await repository.updateProjectIssueTypeWorkflow(input);
    },

    /**
     * Remove an issue type from a project
     */
    removeIssueTypeFromProject: async (input: RemoveIssueTypeFromProjectSchema) => {
      // Verify project issue type exists
      const existing = await repository.findProjectIssueType(input.projectId, input.issueTypeId);
      if (!existing) {
        throwNotFoundError('PROJECT_ISSUE_TYPE_NOT_FOUND', {
          projectId: input.projectId,
          issueTypeId: input.issueTypeId,
        });
      }

      // TODO: Check if there are issues of this type in the project
      // This will be implemented when we have issues

      return await repository.removeIssueTypeFromProject(input.projectId, input.issueTypeId);
    },

    /**
     * Bulk add issue types to a project
     */
    bulkAddIssueTypesToProject: async (input: BulkAddIssueTypesToProjectSchema) => {
      // Verify project exists
      const project = await repository.findProjectById(input.projectId);
      if (!project) {
        throwNotFoundError('PROJECT_NOT_FOUND', { projectId: input.projectId });
      }

      // Get existing issue types
      const existingIssueTypes = await repository.findProjectIssueTypes(input.projectId);
      const existingIds = new Set(existingIssueTypes.map((it) => it.issueTypeId));

      // Filter out already existing ones
      const newIssueTypes = input.issueTypes.filter((it) => !existingIds.has(it.issueTypeId));

      if (newIssueTypes.length === 0) {
        return existingIssueTypes;
      }

      // Validate all workflows
      for (const it of newIssueTypes) {
        if (it.workflowId) {
          const workflow = await workflowRepo.findWorkflowById(it.workflowId);
          if (!workflow) {
            throwNotFoundError('WORKFLOW_NOT_FOUND', { workflowId: it.workflowId });
          }
        }
      }

      await repository.bulkAddIssueTypesToProject(input.projectId, newIssueTypes);

      return await repository.findProjectIssueTypes(input.projectId);
    },

    /**
     * Get the workflow for a specific issue type in a project
     * Returns the issue type's workflow or project's default workflow
     */
    getWorkflowForIssueType: async (projectId: string, issueTypeId: string) => {
      const projectIssueType = await repository.findProjectIssueType(projectId, issueTypeId);
      
      if (!projectIssueType) {
        throwNotFoundError('PROJECT_ISSUE_TYPE_NOT_FOUND', { projectId, issueTypeId });
      }

      // If issue type has a specific workflow, use it
      if (projectIssueType.workflow) {
        return projectIssueType.workflow;
      }

      // Otherwise, use project's default workflow
      const project = await repository.findProjectById(projectId);
      if (project?.defaultWorkflow) {
        return project.defaultWorkflow;
      }

      // If no workflow is set, get the system default
      return await workflowRepo.findDefaultWorkflow();
    },

    // =============================================================================
    // TEMPLATES
    // =============================================================================

    /**
     * Get all templates
     */
    getAllTemplates: () => repository.findAllTemplates(),

    /**
     * Get template issue types
     */
    getTemplateIssueTypes: async (templateId: string) => {
      const template = await repository.findTemplateById(templateId);
      if (!template) {
        throwNotFoundError('NOT_FOUND', { templateId });
      }
      return await repository.findTemplateIssueTypes(templateId);
    },

    /**
     * Create project from template
     */
    createProjectFromTemplate: async (templateId: string, projectData: CreateProjectSchema) => {
      const template = await repository.findTemplateById(templateId);
      if (!template) {
        throwNotFoundError('NOT_FOUND', { templateId });
      }

      // Create the project
      const project = await repository.createProject({
        ...projectData,
        defaultWorkflowId: projectData.defaultWorkflowId ?? template.defaultWorkflowId ?? undefined,
      });

      // Copy issue types from template
      const templateIssueTypes = await repository.findTemplateIssueTypes(templateId);
      if (templateIssueTypes.length > 0) {
        await repository.bulkAddIssueTypesToProject(
          project.id,
          templateIssueTypes.map((it) => ({
            issueTypeId: it.issueTypeId,
            workflowId: it.workflowId ?? undefined,
          })),
        );
      }

      return await repository.findProjectById(project.id);
    },
  };
};
