ALTER TABLE "event_reports" DROP CONSTRAINT "event_reports_category_check";--> statement-breakpoint
ALTER TABLE "event_reports" ADD COLUMN "municipality" text;--> statement-breakpoint
ALTER TABLE "event_reports" ADD COLUMN "district" text;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "municipality" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "section" text;--> statement-breakpoint
ALTER TABLE "event_reports" ADD CONSTRAINT "event_reports_category_check" CHECK ("event_reports"."category" IN ('emergencia', 'incidencia', 'mitin', 'propaganda', 'servicios', 'sospechoso', 'brigada', 'bache', 'alumbrado', 'fuga_agua', 'inundacion', 'basura', 'seguridad', 'lona_danada'));