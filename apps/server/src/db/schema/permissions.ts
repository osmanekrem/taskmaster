import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

import { user } from './auth';
import { projects } from './projects';

// =====================================================
// PERMISSION TYPES
// =====================================================

/**
 * All available permissions in the system
 * Granular permission model similar to Jira
 */
export const permissions = [
  // Project permissions
  'project:view', // View project details
  'project:edit', // Edit project settings
  'project:delete', // Delete project
  'project:manage_members', // Add/remove members
  'project:manage_roles', // Create/edit project roles

  // Issue permissions
  'issue:create', // Create new issues
  'issue:view', // View issues
  'issue:edit', // Edit any issue
  'issue:edit_own', // Edit own issues only
  'issue:delete', // Delete any issue
  'issue:delete_own', // Delete own issues only
  'issue:assign', // Assign issues to users
  'issue:transition', // Change issue status
  'issue:link', // Link issues together
  'issue:move', // Move issue to another project

  // Comment permissions
  'comment:create', // Add comments
  'comment:edit', // Edit any comment
  'comment:edit_own', // Edit own comments only
  'comment:delete', // Delete any comment
  'comment:delete_own', // Delete own comments only

  // Attachment permissions
  'attachment:create', // Upload attachments
  'attachment:delete', // Delete any attachment
  'attachment:delete_own', // Delete own attachments only

  // Watcher permissions
  'watcher:manage', // Add/remove watchers

  // Workflow permissions
  'workflow:view', // View workflow
  'workflow:edit', // Edit workflow

  // Sprint permissions (for future)
  'sprint:view', // View sprints
  'sprint:create', // Create sprints
  'sprint:edit', // Edit sprints
  'sprint:delete', // Delete sprints
  'sprint:manage_issues', // Add/remove issues from sprint

  // Board permissions (for future)
  'board:view', // View boards
  'board:create', // Create boards
  'board:edit', // Edit boards
  'board:delete', // Delete boards

  // Filter permissions
  'filter:view', // View filters
  'filter:create', // Create filters
  'filter:edit', // Edit own filters
  'filter:delete', // Delete own filters

  // Worklog/Time Tracking permissions
  'worklog:view', // View worklogs
  'worklog:create', // Create worklogs (log work)
  'worklog:edit', // Edit own worklogs
  'worklog:edit_all', // Edit all worklogs (admin)
  'worklog:delete', // Delete own worklogs
  'worklog:delete_all', // Delete all worklogs (admin)

  // Configuration view permissions
  'status:view', // View statuses and resolutions
  'issue_type:view', // View issue types
  'field:view', // View fields
  'user:view', // View users

  // Admin permissions
  'admin:manage_users', // System-wide user management
  'admin:manage_projects', // System-wide project management
  'admin:manage_workflows', // System-wide workflow management
  'admin:manage_issue_types', // System-wide issue type management
  'admin:manage_fields', // System-wide field management
  'admin:manage_statuses', // System-wide status management
  'admin:manage_resolutions', // System-wide resolution management
  'admin:manage_screens', // System-wide screen management
  'admin:view_audit_log', // View audit logs

  // Automation permissions
  'automation:view', // View automation rules
  'automation:create', // Create automation rules
  'automation:edit', // Edit automation rules
  'automation:delete', // Delete automation rules
  'automation:execute', // Manually execute automation rules
] as const;

export type Permission = (typeof permissions)[number];

// =====================================================
// ENUMS
// =====================================================

/**
 * Scope of a role
 * - global: System-wide role (e.g., System Admin)
 * - project: Project-specific role
 */
export const roleScopeEnum = pgEnum('role_scope', ['global', 'project']);

// =====================================================
// PROJECT ROLES
// =====================================================

/**
 * Role definitions
 * Can be global (system-wide) or project-specific
 */
export const projectRoles = pgTable(
  'project_roles',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    /**
     * Role name (e.g., "Administrator", "Developer", "Viewer")
     */
    name: text('name').notNull(),

    /**
     * Role description
     */
    description: text('description'),

    /**
     * Scope of this role
     */
    scope: roleScopeEnum('scope').notNull().default('project'),

    /**
     * For project-scoped roles, which project this role belongs to
     * Null for global roles
     */
    projectId: text('project_id').references(() => projects.id, {
      onDelete: 'cascade',
    }),

    /**
     * Is this a system-defined role that cannot be deleted?
     */
    isSystem: boolean('is_system').notNull().default(false),

    /**
     * Display order for UI
     */
    sortOrder: text('sort_order').notNull().default('0'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    // Find roles for a project (including global roles)
    index('project_roles_project_id_idx').on(table.projectId),
    // Find global roles
    index('project_roles_scope_idx').on(table.scope),
    // Unique role name per project (or globally for global roles)
    unique('project_roles_name_unique').on(table.name, table.projectId),
  ],
);

export const projectRolesRelations = relations(
  projectRoles,
  ({ one, many }) => ({
    project: one(projects, {
      fields: [projectRoles.projectId],
      references: [projects.id],
    }),
    members: many(projectRoleMembers),
    permissions: many(rolePermissions),
  }),
);

// =====================================================
// ROLE PERMISSIONS
// =====================================================

/**
 * Permissions granted to a role
 */
export const rolePermissions = pgTable(
  'role_permissions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    /**
     * The role this permission belongs to
     */
    roleId: text('role_id')
      .notNull()
      .references(() => projectRoles.id, { onDelete: 'cascade' }),

    /**
     * The permission granted
     */
    permission: text('permission').notNull().$type<Permission>(),

    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    // Find all permissions for a role
    index('role_permissions_role_id_idx').on(table.roleId),
    // Each permission can only be granted once per role
    unique('role_permissions_unique').on(table.roleId, table.permission),
  ],
);

export const rolePermissionsRelations = relations(
  rolePermissions,
  ({ one }) => ({
    role: one(projectRoles, {
      fields: [rolePermissions.roleId],
      references: [projectRoles.id],
    }),
  }),
);

// =====================================================
// PROJECT ROLE MEMBERS
// =====================================================

/**
 * Users assigned to roles in projects
 */
export const projectRoleMembers = pgTable(
  'project_role_members',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    /**
     * The project this membership is for
     * Null for global role memberships
     */
    projectId: text('project_id').references(() => projects.id, {
      onDelete: 'cascade',
    }),

    /**
     * The role assigned
     */
    roleId: text('role_id')
      .notNull()
      .references(() => projectRoles.id, { onDelete: 'cascade' }),

    /**
     * The user who has this role
     */
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    /**
     * Who granted this role
     */
    grantedBy: text('granted_by').references(() => user.id, {
      onDelete: 'set null',
    }),

    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    // Find all members of a project
    index('project_role_members_project_id_idx').on(table.projectId),
    // Find all roles of a user
    index('project_role_members_user_id_idx').on(table.userId),
    // Find all members with a specific role
    index('project_role_members_role_id_idx').on(table.roleId),
    // A user can only have each role once per project
    unique('project_role_members_unique').on(
      table.projectId,
      table.roleId,
      table.userId,
    ),
  ],
);

export const projectRoleMembersRelations = relations(
  projectRoleMembers,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectRoleMembers.projectId],
      references: [projects.id],
    }),
    role: one(projectRoles, {
      fields: [projectRoleMembers.roleId],
      references: [projectRoles.id],
    }),
    user: one(user, {
      fields: [projectRoleMembers.userId],
      references: [user.id],
      relationName: 'roleMember',
    }),
    grantedByUser: one(user, {
      fields: [projectRoleMembers.grantedBy],
      references: [user.id],
      relationName: 'roleGranter',
    }),
  }),
);

// =====================================================
// PERMISSION SCHEMES (Optional - for default templates)
// =====================================================

/**
 * Permission scheme templates
 * Can be applied to projects to set up default roles and permissions
 */
export const permissionSchemes = pgTable('permission_schemes', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),

  /**
   * Scheme name (e.g., "Default Scheme", "Restricted Scheme")
   */
  name: text('name').notNull().unique(),

  /**
   * Description
   */
  description: text('description'),

  /**
   * Is this the default scheme for new projects?
   */
  isDefault: boolean('is_default').notNull().default(false),

  /**
   * Is this a system scheme that cannot be deleted?
   */
  isSystem: boolean('is_system').notNull().default(false),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const permissionSchemesRelations = relations(
  permissionSchemes,
  ({ many }) => ({
    roleTemplates: many(permissionSchemeRoles),
  }),
);

/**
 * Role templates in a permission scheme
 */
export const permissionSchemeRoles = pgTable(
  'permission_scheme_roles',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    /**
     * The scheme this template belongs to
     */
    schemeId: text('scheme_id')
      .notNull()
      .references(() => permissionSchemes.id, { onDelete: 'cascade' }),

    /**
     * Role name template
     */
    roleName: text('role_name').notNull(),

    /**
     * Role description template
     */
    roleDescription: text('role_description'),

    /**
     * Permissions for this role template (stored as JSON array)
     */
    permissions: text('permissions')
      .array()
      .notNull()
      .default([])
      .$type<Permission[]>(),

    /**
     * Display order
     */
    sortOrder: text('sort_order').notNull().default('0'),

    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('permission_scheme_roles_scheme_id_idx').on(table.schemeId),
    unique('permission_scheme_roles_unique').on(table.schemeId, table.roleName),
  ],
);

export const permissionSchemeRolesRelations = relations(
  permissionSchemeRoles,
  ({ one }) => ({
    scheme: one(permissionSchemes, {
      fields: [permissionSchemeRoles.schemeId],
      references: [permissionSchemes.id],
    }),
  }),
);

// =====================================================
// DEFAULT ROLE CONFIGURATIONS
// =====================================================

/**
 * Default permissions for common roles
 * Used when creating new projects or setting up permission schemes
 */
export const DEFAULT_ROLE_PERMISSIONS = {
  /**
   * Project Administrator - Full access to project
   */
  administrator: [
    'project:view',
    'project:edit',
    'project:delete',
    'project:manage_members',
    'project:manage_roles',
    'issue:create',
    'issue:view',
    'issue:edit',
    'issue:delete',
    'issue:assign',
    'issue:transition',
    'issue:link',
    'issue:move',
    'comment:create',
    'comment:edit',
    'comment:delete',
    'attachment:create',
    'attachment:delete',
    'watcher:manage',
    'workflow:view',
    'workflow:edit',
    'sprint:view',
    'sprint:create',
    'sprint:edit',
    'sprint:delete',
    'sprint:manage_issues',
    'board:view',
    'board:create',
    'board:edit',
    'board:delete',
  ] as Permission[],

  /**
   * Developer - Can work on issues
   */
  developer: [
    'project:view',
    'issue:create',
    'issue:view',
    'issue:edit_own',
    'issue:assign',
    'issue:transition',
    'issue:link',
    'comment:create',
    'comment:edit_own',
    'comment:delete_own',
    'attachment:create',
    'attachment:delete_own',
    'watcher:manage',
    'workflow:view',
    'sprint:view',
    'sprint:manage_issues',
    'board:view',
  ] as Permission[],

  /**
   * Viewer - Read-only access
   */
  viewer: [
    'project:view',
    'issue:view',
    'comment:create',
    'comment:edit_own',
    'comment:delete_own',
    'workflow:view',
    'sprint:view',
    'board:view',
  ] as Permission[],

  /**
   * System Administrator - Global permissions
   */
  systemAdmin: [
    'admin:manage_users',
    'admin:manage_projects',
    'admin:manage_workflows',
    'admin:manage_issue_types',
    'admin:manage_fields',
    'admin:manage_screens',
    'admin:view_audit_log',
    'automation:view',
    'automation:create',
    'automation:edit',
    'automation:delete',
    'automation:execute',
  ] as Permission[],
} as const;

// =====================================================
// TYPE EXPORTS
// =====================================================

export type RoleScope = 'global' | 'project';
