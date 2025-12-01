CREATE TYPE "public"."filter_share_type" AS ENUM('private', 'group', 'project', 'public');--> statement-breakpoint
CREATE TYPE "public"."filter_subscription_schedule" AS ENUM('daily', 'weekly', 'monthly');--> statement-breakpoint
CREATE TABLE "filter_favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filter_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "filter_recently_viewed" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filter_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"last_viewed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "filter_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filter_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"schedule" "filter_subscription_schedule" DEFAULT 'daily' NOT NULL,
	"last_sent_at" timestamp,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "filters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"jql" text NOT NULL,
	"owner_id" text NOT NULL,
	"share_type" "filter_share_type" DEFAULT 'private' NOT NULL,
	"shared_groups" jsonb DEFAULT '[]'::jsonb,
	"shared_projects" jsonb DEFAULT '[]'::jsonb,
	"favorite_count" integer DEFAULT 0 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "filter_favorites" ADD CONSTRAINT "filter_favorites_filter_id_filters_id_fk" FOREIGN KEY ("filter_id") REFERENCES "public"."filters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "filter_favorites" ADD CONSTRAINT "filter_favorites_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "filter_recently_viewed" ADD CONSTRAINT "filter_recently_viewed_filter_id_filters_id_fk" FOREIGN KEY ("filter_id") REFERENCES "public"."filters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "filter_recently_viewed" ADD CONSTRAINT "filter_recently_viewed_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "filter_subscriptions" ADD CONSTRAINT "filter_subscriptions_filter_id_filters_id_fk" FOREIGN KEY ("filter_id") REFERENCES "public"."filters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "filter_subscriptions" ADD CONSTRAINT "filter_subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "filters" ADD CONSTRAINT "filters_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "filter_favorites_unique_idx" ON "filter_favorites" USING btree ("filter_id","user_id");--> statement-breakpoint
CREATE INDEX "filter_favorites_user_idx" ON "filter_favorites" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "filter_recently_viewed_unique_idx" ON "filter_recently_viewed" USING btree ("filter_id","user_id");--> statement-breakpoint
CREATE INDEX "filter_recently_viewed_user_idx" ON "filter_recently_viewed" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "filter_subscriptions_unique_idx" ON "filter_subscriptions" USING btree ("filter_id","user_id");--> statement-breakpoint
CREATE INDEX "filter_subscriptions_user_idx" ON "filter_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "filter_subscriptions_schedule_idx" ON "filter_subscriptions" USING btree ("schedule","is_enabled");--> statement-breakpoint
CREATE INDEX "filters_owner_idx" ON "filters" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "filters_share_type_idx" ON "filters" USING btree ("share_type");