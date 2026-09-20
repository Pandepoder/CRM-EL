import { cache } from "react";
import { sql } from "drizzle-orm";

import { getDatabaseClient } from "@/lib/db-client";
import { resolverMunicipio } from "@/lib/municipios-jalisco";

/**
 * Municipio al que pertenece una persona de la estructura.
 *
 * La aplicación nació para Tonalá y lo daba por hecho en todas partes: la marca decía
 * "Tonalá OS" y el mapa abría en Tonalá aunque quien entrara trabajara en Zapopan. Con los
 * 125 municipios de Jalisco cargados, el municipio de cada quien es el que manda.
 *
 * Cadena de respaldo, de lo más específico a lo más general:
 *   1. El suyo, capturado en su alta (user_profiles.municipality).
 *   2. El del equipo que dirige.
 *   3. El del equipo al que pertenece.
 * Si no hay ninguno se devuelve null y la aplicación se muestra sin municipio, en vez de
 * suponerle uno.
 *
 * El resultado se valida contra el catálogo de los 125 municipios: así un dato viejo escrito
 * a mano ("TONALA", "Zapopan Jal.") no llega ni a la marca ni al filtro del mapa, que
 * comparan por nombre exacto.
 *
 * Va envuelto en cache() de React: el shell, la metadata de la pestaña y las pantallas que lo
 * pidan comparten una sola consulta por petición.
 */
export const municipioDelUsuario = cache(async (userId: string): Promise<string | null> => {
  if (!userId) return null;

  const db = getDatabaseClient();
  const { rows } = await db.execute<{
    propio: string | null;
    lidera: string | null;
    pertenece: string | null;
  }>(sql`
    SELECT
      up.municipality AS propio,
      (
        SELECT t.municipality FROM teams t
        WHERE t.leader_id = up.id AND t.municipality IS NOT NULL
        ORDER BY t.created_at ASC LIMIT 1
      ) AS lidera,
      (
        SELECT t.municipality FROM team_members tm
        JOIN teams t ON t.id = tm.team_id
        WHERE tm.user_id = up.id AND t.municipality IS NOT NULL
        ORDER BY tm.joined_at ASC LIMIT 1
      ) AS pertenece
    FROM user_profiles up
    WHERE up.id = ${userId}::uuid
  `);

  // Se valida cada candidato por separado y en orden, no el resultado de un COALESCE: un valor
  // viejo escrito a mano en el nivel de más prioridad no debe tapar uno válido del siguiente.
  const fila = rows[0];
  // `resolverMunicipio` y no `buscarMunicipio`: el municipio del equipo lo escribe a mano quien
  // lo crea, y "Tlaquepaque" o "Tonala, Jal." no coinciden letra por letra con el nombre del INE
  // ("San Pedro Tlaquepaque", "Tonalá"). Sin esto, esas cuentas abrían el mapa en todo Jalisco.
  for (const candidato of [fila?.propio, fila?.lidera, fila?.pertenece]) {
    const municipio = resolverMunicipio(candidato);
    if (municipio) return municipio;
  }
  return null;
});
