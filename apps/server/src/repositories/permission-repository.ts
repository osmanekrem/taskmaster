import { and, eq, inArray, sql, isNull, type SQL } from "drizzle-orm";

import { db as database } from "../db";
import {
	projectRoles,
	rolePermissions,
	projectRoleMembers,
	permissionSchemes,
	permissionSchemeRoles,
	type Permission,
} from "../db/schema";

// =====================================================
// ROLE REPOSITORY
// =====================================================

export class RoleRepository {
	constructor(private db: typeof database = database) {}

	// ===== CREATE =====

	/**
	 * Create a new role
	 */
	async create(data: {
		name: string;
		description?: string;
		scope: "global" | "project";
		projectId?: string;
		isSystem?: boolean;
		sortOrder?: string;
	}) {
		const [role] = await this.db
			.insert(projectRoles)
			.values({
				name: data.name,
				description: data.description,
				scope: data.scope,
				projectId: data.projectId,
				isSystem: data.isSystem ?? false,
				sortOrder: data.sortOrder ?? "0",
			})
			.returning();

		return role;
	}

	// ===== READ =====

	/**
	 * Get role by ID
	 */
	async getById(id: string) {
		return this.db.query.projectRoles.findFirst({
			where: eq(projectRoles.id, id),
			with: {
				permissions: true,
			},
		});
	}

	/**
	 * Get roles with filters
	 */
	async getRoles(options: {
		projectId?: string;
		scope?: "global" | "project";
		includePermissions?: boolean;
		includeMemberCount?: boolean;
	}) {
		const { projectId, scope, includePermissions = false, includeMemberCount = false } = options;

		// Build conditions
		const conditions: SQL[] = [];

		if (scope) {
			conditions.push(eq(projectRoles.scope, scope));
		}

		if (projectId) {
			// For project-specific roles OR global roles
			conditions.push(
				sql`(${projectRoles.projectId} = ${projectId} OR ${projectRoles.scope} = 'global')`,
			);
		}

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

		const roles = await this.db.query.projectRoles.findMany({
			where: whereClause,
			with: includePermissions
				? {
						permissions: true,
					}
				: undefined,
			orderBy: [projectRoles.sortOrder, projectRoles.name],
		});

		// Add member count if requested
		if (includeMemberCount) {
			const rolesWithCount = await Promise.all(
				roles.map(async (role) => {
					const [countResult] = await this.db
						.select({ count: sql<number>`count(*)::int` })
						.from(projectRoleMembers)
						.where(eq(projectRoleMembers.roleId, role.id));

					return {
						...role,
						memberCount: countResult?.count ?? 0,
					};
				}),
			);

			return rolesWithCount;
		}

		return roles;
	}

	/**
	 * Get global roles
	 */
	async getGlobalRoles() {
		return this.db.query.projectRoles.findMany({
			where: eq(projectRoles.scope, "global"),
			with: {
				permissions: true,
			},
		});
	}

	/**
	 * Get project roles (including global roles)
	 */
	async getProjectRoles(projectId: string) {
		return this.db.query.projectRoles.findMany({
			where: sql`(${projectRoles.projectId} = ${projectId} OR ${projectRoles.scope} = 'global')`,
			with: {
				permissions: true,
			},
			orderBy: [projectRoles.sortOrder, projectRoles.name],
		});
	}

	// ===== UPDATE =====

	/**
	 * Update role
	 */
	async update(
		id: string,
		data: {
			name?: string;
			description?: string;
			sortOrder?: string;
		},
	) {
		const [updated] = await this.db
			.update(projectRoles)
			.set({
				...data,
				updatedAt: new Date(),
			})
			.where(eq(projectRoles.id, id))
			.returning();

		return updated;
	}

	// ===== DELETE =====

	/**
	 * Delete role
	 */
	async delete(id: string) {
		const [deleted] = await this.db
			.delete(projectRoles)
			.where(and(eq(projectRoles.id, id), eq(projectRoles.isSystem, false)))
			.returning();

		return deleted;
	}
}

// =====================================================
// ROLE PERMISSION REPOSITORY
// =====================================================

export class RolePermissionRepository {
	constructor(private db: typeof database = database) {}

	/**
	 * Get all permissions for a role
	 */
	async getRolePermissions(roleId: string) {
		const permissions = await this.db
			.select({ permission: rolePermissions.permission })
			.from(rolePermissions)
			.where(eq(rolePermissions.roleId, roleId));

		return permissions.map((p) => p.permission as Permission);
	}

	/**
	 * Add permission to role
	 */
	async addPermission(roleId: string, permission: Permission) {
		const [result] = await this.db
			.insert(rolePermissions)
			.values({
				roleId,
				permission,
			})
			.onConflictDoNothing({
				target: [rolePermissions.roleId, rolePermissions.permission],
			})
			.returning();

		return result;
	}

	/**
	 * Remove permission from role
	 */
	async removePermission(roleId: string, permission: Permission) {
		const [deleted] = await this.db
			.delete(rolePermissions)
			.where(
				and(
					eq(rolePermissions.roleId, roleId),
					eq(rolePermissions.permission, permission),
				),
			)
			.returning();

		return deleted;
	}

	/**
	 * Set all permissions for a role (replaces existing)
	 */
	async setPermissions(roleId: string, permissionsList: Permission[]) {
		// Delete existing permissions
		await this.db
			.delete(rolePermissions)
			.where(eq(rolePermissions.roleId, roleId));

		// Insert new permissions
		if (permissionsList.length > 0) {
			const values = permissionsList.map((permission) => ({
				roleId,
				permission,
			}));

			await this.db.insert(rolePermissions).values(values);
		}

		return this.getRolePermissions(roleId);
	}
}

// =====================================================
// ROLE MEMBER REPOSITORY
// =====================================================

export class RoleMemberRepository {
	constructor(private db: typeof database = database) {}

	/**
	 * Add member to role
	 */
	async addMember(
		roleId: string,
		userId: string,
		projectId?: string,
		grantedBy?: string,
	) {
		const [member] = await this.db
			.insert(projectRoleMembers)
			.values({
				roleId,
				userId,
				projectId,
				grantedBy,
			})
			.onConflictDoNothing({
				target: [
					projectRoleMembers.projectId,
					projectRoleMembers.roleId,
					projectRoleMembers.userId,
				],
			})
			.returning();

		return member;
	}

	/**
	 * Remove member from role
	 */
	async removeMember(roleId: string, userId: string, projectId?: string) {
		const conditions: SQL[] = [
			eq(projectRoleMembers.roleId, roleId),
			eq(projectRoleMembers.userId, userId),
		];

		if (projectId) {
			conditions.push(eq(projectRoleMembers.projectId, projectId));
		} else {
			conditions.push(isNull(projectRoleMembers.projectId));
		}

		const [deleted] = await this.db
			.delete(projectRoleMembers)
			.where(and(...conditions))
			.returning();

		return deleted;
	}

	/**
	 * Get members of a role
	 */
	async getRoleMembers(roleId: string, projectId?: string) {
		const conditions: SQL[] = [eq(projectRoleMembers.roleId, roleId)];

		if (projectId) {
			conditions.push(eq(projectRoleMembers.projectId, projectId));
		}

		return this.db.query.projectRoleMembers.findMany({
			where: and(...conditions),
			with: {
				user: {
					columns: {
						id: true,
						name: true,
						email: true,
						image: true,
					},
				},
				role: true,
			},
		});
	}

	/**
	 * Get all roles of a user
	 */
	async getUserRoles(userId: string, projectId?: string) {
		const conditions: SQL[] = [eq(projectRoleMembers.userId, userId)];

		if (projectId) {
			// Get project-specific roles AND global roles
			conditions.push(
				sql`(${projectRoleMembers.projectId} = ${projectId} OR ${projectRoleMembers.projectId} IS NULL)`,
			);
		}

		return this.db.query.projectRoleMembers.findMany({
			where: and(...conditions),
			with: {
				role: {
					with: {
						permissions: true,
					},
				},
			},
		});
	}

	/**
	 * Get all members of a project
	 */
	async getProjectMembers(projectId: string, roleId?: string) {
		const conditions: SQL[] = [eq(projectRoleMembers.projectId, projectId)];

		if (roleId) {
			conditions.push(eq(projectRoleMembers.roleId, roleId));
		}

		return this.db.query.projectRoleMembers.findMany({
			where: and(...conditions),
			with: {
				user: {
					columns: {
						id: true,
						name: true,
						email: true,
						image: true,
					},
				},
				role: true,
			},
		});
	}

	/**
	 * Check if user has any role in a project
	 */
	async hasProjectAccess(userId: string, projectId: string) {
		const member = await this.db.query.projectRoleMembers.findFirst({
			where: and(
				eq(projectRoleMembers.userId, userId),
				eq(projectRoleMembers.projectId, projectId),
			),
		});

		return !!member;
	}

	/**
	 * Get user's permissions for a project
	 */
	async getUserPermissions(
		userId: string,
		projectId?: string,
	): Promise<Permission[]> {
		const userRoles = await this.getUserRoles(userId, projectId);

		// Collect all permissions from all roles
		const permissionSet = new Set<Permission>();

		for (const membership of userRoles) {
			if (membership.role?.permissions) {
				for (const perm of membership.role.permissions) {
					permissionSet.add(perm.permission as Permission);
				}
			}
		}

		return Array.from(permissionSet);
	}

	/**
	 * Check if user has specific permission
	 */
	async hasPermission(
		userId: string,
		permission: Permission,
		projectId?: string,
	): Promise<{ hasPermission: boolean; grantedVia?: string }> {
		const userRoles = await this.getUserRoles(userId, projectId);

		for (const membership of userRoles) {
			if (membership.role?.permissions) {
				const hasIt = membership.role.permissions.some(
					(p) => p.permission === permission,
				);
				if (hasIt) {
					return {
						hasPermission: true,
						grantedVia: membership.role.name,
					};
				}
			}
		}

		return { hasPermission: false };
	}
}

// =====================================================
// PERMISSION SCHEME REPOSITORY
// =====================================================

export class PermissionSchemeRepository {
	constructor(private db: typeof database = database) {}

	/**
	 * Get all permission schemes
	 */
	async getAll() {
		return this.db.query.permissionSchemes.findMany({
			with: {
				roleTemplates: true,
			},
			orderBy: [permissionSchemes.name],
		});
	}

	/**
	 * Get permission scheme by ID
	 */
	async getById(id: string) {
		return this.db.query.permissionSchemes.findFirst({
			where: eq(permissionSchemes.id, id),
			with: {
				roleTemplates: true,
			},
		});
	}

	/**
	 * Get default permission scheme
	 */
	async getDefault() {
		return this.db.query.permissionSchemes.findFirst({
			where: eq(permissionSchemes.isDefault, true),
			with: {
				roleTemplates: true,
			},
		});
	}

	/**
	 * Create permission scheme
	 */
	async create(data: {
		name: string;
		description?: string;
		isDefault?: boolean;
		isSystem?: boolean;
	}) {
		// If setting as default, unset other defaults
		if (data.isDefault) {
			await this.db
				.update(permissionSchemes)
				.set({ isDefault: false })
				.where(eq(permissionSchemes.isDefault, true));
		}

		const [scheme] = await this.db
			.insert(permissionSchemes)
			.values({
				name: data.name,
				description: data.description,
				isDefault: data.isDefault ?? false,
				isSystem: data.isSystem ?? false,
			})
			.returning();

		return scheme;
	}

	/**
	 * Update permission scheme
	 */
	async update(
		id: string,
		data: {
			name?: string;
			description?: string;
			isDefault?: boolean;
		},
	) {
		// If setting as default, unset other defaults
		if (data.isDefault) {
			await this.db
				.update(permissionSchemes)
				.set({ isDefault: false })
				.where(eq(permissionSchemes.isDefault, true));
		}

		const [updated] = await this.db
			.update(permissionSchemes)
			.set({
				...data,
				updatedAt: new Date(),
			})
			.where(eq(permissionSchemes.id, id))
			.returning();

		return updated;
	}

	/**
	 * Delete permission scheme
	 */
	async delete(id: string) {
		const [deleted] = await this.db
			.delete(permissionSchemes)
			.where(
				and(eq(permissionSchemes.id, id), eq(permissionSchemes.isSystem, false)),
			)
			.returning();

		return deleted;
	}

	/**
	 * Add role template to scheme
	 */
	async addRoleTemplate(
		schemeId: string,
		data: {
			roleName: string;
			roleDescription?: string;
			permissions: Permission[];
			sortOrder?: string;
		},
	) {
		const [template] = await this.db
			.insert(permissionSchemeRoles)
			.values({
				schemeId,
				roleName: data.roleName,
				roleDescription: data.roleDescription,
				permissions: data.permissions,
				sortOrder: data.sortOrder ?? "0",
			})
			.returning();

		return template;
	}

	/**
	 * Update role template
	 */
	async updateRoleTemplate(
		id: string,
		data: {
			roleName?: string;
			roleDescription?: string;
			permissions?: Permission[];
			sortOrder?: string;
		},
	) {
		const [updated] = await this.db
			.update(permissionSchemeRoles)
			.set(data)
			.where(eq(permissionSchemeRoles.id, id))
			.returning();

		return updated;
	}

	/**
	 * Delete role template
	 */
	async deleteRoleTemplate(id: string) {
		const [deleted] = await this.db
			.delete(permissionSchemeRoles)
			.where(eq(permissionSchemeRoles.id, id))
			.returning();

		return deleted;
	}
}
