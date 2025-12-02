-- =============================================================================
-- Migration: Add Audit Fields (createdBy, updatedBy)
-- Phase 3.2: Data Model Cleanup - Audit-ready database
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PROJECTS - Add audit fields
-- -----------------------------------------------------------------------------
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_by TEXT REFERENCES users(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- WORKFLOWS - Add audit fields
-- -----------------------------------------------------------------------------
ALTER TABLE workflows
ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_by TEXT REFERENCES users(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- STATUSES - Add audit fields
-- -----------------------------------------------------------------------------
ALTER TABLE statuses
ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_by TEXT REFERENCES users(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- RESOLUTIONS - Add audit fields
-- -----------------------------------------------------------------------------
ALTER TABLE resolutions
ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_by TEXT REFERENCES users(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- ISSUE_TYPES - Add audit fields and timestamps
-- -----------------------------------------------------------------------------
ALTER TABLE issue_types
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_by TEXT REFERENCES users(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- FIELDS - Add audit fields
-- -----------------------------------------------------------------------------
ALTER TABLE fields
ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_by TEXT REFERENCES users(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- COMPONENTS - Add audit fields
-- -----------------------------------------------------------------------------
ALTER TABLE components
ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_by TEXT REFERENCES users(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- LABELS - Add audit fields
-- -----------------------------------------------------------------------------
ALTER TABLE labels
ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_by TEXT REFERENCES users(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- VERSIONS - Add audit fields
-- -----------------------------------------------------------------------------
ALTER TABLE versions
ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_by TEXT REFERENCES users(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- SPRINTS - Add updatedBy (already has createdBy via created_by semantic)
-- -----------------------------------------------------------------------------
ALTER TABLE sprints
ADD COLUMN IF NOT EXISTS updated_by TEXT REFERENCES users(id) ON DELETE SET NULL;

-- Rename goal column to created_by if it doesn't exist
-- Note: sprints already have a 'goal' field which is different
ALTER TABLE sprints
ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES users(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- BOARDS - Add audit fields
-- -----------------------------------------------------------------------------
ALTER TABLE boards
ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_by TEXT REFERENCES users(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- BOARD_COLUMNS - Add updatedBy
-- -----------------------------------------------------------------------------
ALTER TABLE board_columns
ADD COLUMN IF NOT EXISTS updated_by TEXT REFERENCES users(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- BOARD_QUICK_FILTERS - Add updatedBy
-- -----------------------------------------------------------------------------
ALTER TABLE board_quick_filters
ADD COLUMN IF NOT EXISTS updated_by TEXT REFERENCES users(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- FILTERS (Saved Filters) - Add updatedBy
-- -----------------------------------------------------------------------------
ALTER TABLE filters
ADD COLUMN IF NOT EXISTS updated_by TEXT REFERENCES users(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- WEBHOOKS - Add updatedBy
-- -----------------------------------------------------------------------------
ALTER TABLE webhooks
ADD COLUMN IF NOT EXISTS updated_by TEXT REFERENCES users(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- AUTOMATION_RULES - Add audit fields
-- -----------------------------------------------------------------------------
ALTER TABLE automation_rules
ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_by TEXT REFERENCES users(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- NOTIFICATION_SCHEMES - Add audit fields
-- -----------------------------------------------------------------------------
ALTER TABLE notification_schemes
ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_by TEXT REFERENCES users(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- ISSUES - Add updatedBy (already has reporterId as createdBy semantic)
-- -----------------------------------------------------------------------------
ALTER TABLE issues
ADD COLUMN IF NOT EXISTS updated_by TEXT REFERENCES users(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- COMMENTS - Add updatedBy (already has userId as createdBy)
-- -----------------------------------------------------------------------------
ALTER TABLE issue_comments
ADD COLUMN IF NOT EXISTS updated_by TEXT REFERENCES users(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- ATTACHMENTS - Add updatedBy
-- -----------------------------------------------------------------------------
ALTER TABLE issue_attachments
ADD COLUMN IF NOT EXISTS updated_by TEXT REFERENCES users(id) ON DELETE SET NULL;

-- =============================================================================
-- INDEXES for audit columns (for querying "changes by user")
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_updated_by ON projects(updated_by);
CREATE INDEX IF NOT EXISTS idx_issues_updated_by ON issues(updated_by);
CREATE INDEX IF NOT EXISTS idx_comments_updated_by ON issue_comments(updated_by);
CREATE INDEX IF NOT EXISTS idx_workflows_created_by ON workflows(created_by);
CREATE INDEX IF NOT EXISTS idx_automation_rules_created_by ON automation_rules(created_by);
