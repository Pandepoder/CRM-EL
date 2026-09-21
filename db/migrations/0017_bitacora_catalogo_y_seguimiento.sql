-- Bitácora: catálogo de opciones editable, resultado y cierre propios, vínculo explícito con la
-- visita e historial de cada actividad.
--
-- Es una migración ADITIVA: no borra ni reescribe columnas existentes. `event_reports.category`
-- sigue siendo la categoría de incidencia que entiende el mapa; el tipo de actividad pasa a ser
-- otra cosa (`activity_type_id`) y deja de deducirse del prefijo del título. Volver a la versión
-- anterior de la aplicación es posible sin tocar la base: las columnas nuevas simplemente no se
-- leen.

-- 1. Catálogo de opciones configurables (tipos de actividad y etiquetas) --------------------
CREATE TABLE IF NOT EXISTS "activity_catalog_options" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "kind" text NOT NULL,
  "key" text NOT NULL,
  "name" text NOT NULL,
  -- Nombre en minúsculas, sin acentos y con espacios colapsados: es lo que impide duplicados
  -- del estilo "Llamada  de seguimiento" / "llamada de seguimiento". Lo calcula la aplicación.
  "normalized_name" text NOT NULL,
  "description" text,
  "color" text,
  "icon" text,
  "sort_order" integer NOT NULL DEFAULT 0,
  -- Categoría de incidencia con la que aparece en el mapa. Solo aplica a los tipos.
  "incident_category" text NOT NULL DEFAULT 'brigada',
  -- 'organization': la ve toda la estructura. 'network': solo quien creó la opción y las
  -- personas de su alcance (misma regla de cascada que el resto de la aplicación).
  "scope" text NOT NULL DEFAULT 'organization',
  "is_system" boolean NOT NULL DEFAULT false,
  -- Si una actividad de este tipo, con contacto y a futuro, agenda además una visita del contacto.
  -- Solo la visita domiciliaria lo hace; se decide por este dato y no por palabras del título.
  "creates_visit" boolean NOT NULL DEFAULT false,
  "created_by_user_id" uuid REFERENCES "user_profiles"("id"),
  "archived_at" timestamp with time zone,
  "archived_by_user_id" uuid REFERENCES "user_profiles"("id"),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "activity_catalog_options_kind_check" CHECK ("kind" IN ('type', 'tag')),
  CONSTRAINT "activity_catalog_options_scope_check" CHECK ("scope" IN ('organization', 'network')),
  CONSTRAINT "activity_catalog_options_name_check" CHECK (length(trim("name")) > 0),
  CONSTRAINT "activity_catalog_options_network_owner_check"
    CHECK ("scope" = 'organization' OR "created_by_user_id" IS NOT NULL)
);

-- Dos personas creando a la vez la misma opción: una gana y la otra recibe la existente.
CREATE UNIQUE INDEX IF NOT EXISTS "activity_catalog_options_unique_name_idx"
  ON "activity_catalog_options" (
    "kind",
    "normalized_name",
    (CASE WHEN "scope" = 'organization' THEN 'organization' ELSE "created_by_user_id"::text END)
  )
  WHERE "archived_at" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "activity_catalog_options_system_key_idx"
  ON "activity_catalog_options" ("kind", "key") WHERE "is_system";
CREATE INDEX IF NOT EXISTS "activity_catalog_options_kind_idx"
  ON "activity_catalog_options" ("kind", "sort_order");
CREATE INDEX IF NOT EXISTS "activity_catalog_options_created_by_idx"
  ON "activity_catalog_options" ("created_by_user_id");

-- Los ocho tipos que la aplicación traía escritos en código: punto de partida del catálogo.
-- La categoría de incidencia de cada uno es la que ya se les asignaba, salvo Apoyos: se
-- guardaba como "Emergencia crítica" en el mapa, y una entrega de insumos no lo es.
INSERT INTO "activity_catalog_options"
  ("kind", "key", "name", "normalized_name", "description", "sort_order", "incident_category", "is_system")
VALUES
  ('type', 'platica',    'Plática / reunión vecinal',        'platica / reunion vecinal',        'Diálogo con vecinos', 10, 'servicios',  true),
  ('type', 'visita',     'Visita domiciliaria',              'visita domiciliaria',              'Visita a un contacto', 20, 'servicios',  true),
  ('type', 'evento',     'Evento / asamblea / mitin',        'evento / asamblea / mitin',        NULL,                   30, 'mitin',      true),
  ('type', 'brigada',    'Brigada territorial / volanteo',   'brigada territorial / volanteo',   NULL,                   40, 'brigada',    true),
  ('type', 'estructura', 'Estructura electoral / casilla',   'estructura electoral / casilla',   NULL,                   50, 'mitin',      true),
  ('type', 'perifoneo',  'Perifoneo / activación de calle',  'perifoneo / activacion de calle',  NULL,                   60, 'propaganda', true),
  ('type', 'incidencia', 'Verificación territorial',         'verificacion territorial',         'Inspección de reportes', 70, 'incidencia', true),
  ('type', 'apoyos',     'Logística / entrega de apoyos',    'logistica / entrega de apoyos',    NULL,                   80, 'otro',       true)
ON CONFLICT DO NOTHING;

UPDATE "activity_catalog_options" SET "creates_visit" = true WHERE "kind" = 'type' AND "key" = 'visita' AND "is_system";

-- 2. Columnas propias de la actividad ---------------------------------------------------------
ALTER TABLE "event_reports"
  ADD COLUMN IF NOT EXISTS "activity_type_id" uuid REFERENCES "activity_catalog_options"("id"),
  ADD COLUMN IF NOT EXISTS "outcome" text,
  ADD COLUMN IF NOT EXISTS "outcome_summary" text,
  ADD COLUMN IF NOT EXISTS "closed_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "closed_by_user_id" uuid REFERENCES "user_profiles"("id"),
  ADD COLUMN IF NOT EXISTS "cancel_reason" text,
  ADD COLUMN IF NOT EXISTS "location_text" text,
  ADD COLUMN IF NOT EXISTS "estimated_attendees" integer,
  ADD COLUMN IF NOT EXISTS "contact_id" uuid REFERENCES "contacts"("id"),
  -- Vínculo explícito con la visita que la actividad agendó: una actividad con contacto y su
  -- visita son UN registro, no dos que se cuentan por separado.
  ADD COLUMN IF NOT EXISTS "visit_id" uuid REFERENCES "visits"("id"),
  -- Si se borra la actividad de origen, el seguimiento se conserva sin ese vínculo.
  ADD COLUMN IF NOT EXISTS "follow_up_of_id" uuid REFERENCES "event_reports"("id") ON DELETE SET NULL,
  -- Lo genera el formulario al abrirse: un doble clic o un reintento devuelve la actividad ya
  -- creada en vez de duplicarla.
  ADD COLUMN IF NOT EXISTS "client_request_id" uuid,
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone NOT NULL DEFAULT now();

ALTER TABLE "event_reports" DROP CONSTRAINT IF EXISTS "event_reports_outcome_check";
ALTER TABLE "event_reports" ADD CONSTRAINT "event_reports_outcome_check"
  CHECK ("outcome" IS NULL OR "outcome" IN
    ('successful', 'positive_commitment', 'no_contact', 'follow_up_required', 'rejected'));

ALTER TABLE "event_reports" DROP CONSTRAINT IF EXISTS "event_reports_attendees_check";
ALTER TABLE "event_reports" ADD CONSTRAINT "event_reports_attendees_check"
  CHECK ("estimated_attendees" IS NULL OR "estimated_attendees" >= 0);

-- 'cancelada' es un estado de actividad: se pidió motivo y ya no cuenta como pendiente. No es
-- 'rechazada', que es la salida de la admisión de una incidencia.
ALTER TABLE "event_reports" DROP CONSTRAINT IF EXISTS "event_reports_status_check";
ALTER TABLE "event_reports" ADD CONSTRAINT "event_reports_status_check"
  CHECK ("status" IN ('pendiente', 'active', 'in_progress', 'resolved', 'archived', 'rechazada', 'cancelada'));

CREATE UNIQUE INDEX IF NOT EXISTS "event_reports_client_request_idx"
  ON "event_reports" ("client_request_id") WHERE "client_request_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "event_reports_visit_idx"
  ON "event_reports" ("visit_id") WHERE "visit_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "event_reports_activity_type_idx" ON "event_reports" ("activity_type_id");
CREATE INDEX IF NOT EXISTS "event_reports_contact_idx" ON "event_reports" ("contact_id");
CREATE INDEX IF NOT EXISTS "event_reports_follow_up_of_idx" ON "event_reports" ("follow_up_of_id");

-- Los cinco resultados que ofrece el formulario son ahora los que acepta cada tabla.
ALTER TABLE "visit_results" DROP CONSTRAINT IF EXISTS "visit_results_outcome_check";
ALTER TABLE "visit_results" ADD CONSTRAINT "visit_results_outcome_check"
  CHECK ("structured_outcome" IN
    ('successful', 'positive_commitment', 'no_contact', 'follow_up_required', 'rejected'));

-- 3. Registros antiguos --------------------------------------------------------------------------
-- El tipo se recupera SOLO por el prefijo exacto que la aplicación escribía al crear la
-- actividad ("[Plática Vecinal] ..."). No se adivina por palabras del título: lo que no tenga
-- ese prefijo queda sin tipo y se muestra por su categoría, con la información intacta. El
-- título no se modifica.
UPDATE "event_reports" er
SET "activity_type_id" = o."id"
FROM (VALUES
  ('[Plática Vecinal] ',              'platica'),
  ('[Visita Domiciliaria] ',          'visita'),
  ('[Evento / Asamblea] ',            'evento'),
  ('[Estructura Electoral] ',         'estructura'),
  ('[Perifoneo / Activación] ',       'perifoneo'),
  ('[Logística / Apoyos] ',           'apoyos'),
  ('[Brigada de Campo] ',             'brigada')
) AS p("prefix", "key")
JOIN "activity_catalog_options" o ON o."kind" = 'type' AND o."key" = p."key" AND o."is_system"
WHERE er."activity_type_id" IS NULL
  AND left(er."title", length(p."prefix")) = p."prefix";

-- 4. Historial de cada actividad --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "activity_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_report_id" uuid NOT NULL REFERENCES "event_reports"("id") ON DELETE CASCADE,
  "actor_user_id" uuid NOT NULL REFERENCES "user_profiles"("id"),
  "kind" text NOT NULL,
  "note" text,
  "data" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "activity_history_kind_check" CHECK ("kind" IN
    ('created', 'edited', 'note', 'rescheduled', 'reassigned', 'completed', 'cancelled',
     'follow_up_created', 'archived', 'restored'))
);
CREATE INDEX IF NOT EXISTS "activity_history_report_idx"
  ON "activity_history" ("event_report_id", "created_at");

-- 5. Etiquetas de una actividad --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "activity_tag_links" (
  "event_report_id" uuid NOT NULL REFERENCES "event_reports"("id") ON DELETE CASCADE,
  "option_id" uuid NOT NULL REFERENCES "activity_catalog_options"("id"),
  PRIMARY KEY ("event_report_id", "option_id")
);
CREATE INDEX IF NOT EXISTS "activity_tag_links_option_idx" ON "activity_tag_links" ("option_id");
