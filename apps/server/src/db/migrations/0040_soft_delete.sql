-- Migration: Soft delete standardization
-- Part of Phase 3.4: Soft Delete Pattern

-- =============================================================================
-- ADD SOFT DELETE COLUMNS TO KEY TABLES
-- Pattern: isDeleted (boolean) + deletedAt (timestamp) + deletedBy (user FK)
-- =============================================================================

-- Issues: Allow recovery of accidentally deleted issues
ALTER TABLE issues ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS deleted_at timestamp;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS deleted_by text REFERENCES "user"(id) ON DELETE SET NULL;

-- Issue Attachments: Track deleted attachments
ALTER TABLE issue_attachments ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE issue_attachments ADD COLUMN IF NOT EXISTS deleted_at timestamp;
ALTER TABLE issue_attachments ADD COLUMN IF NOT EXISTS deleted_by text REFERENCES "user"(id) ON DELETE SET NULL;

-- Issue Comments: Already has isDeleted, add deletedBy
ALTER TABLE issue_comments ADD COLUMN IF NOT EXISTS deleted_by text REFERENCES "user"(id) ON DELETE SET NULL;

-- Worklogs: Track deleted time entries
ALTER TABLE worklogs ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE worklogs ADD COLUMN IF NOT EXISTS deleted_at timestamp;
ALTER TABLE worklogs ADD COLUMN IF NOT EXISTS deleted_by text REFERENCES "user"(id) ON DELETE SET NULL;

-- =============================================================================
-- INDEXES FOR SOFT DELETE QUERIES
-- Partial indexes for efficient "active records" queries
-- =============================================================================

-- Issues: Active (non-deleted) issues
CREATE INDEX IF NOT EXISTS issues_not_deleted_idx ON issues (project_id, status_id) 
  WHERE is_deleted = false OR is_deleted IS NULL;

-- Issues: Deleted issues (for trash/recovery UI)
CREATE INDEX IF NOT EXISTS issues_deleted_idx ON issues (project_id, deleted_at) 
  WHERE is_deleted = true;

-- Issue Comments: Active comments
CREATE INDEX IF NOT EXISTS issue_comments_not_deleted_idx ON issue_comments (issue_id) 
  WHERE is_deleted = false OR is_deleted IS NULL;

-- Issue Attachments: Active attachments
CREATE INDEX IF NOT EXISTS issue_attachments_not_deleted_idx ON issue_attachments (issue_id) 
  WHERE is_deleted = false OR is_deleted IS NULL;

-- Worklogs: Active worklogs
CREATE INDEX IF NOT EXISTS worklogs_not_deleted_idx ON worklogs (issue_id) 
  WHERE is_deleted = false OR is_deleted IS NULL;

-- =============================================================================
-- NOTE: Application code should be updated to:
-- 1. Filter out deleted records by default (WHERE is_deleted = false)
-- 2. Provide admin/trash views that show deleted records
-- 3. Implement restore functionality
-- 4. Schedule permanent deletion (e.g., after 30 days)
-- =============================================================================
