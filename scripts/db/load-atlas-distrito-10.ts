import "dotenv/config";
import { readFileSync } from "node:fs";
import pg from "pg";

import { loadAppEnv } from "../../packages/config/index.js";
import { atlasDistrito10 } from "./atlas-distrito-10.js";
import { confirmDestructiveOperation } from "./confirm-destructive.js";

/**
 * Carga el atlas del Distrito 10: los resultados por sección y, para las secciones que aún
 * no tienen polígono, su cartografía oficial.
 *
 * Las dos mitades van juntas a propósito. El atlas trae 163 secciones y la base solo tenía
 * cargadas 5 de ellas: sin los polígonos, el mapa colorearía tres secciones sueltas y
 * parecería roto. La cartografía sale de scripts/geo/jalisco_all_3787_sections.sql, que ya
 * estaba en el repositorio sin importar.
 *
 * Solo se cargan las 163 secciones del atlas, no las 3787 del archivo: traer todo Jalisco
 * para pintar un distrito es peso muerto en la base y en cada respuesta del mapa.
 *
 * Uso: pnpm db:load-atlas
 */

const CARTOGRAFIA = "scripts/geo/jalisco_all_3787_sections.sql";
const FUENTE = "Documento 3 — Fichero operativo por sección (Distrito 10 Federal)";

type Poligono = { readonly seccion: number; readonly geom: string };

/**
 * Extrae del volcado SQL únicamente los polígonos que interesan.
 *
 * Se recorre partiendo por el encabezado del INSERT en vez de con una expresión regular:
 * sobre 15 MB, una regex con `.*?` entre comillas tarda minutos por retroceso, y este
 * recorrido tarda menos de un segundo.
 */
function extraerPoligonos(rutaSql: string, queridas: ReadonlySet<number>): Poligono[] {
  const contenido = readFileSync(rutaSql, "utf8");
  const trozos = contenido.split("INSERT INTO electoral_sections (section_num, geom_json)");
  const encontrados: Poligono[] = [];

  for (let i = 1; i < trozos.length; i += 1) {
    const trozo = trozos[i] ?? "";
    const inicioValores = trozo.indexOf("VALUES (");
    if (inicioValores < 0) continue;

    const coma = trozo.indexOf(",", inicioValores);
    const seccion = Number.parseInt(trozo.slice(inicioValores + "VALUES (".length, coma).trim(), 10);
    if (!Number.isInteger(seccion) || !queridas.has(seccion)) continue;

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
    encontrados.push({ seccion, geom });
  }

  return encontrados;
}

async function cargar(): Promise<void> {
  const env = loadAppEnv();

  // Reescribe filas de electoral_sections y de resultados: mismo control que usan las demás
  // tareas de base, para no correrlo contra un servidor por descuido.
  await confirmDestructiveOperation({
    databaseUrl: env.private.DATABASE_URL,
    actionLabel: "CARGAR el atlas del Distrito 10: 163 resultados por sección y su cartografía"
  });

  const pool = new pg.Pool({ connectionString: env.private.DATABASE_URL });
  const queridas = new Set(atlasDistrito10.map((f) => f.seccion));

  try {
    await pool.query("BEGIN");

    for (const ficha of atlasDistrito10) {
      await pool.query(
        `
          INSERT INTO section_electoral_results
            (section_num, priority, main_colony, polling_place_reference,
             votes_pan, votes_morena, votes_mc, source)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (section_num) DO UPDATE
          SET priority                = EXCLUDED.priority,
              main_colony             = EXCLUDED.main_colony,
              polling_place_reference = EXCLUDED.polling_place_reference,
              votes_pan               = EXCLUDED.votes_pan,
              votes_morena            = EXCLUDED.votes_morena,
              votes_mc                = EXCLUDED.votes_mc,
              source                  = EXCLUDED.source,
              updated_at              = now()
        `,
        [
          ficha.seccion, ficha.prioridad, ficha.colonia, ficha.casilla,
          ficha.pan, ficha.morena, ficha.mc, FUENTE
        ]
      );
    }

    const poligonos = extraerPoligonos(CARTOGRAFIA, queridas);

    // Se anotan antes del upsert: RETURNING no puede leer EXCLUDED, así que la única forma
    // de saber a cuántas se les cambió el cuadrado por cartografía real es preguntarlo
    // primero.
    const fabricadasAntes = await pool.query<{ section_num: number }>(
      `
        SELECT section_num FROM electoral_sections
        WHERE geom_json IS NOT NULL
          AND jsonb_array_length(geom_json->'coordinates'->0) = 5
          AND (geom_json->'coordinates'->0->0->>0) = (geom_json->'coordinates'->0->3->>0)
          AND (geom_json->'coordinates'->0->0->>1) = (geom_json->'coordinates'->0->1->>1)
      `
    );
    const conCuadrado = new Set(fabricadasAntes.rows.map((r) => r.section_num));

    let creadas = 0;
    let completadas = 0;
    let reemplazadas = 0;

    for (const { seccion, geom } of poligonos) {
      // Se escribe la geometría del INE si la sección no tenía, y también si lo que tenía
      // era uno de los cuadrados inventados que describe la migración
      // 0012_drop_fabricated_section_geometry: rectángulos con los lados paralelos a los
      // ejes que la aplicación generaba al capturar una sección inexistente. Aquella
      // migración solo alcanzó los de una centésima de grado; en Zapopan quedaron otros de
      // hasta seis centésimas —varios kilómetros de lado— sobre secciones que sí tienen
      // cartografía real disponible.
      //
      // Un polígono legítimo nunca se pisa: si tiene más de cinco vértices o no es un
      // rectángulo alineado, se conserva el que ya estaba, que puede haberse corregido a
      // mano y este volcado no lo sabría.
      const res = await pool.query(
        `
          INSERT INTO electoral_sections (section_num, municipality, district_federal, geom_json)
          VALUES ($1, 'Zapopan', 10, $2::jsonb)
          ON CONFLICT (section_num) DO UPDATE
          SET geom_json = CASE
                WHEN electoral_sections.geom_json IS NULL THEN EXCLUDED.geom_json
                WHEN jsonb_array_length(electoral_sections.geom_json->'coordinates'->0) = 5
                     AND (electoral_sections.geom_json->'coordinates'->0->0->>0)
                       = (electoral_sections.geom_json->'coordinates'->0->3->>0)
                     AND (electoral_sections.geom_json->'coordinates'->0->0->>1)
                       = (electoral_sections.geom_json->'coordinates'->0->1->>1)
                  THEN EXCLUDED.geom_json
                ELSE electoral_sections.geom_json
              END,
              district_federal = COALESCE(electoral_sections.district_federal, 10),
              municipality     = COALESCE(electoral_sections.municipality, 'Zapopan')
          RETURNING (xmax = 0) AS insertada
        `,
        [seccion, geom]
      );
      if (res.rows[0]?.insertada) creadas += 1;
      else {
        completadas += 1;
        if (conCuadrado.has(seccion)) reemplazadas += 1;
      }
    }

    await pool.query("COMMIT");

    const sinPoligono = queridas.size - poligonos.length;
    console.log(`Atlas cargado: ${atlasDistrito10.length} secciones con resultados.`);
    console.log(`Cartografía: ${creadas} secciones nuevas, ${completadas} ya existentes.`);
    if (reemplazadas > 0) {
      console.log(`Se reemplazó la geometría fabricada de ${reemplazadas} secciones por la del INE.`);
    }
    if (sinPoligono > 0) {
      // Se dice en voz alta: una sección sin polígono no se dibuja, y quedarse callado
      // haría parecer que el mapa perdió secciones.
      console.warn(`Aviso: ${sinPoligono} secciones del atlas no tienen cartografía en ${CARTOGRAFIA} y no se dibujarán.`);
    }
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  } finally {
    await pool.end();
  }
}

cargar().catch((err: unknown) => {
  console.error(`Error al cargar el atlas: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
