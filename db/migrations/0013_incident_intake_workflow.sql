-- Flujo de admisión de incidencias, y la categoría "Otro".
--
-- 1. CATEGORÍA "otro".
--    El formulario de Alta de Reportes ya ofrecía "Otro", pero la restricción no
--    la admitía: elegirla daba error 500 y el reporte se perdía. Hace falta de
--    verdad, porque en campo aparecen cosas que no encajan en ninguna de las
--    catorce; quien reporta escribe el detalle en la descripción.
--
-- 2. ESTADOS "pendiente" y "rechazada".
--    Hasta ahora toda incidencia nacía como 'active' y no había forma de
--    aceptarla ni rechazarla: la pantalla de gestión solo cambiaba el estado a
--    mano. Un reporte levantado en campo pasa ahora por admisión.
--
--    Las que ya existen no se tocan: siguen en 'active', que ahora significa
--    "aceptada y pendiente de trabajar".
ALTER TABLE "event_reports" DROP CONSTRAINT "event_reports_category_check";
ALTER TABLE "event_reports" ADD CONSTRAINT "event_reports_category_check"
  CHECK ("event_reports"."category" IN (
    'emergencia', 'incidencia', 'mitin', 'propaganda', 'servicios', 'sospechoso',
    'brigada', 'bache', 'alumbrado', 'fuga_agua', 'inundacion', 'basura',
    'seguridad', 'lona_danada', 'otro'
  ));

ALTER TABLE "event_reports" DROP CONSTRAINT "event_reports_status_check";
ALTER TABLE "event_reports" ADD CONSTRAINT "event_reports_status_check"
  CHECK ("event_reports"."status" IN (
    'pendiente', 'active', 'in_progress', 'resolved', 'archived', 'rechazada'
  ));

-- La pantalla de historial y la de gestión filtran por estado y ordenan por
-- fecha; sin este índice recorrían la tabla entera en cada carga.
CREATE INDEX IF NOT EXISTS "event_reports_status_created_idx"
  ON "event_reports" ("status", "created_at" DESC);
