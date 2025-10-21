ALTER TABLE "field-options" DROP CONSTRAINT "field-options_field_type_option_id_field-types_id_fk";
--> statement-breakpoint
ALTER TABLE "field-options" ADD CONSTRAINT "field-options_field_type_option_id_field-type-options_id_fk" FOREIGN KEY ("field_type_option_id") REFERENCES "public"."field-type-options"("id") ON DELETE cascade ON UPDATE no action;