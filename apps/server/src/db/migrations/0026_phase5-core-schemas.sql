CREATE TYPE "public"."notification_recipient_type" AS ENUM('current_assignee', 'reporter', 'project_lead', 'component_lead', 'all_watchers', 'users_in_role', 'single_user', 'group', 'custom_field_user', 'current_user', 'previous_assignee');--> statement-breakpoint
CREATE TYPE "public"."version_status" AS ENUM('unreleased', 'released', 'archived');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'sprint_started';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'sprint_completed';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'workflow_transition';--> statement-breakpoint
CREATE TABLE "components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"lead_id" uuid,
	"default_assignee_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "components_project_name_unique" UNIQUE("project_id","name")
);
--> statement-breakpoint
CREATE TABLE "issue_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_id" uuid NOT NULL,
	"component_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "issue_components_unique" UNIQUE("issue_id","component_id")
);
--> statement-breakpoint
CREATE TABLE "notification_scheme_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scheme_id" uuid NOT NULL,
	"event_type" "notification_type" NOT NULL,
	"recipient_type" "notification_recipient_type" NOT NULL,
	"recipient_params" jsonb DEFAULT '{}'::jsonb,
	"channels" jsonb DEFAULT '["in_app"]'::jsonb NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_scheme_events_unique" UNIQUE("scheme_id","event_type","recipient_type")
);
--> statement-breakpoint
CREATE TABLE "notification_schemes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_notification_schemes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" text NOT NULL,
	"scheme_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_notification_schemes_project_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "issue_link_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"inward_name" varchar(100) NOT NULL,
	"outward_name" varchar(100) NOT NULL,
	"description" text,
	"is_system" varchar(5) DEFAULT 'false',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "issue_link_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "issue_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"link_type_id" uuid NOT NULL,
	"source_issue_id" uuid NOT NULL,
	"target_issue_id" uuid NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "issue_links_unique" UNIQUE("source_issue_id","target_issue_id","link_type_id")
);
--> statement-breakpoint
CREATE TABLE "issue_affected_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "issue_affected_versions_unique" UNIQUE("issue_id","version_id")
);
--> statement-breakpoint
CREATE TABLE "issue_fix_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "issue_fix_versions_unique" UNIQUE("issue_id","version_id")
);
--> statement-breakpoint
CREATE TABLE "versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"status" "version_status" DEFAULT 'unreleased' NOT NULL,
	"start_date" date,
	"release_date" date,
	"sort_order" varchar(10) DEFAULT '0',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "versions_project_name_unique" UNIQUE("project_id","name")
);
--> statement-breakpoint
CREATE TABLE "issue_labels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_id" uuid NOT NULL,
	"label_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "issue_labels_unique" UNIQUE("issue_id","label_id")
);
--> statement-breakpoint
CREATE TABLE "labels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"name" varchar(100) NOT NULL,
	"color" varchar(7) DEFAULT '#6B7280' NOT NULL,
	"description" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "components" ADD CONSTRAINT "components_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "components" ADD CONSTRAINT "components_lead_id_user_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "components" ADD CONSTRAINT "components_default_assignee_id_user_id_fk" FOREIGN KEY ("default_assignee_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_components" ADD CONSTRAINT "issue_components_component_id_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_scheme_events" ADD CONSTRAINT "notification_scheme_events_scheme_id_notification_schemes_id_fk" FOREIGN KEY ("scheme_id") REFERENCES "public"."notification_schemes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_notification_schemes" ADD CONSTRAINT "project_notification_schemes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_notification_schemes" ADD CONSTRAINT "project_notification_schemes_scheme_id_notification_schemes_id_fk" FOREIGN KEY ("scheme_id") REFERENCES "public"."notification_schemes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_links" ADD CONSTRAINT "issue_links_link_type_id_issue_link_types_id_fk" FOREIGN KEY ("link_type_id") REFERENCES "public"."issue_link_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_links" ADD CONSTRAINT "issue_links_source_issue_id_issues_id_fk" FOREIGN KEY ("source_issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_links" ADD CONSTRAINT "issue_links_target_issue_id_issues_id_fk" FOREIGN KEY ("target_issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_links" ADD CONSTRAINT "issue_links_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_affected_versions" ADD CONSTRAINT "issue_affected_versions_version_id_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_fix_versions" ADD CONSTRAINT "issue_fix_versions_version_id_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "versions" ADD CONSTRAINT "versions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_labels" ADD CONSTRAINT "issue_labels_label_id_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."labels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labels" ADD CONSTRAINT "labels_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "components_project_id_idx" ON "components" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "components_lead_id_idx" ON "components" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "issue_components_issue_id_idx" ON "issue_components" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "issue_components_component_id_idx" ON "issue_components" USING btree ("component_id");--> statement-breakpoint
CREATE INDEX "notification_scheme_events_scheme_idx" ON "notification_scheme_events" USING btree ("scheme_id");--> statement-breakpoint
CREATE INDEX "notification_scheme_events_event_idx" ON "notification_scheme_events" USING btree ("scheme_id","event_type");--> statement-breakpoint
CREATE INDEX "notification_schemes_default_idx" ON "notification_schemes" USING btree ("is_default");--> statement-breakpoint
CREATE INDEX "project_notification_schemes_scheme_idx" ON "project_notification_schemes" USING btree ("scheme_id");--> statement-breakpoint
CREATE INDEX "issue_links_source_issue_idx" ON "issue_links" USING btree ("source_issue_id");--> statement-breakpoint
CREATE INDEX "issue_links_target_issue_idx" ON "issue_links" USING btree ("target_issue_id");--> statement-breakpoint
CREATE INDEX "issue_links_link_type_idx" ON "issue_links" USING btree ("link_type_id");--> statement-breakpoint
CREATE INDEX "issue_affected_versions_issue_id_idx" ON "issue_affected_versions" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "issue_affected_versions_version_id_idx" ON "issue_affected_versions" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "issue_fix_versions_issue_id_idx" ON "issue_fix_versions" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "issue_fix_versions_version_id_idx" ON "issue_fix_versions" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "versions_project_id_idx" ON "versions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "versions_status_idx" ON "versions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "issue_labels_issue_id_idx" ON "issue_labels" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "issue_labels_label_id_idx" ON "issue_labels" USING btree ("label_id");--> statement-breakpoint
CREATE INDEX "labels_project_id_idx" ON "labels" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "labels_name_idx" ON "labels" USING btree ("name");