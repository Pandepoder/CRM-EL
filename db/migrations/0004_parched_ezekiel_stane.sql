ALTER TABLE "contacts" DROP CONSTRAINT "contacts_status_check";--> statement-breakpoint
ALTER TABLE "colonies" ADD COLUMN "postal_code" text;--> statement-breakpoint
ALTER TABLE "colonies" ADD COLUMN "municipality" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "municipality" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_status_check" CHECK ("contacts"."status" IN ('active', 'inactive'));