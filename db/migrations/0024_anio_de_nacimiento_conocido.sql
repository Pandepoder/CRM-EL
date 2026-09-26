-- D4 del plan (docs/PLAN_ADMIN_MUNICIPAL.md): el año de nacimiento es opcional en las altas, y sin él
-- se guardaba el 2000 en silencio. Nada lo distinguía de alguien nacido de verdad en el 2000, y la
-- ficha del ciudadano, que ahora enseña su fecha de nacimiento, lo habría dado por cierto.
--
-- `birth_year_known` dice si el año de `birth_date` es real. Las altas y la corrección de datos lo
-- ponen en falso cuando no se captura el año; la fecha sigue en `birth_date` con el 2000 (bisiesto,
-- así cabe un 29 de febrero), y la ficha enseña solo día y mes.
--
-- Las filas que ya existen con año 2000 pasan a «año no capturado»: no hay forma de saber cuáles se
-- inventaron, y enseñar como cierto un año inventado es peor que no enseñar uno real. La fecha no se
-- toca; quien corrige la ficha y escribe el 2000 lo deja como conocido.
--
-- COMPATIBLE CON LA VERSIÓN ANTERIOR DE LA APLICACIÓN: solo añade una columna con valor por omisión,
-- que la versión anterior ni lee ni escribe. Se puede correr dos veces: la columna no se duplica y la
-- marca solo vuelve a caer sobre fechas del 2000. Escrita a mano (ver D6).

ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "birth_year_known" boolean NOT NULL DEFAULT true;

UPDATE "contacts"
SET "birth_year_known" = false
WHERE "birth_year_known"
  AND "birth_date" IS NOT NULL
  AND extract(year FROM "birth_date" AT TIME ZONE 'UTC') = 2000;
