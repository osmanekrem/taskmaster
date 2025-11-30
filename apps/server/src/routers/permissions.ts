import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "@/lib/trpc";
import { container } from "@/lib/container";
import {
	createRoleSchema,
	updateRoleSchema,
	getRolesSchema,
	addRolePermissionSchema,
	removeRolePermissionSchema,
	setRolePermissionsSchema,
	getRolePermissionsSchema,
	addRoleMemberSchema,
	removeRoleMemberSchema,
	getRoleMembersSchema,
	getUserRolesSchema,
	getProjectMembersSchema,
	checkPermissionSchema,
	checkPermissionsSchema,
	getUserPermissionsSchema,
	createPermissionSchemeSchema,
	updatePermissionSchemeSchema,
	applyPermissionSchemeSchema,
} from "@taskmaster/validation";

// =====================================================
// PERMISSIONS ROUTER
// =====================================================

export const permissionsRouter = router({
	// ===== ROLE ENDPOINTS =====

	/**
	 * Get all roles
	 */
	getRoles: protectedProcedure
		.input(getRolesSchema)
		.query(async ({ input }) => {
			return container.permission.getRoles(input);
		}),

	/**
	 * Get role by ID
	 */
	getRoleById: protectedProcedure
		.input(z.object({ roleId: z.string() }))
		.query(async ({ input }) => {
			return container.permission.getRoleById(input.roleId);
		}),

	/**
	 * Create a new role
	 */
	createRole: protectedProcedure
		.input(createRoleSchema)
		.mutation(async ({ ctx, input }) => {
			// Check admin permissions for global roles
			if (!input.projectId) {
				const hasAdmin = await container.permission.hasPermission(
					ctx.session.user.id,
					"admin:manage_projects",
				);
				if (!hasAdmin) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "Admin permission required to create global roles",
					});
				}
			} else {
				// Check project manage_roles permission
				const hasPermission = await container.permission.hasPermission(
					ctx.session.user.id,
					"project:manage_roles",
					input.projectId,
				);
				if (!hasPermission) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "Permission denied: project:manage_roles required",
					});
				}
			}

			return container.permission.createRole(input, ctx.session.user.id);
		}),

	/**
	 * Update role
	 */
	updateRole: protectedProcedure
		.input(z.object({ roleId: z.string(), data: updateRoleSchema }))
		.mutation(async ({ ctx, input }) => {
			const role = await container.permission.getRoleById(input.roleId);

			// Check appropriate permission
			if (role.scope === "global") {
				await container.permission.requirePermission(
					ctx.session.user.id,
					"admin:manage_projects",
				);
			} else if (role.projectId) {
				await container.permission.requirePermission(
					ctx.session.user.id,
					"project:manage_roles",
					role.projectId,
				);
			}

			return container.permission.updateRole(input.roleId, input.data);
		}),

	/**
	 * Delete role
	 */
	deleteRole: protectedProcedure
		.input(z.object({ roleId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const role = await container.permission.getRoleById(input.roleId);

			if (role.scope === "global") {
				await container.permission.requirePermission(
					ctx.session.user.id,
					"admin:manage_projects",
				);
			} else if (role.projectId) {
				await container.permission.requirePermission(
					ctx.session.user.id,
					"project:manage_roles",
					role.projectId,
				);
			}

			return container.permission.deleteRole(input.roleId);
		}),

	// ===== ROLE PERMISSION ENDPOINTS =====

	/**
	 * Get role permissions
	 */
	getRolePermissions: protectedProcedure
		.input(getRolePermissionsSchema)
		.query(async ({ input }) => {
			return container.permission.getRolePermissions(input.roleId);
		}),

	/**
	 * Add permission to role
	 */
	addRolePermission: protectedProcedure
		.input(addRolePermissionSchema)
		.mutation(async ({ ctx, input }) => {
			const role = await container.permission.getRoleById(input.roleId);

			if (role.scope === "global") {
				await container.permission.requirePermission(
					ctx.session.user.id,
					"admin:manage_projects",
				);
			} else if (role.projectId) {
				await container.permission.requirePermission(
					ctx.session.user.id,
					"project:manage_roles",
					role.projectId,
				);
			}

			return container.permission.addRolePermission(
				input.roleId,
				input.permission,
			);
		}),

	/**
	 * Remove permission from role
	 */
	removeRolePermission: protectedProcedure
		.input(removeRolePermissionSchema)
		.mutation(async ({ ctx, input }) => {
			const role = await container.permission.getRoleById(input.roleId);

			if (role.scope === "global") {
				await container.permission.requirePermission(
					ctx.session.user.id,
					"admin:manage_projects",
				);
			} else if (role.projectId) {
				await container.permission.requirePermission(
					ctx.session.user.id,
					"project:manage_roles",
					role.projectId,
				);
			}

			return container.permission.removeRolePermission(
				input.roleId,
				input.permission,
			);
		}),

	/**
	 * Set all permissions for a role
	 */
	setRolePermissions: protectedProcedure
		.input(setRolePermissionsSchema)
		.mutation(async ({ ctx, input }) => {
			const role = await container.permission.getRoleById(input.roleId);

			if (role.scope === "global") {
				await container.permission.requirePermission(
					ctx.session.user.id,
					"admin:manage_projects",
				);
			} else if (role.projectId) {
				await container.permission.requirePermission(
					ctx.session.user.id,
					"project:manage_roles",
					role.projectId,
				);
			}

			return container.permission.setRolePermissions(
				input.roleId,
				input.permissions,
			);
		}),

	// ===== ROLE MEMBER ENDPOINTS =====

	/**
	 * Get role members
	 */
	getRoleMembers: protectedProcedure
		.input(getRoleMembersSchema)
		.query(async ({ input }) => {
			return container.permission.getRoleMembers(input.roleId, input.projectId);
		}),

	/**
	 * Add member to role
	 */
	addRoleMember: protectedProcedure
		.input(addRoleMemberSchema)
		.mutation(async ({ ctx, input }) => {
			// Check manage_members permission
			if (input.projectId) {
				await container.permission.requirePermission(
					ctx.session.user.id,
					"project:manage_members",
					input.projectId,
				);
			} else {
				await container.permission.requirePermission(
					ctx.session.user.id,
					"admin:manage_users",
				);
			}

			return container.permission.addRoleMember(
				input.roleId,
				input.userId,
				input.projectId,
				ctx.session.user.id,
			);
		}),

	/**
	 * Remove member from role
	 */
	removeRoleMember: protectedProcedure
		.input(removeRoleMemberSchema)
		.mutation(async ({ ctx, input }) => {
			if (input.projectId) {
				await container.permission.requirePermission(
					ctx.session.user.id,
					"project:manage_members",
					input.projectId,
				);
			} else {
				await container.permission.requirePermission(
					ctx.session.user.id,
					"admin:manage_users",
				);
			}

			return container.permission.removeRoleMember(
				input.roleId,
				input.userId,
				input.projectId,
			);
		}),

	/**
	 * Get user's roles
	 */
	getUserRoles: protectedProcedure
		.input(getUserRolesSchema)
		.query(async ({ input }) => {
			return container.permission.getUserRoles(input.userId, input.projectId);
		}),

	/**
	 * Get project members
	 */
	getProjectMembers: protectedProcedure
		.input(getProjectMembersSchema)
		.query(async ({ ctx, input }) => {
			// User must have project access to see members
			await container.permission.requireProjectAccess(
				ctx.session.user.id,
				input.projectId,
			);

			return container.permission.getProjectMembers(
				input.projectId,
				input.roleId,
			);
		}),

	// ===== PERMISSION CHECK ENDPOINTS =====

	/**
	 * Check if current user has a permission
	 */
	checkMyPermission: protectedProcedure
		.input(z.object({
			permission: z.string(),
			projectId: z.string().optional(),
		}))
		.query(async ({ ctx, input }) => {
			const hasPermission = await container.permission.hasPermission(
				ctx.session.user.id,
				input.permission as any,
				input.projectId,
			);
			return { hasPermission };
		}),

	/**
	 * Get current user's permissions
	 */
	getMyPermissions: protectedProcedure
		.input(z.object({ projectId: z.string().optional() }))
		.query(async ({ ctx, input }) => {
			return container.permission.getUserPermissions(
				ctx.session.user.id,
				input.projectId,
			);
		}),

	/**
	 * Check if current user has project access
	 */
	hasProjectAccess: protectedProcedure
		.input(z.object({ projectId: z.string() }))
		.query(async ({ ctx, input }) => {
			const hasAccess = await container.permission.hasProjectAccess(
				ctx.session.user.id,
				input.projectId,
			);
			return { hasAccess };
		}),

	// ===== PERMISSION SCHEME ENDPOINTS =====

	/**
	 * Get all permission schemes
	 */
	getPermissionSchemes: protectedProcedure.query(async ({ ctx }) => {
		// Only admins can view permission schemes
		await container.permission.requirePermission(
			ctx.session.user.id,
			"admin:manage_projects",
		);

		return container.permission.getPermissionSchemes();
	}),

	/**
	 * Get permission scheme by ID
	 */
	getPermissionSchemeById: protectedProcedure
		.input(z.object({ schemeId: z.string() }))
		.query(async ({ ctx, input }) => {
			await container.permission.requirePermission(
				ctx.session.user.id,
				"admin:manage_projects",
			);

			return container.permission.getPermissionSchemeById(input.schemeId);
		}),

	/**
	 * Create permission scheme
	 */
	createPermissionScheme: protectedProcedure
		.input(createPermissionSchemeSchema)
		.mutation(async ({ ctx, input }) => {
			await container.permission.requirePermission(
				ctx.session.user.id,
				"admin:manage_projects",
			);

			return container.permission.createPermissionScheme(input);
		}),

	/**
	 * Apply permission scheme to project
	 */
	applyPermissionScheme: protectedProcedure
		.input(applyPermissionSchemeSchema)
		.mutation(async ({ ctx, input }) => {
			// Need both project edit and scheme access
			await container.permission.requirePermission(
				ctx.session.user.id,
				"project:manage_roles",
				input.projectId,
			);

			return container.permission.applyPermissionScheme(
				input.projectId,
				input.schemeId,
			);
		}),

	// ===== INITIALIZATION ENDPOINTS =====

	/**
	 * Setup default roles for a project
	 * Usually called when creating a new project
	 */
	setupProjectRoles: protectedProcedure
		.input(z.object({ projectId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// Only project creator or admin can setup roles
			await container.permission.requireAnyPermission(
				ctx.session.user.id,
				["project:manage_roles", "admin:manage_projects"],
				input.projectId,
			);

			return container.permission.setupProjectDefaultRoles(
				input.projectId,
				ctx.session.user.id,
			);
		}),
});

export type PermissionsRouter = typeof permissionsRouter;
