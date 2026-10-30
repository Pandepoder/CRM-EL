-- Escucha Social completa (plan de auditoría de menús, fase 3, D6 y D10).
--
-- - `client_request_id`: la petición que la cola del teléfono reenvía sin señal se guarda una sola vez.
-- - `updated_at`, `status_changed_at`, `status_changed_by_user_id`: quién movió el estado y cuándo.
-- - `gestion_dependencia`, `gestion_folio`, `gestion_turnada_at` (D6): a qué dependencia se turnó una gestión
--   formal, con qué folio y cuándo. Antes «gestión formal» era solo una marca que no llevaba a nada.
-- - Índices para «Lo que ha pedido» en la ficha del ciudadano y para la capa «Peticiones» del mapa.
--
-- COMPATIBLE CON LA VERSIÓN ANTERIOR DE LA APLICACIÓN: solo agrega columnas e índices que la versión anterior
-- no usa. Se puede correr dos veces sin efecto. Escrita a mano (ver D6 del plan de experiencia sencilla).

ALTER TABLE "social_listening" ADD COLUMN IF NOT EXISTS "client_request_id" uuid;
CREATE UNIQUE INDEX IF NOT EXISTS "social_listening_client_request_idx"
  ON "social_listening" ("client_request_id") WHERE "client_request_id" IS NOT NULL;

ALTER TABLE "social_listening" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz NOT NULL DEFAULT now();
ALTER TABLE "social_listening" ADD COLUMN IF NOT EXISTS "status_changed_at" timestamptz;
ALTER TABLE "social_listening" ADD COLUMN IF NOT EXISTS "status_changed_by_user_id" uuid REFERENCES "user_profiles" ("id");

ALTER TABLE "social_listening" ADD COLUMN IF NOT EXISTS "gestion_dependencia" text;
ALTER TABLE "social_listening" ADD COLUMN IF NOT EXISTS "gestion_folio" text;
ALTER TABLE "social_listening" ADD COLUMN IF NOT EXISTS "gestion_turnada_at" timestamptz;

CREATE INDEX IF NOT EXISTS "social_listening_contact_idx"
  ON "social_listening" ("contact_id") WHERE "contact_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "social_listening_ubicacion_idx"
  ON "social_listening" ("latitude", "longitude") WHERE "latitude" IS NOT NULL;
