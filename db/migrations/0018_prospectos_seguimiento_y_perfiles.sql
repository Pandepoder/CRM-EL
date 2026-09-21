-- Prospectos: perfiles configurables, próximo paso y trazabilidad de la conversión.
--
-- Aditiva, como la 0017. Los perfiles (vecinal, empresarial…) pasan al mismo catálogo que los
-- tipos de actividad y las etiquetas; `profile_type` (texto) se conserva tal cual para no perder
-- lo ya capturado, y `profile_option_id` apunta a la opción cuando existe.

-- 1. El catálogo admite un tercer tipo de opción: el perfil del prospecto.
ALTER TABLE "activity_catalog_options" DROP CONSTRAINT IF EXISTS "activity_catalog_options_kind_check";
ALTER TABLE "activity_catalog_options" ADD CONSTRAINT "activity_catalog_options_kind_check"
  CHECK ("kind" IN ('type', 'tag', 'profile'));

INSERT INTO "activity_catalog_options"
  ("kind", "key", "name", "normalized_name", "sort_order", "is_system")
VALUES
  ('profile', 'vecinal',     'Vecinal / ciudadano',        'vecinal / ciudadano',        10, true),
  ('profile', 'empresarial', 'Empresarial / comerciante',  'empresarial / comerciante',  20, true),
  ('profile', 'social',      'Líder social',               'lider social',               30, true),
  ('profile', 'religioso',   'Comunidad religiosa',        'comunidad religiosa',        40, true),
  ('profile', 'educativo',   'Sector educativo',           'sector educativo',           50, true),
  ('profile', 'deportivo',   'Sector deportivo',           'sector deportivo',           60, true),
  ('profile', 'politico',    'Actor político',             'actor politico',             70, true),
  ('profile', 'otro',        'Otro',                       'otro',                       80, true)
ON CONFLICT DO NOTHING;

-- 2. Campos propios del prospecto.
ALTER TABLE "rapid_activity_prospects"
  ADD COLUMN IF NOT EXISTS "profile_option_id" uuid REFERENCES "activity_catalog_options"("id"),
  -- Qué sigue con esta persona y cuándo: sin esto un prospecto se queda sin dueño de su siguiente paso.
  ADD COLUMN IF NOT EXISTS "next_step" text,
  ADD COLUMN IF NOT EXISTS "next_step_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "converted_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "converted_by_user_id" uuid REFERENCES "user_profiles"("id");

CREATE INDEX IF NOT EXISTS "rapid_activity_prospects_profile_idx"
  ON "rapid_activity_prospects" ("profile_option_id");
CREATE INDEX IF NOT EXISTS "rapid_activity_prospects_converted_idx"
  ON "rapid_activity_prospects" ("converted_to_contact_id");

-- 3. Lo ya capturado apunta a su opción de catálogo por la clave que tenía.
UPDATE "rapid_activity_prospects" p
SET "profile_option_id" = o."id"
FROM "activity_catalog_options" o
WHERE p."profile_option_id" IS NULL
  AND o."kind" = 'profile' AND o."is_system" AND o."key" = p."profile_type";

-- Los ya convertidos conservan su fecha de conversión aproximada: la del propio registro.
UPDATE "rapid_activity_prospects"
SET "converted_at" = "created_at"
WHERE "converted_to_contact_id" IS NOT NULL AND "converted_at" IS NULL;
