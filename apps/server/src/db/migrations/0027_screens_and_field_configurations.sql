CREATE TABLE "field_configuration_items" (
	"id" text PRIMARY KEY NOT NULL,
	"config_id" text NOT NULL,
	"field_id" text NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"renderer" text,
	"default_value" text,
	"description_override" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "field_config_items_unique" UNIQUE("config_id","field_id")
);
--> statement-breakpoint
CREATE TABLE "field_configuration_scheme_items" (
	"id" text PRIMARY KEY NOT NULL,
	"scheme_id" text NOT NULL,
	"issue_type_id" text,
	"config_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "field_config_scheme_items_unique" UNIQUE("scheme_id","issue_type_id")
);
--> statement-breakpoint
CREATE TABLE "field_configuration_schemes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "field_configurations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_field_configuration_schemes" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"scheme_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_field_config_schemes_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "project_screen_schemes" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"scheme_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_screen_schemes_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "screen_scheme_items" (
	"id" text PRIMARY KEY NOT NULL,
	"scheme_id" text NOT NULL,
	"issue_type_id" text,
	"operation" text NOT NULL,
	"screen_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "screen_scheme_items_unique" UNIQUE("scheme_id","issue_type_id","operation")
);
--> statement-breakpoint
CREATE TABLE "screen_schemes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "screen_tab_fields" (
	"id" text PRIMARY KEY NOT NULL,
	"tab_id" text NOT NULL,
	"field_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_required_override" boolean,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "screen_tab_fields_unique" UNIQUE("tab_id","field_id")
);
--> statement-breakpoint
CREATE TABLE "screen_tabs" (
	"id" text PRIMARY KEY NOT NULL,
	"screen_id" text NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "screens" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "components" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "components" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "components" ALTER COLUMN "project_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "components" ALTER COLUMN "lead_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "components" ALTER COLUMN "default_assignee_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "issue_components" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "issue_components" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "issue_components" ALTER COLUMN "issue_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "issue_components" ALTER COLUMN "component_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "resolutions" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "resolutions" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "statuses" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "statuses" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "workflows" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "workflows" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "issue_link_types" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "issue_link_types" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "issue_link_types" ALTER COLUMN "is_system" SET DATA TYPE boolean;--> statement-breakpoint
ALTER TABLE "issue_links" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "issue_links" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "issue_links" ALTER COLUMN "link_type_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "issue_links" ALTER COLUMN "source_issue_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "issue_links" ALTER COLUMN "target_issue_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "issue_links" ALTER COLUMN "created_by" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "issue_affected_versions" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "issue_affected_versions" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "issue_affected_versions" ALTER COLUMN "issue_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "issue_affected_versions" ALTER COLUMN "version_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "issue_fix_versions" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "issue_fix_versions" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "issue_fix_versions" ALTER COLUMN "issue_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "issue_fix_versions" ALTER COLUMN "version_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "versions" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "versions" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "versions" ALTER COLUMN "project_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "issue_labels" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "issue_labels" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "issue_labels" ALTER COLUMN "issue_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "issue_labels" ALTER COLUMN "label_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "labels" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "labels" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "labels" ALTER COLUMN "project_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "field_configuration_items" ADD CONSTRAINT "field_configuration_items_config_id_field_configurations_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."field_configurations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_configuration_items" ADD CONSTRAINT "field_configuration_items_field_id_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_configuration_scheme_items" ADD CONSTRAINT "field_configuration_scheme_items_scheme_id_field_configuration_schemes_id_fk" FOREIGN KEY ("scheme_id") REFERENCES "public"."field_configuration_schemes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_configuration_scheme_items" ADD CONSTRAINT "field_configuration_scheme_items_issue_type_id_issue_types_id_fk" FOREIGN KEY ("issue_type_id") REFERENCES "public"."issue_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_configuration_scheme_items" ADD CONSTRAINT "field_configuration_scheme_items_config_id_field_configurations_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."field_configurations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_field_configuration_schemes" ADD CONSTRAINT "project_field_configuration_schemes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_field_configuration_schemes" ADD CONSTRAINT "project_field_configuration_schemes_scheme_id_field_configuration_schemes_id_fk" FOREIGN KEY ("scheme_id") REFERENCES "public"."field_configuration_schemes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_screen_schemes" ADD CONSTRAINT "project_screen_schemes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_screen_schemes" ADD CONSTRAINT "project_screen_schemes_scheme_id_screen_schemes_id_fk" FOREIGN KEY ("scheme_id") REFERENCES "public"."screen_schemes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screen_scheme_items" ADD CONSTRAINT "screen_scheme_items_scheme_id_screen_schemes_id_fk" FOREIGN KEY ("scheme_id") REFERENCES "public"."screen_schemes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screen_scheme_items" ADD CONSTRAINT "screen_scheme_items_issue_type_id_issue_types_id_fk" FOREIGN KEY ("issue_type_id") REFERENCES "public"."issue_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screen_scheme_items" ADD CONSTRAINT "screen_scheme_items_screen_id_screens_id_fk" FOREIGN KEY ("screen_id") REFERENCES "public"."screens"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screen_tab_fields" ADD CONSTRAINT "screen_tab_fields_tab_id_screen_tabs_id_fk" FOREIGN KEY ("tab_id") REFERENCES "public"."screen_tabs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screen_tab_fields" ADD CONSTRAINT "screen_tab_fields_field_id_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screen_tabs" ADD CONSTRAINT "screen_tabs_screen_id_screens_id_fk" FOREIGN KEY ("screen_id") REFERENCES "public"."screens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "field_config_items_config_id_idx" ON "field_configuration_items" USING btree ("config_id");--> statement-breakpoint
CREATE INDEX "field_config_scheme_items_scheme_id_idx" ON "field_configuration_scheme_items" USING btree ("scheme_id");--> statement-breakpoint
CREATE INDEX "screen_scheme_items_scheme_id_idx" ON "screen_scheme_items" USING btree ("scheme_id");--> statement-breakpoint
CREATE INDEX "screen_tab_fields_tab_id_idx" ON "screen_tab_fields" USING btree ("tab_id");--> statement-breakpoint
CREATE INDEX "screen_tabs_screen_id_idx" ON "screen_tabs" USING btree ("screen_id");--> statement-breakpoint
ALTER TABLE "issue_components" ADD CONSTRAINT "issue_components_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_affected_versions" ADD CONSTRAINT "issue_affected_versions_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_fix_versions" ADD CONSTRAINT "issue_fix_versions_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_labels" ADD CONSTRAINT "issue_labels_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;