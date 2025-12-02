-- Migration: Permission scheme dynamic holders
-- Part of Phase 6.8: Permission Scheme Improvements

-- =============================================================================
-- DYNAMIC PERMISSION HOLDERS
-- Allows granting permissions to dynamic entities like:
-- - Current Assignee
-- - Reporter  
-- - Project Lead
-- - Component Lead
-- - Group members
-- =============================================================================

-- Enum for holder types
DO $$ BEGIN
  CREATE TYPE permission_holder_type AS ENUM (
    'user',           -- Specific user
    'group',          -- All members of a group
    'project_role',   -- Members of a project role
    'current_assignee', -- Dynamic: whoever is assigned to the issue
    'reporter',       -- Dynamic: whoever reported the issue
    'project_lead',   -- Dynamic: project lead
    'component_lead', -- Dynamic: component lead (if component assigned)
    'anyone'          -- Any logged-in user
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Table for permission grants with dynamic holders
CREATE TABLE IF NOT EXISTS permission_scheme_grants (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  
  -- Which scheme this grant belongs to
  scheme_id text NOT NULL REFERENCES permission_schemes(id) ON DELETE CASCADE,
  
  -- The permission being granted
  permission text NOT NULL,
  
  -- Type of holder (user, group, role, or dynamic)
  holder_type permission_holder_type NOT NULL,
  
  -- Holder ID (user_id, group_id, or role_id - NULL for dynamic holders)
  holder_id text,
  
  -- For group holders
  group_id text REFERENCES groups(id) ON DELETE CASCADE,
  
  -- For project role holders
  role_id text REFERENCES project_roles(id) ON DELETE CASCADE,
  
  created_at timestamp NOT NULL DEFAULT now(),
  
  -- Unique: one grant per scheme+permission+holder combination
  CONSTRAINT permission_scheme_grants_unique 
    UNIQUE (scheme_id, permission, holder_type, COALESCE(holder_id, ''), COALESCE(group_id, ''), COALESCE(role_id, ''))
);

-- Indexes for efficient lookup
CREATE INDEX IF NOT EXISTS permission_scheme_grants_scheme_idx 
  ON permission_scheme_grants (scheme_id);
CREATE INDEX IF NOT EXISTS permission_scheme_grants_permission_idx 
  ON permission_scheme_grants (permission);
CREATE INDEX IF NOT EXISTS permission_scheme_grants_holder_type_idx 
  ON permission_scheme_grants (holder_type);

-- =============================================================================
-- LINK PROJECTS TO PERMISSION SCHEMES
-- =============================================================================

CREATE TABLE IF NOT EXISTS project_permission_schemes (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scheme_id text NOT NULL REFERENCES permission_schemes(id) ON DELETE RESTRICT,
  created_at timestamp NOT NULL DEFAULT now(),
  
  CONSTRAINT project_permission_schemes_unique UNIQUE (project_id)
);

CREATE INDEX IF NOT EXISTS project_permission_schemes_scheme_idx 
  ON project_permission_schemes (scheme_id);

-- =============================================================================
-- HELPER FUNCTION: Check if user has permission with dynamic holders
-- =============================================================================

CREATE OR REPLACE FUNCTION check_permission_with_holders(
  p_user_id text,
  p_project_id text,
  p_permission text,
  p_issue_id text DEFAULT NULL
) RETURNS boolean AS $$
DECLARE
  v_scheme_id text;
  v_has_permission boolean := false;
  v_issue_assignee_id text;
  v_issue_reporter_id text;
  v_project_lead_id text;
  v_component_lead_id text;
BEGIN
  -- Get the permission scheme for the project
  SELECT scheme_id INTO v_scheme_id
  FROM project_permission_schemes
  WHERE project_id = p_project_id;
  
  -- If no scheme, use default
  IF v_scheme_id IS NULL THEN
    SELECT id INTO v_scheme_id
    FROM permission_schemes
    WHERE is_default = true
    LIMIT 1;
  END IF;
  
  -- No scheme found at all
  IF v_scheme_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get issue-specific data if issue_id provided
  IF p_issue_id IS NOT NULL THEN
    SELECT assignee_id, reporter_id INTO v_issue_assignee_id, v_issue_reporter_id
    FROM issues WHERE id = p_issue_id;
  END IF;
  
  -- Get project lead
  SELECT lead_id INTO v_project_lead_id
  FROM projects WHERE id = p_project_id;
  
  -- Check all grant types
  SELECT EXISTS (
    SELECT 1 FROM permission_scheme_grants g
    WHERE g.scheme_id = v_scheme_id
      AND g.permission = p_permission
      AND (
        -- Direct user grant
        (g.holder_type = 'user' AND g.holder_id = p_user_id)
        -- Group membership
        OR (g.holder_type = 'group' AND EXISTS (
          SELECT 1 FROM user_groups ug 
          WHERE ug.user_id = p_user_id AND ug.group_id = g.group_id
        ))
        -- Project role
        OR (g.holder_type = 'project_role' AND EXISTS (
          SELECT 1 FROM project_role_members prm
          WHERE prm.project_id = p_project_id 
            AND prm.user_id = p_user_id 
            AND prm.role_id = g.role_id
        ))
        -- Current assignee (dynamic)
        OR (g.holder_type = 'current_assignee' AND v_issue_assignee_id = p_user_id)
        -- Reporter (dynamic)
        OR (g.holder_type = 'reporter' AND v_issue_reporter_id = p_user_id)
        -- Project lead (dynamic)
        OR (g.holder_type = 'project_lead' AND v_project_lead_id = p_user_id)
        -- Anyone (logged in)
        OR (g.holder_type = 'anyone')
      )
  ) INTO v_has_permission;
  
  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SEED DEFAULT GRANTS FOR DEFAULT SCHEME
-- =============================================================================

-- This should be run after permission_schemes has a default scheme
-- INSERT INTO permission_scheme_grants (scheme_id, permission, holder_type) VALUES
-- ((SELECT id FROM permission_schemes WHERE is_default = true), 'issue:view', 'anyone'),
-- ((SELECT id FROM permission_schemes WHERE is_default = true), 'issue:edit_own', 'reporter'),
-- ((SELECT id FROM permission_schemes WHERE is_default = true), 'issue:edit', 'current_assignee'),
-- etc.
