// =============================================================================
// COMPONENT REPOSITORY
// =============================================================================

import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { db } from '../db';
import { 
  components, 
  issueComponents,
  type Component, 
  type NewComponent,
  type IssueComponent,
  type NewIssueComponent 
} from '../db/schema';

type DbType = typeof db;

export class ComponentRepository {
  constructor(private db: DbType) {}

  // ===========================================================================
  // COMPONENTS
  // ===========================================================================

  async findAllByProjectId(projectId: string): Promise<Component[]> {
    return this.db
      .select()
      .from(components)
      .where(eq(components.projectId, projectId))
      .orderBy(components.name);
  }

  async findById(id: string): Promise<Component | null> {
    const result = await this.db
      .select()
      .from(components)
      .where(eq(components.id, id))
      .limit(1);
    
    return result[0] ?? null;
  }

  async findByNameAndProject(name: string, projectId: string): Promise<Component | null> {
    const result = await this.db
      .select()
      .from(components)
      .where(
        and(
          eq(components.name, name),
          eq(components.projectId, projectId)
        )
      )
      .limit(1);
    
    return result[0] ?? null;
  }

  async create(data: NewComponent): Promise<Component> {
    const [component] = await this.db
      .insert(components)
      .values(data)
      .returning();
    
    return component;
  }

  async update(id: string, data: Partial<NewComponent>): Promise<Component | null> {
    const [component] = await this.db
      .update(components)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(components.id, id))
      .returning();
    
    return component ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(components)
      .where(eq(components.id, id))
      .returning({ id: components.id });
    
    return result.length > 0;
  }

  async countByProjectId(projectId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(components)
      .where(eq(components.projectId, projectId));
    
    return result[0]?.count ?? 0;
  }

  async findByLeadId(leadId: string): Promise<Component[]> {
    return this.db
      .select()
      .from(components)
      .where(eq(components.leadId, leadId))
      .orderBy(components.name);
  }

  // ===========================================================================
  // ISSUE COMPONENTS
  // ===========================================================================

  async findIssueComponents(issueId: string): Promise<Component[]> {
    const result = await this.db
      .select({
        component: components,
      })
      .from(issueComponents)
      .innerJoin(components, eq(issueComponents.componentId, components.id))
      .where(eq(issueComponents.issueId, issueId))
      .orderBy(components.name);

    return result.map(r => r.component);
  }

  async addIssueComponent(issueId: string, componentId: string): Promise<IssueComponent> {
    const [result] = await this.db
      .insert(issueComponents)
      .values({ issueId, componentId })
      .returning();
    
    return result;
  }

  async removeIssueComponent(issueId: string, componentId: string): Promise<boolean> {
    const result = await this.db
      .delete(issueComponents)
      .where(
        and(
          eq(issueComponents.issueId, issueId),
          eq(issueComponents.componentId, componentId)
        )
      )
      .returning({ id: issueComponents.id });
    
    return result.length > 0;
  }

  async setIssueComponents(issueId: string, componentIds: string[]): Promise<void> {
    // Delete all existing components for issue
    await this.db
      .delete(issueComponents)
      .where(eq(issueComponents.issueId, issueId));

    // Add new components
    if (componentIds.length > 0) {
      await this.db
        .insert(issueComponents)
        .values(componentIds.map(componentId => ({ issueId, componentId })));
    }
  }

  async findIssueIdsByComponentId(componentId: string): Promise<string[]> {
    const result = await this.db
      .select({ issueId: issueComponents.issueId })
      .from(issueComponents)
      .where(eq(issueComponents.componentId, componentId));
    
    return result.map(r => r.issueId);
  }

  async countIssuesByComponentId(componentId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(issueComponents)
      .where(eq(issueComponents.componentId, componentId));
    
    return result[0]?.count ?? 0;
  }

  /**
   * Get components with issue counts for a project
   */
  async findAllWithCounts(projectId: string): Promise<Array<Component & { issueCount: number }>> {
    const result = await this.db
      .select({
        component: components,
        issueCount: sql<number>`count(${issueComponents.id})::int`,
      })
      .from(components)
      .leftJoin(issueComponents, eq(components.id, issueComponents.componentId))
      .where(eq(components.projectId, projectId))
      .groupBy(components.id)
      .orderBy(components.name);

    return result.map(r => ({ ...r.component, issueCount: r.issueCount }));
  }
}
