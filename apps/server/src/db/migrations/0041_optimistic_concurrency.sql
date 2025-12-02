-- Migration: Optimistic concurrency control
-- Part of Phase 3.5: Optimistic Concurrency

-- =============================================================================
-- ADD VERSION COLUMN FOR OPTIMISTIC LOCKING
-- Pattern: version starts at 1, incremented on each update
-- Client must send current version, rejected if version mismatch
-- =============================================================================

-- Issues: Most important - concurrent edits common
ALTER TABLE issues ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- Projects: Settings/config changes
ALTER TABLE projects ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- Workflows: Complex edits, avoid conflicts
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- Workflow Transitions: Part of workflow editing
ALTER TABLE workflow_transitions ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- Sprints: Sprint settings changes
ALTER TABLE sprints ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- Comments: Content editing
ALTER TABLE issue_comments ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- Worklogs: Time entry modifications
ALTER TABLE worklogs ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- Boards: Board configuration
ALTER TABLE boards ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- Board Columns: Column configuration
ALTER TABLE board_columns ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- Filters: Filter query modifications
ALTER TABLE filters ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- Automation Rules: Rule editing
ALTER TABLE automation_rules ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- =============================================================================
-- OPTIMISTIC LOCK HELPER FUNCTION
-- Usage: SELECT optimistic_lock_check('issues', 'issue-uuid', 5);
-- Returns true if version matches, raises exception if not
-- =============================================================================

CREATE OR REPLACE FUNCTION optimistic_lock_check(
  p_table_name text,
  p_id text,
  p_expected_version integer
) RETURNS boolean AS $$
DECLARE
  v_current_version integer;
BEGIN
  EXECUTE format('SELECT version FROM %I WHERE id = $1', p_table_name)
  INTO v_current_version
  USING p_id;
  
  IF v_current_version IS NULL THEN
    RAISE EXCEPTION 'Record not found: % in %', p_id, p_table_name;
  END IF;
  
  IF v_current_version != p_expected_version THEN
    RAISE EXCEPTION 'Optimistic lock failed: expected version %, found % for % in %', 
      p_expected_version, v_current_version, p_id, p_table_name
    USING ERRCODE = 'serialization_failure';
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGER FOR AUTO-INCREMENT VERSION ON UPDATE
-- This ensures version is always incremented even if not explicitly set
-- =============================================================================

CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version := COALESCE(OLD.version, 0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with version column
DROP TRIGGER IF EXISTS issues_version_trigger ON issues;
CREATE TRIGGER issues_version_trigger
  BEFORE UPDATE ON issues
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS projects_version_trigger ON projects;
CREATE TRIGGER projects_version_trigger
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS workflows_version_trigger ON workflows;
CREATE TRIGGER workflows_version_trigger
  BEFORE UPDATE ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS sprints_version_trigger ON sprints;
CREATE TRIGGER sprints_version_trigger
  BEFORE UPDATE ON sprints
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS issue_comments_version_trigger ON issue_comments;
CREATE TRIGGER issue_comments_version_trigger
  BEFORE UPDATE ON issue_comments
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS worklogs_version_trigger ON worklogs;
CREATE TRIGGER worklogs_version_trigger
  BEFORE UPDATE ON worklogs
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS boards_version_trigger ON boards;
CREATE TRIGGER boards_version_trigger
  BEFORE UPDATE ON boards
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS filters_version_trigger ON filters;
CREATE TRIGGER filters_version_trigger
  BEFORE UPDATE ON filters
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS automation_rules_version_trigger ON automation_rules;
CREATE TRIGGER automation_rules_version_trigger
  BEFORE UPDATE ON automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

-- =============================================================================
-- USAGE IN APPLICATION CODE:
-- 
-- 1. Read record with version:
--    const issue = await db.select().from(issues).where(eq(issues.id, id));
--    // issue.version = 5
--
-- 2. Update with version check:
--    const updated = await db.update(issues)
--      .set({ summary: 'New title', version: issue.version + 1 })
--      .where(and(eq(issues.id, id), eq(issues.version, issue.version)))
--      .returning();
--    
--    if (updated.length === 0) {
--      throw new ConflictError('Record was modified by another user');
--    }
--
-- 3. Alternative using trigger (version auto-incremented):
--    const updated = await db.update(issues)
--      .set({ summary: 'New title' })
--      .where(and(eq(issues.id, id), eq(issues.version, issue.version)))
--      .returning();
-- =============================================================================
