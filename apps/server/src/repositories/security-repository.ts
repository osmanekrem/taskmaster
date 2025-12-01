import { eq, and, inArray, isNull, sql, desc, asc } from 'drizzle-orm';
import { db } from '@/db';
import {
  issueSecuritySchemes,
  securityLevels,
  securityLevelMembers,
  projectSecuritySchemes,
  type IssueSecurityScheme,
  type InsertIssueSecurityScheme,
  type SecurityLevel,
  type InsertSecurityLevel,
  type SecurityLevelMember,
  type InsertSecurityLevelMember,
  type ProjectSecurityScheme,
  type InsertProjectSecurityScheme,
  type SecuritySchemeWithLevels,
  type SecurityLevelWithMembers,
} from '@/db/schema/security';
import { issues } from '@/db/schema/issues';
import { projects } from '@/db/schema/projects';
import { projectRoles, projectRoleMembers } from '@/db/schema/permissions';

// ============================================================================
// SCHEME REPOSITORY
// ============================================================================

export const securitySchemeRepository = {
  /**
   * Find all security schemes
   */
  async findAll(): Promise<IssueSecurityScheme[]> {
    return db
      .select()
      .from(issueSecuritySchemes)
      .orderBy(issueSecuritySchemes.name);
  },

  /**
   * Find scheme by ID
   */
  async findById(id: string): Promise<IssueSecurityScheme | null> {
    const [scheme] = await db
      .select()
      .from(issueSecuritySchemes)
      .where(eq(issueSecuritySchemes.id, id));
    return scheme || null;
  },

  /**
   * Find scheme with all levels and members
   */
  async findByIdWithLevels(
    id: string,
  ): Promise<SecuritySchemeWithLevels | null> {
    const [scheme] = await db
      .select()
      .from(issueSecuritySchemes)
      .where(eq(issueSecuritySchemes.id, id));

    if (!scheme) return null;

    const levels = await db
      .select()
      .from(securityLevels)
      .where(eq(securityLevels.schemeId, id))
      .orderBy(securityLevels.sortOrder);

    const levelsWithMembers: SecurityLevelWithMembers[] = [];
    for (const level of levels) {
      const members = await db
        .select()
        .from(securityLevelMembers)
        .where(eq(securityLevelMembers.levelId, level.id));

      levelsWithMembers.push({ ...level, members });
    }

    return { ...scheme, levels: levelsWithMembers };
  },

  /**
   * Find default scheme
   */
  async findDefault(): Promise<IssueSecurityScheme | null> {
    const [scheme] = await db
      .select()
      .from(issueSecuritySchemes)
      .where(eq(issueSecuritySchemes.isDefault, true));
    return scheme || null;
  },

  /**
   * Create a new scheme
   */
  async create(data: InsertIssueSecurityScheme): Promise<IssueSecurityScheme> {
    // If setting as default, unset other defaults
    if (data.isDefault) {
      await db
        .update(issueSecuritySchemes)
        .set({ isDefault: false })
        .where(eq(issueSecuritySchemes.isDefault, true));
    }

    const [scheme] = await db
      .insert(issueSecuritySchemes)
      .values(data)
      .returning();
    return scheme;
  },

  /**
   * Update a scheme
   */
  async update(
    id: string,
    data: Partial<InsertIssueSecurityScheme>,
  ): Promise<IssueSecurityScheme | null> {
    // If setting as default, unset other defaults
    if (data.isDefault) {
      await db
        .update(issueSecuritySchemes)
        .set({ isDefault: false })
        .where(
          and(
            eq(issueSecuritySchemes.isDefault, true),
            sql`${issueSecuritySchemes.id} != ${id}`,
          ),
        );
    }

    const [scheme] = await db
      .update(issueSecuritySchemes)
      .set(data)
      .where(eq(issueSecuritySchemes.id, id))
      .returning();
    return scheme || null;
  },

  /**
   * Delete a scheme
   */
  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(issueSecuritySchemes)
      .where(eq(issueSecuritySchemes.id, id))
      .returning({ id: issueSecuritySchemes.id });
    return result.length > 0;
  },

  /**
   * Clone a scheme
   */
  async clone(
    sourceId: string,
    newName: string,
  ): Promise<SecuritySchemeWithLevels | null> {
    const source = await this.findByIdWithLevels(sourceId);
    if (!source) return null;

    // Create new scheme
    const [newScheme] = await db
      .insert(issueSecuritySchemes)
      .values({
        name: newName,
        description: source.description,
        isDefault: false,
      })
      .returning();

    // Clone levels and members
    for (const level of source.levels) {
      const [newLevel] = await db
        .insert(securityLevels)
        .values({
          schemeId: newScheme.id,
          name: level.name,
          description: level.description,
          sortOrder: level.sortOrder,
          isDefault: level.isDefault,
        })
        .returning();

      // Clone members
      for (const member of level.members) {
        await db.insert(securityLevelMembers).values({
          levelId: newLevel.id,
          memberType: member.memberType,
          memberId: member.memberId,
          customFieldId: member.customFieldId,
        });
      }
    }

    return this.findByIdWithLevels(newScheme.id);
  },

  /**
   * Get usage count (projects using this scheme)
   */
  async getUsageCount(schemeId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(projectSecuritySchemes)
      .where(eq(projectSecuritySchemes.schemeId, schemeId));
    return result?.count || 0;
  },
};

// ============================================================================
// SECURITY LEVEL REPOSITORY
// ============================================================================

export const securityLevelRepository = {
  /**
   * Find level by ID
   */
  async findById(id: string): Promise<SecurityLevel | null> {
    const [level] = await db
      .select()
      .from(securityLevels)
      .where(eq(securityLevels.id, id));
    return level || null;
  },

  /**
   * Find level with members
   */
  async findByIdWithMembers(
    id: string,
  ): Promise<SecurityLevelWithMembers | null> {
    const [level] = await db
      .select()
      .from(securityLevels)
      .where(eq(securityLevels.id, id));

    if (!level) return null;

    const members = await db
      .select()
      .from(securityLevelMembers)
      .where(eq(securityLevelMembers.levelId, id));

    return { ...level, members };
  },

  /**
   * Find levels by scheme ID
   */
  async findBySchemeId(schemeId: string): Promise<SecurityLevel[]> {
    return db
      .select()
      .from(securityLevels)
      .where(eq(securityLevels.schemeId, schemeId))
      .orderBy(securityLevels.sortOrder);
  },

  /**
   * Find default level for a scheme
   */
  async findDefaultByScheme(schemeId: string): Promise<SecurityLevel | null> {
    const [level] = await db
      .select()
      .from(securityLevels)
      .where(
        and(
          eq(securityLevels.schemeId, schemeId),
          eq(securityLevels.isDefault, true),
        ),
      );
    return level || null;
  },

  /**
   * Create a new level
   */
  async create(data: InsertSecurityLevel): Promise<SecurityLevel> {
    // If setting as default, unset other defaults in this scheme
    if (data.isDefault) {
      await db
        .update(securityLevels)
        .set({ isDefault: false })
        .where(
          and(
            eq(securityLevels.schemeId, data.schemeId),
            eq(securityLevels.isDefault, true),
          ),
        );
    }

    // Get max sort order
    const [maxOrder] = await db
      .select({
        maxSort: sql<number>`COALESCE(MAX(${securityLevels.sortOrder}), -1)`,
      })
      .from(securityLevels)
      .where(eq(securityLevels.schemeId, data.schemeId));

    const [level] = await db
      .insert(securityLevels)
      .values({
        ...data,
        sortOrder: data.sortOrder ?? (maxOrder?.maxSort ?? -1) + 1,
      })
      .returning();
    return level;
  },

  /**
   * Update a level
   */
  async update(
    id: string,
    data: Partial<InsertSecurityLevel>,
  ): Promise<SecurityLevel | null> {
    // Get current level to check scheme
    const current = await this.findById(id);
    if (!current) return null;

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await db
        .update(securityLevels)
        .set({ isDefault: false })
        .where(
          and(
            eq(securityLevels.schemeId, current.schemeId),
            eq(securityLevels.isDefault, true),
            sql`${securityLevels.id} != ${id}`,
          ),
        );
    }

    const [level] = await db
      .update(securityLevels)
      .set(data)
      .where(eq(securityLevels.id, id))
      .returning();
    return level || null;
  },

  /**
   * Delete a level
   */
  async delete(id: string): Promise<boolean> {
    // Clear security level from issues using this level
    await db
      .update(issues)
      .set({ securityLevelId: null })
      .where(eq(issues.securityLevelId, id));

    const result = await db
      .delete(securityLevels)
      .where(eq(securityLevels.id, id))
      .returning({ id: securityLevels.id });
    return result.length > 0;
  },

  /**
   * Reorder levels in a scheme
   */
  async reorder(schemeId: string, levelIds: string[]): Promise<void> {
    for (let i = 0; i < levelIds.length; i++) {
      await db
        .update(securityLevels)
        .set({ sortOrder: i })
        .where(
          and(
            eq(securityLevels.id, levelIds[i]),
            eq(securityLevels.schemeId, schemeId),
          ),
        );
    }
  },
};

// ============================================================================
// SECURITY LEVEL MEMBER REPOSITORY
// ============================================================================

export const securityLevelMemberRepository = {
  /**
   * Find members by level ID
   */
  async findByLevelId(levelId: string): Promise<SecurityLevelMember[]> {
    return db
      .select()
      .from(securityLevelMembers)
      .where(eq(securityLevelMembers.levelId, levelId));
  },

  /**
   * Add a member to a level
   */
  async create(data: InsertSecurityLevelMember): Promise<SecurityLevelMember> {
    const [member] = await db
      .insert(securityLevelMembers)
      .values(data)
      .returning();
    return member;
  },

  /**
   * Delete a member
   */
  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(securityLevelMembers)
      .where(eq(securityLevelMembers.id, id))
      .returning({ id: securityLevelMembers.id });
    return result.length > 0;
  },

  /**
   * Delete all members from a level
   */
  async deleteByLevelId(levelId: string): Promise<number> {
    const result = await db
      .delete(securityLevelMembers)
      .where(eq(securityLevelMembers.levelId, levelId))
      .returning({ id: securityLevelMembers.id });
    return result.length;
  },

  /**
   * Set members for a level (replace all)
   */
  async setMembers(
    levelId: string,
    members: Omit<InsertSecurityLevelMember, 'levelId'>[],
  ): Promise<SecurityLevelMember[]> {
    // Delete existing
    await this.deleteByLevelId(levelId);

    if (members.length === 0) return [];

    // Insert new
    return db
      .insert(securityLevelMembers)
      .values(members.map((m) => ({ ...m, levelId })))
      .returning();
  },
};

// ============================================================================
// PROJECT SECURITY SCHEME REPOSITORY
// ============================================================================

export const projectSecuritySchemeRepository = {
  /**
   * Find by project ID
   */
  async findByProjectId(
    projectId: string,
  ): Promise<ProjectSecurityScheme | null> {
    const [scheme] = await db
      .select()
      .from(projectSecuritySchemes)
      .where(eq(projectSecuritySchemes.projectId, projectId));
    return scheme || null;
  },

  /**
   * Find by scheme ID (all projects using this scheme)
   */
  async findBySchemeId(schemeId: string): Promise<ProjectSecurityScheme[]> {
    return db
      .select()
      .from(projectSecuritySchemes)
      .where(eq(projectSecuritySchemes.schemeId, schemeId));
  },

  /**
   * Assign scheme to project
   */
  async assignToProject(
    data: InsertProjectSecurityScheme,
  ): Promise<ProjectSecurityScheme> {
    // Upsert: update if exists, insert if not
    const existing = await this.findByProjectId(data.projectId);

    if (existing) {
      const [updated] = await db
        .update(projectSecuritySchemes)
        .set({
          schemeId: data.schemeId,
          defaultLevelId: data.defaultLevelId,
        })
        .where(eq(projectSecuritySchemes.id, existing.id))
        .returning();
      return updated;
    }

    const [scheme] = await db
      .insert(projectSecuritySchemes)
      .values(data)
      .returning();
    return scheme;
  },

  /**
   * Remove scheme from project
   */
  async removeFromProject(projectId: string): Promise<boolean> {
    // Clear security levels from issues in this project
    await db
      .update(issues)
      .set({ securityLevelId: null })
      .where(eq(issues.projectId, projectId));

    const result = await db
      .delete(projectSecuritySchemes)
      .where(eq(projectSecuritySchemes.projectId, projectId))
      .returning({ id: projectSecuritySchemes.id });
    return result.length > 0;
  },

  /**
   * Get scheme with levels for a project
   */
  async getProjectSchemeWithLevels(
    projectId: string,
  ): Promise<SecuritySchemeWithLevels | null> {
    const projectScheme = await this.findByProjectId(projectId);
    if (!projectScheme) return null;

    return securitySchemeRepository.findByIdWithLevels(projectScheme.schemeId);
  },
};

// ============================================================================
// SECURITY ACCESS CHECKER
// ============================================================================

export const securityAccessChecker = {
  /**
   * Check if a user can access an issue based on security level
   * Returns true if user has access, false otherwise
   */
  async canUserAccessIssue(userId: string, issueId: string): Promise<boolean> {
    // Get issue with security level
    const [issue] = await db
      .select({
        id: issues.id,
        securityLevelId: issues.securityLevelId,
        projectId: issues.projectId,
        reporterId: issues.reporterId,
        assigneeId: issues.assigneeId,
      })
      .from(issues)
      .where(eq(issues.id, issueId));

    if (!issue) return false;

    // No security level = public access
    if (!issue.securityLevelId) return true;

    // Get security level members
    const members = await db
      .select()
      .from(securityLevelMembers)
      .where(eq(securityLevelMembers.levelId, issue.securityLevelId));

    // Check each member rule
    for (const member of members) {
      const hasAccess = await this.checkMemberAccess(
        userId,
        member,
        issue.projectId,
        issue.reporterId,
        issue.assigneeId,
      );
      if (hasAccess) return true;
    }

    return false;
  },

  /**
   * Check if user matches a security level member rule
   */
  async checkMemberAccess(
    userId: string,
    member: SecurityLevelMember,
    projectId: string,
    reporterId: string,
    assigneeId: string | null,
  ): Promise<boolean> {
    switch (member.memberType) {
      case 'user':
        return member.memberId === userId;

      case 'reporter':
        return reporterId === userId;

      case 'assignee':
        return assigneeId === userId;

      case 'current_user':
        return true; // Always matches current user

      case 'project_lead': {
        const [project] = await db
          .select({ leadId: projects.leadId })
          .from(projects)
          .where(eq(projects.id, projectId));
        return project?.leadId === userId;
      }

      case 'project_role': {
        if (!member.memberId) return false;
        const [roleAccess] = await db
          .select({ id: projectRoleMembers.id })
          .from(projectRoleMembers)
          .where(
            and(
              eq(projectRoleMembers.roleId, member.memberId),
              eq(projectRoleMembers.userId, userId),
            ),
          );
        return !!roleAccess;
      }

      case 'group': {
        // Would need group_members table implementation
        // For now, return false
        return false;
      }

      case 'custom_field': {
        // Would need to look up the custom field value
        // For now, return false
        return false;
      }

      default:
        return false;
    }
  },

  /**
   * Get accessible security levels for a user in a project
   */
  async getAccessibleLevels(
    userId: string,
    projectId: string,
  ): Promise<string[]> {
    const projectScheme = await projectSecuritySchemeRepository.findByProjectId(
      projectId,
    );
    if (!projectScheme) return [];

    const levels = await securityLevelRepository.findBySchemeId(
      projectScheme.schemeId,
    );
    const accessibleIds: string[] = [];

    // null level (no security) is always accessible
    accessibleIds.push('');

    for (const level of levels) {
      const members = await securityLevelMemberRepository.findByLevelId(
        level.id,
      );

      // Get project info for checks
      const [project] = await db
        .select({ leadId: projects.leadId })
        .from(projects)
        .where(eq(projects.id, projectId));

      for (const member of members) {
        const hasAccess = await this.checkMemberAccess(
          userId,
          member,
          projectId,
          '', // No reporter in this context
          null, // No assignee in this context
        );
        if (hasAccess) {
          accessibleIds.push(level.id);
          break;
        }
      }
    }

    return accessibleIds;
  },

  /**
   * Build a SQL filter for issues based on security access
   * Returns a condition to be used in WHERE clause
   */
  buildSecurityFilter(
    userId: string,
    projectId: string,
    accessibleLevelIds: string[],
  ): ReturnType<typeof sql> {
    // Include issues with no security level OR matching security levels
    if (accessibleLevelIds.length === 0) {
      return sql`${issues.securityLevelId} IS NULL`;
    }

    const levelList = accessibleLevelIds.filter((id) => id !== '');

    if (levelList.length === 0) {
      return sql`${issues.securityLevelId} IS NULL`;
    }

    return sql`(
      ${issues.securityLevelId} IS NULL 
      OR ${issues.securityLevelId} IN (${sql.join(
      levelList.map((id) => sql`${id}`),
      sql`, `,
    )})
    )`;
  },
};

export default {
  scheme: securitySchemeRepository,
  level: securityLevelRepository,
  member: securityLevelMemberRepository,
  projectScheme: projectSecuritySchemeRepository,
  accessChecker: securityAccessChecker,
};
