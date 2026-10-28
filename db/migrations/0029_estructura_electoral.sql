-- Estructura Electoral por cobertura (plan de auditoría de menús, fase 4, D4 y D5).
--
-- - `contact_id` (D4): se puede nombrar representante a un ciudadano del padrón, no solo a una cuenta. Por eso
--   `user_id` deja de ser obligatorio: cada fila lleva una de las dos, nunca las dos ni ninguna.
-- - `casilla` (D5): la casilla que cuida un representante de casilla (B, C1, E1…), opcional.
-- - `assigned_by_user_id`: quién lo nombró. Con eso quien coordina cambia o quita lo que nombró su gente. Las
--   filas viejas no lo tienen: se deciden por la persona nombrada.
-- - Un solo vocabulario de roles. Había tres a la vez: las etiquetas de la pantalla
--   («Representante General (RG)»), las de los scripts de carga (`general_responsible`) y las claves
--   (`representante_general`). Los roles que no corresponden a ninguno (p. ej. «Promotor») se quedan como están.
--
-- COMPATIBLE CON LA VERSIÓN ANTERIOR DE LA APLICACIÓN: solo agrega columnas, índices y reglas para lo nuevo.
-- La pantalla anterior une con `user_profiles`, así que no le aparece un nombramiento de ciudadano, sin error;
-- los UPDATE cambian solo la etiqueta del rol, que la pantalla anterior también enseña.
--
-- Las reglas van NOT VALID (primera vez en este repo): valen para todo lo que se escriba desde ahora, sin
-- revisar lo que ya existe. Dentro de un bloque DO que mira pg_constraint, para poder correrla dos veces.
-- Escrita a mano (ver D6 del plan de experiencia sencilla).

ALTER TABLE "electoral_representatives" ADD COLUMN IF NOT EXISTS "contact_id" uuid REFERENCES "contacts" ("id");
ALTER TABLE "electoral_representatives" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "electoral_representatives" ADD COLUMN IF NOT EXISTS "casilla" text;
ALTER TABLE "electoral_representatives" ADD COLUMN IF NOT EXISTS "assigned_by_user_id" uuid REFERENCES "user_profiles" ("id");

UPDATE "electoral_representatives" SET "role" = 'representante_general'
  WHERE "role" <> 'representante_general'
    AND ("role" IN ('Representante General (RG)', 'general_responsible') OR "role" ILIKE 'representante general%');
UPDATE "electoral_representatives" SET "role" = 'representante_casilla'
  WHERE "role" <> 'representante_casilla'
    AND ("role" IN ('Representante de Casilla (RC)', 'casilla_responsible') OR "role" ILIKE 'representante de casilla%');
UPDATE "electoral_representatives" SET "role" = 'coordinador'
  WHERE "role" ILIKE 'coordinador%' AND "role" <> 'coordinador';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'electoral_reps_persona_check') THEN
    ALTER TABLE "electoral_representatives" ADD CONSTRAINT "electoral_reps_persona_check"
      CHECK (("user_id" IS NOT NULL) <> ("contact_id" IS NOT NULL)) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'electoral_reps_role_check') THEN
    ALTER TABLE "electoral_representatives" ADD CONSTRAINT "electoral_reps_role_check"
      CHECK ("role" IN ('coordinador', 'representante_general', 'representante_casilla')) NOT VALID;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "electoral_reps_section_contact_idx"
  ON "electoral_representatives" ("section_id", "contact_id") WHERE "contact_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "electoral_reps_contact_idx"
  ON "electoral_representatives" ("contact_id") WHERE "contact_id" IS NOT NULL;
