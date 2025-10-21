CREATE TABLE "field-options" (
	"id" text PRIMARY KEY NOT NULL,
	"field_id" text NOT NULL,
	"field_type_id" text NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "field-options" ADD CONSTRAINT "field-options_field_id_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field-options" ADD CONSTRAINT "field-options_field_type_id_field-types_id_fk" FOREIGN KEY ("field_type_id") REFERENCES "public"."field-types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field-type-options" DROP COLUMN "value";