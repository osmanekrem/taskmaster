CREATE TABLE "select-options" (
	"id" text PRIMARY KEY NOT NULL,
	"field_option_id" text NOT NULL,
	"name" text NOT NULL,
	"icon" text
);
--> statement-breakpoint
ALTER TABLE "select-options" ADD CONSTRAINT "select-options_field_option_id_field-options_id_fk" FOREIGN KEY ("field_option_id") REFERENCES "public"."field-options"("id") ON DELETE cascade ON UPDATE no action;