-- Etapa 6 del plan (docs/PLAN_ADMIN_MUNICIPAL.md): administrador maestro y administradores municipales.
--
-- Hasta aquí todo administrador veía y gobernaba el sistema entero (A1, A2). Desde esta etapa:
--
-- - Hay UN administrador maestro (MOM): ve los 125 municipios y es el único que crea, cambia o retira
--   administradores y el único que cambia a alguien de municipio. Es una cuenta de administración con
--   la marca `is_master_admin`, no un rol aparte: así todo lo que administración ya podía hacer lo
--   sigue pudiendo el maestro sin tocar cada comprobación, y ninguna pantalla que asigne roles puede
--   fabricar un maestro. Se nombra desde el servidor (`pnpm db:migrate` con ADMIN_EMAIL, o
--   `pnpm admin:rescatar`), nunca desde la aplicación.
-- - Cada administrador municipal gobierna su municipio: la llave `municipality_id` de la migración
--   0022. Un administrador sin municipio real no ve nada más que lo suyo hasta que el maestro se lo
--   asigna: la base no deja entrar a nadie nuevo en ese estado, y a los que ya estaban (los que la
--   0022 dejó en General) no los toca: asignarles municipio es una decisión, no una deducción.
-- - `session_version` sube con cada cambio de rol, de estado, de contraseña o de la marca de maestro
--   —y de municipio, si es administración—, y la sesión abierta con una versión anterior deja de
--   valer en su siguiente petición. Es lo que hace que retirar a alguien o restablecerle la
--   contraseña signifique algo (A8).
--
-- COMPATIBLE CON LA VERSIÓN ANTERIOR DE LA APLICACIÓN: solo añade columnas con valor por omisión,
-- disparadores que la versión anterior no puede violar (no crea maestros ni cambia municipios de
-- administración) e índices. Se puede correr dos veces sin efecto. Escrita a mano (ver D6).

-- 1. Columnas ------------------------------------------------------------------------------------
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "is_master_admin" boolean NOT NULL DEFAULT false;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "session_version" integer NOT NULL DEFAULT 1;
-- Para el panel del maestro: «última entrada» de cada administrador.
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "last_login_at" timestamp with time zone;

-- 2. Un solo maestro -----------------------------------------------------------------------------
--
-- Índice único sobre una constante: dos filas con la marca chocan. Vale también con transacciones
-- simultáneas, cosa que una comprobación en un disparador no garantiza.
CREATE UNIQUE INDEX IF NOT EXISTS "user_profiles_un_solo_maestro_idx" ON "user_profiles" ((true)) WHERE "is_master_admin";

-- 3. Regla de administración ---------------------------------------------------------------------
--
-- - El maestro es administración y está en General: gobierna todo el estado, no un municipio.
-- - Un administrador municipal activo tiene municipio real.
--
-- Solo se comprueba cuando cambia algo que la decide (rol, estado, municipio, marca): una cuenta que
-- la 0022 dejó en General puede seguir cambiando su nombre o su foto, y se le puede asignar municipio
-- o dar de baja; lo que no se puede es activarla, ascenderla o dejarla así a propósito.
CREATE OR REPLACE FUNCTION regla_de_administracion() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  es_administracion boolean := EXISTS (SELECT 1 FROM "roles" WHERE "id" = NEW."role_id" AND "key" = 'admin');
BEGIN
  IF NEW."is_master_admin" THEN
    IF NOT es_administracion THEN
      RAISE EXCEPTION 'El administrador maestro tiene que tener el rol de administración.'
        USING ERRCODE = 'check_violation', CONSTRAINT = 'user_profiles_maestro_es_administracion';
    END IF;
    IF NEW."municipality_id" IS DISTINCT FROM municipio_general() THEN
      RAISE EXCEPTION 'El administrador maestro no pertenece a un municipio: gobierna todo el estado.'
        USING ERRCODE = 'check_violation', CONSTRAINT = 'user_profiles_maestro_en_general';
    END IF;
  ELSIF es_administracion AND NEW."status" = 'active' AND NEW."municipality_id" = municipio_general() THEN
    RAISE EXCEPTION 'Un administrador municipal necesita municipio: el administrador maestro se lo asigna.'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'user_profiles_administracion_con_municipio';
  END IF;
  RETURN NEW;
END
$$;
-- El nombre ordena los disparadores BEFORE (van por orden alfabético): este corre después de
-- `user_profiles_municipio`, que es el que deduce la llave desde el texto.
CREATE OR REPLACE TRIGGER "user_profiles_regla_de_administracion"
  BEFORE INSERT OR UPDATE OF "role_id", "status", "municipality", "municipality_id", "is_master_admin" ON "user_profiles"
  FOR EACH ROW EXECUTE FUNCTION regla_de_administracion();

-- 4. Versión de la sesión ------------------------------------------------------------------------
--
-- Sube con todo cambio que deba cerrar las sesiones abiertas. El municipio solo cuenta para
-- administración: a un brigadista cuyo equipo recibe municipio no hay por qué sacarlo a media calle,
-- y su alcance no depende de su municipio. Corre el último (orden alfabético), con la llave final.
CREATE OR REPLACE FUNCTION subir_version_de_sesion() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."role_id" IS DISTINCT FROM OLD."role_id"
    OR NEW."status" IS DISTINCT FROM OLD."status"
    OR NEW."password_hash" IS DISTINCT FROM OLD."password_hash"
    OR NEW."is_master_admin" IS DISTINCT FROM OLD."is_master_admin"
    OR (NEW."municipality_id" IS DISTINCT FROM OLD."municipality_id"
        AND EXISTS (SELECT 1 FROM "roles" WHERE "id" IN (OLD."role_id", NEW."role_id") AND "key" = 'admin')) THEN
    NEW."session_version" := GREATEST(NEW."session_version", OLD."session_version" + 1);
  END IF;
  RETURN NEW;
END
$$;
CREATE OR REPLACE TRIGGER "user_profiles_version_de_sesion"
  BEFORE UPDATE ON "user_profiles"
  FOR EACH ROW EXECUTE FUNCTION subir_version_de_sesion();

-- 5. El maestro no se mueve de General ----------------------------------------------------------
--
-- Los disparadores de la 0022 le dan municipio a quien está en General en cuanto lidera o se suma a
-- un equipo con municipio, o cambia su texto. Al maestro eso lo convertiría en administrador de un
-- municipio (y la regla del paso 3 rechazaría la operación entera: no podría ni ser integrante de un
-- equipo). Se redefinen igual que en la 0022, saltando al maestro.
CREATE OR REPLACE FUNCTION fijar_municipio_persona() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."is_master_admin" THEN
    NEW."municipality_id" := municipio_general();
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW."municipality_id" IS NULL THEN
      NEW."municipality_id" := municipio_deducido_de_persona(NEW."id", NEW."municipality");
    END IF;
  ELSIF NEW."municipality" IS DISTINCT FROM OLD."municipality" AND NEW."municipality_id" IS NOT DISTINCT FROM OLD."municipality_id" THEN
    NEW."municipality_id" := municipio_deducido_de_persona(NEW."id", NEW."municipality");
  END IF;
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION municipio_por_membresia() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  general uuid := municipio_general();
  municipio uuid;
BEGIN
  SELECT "municipality_id" INTO municipio FROM "teams" WHERE "id" = NEW."team_id";
  IF municipio IS NOT NULL AND municipio <> general THEN
    UPDATE "user_profiles" SET "municipality_id" = municipio
    WHERE "id" = NEW."user_id" AND "municipality_id" = general AND NOT "is_master_admin";
  END IF;
  RETURN NULL;
END
$$;

CREATE OR REPLACE FUNCTION municipio_por_equipo() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  general uuid := municipio_general();
BEGIN
  IF NEW."municipality_id" <> general THEN
    UPDATE "user_profiles" u SET "municipality_id" = NEW."municipality_id"
    WHERE u."municipality_id" = general AND NOT u."is_master_admin"
      AND (u."id" = NEW."leader_id" OR u."id" IN (SELECT tm."user_id" FROM "team_members" tm WHERE tm."team_id" = NEW."id"));
  END IF;
  RETURN NULL;
END
$$;

-- 6. Catálogo por municipio (A10) ----------------------------------------------------------------
--
-- Las opciones «de toda la organización» eran globales: las que creara el administrador de un
-- municipio las veía el de otro. Desde aquí son de su municipio (la llave que ya les pone la 0022, la
-- de quien las crea), y las del maestro —que está en General— son estatales y las ven todos.
--
-- Las que ya existen se quedan estatales: se crearon cuando «organización» quería decir todos, y hay
-- brigadas usándolas. Moverlas al municipio de quien las creó las haría desaparecer de golpe para
-- el resto. Tampoco siguen a quien las creó cuando sale de General (paso siguiente).
UPDATE "activity_catalog_options" SET "municipality_id" = municipio_general()
WHERE "scope" = 'organization' AND "municipality_id" <> municipio_general();

-- El nombre es único dentro de cada municipio, no en todo el estado: «Asamblea» puede existir en
-- Tonalá y en Zapopan. Las de red siguen siendo únicas por quien las creó. Menos estricto que el
-- índice anterior, así que la versión anterior de la aplicación no choca con él.
CREATE UNIQUE INDEX IF NOT EXISTS "activity_catalog_options_unique_name_municipio_idx"
  ON "activity_catalog_options" ("kind", "normalized_name", (
    CASE WHEN "scope" = 'organization' THEN 'organization:' || "municipality_id"::text ELSE "created_by_user_id"::text END
  )) WHERE "archived_at" IS NULL;
DROP INDEX IF EXISTS "activity_catalog_options_unique_name_idx";

-- Quien sale de General se lleva sus opciones de red, no las de organización: esas son estatales.
CREATE OR REPLACE FUNCTION persona_sale_de_general() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  general uuid := municipio_general();
BEGIN
  IF OLD."municipality_id" IS DISTINCT FROM general OR NEW."municipality_id" = general THEN
    RETURN NULL;
  END IF;
  UPDATE "teams" SET "municipality_id" = NEW."municipality_id" WHERE "leader_id" = NEW."id" AND "municipality_id" = general;
  UPDATE "contacts" SET "municipality_id" = NEW."municipality_id" WHERE "created_by_user_id" = NEW."id" AND "municipality_id" = general;
  UPDATE "event_reports" SET "municipality_id" = NEW."municipality_id" WHERE "created_by_user_id" = NEW."id" AND "municipality_id" = general;
  UPDATE "social_listening" SET "municipality_id" = NEW."municipality_id" WHERE "created_by_user_id" = NEW."id" AND "municipality_id" = general;
  UPDATE "rapid_activity_prospects" SET "municipality_id" = NEW."municipality_id" WHERE "created_by_user_id" = NEW."id" AND "municipality_id" = general;
  UPDATE "activity_catalog_options" SET "municipality_id" = NEW."municipality_id"
  WHERE "created_by_user_id" = NEW."id" AND "municipality_id" = general AND "scope" = 'network';
  RETURN NULL;
END
$$;

-- 7. Almacenes con autor (M32) -------------------------------------------------------------------
--
-- Logística no tenía alta de almacenes: el único que creaba la aplicación era un «Almacén
-- Principal» inventado en silencio, sin municipio ni autor. Ahora se dan de alta con su municipio y
-- queda quién los creó.
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "created_by_user_id" uuid REFERENCES "user_profiles"("id");

-- 8. Auditoría -----------------------------------------------------------------------------------
--
-- Lo que se hace desde la consola del servidor (el rescate de administración) no tiene una cuenta
-- detrás: queda sin autor, y la pantalla de auditoría lo dice así. Quitar el NOT NULL no rompe a la
-- versión anterior, que siempre escribe autor.
ALTER TABLE "audit_logs" ALTER COLUMN "actor_user_id" DROP NOT NULL;
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "audit_logs_actor_idx" ON "audit_logs" ("actor_user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "audit_logs_entity_idx" ON "audit_logs" ("entity_id");
