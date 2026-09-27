import { cache } from "react";
import { sql } from "drizzle-orm";

import { getDatabaseClient } from "@/lib/db-client";

/**
 * Municipio al que pertenece una persona de la estructura.
 *
 * La aplicación nació para Tonalá y lo daba por hecho en todas partes: la marca decía
 * "Tonalá OS" y el mapa abría en Tonalá aunque quien entrara trabajara en Zapopan. Con los
 * 125 municipios de Jalisco cargados, el municipio de cada quien es el que manda.
 *
 * Desde la etapa 5 es la llave de municipio de la persona (`user_profiles.municipality_id`,
 * migración 0022), que la base mantiene con la misma cadena que antes se armaba aquí en cada
 * petición: el suyo, el del equipo que dirige, el del equipo al que pertenece. Si está en General
 * se devuelve null y la aplicación se muestra sin municipio, en vez de suponerle uno.
 *
 * Va envuelto en cache() de React: el shell, la metadata de la pestaña y las pantallas que lo
 * pidan comparten una sola consulta por petición.
 */
export const municipioDelUsuario = cache(async (userId: string): Promise<string | null> => {
  if (!userId) return null;

  const db = getDatabaseClient();
  const { rows } = await db.execute<{ nombre: string }>(sql`
    SELECT m.name AS nombre
    FROM user_profiles up
    JOIN municipalities m ON m.id = up.municipality_id AND m.kind = 'municipio'
    WHERE up.id = ${userId}::uuid
  `);
  return rows[0]?.nombre ?? null;
});
