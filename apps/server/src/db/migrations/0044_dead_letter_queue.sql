-- Migration: Dead Letter Queue Table
-- Created at: 2025-01-15

-- =============================================================================
-- DEAD LETTER QUEUE TABLE
-- =============================================================================
-- Stores failed jobs from BullMQ for later analysis and retry

CREATE TABLE IF NOT EXISTS "dead_letter_queue" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Job identification
    "queue_name" text NOT NULL,
    "job_id" text NOT NULL,
    "job_name" text,
    
    -- Job data
    "payload" jsonb NOT NULL,
    
    -- Error information
    "error_message" text NOT NULL,
    "error_stack" text,
    "error_code" text,
    
    -- Attempt tracking
    "attempts_made" integer NOT NULL DEFAULT 0,
    "max_attempts" integer NOT NULL DEFAULT 3,
    
    -- State
    "status" text NOT NULL DEFAULT 'pending', -- pending, retried, resolved, ignored
    "resolved_at" timestamp with time zone,
    "resolved_by" uuid,
    "resolution_notes" text,
    
    -- Metadata
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    "last_attempt_at" timestamp with time zone,
    
    -- Optional correlation
    "correlation_id" text,
    "project_id" uuid,
    "user_id" uuid
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS "dlq_queue_name_idx" ON "dead_letter_queue" ("queue_name");
CREATE INDEX IF NOT EXISTS "dlq_status_idx" ON "dead_letter_queue" ("status");
CREATE INDEX IF NOT EXISTS "dlq_created_at_idx" ON "dead_letter_queue" ("created_at");
CREATE INDEX IF NOT EXISTS "dlq_correlation_idx" ON "dead_letter_queue" ("correlation_id");

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE "dead_letter_queue" IS 'Stores failed jobs from BullMQ workers for later analysis, retry, or resolution';
COMMENT ON COLUMN "dead_letter_queue"."queue_name" IS 'Name of the BullMQ queue the job came from';
COMMENT ON COLUMN "dead_letter_queue"."job_id" IS 'Original BullMQ job ID';
COMMENT ON COLUMN "dead_letter_queue"."payload" IS 'Original job data/payload';
COMMENT ON COLUMN "dead_letter_queue"."status" IS 'Current status: pending (needs attention), retried (requeued), resolved (fixed), ignored (intentionally skipped)';
COMMENT ON COLUMN "dead_letter_queue"."correlation_id" IS 'Optional ID to correlate with other events/logs';
