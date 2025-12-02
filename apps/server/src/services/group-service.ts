import { TRPCError } from '@trpc/server';
import {
  groupRepository,
  groupMemberRepository,
} from '@/repositories/group-repository';
import type {
  Group,
  GroupMember,
  GroupWithMembers,
  GroupWithMemberCount,
} from '@/db/schema/groups';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateGroupInput {
  name: string;
  displayName?: string;
  description?: string;
}

export interface UpdateGroupInput {
  name?: string;
  displayName?: string;
  description?: string;
  isActive?: boolean;
}

export interface ListGroupsInput {
  includeInactive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface PaginatedGroups {
  groups: GroupWithMemberCount[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================================================
// GROUPS SERVICE
// ============================================================================

/**
 * Group management service
 * Handles group CRUD and membership operations
 */
export class GroupService {
  // =========================================================================
  // GROUP OPERATIONS
  // =========================================================================

  /**
   * List groups with pagination
   */
  async listGroups(input?: ListGroupsInput): Promise<PaginatedGroups> {
    const limit = input?.limit ?? 50;
    const offset = input?.offset ?? 0;

    const [groups, total] = await Promise.all([
      groupRepository.findAll({
        includeInactive: input?.includeInactive,
        search: input?.search,
        limit,
        offset,
      }),
      groupRepository.count({
        includeInactive: input?.includeInactive,
        search: input?.search,
      }),
    ]);

    return { groups, total, limit, offset };
  }

  /**
   * Get group by ID
   */
  async getGroupById(id: string): Promise<Group> {
    const group = await groupRepository.findById(id);
    if (!group) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Group not found: ${id}`,
      });
    }
    return group;
  }

  /**
   * Get group by name
   */
  async getGroupByName(name: string): Promise<Group> {
    const group = await groupRepository.findByName(name);
    if (!group) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Group not found: ${name}`,
      });
    }
    return group;
  }

  /**
   * Get group with members
   */
  async getGroupWithMembers(id: string): Promise<GroupWithMembers> {
    const group = await groupRepository.findByIdWithMembers(id);
    if (!group) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Group not found: ${id}`,
      });
    }
    return group;
  }

  /**
   * Create a new group
   */
  async createGroup(input: CreateGroupInput): Promise<Group> {
    // Validate name format
    const normalizedName = input.name.toLowerCase().trim();
    if (!/^[a-z0-9_-]+$/.test(normalizedName)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message:
          'Group name can only contain lowercase letters, numbers, hyphens, and underscores',
      });
    }

    // Check uniqueness
    const existing = await groupRepository.findByName(normalizedName);
    if (existing) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: `A group with name "${normalizedName}" already exists`,
      });
    }

    return groupRepository.create({
      name: normalizedName,
      displayName: input.displayName || input.name,
      description: input.description,
    });
  }

  /**
   * Update a group
   */
  async updateGroup(id: string, input: UpdateGroupInput): Promise<Group> {
    const existing = await this.getGroupById(id);

    // Check if system group
    if (existing.isSystem && (input.name || input.isActive === false)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'System groups cannot be renamed or deactivated',
      });
    }

    // Validate name if changing
    if (input.name) {
      const normalizedName = input.name.toLowerCase().trim();
      if (!/^[a-z0-9_-]+$/.test(normalizedName)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'Group name can only contain lowercase letters, numbers, hyphens, and underscores',
        });
      }

      const other = await groupRepository.findByName(normalizedName);
      if (other && other.id !== id) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `A group with name "${normalizedName}" already exists`,
        });
      }
    }

    const updated = await groupRepository.update(id, input);
    if (!updated) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update group',
      });
    }
    return updated;
  }

  /**
   * Delete a group
   */
  async deleteGroup(id: string): Promise<void> {
    const existing = await this.getGroupById(id);

    if (existing.isSystem) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'System groups cannot be deleted',
      });
    }

    const deleted = await groupRepository.delete(id);
    if (!deleted) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete group',
      });
    }
  }

  /**
   * Get groups a user belongs to
   */
  async getUserGroups(userId: string): Promise<Group[]> {
    return groupRepository.findByUserId(userId);
  }

  /**
   * Check if user is in group
   */
  async isUserInGroup(groupId: string, userId: string): Promise<boolean> {
    return groupRepository.isUserMember(groupId, userId);
  }

  /**
   * Check if user is in any of the groups
   */
  async isUserInAnyGroup(groupIds: string[], userId: string): Promise<boolean> {
    return groupRepository.isUserMemberOfAny(groupIds, userId);
  }

  // =========================================================================
  // MEMBER OPERATIONS
  // =========================================================================

  /**
   * Get members of a group
   */
  async getGroupMembers(groupId: string): Promise<
    (GroupMember & {
      user: { id: string; name: string | null; email: string };
    })[]
  > {
    // Verify group exists
    await this.getGroupById(groupId);
    return groupMemberRepository.findByGroupId(groupId);
  }

  /**
   * Get member count
   */
  async getMemberCount(groupId: string): Promise<number> {
    return groupMemberRepository.getMemberCount(groupId);
  }

  /**
   * Add user to group
   */
  async addMember(
    groupId: string,
    userId: string,
    addedBy?: string,
  ): Promise<GroupMember> {
    // Verify group exists
    await this.getGroupById(groupId);

    // Check if already member
    const isMember = await groupRepository.isUserMember(groupId, userId);
    if (isMember) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'User is already a member of this group',
      });
    }

    return groupMemberRepository.addMember({
      groupId,
      userId,
      addedBy,
    });
  }

  /**
   * Add multiple users to group
   */
  async addMembers(
    groupId: string,
    userIds: string[],
    addedBy?: string,
  ): Promise<GroupMember[]> {
    // Verify group exists
    await this.getGroupById(groupId);
    return groupMemberRepository.addMembers(groupId, userIds, addedBy);
  }

  /**
   * Remove user from group
   */
  async removeMember(groupId: string, userId: string): Promise<void> {
    // Verify group exists
    await this.getGroupById(groupId);

    const removed = await groupMemberRepository.removeMember(groupId, userId);
    if (!removed) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User is not a member of this group',
      });
    }
  }

  /**
   * Remove multiple users from group
   */
  async removeMembers(groupId: string, userIds: string[]): Promise<number> {
    // Verify group exists
    await this.getGroupById(groupId);
    return groupMemberRepository.removeMembers(groupId, userIds);
  }

  /**
   * Set members for a group (replace all)
   */
  async setMembers(
    groupId: string,
    userIds: string[],
    addedBy?: string,
  ): Promise<GroupMember[]> {
    // Verify group exists
    await this.getGroupById(groupId);
    return groupMemberRepository.setMembers(groupId, userIds, addedBy);
  }

  // =========================================================================
  // SYSTEM GROUPS
  // =========================================================================

  /**
   * Create default system groups if they don't exist
   */
  async createSystemGroups(): Promise<void> {
    const systemGroups = [
      {
        name: 'administrators',
        displayName: 'Administrators',
        description: 'System administrators with full access',
      },
      {
        name: 'users',
        displayName: 'Users',
        description: 'All registered users',
      },
      {
        name: 'developers',
        displayName: 'Developers',
        description: 'Development team members',
      },
    ];

    for (const groupData of systemGroups) {
      const existing = await groupRepository.findByName(groupData.name);
      if (!existing) {
        await groupRepository.create({
          ...groupData,
          isSystem: true,
        });
      }
    }
  }

  /**
   * Get all system groups
   */
  async getSystemGroups(): Promise<Group[]> {
    const allGroups = await groupRepository.findAll({ includeInactive: true });
    return allGroups.filter((g) => g.isSystem);
  }
}

// Singleton instance for backward compatibility
export const groupService = new GroupService();

export default groupService;
