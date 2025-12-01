// =============================================================================
// VERSIONS ROUTER
// =============================================================================

import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../lib/trpc';
import { VersionService } from '../services/version-service';
import { VersionRepository } from '../repositories/version-repository';
import { ProjectRepository } from '../repositories/project-repository';
import { db } from '../db';
import {
  requirePermission,
  requireProjectAccess,
  extractProjectId,
} from '../lib/middleware/permission';
import {
  versionStatusSchema,
  listVersionsSchema,
  versionProjectIdSchema,
  versionIdSchema,
  getVersionsByStatusSchema,
  createVersionSchema,
  updateVersionSchema,
  releaseVersionSchema,
  issueVersionIdSchema,
  issueVersionSchema,
  setIssueVersionsSchema,
  getIssuesByVersionSchema,
} from '@taskmaster/validation';

// Initialize dependencies
const versionRepository = new VersionRepository(db);
const projectRepository = new ProjectRepository(db);
const versionService = new VersionService(versionRepository, projectRepository);

export const versionsRouter = router({
  // ===========================================================================
  // VERSIONS
  // ===========================================================================

  /**
   * Get all versions for a project
   */
  list: protectedProcedure
    .input(listVersionsSchema)
    .use(requireProjectAccess(extractProjectId.fromProjectId))
    .query(async ({ input }) => {
      return versionService.getVersionsByProjectId(
        input.projectId,
        input.includeArchived,
      );
    }),

  /**
   * Get all versions for a project with issue counts
   */
  listWithCounts: protectedProcedure
    .input(versionProjectIdSchema)
    .use(requireProjectAccess(extractProjectId.fromProjectId))
    .query(async ({ input }) => {
      return versionService.getVersionsWithCounts(input.projectId);
    }),

  /**
   * Get version by ID
   */
  getById: protectedProcedure
    .input(versionIdSchema)
    .query(async ({ input }) => {
      return versionService.getVersionById(input.id);
    }),

  /**
   * Get versions by status
   */
  getByStatus: protectedProcedure
    .input(getVersionsByStatusSchema)
    .use(requireProjectAccess(extractProjectId.fromProjectId))
    .query(async ({ input }) => {
      return versionService.getVersionsByStatus(input.projectId, input.status);
    }),

  /**
   * Create a new version
   */
  create: protectedProcedure
    .input(createVersionSchema)
    .use(requirePermission('project:edit', extractProjectId.fromProjectId))
    .mutation(async ({ input }) => {
      return versionService.createVersion(input);
    }),

  /**
   * Update a version
   */
  update: protectedProcedure
    .input(updateVersionSchema)
    .use(requirePermission('project:edit'))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return versionService.updateVersion(id, data);
    }),

  /**
   * Release a version
   */
  release: protectedProcedure
    .input(releaseVersionSchema)
    .use(requirePermission('project:edit'))
    .mutation(async ({ input }) => {
      return versionService.releaseVersion(input.id, input.releaseDate);
    }),

  /**
   * Unrelease a version
   */
  unrelease: protectedProcedure
    .input(versionIdSchema)
    .use(requirePermission('project:edit'))
    .mutation(async ({ input }) => {
      return versionService.unreleaseVersion(input.id);
    }),

  /**
   * Archive a version
   */
  archive: protectedProcedure
    .input(versionIdSchema)
    .use(requirePermission('project:edit'))
    .mutation(async ({ input }) => {
      return versionService.archiveVersion(input.id);
    }),

  /**
   * Unarchive a version
   */
  unarchive: protectedProcedure
    .input(versionIdSchema)
    .use(requirePermission('project:edit'))
    .mutation(async ({ input }) => {
      return versionService.unarchiveVersion(input.id);
    }),

  /**
   * Delete a version
   */
  delete: protectedProcedure
    .input(versionIdSchema)
    .use(requirePermission('project:edit'))
    .mutation(async ({ input }) => {
      await versionService.deleteVersion(input.id);
      return { success: true };
    }),

  // ===========================================================================
  // FIX VERSIONS
  // ===========================================================================

  /**
   * Get fix versions for an issue
   */
  getFixVersions: protectedProcedure
    .input(issueVersionIdSchema)
    .use(requirePermission('issue:view'))
    .query(async ({ input }) => {
      return versionService.getFixVersions(input.issueId);
    }),

  /**
   * Add fix version to issue
   */
  addFixVersion: protectedProcedure
    .input(issueVersionSchema)
    .use(requirePermission('issue:edit'))
    .mutation(async ({ input }) => {
      await versionService.addFixVersion(input.issueId, input.versionId);
      return { success: true };
    }),

  /**
   * Remove fix version from issue
   */
  removeFixVersion: protectedProcedure
    .input(issueVersionSchema)
    .use(requirePermission('issue:edit'))
    .mutation(async ({ input }) => {
      await versionService.removeFixVersion(input.issueId, input.versionId);
      return { success: true };
    }),

  /**
   * Set all fix versions for an issue
   */
  setFixVersions: protectedProcedure
    .input(setIssueVersionsSchema)
    .use(requirePermission('issue:edit'))
    .mutation(async ({ input }) => {
      await versionService.setFixVersions(input.issueId, input.versionIds);
      return { success: true };
    }),

  // ===========================================================================
  // AFFECTED VERSIONS
  // ===========================================================================

  /**
   * Get affected versions for an issue
   */
  getAffectedVersions: protectedProcedure
    .input(issueVersionIdSchema)
    .use(requirePermission('issue:view'))
    .query(async ({ input }) => {
      return versionService.getAffectedVersions(input.issueId);
    }),

  /**
   * Add affected version to issue
   */
  addAffectedVersion: protectedProcedure
    .input(issueVersionSchema)
    .use(requirePermission('issue:edit'))
    .mutation(async ({ input }) => {
      await versionService.addAffectedVersion(input.issueId, input.versionId);
      return { success: true };
    }),

  /**
   * Remove affected version from issue
   */
  removeAffectedVersion: protectedProcedure
    .input(issueVersionSchema)
    .use(requirePermission('issue:edit'))
    .mutation(async ({ input }) => {
      await versionService.removeAffectedVersion(
        input.issueId,
        input.versionId,
      );
      return { success: true };
    }),

  /**
   * Set all affected versions for an issue
   */
  setAffectedVersions: protectedProcedure
    .input(setIssueVersionsSchema)
    .use(requirePermission('issue:edit'))
    .mutation(async ({ input }) => {
      await versionService.setAffectedVersions(input.issueId, input.versionIds);
      return { success: true };
    }),

  /**
   * Get issue IDs by fix version
   */
  getIssuesByFixVersion: protectedProcedure
    .input(z.object({ versionId: z.string().uuid() }))
    .use(requirePermission('issue:view'))
    .query(async ({ input }) => {
      return versionService.getIssueIdsByFixVersion(input.versionId);
    }),
});
