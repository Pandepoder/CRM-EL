import "dotenv/config";

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

/**
 * Encuentra —y opcionalmente limpia— las secciones que no existen en la
 * cartografía oficial del INE.
 *
 * Durante mucho tiempo el despliegue ejecutó el generador de teselas de Voronoi
 * con un UPDATE sin condición. `db:restore-geo` devuelve su contorno oficial a
 * las secciones que sí están en el archivo del INE, pero no puede hacer nada
 * con las que no aparecen ahí: esas conservan una geometría inventada, calculada
 * sobre la envolvente de un municipio entero, y por tanto enorme.
 *
 * Una sola de esas puede cubrir kilómetros y tragarse puntos que pertenecen a
 * secciones reales, que es como se ve en campo: el GPS acierta casi siempre y
 * falla justo cuando el punto cae dentro de una de ellas.
 *
 * De fábrica solo informa. Para actuar:
 *
 *   CONFIRMAR_LIMPIEZA=si pnpm db:clean-sections
 *
 * Entonces, para cada sección no oficial:
 *   - Si no la referencia nadie, se borra.
 *   - Si tiene contactos, incidencias, representantes o colonias colgando, se
 *     conserva la fila y solo se le quita la geometría. Deja de participar en
 *     la detección por GPS —el caché solo carga las que tienen contorno— sin
 *     tocar un solo dato real.
 */

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ARCHIVO_INE = path.join(RAIZ, "apps/web/public/geo/jalisco-secciones.geojson");

const TABLAS_QUE_REFERENCIAN = [
  { tabla: "contacts", etiqueta: "contactos" },
  { tabla: "event_reports", etiqueta: "incidencias" },
  { tabla: "electoral_representatives", etiqueta: "representantes" },
  { tabla: "section_colonies", etiqueta: "colonias" }
] as const;

type FilaSeccion = {
  id: string;
  section_num: number;
  municipality: string | null;
  geom_json: unknown;
};

/** Ancho y alto del contorno en kilómetros, para reconocer las teselas gigantes. */
function tamanoKm(geom: unknown): { ancho: number; alto: number } | null {
  const g = geom as { type?: string; coordinates?: unknown } | null;
  if (!g?.coordinates) return null;

  const anillos: number[][][] =
    g.type === "MultiPolygon"
      ? (g.coordinates as number[][][][]).flat()
      : (g.coordinates as number[][][]);

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const anillo of anillos) {
    if (!Array.isArray(anillo)) continue;
    for (const punto of anillo) {
      if (!Array.isArray(punto) || punto.length < 2) continue;
      const [lng, lat] = punto as [number, number];
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
    }
  }
  if (!Number.isFinite(minLng)) return null;

  // Un grado de latitud son ~111 km; el de longitud se acorta con el coseno.
  const latMedia = ((minLat + maxLat) / 2) * (Math.PI / 180);
  return {
    ancho: (maxLng - minLng) * 111 * Math.cos(latMedia),
    alto: (maxLat - minLat) * 111
  };
}

const urlBase = process.env.DATABASE_URL;
if (!urlBase) {
  console.error("\n  Falta DATABASE_URL.\n");
  process.exit(1);
}
const confirmado = process.env.CONFIRMAR_LIMPIEZA === "si";

const pool = new pg.Pool({ connectionString: urlBase });

try {
  const geojson = JSON.parse(readFileSync(ARCHIVO_INE, "utf-8")) as {
    features?: Array<{ properties?: { section_num?: number } }>;
  };
  const oficiales = new Set<number>();
  for (const f of geojson.features ?? []) {
    const n = f.properties?.section_num;
    if (typeof n === "number") oficiales.add(n);
  }
  console.warn(`\n  Cartografía oficial: ${oficiales.size} secciones.`);

  const { rows } = await pool.query<FilaSeccion>(
    `SELECT id::text, section_num, municipality, geom_json FROM electoral_sections`
  );
  console.warn(`  En la base: ${rows.length} secciones.`);

  const sobrantes = rows.filter((r) => !oficiales.has(r.section_num));
  if (sobrantes.length === 0) {
    console.warn("\n  Todas las secciones de la base están en la cartografía oficial. Nada que limpiar.\n");
    process.exit(0);
  }

  console.warn(
    `\n  ${sobrantes.length} sección(es) sin contorno oficial:\n` +
      "  seccion  municipio             tamaño        referencias"
  );

  const sinReferencias: FilaSeccion[] = [];
  const conReferencias: Array<{ fila: FilaSeccion; detalle: string }> = [];

  for (const s of sobrantes) {
    const conteos: string[] = [];
    let total = 0;
    for (const { tabla, etiqueta } of TABLAS_QUE_REFERENCIAN) {
      const r = await pool.query<{ n: string }>(
        `SELECT count(*)::text AS n FROM ${tabla} WHERE section_id = $1`,
        [s.id]
      );
      const n = Number(r.rows[0]?.n ?? 0);
      total += n;
      if (n > 0) conteos.push(`${n} ${etiqueta}`);
    }

    const t = tamanoKm(s.geom_json);
    const tam = t ? `${t.ancho.toFixed(1)}x${t.alto.toFixed(1)} km` : "sin contorno";
    // Una sección electoral real mide entre 0.3 y 2 km de lado.
    const sospechosa = t && (t.ancho > 5 || t.alto > 5) ? "  <-- desproporcionada" : "";

    console.warn(
      `  ${String(s.section_num).padEnd(8)} ${(s.municipality ?? "-").padEnd(21)} ` +
        `${tam.padEnd(13)} ${(conteos.join(", ") || "ninguna").padEnd(28)}${sospechosa}`
    );

    if (total === 0) sinReferencias.push(s);
    else conReferencias.push({ fila: s, detalle: conteos.join(", ") });
  }

  if (!confirmado) {
    console.warn(
      `\n  ENSAYO: no se ha modificado nada.\n` +
        `  Se borrarían ${sinReferencias.length} sin referencias, y a ${conReferencias.length} con datos\n` +
        `  colgando solo se les quitaría el contorno inventado.\n` +
        `  Para aplicarlo: CONFIRMAR_LIMPIEZA=si pnpm db:clean-sections\n`
    );
    process.exit(0);
  }

  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");

    for (const s of sinReferencias) {
      await cliente.query(`DELETE FROM electoral_sections WHERE id = $1`, [s.id]);
    }
    for (const { fila } of conReferencias) {
      // La fila se queda: hay datos reales apuntando a ella. Sin contorno deja
      // de aparecer en el mapa y de capturar puntos que no le tocan.
      await cliente.query(`UPDATE electoral_sections SET geom_json = NULL WHERE id = $1`, [fila.id]);
    }

    await cliente.query("COMMIT");
    console.warn(
      `\n  Listo. Borradas ${sinReferencias.length}; contorno retirado a ${conReferencias.length}.\n` +
        "  El mapa y la detección por GPS lo reflejan en cuanto caduque el caché (5 minutos)\n" +
        "  o al reiniciar el contenedor web.\n"
    );
  } catch (error) {
    await cliente.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    cliente.release();
  }
} finally {
  await pool.end();
}
