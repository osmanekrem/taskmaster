CREATE TYPE "public"."notification_channel" AS ENUM('in_app', 'email', 'push');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('issue_assigned', 'issue_unassigned', 'issue_mentioned', 'issue_status_changed', 'issue_updated', 'issue_commented', 'issue_created', 'issue_deleted', 'comment_replied', 'comment_mentioned', 'comment_reaction_added', 'watching_issue_updated', 'watching_issue_commented', 'watching_issue_status_changed', 'added_as_watcher', 'removed_as_watcher');--> statement-breakpoint
CREATE TYPE "public"."role_scope" AS ENUM('global', 'project');--> statement-breakpoint
CREATE TABLE "comment_mentions" (
	"id" text PRIMARY KEY NOT NULL,
	"comment_id" text NOT NULL,
	"mentioned_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comment_reactions" (
	"id" text PRIMARY KEY NOT NULL,
	"comment_id" text NOT NULL,
	"user_id" text NOT NULL,
	"emoji" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "comment_reactions_unique" UNIQUE("comment_id","user_id","emoji")
);
--> statement-breakpoint
CREATE TABLE "issue_attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"issue_id" text NOT NULL,
	"uploader_id" text NOT NULL,
	"filename" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"storage_key" text NOT NULL,
	"storage_provider" text DEFAULT 'local',
	"thumbnail_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issue_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"issue_id" text NOT NULL,
	"author_id" text NOT NULL,
	"content" text NOT NULL,
	"parent_id" text,
	"is_edited" boolean DEFAULT false,
	"edited_at" timestamp,
	"is_deleted" boolean DEFAULT false,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "change_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"issue_id" text NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "change_items" (
	"id" text PRIMARY KEY NOT NULL,
	"change_group_id" text NOT NULL,
	"field" text NOT NULL,
	"field_id" text,
	"field_type" text,
	"old_string" text,
	"new_string" text,
	"old_value" text,
	"new_value" text
);
--> statement-breakpoint
CREATE TABLE "issue_field_values" (
	"id" text PRIMARY KEY NOT NULL,
	"issue_id" text NOT NULL,
	"field_id" text NOT NULL,
	"value" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "issue_field_values_unique" UNIQUE("issue_id","field_id")
);
--> statement-breakpoint
CREATE TABLE "issue_history" (
	"id" text PRIMARY KEY NOT NULL,
	"issue_id" text NOT NULL,
	"user_id" text NOT NULL,
	"changes" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"issue_number" integer NOT NULL,
	"project_id" text NOT NULL,
	"issue_type_id" text NOT NULL,
	"status_id" text NOT NULL,
	"resolution_id" text,
	"reporter_id" text NOT NULL,
	"assignee_id" text,
	"parent_id" text,
	"epic_id" text,
	"rank" text,
	"summary" text,
	"description" text,
	"story_points" integer,
	"priority" text,
	"labels" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"due_date" timestamp,
	CONSTRAINT "issues_key_unique" UNIQUE("key"),
	CONSTRAINT "issues_project_number_unique" UNIQUE("project_id","issue_number")
);
--> statement-breakpoint
CREATE TABLE "issue_watchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_id" text NOT NULL,
	"user_id" text NOT NULL,
	"watch_reason" text DEFAULT 'manual' NOT NULL,
	"is_muted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "issue_watchers_unique" UNIQUE("issue_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "notification_digest_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"frequency" text DEFAULT 'none' NOT NULL,
	"preferred_hour" integer DEFAULT 9 NOT NULL,
	"preferred_day" integer DEFAULT 1 NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"last_digest_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_digest_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"event_type" "notification_type" NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_unique" UNIQUE("user_id","channel","event_type")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"issue_id" text,
	"comment_id" text,
	"actor_id" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"is_archived" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp,
	"group_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permission_scheme_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"scheme_id" text NOT NULL,
	"role_name" text NOT NULL,
	"role_description" text,
	"permissions" text[] DEFAULT '{}' NOT NULL,
	"sort_order" text DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "permission_scheme_roles_unique" UNIQUE("scheme_id","role_name")
);
--> statement-breakpoint
CREATE TABLE "permission_schemes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "permission_schemes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "project_role_members" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text,
	"role_id" text NOT NULL,
	"user_id" text NOT NULL,
	"granted_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_role_members_unique" UNIQUE("project_id","role_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "project_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"scope" "role_scope" DEFAULT 'project' NOT NULL,
	"project_id" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"sort_order" text DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_roles_name_unique" UNIQUE("name","project_id")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"role_id" text NOT NULL,
	"permission" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "role_permissions_unique" UNIQUE("role_id","permission")
);
--> statement-breakpoint
CREATE TABLE "sprint_burndown" (
	"id" text PRIMARY KEY NOT NULL,
	"sprint_id" text NOT NULL,
	"date" timestamp NOT NULL,
	"remaining_points" integer DEFAULT 0 NOT NULL,
	"remaining_issue_count" integer DEFAULT 0 NOT NULL,
	"completed_points" integer DEFAULT 0 NOT NULL,
	"completed_issue_count" integer DEFAULT 0 NOT NULL,
	"ideal_remaining_points" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sprint_burndown_sprint_date_unique" UNIQUE("sprint_id","date")
);
--> statement-breakpoint
CREATE TABLE "sprint_history" (
	"id" text PRIMARY KEY NOT NULL,
	"sprint_id" text NOT NULL,
	"action" text NOT NULL,
	"issue_id" text,
	"data" jsonb,
	"performed_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sprint_issues" (
	"id" text PRIMARY KEY NOT NULL,
	"sprint_id" text NOT NULL,
	"issue_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"rank" text,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"added_by_id" text,
	"story_points_snapshot" integer,
	CONSTRAINT "sprint_issues_issue_unique" UNIQUE("issue_id")
);
--> statement-breakpoint
CREATE TABLE "sprints" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"goal" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"status" text DEFAULT 'planned' NOT NULL,
	"completed_at" timestamp,
	"completed_by_id" text,
	"metrics" jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by_id" text
);
--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "templates" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "templates" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "fields" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "project_issue_types" ADD COLUMN "workflow_id" text;--> statement-breakpoint
ALTER TABLE "template_issue_types" ADD COLUMN "workflow_id" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "color" text DEFAULT '#6B7280';--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "lead_id" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "default_workflow_id" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "settings" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "is_archived" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "default_workflow_id" text;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN "is_system" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "comment_mentions" ADD CONSTRAINT "comment_mentions_comment_id_issue_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."issue_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_mentions" ADD CONSTRAINT "comment_mentions_mentioned_user_id_user_id_fk" FOREIGN KEY ("mentioned_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_comment_id_issue_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."issue_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_attachments" ADD CONSTRAINT "issue_attachments_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_attachments" ADD CONSTRAINT "issue_attachments_uploader_id_user_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_comments" ADD CONSTRAINT "issue_comments_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_comments" ADD CONSTRAINT "issue_comments_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_comments" ADD CONSTRAINT "issue_comments_parent_id_issue_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."issue_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_groups" ADD CONSTRAINT "change_groups_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_groups" ADD CONSTRAINT "change_groups_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_items" ADD CONSTRAINT "change_items_change_group_id_change_groups_id_fk" FOREIGN KEY ("change_group_id") REFERENCES "public"."change_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_field_values" ADD CONSTRAINT "issue_field_values_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_field_values" ADD CONSTRAINT "issue_field_values_field_id_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_history" ADD CONSTRAINT "issue_history_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_history" ADD CONSTRAINT "issue_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_issue_type_id_issue_types_id_fk" FOREIGN KEY ("issue_type_id") REFERENCES "public"."issue_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_status_id_statuses_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."statuses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_resolution_id_resolutions_id_fk" FOREIGN KEY ("resolution_id") REFERENCES "public"."resolutions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_reporter_id_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_parent_id_issues_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_epic_id_issues_id_fk" FOREIGN KEY ("epic_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_watchers" ADD CONSTRAINT "issue_watchers_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_watchers" ADD CONSTRAINT "issue_watchers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_digest_settings" ADD CONSTRAINT "notification_digest_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_comment_id_issue_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."issue_comments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_scheme_roles" ADD CONSTRAINT "permission_scheme_roles_scheme_id_permission_schemes_id_fk" FOREIGN KEY ("scheme_id") REFERENCES "public"."permission_schemes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_role_members" ADD CONSTRAINT "project_role_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_role_members" ADD CONSTRAINT "project_role_members_role_id_project_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."project_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_role_members" ADD CONSTRAINT "project_role_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_role_members" ADD CONSTRAINT "project_role_members_granted_by_user_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_roles" ADD CONSTRAINT "project_roles_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_project_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."project_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sprint_burndown" ADD CONSTRAINT "sprint_burndown_sprint_id_sprints_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."sprints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sprint_history" ADD CONSTRAINT "sprint_history_sprint_id_sprints_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."sprints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sprint_history" ADD CONSTRAINT "sprint_history_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sprint_history" ADD CONSTRAINT "sprint_history_performed_by_id_user_id_fk" FOREIGN KEY ("performed_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sprint_issues" ADD CONSTRAINT "sprint_issues_sprint_id_sprints_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."sprints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sprint_issues" ADD CONSTRAINT "sprint_issues_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sprint_issues" ADD CONSTRAINT "sprint_issues_added_by_id_user_id_fk" FOREIGN KEY ("added_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_completed_by_id_user_id_fk" FOREIGN KEY ("completed_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comment_mentions_comment_idx" ON "comment_mentions" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "comment_mentions_user_idx" ON "comment_mentions" USING btree ("mentioned_user_id");--> statement-breakpoint
CREATE INDEX "comment_reactions_comment_idx" ON "comment_reactions" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "comment_reactions_user_idx" ON "comment_reactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "issue_attachments_issue_idx" ON "issue_attachments" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "issue_attachments_uploader_idx" ON "issue_attachments" USING btree ("uploader_id");--> statement-breakpoint
CREATE INDEX "issue_comments_issue_idx" ON "issue_comments" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "issue_comments_author_idx" ON "issue_comments" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "issue_comments_parent_idx" ON "issue_comments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "issue_comments_created_at_idx" ON "issue_comments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "change_groups_issue_idx" ON "change_groups" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "change_groups_user_idx" ON "change_groups" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "change_groups_created_at_idx" ON "change_groups" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "change_groups_action_idx" ON "change_groups" USING btree ("action");--> statement-breakpoint
CREATE INDEX "change_groups_issue_created_at_idx" ON "change_groups" USING btree ("issue_id","created_at");--> statement-breakpoint
CREATE INDEX "change_items_change_group_idx" ON "change_items" USING btree ("change_group_id");--> statement-breakpoint
CREATE INDEX "change_items_field_idx" ON "change_items" USING btree ("field");--> statement-breakpoint
CREATE INDEX "issue_field_values_issue_idx" ON "issue_field_values" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "issue_field_values_field_idx" ON "issue_field_values" USING btree ("field_id");--> statement-breakpoint
CREATE INDEX "issue_history_issue_idx" ON "issue_history" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "issue_history_user_idx" ON "issue_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "issue_history_created_at_idx" ON "issue_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "issues_project_idx" ON "issues" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "issues_status_idx" ON "issues" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "issues_assignee_idx" ON "issues" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "issues_reporter_idx" ON "issues" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX "issues_parent_idx" ON "issues" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "issues_epic_idx" ON "issues" USING btree ("epic_id");--> statement-breakpoint
CREATE INDEX "issues_rank_idx" ON "issues" USING btree ("rank");--> statement-breakpoint
CREATE INDEX "issues_project_rank_idx" ON "issues" USING btree ("project_id","rank");--> statement-breakpoint
CREATE INDEX "issues_project_status_idx" ON "issues" USING btree ("project_id","status_id");--> statement-breakpoint
CREATE INDEX "issues_project_type_idx" ON "issues" USING btree ("project_id","issue_type_id");--> statement-breakpoint
CREATE INDEX "issues_story_points_idx" ON "issues" USING btree ("story_points");--> statement-breakpoint
CREATE INDEX "issues_priority_idx" ON "issues" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "issues_summary_idx" ON "issues" USING btree ("summary");--> statement-breakpoint
CREATE INDEX "issues_created_at_idx" ON "issues" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "issues_due_date_idx" ON "issues" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "issue_watchers_issue_id_idx" ON "issue_watchers" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "issue_watchers_user_id_idx" ON "issue_watchers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_preferences_user_idx" ON "notification_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "notifications_user_type_idx" ON "notifications" USING btree ("user_id","type");--> statement-breakpoint
CREATE INDEX "notifications_issue_id_idx" ON "notifications" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "notifications_group_key_idx" ON "notifications" USING btree ("group_key");--> statement-breakpoint
CREATE INDEX "notifications_archived_idx" ON "notifications" USING btree ("is_archived","created_at");--> statement-breakpoint
CREATE INDEX "permission_scheme_roles_scheme_id_idx" ON "permission_scheme_roles" USING btree ("scheme_id");--> statement-breakpoint
CREATE INDEX "project_role_members_project_id_idx" ON "project_role_members" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_role_members_user_id_idx" ON "project_role_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "project_role_members_role_id_idx" ON "project_role_members" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "project_roles_project_id_idx" ON "project_roles" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_roles_scope_idx" ON "project_roles" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "role_permissions_role_id_idx" ON "role_permissions" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "sprint_burndown_sprint_id_idx" ON "sprint_burndown" USING btree ("sprint_id");--> statement-breakpoint
CREATE INDEX "sprint_history_sprint_id_idx" ON "sprint_history" USING btree ("sprint_id");--> statement-breakpoint
CREATE INDEX "sprint_history_created_at_idx" ON "sprint_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sprint_issues_sprint_id_idx" ON "sprint_issues" USING btree ("sprint_id");--> statement-breakpoint
CREATE INDEX "sprint_issues_position_idx" ON "sprint_issues" USING btree ("sprint_id","position");--> statement-breakpoint
CREATE INDEX "sprint_issues_rank_idx" ON "sprint_issues" USING btree ("sprint_id","rank");--> statement-breakpoint
CREATE INDEX "sprints_project_id_idx" ON "sprints" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "sprints_status_idx" ON "sprints" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sprints_project_status_idx" ON "sprints" USING btree ("project_id","status");--> statement-breakpoint
ALTER TABLE "project_issue_types" ADD CONSTRAINT "project_issue_types_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_issue_types" ADD CONSTRAINT "template_issue_types_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_lead_id_user_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_default_workflow_id_workflows_id_fk" FOREIGN KEY ("default_workflow_id") REFERENCES "public"."workflows"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_default_workflow_id_workflows_id_fk" FOREIGN KEY ("default_workflow_id") REFERENCES "public"."workflows"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fields_slug_idx" ON "fields" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "projects_lead_id_idx" ON "projects" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "projects_is_archived_idx" ON "projects" USING btree ("is_archived");--> statement-breakpoint
CREATE INDEX "projects_archived_lead_idx" ON "projects" USING btree ("is_archived","lead_id");--> statement-breakpoint
CREATE INDEX "workflow_statuses_workflow_id_idx" ON "workflow_statuses" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "workflow_transitions_workflow_id_idx" ON "workflow_transitions" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "workflow_transitions_from_status_idx" ON "workflow_transitions" USING btree ("from_status_id");--> statement-breakpoint
CREATE INDEX "workflow_transitions_to_status_idx" ON "workflow_transitions" USING btree ("to_status_id");--> statement-breakpoint
ALTER TABLE "fields" ADD CONSTRAINT "fields_slug_unique" UNIQUE("slug");--> statement-breakpoint
ALTER TABLE "project_issue_types" ADD CONSTRAINT "project_issue_types_unique" UNIQUE("project_id","issue_type_id");--> statement-breakpoint
ALTER TABLE "template_issue_types" ADD CONSTRAINT "template_issue_types_unique" UNIQUE("template_id","issue_type_id");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_key_unique" UNIQUE("key");--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_name_unique" UNIQUE("name");