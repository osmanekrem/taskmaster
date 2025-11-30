ALTER TABLE "field-type-options" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "field-types" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "field-options" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "select-options" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "issue_type_field_options" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "issue_type_select_options" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "field-type-options" CASCADE;--> statement-breakpoint
DROP TABLE "field-types" CASCADE;--> statement-breakpoint
DROP TABLE "field-options" CASCADE;--> statement-breakpoint
DROP TABLE "select-options" CASCADE;--> statement-breakpoint
DROP TABLE "issue_type_field_options" CASCADE;--> statement-breakpoint
DROP TABLE "issue_type_select_options" CASCADE;--> statement-breakpoint
ALTER TABLE "fields" RENAME COLUMN "field_type_id" TO "field_type";--> statement-breakpoint
ALTER TABLE "fields" DROP CONSTRAINT "fields_field_type_id_field-types_id_fk";
--> statement-breakpoint
ALTER TABLE "fields" ADD COLUMN "config" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "fields" ADD COLUMN "options" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "fields" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "fields" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "issue_type_fields" ADD COLUMN "config_override" jsonb;--> statement-breakpoint
ALTER TABLE "issue_type_fields" ADD COLUMN "options_override" jsonb;--> statement-breakpoint
ALTER TABLE "issue_type_fields" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "issue_type_fields" ADD CONSTRAINT "issue_type_fields_issue_type_id_field_id_unique" UNIQUE("issue_type_id","field_id");