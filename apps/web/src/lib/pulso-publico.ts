import { unstable_cache } from "next/cache";

import { sql } from "drizzle-orm";

import { getDatabaseClient } from "@/lib/db-client";

/**
 * Cifras públicas de la campaña para la página "Conóceme".
 *
 * La página es pública y se abre sin sesión, así que aquí solo salen agregados: cuántas
 * incidencias se cerraron, cuántas visitas se hicieron, en cuántas colonias y municipios, y
 * cuántas brigadas hay. Nunca un nombre, un teléfono, un domicilio ni una coordenada, y nunca
 * con más detalle que el municipio: una sección electoral son unas mil quinientas personas, y
 * sección más categoría más fecha puede señalar una casa.
 *
 * Tampoco salen el padrón de ciudadanos ni los reportes pendientes. El primero invita una
 * discusión de datos personales que no hace falta abrir; el segundo es el rezago del equipo, y
 * publicarlo es regalarle el dato a quien compite enfrente.
 *
 * Si la base no responde se devuelve null y la página simplemente no enseña estas secciones:
 * más vale que falte la banda a que aparezca un tablero en ceros, que se lee como "no hicieron
 * nada". Y con `PULSO_PUBLICO=off` en el entorno se apaga sin tocar código, por si algún día no
 * conviene enseñar números.
 */

export type CifrasPublicas = {
  incidenciasResueltas: number;
  visitasRealizadas: number;
  coloniasRecorridas: number;
  brigadasActivas: number;
  municipios: Array<{ municipio: string; total: number }>;
  categorias: Array<{ categoria: string; total: number }>;
};

/** Por debajo de esto no se publica un municipio: con dos o tres reportes ya se señala a alguien. */
const MINIMO_POR_MUNICIPIO = 10;

/**
 * Se guardan una hora. Así la página se puede renderizar en cada visita —que es lo que evita
 * que, recién desplegada, salga sin cifras porque durante la compilación no hay base a la que
 * preguntar— sin que eso signifique una consulta por visita.
 */
export const cifrasPublicas = unstable_cache(leerCifras, ["cifras-publicas-conoceme"], {
  revalidate: 3600,
  tags: ["cifras-publicas"]
});

async function leerCifras(): Promise<CifrasPublicas | null> {
  if ((process.env.PULSO_PUBLICO || "").toLowerCase() === "off") return null;

  try {
    const db = getDatabaseClient();

    const [totales, municipios, categorias] = await Promise.all([
      db.execute<{
        resueltas: number;
        visitas: number;
        colonias: number;
        brigadas: number;
      }>(sql`
        SELECT
          (SELECT COUNT(*)::int FROM event_reports WHERE status IN ('resolved', 'archived')) AS resueltas,
          (SELECT COUNT(*)::int FROM visits WHERE status = 'completed') AS visitas,
          (SELECT COUNT(DISTINCT colony_id)::int FROM visits WHERE status = 'completed') AS colonias,
          (SELECT COUNT(*)::int FROM teams) AS brigadas
      `),
      // El municipio de la sección manda sobre el capturado a mano: es el nombre del INE y es
      // con el que coincide el catálogo del mapa.
      db.execute<{ municipio: string; total: number }>(sql`
        SELECT COALESCE(s.municipality, er.municipality) AS municipio, COUNT(*)::int AS total
        FROM event_reports er
        LEFT JOIN electoral_sections s ON s.id = er.section_id
        WHERE COALESCE(s.municipality, er.municipality) IS NOT NULL
        GROUP BY 1
        HAVING COUNT(*) >= ${MINIMO_POR_MUNICIPIO}
        ORDER BY 2 DESC
      `),
      db.execute<{ categoria: string; total: number }>(sql`
        SELECT category AS categoria, COUNT(*)::int AS total
        FROM event_reports
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 6
      `)
    ]);

    const t = totales.rows[0];
    if (!t) return null;

    const cifras: CifrasPublicas = {
      incidenciasResueltas: Number(t.resueltas) || 0,
      visitasRealizadas: Number(t.visitas) || 0,
      coloniasRecorridas: Number(t.colonias) || 0,
      brigadasActivas: Number(t.brigadas) || 0,
      municipios: municipios.rows.map((m) => ({ municipio: m.municipio, total: Number(m.total) || 0 })),
      categorias: categorias.rows.map((c) => ({ categoria: c.categoria, total: Number(c.total) || 0 }))
    };

    // Una página de campaña recién estrenada, sin trabajo cargado todavía, no debe presumir
    // ceros: mejor que las secciones no existan hasta que haya algo que enseñar.
    if (cifras.incidenciasResueltas + cifras.visitasRealizadas === 0) return null;
    return cifras;
  } catch (error) {
    console.warn("No se pudieron leer las cifras públicas; la página se muestra sin ellas:", error);
    return null;
  }
}
