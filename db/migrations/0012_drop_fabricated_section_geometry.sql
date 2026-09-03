-- Cuando alguien capturaba un número de sección inexistente, la aplicación no
-- lo rechazaba: creaba la sección y le inventaba una geometría, un cuadrado de
-- unos 1.1 km centrado en el centro del municipio. Mientras esas secciones
-- quedaron invisibles el problema no se notó; al corregirse su filtro por
-- municipio aparecieron en el mapa como rectángulos superpuestos unos sobre
-- otros y encima de las secciones reales del centro de Tonalá.
--
-- La huella tiene que ser exacta, porque en esta tabla conviven tres orígenes
-- de geometría: la cartografía del INE, las teselas Voronoi que genera el
-- despliegue y estos cuadrados. Un primer intento marcaba "anillo de cinco
-- vértices", y resultó que 19 de las 86 teselas Voronoi son cuadriláteros: ese
-- criterio habría borrado geometría legítima.
--
-- Lo que sí distingue a los cuadrados inventados es que son rectángulos con los
-- lados paralelos a los ejes —(x0,y0), (x1,y0), (x1,y1), (x0,y1)— y de apenas
-- una centésima de grado de lado. Ninguna tesela Voronoi lo es, porque nacen de
-- mediatrices en ángulos arbitrarios, y ninguna sección del INE tampoco: su
-- anillo más pequeño tiene siete vértices.
--
-- Se les retira la geometría en lugar de borrar la fila: la sección sigue
-- existiendo y los contactos ligados a ella conservan su vínculo, pero deja de
-- dibujarse en un lugar que nunca fue el suyo. El mapa ya omite las secciones
-- sin geometría (WHERE geom_json IS NOT NULL).
WITH candidatas AS (
  SELECT
    id,
    (geom_json->'coordinates'->0->0->>0)::numeric AS x0,
    (geom_json->'coordinates'->0->0->>1)::numeric AS y0,
    (geom_json->'coordinates'->0->1->>0)::numeric AS x1,
    (geom_json->'coordinates'->0->1->>1)::numeric AS y1,
    (geom_json->'coordinates'->0->2->>0)::numeric AS x2,
    (geom_json->'coordinates'->0->2->>1)::numeric AS y2,
    (geom_json->'coordinates'->0->3->>0)::numeric AS x3,
    (geom_json->'coordinates'->0->3->>1)::numeric AS y3
  FROM electoral_sections
  WHERE geom_json IS NOT NULL
    AND geom_json->>'type' = 'Polygon'
    AND jsonb_array_length(geom_json->'coordinates') = 1
    AND jsonb_array_length(geom_json->'coordinates'->0) = 5
)
UPDATE electoral_sections es
SET geom_json = NULL
FROM candidatas c
WHERE es.id = c.id
  AND c.y0 = c.y1
  AND c.x1 = c.x2
  AND c.y2 = c.y3
  AND c.x3 = c.x0
  AND abs(c.x2 - c.x0) < 0.02
  AND abs(c.y2 - c.y0) < 0.02;
