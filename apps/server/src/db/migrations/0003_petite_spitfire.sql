CREATE TABLE "issue_types" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text
);
--> statement-breakpoint
CREATE TABLE "project_issue_types" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"issue_type_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_issue_types" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"issue_type_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_workflows" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"workflow_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_workflows" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"workflow_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_steps" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text,
	"workflow_id" text NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "first_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "last_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "project_issue_types" ADD CONSTRAINT "project_issue_types_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_issue_types" ADD CONSTRAINT "project_issue_types_issue_type_id_issue_types_id_fk" FOREIGN KEY ("issue_type_id") REFERENCES "public"."issue_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_issue_types" ADD CONSTRAINT "template_issue_types_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_issue_types" ADD CONSTRAINT "template_issue_types_issue_type_id_issue_types_id_fk" FOREIGN KEY ("issue_type_id") REFERENCES "public"."issue_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_workflows" ADD CONSTRAINT "project_workflows_project_id_workflows_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_workflows" ADD CONSTRAINT "project_workflows_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_workflows" ADD CONSTRAINT "template_workflows_template_id_workflows_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_workflows" ADD CONSTRAINT "template_workflows_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;