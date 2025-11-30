// =============================================================================
// LABEL SERVICE
// =============================================================================

import { LabelRepository } from '../repositories/label-repository';
import { ProjectRepository } from '../repositories/project-repository';
import type { Label, NewLabel } from '../db/schema';
import { DEFAULT_LABELS } from '../db/schema/labels';
import { TRPCError } from '@trpc/server';

export class LabelService {
  constructor(
    private labelRepository: LabelRepository,
    private projectRepository: ProjectRepository
  ) {}

  // ===========================================================================
  // LABELS
  // ===========================================================================

  async getLabelsByProjectId(projectId: string): Promise<Label[]> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    return this.labelRepository.findAllByProjectId(projectId);
  }

  async getLabelsWithCounts(projectId: string): Promise<Array<Label & { issueCount: number }>> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    return this.labelRepository.findAllWithCounts(projectId);
  }

  async getGlobalLabels(): Promise<Label[]> {
    return this.labelRepository.findGlobalLabels();
  }

  async getLabelById(id: string): Promise<Label> {
    const label = await this.labelRepository.findById(id);
    if (!label) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Label not found',
      });
    }
    return label;
  }

  async searchLabels(query: string, projectId?: string): Promise<Label[]> {
    return this.labelRepository.search(query, projectId);
  }

  async createLabel(data: {
    name: string;
    color?: string;
    description?: string;
    projectId?: string;
  }): Promise<Label> {
    // If project-specific, verify project exists
    if (data.projectId) {
      const project = await this.projectRepository.findById(data.projectId);
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }
    }

    // Check for duplicate name
    const existing = await this.labelRepository.findByName(data.name, data.projectId ?? null);
    if (existing) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'A label with this name already exists',
      });
    }

    return this.labelRepository.create({
      ...data,
      color: data.color || '#6B7280',
    });
  }

  async updateLabel(
    id: string,
    data: Partial<Pick<NewLabel, 'name' | 'color' | 'description'>>
  ): Promise<Label> {
    const label = await this.getLabelById(id);

    // Check for duplicate name
    if (data.name && data.name !== label.name) {
      const existing = await this.labelRepository.findByName(data.name, label.projectId);
      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A label with this name already exists',
        });
      }
    }

    const updated = await this.labelRepository.update(id, data);
    if (!updated) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Label not found',
      });
    }

    return updated;
  }

  async deleteLabel(id: string): Promise<void> {
    await this.getLabelById(id);

    const issueCount = await this.labelRepository.countIssuesByLabelId(id);
    if (issueCount > 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot delete label with ${issueCount} associated issues. Remove label from issues first.`,
      });
    }

    const deleted = await this.labelRepository.delete(id);
    if (!deleted) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Label not found',
      });
    }
  }

  /**
   * Create default labels for a project
   */
  async createDefaultLabels(projectId: string): Promise<Label[]> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    const labelsToCreate = DEFAULT_LABELS.map(label => ({
      ...label,
      projectId,
    }));

    return this.labelRepository.bulkCreate(labelsToCreate);
  }

  // ===========================================================================
  // ISSUE LABELS
  // ===========================================================================

  async getIssueLabels(issueId: string): Promise<Label[]> {
    return this.labelRepository.findIssueLabels(issueId);
  }

  async addLabelToIssue(issueId: string, labelId: string): Promise<void> {
    await this.getLabelById(labelId);

    try {
      await this.labelRepository.addIssueLabel(issueId, labelId);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Label is already assigned to this issue',
        });
      }
      throw error;
    }
  }

  async removeLabelFromIssue(issueId: string, labelId: string): Promise<void> {
    const removed = await this.labelRepository.removeIssueLabel(issueId, labelId);
    if (!removed) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Label is not assigned to this issue',
      });
    }
  }

  async setIssueLabels(issueId: string, labelIds: string[]): Promise<void> {
    // Verify all labels exist
    for (const labelId of labelIds) {
      await this.getLabelById(labelId);
    }

    await this.labelRepository.setIssueLabels(issueId, labelIds);
  }

  async getIssueIdsByLabel(labelId: string): Promise<string[]> {
    await this.getLabelById(labelId);
    return this.labelRepository.findIssueIdsByLabelId(labelId);
  }

  async getMostUsedLabels(projectId: string, limit = 10): Promise<Array<Label & { issueCount: number }>> {
    return this.labelRepository.findMostUsed(projectId, limit);
  }
}
