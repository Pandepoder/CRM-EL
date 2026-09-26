-- Etapa 3 del plan (docs/PLAN_ADMIN_MUNICIPAL.md): evento masivo y fotos.
--
-- ADITIVA: solo añade columnas nulables, una tabla y unos índices. La versión anterior de la
-- aplicación sigue funcionando contra este esquema: no lee nada de lo nuevo. Se puede correr dos
-- veces sin efecto.
--
-- Escrita a mano, como todas desde la 0019 (ver D6 en el plan).

-- 1. Idempotencia de las altas de campo (3.3) ------------------------------------------------
--
-- Un doble toque, o un reintento tras un corte de señal cuando el servidor sí alcanzó a guardar,
-- creaba el mismo ciudadano o el mismo prospecto dos veces. El teléfono genera una clave por
-- formulario y la manda con cada intento; la base la guarda y un índice único impide la segunda
-- fila. `event_reports` ya tenía la suya desde la 0017, y la usan ahora también las incidencias.
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "client_request_id" uuid;
CREATE UNIQUE INDEX IF NOT EXISTS "contacts_client_request_idx"
  ON "contacts" ("client_request_id")
  WHERE "client_request_id" IS NOT NULL;

ALTER TABLE "rapid_activity_prospects" ADD COLUMN IF NOT EXISTS "client_request_id" uuid;
CREATE UNIQUE INDEX IF NOT EXISTS "rapid_activity_prospects_client_request_idx"
  ON "rapid_activity_prospects" ("client_request_id")
  WHERE "client_request_id" IS NOT NULL;

-- 2. Foto de perfil (3.6) ------------------------------------------------------------------------
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "photo_url" text;

-- 3. Quién subió cada archivo (3.9) --------------------------------------------------------------
--
-- `/api/uploads/<nombre>` entregaba cualquier foto a cualquier sesión. Para decidir quién puede
-- verla hace falta saber quién la subió —la ve mientras llena el formulario, antes de que el
-- registro exista— y, al guardar, que nadie adjunte como propia la foto de otra persona para
-- dejarla a la vista de más gente. Los archivos anteriores a esta migración no tienen fila: se
-- siguen entregando a quien pueda ver el registro que los usa.
CREATE TABLE IF NOT EXISTS "uploaded_files" (
  "file_name" text PRIMARY KEY,
  "uploaded_by_user_id" uuid NOT NULL REFERENCES "user_profiles" ("id"),
  "media_type" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "uploaded_files_media_type_check" CHECK ("media_type" IN ('image', 'video'))
);
CREATE INDEX IF NOT EXISTS "uploaded_files_uploaded_by_idx" ON "uploaded_files" ("uploaded_by_user_id");

-- Para encontrar qué registro usa un archivo sin recorrer las tablas en cada foto que se pide.
CREATE INDEX IF NOT EXISTS "event_reports_media_urls_idx"
  ON "event_reports" USING gin ("media_urls" jsonb_path_ops);
CREATE INDEX IF NOT EXISTS "social_listening_photo_urls_idx"
  ON "social_listening" USING gin ("photo_urls" jsonb_path_ops);
CREATE INDEX IF NOT EXISTS "contacts_barda_photo_url_idx"
  ON "contacts" ("barda_photo_url")
  WHERE "barda_photo_url" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "user_profiles_photo_url_idx"
  ON "user_profiles" ("photo_url")
  WHERE "photo_url" IS NOT NULL;
