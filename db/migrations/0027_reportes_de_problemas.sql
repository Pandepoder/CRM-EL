-- Reportar un problema (plan de experiencia sencilla, §9). Cualquier persona del panel avisa, desde el menú o
-- desde el aviso de error que le acaba de salir, que algo falla, no se entiende, se ve mal o podría mejorar,
-- y en qué pantalla o función. Administración lo revisa y le contesta; la persona ve en qué va su reporte.
--
-- - `place` es la clave del lugar: la ruta de una pantalla que la persona puede abrir («/equipo») o una
--   función («funcion:sin-senal»). `place_label` guarda el nombre que vio, por si después cambia el menú.
-- - `kind`: falla, no_entiendo, idea, se_ve_mal. `status`: nuevo, en_revision, resuelto, descartado.
-- - `page_path`, `error_message` y `device` (navegador, tamaño de pantalla, con o sin señal) se llenan solos:
--   la persona no tiene que describir su teléfono. Nunca llevan contraseñas ni datos del formulario.
-- - `photo_url`: una captura opcional, subida por la misma persona (`/api/upload`). Solo la ven ella y
--   administración con alcance sobre ella (`lib/archivos.ts`).
-- - `client_request_id`: el reporte que la cola del teléfono reenvía sin señal se guarda una sola vez.
-- - `reporter_seen_at`: cuándo vio quien reportó la última respuesta. Si administración cambia el estado
--   después, la persona tiene una respuesta nueva: se le avisa y sale un número en su menú.
--
-- COMPATIBLE CON LA VERSIÓN ANTERIOR DE LA APLICACIÓN: solo crea una tabla nueva que la versión anterior no
-- usa. Se puede correr dos veces sin efecto. Escrita a mano (ver D6).

CREATE TABLE IF NOT EXISTS "problem_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_by_user_id" uuid NOT NULL REFERENCES "user_profiles"("id"),
  "place" text NOT NULL,
  "place_label" text NOT NULL,
  "kind" text NOT NULL,
  "description" text NOT NULL,
  "photo_url" text,
  "page_path" text,
  "error_message" text,
  "device" jsonb,
  "status" text NOT NULL DEFAULT 'nuevo',
  "resolution_note" text,
  "status_changed_by_user_id" uuid REFERENCES "user_profiles"("id"),
  "status_changed_at" timestamp with time zone,
  "client_request_id" uuid,
  "reporter_seen_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "problem_reports_kind_check" CHECK ("kind" IN ('falla', 'no_entiendo', 'idea', 'se_ve_mal')),
  CONSTRAINT "problem_reports_status_check" CHECK ("status" IN ('nuevo', 'en_revision', 'resuelto', 'descartado')),
  CONSTRAINT "problem_reports_description_check" CHECK (char_length("description") BETWEEN 1 AND 2000)
);

CREATE UNIQUE INDEX IF NOT EXISTS "problem_reports_client_request_idx"
  ON "problem_reports" ("client_request_id") WHERE "client_request_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "problem_reports_status_created_idx" ON "problem_reports" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "problem_reports_created_by_idx" ON "problem_reports" ("created_by_user_id");
CREATE INDEX IF NOT EXISTS "problem_reports_photo_url_idx" ON "problem_reports" ("photo_url") WHERE "photo_url" IS NOT NULL;
