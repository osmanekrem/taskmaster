ALTER TABLE "issue_type_select_options" RENAME COLUMN "issue_type_field_option_id" TO "field_option_id";--> statement-breakpoint
ALTER TABLE "issue_type_select_options" DROP CONSTRAINT "issue_type_select_options_issue_type_field_option_id_issue_type_field_options_id_fk";
--> statement-breakpoint
ALTER TABLE "issue_type_select_options" ADD CONSTRAINT "issue_type_select_options_field_option_id_issue_type_field_options_id_fk" FOREIGN KEY ("field_option_id") REFERENCES "public"."issue_type_field_options"("id") ON DELETE cascade ON UPDATE no action;