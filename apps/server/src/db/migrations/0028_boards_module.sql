CREATE TABLE "board_card_layouts" (
	"id" text PRIMARY KEY NOT NULL,
	"board_id" text NOT NULL,
	"card_color_field_id" text,
	"card_color_mapping" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"visible_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"show_avatar" boolean DEFAULT true NOT NULL,
	"show_priority" boolean DEFAULT true NOT NULL,
	"show_issue_type" boolean DEFAULT true NOT NULL,
	"show_labels" boolean DEFAULT false NOT NULL,
	"show_due_date" boolean DEFAULT false NOT NULL,
	"show_estimate" boolean DEFAULT false NOT NULL,
	"card_size" text DEFAULT 'medium' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "board_card_layouts_unique" UNIQUE("board_id")
);
--> statement-breakpoint
CREATE TABLE "board_columns" (
	"id" text PRIMARY KEY NOT NULL,
	"board_id" text NOT NULL,
	"name" text NOT NULL,
	"status_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"min_issues" integer,
	"max_issues" integer,
	"constraint_type" text DEFAULT 'none' NOT NULL,
	"color" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "board_quick_filters" (
	"id" text PRIMARY KEY NOT NULL,
	"board_id" text NOT NULL,
	"name" text NOT NULL,
	"jql" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "board_swimlanes" (
	"id" text PRIMARY KEY NOT NULL,
	"board_id" text NOT NULL,
	"type" text NOT NULL,
	"custom_field_id" text,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "board_swimlanes_unique" UNIQUE("board_id")
);
--> statement-breakpoint
CREATE TABLE "board_user_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"board_id" text NOT NULL,
	"user_id" text NOT NULL,
	"collapsed_swimlanes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active_quick_filters" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"collapsed_columns" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_viewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "board_user_settings_unique" UNIQUE("board_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "boards" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"project_id" text NOT NULL,
	"filter_jql" text,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"owner_id" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "board_card_layouts" ADD CONSTRAINT "board_card_layouts_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_card_layouts" ADD CONSTRAINT "board_card_layouts_card_color_field_id_fields_id_fk" FOREIGN KEY ("card_color_field_id") REFERENCES "public"."fields"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_columns" ADD CONSTRAINT "board_columns_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_quick_filters" ADD CONSTRAINT "board_quick_filters_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_swimlanes" ADD CONSTRAINT "board_swimlanes_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_swimlanes" ADD CONSTRAINT "board_swimlanes_custom_field_id_fields_id_fk" FOREIGN KEY ("custom_field_id") REFERENCES "public"."fields"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_user_settings" ADD CONSTRAINT "board_user_settings_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_user_settings" ADD CONSTRAINT "board_user_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boards" ADD CONSTRAINT "boards_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boards" ADD CONSTRAINT "boards_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "board_columns_board_id_idx" ON "board_columns" USING btree ("board_id");--> statement-breakpoint
CREATE INDEX "board_quick_filters_board_id_idx" ON "board_quick_filters" USING btree ("board_id");--> statement-breakpoint
CREATE INDEX "board_swimlanes_board_id_idx" ON "board_swimlanes" USING btree ("board_id");--> statement-breakpoint
CREATE INDEX "board_user_settings_board_id_idx" ON "board_user_settings" USING btree ("board_id");--> statement-breakpoint
CREATE INDEX "board_user_settings_user_id_idx" ON "board_user_settings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "boards_project_id_idx" ON "boards" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "boards_owner_id_idx" ON "boards" USING btree ("owner_id");