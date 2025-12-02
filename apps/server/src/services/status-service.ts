import { db } from '@/db';
import { statusRepository } from '@/repositories/status-repository';
import { workflowRepository } from '@/repositories/workflow-repository';
import { IssueRepository } from '@/repositories/issue-repository';
import type {
  CreateStatusSchema,
  UpdateStatusSchema,
  GetStatusByIdSchema,
  DeleteStatusSchema,
  CreateResolutionSchema,
  UpdateResolutionSchema,
  GetResolutionByIdSchema,
  DeleteResolutionSchema,
} from '@taskmaster/validation';
import { throwNotFoundError, throwValidationError, throwConflictError } from '@/lib/errors';
import type { DrizzleClientOrTransaction } from '@/lib/types/db';

/**
 * Status and Resolution management service
 * Handles CRUD operations for statuses and resolutions
 */
export class StatusService {
  private repository: ReturnType<typeof statusRepository>;
  private workflowRepo: ReturnType<typeof workflowRepository>;
  private issueRepository: IssueRepository;

  constructor(private drizzle: DrizzleClientOrTransaction = db) {
    this.repository = statusRepository(drizzle);
    this.workflowRepo = workflowRepository(drizzle);
    this.issueRepository = new IssueRepository();
  }

  // =============================================================================
  // STATUSES
  // =============================================================================

  /**
   * Get all statuses
   */
  getAllStatuses() {
    return this.repository.findAllStatuses();
  }

  /**
   * Get statuses by category
   */
  getStatusesByCategory(category: string) {
    return this.repository.findStatusesByCategory(category);
  }

  /**
   * Get a status by ID
   */
  async getStatusById(input: GetStatusByIdSchema) {
    const status = await this.repository.findStatusById(input.statusId);
    if (!status) {
      throwNotFoundError('STATUS_NOT_FOUND', { statusId: input.statusId });
    }
    return status;
  }

  /**
   * Create a new status
   */
  async createStatus(input: CreateStatusSchema) {
    // Check if status with same name exists
    const existing = await this.repository.findStatusByName(input.name);
    if (existing) {
      throwValidationError('STATUS_NAME_EXISTS', { name: input.name });
    }

    return await this.repository.createStatus(input);
  }

  /**
   * Update a status
   */
  async updateStatus(input: UpdateStatusSchema) {
    const existing = await this.repository.findStatusById(input.statusId);
    if (!existing) {
      throwNotFoundError('STATUS_NOT_FOUND', { statusId: input.statusId });
    }

    // System statuses can only have limited updates
    if (existing.isSystem) {
      // Only allow updating color and icon for system statuses
      if (input.name || input.category) {
        throwValidationError('CANNOT_MODIFY_SYSTEM_STATUS', { statusId: input.statusId });
      }
    }

    // Check if new name conflicts with existing
    if (input.name && input.name !== existing.name) {
      const nameExists = await this.repository.findStatusByName(input.name);
      if (nameExists) {
        throwValidationError('STATUS_NAME_EXISTS', { name: input.name });
      }
    }

    return await this.repository.updateStatus(input);
  }

  /**
   * Delete a status
   */
  async deleteStatus(input: DeleteStatusSchema) {
    const existing = await this.repository.findStatusById(input.statusId);
    if (!existing) {
      throwNotFoundError('STATUS_NOT_FOUND', { statusId: input.statusId });
    }

    // Cannot delete system statuses
    if (existing.isSystem) {
      throwValidationError('CANNOT_DELETE_SYSTEM_STATUS', { statusId: input.statusId });
    }

    // Check if status is in use by any issue
    const issueCount = await this.issueRepository.countByStatusId(input.statusId);
    if (issueCount > 0) {
      throwConflictError('STATUS_IN_USE', { 
        statusId: input.statusId, 
        issueCount,
        message: `Status is used by ${issueCount} issue(s)` 
      });
    }

    // Check if status is used in any workflow
    const workflowUsageCount = await this.workflowRepo.countStatusUsageInWorkflows(input.statusId);
    if (workflowUsageCount > 0) {
      throwConflictError('STATUS_IN_WORKFLOW', { 
        statusId: input.statusId, 
        workflowCount: workflowUsageCount,
        message: `Status is used in ${workflowUsageCount} workflow(s)` 
      });
    }

    return await this.repository.deleteStatus(input.statusId);
  }

  // =============================================================================
  // RESOLUTIONS
  // =============================================================================

  /**
   * Get all resolutions
   */
  getAllResolutions() {
    return this.repository.findAllResolutions();
  }

  /**
   * Get a resolution by ID
   */
  async getResolutionById(input: GetResolutionByIdSchema) {
    const resolution = await this.repository.findResolutionById(input.resolutionId);
    if (!resolution) {
      throwNotFoundError('RESOLUTION_NOT_FOUND', { resolutionId: input.resolutionId });
    }
    return resolution;
  }

  /**
   * Get default resolution
   */
  getDefaultResolution() {
    return this.repository.findDefaultResolution();
  }

  /**
   * Create a new resolution
   */
  async createResolution(input: CreateResolutionSchema) {
    // Check if resolution with same name exists
    const existing = await this.repository.findResolutionByName(input.name);
    if (existing) {
      throwValidationError('RESOLUTION_NAME_EXISTS', { name: input.name });
    }

    // If this is set as default, clear other defaults
    if (input.isDefault) {
      await this.repository.clearDefaultResolution();
    }

    return await this.repository.createResolution(input);
  }

  /**
   * Update a resolution
   */
  async updateResolution(input: UpdateResolutionSchema) {
    const existing = await this.repository.findResolutionById(input.resolutionId);
    if (!existing) {
      throwNotFoundError('RESOLUTION_NOT_FOUND', { resolutionId: input.resolutionId });
    }

    // System resolutions can only have limited updates
    if (existing.isSystem) {
      if (input.name) {
        throwValidationError('CANNOT_MODIFY_SYSTEM_RESOLUTION', { resolutionId: input.resolutionId });
      }
    }

    // Check if new name conflicts
    if (input.name && input.name !== existing.name) {
      const nameExists = await this.repository.findResolutionByName(input.name);
      if (nameExists) {
        throwValidationError('RESOLUTION_NAME_EXISTS', { name: input.name });
      }
    }

    // If setting as default, clear other defaults
    if (input.isDefault && !existing.isDefault) {
      await this.repository.clearDefaultResolution();
    }

    return await this.repository.updateResolution(input);
  }

  /**
   * Delete a resolution
   */
  async deleteResolution(input: DeleteResolutionSchema) {
    const existing = await this.repository.findResolutionById(input.resolutionId);
    if (!existing) {
      throwNotFoundError('RESOLUTION_NOT_FOUND', { resolutionId: input.resolutionId });
    }

    // Cannot delete system resolutions
    if (existing.isSystem) {
      throwValidationError('CANNOT_DELETE_SYSTEM_RESOLUTION', { resolutionId: input.resolutionId });
    }

    // Cannot delete default resolution
    if (existing.isDefault) {
      throwValidationError('CANNOT_DELETE_DEFAULT_RESOLUTION', { resolutionId: input.resolutionId });
    }

    // Check if resolution is in use by any issue
    const issueCount = await this.issueRepository.countByResolutionId(input.resolutionId);
    if (issueCount > 0) {
      throwConflictError('RESOLUTION_IN_USE', { 
        resolutionId: input.resolutionId, 
        issueCount,
        message: `Resolution is used by ${issueCount} issue(s)` 
      });
    }

    return await this.repository.deleteResolution(input.resolutionId);
  }
}

// Factory function for backward compatibility during migration
export const statusService = (drizzle: DrizzleClientOrTransaction = db) => {
  const service = new StatusService(drizzle);
  return {
    getAllStatuses: () => service.getAllStatuses(),
    getStatusesByCategory: (category: string) => service.getStatusesByCategory(category),
    getStatusById: (input: GetStatusByIdSchema) => service.getStatusById(input),
    createStatus: (input: CreateStatusSchema) => service.createStatus(input),
    updateStatus: (input: UpdateStatusSchema) => service.updateStatus(input),
    deleteStatus: (input: DeleteStatusSchema) => service.deleteStatus(input),
    getAllResolutions: () => service.getAllResolutions(),
    getResolutionById: (input: GetResolutionByIdSchema) => service.getResolutionById(input),
    getDefaultResolution: () => service.getDefaultResolution(),
    createResolution: (input: CreateResolutionSchema) => service.createResolution(input),
    updateResolution: (input: UpdateResolutionSchema) => service.updateResolution(input),
    deleteResolution: (input: DeleteResolutionSchema) => service.deleteResolution(input),
  };
};
