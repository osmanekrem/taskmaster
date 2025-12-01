CREATE TYPE "public"."security_level_member_type" AS ENUM('user', 'group', 'project_role', 'reporter', 'assignee', 'project_lead', 'current_user', 'custom_field');--> statement-breakpoint
CREATE TABLE "issue_security_schemes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_security_schemes" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"scheme_id" text NOT NULL,
	"default_level_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_security_schemes_project_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "security_level_members" (
	"id" text PRIMARY KEY NOT NULL,
	"level_id" text NOT NULL,
	"member_type" "security_level_member_type" NOT NULL,
	"member_id" text,
	"custom_field_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_levels" (
	"id" text PRIMARY KEY NOT NULL,
	"scheme_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "security_level_id" text;--> statement-breakpoint
ALTER TABLE "project_security_schemes" ADD CONSTRAINT "project_security_schemes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_security_schemes" ADD CONSTRAINT "project_security_schemes_scheme_id_issue_security_schemes_id_fk" FOREIGN KEY ("scheme_id") REFERENCES "public"."issue_security_schemes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_security_schemes" ADD CONSTRAINT "project_security_schemes_default_level_id_security_levels_id_fk" FOREIGN KEY ("default_level_id") REFERENCES "public"."security_levels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_level_members" ADD CONSTRAINT "security_level_members_level_id_security_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."security_levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_level_members" ADD CONSTRAINT "security_level_members_custom_field_id_fields_id_fk" FOREIGN KEY ("custom_field_id") REFERENCES "public"."fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_levels" ADD CONSTRAINT "security_levels_scheme_id_issue_security_schemes_id_fk" FOREIGN KEY ("scheme_id") REFERENCES "public"."issue_security_schemes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_security_schemes_scheme_idx" ON "project_security_schemes" USING btree ("scheme_id");--> statement-breakpoint
CREATE INDEX "security_level_members_level_idx" ON "security_level_members" USING btree ("level_id");--> statement-breakpoint
CREATE INDEX "security_level_members_member_idx" ON "security_level_members" USING btree ("member_type","member_id");--> statement-breakpoint
CREATE INDEX "security_levels_scheme_idx" ON "security_levels" USING btree ("scheme_id");--> statement-breakpoint
CREATE INDEX "security_levels_sort_idx" ON "security_levels" USING btree ("scheme_id","sort_order");--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_security_level_id_security_levels_id_fk" FOREIGN KEY ("security_level_id") REFERENCES "public"."security_levels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issues_security_level_idx" ON "issues" USING btree ("security_level_id");