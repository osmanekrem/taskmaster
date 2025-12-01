CREATE TABLE "issue_time_tracking" (
	"id" text PRIMARY KEY NOT NULL,
	"issue_id" text NOT NULL,
	"original_estimate_seconds" integer DEFAULT 0 NOT NULL,
	"remaining_estimate_seconds" integer DEFAULT 0 NOT NULL,
	"time_spent_seconds" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "issue_time_tracking_issue_id_unique" UNIQUE("issue_id")
);
--> statement-breakpoint
CREATE TABLE "time_tracking_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text,
	"working_hours_per_day" integer DEFAULT 8 NOT NULL,
	"working_days_per_week" integer DEFAULT 5 NOT NULL,
	"default_time_unit" text DEFAULT 'hour' NOT NULL,
	"copy_estimate_to_remaining" boolean DEFAULT true NOT NULL,
	"activity_types" text[] DEFAULT '{"development","review","testing","documentation","meeting"}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "time_tracking_settings_project_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE "worklogs" (
	"id" text PRIMARY KEY NOT NULL,
	"issue_id" text NOT NULL,
	"user_id" text NOT NULL,
	"time_spent_seconds" integer NOT NULL,
	"started_at" timestamp NOT NULL,
	"description" text,
	"billable" boolean DEFAULT true NOT NULL,
	"activity_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "issue_time_tracking" ADD CONSTRAINT "issue_time_tracking_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worklogs" ADD CONSTRAINT "worklogs_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worklogs" ADD CONSTRAINT "worklogs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issue_time_tracking_issue_idx" ON "issue_time_tracking" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "worklogs_issue_idx" ON "worklogs" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "worklogs_user_idx" ON "worklogs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "worklogs_started_at_idx" ON "worklogs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "worklogs_issue_user_idx" ON "worklogs" USING btree ("issue_id","user_id");