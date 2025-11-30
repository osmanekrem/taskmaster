import { TRPCError } from "@trpc/server";

import type {
	RoleRepository,
	RolePermissionRepository,
	RoleMemberRepository,
	PermissionSchemeRepository,
} from "../repositories/permission-repository";
import type { Permission } from "../db/schema";
import { DEFAULT_ROLE_PERMISSIONS } from "../db/schema";

// =====================================================
// PERMISSION SERVICE
// =====================================================

/**
 * Service for managing permissions, roles, and access control
 */
export class PermissionService {
	constructor(
		private roleRepo: RoleRepository,
		private permissionRepo: RolePermissionRepository,
		private memberRepo: RoleMemberRepository,
		private schemeRepo: PermissionSchemeRepository,
	) {}

	// =====================================================
	// PERMISSION CHECKS
	// =====================================================

	/**
	 * Check if user has a specific permission
	 */
	async hasPermission(
		userId: string,
		permission: Permission,
		projectId?: string,
	): Promise<boolean> {
		const result = await this.memberRepo.hasPermission(
			userId,
			permission,
			projectId,
		);
		return result.hasPermission;
	}

	/**
	 * Check if user has ANY of the specified permissions
	 */
	async hasAnyPermission(
		userId: string,
		permissions: Permission[],
		projectId?: string,
	): Promise<boolean> {
		const userPermissions = await this.memberRepo.getUserPermissions(
			userId,
			projectId,
		);

		return permissions.some((p) => userPermissions.includes(p));
	}

	/**
	 * Check if user has ALL of the specified permissions
	 */
	async hasAllPermissions(
		userId: string,
		permissions: Permission[],
		projectId?: string,
	): Promise<boolean> {
		const userPermissions = await this.memberRepo.getUserPermissions(
			userId,
			projectId,
		);

		return permissions.every((p) => userPermissions.includes(p));
	}

	/**
	 * Check if user has access to a project
	 */
	async hasProjectAccess(userId: string, projectId: string): Promise<boolean> {
		return this.memberRepo.hasProjectAccess(userId, projectId);
	}

	/**
	 * Get all permissions user has for a project
	 */
	async getUserPermissions(
		userId: string,
		projectId?: string,
	): Promise<Permission[]> {
		return this.memberRepo.getUserPermissions(userId, projectId);
	}

	/**
	 * Check permission and throw if not authorized
	 */
	async requirePermission(
		userId: string,
		permission: Permission,
		projectId?: string,
	): Promise<void> {
		const hasIt = await this.hasPermission(userId, permission, projectId);

		if (!hasIt) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Permission denied: ${permission}`,
			});
		}
	}

	/**
	 * Check any permission and throw if none authorized
	 */
	async requireAnyPermission(
		userId: string,
		permissions: Permission[],
		projectId?: string,
	): Promise<void> {
		const hasAny = await this.hasAnyPermission(userId, permissions, projectId);

		if (!hasAny) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Permission denied: requires one of ${permissions.join(", ")}`,
			});
		}
	}

	/**
	 * Check project access and throw if not authorized
	 */
	async requireProjectAccess(userId: string, projectId: string): Promise<void> {
		const hasAccess = await this.hasProjectAccess(userId, projectId);

		if (!hasAccess) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "You do not have access to this project",
			});
		}
	}

	// =====================================================
	// ROLE MANAGEMENT
	// =====================================================

	/**
	 * Create a new role
	 */
	async createRole(
		data: {
			name: string;
			description?: string;
			projectId?: string;
			permissions?: Permission[];
		},
		createdBy?: string,
	) {
		const scope = data.projectId ? "project" : "global";

		const role = await this.roleRepo.create({
			name: data.name,
			description: data.description,
			scope,
			projectId: data.projectId,
		});

		// Add permissions if provided
		if (data.permissions && data.permissions.length > 0) {
			await this.permissionRepo.setPermissions(role.id, data.permissions);
		}

		return this.roleRepo.getById(role.id);
	}

	/**
	 * Get role by ID
	 */
	async getRoleById(roleId: string) {
		const role = await this.roleRepo.getById(roleId);

		if (!role) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Role not found",
			});
		}

		return role;
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
		return this.roleRepo.getRoles(options);
	}

	/**
	 * Update role
	 */
	async updateRole(
		roleId: string,
		data: {
			name?: string;
			description?: string;
			sortOrder?: string;
		},
	) {
		const role = await this.roleRepo.getById(roleId);

		if (!role) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Role not found",
			});
		}

		if (role.isSystem) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Cannot modify system roles",
			});
		}

		return this.roleRepo.update(roleId, data);
	}

	/**
	 * Delete role
	 */
	async deleteRole(roleId: string) {
		const role = await this.roleRepo.getById(roleId);

		if (!role) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Role not found",
			});
		}

		if (role.isSystem) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Cannot delete system roles",
			});
		}

		return this.roleRepo.delete(roleId);
	}

	// =====================================================
	// ROLE PERMISSIONS
	// =====================================================

	/**
	 * Get permissions for a role
	 */
	async getRolePermissions(roleId: string): Promise<Permission[]> {
		return this.permissionRepo.getRolePermissions(roleId);
	}

	/**
	 * Add permission to role
	 */
	async addRolePermission(roleId: string, permission: Permission) {
		const role = await this.roleRepo.getById(roleId);

		if (!role) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Role not found",
			});
		}

		return this.permissionRepo.addPermission(roleId, permission);
	}

	/**
	 * Remove permission from role
	 */
	async removeRolePermission(roleId: string, permission: Permission) {
		return this.permissionRepo.removePermission(roleId, permission);
	}

	/**
	 * Set all permissions for a role
	 */
	async setRolePermissions(roleId: string, permissions: Permission[]) {
		const role = await this.roleRepo.getById(roleId);

		if (!role) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Role not found",
			});
		}

		return this.permissionRepo.setPermissions(roleId, permissions);
	}

	// =====================================================
	// ROLE MEMBERS
	// =====================================================

	/**
	 * Add user to role
	 */
	async addRoleMember(
		roleId: string,
		userId: string,
		projectId?: string,
		grantedBy?: string,
	) {
		const role = await this.roleRepo.getById(roleId);

		if (!role) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Role not found",
			});
		}

		// Validate project requirement
		if (role.scope === "project" && !projectId) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Project ID is required for project-scoped roles",
			});
		}

		return this.memberRepo.addMember(roleId, userId, projectId, grantedBy);
	}

	/**
	 * Remove user from role
	 */
	async removeRoleMember(roleId: string, userId: string, projectId?: string) {
		return this.memberRepo.removeMember(roleId, userId, projectId);
	}

	/**
	 * Get role members
	 */
	async getRoleMembers(roleId: string, projectId?: string) {
		return this.memberRepo.getRoleMembers(roleId, projectId);
	}

	/**
	 * Get user's roles
	 */
	async getUserRoles(userId: string, projectId?: string) {
		return this.memberRepo.getUserRoles(userId, projectId);
	}

	/**
	 * Get all project members
	 */
	async getProjectMembers(projectId: string, roleId?: string) {
		return this.memberRepo.getProjectMembers(projectId, roleId);
	}

	// =====================================================
	// PERMISSION SCHEMES
	// =====================================================

	/**
	 * Get all permission schemes
	 */
	async getPermissionSchemes() {
		return this.schemeRepo.getAll();
	}

	/**
	 * Get permission scheme by ID
	 */
	async getPermissionSchemeById(schemeId: string) {
		const scheme = await this.schemeRepo.getById(schemeId);

		if (!scheme) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Permission scheme not found",
			});
		}

		return scheme;
	}

	/**
	 * Create permission scheme
	 */
	async createPermissionScheme(data: {
		name: string;
		description?: string;
		isDefault?: boolean;
		roleTemplates?: Array<{
			roleName: string;
			roleDescription?: string;
			permissions: Permission[];
			sortOrder?: string;
		}>;
	}) {
		const scheme = await this.schemeRepo.create({
			name: data.name,
			description: data.description,
			isDefault: data.isDefault,
		});

		// Add role templates
		if (data.roleTemplates && data.roleTemplates.length > 0) {
			for (const template of data.roleTemplates) {
				await this.schemeRepo.addRoleTemplate(scheme.id, template);
			}
		}

		return this.schemeRepo.getById(scheme.id);
	}

	/**
	 * Apply permission scheme to project
	 * Creates roles based on scheme templates and applies to project
	 */
	async applyPermissionScheme(projectId: string, schemeId: string) {
		const scheme = await this.schemeRepo.getById(schemeId);

		if (!scheme) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Permission scheme not found",
			});
		}

		if (!scheme.roleTemplates || scheme.roleTemplates.length === 0) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Permission scheme has no role templates",
			});
		}

		const createdRoles = [];

		for (const template of scheme.roleTemplates) {
			// Create role for project
			const role = await this.roleRepo.create({
				name: template.roleName,
				description: template.roleDescription ?? undefined,
				scope: "project",
				projectId,
				sortOrder: template.sortOrder,
			});

			// Set permissions
			if (template.permissions && template.permissions.length > 0) {
				await this.permissionRepo.setPermissions(
					role.id,
					template.permissions as Permission[],
				);
			}

			createdRoles.push(role);
		}

		return createdRoles;
	}

	// =====================================================
	// INITIALIZATION / DEFAULTS
	// =====================================================

	/**
	 * Initialize default global roles
	 */
	async initializeDefaultRoles() {
		// Create System Administrator role
		const existingAdmin = await this.roleRepo.getRoles({
			scope: "global",
		});

		if (!existingAdmin.some((r) => r.name === "System Administrator")) {
			const adminRole = await this.roleRepo.create({
				name: "System Administrator",
				description: "Full system access",
				scope: "global",
				isSystem: true,
				sortOrder: "0",
			});

			await this.permissionRepo.setPermissions(
				adminRole.id,
				DEFAULT_ROLE_PERMISSIONS.systemAdmin as Permission[],
			);
		}
	}

	/**
	 * Setup default roles for a new project
	 */
	async setupProjectDefaultRoles(projectId: string, ownerId: string) {
		// Administrator role
		const adminRole = await this.roleRepo.create({
			name: "Administrator",
			description: "Full project access",
			scope: "project",
			projectId,
			sortOrder: "0",
		});
		await this.permissionRepo.setPermissions(
			adminRole.id,
			DEFAULT_ROLE_PERMISSIONS.administrator as Permission[],
		);

		// Developer role
		const devRole = await this.roleRepo.create({
			name: "Developer",
			description: "Can work on issues",
			scope: "project",
			projectId,
			sortOrder: "1",
		});
		await this.permissionRepo.setPermissions(
			devRole.id,
			DEFAULT_ROLE_PERMISSIONS.developer as Permission[],
		);

		// Viewer role
		const viewerRole = await this.roleRepo.create({
			name: "Viewer",
			description: "Read-only access",
			scope: "project",
			projectId,
			sortOrder: "2",
		});
		await this.permissionRepo.setPermissions(
			viewerRole.id,
			DEFAULT_ROLE_PERMISSIONS.viewer as Permission[],
		);

		// Add owner as Administrator
		await this.memberRepo.addMember(adminRole.id, ownerId, projectId);

		return { adminRole, devRole, viewerRole };
	}
}
