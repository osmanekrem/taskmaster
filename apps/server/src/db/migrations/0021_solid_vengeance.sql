ALTER TABLE "issue_type_field_options" RENAME COLUMN "issue_type_id" TO "issue_type_field_id";--> statement-breakpoint
ALTER TABLE "issue_type_field_options" DROP CONSTRAINT "issue_type_field_options_issue_type_id_issue_types_id_fk";
--> statement-breakpoint
ALTER TABLE "issue_type_field_options" DROP CONSTRAINT "issue_type_field_options_field_type_option_id_field-type-options_id_fk";
--> statement-breakpoint
ALTER TABLE "issue_type_fields" DROP CONSTRAINT "issue_type_fields_field_type_id_field-types_id_fk";
--> statement-breakpoint
ALTER TABLE "issue_type_field_options" ADD CONSTRAINT "issue_type_field_options_issue_type_field_id_issue_type_fields_id_fk" FOREIGN KEY ("issue_type_field_id") REFERENCES "public"."issue_type_fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_type_field_options" DROP COLUMN "field_type_option_id";--> statement-breakpoint
ALTER TABLE "issue_type_fields" DROP COLUMN "field_type_id";