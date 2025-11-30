import { db } from '@/db';
import { statusRepository } from '@/repositories/status-repository';
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
import { throwNotFoundError, throwValidationError } from '@/lib/errors';
import type { DrizzleClientOrTransaction } from '@/lib/types/db';

export const statusService = (drizzle: DrizzleClientOrTransaction = db) => {
  const repository = statusRepository(drizzle);

  return {
    // =============================================================================
    // STATUSES
    // =============================================================================

    /**
     * Get all statuses
     */
    getAllStatuses: () => repository.findAllStatuses(),

    /**
     * Get statuses by category
     */
    getStatusesByCategory: (category: string) => repository.findStatusesByCategory(category),

    /**
     * Get a status by ID
     */
    getStatusById: async (input: GetStatusByIdSchema) => {
      const status = await repository.findStatusById(input.statusId);
      if (!status) {
        throwNotFoundError('STATUS_NOT_FOUND', { statusId: input.statusId });
      }
      return status;
    },

    /**
     * Create a new status
     */
    createStatus: async (input: CreateStatusSchema) => {
      // Check if status with same name exists
      const existing = await repository.findStatusByName(input.name);
      if (existing) {
        throwValidationError('STATUS_NAME_EXISTS', { name: input.name });
      }

      return await repository.createStatus(input);
    },

    /**
     * Update a status
     */
    updateStatus: async (input: UpdateStatusSchema) => {
      const existing = await repository.findStatusById(input.statusId);
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
        const nameExists = await repository.findStatusByName(input.name);
        if (nameExists) {
          throwValidationError('STATUS_NAME_EXISTS', { name: input.name });
        }
      }

      return await repository.updateStatus(input);
    },

    /**
     * Delete a status
     */
    deleteStatus: async (input: DeleteStatusSchema) => {
      const existing = await repository.findStatusById(input.statusId);
      if (!existing) {
        throwNotFoundError('STATUS_NOT_FOUND', { statusId: input.statusId });
      }

      // Cannot delete system statuses
      if (existing.isSystem) {
        throwValidationError('CANNOT_DELETE_SYSTEM_STATUS', { statusId: input.statusId });
      }

      // TODO: Check if status is in use by any workflow or issue
      // This will be implemented when we have issues

      return await repository.deleteStatus(input.statusId);
    },

    // =============================================================================
    // RESOLUTIONS
    // =============================================================================

    /**
     * Get all resolutions
     */
    getAllResolutions: () => repository.findAllResolutions(),

    /**
     * Get a resolution by ID
     */
    getResolutionById: async (input: GetResolutionByIdSchema) => {
      const resolution = await repository.findResolutionById(input.resolutionId);
      if (!resolution) {
        throwNotFoundError('RESOLUTION_NOT_FOUND', { resolutionId: input.resolutionId });
      }
      return resolution;
    },

    /**
     * Get default resolution
     */
    getDefaultResolution: () => repository.findDefaultResolution(),

    /**
     * Create a new resolution
     */
    createResolution: async (input: CreateResolutionSchema) => {
      // Check if resolution with same name exists
      const existing = await repository.findResolutionByName(input.name);
      if (existing) {
        throwValidationError('RESOLUTION_NAME_EXISTS', { name: input.name });
      }

      // If this is set as default, clear other defaults
      if (input.isDefault) {
        await repository.clearDefaultResolution();
      }

      return await repository.createResolution(input);
    },

    /**
     * Update a resolution
     */
    updateResolution: async (input: UpdateResolutionSchema) => {
      const existing = await repository.findResolutionById(input.resolutionId);
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
        const nameExists = await repository.findResolutionByName(input.name);
        if (nameExists) {
          throwValidationError('RESOLUTION_NAME_EXISTS', { name: input.name });
        }
      }

      // If setting as default, clear other defaults
      if (input.isDefault && !existing.isDefault) {
        await repository.clearDefaultResolution();
      }

      return await repository.updateResolution(input);
    },

    /**
     * Delete a resolution
     */
    deleteResolution: async (input: DeleteResolutionSchema) => {
      const existing = await repository.findResolutionById(input.resolutionId);
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

      // TODO: Check if resolution is in use by any issue

      return await repository.deleteResolution(input.resolutionId);
    },
  };
};
