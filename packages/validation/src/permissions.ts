import { z } from 'zod';

// =====================================================
// PERMISSION TYPES
// =====================================================

/**
 * All available permissions in the system
 */
export const permissions = [
  // Project permissions
  'project:view',
  'project:edit',
  'project:delete',
  'project:manage_members',
  'project:manage_roles',

  // Issue permissions
  'issue:create',
  'issue:view',
  'issue:edit',
  'issue:edit_own',
  'issue:delete',
  'issue:delete_own',
  'issue:assign',
  'issue:transition',
  'issue:link',
  'issue:move',

  // Comment permissions
  'comment:create',
  'comment:edit',
  'comment:edit_own',
  'comment:delete',
  'comment:delete_own',

  // Attachment permissions
  'attachment:create',
  'attachment:delete',
  'attachment:delete_own',

  // Watcher permissions
  'watcher:manage',

  // Workflow permissions
  'workflow:view',
  'workflow:edit',

  // Sprint permissions
  'sprint:view',
  'sprint:create',
  'sprint:edit',
  'sprint:delete',
  'sprint:manage_issues',

  // Board permissions
  'board:view',
  'board:create',
  'board:edit',
  'board:delete',

  // Admin permissions
  'admin:manage_users',
  'admin:manage_projects',
  'admin:manage_workflows',
  'admin:manage_issue_types',
  'admin:manage_fields',
  'admin:manage_screens',
  'admin:view_audit_log',
] as const;

export const permissionSchema = z.enum(permissions);

/**
 * Role scopes
 */
export const roleScopes = ['global', 'project'] as const;
export const roleScopeSchema = z.enum(roleScopes);

// =====================================================
// ROLE SCHEMAS
// =====================================================

/**
 * Project role response schema
 */
export const projectRoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  scope: roleScopeSchema,
  projectId: z.string().nullable(),
  isSystem: z.boolean(),
  sortOrder: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  permissions: z.array(permissionSchema).optional(),
  memberCount: z.number().optional(),
});

/**
 * Create role input
 */
export const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  projectId: z.string().optional(), // If provided, creates project-scoped role
  permissions: z.array(permissionSchema).optional().default([]),
});

/**
 * Update role input
 */
export const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  sortOrder: z.string().optional(),
});

/**
 * Get roles input
 */
export const getRolesSchema = z.object({
  projectId: z.string().optional(), // Get roles for a specific project
  scope: roleScopeSchema.optional(), // Filter by scope
  includePermissions: z.boolean().optional().default(false),
  includeMemberCount: z.boolean().optional().default(false),
});

// =====================================================
// ROLE PERMISSION SCHEMAS
// =====================================================

/**
 * Add permission to role
 */
export const addRolePermissionSchema = z.object({
  roleId: z.string(),
  permission: permissionSchema,
});

/**
 * Remove permission from role
 */
export const removeRolePermissionSchema = z.object({
  roleId: z.string(),
  permission: permissionSchema,
});

/**
 * Set all permissions for a role
 */
export const setRolePermissionsSchema = z.object({
  roleId: z.string(),
  permissions: z.array(permissionSchema),
});

/**
 * Get role permissions
 */
export const getRolePermissionsSchema = z.object({
  roleId: z.string(),
});

// =====================================================
// ROLE MEMBER SCHEMAS
// =====================================================

/**
 * Role member response schema
 */
export const roleMemberSchema = z.object({
  id: z.string(),
  projectId: z.string().nullable(),
  roleId: z.string(),
  userId: z.string(),
  grantedBy: z.string().nullable(),
  createdAt: z.date(),
  user: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
      email: z.string(),
      image: z.string().nullable(),
    })
    .optional(),
  role: projectRoleSchema.optional(),
});

/**
 * Add member to role
 */
export const addRoleMemberSchema = z.object({
  projectId: z.string().optional(), // Required for project roles
  roleId: z.string(),
  userId: z.string(),
});

/**
 * Remove member from role
 */
export const removeRoleMemberSchema = z.object({
  projectId: z.string().optional(),
  roleId: z.string(),
  userId: z.string(),
});

/**
 * Get role members
 */
export const getRoleMembersSchema = z.object({
  roleId: z.string(),
  projectId: z.string().optional(),
});

/**
 * Get user roles
 */
export const getUserRolesSchema = z.object({
  userId: z.string(),
  projectId: z.string().optional(), // If provided, get roles for specific project
});

/**
 * Get project members (all users with any role in project)
 */
export const getProjectMembersSchema = z.object({
  projectId: z.string(),
  roleId: z.string().optional(), // Filter by specific role
});

// =====================================================
// PERMISSION CHECK SCHEMAS
// =====================================================

/**
 * Check single permission
 */
export const checkPermissionSchema = z.object({
  userId: z.string(),
  permission: permissionSchema,
  projectId: z.string().optional(), // Required for project permissions
});

/**
 * Check multiple permissions
 */
export const checkPermissionsSchema = z.object({
  userId: z.string(),
  permissions: z.array(permissionSchema),
  projectId: z.string().optional(),
});

/**
 * Check permission response
 */
export const checkPermissionResponseSchema = z.object({
  hasPermission: z.boolean(),
  permission: permissionSchema,
  grantedVia: z.string().optional(), // Role name that granted permission
});

/**
 * Get user permissions for a project
 */
export const getUserPermissionsSchema = z.object({
  userId: z.string(),
  projectId: z.string().optional(),
});

// =====================================================
// PERMISSION SCHEME SCHEMAS
// =====================================================

/**
 * Permission scheme response
 */
export const permissionSchemeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isDefault: z.boolean(),
  isSystem: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  roleTemplates: z
    .array(
      z.object({
        id: z.string(),
        roleName: z.string(),
        roleDescription: z.string().nullable(),
        permissions: z.array(permissionSchema),
        sortOrder: z.string(),
      }),
    )
    .optional(),
});

/**
 * Create permission scheme
 */
export const createPermissionSchemeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isDefault: z.boolean().optional().default(false),
  roleTemplates: z
    .array(
      z.object({
        roleName: z.string().min(1).max(100),
        roleDescription: z.string().max(500).optional(),
        permissions: z.array(permissionSchema),
        sortOrder: z.string().optional(),
      }),
    )
    .optional(),
});

/**
 * Update permission scheme
 */
export const updatePermissionSchemeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isDefault: z.boolean().optional(),
});

/**
 * Apply permission scheme to project
 */
export const applyPermissionSchemeSchema = z.object({
  projectId: z.string(),
  schemeId: z.string(),
});

// =====================================================
// TYPE EXPORTS
// =====================================================

export type Permission = z.infer<typeof permissionSchema>;
export type RoleScope = z.infer<typeof roleScopeSchema>;
export type ProjectRole = z.infer<typeof projectRoleSchema>;
export type CreateRole = z.infer<typeof createRoleSchema>;
export type UpdateRole = z.infer<typeof updateRoleSchema>;
export type GetRoles = z.infer<typeof getRolesSchema>;

export type AddRolePermission = z.infer<typeof addRolePermissionSchema>;
export type RemoveRolePermission = z.infer<typeof removeRolePermissionSchema>;
export type SetRolePermissions = z.infer<typeof setRolePermissionsSchema>;
export type GetRolePermissions = z.infer<typeof getRolePermissionsSchema>;

export type RoleMember = z.infer<typeof roleMemberSchema>;
export type AddRoleMember = z.infer<typeof addRoleMemberSchema>;
export type RemoveRoleMember = z.infer<typeof removeRoleMemberSchema>;
export type GetRoleMembers = z.infer<typeof getRoleMembersSchema>;
export type GetUserRoles = z.infer<typeof getUserRolesSchema>;
export type GetProjectMembers = z.infer<typeof getProjectMembersSchema>;

export type CheckPermission = z.infer<typeof checkPermissionSchema>;
export type CheckPermissions = z.infer<typeof checkPermissionsSchema>;
export type CheckPermissionResponse = z.infer<
  typeof checkPermissionResponseSchema
>;
export type GetUserPermissions = z.infer<typeof getUserPermissionsSchema>;

export type PermissionScheme = z.infer<typeof permissionSchemeSchema>;
export type CreatePermissionScheme = z.infer<
  typeof createPermissionSchemeSchema
>;
export type UpdatePermissionScheme = z.infer<
  typeof updatePermissionSchemeSchema
>;
export type ApplyPermissionScheme = z.infer<typeof applyPermissionSchemeSchema>;
