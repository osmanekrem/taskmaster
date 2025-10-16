CREATE TABLE "field-type-options" (
	"id" text PRIMARY KEY NOT NULL,
	"field_type_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "field-types" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"component" text NOT NULL,
	"icon" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fields" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"field_type_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "icon" text;--> statement-breakpoint
ALTER TABLE "field-type-options" ADD CONSTRAINT "field-type-options_field_type_id_field-types_id_fk" FOREIGN KEY ("field_type_id") REFERENCES "public"."field-types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fields" ADD CONSTRAINT "fields_field_type_id_field-types_id_fk" FOREIGN KEY ("field_type_id") REFERENCES "public"."field-types"("id") ON DELETE cascade ON UPDATE no action;