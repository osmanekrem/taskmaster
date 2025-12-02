-- Migration: Migrate existing issue_history data to change_groups/change_items
-- This is a data migration that copies legacy history to the normalized tables

-- =============================================================================
-- MIGRATE ISSUE_HISTORY TO CHANGE_GROUPS/CHANGE_ITEMS
-- =============================================================================

-- Step 1: Insert change_groups from issue_history
-- We need to determine the action type from the changes JSON
INSERT INTO change_groups (id, issue_id, user_id, action, created_at)
SELECT 
    gen_random_uuid()::text,
    ih.issue_id,
    ih.user_id,
    CASE 
        WHEN ih.changes::jsonb @> '[{"field": "Status"}]'::jsonb THEN 'transitioned'
        WHEN ih.changes::jsonb @> '[{"field": "status"}]'::jsonb THEN 'transitioned'
        WHEN ih.changes::jsonb @> '[{"field": "Assignee"}]'::jsonb THEN 'assigned'
        WHEN ih.changes::jsonb @> '[{"field": "assignee"}]'::jsonb THEN 'assigned'
        WHEN ih.changes::jsonb @> '[{"field": "Comment"}]'::jsonb THEN 'commented'
        WHEN ih.changes::jsonb @> '[{"field": "comment"}]'::jsonb THEN 'commented'
        WHEN ih.changes::jsonb @? '$[*] ? (@.field like_regex "attachment" flag "i")' THEN 
            CASE 
                WHEN (ih.changes::jsonb->0->>'newValue') IS NOT NULL THEN 'attachment_added'
                ELSE 'attachment_removed'
            END
        WHEN ih.changes::jsonb @? '$[*] ? (@.field like_regex "link" flag "i")' THEN
            CASE 
                WHEN (ih.changes::jsonb->0->>'newValue') IS NOT NULL THEN 'linked'
                ELSE 'unlinked'
            END
        WHEN ih.changes::jsonb @? '$[*] ? (@.field like_regex "worklog" flag "i")' THEN 'worklog_added'
        ELSE 'updated'
    END,
    ih.created_at
FROM issue_history ih
WHERE NOT EXISTS (
    -- Skip if already migrated (based on issue_id, user_id, and created_at)
    SELECT 1 FROM change_groups cg 
    WHERE cg.issue_id = ih.issue_id 
    AND cg.user_id = ih.user_id 
    AND cg.created_at = ih.created_at
);

-- Step 2: Create a temporary mapping table for the migration
CREATE TEMP TABLE IF NOT EXISTS history_to_change_group_map AS
SELECT 
    ih.id as history_id,
    ih.issue_id,
    ih.user_id,
    ih.created_at,
    cg.id as change_group_id
FROM issue_history ih
JOIN change_groups cg ON 
    cg.issue_id = ih.issue_id 
    AND cg.user_id = ih.user_id 
    AND cg.created_at = ih.created_at;

-- Step 3: Insert change_items from the changes JSON array
INSERT INTO change_items (id, change_group_id, field, field_id, field_type, old_string, new_string, old_value, new_value)
SELECT 
    gen_random_uuid()::text,
    m.change_group_id,
    change_elem->>'field',
    change_elem->>'fieldId',
    CASE 
        WHEN change_elem->>'fieldId' IS NOT NULL THEN 'custom'
        ELSE 'system'
    END,
    -- Convert values to strings for display
    CASE 
        WHEN jsonb_typeof(change_elem->'oldValue') = 'string' THEN change_elem->>'oldValue'
        WHEN jsonb_typeof(change_elem->'oldValue') = 'null' THEN NULL
        ELSE (change_elem->'oldValue')::text
    END,
    CASE 
        WHEN jsonb_typeof(change_elem->'newValue') = 'string' THEN change_elem->>'newValue'
        WHEN jsonb_typeof(change_elem->'newValue') = 'null' THEN NULL
        ELSE (change_elem->'newValue')::text
    END,
    -- Raw values (also as strings)
    CASE 
        WHEN jsonb_typeof(change_elem->'oldValue') = 'string' THEN change_elem->>'oldValue'
        WHEN jsonb_typeof(change_elem->'oldValue') = 'null' THEN NULL
        ELSE (change_elem->'oldValue')::text
    END,
    CASE 
        WHEN jsonb_typeof(change_elem->'newValue') = 'string' THEN change_elem->>'newValue'
        WHEN jsonb_typeof(change_elem->'newValue') = 'null' THEN NULL
        ELSE (change_elem->'newValue')::text
    END
FROM history_to_change_group_map m
JOIN issue_history ih ON ih.id = m.history_id
CROSS JOIN LATERAL jsonb_array_elements(ih.changes::jsonb) AS change_elem
WHERE NOT EXISTS (
    -- Skip if change items already exist for this change group
    SELECT 1 FROM change_items ci WHERE ci.change_group_id = m.change_group_id
);

-- Step 4: Clean up temporary table
DROP TABLE IF EXISTS history_to_change_group_map;

-- =============================================================================
-- VERIFICATION QUERIES (run manually to verify migration)
-- =============================================================================

-- Count comparison
-- SELECT 'issue_history' as table_name, COUNT(*) as count FROM issue_history
-- UNION ALL
-- SELECT 'change_groups' as table_name, COUNT(*) as count FROM change_groups;

-- Sample data comparison
-- SELECT ih.id, ih.changes, cg.id as cg_id, cg.action, ci.field, ci.old_value, ci.new_value
-- FROM issue_history ih
-- JOIN change_groups cg ON cg.issue_id = ih.issue_id AND cg.created_at = ih.created_at
-- LEFT JOIN change_items ci ON ci.change_group_id = cg.id
-- LIMIT 10;

-- =============================================================================
-- NOTE: The issue_history table is NOT dropped - it's kept for backwards
-- compatibility. New code writes to both tables, old code can still read
-- from issue_history. Once migration is verified and all services updated,
-- a future migration can drop the issue_history table.
-- =============================================================================
