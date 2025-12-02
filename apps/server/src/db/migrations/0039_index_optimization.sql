-- Migration: Index optimization for audit fields and common queries
-- Part of Phase 3.3: Index Optimization

-- =============================================================================
-- AUDIT FIELD INDEXES
-- These indexes support queries filtering by who created/updated records
-- =============================================================================

-- Projects
CREATE INDEX IF NOT EXISTS projects_created_by_idx ON projects (created_by);
CREATE INDEX IF NOT EXISTS projects_updated_by_idx ON projects (updated_by);

-- Workflows
CREATE INDEX IF NOT EXISTS workflows_created_by_idx ON workflows (created_by);
CREATE INDEX IF NOT EXISTS workflows_updated_by_idx ON workflows (updated_by);

-- Statuses
CREATE INDEX IF NOT EXISTS statuses_created_by_idx ON statuses (created_by);
CREATE INDEX IF NOT EXISTS statuses_updated_by_idx ON statuses (updated_by);

-- Resolutions
CREATE INDEX IF NOT EXISTS resolutions_created_by_idx ON resolutions (created_by);
CREATE INDEX IF NOT EXISTS resolutions_updated_by_idx ON resolutions (updated_by);

-- Issue Types
CREATE INDEX IF NOT EXISTS issue_types_created_by_idx ON issue_types (created_by);
CREATE INDEX IF NOT EXISTS issue_types_updated_by_idx ON issue_types (updated_by);

-- Fields
CREATE INDEX IF NOT EXISTS fields_created_by_idx ON fields (created_by);
CREATE INDEX IF NOT EXISTS fields_updated_by_idx ON fields (updated_by);

-- Components
CREATE INDEX IF NOT EXISTS components_created_by_idx ON components (created_by);
CREATE INDEX IF NOT EXISTS components_updated_by_idx ON components (updated_by);

-- Labels
CREATE INDEX IF NOT EXISTS labels_created_by_idx ON labels (created_by);
CREATE INDEX IF NOT EXISTS labels_updated_by_idx ON labels (updated_by);

-- Versions
CREATE INDEX IF NOT EXISTS versions_created_by_idx ON versions (created_by);
CREATE INDEX IF NOT EXISTS versions_updated_by_idx ON versions (updated_by);

-- Boards
CREATE INDEX IF NOT EXISTS boards_created_by_idx ON boards (created_by);
CREATE INDEX IF NOT EXISTS boards_updated_by_idx ON boards (updated_by);

-- Board Columns
CREATE INDEX IF NOT EXISTS board_columns_updated_by_idx ON board_columns (updated_by);

-- Filters
CREATE INDEX IF NOT EXISTS filters_updated_by_idx ON filters (updated_by);

-- Issues
CREATE INDEX IF NOT EXISTS issues_updated_by_idx ON issues (updated_by);

-- Issue Comments
CREATE INDEX IF NOT EXISTS issue_comments_updated_by_idx ON issue_comments (updated_by);

-- Sprints
CREATE INDEX IF NOT EXISTS sprints_updated_by_idx ON sprints (updated_by);

-- =============================================================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- These support frequently used query patterns
-- =============================================================================

-- Issues: Project + Assignee (team workload view)
CREATE INDEX IF NOT EXISTS issues_project_assignee_idx ON issues (project_id, assignee_id);

-- Issues: Project + Created (timeline view)
CREATE INDEX IF NOT EXISTS issues_project_created_at_idx ON issues (project_id, created_at);

-- Issues: Project + Due Date (deadline tracking)
CREATE INDEX IF NOT EXISTS issues_project_due_date_idx ON issues (project_id, due_date);

-- Issues: Assignee + Status (user's active work)
CREATE INDEX IF NOT EXISTS issues_assignee_status_idx ON issues (assignee_id, status_id);

-- Issues: Project + Priority (prioritized backlog)
CREATE INDEX IF NOT EXISTS issues_project_priority_idx ON issues (project_id, priority);

-- Issues: Resolution + Resolved At (completed work reports)
CREATE INDEX IF NOT EXISTS issues_resolution_resolved_idx ON issues (resolution_id, resolved_at)
  WHERE resolution_id IS NOT NULL;

-- Change Groups: Issue + Action (specific action history)
CREATE INDEX IF NOT EXISTS change_groups_issue_action_idx ON change_groups (issue_id, action);

-- Sprints: Project + Sort Order (sprint list)
CREATE INDEX IF NOT EXISTS sprints_project_sort_idx ON sprints (project_id, sort_order);

-- Issue Labels: Composite for label filter queries
CREATE INDEX IF NOT EXISTS issue_labels_label_issue_idx ON issue_labels (label_id, issue_id);

-- =============================================================================
-- TEXT SEARCH INDEXES (GIN for ILIKE optimization)
-- These significantly speed up text search queries
-- =============================================================================

-- Issues: Summary text search
CREATE INDEX IF NOT EXISTS issues_summary_gin_idx ON issues USING gin (summary gin_trgm_ops);

-- Issues: Description text search (if frequently searched)
-- Note: Only create if pg_trgm extension is enabled
-- CREATE INDEX IF NOT EXISTS issues_description_gin_idx ON issues USING gin (description gin_trgm_ops);

-- Projects: Name text search
CREATE INDEX IF NOT EXISTS projects_name_gin_idx ON projects USING gin (name gin_trgm_ops);

-- =============================================================================
-- PARTIAL INDEXES FOR COMMON FILTERS
-- These are highly efficient for boolean/status filters
-- =============================================================================

-- Active (non-archived) projects
CREATE INDEX IF NOT EXISTS projects_active_idx ON projects (id) WHERE is_archived = false;

-- Open (unresolved) issues
CREATE INDEX IF NOT EXISTS issues_open_idx ON issues (project_id, status_id) 
  WHERE resolution_id IS NULL;

-- Active sprints per project
CREATE INDEX IF NOT EXISTS sprints_active_idx ON sprints (project_id) 
  WHERE status = 'active';

-- =============================================================================
-- NOTE: These indexes may require the pg_trgm extension for GIN indexes
-- Run: CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- =============================================================================
