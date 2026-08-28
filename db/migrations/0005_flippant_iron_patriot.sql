ALTER TABLE "event_reports" ADD COLUMN "section_id" uuid;--> statement-breakpoint
ALTER TABLE "event_reports" ADD COLUMN "assigned_to_user_id" uuid;--> statement-breakpoint
ALTER TABLE "event_reports" ADD COLUMN "event_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event_reports" ADD CONSTRAINT "event_reports_section_id_electoral_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."electoral_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_reports" ADD CONSTRAINT "event_reports_assigned_to_user_id_user_profiles_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;