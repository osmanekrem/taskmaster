// =============================================================================
// ISSUE LINK REPOSITORY
// =============================================================================

import { eq, and, or, desc, sql, inArray } from 'drizzle-orm';
import { db } from '../db';
import {
  issueLinks,
  issueLinkTypes,
  type IssueLink,
  type NewIssueLink,
  type IssueLinkType,
  type NewIssueLinkType,
} from '../db/schema';

type DbType = typeof db;

export class IssueLinkRepository {
  constructor(private db: DbType) {}

  // ===========================================================================
  // LINK TYPES
  // ===========================================================================

  async findAllLinkTypes(): Promise<IssueLinkType[]> {
    return this.db.select().from(issueLinkTypes).orderBy(issueLinkTypes.name);
  }

  async findLinkTypeById(id: string): Promise<IssueLinkType | null> {
    const result = await this.db
      .select()
      .from(issueLinkTypes)
      .where(eq(issueLinkTypes.id, id))
      .limit(1);

    return result[0] ?? null;
  }

  async findLinkTypeByName(name: string): Promise<IssueLinkType | null> {
    const result = await this.db
      .select()
      .from(issueLinkTypes)
      .where(eq(issueLinkTypes.name, name))
      .limit(1);

    return result[0] ?? null;
  }

  async createLinkType(data: NewIssueLinkType): Promise<IssueLinkType> {
    const [linkType] = await this.db
      .insert(issueLinkTypes)
      .values(data)
      .returning();

    return linkType;
  }

  async updateLinkType(
    id: string,
    data: Partial<
      Pick<
        NewIssueLinkType,
        'name' | 'inwardName' | 'outwardName' | 'description'
      >
    >,
  ): Promise<IssueLinkType | null> {
    const [linkType] = await this.db
      .update(issueLinkTypes)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(issueLinkTypes.id, id))
      .returning();

    return linkType ?? null;
  }

  async deleteLinkType(id: string): Promise<boolean> {
    // Check if it's a system link type
    const linkType = await this.findLinkTypeById(id);
    if (linkType?.isSystem === true) {
      throw new Error('Cannot delete system link type');
    }

    const result = await this.db
      .delete(issueLinkTypes)
      .where(eq(issueLinkTypes.id, id))
      .returning({ id: issueLinkTypes.id });

    return result.length > 0;
  }

  // ===========================================================================
  // ISSUE LINKS
  // ===========================================================================

  async findLinkById(id: string): Promise<IssueLink | null> {
    const result = await this.db
      .select()
      .from(issueLinks)
      .where(eq(issueLinks.id, id))
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Get all links for an issue (both inward and outward)
   */
  async findLinksByIssueId(issueId: string): Promise<{
    outwardLinks: Array<IssueLink & { linkType: IssueLinkType }>;
    inwardLinks: Array<IssueLink & { linkType: IssueLinkType }>;
  }> {
    const outward = await this.db
      .select({
        link: issueLinks,
        linkType: issueLinkTypes,
      })
      .from(issueLinks)
      .innerJoin(issueLinkTypes, eq(issueLinks.linkTypeId, issueLinkTypes.id))
      .where(eq(issueLinks.sourceIssueId, issueId))
      .orderBy(desc(issueLinks.createdAt));

    const inward = await this.db
      .select({
        link: issueLinks,
        linkType: issueLinkTypes,
      })
      .from(issueLinks)
      .innerJoin(issueLinkTypes, eq(issueLinks.linkTypeId, issueLinkTypes.id))
      .where(eq(issueLinks.targetIssueId, issueId))
      .orderBy(desc(issueLinks.createdAt));

    return {
      outwardLinks: outward.map((r: (typeof outward)[number]) => ({
        ...r.link,
        linkType: r.linkType,
      })),
      inwardLinks: inward.map((r: (typeof inward)[number]) => ({
        ...r.link,
        linkType: r.linkType,
      })),
    };
  }

  /**
   * Get all links of a specific type for an issue
   */
  async findLinksByTypeAndIssue(
    issueId: string,
    linkTypeId: string,
    direction: 'outward' | 'inward' | 'both' = 'both',
  ): Promise<IssueLink[]> {
    const conditions = [eq(issueLinks.linkTypeId, linkTypeId)];

    if (direction === 'outward') {
      conditions.push(eq(issueLinks.sourceIssueId, issueId));
    } else if (direction === 'inward') {
      conditions.push(eq(issueLinks.targetIssueId, issueId));
    } else {
      conditions.push(
        or(
          eq(issueLinks.sourceIssueId, issueId),
          eq(issueLinks.targetIssueId, issueId),
        )!,
      );
    }

    return this.db
      .select()
      .from(issueLinks)
      .where(and(...conditions));
  }

  /**
   * Get blocking issues for an issue
   */
  async findBlockingIssues(issueId: string): Promise<IssueLink[]> {
    const blocksType = await this.findLinkTypeByName('Blocks');
    if (!blocksType) return [];

    return this.db
      .select()
      .from(issueLinks)
      .where(
        and(
          eq(issueLinks.targetIssueId, issueId),
          eq(issueLinks.linkTypeId, blocksType.id),
        ),
      );
  }

  /**
   * Get issues blocked by this issue
   */
  async findBlockedIssues(issueId: string): Promise<IssueLink[]> {
    const blocksType = await this.findLinkTypeByName('Blocks');
    if (!blocksType) return [];

    return this.db
      .select()
      .from(issueLinks)
      .where(
        and(
          eq(issueLinks.sourceIssueId, issueId),
          eq(issueLinks.linkTypeId, blocksType.id),
        ),
      );
  }

  /**
   * Create a link between two issues
   */
  async createLink(data: NewIssueLink): Promise<IssueLink> {
    // Validate source and target are different
    if (data.sourceIssueId === data.targetIssueId) {
      throw new Error('Cannot link an issue to itself');
    }

    // Check for existing link
    const existing = await this.findExistingLink(
      data.sourceIssueId,
      data.targetIssueId,
      data.linkTypeId,
    );

    if (existing) {
      throw new Error('Link already exists between these issues');
    }

    const [link] = await this.db.insert(issueLinks).values(data).returning();

    return link;
  }

  /**
   * Check if a link already exists
   */
  async findExistingLink(
    sourceIssueId: string,
    targetIssueId: string,
    linkTypeId: string,
  ): Promise<IssueLink | null> {
    const result = await this.db
      .select()
      .from(issueLinks)
      .where(
        and(
          eq(issueLinks.sourceIssueId, sourceIssueId),
          eq(issueLinks.targetIssueId, targetIssueId),
          eq(issueLinks.linkTypeId, linkTypeId),
        ),
      )
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Delete a link
   */
  async deleteLink(id: string): Promise<boolean> {
    const result = await this.db
      .delete(issueLinks)
      .where(eq(issueLinks.id, id))
      .returning({ id: issueLinks.id });

    return result.length > 0;
  }

  /**
   * Delete all links for an issue (called when issue is deleted)
   */
  async deleteLinksByIssueId(issueId: string): Promise<number> {
    const result = await this.db
      .delete(issueLinks)
      .where(
        or(
          eq(issueLinks.sourceIssueId, issueId),
          eq(issueLinks.targetIssueId, issueId),
        ),
      )
      .returning({ id: issueLinks.id });

    return result.length;
  }

  /**
   * Get linked issue IDs for multiple issues (for bulk operations)
   */
  async findLinkedIssueIds(
    issueIds: string[],
  ): Promise<Map<string, Set<string>>> {
    if (issueIds.length === 0) return new Map();

    const links = await this.db
      .select()
      .from(issueLinks)
      .where(
        or(
          inArray(issueLinks.sourceIssueId, issueIds),
          inArray(issueLinks.targetIssueId, issueIds),
        ),
      );

    const result = new Map<string, Set<string>>();

    for (const issueId of issueIds) {
      result.set(issueId, new Set());
    }

    for (const link of links) {
      if (result.has(link.sourceIssueId)) {
        result.get(link.sourceIssueId)!.add(link.targetIssueId);
      }
      if (result.has(link.targetIssueId)) {
        result.get(link.targetIssueId)!.add(link.sourceIssueId);
      }
    }

    return result;
  }

  /**
   * Count links by type
   */
  async countLinksByType(): Promise<
    Array<{ linkTypeId: string; linkTypeName: string; count: number }>
  > {
    const result = await this.db
      .select({
        linkTypeId: issueLinkTypes.id,
        linkTypeName: issueLinkTypes.name,
        count: sql<number>`count(${issueLinks.id})::int`,
      })
      .from(issueLinkTypes)
      .leftJoin(issueLinks, eq(issueLinks.linkTypeId, issueLinkTypes.id))
      .groupBy(issueLinkTypes.id, issueLinkTypes.name)
      .orderBy(issueLinkTypes.name);

    return result;
  }
}
