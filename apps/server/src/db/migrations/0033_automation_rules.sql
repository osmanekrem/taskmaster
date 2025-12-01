CREATE TYPE "public"."automation_action_type" AS ENUM('edit_issue', 'transition_issue', 'assign_issue', 'unassign_issue', 'add_comment', 'add_labels', 'remove_labels', 'set_priority', 'set_due_date', 'clear_due_date', 'add_watcher', 'remove_watcher', 'set_field_value', 'clear_field_value', 'create_issue', 'create_subtask', 'clone_issue', 'link_issues', 'unlink_issues', 'add_to_sprint', 'remove_from_sprint', 'move_to_backlog', 'set_fix_version', 'set_affected_version', 'remove_fix_version', 'remove_affected_version', 'add_component', 'remove_component', 'send_email', 'send_notification', 'send_webhook', 'log_work', 'set_estimate', 'if_else', 'for_each', 'run_jql', 'lookup_issues', 'branch_rule');--> statement-breakpoint
CREATE TYPE "public"."automation_condition_type" AS ENUM('field_equals', 'field_not_equals', 'field_contains', 'field_not_contains', 'field_is_empty', 'field_is_not_empty', 'field_greater_than', 'field_less_than', 'field_in', 'field_not_in', 'field_changed', 'field_changed_to', 'field_changed_from', 'issue_type', 'issue_status', 'issue_priority', 'issue_has_subtasks', 'issue_is_subtask', 'issue_has_parent', 'jql_match', 'user_in_group', 'user_in_project_role', 'user_is_assignee', 'user_is_reporter', 'time_since_created', 'time_since_updated', 'time_in_status', 'due_date_approaching', 'and', 'or', 'not');--> statement-breakpoint
CREATE TYPE "public"."automation_execution_status" AS ENUM('pending', 'running', 'success', 'partial_success', 'failed', 'cancelled', 'timed_out');--> statement-breakpoint
CREATE TYPE "public"."automation_trigger_type" AS ENUM('issue_created', 'issue_updated', 'issue_transitioned', 'issue_commented', 'issue_assigned', 'issue_deleted', 'field_changed', 'field_value_set', 'field_value_cleared', 'sprint_created', 'sprint_started', 'sprint_completed', 'sprint_deleted', 'version_created', 'version_released', 'version_archived', 'comment_created', 'comment_updated', 'comment_deleted', 'worklog_created', 'worklog_updated', 'worklog_deleted', 'scheduled', 'scheduled_jql', 'manual', 'incoming_webhook');--> statement-breakpoint
CREATE TABLE "automation_audit" (
	"id" text PRIMARY KEY NOT NULL,
	"execution_id" text NOT NULL,
	"step_index" integer NOT NULL,
	"step_type" text NOT NULL,
	"step_name" text NOT NULL,
	"input_data" jsonb,
	"output_data" jsonb,
	"status" "automation_execution_status" NOT NULL,
	"error_message" text,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_executions" (
	"id" text PRIMARY KEY NOT NULL,
	"rule_id" text NOT NULL,
	"trigger_type" "automation_trigger_type" NOT NULL,
	"trigger_issue_id" text,
	"trigger_user_id" text,
	"trigger_data" jsonb,
	"status" "automation_execution_status" DEFAULT 'pending' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"duration_ms" integer,
	"executed_actions" jsonb,
	"affected_issues" jsonb,
	"total_actions_count" integer DEFAULT 0,
	"success_actions_count" integer DEFAULT 0,
	"failed_actions_count" integer DEFAULT 0,
	"error_message" text,
	"error_stack" text,
	"failed_at_step" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"project_id" text,
	"is_global" boolean DEFAULT false NOT NULL,
	"trigger" jsonb NOT NULL,
	"conditions" jsonb,
	"actions" jsonb NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"execution_count" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"last_executed_at" timestamp with time zone,
	"last_error_at" timestamp with time zone,
	"last_error_message" text,
	"rate_limit_per_hour" integer DEFAULT 1000,
	"executions_this_hour" integer DEFAULT 0,
	"hour_reset_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_scheduled_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"rule_id" text NOT NULL,
	"cron_expression" text NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"jql_filter" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp with time zone,
	"next_run_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_webhooks" (
	"id" text PRIMARY KEY NOT NULL,
	"rule_id" text NOT NULL,
	"path" text NOT NULL,
	"secret" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_called_at" timestamp with time zone,
	"call_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "automation_audit" ADD CONSTRAINT "automation_audit_execution_id_automation_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."automation_executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_rule_id_automation_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."automation_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_trigger_user_id_user_id_fk" FOREIGN KEY ("trigger_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_scheduled_jobs" ADD CONSTRAINT "automation_scheduled_jobs_rule_id_automation_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."automation_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_webhooks" ADD CONSTRAINT "automation_webhooks_rule_id_automation_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."automation_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "automation_audit_execution_id_idx" ON "automation_audit" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "automation_audit_step_type_idx" ON "automation_audit" USING btree ("step_type");--> statement-breakpoint
CREATE INDEX "automation_audit_created_at_idx" ON "automation_audit" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "automation_executions_rule_id_idx" ON "automation_executions" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "automation_executions_status_idx" ON "automation_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "automation_executions_trigger_type_idx" ON "automation_executions" USING btree ("trigger_type");--> statement-breakpoint
CREATE INDEX "automation_executions_trigger_issue_id_idx" ON "automation_executions" USING btree ("trigger_issue_id");--> statement-breakpoint
CREATE INDEX "automation_executions_created_at_idx" ON "automation_executions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "automation_rules_project_id_idx" ON "automation_rules" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "automation_rules_is_enabled_idx" ON "automation_rules" USING btree ("is_enabled");--> statement-breakpoint
CREATE INDEX "automation_rules_is_global_idx" ON "automation_rules" USING btree ("is_global");--> statement-breakpoint
CREATE INDEX "automation_rules_created_by_idx" ON "automation_rules" USING btree ("created_by");--> statement-breakpoint
CREATE UNIQUE INDEX "automation_rules_name_project_idx" ON "automation_rules" USING btree ("name","project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "automation_scheduled_jobs_rule_id_idx" ON "automation_scheduled_jobs" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "automation_scheduled_jobs_next_run_at_idx" ON "automation_scheduled_jobs" USING btree ("next_run_at");--> statement-breakpoint
CREATE INDEX "automation_scheduled_jobs_is_active_idx" ON "automation_scheduled_jobs" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "automation_webhooks_rule_id_idx" ON "automation_webhooks" USING btree ("rule_id");--> statement-breakpoint
CREATE UNIQUE INDEX "automation_webhooks_path_idx" ON "automation_webhooks" USING btree ("path");