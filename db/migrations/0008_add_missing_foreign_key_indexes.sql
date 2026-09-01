DROP INDEX "colonies_catalog_name_unique";--> statement-breakpoint
ALTER TABLE "electoral_sections" ADD COLUMN "municipality" text;--> statement-breakpoint
ALTER TABLE "electoral_sections" ADD COLUMN "district_federal" integer;--> statement-breakpoint
ALTER TABLE "electoral_sections" ADD COLUMN "district_local" integer;--> statement-breakpoint
ALTER TABLE "event_reports" ADD COLUMN "media_urls" jsonb;--> statement-breakpoint
CREATE UNIQUE INDEX "colonies_catalog_name_muni_unique" ON "colonies" USING btree ("catalog_version_id","name","municipality");--> statement-breakpoint
CREATE INDEX "contact_assignments_assigned_user_idx" ON "contact_assignments" USING btree ("assigned_user_id");--> statement-breakpoint
CREATE INDEX "contact_notes_contact_idx" ON "contact_notes" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "contact_territory_colony_idx" ON "contact_territory" USING btree ("colony_id");--> statement-breakpoint
CREATE INDEX "contact_territory_linked_by_user_idx" ON "contact_territory" USING btree ("linked_by_user_id");--> statement-breakpoint
CREATE INDEX "contacts_created_by_user_idx" ON "contacts" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "contacts_referred_by_user_idx" ON "contacts" USING btree ("referred_by_user_id");--> statement-breakpoint
CREATE INDEX "contacts_section_idx" ON "contacts" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "contacts_actual_contact_user_idx" ON "contacts" USING btree ("actual_contact_user_id");--> statement-breakpoint
CREATE INDEX "inbox_conversations_contact_idx" ON "inbox_conversations" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "inbox_conversations_assigned_to_user_idx" ON "inbox_conversations" USING btree ("assigned_to_user_id");--> statement-breakpoint
CREATE INDEX "inbox_messages_conversation_idx" ON "inbox_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "inventory_transactions_item_idx" ON "inventory_transactions" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "inventory_transactions_assigned_to_user_idx" ON "inventory_transactions" USING btree ("assigned_to_user_id");--> statement-breakpoint
CREATE INDEX "inventory_transactions_performed_by_user_idx" ON "inventory_transactions" USING btree ("performed_by_user_id");--> statement-breakpoint
CREATE INDEX "social_surveys_contact_idx" ON "social_surveys" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "visits_contact_idx" ON "visits" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "visits_colony_idx" ON "visits" USING btree ("colony_id");--> statement-breakpoint
CREATE INDEX "visits_assigned_user_idx" ON "visits" USING btree ("assigned_user_id");--> statement-breakpoint
CREATE INDEX "visits_created_by_user_idx" ON "visits" USING btree ("created_by_user_id");