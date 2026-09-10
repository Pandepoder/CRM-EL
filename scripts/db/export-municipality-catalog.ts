import "dotenv/config";
import { writeFileSync } from "node:fs";
import pg from "pg";

import { loadAppEnv } from "../../packages/config/index.js";

/**
 * Genera apps/web/public/geo/jalisco-municipalities.json a partir de la cartografía cargada.
 *
 * Ese archivo es la única lista de municipios de la aplicación: el selector del mapa, los
 * formularios de alta, el buscador de domicilios y el centrado de los mapas leen de él. Antes
 * cada formulario traía su propia lista escrita a mano —siete, nueve o doce municipios del
 * AMG, según el archivo— y cada mapa su tabla de centros, así que casi cualquier municipio de
 * Jalisco era imposible de capturar o dejaba el mapa mirando a Tonalá.
 *
 * Por cada municipio guarda cuántas secciones tienen geometría, su recuadro envolvente y el
 * centro de ese recuadro. El recuadro sirve para acotar las búsquedas en Nominatim al
 * municipio en que se captura y para encuadrar los mapas sin esperar a descargar polígonos.
 *
 * Correr después de pnpm db:load-jalisco. Uso: pnpm db:export-municipios
 */

const DESTINO = "apps/web/public/geo/jalisco-municipalities.json";

type Recuadro = [number, number, number, number];

function recuadroDe(geom: unknown): Recuadro | null {
  const g = geom as { type?: string; coordinates?: unknown } | null;
  if (!g?.coordinates) return null;
  const anillos: number[][][] =
    g.type === "MultiPolygon" ? (g.coordinates as number[][][][]).flat() : (g.coordinates as number[][][]);

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const anillo of anillos) {
    for (const punto of anillo ?? []) {
      const [lng, lat] = punto as [number, number];
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
    }
  }
  return Number.isFinite(minLng) ? [minLng, minLat, maxLng, maxLat] : null;
}

const redondear = (n: number) => Math.round(n * 100_000) / 100_000;

async function exportar(): Promise<void> {
  const env = loadAppEnv();
  const pool = new pg.Pool({ connectionString: env.private.DATABASE_URL });

  try {
    const { rows } = await pool.query<{ municipality: string; geom_json: unknown }>(`
      SELECT municipality, geom_json
      FROM electoral_sections
      WHERE geom_json IS NOT NULL AND municipality IS NOT NULL
    `);

    const acumulado = new Map<string, { count: number; bbox: Recuadro }>();
    for (const fila of rows) {
      const r = recuadroDe(fila.geom_json);
      if (!r) continue;
      const previo = acumulado.get(fila.municipality);
      if (!previo) {
        acumulado.set(fila.municipality, { count: 1, bbox: r });
        continue;
      }
      previo.count += 1;
      previo.bbox = [
        Math.min(previo.bbox[0], r[0]),
        Math.min(previo.bbox[1], r[1]),
        Math.max(previo.bbox[2], r[2]),
        Math.max(previo.bbox[3], r[3])
      ];
    }

    const catalogo = [...acumulado.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "es"))
      .map(([name, { count, bbox }]) => ({
        name,
        count,
        center: [redondear((bbox[1] + bbox[3]) / 2), redondear((bbox[0] + bbox[2]) / 2)],
        bbox: bbox.map(redondear)
      }));

    if (catalogo.length === 0) {
      // Escribir una lista vacía dejaría a toda la aplicación sin municipios. Si la base no
      // tiene cartografía, lo correcto es fallar y cargarla primero.
      throw new Error("La base no tiene secciones con municipio y geometría. Corre antes pnpm db:load-jalisco.");
    }

    writeFileSync(DESTINO, JSON.stringify(catalogo) + "\n", "utf8");
    const total = catalogo.reduce((n, m) => n + m.count, 0);
    console.log(`Catálogo escrito en ${DESTINO}: ${catalogo.length} municipios, ${total} secciones.`);
  } finally {
    await pool.end();
  }
}

exportar().catch((err: unknown) => {
  console.error(`Error al exportar el catálogo: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
