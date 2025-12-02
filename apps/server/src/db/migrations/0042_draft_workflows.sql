-- Migration: Draft workflow support and user_in_group condition
-- Part of Phase 6: Jira-Level Schemes

-- =============================================================================
-- DRAFT WORKFLOW SUPPORT
-- Allows editing workflow copies without affecting active issues
-- =============================================================================

-- Add draft-related columns to workflows table
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS is_draft boolean DEFAULT false;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS draft_of text REFERENCES workflows(id) ON DELETE CASCADE;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS published_at timestamp;

-- Index for finding drafts of a workflow
CREATE INDEX IF NOT EXISTS workflows_draft_of_idx ON workflows (draft_of) WHERE draft_of IS NOT NULL;

-- Index for finding active (non-draft) workflows
CREATE INDEX IF NOT EXISTS workflows_active_idx ON workflows (id) WHERE is_draft = false;

-- =============================================================================
-- WORKFLOW CONDITION TYPES UPDATE
-- Add user_in_group to the condition type enum if it doesn't exist
-- =============================================================================

-- Note: The condition type is stored as JSONB in workflow_transitions.conditions
-- No schema change needed, just documentation that 'user_in_group' is now supported

-- =============================================================================
-- HELPER FUNCTIONS FOR DRAFT WORKFLOWS
-- =============================================================================

-- Function to create a draft copy of a workflow
CREATE OR REPLACE FUNCTION create_workflow_draft(p_workflow_id text, p_user_id text)
RETURNS text AS $$
DECLARE
  v_draft_id text;
  v_workflow_name text;
BEGIN
  -- Check if a draft already exists
  SELECT id INTO v_draft_id 
  FROM workflows 
  WHERE draft_of = p_workflow_id AND is_draft = true;
  
  IF v_draft_id IS NOT NULL THEN
    RETURN v_draft_id; -- Return existing draft
  END IF;
  
  -- Get the workflow name
  SELECT name INTO v_workflow_name FROM workflows WHERE id = p_workflow_id;
  
  -- Create the draft workflow
  INSERT INTO workflows (id, name, description, is_default, is_draft, draft_of, created_by, updated_by)
  SELECT 
    gen_random_uuid()::text,
    name || ' (Draft)',
    description,
    false, -- drafts are never default
    true,
    p_workflow_id,
    p_user_id,
    p_user_id
  FROM workflows 
  WHERE id = p_workflow_id
  RETURNING id INTO v_draft_id;
  
  -- Copy workflow statuses
  INSERT INTO workflow_statuses (id, workflow_id, status_id, is_initial, sort_order)
  SELECT 
    gen_random_uuid()::text,
    v_draft_id,
    status_id,
    is_initial,
    sort_order
  FROM workflow_statuses
  WHERE workflow_id = p_workflow_id;
  
  -- Copy workflow transitions
  INSERT INTO workflow_transitions (id, workflow_id, name, description, from_status_id, to_status_id, conditions, validators, post_functions, screen_id, sort_order)
  SELECT 
    gen_random_uuid()::text,
    v_draft_id,
    name,
    description,
    from_status_id,
    to_status_id,
    conditions,
    validators,
    post_functions,
    screen_id,
    sort_order
  FROM workflow_transitions
  WHERE workflow_id = p_workflow_id;
  
  RETURN v_draft_id;
END;
$$ LANGUAGE plpgsql;

-- Function to publish a draft workflow (replace the original)
CREATE OR REPLACE FUNCTION publish_workflow_draft(p_draft_id text, p_user_id text)
RETURNS text AS $$
DECLARE
  v_original_id text;
  v_draft_name text;
BEGIN
  -- Get the original workflow id
  SELECT draft_of, name INTO v_original_id, v_draft_name
  FROM workflows 
  WHERE id = p_draft_id AND is_draft = true;
  
  IF v_original_id IS NULL THEN
    RAISE EXCEPTION 'Workflow % is not a draft or does not exist', p_draft_id;
  END IF;
  
  -- Delete old statuses and transitions from original (cascade will handle transitions)
  DELETE FROM workflow_statuses WHERE workflow_id = v_original_id;
  DELETE FROM workflow_transitions WHERE workflow_id = v_original_id;
  
  -- Copy statuses from draft to original
  INSERT INTO workflow_statuses (id, workflow_id, status_id, is_initial, sort_order)
  SELECT 
    gen_random_uuid()::text,
    v_original_id,
    status_id,
    is_initial,
    sort_order
  FROM workflow_statuses
  WHERE workflow_id = p_draft_id;
  
  -- Copy transitions from draft to original
  INSERT INTO workflow_transitions (id, workflow_id, name, description, from_status_id, to_status_id, conditions, validators, post_functions, screen_id, sort_order)
  SELECT 
    gen_random_uuid()::text,
    v_original_id,
    name,
    description,
    from_status_id,
    to_status_id,
    conditions,
    validators,
    post_functions,
    screen_id,
    sort_order
  FROM workflow_transitions
  WHERE workflow_id = p_draft_id;
  
  -- Update the original workflow's metadata
  UPDATE workflows 
  SET 
    updated_at = now(),
    updated_by = p_user_id,
    version = version + 1
  WHERE id = v_original_id;
  
  -- Mark the draft as published and delete it
  DELETE FROM workflows WHERE id = p_draft_id;
  
  RETURN v_original_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- USAGE NOTES
-- =============================================================================
-- 
-- To create a draft:
--   SELECT create_workflow_draft('workflow-id', 'user-id');
--
-- To edit a draft:
--   UPDATE workflow_statuses/workflow_transitions WHERE workflow_id = 'draft-id'
--
-- To publish a draft:
--   SELECT publish_workflow_draft('draft-id', 'user-id');
--
-- To discard a draft:
--   DELETE FROM workflows WHERE id = 'draft-id';
-- =============================================================================
