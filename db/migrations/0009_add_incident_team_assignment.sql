ALTER TABLE "event_reports" ADD COLUMN "assigned_team_id" uuid;--> statement-breakpoint
ALTER TABLE "event_reports" ADD CONSTRAINT "event_reports_assigned_team_id_teams_id_fk" FOREIGN KEY ("assigned_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_reports_assigned_team_idx" ON "event_reports" USING btree ("assigned_team_id");--> statement-breakpoint
ALTER TABLE "event_reports" ADD CONSTRAINT "event_reports_status_check" CHECK ("event_reports"."status" IN ('active', 'resolved', 'archived'));