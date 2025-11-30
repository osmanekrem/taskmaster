// =============================================================================
// VERSION SERVICE
// =============================================================================

import { VersionRepository } from '../repositories/version-repository';
import { ProjectRepository } from '../repositories/project-repository';
import type { Version, NewVersion, VersionStatus } from '../db/schema';
import { TRPCError } from '@trpc/server';

export class VersionService {
  constructor(
    private versionRepository: VersionRepository,
    private projectRepository: ProjectRepository
  ) {}

  // ===========================================================================
  // VERSIONS
  // ===========================================================================

  async getVersionsByProjectId(projectId: string, includeArchived = false): Promise<Version[]> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    return this.versionRepository.findAllByProjectId(projectId, includeArchived);
  }

  async getVersionsWithCounts(projectId: string): Promise<Array<Version & { 
    fixIssueCount: number; 
    affectedIssueCount: number 
  }>> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    return this.versionRepository.findAllWithCounts(projectId);
  }

  async getVersionById(id: string): Promise<Version> {
    const version = await this.versionRepository.findById(id);
    if (!version) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Version not found',
      });
    }
    return version;
  }

  async getVersionsByStatus(projectId: string, status: VersionStatus): Promise<Version[]> {
    return this.versionRepository.findByStatus(projectId, status);
  }

  async createVersion(data: {
    projectId: string;
    name: string;
    description?: string;
    startDate?: string;
    releaseDate?: string;
  }): Promise<Version> {
    const project = await this.projectRepository.findById(data.projectId);
    if (!project) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    const existing = await this.versionRepository.findByNameAndProject(data.name, data.projectId);
    if (existing) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'A version with this name already exists in the project',
      });
    }

    return this.versionRepository.create({
      ...data,
      status: 'unreleased',
    });
  }

  async updateVersion(
    id: string,
    data: Partial<Pick<NewVersion, 'name' | 'description' | 'startDate' | 'releaseDate' | 'sortOrder'>>
  ): Promise<Version> {
    const version = await this.getVersionById(id);

    if (data.name && data.name !== version.name) {
      const existing = await this.versionRepository.findByNameAndProject(data.name, version.projectId);
      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A version with this name already exists in the project',
        });
      }
    }

    const updated = await this.versionRepository.update(id, data);
    if (!updated) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Version not found',
      });
    }

    return updated;
  }

  async releaseVersion(id: string, releaseDate?: string): Promise<Version> {
    const version = await this.getVersionById(id);
    
    if (version.status === 'released') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Version is already released',
      });
    }

    if (version.status === 'archived') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot release an archived version',
      });
    }

    const updated = await this.versionRepository.update(id, {
      status: 'released',
      releaseDate: releaseDate || new Date().toISOString().split('T')[0],
    });

    return updated!;
  }

  async unreleaseVersion(id: string): Promise<Version> {
    const version = await this.getVersionById(id);
    
    if (version.status !== 'released') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Version is not released',
      });
    }

    const updated = await this.versionRepository.update(id, {
      status: 'unreleased',
    });

    return updated!;
  }

  async archiveVersion(id: string): Promise<Version> {
    const version = await this.getVersionById(id);
    
    if (version.status === 'archived') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Version is already archived',
      });
    }

    const updated = await this.versionRepository.update(id, {
      status: 'archived',
    });

    return updated!;
  }

  async unarchiveVersion(id: string): Promise<Version> {
    const version = await this.getVersionById(id);
    
    if (version.status !== 'archived') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Version is not archived',
      });
    }

    const updated = await this.versionRepository.update(id, {
      status: 'unreleased',
    });

    return updated!;
  }

  async deleteVersion(id: string): Promise<void> {
    const version = await this.getVersionById(id);
    
    const fixCount = await this.versionRepository.countIssuesByFixVersion(id);
    const affectedCount = await this.versionRepository.countIssuesByAffectedVersion(id);
    
    if (fixCount > 0 || affectedCount > 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot delete version with associated issues (${fixCount} fix versions, ${affectedCount} affected versions). Remove issues from version first.`,
      });
    }

    const deleted = await this.versionRepository.delete(id);
    if (!deleted) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Version not found',
      });
    }
  }

  // ===========================================================================
  // FIX VERSIONS
  // ===========================================================================

  async getFixVersions(issueId: string): Promise<Version[]> {
    return this.versionRepository.findFixVersions(issueId);
  }

  async addFixVersion(issueId: string, versionId: string): Promise<void> {
    await this.getVersionById(versionId);

    try {
      await this.versionRepository.addFixVersion(issueId, versionId);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Fix version is already assigned to this issue',
        });
      }
      throw error;
    }
  }

  async removeFixVersion(issueId: string, versionId: string): Promise<void> {
    const removed = await this.versionRepository.removeFixVersion(issueId, versionId);
    if (!removed) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Fix version is not assigned to this issue',
      });
    }
  }

  async setFixVersions(issueId: string, versionIds: string[]): Promise<void> {
    for (const versionId of versionIds) {
      await this.getVersionById(versionId);
    }
    await this.versionRepository.setFixVersions(issueId, versionIds);
  }

  // ===========================================================================
  // AFFECTED VERSIONS
  // ===========================================================================

  async getAffectedVersions(issueId: string): Promise<Version[]> {
    return this.versionRepository.findAffectedVersions(issueId);
  }

  async addAffectedVersion(issueId: string, versionId: string): Promise<void> {
    await this.getVersionById(versionId);

    try {
      await this.versionRepository.addAffectedVersion(issueId, versionId);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Affected version is already assigned to this issue',
        });
      }
      throw error;
    }
  }

  async removeAffectedVersion(issueId: string, versionId: string): Promise<void> {
    const removed = await this.versionRepository.removeAffectedVersion(issueId, versionId);
    if (!removed) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Affected version is not assigned to this issue',
      });
    }
  }

  async setAffectedVersions(issueId: string, versionIds: string[]): Promise<void> {
    for (const versionId of versionIds) {
      await this.getVersionById(versionId);
    }
    await this.versionRepository.setAffectedVersions(issueId, versionIds);
  }

  // ===========================================================================
  // VERSION ISSUE QUERIES
  // ===========================================================================

  async getIssueIdsByFixVersion(versionId: string): Promise<string[]> {
    await this.getVersionById(versionId);
    return this.versionRepository.findIssueIdsByFixVersion(versionId);
  }
}
