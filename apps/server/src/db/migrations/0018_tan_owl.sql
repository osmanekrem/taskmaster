CREATE TABLE "issue_type_field_options" (
	"id" text PRIMARY KEY NOT NULL,
	"issue_type_id" text NOT NULL,
	"field_option_id" text NOT NULL,
	"field_type_option_id" text NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issue_type_select_options" (
	"id" text PRIMARY KEY NOT NULL,
	"issue_type_field_option_id" text NOT NULL,
	"name" text NOT NULL,
	"icon" text,
	"order" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "field_issue_types" RENAME TO "issue_type_fields";--> statement-breakpoint
ALTER TABLE "issue_type_fields" DROP CONSTRAINT "field_issue_types_issue_type_id_issue_types_id_fk";
--> statement-breakpoint
ALTER TABLE "issue_type_fields" DROP CONSTRAINT "field_issue_types_field_id_fields_id_fk";
--> statement-breakpoint
ALTER TABLE "issue_type_fields" ADD COLUMN "field_type_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "issue_type_fields" ADD COLUMN "order" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "issue_type_field_options" ADD CONSTRAINT "issue_type_field_options_issue_type_id_issue_types_id_fk" FOREIGN KEY ("issue_type_id") REFERENCES "public"."issue_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_type_field_options" ADD CONSTRAINT "issue_type_field_options_field_option_id_field-options_id_fk" FOREIGN KEY ("field_option_id") REFERENCES "public"."field-options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_type_field_options" ADD CONSTRAINT "issue_type_field_options_field_type_option_id_field-type-options_id_fk" FOREIGN KEY ("field_type_option_id") REFERENCES "public"."field-type-options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_type_select_options" ADD CONSTRAINT "issue_type_select_options_issue_type_field_option_id_issue_type_field_options_id_fk" FOREIGN KEY ("issue_type_field_option_id") REFERENCES "public"."issue_type_field_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_type_fields" ADD CONSTRAINT "issue_type_fields_issue_type_id_issue_types_id_fk" FOREIGN KEY ("issue_type_id") REFERENCES "public"."issue_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_type_fields" ADD CONSTRAINT "issue_type_fields_field_id_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_type_fields" ADD CONSTRAINT "issue_type_fields_field_type_id_field-types_id_fk" FOREIGN KEY ("field_type_id") REFERENCES "public"."field-types"("id") ON DELETE cascade ON UPDATE no action;