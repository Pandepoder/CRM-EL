-- Etapa 5 del plan (docs/PLAN_ADMIN_MUNICIPAL.md): el municipio como llave obligatoria.
--
-- Hasta aquí el municipio era un texto libre en cada tabla —y en `contacts`, cifrado, así que ni
-- siquiera se podía consultar—. Esta migración crea el catálogo `municipalities` (los 125 de Jalisco
-- y la fila especial «General (estatal)») y le da a cada registro de las ocho tablas que lo
-- necesitan una llave `municipality_id`, rellena y obligatoria. Lo que no se puede resolver queda en
-- General, a la vista y reasignable desde la pantalla «Sin municipio» —nunca en nulo—.
--
-- La etapa 6 usará esta llave como frontera: un administrador municipal verá su municipio y no los
-- demás. Aquí todavía no se filtra nada.
--
-- COMPATIBLE CON LA VERSIÓN ANTERIOR DE LA APLICACIÓN. Durante el despliegue la versión anterior
-- sigue escribiendo unos segundos sin conocer la columna. Por eso quien la llena al insertar es la
-- base (los disparadores del paso 8), con las mismas reglas del relleno: ninguna inserción, de
-- ninguna versión ni de ningún script, puede dejar una fila sin municipio, y el `NOT NULL` no rompe
-- nada. La columna de texto `municipality` se conserva; se retira en la etapa 8.
--
-- Se puede correr dos veces sin efecto. Escrita a mano, como todas desde la 0019 (ver D6 en el plan).

-- 1. Nombre normalizado ---------------------------------------------------------------------------
--
-- Minúsculas, sin acentos y solo letras, números y espacios sueltos: «TONALÁ», «Tonala» y
-- « tonalá » dan lo mismo. Las mayúsculas acentuadas se traducen antes de `lower`, que con un
-- locale `C` no las tocaría. Es la misma idea que `sinAcentos` en `lib/municipios-jalisco.ts`.
CREATE OR REPLACE FUNCTION municipio_clave(texto text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT btrim(regexp_replace(
    translate(
      lower(translate(coalesce(texto, ''), 'ÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ', 'AAAAAEEEEIIIIOOOOOUUUUNC')),
      'áàäâãéèëêíìïîóòöôõúùüûñç', 'aaaaaeeeeiiiiooooouuuunc'),
    '[^a-z0-9]+', ' ', 'g'))
$$;

-- 2. Catálogo -------------------------------------------------------------------------------------
--
-- Los 125 municipios del catálogo que ya usa la aplicación (`public/geo/jalisco-municipalities.json`,
-- exportado de `electoral_sections`), con el nombre exacto del INE. Más «General (estatal)»: lo que
-- es de todo el estado o no se pudo ubicar. Con esta tabla, «TONALA», «Zapopan Jal.» o «Tlaquepaque»
-- dejan de poder entrar como municipio.
CREATE TABLE IF NOT EXISTS "municipalities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "clave" text NOT NULL,
  "kind" text NOT NULL DEFAULT 'municipio',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "municipalities_kind_check" CHECK ("kind" IN ('municipio', 'general'))
);
CREATE UNIQUE INDEX IF NOT EXISTS "municipalities_name_idx" ON "municipalities" ("name");
CREATE UNIQUE INDEX IF NOT EXISTS "municipalities_clave_idx" ON "municipalities" ("clave");
-- Una sola fila General.
CREATE UNIQUE INDEX IF NOT EXISTS "municipalities_general_idx" ON "municipalities" ("kind") WHERE "kind" = 'general';

INSERT INTO "municipalities" ("name", "clave", "kind")
SELECT nombre, municipio_clave(nombre), 'municipio'
FROM unnest(ARRAY[
  'Acatic', 'Acatlán de Juárez', 'Ahualulco de Mercado', 'Amacueca', 'Amatitán', 'Ameca', 'Arandas',
  'Atemajac de Brizuela', 'Atengo', 'Atenguillo', 'Atotonilco el Alto', 'Atoyac',
  'Autlán de Navarro', 'Ayotlán', 'Ayutla', 'Bolaños', 'Cabo Corrientes', 'Cañadas de Obregón',
  'Casimiro Castillo', 'Chapala', 'Chimaltitán', 'Chiquilistlán', 'Cihuatlán', 'Cocula', 'Colotlán',
  'Concepción de Buenos Aires', 'Cuautitlán de García Barragán', 'Cuautla', 'Cuquío', 'Degollado',
  'Ejutla', 'El Arenal', 'El Grullo', 'El Limón', 'El Salto', 'Encarnación de Díaz', 'Etzatlán',
  'Gómez Farías', 'Guachinango', 'Guadalajara', 'Hostotipaquillo', 'Huejúcar', 'Huejuquilla el Alto',
  'Ixtlahuacán de los Membrillos', 'Ixtlahuacán del Río', 'Jalostotitlán', 'Jamay', 'Jesús María',
  'Jilotlán de los Dolores', 'Jocotepec', 'Juanacatlán', 'Juchitlán', 'La Barca', 'La Huerta',
  'La Manzanilla de la Paz', 'Lagos de Moreno', 'Magdalena', 'Mascota', 'Mazamitla', 'Mexticacán',
  'Mezquitic', 'Mixtlán', 'Ocotlán', 'Ojuelos de Jalisco', 'Pihuamo', 'Poncitlán', 'Puerto Vallarta',
  'Quitupan', 'San Cristóbal de la Barranca', 'San Diego de Alejandría', 'San Gabriel',
  'San Ignacio Cerro Gordo', 'San Juan de los Lagos', 'San Juanito de Escobedo', 'San Julián',
  'San Marcos', 'San Martín de Bolaños', 'San Martín Hidalgo', 'San Miguel el Alto',
  'San Pedro Tlaquepaque', 'San Sebastián del Oeste', 'Santa María de los Ángeles',
  'Santa María del Oro', 'Sayula', 'Tala', 'Talpa de Allende', 'Tamazula de Gordiano', 'Tapalpa',
  'Tecalitlán', 'Techaluta de Montenegro', 'Tecolotlán', 'Tenamaxtlán', 'Teocaltiche',
  'Teocuitatlán de Corona', 'Tepatitlán de Morelos', 'Tequila', 'Teuchitlán', 'Tizapán el Alto',
  'Tlajomulco de Zúñiga', 'Tolimán', 'Tomatlán', 'Tonalá', 'Tonaya', 'Tonila', 'Totatiche',
  'Tototlán', 'Tuxcacuesco', 'Tuxcueca', 'Tuxpan', 'Unión de San Antonio', 'Unión de Tula',
  'Valle de Guadalupe', 'Valle de Juárez', 'Villa Corona', 'Villa Guerrero', 'Villa Hidalgo',
  'Villa Purificación', 'Yahualica de González Gallo', 'Zacoalco de Torres', 'Zapopan', 'Zapotiltic',
  'Zapotitlán de Vadillo', 'Zapotlán del Rey', 'Zapotlán el Grande', 'Zapotlanejo'
]) AS nombre
ON CONFLICT DO NOTHING;

INSERT INTO "municipalities" ("name", "clave", "kind")
VALUES ('General (estatal)', 'general (estatal)', 'general')
ON CONFLICT DO NOTHING;

-- 3. Resolver un municipio ------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION municipio_general() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT "id" FROM "municipalities" WHERE "kind" = 'general'
$$;

-- El municipio al que se refiere un texto libre, o NULL si no se puede saber con certeza. Misma regla
-- que `resolverMunicipio` en `lib/municipios-jalisco.ts` (una prueba de integración las compara):
--   1. el nombre exacto, sin importar acentos ni mayúsculas, y sin «Municipio de» ni «, Jalisco»;
--   2. un nombre completo que aparece dentro del texto; gana el más largo, para que «San Pedro
--      Tlaquepaque» no pierda contra un nombre más corto;
--   3. el texto es un pedazo de un único nombre («Tlaquepaque», «Tlajomulco»).
-- Ante la duda —«Ixtlahuacán» puede ser de los Membrillos o del Río— devuelve NULL: un municipio
-- inventado se guarda y ya nadie lo revisa; uno en General se ve.
CREATE OR REPLACE FUNCTION municipio_por_texto(texto text) RETURNS uuid
LANGUAGE plpgsql STABLE AS $$
DECLARE
  t text := municipio_clave(texto);
  resultado uuid;
  coincidencias integer;
BEGIN
  t := btrim(regexp_replace(t, '^(municipio|mpio) de ', ''));
  -- «Jalisco» solo tampoco es un municipio: no debe acabar como pedazo de «Ojuelos de Jalisco».
  t := btrim(regexp_replace(t, '(^| )(jalisco|jal)$', ''));
  IF length(t) < 3 THEN
    RETURN NULL;
  END IF;

  SELECT "id" INTO resultado FROM "municipalities" WHERE "kind" = 'municipio' AND "clave" = t;
  IF resultado IS NOT NULL THEN
    RETURN resultado;
  END IF;

  SELECT "id" INTO resultado FROM "municipalities"
  WHERE "kind" = 'municipio' AND position(' ' || "clave" || ' ' IN ' ' || t || ' ') > 0
  ORDER BY length("clave") DESC, "clave"
  LIMIT 1;
  IF resultado IS NOT NULL THEN
    RETURN resultado;
  END IF;

  SELECT count(*), min("id"::text)::uuid INTO coincidencias, resultado FROM "municipalities"
  WHERE "kind" = 'municipio' AND position(' ' || t || ' ' IN ' ' || "clave" || ' ') > 0;
  IF coincidencias = 1 THEN
    RETURN resultado;
  END IF;
  RETURN NULL;
END
$$;

-- 4. Columnas -------------------------------------------------------------------------------------
--
-- Las secciones también la llevan (nulable: una sección sin municipio no se inventa). Es la verdad
-- geográfica del ciudadano y de la incidencia, y así se busca por llave en vez de por nombre.
ALTER TABLE "electoral_sections" ADD COLUMN IF NOT EXISTS "municipality_id" uuid REFERENCES "municipalities" ("id");
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "municipality_id" uuid REFERENCES "municipalities" ("id");
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "municipality_id" uuid REFERENCES "municipalities" ("id");
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "municipality_id" uuid REFERENCES "municipalities" ("id");
ALTER TABLE "event_reports" ADD COLUMN IF NOT EXISTS "municipality_id" uuid REFERENCES "municipalities" ("id");
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "municipality_id" uuid REFERENCES "municipalities" ("id");
ALTER TABLE "activity_catalog_options" ADD COLUMN IF NOT EXISTS "municipality_id" uuid REFERENCES "municipalities" ("id");
ALTER TABLE "social_listening" ADD COLUMN IF NOT EXISTS "municipality_id" uuid REFERENCES "municipalities" ("id");
ALTER TABLE "rapid_activity_prospects" ADD COLUMN IF NOT EXISTS "municipality_id" uuid REFERENCES "municipalities" ("id");

CREATE OR REPLACE FUNCTION municipio_de_seccion(seccion uuid) RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT "municipality_id" FROM "electoral_sections" WHERE "id" = seccion
$$;

CREATE OR REPLACE FUNCTION municipio_de_persona(persona uuid) RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT "municipality_id" FROM "user_profiles" WHERE "id" = persona
$$;

-- 5. Relleno, por orden de confianza --------------------------------------------------------------

-- Secciones: su nombre. Se resuelve una vez por nombre distinto, no una por sección.
UPDATE "electoral_sections" s
SET "municipality_id" = r.id
FROM (
  SELECT "municipality" AS nombre, municipio_por_texto("municipality") AS id
  FROM (SELECT DISTINCT "municipality" FROM "electoral_sections" WHERE "municipality" IS NOT NULL) d
) r
WHERE s."municipality" = r.nombre AND s."municipality_id" IS NULL AND r.id IS NOT NULL;

-- Si una sección trae un municipio que no está en el catálogo, se detiene todo: seguir dejaría a sus
-- ciudadanos e incidencias en General en silencio. Se corrige el catálogo y se vuelve a desplegar.
DO $$
DECLARE
  desconocidos text;
BEGIN
  SELECT string_agg(DISTINCT format('«%s»', "municipality"), ', ') INTO desconocidos
  FROM "electoral_sections"
  WHERE "municipality" IS NOT NULL AND "municipality_id" IS NULL;
  IF desconocidos IS NOT NULL THEN
    RAISE EXCEPTION 'Secciones con un municipio que no está en el catálogo: %. No se aplicó nada.', desconocidos;
  END IF;
END
$$;

-- Personas: su municipio → el del equipo que lidera → el del equipo al que pertenece → General.
-- Los equipos se leen por su texto, no por su llave, que se rellena después con la del líder.
UPDATE "user_profiles" u
SET "municipality_id" = COALESCE(
  municipio_por_texto(u."municipality"),
  (SELECT municipio_por_texto(t."municipality") FROM "teams" t
   WHERE t."leader_id" = u."id" AND municipio_por_texto(t."municipality") IS NOT NULL
   ORDER BY t."created_at", t."id" LIMIT 1),
  (SELECT municipio_por_texto(t."municipality") FROM "team_members" tm JOIN "teams" t ON t."id" = tm."team_id"
   WHERE tm."user_id" = u."id" AND municipio_por_texto(t."municipality") IS NOT NULL
   ORDER BY tm."joined_at", t."id" LIMIT 1),
  municipio_general()
)
WHERE u."municipality_id" IS NULL;

-- Equipos: el suyo → el de su líder → General.
UPDATE "teams" t
SET "municipality_id" = COALESCE(municipio_por_texto(t."municipality"), municipio_de_persona(t."leader_id"), municipio_general())
WHERE t."municipality_id" IS NULL;

-- Ciudadanos: el de su sección → el de quien lo registró → General. Nunca el campo `municipality`,
-- que va cifrado y no se puede leer en SQL.
UPDATE "contacts" c
SET "municipality_id" = COALESCE(municipio_de_seccion(c."section_id"), municipio_de_persona(c."created_by_user_id"), municipio_general())
WHERE c."municipality_id" IS NULL;

-- Incidencias y actividades: el suyo → el de su sección → el de quien la creó → General.
UPDATE "event_reports" e
SET "municipality_id" = COALESCE(municipio_por_texto(e."municipality"), municipio_de_seccion(e."section_id"), municipio_de_persona(e."created_by_user_id"), municipio_general())
WHERE e."municipality_id" IS NULL;

-- Almacenes: no guardan quién los creó. Se toma el último tramo de su dirección («…, Centro, Tonalá»)
-- y, si no dice un municipio con certeza, General. Solo el último tramo: en «Calle Guadalajara 12,
-- Zapopan» la dirección entera nombra dos municipios.
UPDATE "warehouses" w
SET "municipality_id" = COALESCE(municipio_por_texto(regexp_replace(coalesce(w."location", ''), '^.*,', '')), municipio_general())
WHERE w."municipality_id" IS NULL;

-- Catálogo, escucha y prospectos: el de quien los creó → General.
UPDATE "activity_catalog_options" o
SET "municipality_id" = COALESCE(municipio_de_persona(o."created_by_user_id"), municipio_general())
WHERE o."municipality_id" IS NULL;

UPDATE "social_listening" s
SET "municipality_id" = COALESCE(municipio_de_persona(s."created_by_user_id"), municipio_general())
WHERE s."municipality_id" IS NULL;

UPDATE "rapid_activity_prospects" p
SET "municipality_id" = COALESCE(municipio_de_persona(p."created_by_user_id"), municipio_general())
WHERE p."municipality_id" IS NULL;

-- Un ciudadano con una sección cartografiada nunca puede quedar en General: si pasa, el relleno está
-- mal y se detiene todo.
DO $$
DECLARE
  mal integer;
BEGIN
  SELECT count(*) INTO mal
  FROM "contacts" c JOIN "electoral_sections" s ON s."id" = c."section_id"
  WHERE s."municipality_id" IS NOT NULL AND c."municipality_id" IS DISTINCT FROM s."municipality_id";
  IF mal > 0 THEN
    RAISE EXCEPTION '% ciudadanos quedaron en un municipio distinto al de su sección. No se aplicó nada.', mal;
  END IF;
END
$$;

-- 6. Obligatoria ------------------------------------------------------------------------------------
ALTER TABLE "user_profiles" ALTER COLUMN "municipality_id" SET NOT NULL;
ALTER TABLE "teams" ALTER COLUMN "municipality_id" SET NOT NULL;
ALTER TABLE "contacts" ALTER COLUMN "municipality_id" SET NOT NULL;
ALTER TABLE "event_reports" ALTER COLUMN "municipality_id" SET NOT NULL;
ALTER TABLE "warehouses" ALTER COLUMN "municipality_id" SET NOT NULL;
ALTER TABLE "activity_catalog_options" ALTER COLUMN "municipality_id" SET NOT NULL;
ALTER TABLE "social_listening" ALTER COLUMN "municipality_id" SET NOT NULL;
ALTER TABLE "rapid_activity_prospects" ALTER COLUMN "municipality_id" SET NOT NULL;

-- 7. Índices --------------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "electoral_sections_municipality_id_idx" ON "electoral_sections" ("municipality_id");
CREATE INDEX IF NOT EXISTS "user_profiles_municipality_id_idx" ON "user_profiles" ("municipality_id");
CREATE INDEX IF NOT EXISTS "teams_municipality_id_idx" ON "teams" ("municipality_id");
CREATE INDEX IF NOT EXISTS "contacts_municipality_status_idx" ON "contacts" ("municipality_id", "status");
CREATE INDEX IF NOT EXISTS "event_reports_municipality_status_idx" ON "event_reports" ("municipality_id", "status");
CREATE INDEX IF NOT EXISTS "warehouses_municipality_id_idx" ON "warehouses" ("municipality_id");
CREATE INDEX IF NOT EXISTS "activity_catalog_options_municipality_id_idx" ON "activity_catalog_options" ("municipality_id");
CREATE INDEX IF NOT EXISTS "social_listening_municipality_id_idx" ON "social_listening" ("municipality_id");
CREATE INDEX IF NOT EXISTS "rapid_activity_prospects_municipality_id_idx" ON "rapid_activity_prospects" ("municipality_id");

-- 8. Al insertar y al cambiar -------------------------------------------------------------------
--
-- Las mismas reglas del relleno, para toda fila nueva. Si la aplicación trae la llave, se respeta
-- (salvo en ciudadanos: su sección manda). Si no la trae, la pone la base. Así ningún camino —una
-- pantalla, un script, la versión anterior durante el despliegue— deja una fila sin municipio.

-- Secciones: su nombre.
CREATE OR REPLACE FUNCTION fijar_municipio_seccion() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW."municipality_id" IS NULL THEN
      NEW."municipality_id" := municipio_por_texto(NEW."municipality");
    END IF;
  ELSIF NEW."municipality" IS DISTINCT FROM OLD."municipality" AND NEW."municipality_id" IS NOT DISTINCT FROM OLD."municipality_id" THEN
    NEW."municipality_id" := municipio_por_texto(NEW."municipality");
  END IF;
  RETURN NEW;
END
$$;
CREATE OR REPLACE TRIGGER "electoral_sections_municipio"
  BEFORE INSERT OR UPDATE OF "municipality", "municipality_id" ON "electoral_sections"
  FOR EACH ROW EXECUTE FUNCTION fijar_municipio_seccion();

-- Cada disparador aplica la regla del relleno: al insertar, si la aplicación no trae la llave; y al
-- cambiar lo que la decide (el municipio escrito, la sección, el líder), si la aplicación no la cambió
-- a la vez. Así quitarle a un equipo su municipio escrito no le deja uno que ya no dice nada.

-- Personas: su municipio escrito → el del equipo que lidera → el del equipo al que pertenece →
-- General. Al darse de alta todavía no tienen equipo (se entra con el QR de un equipo y luego se suma
-- a él): eso lo resuelven los disparadores de equipos, más abajo.
CREATE OR REPLACE FUNCTION municipio_deducido_de_persona(persona uuid, texto text) RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    municipio_por_texto(texto),
    (SELECT t."municipality_id" FROM "teams" t
     WHERE t."leader_id" = persona AND t."municipality_id" <> municipio_general()
     ORDER BY t."created_at", t."id" LIMIT 1),
    (SELECT t."municipality_id" FROM "team_members" tm JOIN "teams" t ON t."id" = tm."team_id"
     WHERE tm."user_id" = persona AND t."municipality_id" <> municipio_general()
     ORDER BY tm."joined_at", t."id" LIMIT 1),
    municipio_general()
  )
$$;

CREATE OR REPLACE FUNCTION fijar_municipio_persona() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW."municipality_id" IS NULL THEN
      NEW."municipality_id" := municipio_deducido_de_persona(NEW."id", NEW."municipality");
    END IF;
  ELSIF NEW."municipality" IS DISTINCT FROM OLD."municipality" AND NEW."municipality_id" IS NOT DISTINCT FROM OLD."municipality_id" THEN
    NEW."municipality_id" := municipio_deducido_de_persona(NEW."id", NEW."municipality");
  END IF;
  RETURN NEW;
END
$$;
CREATE OR REPLACE TRIGGER "user_profiles_municipio"
  BEFORE INSERT OR UPDATE OF "municipality" ON "user_profiles"
  FOR EACH ROW EXECUTE FUNCTION fijar_municipio_persona();

-- Equipos: el suyo escrito → el de su líder → General.
CREATE OR REPLACE FUNCTION fijar_municipio_equipo() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW."municipality_id" IS NULL)
    OR (TG_OP = 'UPDATE' AND NEW."municipality_id" IS NOT DISTINCT FROM OLD."municipality_id"
        AND (NEW."municipality" IS DISTINCT FROM OLD."municipality" OR NEW."leader_id" IS DISTINCT FROM OLD."leader_id")) THEN
    NEW."municipality_id" := COALESCE(municipio_por_texto(NEW."municipality"), municipio_de_persona(NEW."leader_id"), municipio_general());
  END IF;
  RETURN NEW;
END
$$;
CREATE OR REPLACE TRIGGER "teams_municipio"
  BEFORE INSERT OR UPDATE OF "municipality", "leader_id" ON "teams"
  FOR EACH ROW EXECUTE FUNCTION fijar_municipio_equipo();

-- Quien está en General y lidera o se suma a un equipo con municipio, lo toma. Nunca cambia el de
-- quien ya tiene uno: eso es una decisión, no una deducción. Los disparadores por columna solo
-- miran las columnas del SET, no lo que cambió otro disparador: por eso escuchan también el texto.
CREATE OR REPLACE FUNCTION municipio_por_membresia() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  general uuid := municipio_general();
  municipio uuid;
BEGIN
  SELECT "municipality_id" INTO municipio FROM "teams" WHERE "id" = NEW."team_id";
  IF municipio IS NOT NULL AND municipio <> general THEN
    UPDATE "user_profiles" SET "municipality_id" = municipio
    WHERE "id" = NEW."user_id" AND "municipality_id" = general;
  END IF;
  RETURN NULL;
END
$$;
CREATE OR REPLACE TRIGGER "team_members_municipio"
  AFTER INSERT ON "team_members"
  FOR EACH ROW EXECUTE FUNCTION municipio_por_membresia();

CREATE OR REPLACE FUNCTION municipio_por_equipo() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  general uuid := municipio_general();
BEGIN
  IF NEW."municipality_id" <> general THEN
    UPDATE "user_profiles" u SET "municipality_id" = NEW."municipality_id"
    WHERE u."municipality_id" = general
      AND (u."id" = NEW."leader_id" OR u."id" IN (SELECT tm."user_id" FROM "team_members" tm WHERE tm."team_id" = NEW."id"));
  END IF;
  RETURN NULL;
END
$$;
CREATE OR REPLACE TRIGGER "teams_municipio_de_su_gente"
  AFTER INSERT OR UPDATE OF "municipality", "municipality_id", "leader_id" ON "teams"
  FOR EACH ROW EXECUTE FUNCTION municipio_por_equipo();

-- Quien sale de General se lleva lo que registró y quedó en General solo por no tener municipio: sus
-- ciudadanos sin sección, sus incidencias, su escucha, sus prospectos, sus opciones de catálogo y los
-- equipos que lidera. Es la misma regla del relleno («el de quien lo creó»), aplicada cuando por fin
-- se sabe. Hoy «General» significa «sin municipio confirmado»: no hay forma de marcar algo como
-- estatal a propósito, así que no se deshace ninguna decisión.
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
  UPDATE "activity_catalog_options" SET "municipality_id" = NEW."municipality_id" WHERE "created_by_user_id" = NEW."id" AND "municipality_id" = general;
  RETURN NULL;
END
$$;
CREATE OR REPLACE TRIGGER "user_profiles_sale_de_general"
  AFTER UPDATE OF "municipality", "municipality_id" ON "user_profiles"
  FOR EACH ROW EXECUTE FUNCTION persona_sale_de_general();

-- Ciudadanos: su sección manda siempre; sin sección, lo que traiga la aplicación → el de quien lo
-- registró → General.
CREATE OR REPLACE FUNCTION fijar_municipio_ciudadano() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  de_su_seccion uuid := municipio_de_seccion(NEW."section_id");
BEGIN
  IF de_su_seccion IS NOT NULL THEN
    NEW."municipality_id" := de_su_seccion;
  ELSIF TG_OP = 'INSERT' AND NEW."municipality_id" IS NULL THEN
    NEW."municipality_id" := COALESCE(municipio_de_persona(NEW."created_by_user_id"), municipio_general());
  END IF;
  RETURN NEW;
END
$$;
CREATE OR REPLACE TRIGGER "contacts_municipio"
  BEFORE INSERT OR UPDATE OF "section_id", "municipality_id" ON "contacts"
  FOR EACH ROW EXECUTE FUNCTION fijar_municipio_ciudadano();

-- Incidencias y actividades: la suya escrita → la de su sección → la de quien la creó → General.
CREATE OR REPLACE FUNCTION fijar_municipio_incidencia() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW."municipality_id" IS NULL)
    OR (TG_OP = 'UPDATE' AND NEW."municipality_id" IS NOT DISTINCT FROM OLD."municipality_id"
        AND (NEW."municipality" IS DISTINCT FROM OLD."municipality" OR NEW."section_id" IS DISTINCT FROM OLD."section_id")) THEN
    NEW."municipality_id" := COALESCE(municipio_por_texto(NEW."municipality"), municipio_de_seccion(NEW."section_id"),
      municipio_de_persona(NEW."created_by_user_id"), municipio_general());
  END IF;
  RETURN NEW;
END
$$;
CREATE OR REPLACE TRIGGER "event_reports_municipio"
  BEFORE INSERT OR UPDATE OF "municipality", "section_id" ON "event_reports"
  FOR EACH ROW EXECUTE FUNCTION fijar_municipio_incidencia();

-- Almacenes: lo que traiga la aplicación (la pantalla lo pide) → el último tramo de la dirección →
-- General.
CREATE OR REPLACE FUNCTION fijar_municipio_almacen() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."municipality_id" IS NULL THEN
    NEW."municipality_id" := COALESCE(municipio_por_texto(regexp_replace(coalesce(NEW."location", ''), '^.*,', '')), municipio_general());
  END IF;
  RETURN NEW;
END
$$;
CREATE OR REPLACE TRIGGER "warehouses_municipio"
  BEFORE INSERT ON "warehouses"
  FOR EACH ROW EXECUTE FUNCTION fijar_municipio_almacen();

-- Catálogo, escucha y prospectos: el de quien los creó → General.
CREATE OR REPLACE FUNCTION fijar_municipio_de_quien_crea() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."municipality_id" IS NULL THEN
    NEW."municipality_id" := COALESCE(municipio_de_persona(NEW."created_by_user_id"), municipio_general());
  END IF;
  RETURN NEW;
END
$$;
CREATE OR REPLACE TRIGGER "activity_catalog_options_municipio"
  BEFORE INSERT ON "activity_catalog_options"
  FOR EACH ROW EXECUTE FUNCTION fijar_municipio_de_quien_crea();
CREATE OR REPLACE TRIGGER "social_listening_municipio"
  BEFORE INSERT ON "social_listening"
  FOR EACH ROW EXECUTE FUNCTION fijar_municipio_de_quien_crea();
CREATE OR REPLACE TRIGGER "rapid_activity_prospects_municipio"
  BEFORE INSERT ON "rapid_activity_prospects"
  FOR EACH ROW EXECUTE FUNCTION fijar_municipio_de_quien_crea();
