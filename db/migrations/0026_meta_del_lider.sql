-- Meta del día que fija el líder (plan de experiencia sencilla, `docs/PLAN_EXPERIENCIA_SENCILLA.md`
-- §4, decisión 4). Hasta ahora cada persona elegía su ritmo en su teléfono («Tranquilo», «Normal», «Con
-- todo») sobre una meta fija por rol: 10 acciones al día para quien registra, 5 para el brigadista. Con
-- esta columna, quien manda sobre una persona (su cascada de mando, o administración en su alcance)
-- puede ponerle una meta propia. Sin meta del líder (nulo), todo sigue como antes.
--
-- - `daily_goal`: acciones al día, de 1 a 200. Nulo = la persona elige su ritmo.
-- - `daily_goal_set_by_user_id` y `daily_goal_set_at`: quién la puso y cuándo. El cambio también queda
--   en `audit_logs` (`user.daily_goal_set`).
--
-- Índices: «Mi día», el total de la brigada y las medallas del Resumen cuentan los cierres de cada
-- persona por `completed_by_user_id` y `closed_by_user_id`, que no tenían índice (agente 8 del plan).
--
-- COMPATIBLE CON LA VERSIÓN ANTERIOR DE LA APLICACIÓN: solo añade columnas que admiten nulo, que la
-- versión anterior ni lee ni escribe, y dos índices. No toca `session_version`: cambiar la meta no
-- cierra la sesión de nadie. Se puede correr dos veces sin efecto. Escrita a mano (ver D6).

ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "daily_goal" smallint;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "daily_goal_set_by_user_id" uuid;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "daily_goal_set_at" timestamp with time zone;

DO $$
BEGIN
  ALTER TABLE "user_profiles"
    ADD CONSTRAINT "user_profiles_daily_goal_range" CHECK ("daily_goal" IS NULL OR "daily_goal" BETWEEN 1 AND 200);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "user_profiles"
    ADD CONSTRAINT "user_profiles_daily_goal_set_by_fk"
    FOREIGN KEY ("daily_goal_set_by_user_id") REFERENCES "user_profiles"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "visits_completed_by_user_idx"
  ON "visits" ("completed_by_user_id") WHERE "completed_by_user_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "event_reports_closed_by_user_idx"
  ON "event_reports" ("closed_by_user_id") WHERE "closed_by_user_id" IS NOT NULL;
