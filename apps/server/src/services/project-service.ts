import { db } from '@/db';
import { projectRepository, ProjectRepository } from '@/repositories/project-repository';
import { workflowRepository, WorkflowRepository } from '@/repositories/workflow-repository';
import { issues } from '@/db/schema/issues';
import { eq, count } from 'drizzle-orm';
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
import type { DbOrTx } from '@/lib/transaction';

// =============================================================================
// PROJECT SERVICE CLASS
// =============================================================================

export class ProjectService {
  constructor(
    private drizzle: DbOrTx = db,
    private repository: ReturnType<typeof projectRepository> = projectRepository(db),
    private workflowRepo: ReturnType<typeof workflowRepository> = workflowRepository(db)
  ) {}

  // =============================================================================
  // PROJECTS
  // =============================================================================

  /**
   * Get all projects
   */
  getAllProjects(filters?: ListProjectsSchema) {
    return this.repository.findAllProjects(filters);
  }

  /**
   * Get a project by ID
   */
  async getProjectById(input: GetProjectByIdSchema) {
    const project = await this.repository.findProjectById(input.projectId);
    if (!project) {
      throwNotFoundError('PROJECT_NOT_FOUND', { projectId: input.projectId });
    }
    return project;
  }

  /**
   * Get a project by key
   */
  async getProjectByKey(input: GetProjectByKeySchema) {
    const project = await this.repository.findProjectByKey(input.key);
    if (!project) {
      throwNotFoundError('PROJECT_NOT_FOUND', { key: input.key });
    }
    return project;
  }

  /**
   * Create a new project
   */
  async createProject(input: CreateProjectSchema) {
    // Check if key exists
    const existingKey = await this.repository.findProjectByKey(input.key);
    if (existingKey) {
      throwValidationError('PROJECT_KEY_EXISTS', { key: input.key });
    }

    // Check if name exists
    const existingName = await this.repository.findProjectByName(input.name);
    if (existingName) {
      throwValidationError('PROJECT_NAME_EXISTS', { name: input.name });
    }

    // Validate workflow exists if provided
    if (input.defaultWorkflowId) {
      const workflow = await this.workflowRepo.findWorkflowById(
        input.defaultWorkflowId,
      );
      if (!workflow) {
        throwNotFoundError('WORKFLOW_NOT_FOUND', {
          workflowId: input.defaultWorkflowId,
        });
      }
    }

    return await this.repository.createProject(input);
  }

  /**
   * Update a project
   */
  async updateProject(input: UpdateProjectSchema) {
    const existing = await this.repository.findProjectById(input.projectId);
    if (!existing) {
      throwNotFoundError('PROJECT_NOT_FOUND', { projectId: input.projectId });
    }

    // Check if new key conflicts
    if (input.key && input.key.toUpperCase() !== existing.key) {
      const keyExists = await this.repository.findProjectByKey(input.key);
      if (keyExists) {
        throwValidationError('PROJECT_KEY_EXISTS', { key: input.key });
      }
    }

    // Check if new name conflicts
    if (input.name && input.name !== existing.name) {
      const nameExists = await this.repository.findProjectByName(input.name);
      if (nameExists) {
        throwValidationError('PROJECT_NAME_EXISTS', { name: input.name });
      }
    }

    // Validate workflow if changing
    if (
      input.defaultWorkflowId &&
      input.defaultWorkflowId !== existing.defaultWorkflowId
    ) {
      const workflow = await this.workflowRepo.findWorkflowById(
        input.defaultWorkflowId,
      );
      if (!workflow) {
        throwNotFoundError('WORKFLOW_NOT_FOUND', {
          workflowId: input.defaultWorkflowId,
        });
      }
    }

    return await this.repository.updateProject(input);
  }

  /**
   * Delete a project
   */
  async deleteProject(input: DeleteProjectSchema) {
    const existing = await this.repository.findProjectById(input.projectId);
    if (!existing) {
      throwNotFoundError('PROJECT_NOT_FOUND', { projectId: input.projectId });
    }

    // Cannot delete archived project
    if (existing.isArchived) {
      throwValidationError('CANNOT_DELETE_ARCHIVED_PROJECT', {
        projectId: input.projectId,
      });
    }

    // Check if project has issues
    const [issueCount] = await this.drizzle
      .select({ count: count() })
      .from(issues)
      .where(eq(issues.projectId, input.projectId));

    if (issueCount && issueCount.count > 0) {
      throwValidationError('PROJECT_HAS_ISSUES', {
        projectId: input.projectId,
        issueCount: issueCount.count,
        message: `Cannot delete project with ${issueCount.count} issue(s). Archive it instead or delete all issues first.`,
      });
    }

    return await this.repository.deleteProject(input.projectId);
  }

  /**
   * Archive/unarchive a project
   */
  async archiveProject(input: ArchiveProjectSchema) {
    const existing = await this.repository.findProjectById(input.projectId);
    if (!existing) {
      throwNotFoundError('PROJECT_NOT_FOUND', { projectId: input.projectId });
    }

    return await this.repository.archiveProject(input.projectId, input.isArchived);
  }

  /**
   * Update project settings
   */
  async updateProjectSettings(input: UpdateProjectSettingsSchema) {
    const existing = await this.repository.findProjectById(input.projectId);
    if (!existing) {
      throwNotFoundError('PROJECT_NOT_FOUND', { projectId: input.projectId });
    }

    // Merge new settings with existing
    const mergedSettings = {
      ...(existing.settings || {}),
      ...input.settings,
    };

    return await this.repository.updateProject({
      projectId: input.projectId,
      settings: mergedSettings,
    });
  }

  // =============================================================================
  // PROJECT ISSUE TYPES
  // =============================================================================

  /**
   * Get all issue types in a project
   */
  async getProjectIssueTypes(input: GetProjectIssueTypesSchema) {
    const project = await this.repository.findProjectById(input.projectId);
    if (!project) {
      throwNotFoundError('PROJECT_NOT_FOUND', { projectId: input.projectId });
    }

    return await this.repository.findProjectIssueTypes(input.projectId);
  }

  /**
   * Add an issue type to a project
   */
  async addIssueTypeToProject(input: AddIssueTypeToProjectSchema) {
    // Verify project exists
    const project = await this.repository.findProjectById(input.projectId);
    if (!project) {
      throwNotFoundError('PROJECT_NOT_FOUND', { projectId: input.projectId });
    }

    // Check if already added
    const existing = await this.repository.findProjectIssueType(
      input.projectId,
      input.issueTypeId,
    );
    if (existing) {
      throwValidationError('ISSUE_TYPE_ALREADY_IN_PROJECT', {
        projectId: input.projectId,
        issueTypeId: input.issueTypeId,
      });
    }

    // Validate workflow if provided
    if (input.workflowId) {
      const workflow = await this.workflowRepo.findWorkflowById(input.workflowId);
      if (!workflow) {
        throwNotFoundError('WORKFLOW_NOT_FOUND', {
          workflowId: input.workflowId,
        });
      }
    }

    return await this.repository.addIssueTypeToProject(input);
  }

  /**
   * Update workflow for an issue type in a project
   */
  async updateProjectIssueTypeWorkflow(input: UpdateProjectIssueTypeWorkflowSchema) {
    // Verify project issue type exists
    const existing = await this.repository.findProjectIssueType(
      input.projectId,
      input.issueTypeId,
    );
    if (!existing) {
      throwNotFoundError('PROJECT_ISSUE_TYPE_NOT_FOUND', {
        projectId: input.projectId,
        issueTypeId: input.issueTypeId,
      });
    }

    // Validate workflow if provided
    if (input.workflowId) {
      const workflow = await this.workflowRepo.findWorkflowById(input.workflowId);
      if (!workflow) {
        throwNotFoundError('WORKFLOW_NOT_FOUND', {
          workflowId: input.workflowId,
        });
      }
    }

    return await this.repository.updateProjectIssueTypeWorkflow(input);
  }

  /**
   * Remove an issue type from a project
   */
  async removeIssueTypeFromProject(input: RemoveIssueTypeFromProjectSchema) {
    // Verify project issue type exists
    const existing = await this.repository.findProjectIssueType(
      input.projectId,
      input.issueTypeId,
    );
    if (!existing) {
      throwNotFoundError('PROJECT_ISSUE_TYPE_NOT_FOUND', {
        projectId: input.projectId,
        issueTypeId: input.issueTypeId,
      });
    }

    return await this.repository.removeIssueTypeFromProject(
      input.projectId,
      input.issueTypeId,
    );
  }

  /**
   * Bulk add issue types to a project
   */
  async bulkAddIssueTypesToProject(input: BulkAddIssueTypesToProjectSchema) {
    // Verify project exists
    const project = await this.repository.findProjectById(input.projectId);
    if (!project) {
      throwNotFoundError('PROJECT_NOT_FOUND', { projectId: input.projectId });
    }

    // Get existing issue types
    const existingIssueTypes = await this.repository.findProjectIssueTypes(
      input.projectId,
    );
    const existingIds = new Set(
      existingIssueTypes.map((it) => it.issueTypeId),
    );

    // Filter out already existing ones
    const newIssueTypes = input.issueTypes.filter(
      (it) => !existingIds.has(it.issueTypeId),
    );

    if (newIssueTypes.length === 0) {
      return existingIssueTypes;
    }

    // Validate all workflows
    for (const it of newIssueTypes) {
      if (it.workflowId) {
        const workflow = await this.workflowRepo.findWorkflowById(it.workflowId);
        if (!workflow) {
          throwNotFoundError('WORKFLOW_NOT_FOUND', {
            workflowId: it.workflowId,
          });
        }
      }
    }

    await this.repository.bulkAddIssueTypesToProject(
      input.projectId,
      newIssueTypes,
    );

    return await this.repository.findProjectIssueTypes(input.projectId);
  }

  /**
   * Get the workflow for a specific issue type in a project
   */
  async getWorkflowForIssueType(projectId: string, issueTypeId: string) {
    const projectIssueType = await this.repository.findProjectIssueType(
      projectId,
      issueTypeId,
    );

    if (!projectIssueType) {
      throwNotFoundError('PROJECT_ISSUE_TYPE_NOT_FOUND', {
        projectId,
        issueTypeId,
      });
    }

    // If issue type has a specific workflow, use it
    if (projectIssueType.workflow) {
      return projectIssueType.workflow;
    }

    // Otherwise, use project's default workflow
    const project = await this.repository.findProjectById(projectId);
    if (project?.defaultWorkflow) {
      return project.defaultWorkflow;
    }

    // If no workflow is set, get the system default
    return await this.workflowRepo.findDefaultWorkflow();
  }

  // =============================================================================
  // TEMPLATES
  // =============================================================================

  /**
   * Get all templates
   */
  getAllTemplates() {
    return this.repository.findAllTemplates();
  }

  /**
   * Get template issue types
   */
  async getTemplateIssueTypes(templateId: string) {
    const template = await this.repository.findTemplateById(templateId);
    if (!template) {
      throwNotFoundError('NOT_FOUND', { templateId });
    }
    return await this.repository.findTemplateIssueTypes(templateId);
  }

  /**
   * Create project from template
   */
  async createProjectFromTemplate(
    templateId: string,
    projectData: CreateProjectSchema,
  ) {
    const template = await this.repository.findTemplateById(templateId);
    if (!template) {
      throwNotFoundError('NOT_FOUND', { templateId });
    }

    // Create the project
    const project = await this.repository.createProject({
      ...projectData,
      defaultWorkflowId:
        projectData.defaultWorkflowId ??
        template.defaultWorkflowId ??
        undefined,
    });

    // Copy issue types from template
    const templateIssueTypes = await this.repository.findTemplateIssueTypes(
      templateId,
    );
    if (templateIssueTypes.length > 0) {
      await this.repository.bulkAddIssueTypesToProject(
        project.id,
        templateIssueTypes.map((it) => ({
          issueTypeId: it.issueTypeId,
          workflowId: it.workflowId ?? undefined,
        })),
      );
    }

    return await this.repository.findProjectById(project.id);
  }
}

// =============================================================================
// BACKWARD-COMPATIBLE FACTORY FUNCTION
// =============================================================================

/**
 * @deprecated Use ProjectService class directly for new code
 */
export const projectService = (drizzle: DbOrTx = db) => {
  const service = new ProjectService(
    drizzle,
    projectRepository(drizzle),
    workflowRepository(drizzle)
  );
  
  return {
    getAllProjects: service.getAllProjects.bind(service),
    getProjectById: service.getProjectById.bind(service),
    getProjectByKey: service.getProjectByKey.bind(service),
    createProject: service.createProject.bind(service),
    updateProject: service.updateProject.bind(service),
    deleteProject: service.deleteProject.bind(service),
    archiveProject: service.archiveProject.bind(service),
    updateProjectSettings: service.updateProjectSettings.bind(service),
    getProjectIssueTypes: service.getProjectIssueTypes.bind(service),
    addIssueTypeToProject: service.addIssueTypeToProject.bind(service),
    updateProjectIssueTypeWorkflow: service.updateProjectIssueTypeWorkflow.bind(service),
    removeIssueTypeFromProject: service.removeIssueTypeFromProject.bind(service),
    bulkAddIssueTypesToProject: service.bulkAddIssueTypesToProject.bind(service),
    getWorkflowForIssueType: service.getWorkflowForIssueType.bind(service),
    getAllTemplates: service.getAllTemplates.bind(service),
    getTemplateIssueTypes: service.getTemplateIssueTypes.bind(service),
    createProjectFromTemplate: service.createProjectFromTemplate.bind(service),
  };
};
