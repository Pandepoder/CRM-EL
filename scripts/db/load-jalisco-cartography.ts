import "dotenv/config";
import { readFileSync } from "node:fs";
import pg from "pg";

import { loadAppEnv } from "../../packages/config/index.js";
import { confirmDestructiveOperation } from "./confirm-destructive.js";

/**
 * Carga la cartografía electoral de todo Jalisco: 3,787 secciones en 125 municipios.
 *
 * La aplicación nació para Tonalá y su base solo tenía 244 secciones dibujables, aunque el
 * selector de municipios ofrecía cientos por municipio: se podían elegir municipios que el
 * mapa no sabía pintar.
 *
 * Los datos salen de dos archivos que llevaban en el repositorio sin importarse, y hacen
 * falta los dos porque traen mitades distintas:
 *
 *   - jalisco_all_3787_sections.sql tiene la geometría, solo (section_num, geom_json).
 *   - sync_sections_metadata.sql pone los distritos. Sus nombres de municipio están corridos
 *     y se corrigen después por clave del INE (ver municipiosPorSeccion).
 *
 * No se ejecutan tal cual. El volcado de geometría trae además INSERTs de colonias escritos
 * contra un esquema anterior —su ON CONFLICT nombra (catalog_version_id, name) cuando el
 * índice único de hoy incluye también municipality— y Postgres aborta el archivo entero por
 * eso. Aquí se extraen únicamente las sentencias de electoral_sections, que es lo que este
 * script promete cargar, y se insertan con parámetros.
 *
 * Reparación de paso: la geometría del INE sustituye a los cuadrados inventados que
 * describe la migración 0012_drop_fabricated_section_geometry, que solo alcanzó los de una
 * centésima de grado.
 *
 * Uso: pnpm db:load-jalisco
 */

const CARTOGRAFIA = "scripts/geo/jalisco_all_3787_sections.sql";
const METADATOS = "scripts/geo/sync_sections_metadata.sql";
const SECCIONES = "apps/web/public/geo/jalisco-secciones.geojson";
const TABLA_MUNICIPIOS = "scripts/geo/municipios-ine-jalisco.json";
const LOTE = 200;

/**
 * Municipio de cada sección, por su clave de municipio del INE.
 *
 * Los nombres que traen sync_sections_metadata.sql y jalisco-secciones.geojson están mal en
 * 62 de los 125 municipios: salieron de cruzar la clave del INE con el catálogo del INEGI,
 * que numera distinto. A partir de la clave 24 los nombres van corridos uno o varios lugares
 * —Guadalajara quedaba rotulado "El Grullo" y Puerto Vallarta, "Poncitlán"—, y el mapa
 * encuadraba otro municipio al elegirlo. La clave sí es correcta, así que el nombre se toma
 * de municipios-ine-jalisco.json, la tabla clave→nombre que deriva y valida
 * scripts/geo/derivar-municipios-ine.py.
 */
function municipiosPorSeccion(): Array<{ readonly seccion: number; readonly municipio: string }> {
  const tabla = new Map<number, string>(
    (JSON.parse(readFileSync(TABLA_MUNICIPIOS, "utf8")) as Array<{ code: number; name: string }>).map((m) => [
      m.code,
      m.name
    ])
  );
  const geo = JSON.parse(readFileSync(SECCIONES, "utf8")) as {
    features: Array<{ properties: { section_num: number; municipalityCode: number } }>;
  };

  const salida: Array<{ seccion: number; municipio: string }> = [];
  const sinClave = new Set<number>();
  for (const f of geo.features) {
    const { section_num: seccion, municipalityCode: clave } = f.properties;
    const municipio = tabla.get(clave);
    if (municipio) salida.push({ seccion, municipio });
    else sinClave.add(clave);
  }
  if (sinClave.size > 0) {
    // Una clave fuera de la tabla significa que la tabla y la cartografía no son del mismo
    // corte: mejor detener la carga que dejar secciones en el municipio equivocado.
    throw new Error(`Claves de municipio sin nombre en ${TABLA_MUNICIPIOS}: ${[...sinClave].join(", ")}`);
  }
  return salida;
}

type Poligono = { readonly seccion: number; readonly geom: string };

/**
 * Extrae los polígonos del volcado.
 *
 * Se parte por el encabezado del INSERT en lugar de usar una expresión regular: sobre 15 MB,
 * una regex con `.*?` entre comillas tarda minutos por retroceso.
 */
function extraerPoligonos(ruta: string): Poligono[] {
  const trozos = readFileSync(ruta, "utf8").split("INSERT INTO electoral_sections (section_num, geom_json)");
  const salida: Poligono[] = [];

  for (let i = 1; i < trozos.length; i += 1) {
    const trozo = trozos[i] ?? "";
    const inicio = trozo.indexOf("VALUES (");
    if (inicio < 0) continue;

    const coma = trozo.indexOf(",", inicio);
    const seccion = Number.parseInt(trozo.slice(inicio + "VALUES (".length, coma).trim(), 10);
    if (!Number.isInteger(seccion)) continue;

    const abre = trozo.indexOf("'{", coma);
    const cierra = trozo.indexOf("}'", abre);
    if (abre < 0 || cierra < 0) continue;

    const geom = trozo.slice(abre + 1, cierra + 1);
    try {
      JSON.parse(geom);
    } catch {
      console.warn(`  sección ${seccion}: geometría ilegible, se omite`);
      continue;
    }
    salida.push({ seccion, geom });
  }

  return salida;
}

/** Del archivo de metadatos solo interesan sus UPDATE sobre electoral_sections. */
function extraerMetadatos(ruta: string): string[] {
  return readFileSync(ruta, "utf8")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.startsWith("UPDATE electoral_sections"));
}

async function cargar(): Promise<void> {
  const env = loadAppEnv();

  await confirmDestructiveOperation({
    databaseUrl: env.private.DATABASE_URL,
    actionLabel: "CARGAR la cartografía de las 3,787 secciones de Jalisco, reescribiendo la geometría existente"
  });

  const pool = new pg.Pool({ connectionString: env.private.DATABASE_URL });

  try {
    const antes = await medir(pool);
    console.log(`Antes: ${antes.dibujables} secciones dibujables en ${antes.municipios} municipios.`);

    const poligonos = extraerPoligonos(CARTOGRAFIA);
    console.log(`Leídos ${poligonos.length} polígonos de ${CARTOGRAFIA}.`);

    await pool.query("BEGIN");

    for (let i = 0; i < poligonos.length; i += LOTE) {
      const lote = poligonos.slice(i, i + LOTE);
      const valores = lote.map((_, j) => `($${j * 2 + 1}::integer, $${j * 2 + 2}::jsonb)`).join(", ");
      await pool.query(
        `
          INSERT INTO electoral_sections (section_num, geom_json)
          VALUES ${valores}
          ON CONFLICT (section_num) DO UPDATE SET geom_json = EXCLUDED.geom_json
        `,
        lote.flatMap((p) => [p.seccion, p.geom])
      );
    }

    const updates = extraerMetadatos(METADATOS);
    console.log(`Aplicando ${updates.length} asignaciones de municipio y distrito...`);
    for (const u of updates) {
      await pool.query(u);
    }

    // Los distritos del archivo de metadatos sirven; sus nombres de municipio no. Se
    // sobrescriben con los que corresponden a la clave del INE.
    const municipios = municipiosPorSeccion();
    console.log(`Asignando municipio por clave del INE a ${municipios.length} secciones...`);
    for (let i = 0; i < municipios.length; i += LOTE) {
      const lote = municipios.slice(i, i + LOTE);
      const valores = lote.map((_, j) => `($${j * 2 + 1}::integer, $${j * 2 + 2}::text)`).join(", ");
      await pool.query(
        `
          UPDATE electoral_sections es
          SET municipality = v.municipio
          FROM (VALUES ${valores}) AS v(seccion, municipio)
          WHERE es.section_num = v.seccion
        `,
        lote.flatMap((m) => [m.seccion, m.municipio])
      );
    }

    await pool.query("COMMIT");

    const despues = await medir(pool);
    console.log(`Después: ${despues.dibujables} secciones dibujables en ${despues.municipios} municipios.`);

    if (despues.sinMunicipio > 0) {
      // Una sección sin municipio no aparece en ningún filtro del mapa: es como si no se
      // hubiera cargado. Se dice en voz alta en vez de dar la carga por buena.
      console.warn(`Aviso: ${despues.sinMunicipio} secciones quedaron sin municipio y no saldrán en el filtro.`);
    }
    if (despues.fabricadas > 0) {
      console.warn(`Aviso: ${despues.fabricadas} secciones conservan geometría fabricada (rectángulo alineado a los ejes).`);
    }
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  } finally {
    await pool.end();
  }
}

async function medir(pool: pg.Pool) {
  const { rows } = await pool.query<{
    dibujables: string;
    municipios: string;
    sin_municipio: string;
    fabricadas: string;
  }>(`
    SELECT
      COUNT(*) FILTER (WHERE geom_json IS NOT NULL)::text AS dibujables,
      COUNT(DISTINCT municipality)::text AS municipios,
      COUNT(*) FILTER (WHERE geom_json IS NOT NULL AND municipality IS NULL)::text AS sin_municipio,
      COUNT(*) FILTER (
        WHERE geom_json IS NOT NULL
          AND jsonb_array_length(geom_json->'coordinates'->0) = 5
          AND (geom_json->'coordinates'->0->0->>0) = (geom_json->'coordinates'->0->3->>0)
          AND (geom_json->'coordinates'->0->0->>1) = (geom_json->'coordinates'->0->1->>1)
      )::text AS fabricadas
    FROM electoral_sections
  `);
  const r = rows[0]!;
  return {
    dibujables: Number(r.dibujables),
    municipios: Number(r.municipios),
    sinMunicipio: Number(r.sin_municipio),
    fabricadas: Number(r.fabricadas)
  };
}

cargar().catch((err: unknown) => {
  console.error(`Error al cargar la cartografía: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
