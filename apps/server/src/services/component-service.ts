// =============================================================================
// COMPONENT SERVICE
// =============================================================================

import { ComponentRepository } from '../repositories/component-repository';
import { ProjectRepository } from '../repositories/project-repository';
import type { Component, NewComponent } from '../db/schema';
import { TRPCError } from '@trpc/server';

export class ComponentService {
  constructor(
    private componentRepository: ComponentRepository,
    private projectRepository: ProjectRepository
  ) {}

  // ===========================================================================
  // COMPONENTS
  // ===========================================================================

  async getComponentsByProjectId(projectId: string): Promise<Component[]> {
    // Verify project exists
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    return this.componentRepository.findAllByProjectId(projectId);
  }

  async getComponentsWithCounts(projectId: string): Promise<Array<Component & { issueCount: number }>> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    return this.componentRepository.findAllWithCounts(projectId);
  }

  async getComponentById(id: string): Promise<Component> {
    const component = await this.componentRepository.findById(id);
    if (!component) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Component not found',
      });
    }
    return component;
  }

  async createComponent(data: {
    projectId: string;
    name: string;
    description?: string;
    leadId?: string;
    defaultAssigneeId?: string;
  }): Promise<Component> {
    // Verify project exists
    const project = await this.projectRepository.findById(data.projectId);
    if (!project) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project not found',
      });
    }

    // Check for duplicate name
    const existing = await this.componentRepository.findByNameAndProject(data.name, data.projectId);
    if (existing) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'A component with this name already exists in the project',
      });
    }

    return this.componentRepository.create(data);
  }

  async updateComponent(
    id: string,
    data: Partial<Pick<NewComponent, 'name' | 'description' | 'leadId' | 'defaultAssigneeId'>>
  ): Promise<Component> {
    const component = await this.getComponentById(id);

    // Check for duplicate name
    if (data.name && data.name !== component.name) {
      const existing = await this.componentRepository.findByNameAndProject(data.name, component.projectId);
      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A component with this name already exists in the project',
        });
      }
    }

    const updated = await this.componentRepository.update(id, data);
    if (!updated) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Component not found',
      });
    }

    return updated;
  }

  async deleteComponent(id: string): Promise<void> {
    const component = await this.getComponentById(id);
    
    // Check if component has issues
    const issueCount = await this.componentRepository.countIssuesByComponentId(id);
    if (issueCount > 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Cannot delete component with ${issueCount} associated issues. Remove issues from component first.`,
      });
    }

    const deleted = await this.componentRepository.delete(id);
    if (!deleted) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Component not found',
      });
    }
  }

  // ===========================================================================
  // ISSUE COMPONENTS
  // ===========================================================================

  async getIssueComponents(issueId: string): Promise<Component[]> {
    return this.componentRepository.findIssueComponents(issueId);
  }

  async addComponentToIssue(issueId: string, componentId: string): Promise<void> {
    // Verify component exists
    await this.getComponentById(componentId);

    try {
      await this.componentRepository.addIssueComponent(issueId, componentId);
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Component is already assigned to this issue',
        });
      }
      throw error;
    }
  }

  async removeComponentFromIssue(issueId: string, componentId: string): Promise<void> {
    const removed = await this.componentRepository.removeIssueComponent(issueId, componentId);
    if (!removed) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Component is not assigned to this issue',
      });
    }
  }

  async setIssueComponents(issueId: string, componentIds: string[]): Promise<void> {
    // Verify all components exist
    for (const componentId of componentIds) {
      await this.getComponentById(componentId);
    }

    await this.componentRepository.setIssueComponents(issueId, componentIds);
  }

  async getComponentLeadComponents(leadId: string): Promise<Component[]> {
    return this.componentRepository.findByLeadId(leadId);
  }
}
