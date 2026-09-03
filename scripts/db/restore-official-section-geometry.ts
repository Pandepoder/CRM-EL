import "dotenv/config";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import pg from "pg";

import { loadAppEnv } from "../../packages/config/index.js";

/**
 * Devuelve a cada sección electoral su contorno oficial del INE.
 *
 * Hace falta porque durante mucho tiempo el despliegue ejecutó
 * `generate-clean-voronoi-sections` con un UPDATE sin condición, que sustituía
 * la cartografía real por una teselación aproximada. De las 86 secciones que
 * toca ese generador, 82 tienen contorno oficial —46 en Tonalá—, así que cada
 * despliegue las deformaba. Además la teselación se calcula por municipio sobre
 * su propia envolvente, y siete pares de municipios tienen envolventes que se
 * solapan: por eso además se montaban unas sobre otras.
 *
 * El generador ya solo rellena secciones sin contorno. Este script repara lo que
 * quedó dañado, y puede ejecutarse cuantas veces haga falta: escribe siempre el
 * mismo contorno oficial y no toca las secciones que no están en el archivo.
 */
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ARCHIVO_INE = path.join(RAIZ, "apps/web/public/geo/jalisco-secciones.geojson");

type Feature = {
  properties?: { section_num?: number; municipality?: string };
  geometry?: unknown;
};

export async function run() {
  const env = loadAppEnv();
  const pool = new pg.Pool({ connectionString: env.private.DATABASE_URL });

  const features: Feature[] = JSON.parse(readFileSync(ARCHIVO_INE, "utf8")).features ?? [];
  console.log(`Cartografía oficial leída: ${features.length} secciones.`);

  // Qué secciones existen en la base: sin esto no se distingue "ya estaba
  // correcta" de "no está dada de alta", y el informe engaña.
  const presentes = new Set<number>(
    (await pool.query<{ section_num: number }>(`SELECT section_num FROM electoral_sections`)).rows.map(
      (r) => Number(r.section_num)
    )
  );

  let restauradas = 0;
  let yaCorrectas = 0;
  let ausentes = 0;

  for (const f of features) {
    const num = Number(f.properties?.section_num);
    if (!Number.isFinite(num) || !f.geometry) continue;
    if (!presentes.has(num)) {
      ausentes += 1;
      continue;
    }

    // `IS DISTINCT FROM` evita reescribir las que ya están bien: así el conteo
    // dice cuántas estaban realmente deformadas.
    const res = await pool.query(
      `UPDATE electoral_sections
          SET geom_json = $1::jsonb,
              municipality = COALESCE(municipality, $3)
        WHERE section_num = $2
          AND geom_json IS DISTINCT FROM $1::jsonb`,
      [JSON.stringify(f.geometry), num, f.properties?.municipality ?? null]
    );
    if (res.rowCount && res.rowCount > 0) restauradas += res.rowCount;
    else yaCorrectas += 1;
  }

  console.log(`Secciones con su contorno oficial restaurado: ${restauradas}.`);
  console.log(`Secciones que ya lo tenían correcto: ${yaCorrectas}.`);
  console.log(`Secciones del archivo que no están dadas de alta en la base: ${ausentes}.`);
  await pool.end();
}

if (process.argv[1]?.includes("restore-official-section-geometry")) {
  run().catch((e) => {
    console.error("Restauración fallida:", e);
    process.exit(1);
  });
}
