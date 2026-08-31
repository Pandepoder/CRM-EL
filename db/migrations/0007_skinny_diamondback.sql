CREATE TABLE "contact_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"author_user_id" uuid NOT NULL,
	"note_text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rapid_activity_prospects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prospect_name" text NOT NULL,
	"organization_or_reference" text,
	"profile_type" text DEFAULT 'vecinal' NOT NULL,
	"disposition" text DEFAULT 'interesado' NOT NULL,
	"disposition_notes" text,
	"activity_date" timestamp with time zone DEFAULT now() NOT NULL,
	"location_text" text,
	"commitments" text,
	"private_notes" text,
	"converted_to_contact_id" uuid,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_listening" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid,
	"categories" jsonb NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"photo_urls" jsonb,
	"latitude" double precision,
	"longitude" double precision,
	"location_text" text,
	"status" text DEFAULT 'pendiente' NOT NULL,
	"is_formal_gestion" integer DEFAULT 0 NOT NULL,
	"approved_by_user_id" uuid,
	"resolution_notes" text,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_surveys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"colony_priority_need" text,
	"colony_priority_other" text,
	"tonala_values" text,
	"tonala_values_other" text,
	"services_rating" integer,
	"services_rating_why" text,
	"project_expectations" text,
	"project_expectations_other" text,
	"participation_form" text,
	"participation_form_other" text,
	"open_proposal" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_promotions_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"from_access_type" text NOT NULL,
	"to_access_type" text NOT NULL,
	"reason" text,
	"promoted_by_user_id" uuid NOT NULL,
	"promoted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "origin" text DEFAULT 'toca_toca';--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "actual_contact_user_id" uuid;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "first_contact_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "preferred_contact_method" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "preferred_contact_time" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "pan_militancy" text DEFAULT 'no_registrada';--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "pan_militancy_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "know_me_better" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "barda_photo_url" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "exact_latitude" double precision;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "exact_longitude" double precision;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "access_type" text DEFAULT 'conexion' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "invited_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "parent_enlace_id" uuid;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "personal_slug" text;--> statement-breakpoint
ALTER TABLE "contact_notes" ADD CONSTRAINT "contact_notes_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_notes" ADD CONSTRAINT "contact_notes_author_user_id_user_profiles_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rapid_activity_prospects" ADD CONSTRAINT "rapid_activity_prospects_converted_to_contact_id_contacts_id_fk" FOREIGN KEY ("converted_to_contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rapid_activity_prospects" ADD CONSTRAINT "rapid_activity_prospects_created_by_user_id_user_profiles_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_listening" ADD CONSTRAINT "social_listening_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_listening" ADD CONSTRAINT "social_listening_approved_by_user_id_user_profiles_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_listening" ADD CONSTRAINT "social_listening_created_by_user_id_user_profiles_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_surveys" ADD CONSTRAINT "social_surveys_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_promotions_history" ADD CONSTRAINT "user_promotions_history_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_promotions_history" ADD CONSTRAINT "user_promotions_history_promoted_by_user_id_user_profiles_id_fk" FOREIGN KEY ("promoted_by_user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rapid_activity_prospects_created_by_idx" ON "rapid_activity_prospects" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "rapid_activity_prospects_activity_date_idx" ON "rapid_activity_prospects" USING btree ("activity_date");--> statement-breakpoint
CREATE INDEX "social_listening_status_idx" ON "social_listening" USING btree ("status");--> statement-breakpoint
CREATE INDEX "social_listening_created_by_idx" ON "social_listening" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "social_listening_created_at_idx" ON "social_listening" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_actual_contact_user_id_user_profiles_id_fk" FOREIGN KEY ("actual_contact_user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_reports_assigned_user_idx" ON "event_reports" USING btree ("assigned_to_user_id");--> statement-breakpoint
CREATE INDEX "event_reports_status_idx" ON "event_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "event_reports_category_idx" ON "event_reports" USING btree ("category");--> statement-breakpoint
CREATE INDEX "event_reports_event_date_idx" ON "event_reports" USING btree ("event_date");--> statement-breakpoint
CREATE UNIQUE INDEX "user_profiles_slug_unique" ON "user_profiles" USING btree ("personal_slug");