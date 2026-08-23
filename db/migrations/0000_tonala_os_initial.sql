CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"before_data" jsonb,
	"after_data" jsonb,
	"correlation_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"catalog_type" text NOT NULL,
	"source_name" text NOT NULL,
	"source_version" text NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "colonies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"catalog_version_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_assignments" (
	"contact_id" uuid PRIMARY KEY NOT NULL,
	"assigned_user_id" uuid NOT NULL,
	"assignment_status" text NOT NULL,
	"assigned_by_user_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_assignments_status_check" CHECK ("contact_assignments"."assignment_status" IN ('active', 'pending')),
	CONSTRAINT "contact_assignments_version_check" CHECK ("contact_assignments"."version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "contact_territory" (
	"contact_id" uuid PRIMARY KEY NOT NULL,
	"colony_id" uuid NOT NULL,
	"territory_status" text NOT NULL,
	"linked_by_user_id" uuid NOT NULL,
	"linked_at" timestamp with time zone NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_territory_status_check" CHECK ("contact_territory"."territory_status" IN ('confirmed')),
	CONSTRAINT "contact_territory_version_check" CHECK ("contact_territory"."version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"referred_by_user_id" uuid,
	"first_name" text,
	"last_name" text,
	"maternal_last_name" text,
	"birth_date" timestamp with time zone,
	"phone" text,
	"email" text,
	"address" text,
	"address_number" text,
	"colony" text,
	"profession" text,
	"company_or_work" text,
	"years_known" integer,
	"skill" text,
	"availability" text,
	"interests" text,
	"past_support" text,
	CONSTRAINT "contacts_status_check" CHECK ("contacts"."status" IN ('active')),
	CONSTRAINT "contacts_version_check" CHECK ("contacts"."version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "electoral_representatives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "electoral_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_num" integer NOT NULL,
	"geom_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "electoral_sections_section_num_unique" UNIQUE("section_num")
);
--> statement-breakpoint
CREATE TABLE "event_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"category" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_reports_category_check" CHECK ("event_reports"."category" IN ('emergencia', 'incidencia', 'mitin', 'propaganda', 'servicios', 'sospechoso', 'brigada'))
);
--> statement-breakpoint
CREATE TABLE "outbox_consumer_receipts" (
	"event_id" uuid NOT NULL,
	"consumer_name" text NOT NULL,
	"processed_at" timestamp with time zone NOT NULL,
	"result_metadata" jsonb,
	CONSTRAINT "outbox_consumer_receipts_consumer_name_check" CHECK (length(trim("outbox_consumer_receipts"."consumer_name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "processed_event_log" (
	"event_id" uuid NOT NULL,
	"consumer_name" text NOT NULL,
	"event_name" text NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"processed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "processed_event_log_consumer_name_check" CHECK (length(trim("processed_event_log"."consumer_name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "projection_event_receipts" (
	"projection_name" text NOT NULL,
	"projection_version" text NOT NULL,
	"event_id" text NOT NULL,
	"event_name" text NOT NULL,
	"event_version" text NOT NULL,
	"event_created_at" timestamp with time zone NOT NULL,
	"processed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "projection_event_receipts_pk" PRIMARY KEY("projection_name","projection_version","event_id"),
	CONSTRAINT "projection_event_receipts_name_check" CHECK (length(trim("projection_event_receipts"."projection_name")) > 0),
	CONSTRAINT "projection_event_receipts_version_check" CHECK (length(trim("projection_event_receipts"."projection_version")) > 0),
	CONSTRAINT "projection_event_receipts_event_id_check" CHECK (length(trim("projection_event_receipts"."event_id")) > 0),
	CONSTRAINT "projection_event_receipts_event_name_check" CHECK (length(trim("projection_event_receipts"."event_name")) > 0),
	CONSTRAINT "projection_event_receipts_event_version_check" CHECK (length(trim("projection_event_receipts"."event_version")) > 0)
);
--> statement-breakpoint
CREATE TABLE "projection_rebuild_receipts" (
	"rebuild_id" text NOT NULL,
	"projection_name" text NOT NULL,
	"projection_version" text NOT NULL,
	"event_id" text NOT NULL,
	"event_name" text NOT NULL,
	"event_version" text NOT NULL,
	"event_created_at" timestamp with time zone NOT NULL,
	"processed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "projection_rebuild_receipts_pk" PRIMARY KEY("rebuild_id","projection_name","projection_version","event_id"),
	CONSTRAINT "projection_rebuild_receipts_rebuild_id_check" CHECK (length(trim("projection_rebuild_receipts"."rebuild_id")) > 0),
	CONSTRAINT "projection_rebuild_receipts_name_check" CHECK (length(trim("projection_rebuild_receipts"."projection_name")) > 0),
	CONSTRAINT "projection_rebuild_receipts_version_check" CHECK (length(trim("projection_rebuild_receipts"."projection_version")) > 0),
	CONSTRAINT "projection_rebuild_receipts_event_id_check" CHECK (length(trim("projection_rebuild_receipts"."event_id")) > 0),
	CONSTRAINT "projection_rebuild_receipts_event_name_check" CHECK (length(trim("projection_rebuild_receipts"."event_name")) > 0),
	CONSTRAINT "projection_rebuild_receipts_event_version_check" CHECK (length(trim("projection_rebuild_receipts"."event_version")) > 0)
);
--> statement-breakpoint
CREATE TABLE "projection_states" (
	"projection_name" text NOT NULL,
	"projection_version" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_processed_event_id" text,
	"last_processed_event_created_at" timestamp with time zone,
	"last_processed_at" timestamp with time zone,
	"rebuild_started_at" timestamp with time zone,
	"rebuild_completed_at" timestamp with time zone,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projection_states_pk" PRIMARY KEY("projection_name","projection_version"),
	CONSTRAINT "projection_states_name_check" CHECK (length(trim("projection_states"."projection_name")) > 0),
	CONSTRAINT "projection_states_version_text_check" CHECK (length(trim("projection_states"."projection_version")) > 0),
	CONSTRAINT "projection_states_status_check" CHECK ("projection_states"."status" IN ('active', 'rebuilding', 'paused', 'failed', 'deprecated')),
	CONSTRAINT "projection_states_failure_count_check" CHECK ("projection_states"."failure_count" >= 0),
	CONSTRAINT "projection_states_version_check" CHECK ("projection_states"."version" >= 1),
	CONSTRAINT "projection_states_checkpoint_pair_check" CHECK ((
        ("projection_states"."last_processed_event_id" IS NULL AND "projection_states"."last_processed_event_created_at" IS NULL)
        OR
        ("projection_states"."last_processed_event_id" IS NOT NULL AND "projection_states"."last_processed_event_created_at" IS NOT NULL)
      ))
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "section_colonies" (
	"section_id" uuid NOT NULL,
	"colony_id" uuid NOT NULL,
	CONSTRAINT "section_colonies_section_id_colony_id_pk" PRIMARY KEY("section_id","colony_id")
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"team_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_members_pk" PRIMARY KEY("team_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"leader_id" uuid NOT NULL,
	"zone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactional_outbox" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"event_name" text NOT NULL,
	"event_version" integer NOT NULL,
	"payload" jsonb NOT NULL,
	"metadata" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"last_error" text,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	CONSTRAINT "transactional_outbox_status_check" CHECK ("transactional_outbox"."status" IN ('pending', 'processing', 'processed', 'dead_letter')),
	CONSTRAINT "transactional_outbox_attempts_check" CHECK ("transactional_outbox"."attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" text,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"password_hash" text,
	"role_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visit_results" (
	"visit_id" uuid PRIMARY KEY NOT NULL,
	"structured_outcome" text NOT NULL,
	"summary" text NOT NULL,
	"completed_by_user_id" uuid NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "visit_results_outcome_check" CHECK ("visit_results"."structured_outcome" IN ('successful', 'no_contact', 'follow_up_required', 'rejected')),
	CONSTRAINT "visit_results_summary_check" CHECK (length(trim("visit_results"."summary")) > 0)
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"id" uuid PRIMARY KEY NOT NULL,
	"contact_id" uuid NOT NULL,
	"colony_id" uuid NOT NULL,
	"assigned_user_id" uuid NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"visit_location_text" text NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"completed_by_user_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "visits_status_check" CHECK ("visits"."status" IN ('scheduled', 'completed')),
	CONSTRAINT "visits_version_check" CHECK ("visits"."version" >= 1),
	CONSTRAINT "visits_location_text_check" CHECK (length(trim("visits"."visit_location_text")) > 0),
	CONSTRAINT "visits_completion_state_check" CHECK ((
        ("visits"."status" = 'scheduled' AND "visits"."completed_at" IS NULL AND "visits"."completed_by_user_id" IS NULL)
        OR
        ("visits"."status" = 'completed' AND "visits"."completed_at" IS NOT NULL AND "visits"."completed_by_user_id" IS NOT NULL)
      ))
);
--> statement-breakpoint
CREATE TABLE "walking_skeleton_projection_v1" (
	"projection_key" text PRIMARY KEY NOT NULL,
	"contact_registered_count" integer DEFAULT 0 NOT NULL,
	"contact_linked_count" integer DEFAULT 0 NOT NULL,
	"responsible_assigned_count" integer DEFAULT 0 NOT NULL,
	"visit_scheduled_count" integer DEFAULT 0 NOT NULL,
	"visit_completed_count" integer DEFAULT 0 NOT NULL,
	"last_event_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "walking_skeleton_projection_key_check" CHECK (length(trim("walking_skeleton_projection_v1"."projection_key")) > 0),
	CONSTRAINT "walking_skeleton_projection_single_row_check" CHECK ("walking_skeleton_projection_v1"."projection_key" = 'global'),
	CONSTRAINT "walking_skeleton_projection_contact_registered_count_check" CHECK ("walking_skeleton_projection_v1"."contact_registered_count" >= 0),
	CONSTRAINT "walking_skeleton_projection_contact_linked_count_check" CHECK ("walking_skeleton_projection_v1"."contact_linked_count" >= 0),
	CONSTRAINT "walking_skeleton_projection_responsible_assigned_count_check" CHECK ("walking_skeleton_projection_v1"."responsible_assigned_count" >= 0),
	CONSTRAINT "walking_skeleton_projection_visit_scheduled_count_check" CHECK ("walking_skeleton_projection_v1"."visit_scheduled_count" >= 0),
	CONSTRAINT "walking_skeleton_projection_visit_completed_count_check" CHECK ("walking_skeleton_projection_v1"."visit_completed_count" >= 0),
	CONSTRAINT "walking_skeleton_projection_version_check" CHECK ("walking_skeleton_projection_v1"."version" >= 1)
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_user_profiles_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colonies" ADD CONSTRAINT "colonies_catalog_version_id_catalog_versions_id_fk" FOREIGN KEY ("catalog_version_id") REFERENCES "public"."catalog_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_assignments" ADD CONSTRAINT "contact_assignments_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_assignments" ADD CONSTRAINT "contact_assignments_assigned_user_id_user_profiles_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_assignments" ADD CONSTRAINT "contact_assignments_assigned_by_user_id_user_profiles_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_territory" ADD CONSTRAINT "contact_territory_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_territory" ADD CONSTRAINT "contact_territory_colony_id_colonies_id_fk" FOREIGN KEY ("colony_id") REFERENCES "public"."colonies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_territory" ADD CONSTRAINT "contact_territory_linked_by_user_id_user_profiles_id_fk" FOREIGN KEY ("linked_by_user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_created_by_user_id_user_profiles_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_referred_by_user_id_user_profiles_id_fk" FOREIGN KEY ("referred_by_user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "electoral_representatives" ADD CONSTRAINT "electoral_representatives_section_id_electoral_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."electoral_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "electoral_representatives" ADD CONSTRAINT "electoral_representatives_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_reports" ADD CONSTRAINT "event_reports_created_by_user_id_user_profiles_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbox_consumer_receipts" ADD CONSTRAINT "outbox_consumer_receipts_event_id_transactional_outbox_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."transactional_outbox"("event_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processed_event_log" ADD CONSTRAINT "processed_event_log_event_id_transactional_outbox_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."transactional_outbox"("event_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_colonies" ADD CONSTRAINT "section_colonies_section_id_electoral_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."electoral_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_colonies" ADD CONSTRAINT "section_colonies_colony_id_colonies_id_fk" FOREIGN KEY ("colony_id") REFERENCES "public"."colonies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_leader_id_user_profiles_id_fk" FOREIGN KEY ("leader_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_results" ADD CONSTRAINT "visit_results_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_results" ADD CONSTRAINT "visit_results_completed_by_user_id_user_profiles_id_fk" FOREIGN KEY ("completed_by_user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_colony_id_colonies_id_fk" FOREIGN KEY ("colony_id") REFERENCES "public"."colonies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_assigned_user_id_user_profiles_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_created_by_user_id_user_profiles_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_completed_by_user_id_user_profiles_id_fk" FOREIGN KEY ("completed_by_user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_versions_source_unique" ON "catalog_versions" USING btree ("catalog_type","source_name","source_version");--> statement-breakpoint
CREATE UNIQUE INDEX "colonies_catalog_name_unique" ON "colonies" USING btree ("catalog_version_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "electoral_reps_section_user_idx" ON "electoral_representatives" USING btree ("section_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "outbox_consumer_receipts_pk" ON "outbox_consumer_receipts" USING btree ("event_id","consumer_name");--> statement-breakpoint
CREATE UNIQUE INDEX "processed_event_log_pk" ON "processed_event_log" USING btree ("event_id","consumer_name");--> statement-breakpoint
CREATE INDEX "projection_event_receipts_projection_idx" ON "projection_event_receipts" USING btree ("projection_name","projection_version");--> statement-breakpoint
CREATE INDEX "projection_event_receipts_event_created_at_idx" ON "projection_event_receipts" USING btree ("event_created_at");--> statement-breakpoint
CREATE INDEX "projection_rebuild_receipts_rebuild_idx" ON "projection_rebuild_receipts" USING btree ("rebuild_id");--> statement-breakpoint
CREATE INDEX "projection_rebuild_receipts_projection_idx" ON "projection_rebuild_receipts" USING btree ("projection_name","projection_version");--> statement-breakpoint
CREATE INDEX "projection_rebuild_receipts_event_created_at_idx" ON "projection_rebuild_receipts" USING btree ("event_created_at");--> statement-breakpoint
CREATE INDEX "projection_states_status_idx" ON "projection_states" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_key_unique" ON "roles" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "user_profiles_email_unique" ON "user_profiles" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "user_profiles_auth_user_id_unique" ON "user_profiles" USING btree ("auth_user_id");