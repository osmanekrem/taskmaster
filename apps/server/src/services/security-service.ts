import { TRPCError } from '@trpc/server';
import securityRepo, {
  securitySchemeRepository,
  securityLevelRepository,
  securityLevelMemberRepository,
  projectSecuritySchemeRepository,
  securityAccessChecker,
} from '@/repositories/security-repository';
import type {
  IssueSecurityScheme,
  InsertIssueSecurityScheme,
  SecurityLevel,
  InsertSecurityLevel,
  SecurityLevelMember,
  InsertSecurityLevelMember,
  SecuritySchemeWithLevels,
  SecurityLevelWithMembers,
  SecurityLevelMemberType,
} from '@/db/schema/security';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateSchemeInput {
  name: string;
  description?: string;
  isDefault?: boolean;
}

export interface UpdateSchemeInput {
  name?: string;
  description?: string;
  isDefault?: boolean;
}

export interface CreateLevelInput {
  schemeId: string;
  name: string;
  description?: string;
  sortOrder?: number;
  isDefault?: boolean;
}

export interface UpdateLevelInput {
  name?: string;
  description?: string;
  sortOrder?: number;
  isDefault?: boolean;
}

export interface AddMemberInput {
  levelId: string;
  memberType: SecurityLevelMemberType;
  memberId?: string;
  customFieldId?: string;
}

export interface SetProjectSchemeInput {
  projectId: string;
  schemeId: string;
  defaultLevelId?: string;
}

// ============================================================================
// SECURITY SERVICE CLASS
// ============================================================================

export class SecurityService {
  // =========================================================================
  // SCHEME OPERATIONS
  // =========================================================================

  /**
   * Get all security schemes
   */
  async getAllSchemes(): Promise<IssueSecurityScheme[]> {
    return securitySchemeRepository.findAll();
  }

  /**
   * Get scheme by ID
   */
  async getSchemeById(id: string): Promise<IssueSecurityScheme> {
    const scheme = await securitySchemeRepository.findById(id);
    if (!scheme) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Security scheme not found: ${id}`,
      });
    }
    return scheme;
  }

  /**
   * Get scheme with all levels and members
   */
  async getSchemeWithLevels(id: string): Promise<SecuritySchemeWithLevels> {
    const scheme = await securitySchemeRepository.findByIdWithLevels(id);
    if (!scheme) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Security scheme not found: ${id}`,
      });
    }
    return scheme;
  }

  /**
   * Create a new security scheme
   */
  async createScheme(input: CreateSchemeInput): Promise<IssueSecurityScheme> {
    // Validate name uniqueness
    const existing = await securitySchemeRepository.findAll();
    if (
      existing.some((s) => s.name.toLowerCase() === input.name.toLowerCase())
    ) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: `A security scheme with name "${input.name}" already exists`,
      });
    }

    return securitySchemeRepository.create({
      name: input.name,
      description: input.description,
      isDefault: input.isDefault ?? false,
    });
  }

  /**
   * Update a security scheme
   */
  async updateScheme(
    id: string,
    input: UpdateSchemeInput,
  ): Promise<IssueSecurityScheme> {
    // Check existence
    await this.getSchemeById(id);

    // Check name uniqueness if changing name
    if (input.name) {
      const existing = await securitySchemeRepository.findAll();
      if (
        existing.some(
          (s) =>
            s.id !== id && s.name.toLowerCase() === input.name!.toLowerCase(),
        )
      ) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `A security scheme with name "${input.name}" already exists`,
        });
      }
    }

    const updated = await securitySchemeRepository.update(id, input);
    if (!updated) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update security scheme',
      });
    }
    return updated;
  }

  /**
   * Delete a security scheme
   */
  async deleteScheme(id: string): Promise<void> {
    // Check existence
    await this.getSchemeById(id);

    // Check if scheme is in use
    const usageCount = await securitySchemeRepository.getUsageCount(id);
    if (usageCount > 0) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: `Cannot delete scheme: it is used by ${usageCount} project(s)`,
      });
    }

    const deleted = await securitySchemeRepository.delete(id);
    if (!deleted) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete security scheme',
      });
    }
  }

  /**
   * Clone a security scheme
   */
  async cloneScheme(
    id: string,
    newName: string,
  ): Promise<SecuritySchemeWithLevels> {
    const cloned = await securitySchemeRepository.clone(id, newName);
    if (!cloned) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Security scheme not found: ${id}`,
      });
    }
    return cloned;
  }

  // =========================================================================
  // LEVEL OPERATIONS
  // =========================================================================

  /**
   * Get level by ID
   */
  async getLevelById(id: string): Promise<SecurityLevel> {
    const level = await securityLevelRepository.findById(id);
    if (!level) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Security level not found: ${id}`,
      });
    }
    return level;
  }

  /**
   * Get level with members
   */
  async getLevelWithMembers(id: string): Promise<SecurityLevelWithMembers> {
    const level = await securityLevelRepository.findByIdWithMembers(id);
    if (!level) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Security level not found: ${id}`,
      });
    }
    return level;
  }

  /**
   * Get levels by scheme
   */
  async getLevelsByScheme(schemeId: string): Promise<SecurityLevel[]> {
    // Verify scheme exists
    await this.getSchemeById(schemeId);
    return securityLevelRepository.findBySchemeId(schemeId);
  }

  /**
   * Create a new security level
   */
  async createLevel(input: CreateLevelInput): Promise<SecurityLevel> {
    // Verify scheme exists
    await this.getSchemeById(input.schemeId);

    // Validate name uniqueness within scheme
    const existing = await securityLevelRepository.findBySchemeId(
      input.schemeId,
    );
    if (
      existing.some((l) => l.name.toLowerCase() === input.name.toLowerCase())
    ) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: `A security level with name "${input.name}" already exists in this scheme`,
      });
    }

    return securityLevelRepository.create({
      schemeId: input.schemeId,
      name: input.name,
      description: input.description,
      sortOrder: input.sortOrder,
      isDefault: input.isDefault ?? false,
    });
  }

  /**
   * Update a security level
   */
  async updateLevel(
    id: string,
    input: UpdateLevelInput,
  ): Promise<SecurityLevel> {
    const current = await this.getLevelById(id);

    // Check name uniqueness if changing name
    if (input.name) {
      const existing = await securityLevelRepository.findBySchemeId(
        current.schemeId,
      );
      if (
        existing.some(
          (l) =>
            l.id !== id && l.name.toLowerCase() === input.name!.toLowerCase(),
        )
      ) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `A security level with name "${input.name}" already exists in this scheme`,
        });
      }
    }

    const updated = await securityLevelRepository.update(id, input);
    if (!updated) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update security level',
      });
    }
    return updated;
  }

  /**
   * Delete a security level
   */
  async deleteLevel(id: string): Promise<void> {
    // Check existence
    await this.getLevelById(id);

    const deleted = await securityLevelRepository.delete(id);
    if (!deleted) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete security level',
      });
    }
  }

  /**
   * Reorder levels in a scheme
   */
  async reorderLevels(schemeId: string, levelIds: string[]): Promise<void> {
    // Verify scheme exists
    await this.getSchemeById(schemeId);

    // Verify all levels belong to this scheme
    const existing = await securityLevelRepository.findBySchemeId(schemeId);
    const existingIds = new Set(existing.map((l) => l.id));

    for (const levelId of levelIds) {
      if (!existingIds.has(levelId)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Level ${levelId} does not belong to scheme ${schemeId}`,
        });
      }
    }

    await securityLevelRepository.reorder(schemeId, levelIds);
  }

  // =========================================================================
  // MEMBER OPERATIONS
  // =========================================================================

  /**
   * Get members of a level
   */
  async getLevelMembers(levelId: string): Promise<SecurityLevelMember[]> {
    // Verify level exists
    await this.getLevelById(levelId);
    return securityLevelMemberRepository.findByLevelId(levelId);
  }

  /**
   * Add member to a level
   */
  async addMember(input: AddMemberInput): Promise<SecurityLevelMember> {
    // Verify level exists
    await this.getLevelById(input.levelId);

    // Validate member data based on type
    this.validateMemberInput(input);

    return securityLevelMemberRepository.create({
      levelId: input.levelId,
      memberType: input.memberType,
      memberId: input.memberId,
      customFieldId: input.customFieldId,
    });
  }

  /**
   * Remove member from a level
   */
  async removeMember(memberId: string): Promise<void> {
    const deleted = await securityLevelMemberRepository.delete(memberId);
    if (!deleted) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Security level member not found: ${memberId}`,
      });
    }
  }

  /**
   * Set all members for a level (replace)
   */
  async setLevelMembers(
    levelId: string,
    members: Omit<AddMemberInput, 'levelId'>[],
  ): Promise<SecurityLevelMember[]> {
    // Verify level exists
    await this.getLevelById(levelId);

    // Validate all members
    for (const member of members) {
      this.validateMemberInput({ ...member, levelId });
    }

    return securityLevelMemberRepository.setMembers(levelId, members);
  }

  /**
   * Validate member input
   */
  validateMemberInput(input: AddMemberInput): void {
    const typesRequiringMemberId: SecurityLevelMemberType[] = [
      'user',
      'group',
      'project_role',
    ];
    const typesWithoutMemberId: SecurityLevelMemberType[] = [
      'reporter',
      'assignee',
      'project_lead',
      'current_user',
    ];

    if (typesRequiringMemberId.includes(input.memberType) && !input.memberId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Member type "${input.memberType}" requires a memberId`,
      });
    }

    if (input.memberType === 'custom_field' && !input.customFieldId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Custom field member type requires a customFieldId',
      });
    }

    if (typesWithoutMemberId.includes(input.memberType) && input.memberId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Member type "${input.memberType}" should not have a memberId`,
      });
    }
  }

  // =========================================================================
  // PROJECT SCHEME OPERATIONS
  // =========================================================================

  /**
   * Get project's security scheme
   */
  async getProjectScheme(
    projectId: string,
  ): Promise<SecuritySchemeWithLevels | null> {
    return projectSecuritySchemeRepository.getProjectSchemeWithLevels(
      projectId,
    );
  }

  /**
   * Assign security scheme to project
   */
  async assignSchemeToProject(input: SetProjectSchemeInput): Promise<void> {
    // Verify scheme exists
    await this.getSchemeById(input.schemeId);

    // Verify default level belongs to scheme if specified
    if (input.defaultLevelId) {
      const level = await this.getLevelById(input.defaultLevelId);
      if (level.schemeId !== input.schemeId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Default level must belong to the assigned scheme',
        });
      }
    }

    await projectSecuritySchemeRepository.assignToProject({
      projectId: input.projectId,
      schemeId: input.schemeId,
      defaultLevelId: input.defaultLevelId,
    });
  }

  /**
   * Remove security scheme from project
   */
  async removeSchemeFromProject(projectId: string): Promise<void> {
    const removed = await projectSecuritySchemeRepository.removeFromProject(
      projectId,
    );
    if (!removed) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Project does not have a security scheme assigned',
      });
    }
  }

  // =========================================================================
  // ACCESS CHECK OPERATIONS
  // =========================================================================

  /**
   * Check if user can access an issue
   */
  async canAccessIssue(userId: string, issueId: string): Promise<boolean> {
    return securityAccessChecker.canUserAccessIssue(userId, issueId);
  }

  /**
   * Get accessible security levels for a user in a project
   */
  async getAccessibleLevels(
    userId: string,
    projectId: string,
  ): Promise<string[]> {
    return securityAccessChecker.getAccessibleLevels(userId, projectId);
  }

  /**
   * Get available security levels for issue creation/edit
   */
  async getSettableLevels(
    userId: string,
    projectId: string,
  ): Promise<SecurityLevel[]> {
    const projectScheme = await this.getProjectScheme(projectId);
    if (!projectScheme) return [];

    const accessibleIds = await this.getAccessibleLevels(userId, projectId);

    return projectScheme.levels.filter((level) =>
      accessibleIds.includes(level.id),
    );
  }
}

// Singleton instance for backward compatibility
export const securityService = new SecurityService();

export default securityService;
