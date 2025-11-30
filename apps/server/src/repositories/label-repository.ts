// =============================================================================
// LABEL REPOSITORY
// =============================================================================

import { eq, and, or, isNull, sql, ilike, inArray } from 'drizzle-orm';
import { db } from '../db';
import { 
  labels, 
  issueLabels,
  type Label, 
  type NewLabel,
} from '../db/schema';

type DbType = typeof db;

export class LabelRepository {
  constructor(private db: DbType) {}

  // ===========================================================================
  // LABELS
  // ===========================================================================

  /**
   * Get all labels for a project (including global labels)
   */
  async findAllByProjectId(projectId: string): Promise<Label[]> {
    return this.db
      .select()
      .from(labels)
      .where(
        or(
          eq(labels.projectId, projectId),
          isNull(labels.projectId)
        )
      )
      .orderBy(labels.name);
  }

  /**
   * Get only project-specific labels
   */
  async findProjectLabels(projectId: string): Promise<Label[]> {
    return this.db
      .select()
      .from(labels)
      .where(eq(labels.projectId, projectId))
      .orderBy(labels.name);
  }

  /**
   * Get global labels only
   */
  async findGlobalLabels(): Promise<Label[]> {
    return this.db
      .select()
      .from(labels)
      .where(isNull(labels.projectId))
      .orderBy(labels.name);
  }

  async findById(id: string): Promise<Label | null> {
    const result = await this.db
      .select()
      .from(labels)
      .where(eq(labels.id, id))
      .limit(1);
    
    return result[0] ?? null;
  }

  async findByName(name: string, projectId: string | null): Promise<Label | null> {
    const conditions = [eq(labels.name, name)];
    
    if (projectId) {
      conditions.push(
        or(
          eq(labels.projectId, projectId),
          isNull(labels.projectId)
        )!
      );
    } else {
      conditions.push(isNull(labels.projectId));
    }

    const result = await this.db
      .select()
      .from(labels)
      .where(and(...conditions))
      .limit(1);
    
    return result[0] ?? null;
  }

  async search(query: string, projectId?: string, limit = 10): Promise<Label[]> {
    const conditions = [ilike(labels.name, `%${query}%`)];
    
    if (projectId) {
      conditions.push(
        or(
          eq(labels.projectId, projectId),
          isNull(labels.projectId)
        )!
      );
    }

    return this.db
      .select()
      .from(labels)
      .where(and(...conditions))
      .orderBy(labels.name)
      .limit(limit);
  }

  async create(data: NewLabel): Promise<Label> {
    const [label] = await this.db
      .insert(labels)
      .values(data)
      .returning();
    
    return label;
  }

  async update(id: string, data: Partial<NewLabel>): Promise<Label | null> {
    const [label] = await this.db
      .update(labels)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(labels.id, id))
      .returning();
    
    return label ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(labels)
      .where(eq(labels.id, id))
      .returning({ id: labels.id });
    
    return result.length > 0;
  }

  // ===========================================================================
  // ISSUE LABELS
  // ===========================================================================

  async findIssueLabels(issueId: string): Promise<Label[]> {
    const result = await this.db
      .select({ label: labels })
      .from(issueLabels)
      .innerJoin(labels, eq(issueLabels.labelId, labels.id))
      .where(eq(issueLabels.issueId, issueId))
      .orderBy(labels.name);

    return result.map(r => r.label);
  }

  async addIssueLabel(issueId: string, labelId: string): Promise<void> {
    await this.db
      .insert(issueLabels)
      .values({ issueId, labelId });
  }

  async removeIssueLabel(issueId: string, labelId: string): Promise<boolean> {
    const result = await this.db
      .delete(issueLabels)
      .where(
        and(
          eq(issueLabels.issueId, issueId),
          eq(issueLabels.labelId, labelId)
        )
      )
      .returning({ id: issueLabels.id });
    
    return result.length > 0;
  }

  async setIssueLabels(issueId: string, labelIds: string[]): Promise<void> {
    await this.db
      .delete(issueLabels)
      .where(eq(issueLabels.issueId, issueId));

    if (labelIds.length > 0) {
      await this.db
        .insert(issueLabels)
        .values(labelIds.map(labelId => ({ issueId, labelId })));
    }
  }

  async countIssuesByLabelId(labelId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(issueLabels)
      .where(eq(issueLabels.labelId, labelId));
    
    return result[0]?.count ?? 0;
  }

  async findIssueIdsByLabelId(labelId: string): Promise<string[]> {
    const result = await this.db
      .select({ issueId: issueLabels.issueId })
      .from(issueLabels)
      .where(eq(issueLabels.labelId, labelId));
    
    return result.map(r => r.issueId);
  }

  /**
   * Get labels with issue counts for a project
   */
  async findAllWithCounts(projectId: string): Promise<Array<Label & { issueCount: number }>> {
    const allLabels = await this.findAllByProjectId(projectId);
    
    const result = await Promise.all(
      allLabels.map(async (label) => {
        const count = await this.countIssuesByLabelId(label.id);
        return { ...label, issueCount: count };
      })
    );

    return result;
  }

  /**
   * Bulk create labels for a project
   */
  async bulkCreate(data: NewLabel[]): Promise<Label[]> {
    if (data.length === 0) return [];
    
    return this.db
      .insert(labels)
      .values(data)
      .returning();
  }

  /**
   * Get most used labels for a project
   */
  async findMostUsed(projectId: string, limit = 10): Promise<Array<Label & { issueCount: number }>> {
    const allWithCounts = await this.findAllWithCounts(projectId);
    return allWithCounts
      .sort((a, b) => b.issueCount - a.issueCount)
      .slice(0, limit);
  }
}
