// =============================================================================
// VERSION REPOSITORY
// =============================================================================

import { eq, and, desc, asc, sql, inArray } from 'drizzle-orm';
import { db } from '../db';
import { 
  versions, 
  issueFixVersions,
  issueAffectedVersions,
  type Version, 
  type NewVersion,
  type VersionStatus
} from '../db/schema';

type DbType = typeof db;

export class VersionRepository {
  constructor(private db: DbType) {}

  // ===========================================================================
  // VERSIONS
  // ===========================================================================

  async findAllByProjectId(projectId: string, includeArchived = false): Promise<Version[]> {
    const query = this.db
      .select()
      .from(versions)
      .where(eq(versions.projectId, projectId))
      .orderBy(asc(versions.sortOrder), asc(versions.name));

    if (!includeArchived) {
      return this.db
        .select()
        .from(versions)
        .where(
          and(
            eq(versions.projectId, projectId),
            sql`${versions.status} != 'archived'`
          )
        )
        .orderBy(asc(versions.sortOrder), asc(versions.name));
    }

    return query;
  }

  async findById(id: string): Promise<Version | null> {
    const result = await this.db
      .select()
      .from(versions)
      .where(eq(versions.id, id))
      .limit(1);
    
    return result[0] ?? null;
  }

  async findByNameAndProject(name: string, projectId: string): Promise<Version | null> {
    const result = await this.db
      .select()
      .from(versions)
      .where(
        and(
          eq(versions.name, name),
          eq(versions.projectId, projectId)
        )
      )
      .limit(1);
    
    return result[0] ?? null;
  }

  async findByStatus(projectId: string, status: VersionStatus): Promise<Version[]> {
    return this.db
      .select()
      .from(versions)
      .where(
        and(
          eq(versions.projectId, projectId),
          eq(versions.status, status)
        )
      )
      .orderBy(asc(versions.sortOrder), asc(versions.name));
  }

  async create(data: NewVersion): Promise<Version> {
    const [version] = await this.db
      .insert(versions)
      .values(data)
      .returning();
    
    return version;
  }

  async update(id: string, data: Partial<NewVersion>): Promise<Version | null> {
    const [version] = await this.db
      .update(versions)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(versions.id, id))
      .returning();
    
    return version ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(versions)
      .where(eq(versions.id, id))
      .returning({ id: versions.id });
    
    return result.length > 0;
  }

  async countByProjectId(projectId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(versions)
      .where(eq(versions.projectId, projectId));
    
    return result[0]?.count ?? 0;
  }

  // ===========================================================================
  // FIX VERSIONS
  // ===========================================================================

  async findFixVersions(issueId: string): Promise<Version[]> {
    const result = await this.db
      .select({ version: versions })
      .from(issueFixVersions)
      .innerJoin(versions, eq(issueFixVersions.versionId, versions.id))
      .where(eq(issueFixVersions.issueId, issueId))
      .orderBy(asc(versions.sortOrder), asc(versions.name));

    return result.map(r => r.version);
  }

  async addFixVersion(issueId: string, versionId: string): Promise<void> {
    await this.db
      .insert(issueFixVersions)
      .values({ issueId, versionId });
  }

  async removeFixVersion(issueId: string, versionId: string): Promise<boolean> {
    const result = await this.db
      .delete(issueFixVersions)
      .where(
        and(
          eq(issueFixVersions.issueId, issueId),
          eq(issueFixVersions.versionId, versionId)
        )
      )
      .returning({ id: issueFixVersions.id });
    
    return result.length > 0;
  }

  async setFixVersions(issueId: string, versionIds: string[]): Promise<void> {
    await this.db
      .delete(issueFixVersions)
      .where(eq(issueFixVersions.issueId, issueId));

    if (versionIds.length > 0) {
      await this.db
        .insert(issueFixVersions)
        .values(versionIds.map(versionId => ({ issueId, versionId })));
    }
  }

  async countIssuesByFixVersion(versionId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(issueFixVersions)
      .where(eq(issueFixVersions.versionId, versionId));
    
    return result[0]?.count ?? 0;
  }

  async findIssueIdsByFixVersion(versionId: string): Promise<string[]> {
    const result = await this.db
      .select({ issueId: issueFixVersions.issueId })
      .from(issueFixVersions)
      .where(eq(issueFixVersions.versionId, versionId));
    
    return result.map(r => r.issueId);
  }

  // ===========================================================================
  // AFFECTED VERSIONS
  // ===========================================================================

  async findAffectedVersions(issueId: string): Promise<Version[]> {
    const result = await this.db
      .select({ version: versions })
      .from(issueAffectedVersions)
      .innerJoin(versions, eq(issueAffectedVersions.versionId, versions.id))
      .where(eq(issueAffectedVersions.issueId, issueId))
      .orderBy(asc(versions.sortOrder), asc(versions.name));

    return result.map(r => r.version);
  }

  async addAffectedVersion(issueId: string, versionId: string): Promise<void> {
    await this.db
      .insert(issueAffectedVersions)
      .values({ issueId, versionId });
  }

  async removeAffectedVersion(issueId: string, versionId: string): Promise<boolean> {
    const result = await this.db
      .delete(issueAffectedVersions)
      .where(
        and(
          eq(issueAffectedVersions.issueId, issueId),
          eq(issueAffectedVersions.versionId, versionId)
        )
      )
      .returning({ id: issueAffectedVersions.id });
    
    return result.length > 0;
  }

  async setAffectedVersions(issueId: string, versionIds: string[]): Promise<void> {
    await this.db
      .delete(issueAffectedVersions)
      .where(eq(issueAffectedVersions.issueId, issueId));

    if (versionIds.length > 0) {
      await this.db
        .insert(issueAffectedVersions)
        .values(versionIds.map(versionId => ({ issueId, versionId })));
    }
  }

  async countIssuesByAffectedVersion(versionId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(issueAffectedVersions)
      .where(eq(issueAffectedVersions.versionId, versionId));
    
    return result[0]?.count ?? 0;
  }

  // ===========================================================================
  // AGGREGATED QUERIES
  // ===========================================================================

  /**
   * Get versions with issue counts for a project
   */
  async findAllWithCounts(projectId: string): Promise<Array<Version & { 
    fixIssueCount: number; 
    affectedIssueCount: number 
  }>> {
    const versionList = await this.findAllByProjectId(projectId, true);
    
    const result = await Promise.all(
      versionList.map(async (version) => {
        const fixCount = await this.countIssuesByFixVersion(version.id);
        const affectedCount = await this.countIssuesByAffectedVersion(version.id);
        return {
          ...version,
          fixIssueCount: fixCount,
          affectedIssueCount: affectedCount,
        };
      })
    );

    return result;
  }
}
