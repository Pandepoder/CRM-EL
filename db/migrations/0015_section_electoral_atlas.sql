-- Resultados electorales y prioridad operativa por sección, provenientes del atlas que la
-- campaña ya trabaja en papel ("Documento 3 — Fichero operativo por sección").
--
-- Se guarda en su propia tabla y no en columnas de electoral_sections por dos razones. La
-- primera es de alcance: el atlas cubre 163 secciones del Distrito 10 Federal, un conjunto
-- que no coincide con las secciones que la aplicación ya tenía cargadas, así que la fila del
-- atlas debe poder existir aunque la sección todavía no tenga cartografía. La segunda es de
-- origen: son datos de una elección pasada, capturados de un documento externo, y conviene
-- que se vean como lo que son —una fuente citable y reemplazable— y no mezclados con los
-- agregados que la propia aplicación calcula.
--
-- La llave es section_num y no el id de electoral_sections, precisamente para no exigir que
-- la sección exista. El cruce se hace por número al construir el GeoJSON del mapa.
CREATE TABLE IF NOT EXISTS section_electoral_results (
  section_num integer PRIMARY KEY,

  -- Prioridad operativa A-D. Viene asignada desde el Documento 1 de la campaña; aquí no se
  -- recalcula, solo se conserva para poder filtrar y ordenar el trabajo en territorio.
  priority text NOT NULL,

  main_colony text,

  -- Escuela o domicilio de la casilla, con entrecalles: es la referencia con la que la
  -- brigada llega físicamente al lugar.
  polling_place_reference text,

  -- Votos por bloque, tal como los publica el atlas. "PAN y socios" y "Morena y socios" son
  -- coaliciones, MC va solo: se conservan agrupados para que el ganador y el total
  -- coincidan con el documento impreso que ya tiene la campaña.
  votes_pan integer NOT NULL DEFAULT 0,
  votes_morena integer NOT NULL DEFAULT 0,
  votes_mc integer NOT NULL DEFAULT 0,

  -- De qué documento salió esta fila. Sin esto, dentro de un año nadie sabría contra qué
  -- contrastar un número que no cuadre.
  source text NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT section_electoral_results_priority_check
    CHECK (priority IN ('A', 'B', 'C', 'D')),
  CONSTRAINT section_electoral_results_votes_check
    CHECK (votes_pan >= 0 AND votes_morena >= 0 AND votes_mc >= 0)
);

-- El mapa pinta por prioridad cuando se filtra por ella; sin índice, cada repintado
-- recorría la tabla entera.
CREATE INDEX IF NOT EXISTS section_electoral_results_priority_idx
  ON section_electoral_results (priority);
