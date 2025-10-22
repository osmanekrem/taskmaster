CREATE TABLE "field_issue_types" (
	"id" text PRIMARY KEY NOT NULL,
	"issue_type_id" text NOT NULL,
	"field_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "field_issue_types" ADD CONSTRAINT "field_issue_types_issue_type_id_issue_types_id_fk" FOREIGN KEY ("issue_type_id") REFERENCES "public"."issue_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_issue_types" ADD CONSTRAINT "field_issue_types_field_id_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE cascade ON UPDATE no action;