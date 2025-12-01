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
