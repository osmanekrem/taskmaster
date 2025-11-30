ALTER TABLE "resolutions" ADD CONSTRAINT "resolutions_name_unique" UNIQUE("name");--> statement-breakpoint
ALTER TABLE "statuses" ADD CONSTRAINT "statuses_name_unique" UNIQUE("name");--> statement-breakpoint
ALTER TABLE "workflow_statuses" ADD CONSTRAINT "workflow_statuses_unique" UNIQUE("workflow_id","status_id");--> statement-breakpoint
ALTER TABLE "workflow_transitions" ADD CONSTRAINT "workflow_transitions_unique" UNIQUE("workflow_id","from_status_id","to_status_id");