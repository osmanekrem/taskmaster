import { eq, and, ilike, sql, inArray, desc, asc } from 'drizzle-orm';
import { db } from '@/db';
import {
  groups,
  groupMembers,
  type Group,
  type InsertGroup,
  type GroupMember,
  type InsertGroupMember,
  type GroupWithMembers,
  type GroupWithMemberCount,
} from '@/db/schema/groups';
import { user } from '@/db/schema/auth';

// ============================================================================
// GROUP REPOSITORY
// ============================================================================

export const groupRepository = {
  /**
   * Find all groups with optional filters
   */
  async findAll(options?: {
    includeInactive?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<GroupWithMemberCount[]> {
    const { includeInactive, search, limit, offset } = options || {};

    let query = db
      .select({
        id: groups.id,
        name: groups.name,
        displayName: groups.displayName,
        description: groups.description,
        isSystem: groups.isSystem,
        isActive: groups.isActive,
        createdAt: groups.createdAt,
        updatedAt: groups.updatedAt,
        memberCount: sql<number>`count(${groupMembers.id})::int`,
      })
      .from(groups)
      .leftJoin(groupMembers, eq(groups.id, groupMembers.groupId))
      .groupBy(groups.id)
      .$dynamic();

    const conditions = [];

    if (!includeInactive) {
      conditions.push(eq(groups.isActive, true));
    }

    if (search) {
      conditions.push(
        sql`(${groups.name} ILIKE ${`%${search}%`} OR ${
          groups.displayName
        } ILIKE ${`%${search}%`})`,
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    query = query.orderBy(groups.displayName);

    if (limit) {
      query = query.limit(limit);
    }
    if (offset) {
      query = query.offset(offset);
    }

    return query;
  },

  /**
   * Count total groups
   */
  async count(options?: {
    includeInactive?: boolean;
    search?: string;
  }): Promise<number> {
    const { includeInactive, search } = options || {};

    const conditions = [];

    if (!includeInactive) {
      conditions.push(eq(groups.isActive, true));
    }

    if (search) {
      conditions.push(
        sql`(${groups.name} ILIKE ${`%${search}%`} OR ${
          groups.displayName
        } ILIKE ${`%${search}%`})`,
      );
    }

    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(groups)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return result?.count || 0;
  },

  /**
   * Find group by ID
   */
  async findById(id: string): Promise<Group | null> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group || null;
  },

  /**
   * Find group by name (case-insensitive)
   */
  async findByName(name: string): Promise<Group | null> {
    const [group] = await db
      .select()
      .from(groups)
      .where(ilike(groups.name, name));
    return group || null;
  },

  /**
   * Find group with all members
   */
  async findByIdWithMembers(id: string): Promise<GroupWithMembers | null> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));

    if (!group) return null;

    const members = await db
      .select({
        id: groupMembers.id,
        groupId: groupMembers.groupId,
        userId: groupMembers.userId,
        addedBy: groupMembers.addedBy,
        createdAt: groupMembers.createdAt,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        },
      })
      .from(groupMembers)
      .innerJoin(user, eq(groupMembers.userId, user.id))
      .where(eq(groupMembers.groupId, id))
      .orderBy(user.name);

    return { ...group, members };
  },

  /**
   * Create a new group
   */
  async create(data: InsertGroup): Promise<Group> {
    const [group] = await db
      .insert(groups)
      .values({
        ...data,
        name: data.name.toLowerCase().trim(),
      })
      .returning();
    return group;
  },

  /**
   * Update a group
   */
  async update(id: string, data: Partial<InsertGroup>): Promise<Group | null> {
    const updateData = { ...data };
    if (data.name) {
      updateData.name = data.name.toLowerCase().trim();
    }

    const [group] = await db
      .update(groups)
      .set(updateData)
      .where(eq(groups.id, id))
      .returning();
    return group || null;
  },

  /**
   * Delete a group
   */
  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(groups)
      .where(
        and(
          eq(groups.id, id),
          eq(groups.isSystem, false), // Cannot delete system groups
        ),
      )
      .returning({ id: groups.id });
    return result.length > 0;
  },

  /**
   * Get groups a user belongs to
   */
  async findByUserId(userId: string): Promise<Group[]> {
    return db
      .select({
        id: groups.id,
        name: groups.name,
        displayName: groups.displayName,
        description: groups.description,
        isSystem: groups.isSystem,
        isActive: groups.isActive,
        createdAt: groups.createdAt,
        updatedAt: groups.updatedAt,
      })
      .from(groups)
      .innerJoin(groupMembers, eq(groups.id, groupMembers.groupId))
      .where(eq(groupMembers.userId, userId))
      .orderBy(groups.displayName);
  },

  /**
   * Check if user is member of group
   */
  async isUserMember(groupId: string, userId: string): Promise<boolean> {
    const [member] = await db
      .select({ id: groupMembers.id })
      .from(groupMembers)
      .where(
        and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)),
      );
    return !!member;
  },

  /**
   * Check if user is member of any of the specified groups
   */
  async isUserMemberOfAny(
    groupIds: string[],
    userId: string,
  ): Promise<boolean> {
    if (groupIds.length === 0) return false;

    const [member] = await db
      .select({ id: groupMembers.id })
      .from(groupMembers)
      .where(
        and(
          inArray(groupMembers.groupId, groupIds),
          eq(groupMembers.userId, userId),
        ),
      );
    return !!member;
  },
};

// ============================================================================
// GROUP MEMBER REPOSITORY
// ============================================================================

export const groupMemberRepository = {
  /**
   * Get members of a group
   */
  async findByGroupId(
    groupId: string,
  ): Promise<
    (GroupMember & {
      user: { id: string; name: string | null; email: string };
    })[]
  > {
    return db
      .select({
        id: groupMembers.id,
        groupId: groupMembers.groupId,
        userId: groupMembers.userId,
        addedBy: groupMembers.addedBy,
        createdAt: groupMembers.createdAt,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      })
      .from(groupMembers)
      .innerJoin(user, eq(groupMembers.userId, user.id))
      .where(eq(groupMembers.groupId, groupId))
      .orderBy(user.name);
  },

  /**
   * Get member count for a group
   */
  async getMemberCount(groupId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));
    return result?.count || 0;
  },

  /**
   * Add user to group
   */
  async addMember(data: InsertGroupMember): Promise<GroupMember> {
    const [member] = await db.insert(groupMembers).values(data).returning();
    return member;
  },

  /**
   * Add multiple users to group
   */
  async addMembers(
    groupId: string,
    userIds: string[],
    addedBy?: string,
  ): Promise<GroupMember[]> {
    if (userIds.length === 0) return [];

    return db
      .insert(groupMembers)
      .values(
        userIds.map((userId) => ({
          groupId,
          userId,
          addedBy,
        })),
      )
      .onConflictDoNothing()
      .returning();
  },

  /**
   * Remove user from group
   */
  async removeMember(groupId: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(groupMembers)
      .where(
        and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)),
      )
      .returning({ id: groupMembers.id });
    return result.length > 0;
  },

  /**
   * Remove multiple users from group
   */
  async removeMembers(groupId: string, userIds: string[]): Promise<number> {
    if (userIds.length === 0) return 0;

    const result = await db
      .delete(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          inArray(groupMembers.userId, userIds),
        ),
      )
      .returning({ id: groupMembers.id });
    return result.length;
  },

  /**
   * Remove all members from group
   */
  async removeAllMembers(groupId: string): Promise<number> {
    const result = await db
      .delete(groupMembers)
      .where(eq(groupMembers.groupId, groupId))
      .returning({ id: groupMembers.id });
    return result.length;
  },

  /**
   * Set members for a group (replace all)
   */
  async setMembers(
    groupId: string,
    userIds: string[],
    addedBy?: string,
  ): Promise<GroupMember[]> {
    // Remove all existing members
    await this.removeAllMembers(groupId);

    // Add new members
    if (userIds.length === 0) return [];

    return this.addMembers(groupId, userIds, addedBy);
  },
};

export default {
  group: groupRepository,
  member: groupMemberRepository,
};
