-- Domain Events Schema Migration
-- Phase 4: Event Store & Outbox Pattern

-- Create outbox status enum
CREATE TYPE "outbox_status" AS ENUM('pending', 'processing', 'processed', 'failed');

-- =============================================================================
-- DOMAIN EVENTS TABLE
-- Main event store for all domain events
-- =============================================================================

CREATE TABLE IF NOT EXISTS "domain_events" (
  "id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid()::text,
  "event_type" text NOT NULL,
  "aggregate_type" text NOT NULL,
  "aggregate_id" text NOT NULL,
  "payload" jsonb NOT NULL,
  "metadata" jsonb,
  "event_version" integer DEFAULT 1 NOT NULL,
  "user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "correlation_id" text,
  "causation_id" text,
  "occurred_at" timestamp DEFAULT now() NOT NULL,
  "processed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Domain events indexes
CREATE INDEX IF NOT EXISTS "domain_events_event_type_idx" ON "domain_events" ("event_type");
CREATE INDEX IF NOT EXISTS "domain_events_aggregate_idx" ON "domain_events" ("aggregate_type", "aggregate_id");
CREATE INDEX IF NOT EXISTS "domain_events_version_idx" ON "domain_events" ("event_version");
CREATE INDEX IF NOT EXISTS "domain_events_created_at_idx" ON "domain_events" ("created_at");
CREATE INDEX IF NOT EXISTS "domain_events_user_idx" ON "domain_events" ("user_id");
CREATE INDEX IF NOT EXISTS "domain_events_correlation_idx" ON "domain_events" ("correlation_id");
CREATE INDEX IF NOT EXISTS "domain_events_unprocessed_idx" ON "domain_events" ("processed_at", "created_at");

-- =============================================================================
-- EVENT OUTBOX TABLE
-- Transactional outbox for reliable event publishing
-- =============================================================================

CREATE TABLE IF NOT EXISTS "event_outbox" (
  "id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid()::text,
  "event_id" text NOT NULL REFERENCES "domain_events"("id") ON DELETE CASCADE,
  "destination" text NOT NULL,
  "status" "outbox_status" DEFAULT 'pending' NOT NULL,
  "retry_count" integer DEFAULT 0 NOT NULL,
  "last_error" text,
  "locked_until" timestamp,
  "processed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Event outbox indexes
CREATE INDEX IF NOT EXISTS "event_outbox_event_idx" ON "event_outbox" ("event_id");
CREATE INDEX IF NOT EXISTS "event_outbox_destination_idx" ON "event_outbox" ("destination");
CREATE INDEX IF NOT EXISTS "event_outbox_status_idx" ON "event_outbox" ("status");
CREATE INDEX IF NOT EXISTS "event_outbox_locked_until_idx" ON "event_outbox" ("locked_until");
CREATE INDEX IF NOT EXISTS "event_outbox_pending_idx" ON "event_outbox" ("status", "destination", "created_at");

-- =============================================================================
-- EVENT SUBSCRIPTIONS TABLE
-- Configurable event subscriptions for webhooks, automation rules, etc.
-- =============================================================================

CREATE TABLE IF NOT EXISTS "event_subscriptions" (
  "id" text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid()::text,
  "name" text NOT NULL,
  "description" text,
  "event_types" jsonb NOT NULL,
  "aggregate_type" text,
  "project_id" text,
  "destination" text NOT NULL,
  "destination_config" jsonb,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Event subscriptions indexes
CREATE INDEX IF NOT EXISTS "event_subscriptions_destination_idx" ON "event_subscriptions" ("destination");
CREATE INDEX IF NOT EXISTS "event_subscriptions_active_idx" ON "event_subscriptions" ("is_active");
CREATE INDEX IF NOT EXISTS "event_subscriptions_project_idx" ON "event_subscriptions" ("project_id");
