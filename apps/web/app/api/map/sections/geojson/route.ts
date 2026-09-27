import { NextResponse } from "next/server";
import { getDatabaseClient } from "@/lib/db-client";
import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { sql } from "drizzle-orm";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { createHash } from "crypto";
import { contactosVisibles, sqlRestriccionContactos } from "@/lib/contact-visibility";
import { resolverMunicipio } from "@/lib/municipios-jalisco";
import { municipioDelUsuario } from "@/lib/municipio-usuario";
import { registrarError } from "@/lib/registro";

/**
 * Caché en proceso del GeoJSON por municipio.
 *
 * `revalidate` no sirve aquí: la ruta lee la sesión mediante cookies, lo que la
 * vuelve dinámica y desactiva el caché de respuesta de Next. Y el resultado es
 * el mismo para todos los usuarios, así que se cachea el dato, no la respuesta.
 *
 * Son agregados —contactos, visitas, incidencias y representantes por sección—
 * que cambian por horas, no por segundos; recalcularlos en cada apertura del
 * mapa era el mayor coste de la vista.
 */
declare global {
  var __tonalaGeojsonSecciones: Map<string, { en: number; payload: unknown }> | undefined;
}
const GEOJSON_TTL_MS = 60_000;


/**
 * Contorno aligerado para la vista de todo Jalisco.
 *
 * Son 3,787 secciones: con la geometría completa la respuesta pesaba del orden de 15 MB,
 * demasiado para abrir el mapa desde un teléfono en campo. A la escala del estado entero cada
 * sección ocupa unos pocos píxeles, así que se conserva uno de cada N vértices (hasta
 * VERTICES_POR_ANILLO por anillo) y se redondea a cuatro decimales, unos 11 metros. En cuanto
 * se elige un municipio se descarga su geometría completa.
 */
const VERTICES_POR_ANILLO = 32;

function simplificarGeometria(geom: any): any {
  const redondear = (p: number[]) => [Math.round(p[0]! * 1e4) / 1e4, Math.round(p[1]! * 1e4) / 1e4];
  const anillo = (a: number[][]): number[][] => {
    if (!Array.isArray(a) || a.length <= VERTICES_POR_ANILLO) return Array.isArray(a) ? a.map(redondear) : a;
    const paso = Math.ceil(a.length / VERTICES_POR_ANILLO);
    const reducido = a.filter((_, i) => i % paso === 0).map(redondear);
    const primero = reducido[0]!;
    const ultimo = reducido[reducido.length - 1]!;
    if (primero[0] !== ultimo[0] || primero[1] !== ultimo[1]) reducido.push(primero);
    return reducido.length >= 4 ? reducido : a;
  };
  if (geom?.type === "Polygon") return { type: "Polygon", coordinates: geom.coordinates.map(anillo) };
  if (geom?.type === "MultiPolygon") {
    return { type: "MultiPolygon", coordinates: geom.coordinates.map((pol: number[][][]) => pol.map(anillo)) };
  }
  return geom;
}

/**
 * Coordenadas a cinco decimales, ~1 metro: a cualquier zoom del mapa es invisible, y la geometría
 * de la base viene con quince. Solo eso quitaba del orden de la mitad del peso de un municipio.
 */
function redondearGeometria(geom: any): any {
  const punto = (p: number[]) => [Math.round(p[0]! * 1e5) / 1e5, Math.round(p[1]! * 1e5) / 1e5];
  const anillo = (a: number[][]) => (Array.isArray(a) ? a.map(punto) : a);
  if (geom?.type === "Polygon") return { type: "Polygon", coordinates: geom.coordinates.map(anillo) };
  if (geom?.type === "MultiPolygon") {
    return { type: "MultiPolygon", coordinates: geom.coordinates.map((pol: number[][][]) => pol.map(anillo)) };
  }
  return geom;
}

/**
 * GET /api/map/sections/geojson
 * Returns a GeoJSON FeatureCollection of electoral sections.
 * Uses the geom_json column if available, filtered by municipality.
 */
export async function GET(req: Request) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const url = new URL(req.url);
  // Sin parámetro manda el municipio de quien pregunta. El valor por omisión fue primero
  // "Tonalá" —que escondía el resto del estado— y luego "all", que se pasó al otro extremo:
  // abrir el mapa bajaba las 3,791 secciones de Jalisco (14 MB de geometría, 777 ms) para
  // terminar enseñando el municipio donde esa persona trabaja. Todo Jalisco sigue disponible,
  // pero solo si se pide con municipality=all, que es lo que hace el selector de estado.
  const municipioPedido = url.searchParams.get("municipality");
  // Una cuenta sin municipio —administración estatal, típicamente— no tiene a qué acotarse, así
  // que para ella el valor por omisión sigue siendo todo Jalisco.
  // El nombre se resuelve contra el catálogo antes de filtrar: la consulta compara letra por
  // letra con el nombre del INE, así que "Tlaquepaque" (que es "San Pedro Tlaquepaque") o
  // "Tonala" sin acento devolvían cero secciones y el mapa salía en blanco.
  const municipioResuelto = municipioPedido && municipioPedido !== "all" ? resolverMunicipio(municipioPedido) : null;
  const targetMunicipality =
    municipioResuelto || municipioPedido || (await municipioDelUsuario(actor.actorId)) || "all";

  // Los agregados por sección —cuántos contactos, cuántas visitas, cuántas
  // incidencias, qué representantes— se acotan al alcance de quien pregunta.
  // Antes cada persona veía la actividad de toda la estructura sección por
  // sección: el termómetro exacto para comparar el rendimiento entre brigadas.
  const alcance = await resolveUserNetworkScope(actor.actorId);

  // La cartografía de los 125 municipios de una vez (varios MB) es del administrador maestro (A11).
  // El mapa ya no la pide así desde la etapa 4: en todo Jalisco dibuja los municipios del catálogo,
  // y las secciones de uno cuando se acerca. Quien no tiene municipio y no dice cuál, igual.
  if (targetMunicipality.toLowerCase() === "all" && !alcance.isMaster) {
    return NextResponse.json(
      { error: "Elige un municipio: las secciones de todo el estado a la vez solo las pide el administrador maestro." },
      { status: 400 }
    );
  }

  const enAlcance = alcance.isMaster ? null : (alcance.allowedUserIds ?? [actor.actorId]);
  const misEquipos = alcance.teamIds ?? [];

  // Los mismos contactos que el directorio (equipo y territorio). Antes solo por creador: el mapa
  // contaba en cada sección contactos que el CRM ya no le enseña a esa persona.
  const visibles = await contactosVisibles(alcance);
  const filtroContactos = sqlRestriccionContactos(sql.raw("cont.id"), visibles);

  const db = getDatabaseClient();
  // El caché se guardaba solo por municipio. Ahora la respuesta depende de quién
  // pregunta, así que la clave lleva también la huella del alcance: sin esto,
  // los números de una brigada se servirían a la siguiente que abriera el mapa.
  // La huella incluye a la persona: con "lo propio siempre visible", dos integrantes del mismo
  // equipo ya no ven exactamente los mismos contactos.
  // Un administrador municipal lleva además su municipio: los números salen de su llave, no de una lista.
  const huellaAlcance = enAlcance
    ? createHash("sha1")
        .update(
          alcance.userId + "|" + (alcance.adminMunicipalityId ?? "") + "|" + [...enAlcance].sort().join(",") + "|" +
            [...misEquipos].sort().join(",") + "|" + ("ids" in visibles ? visibles.ids.length : "municipio")
        )
        .digest("hex")
        .slice(0, 12)
    : "global";
  // Va el municipio efectivo, no el parámetro: dos peticiones sin parámetro hechas desde
  // municipios distintos resuelven a respuestas distintas y no pueden compartir entrada.
  const claveCache = `${targetMunicipality.toLowerCase()}::${huellaAlcance}`;
  const cache = (globalThis.__tonalaGeojsonSecciones ??= new Map());
  const guardado = cache.get(claveCache);
  if (guardado && Date.now() - guardado.en < GEOJSON_TTL_MS) {
    return NextResponse.json(guardado.payload);
  }

  try {
    const isFilterAll = !targetMunicipality || targetMunicipality.toLowerCase() === "all";

    const result = await db.execute<{
      id: string;
      section_num: number;
      geom_json: any;
      colonies: string[];
      municipality: string;
      contacts_count: string;
      visits_completed: string;
      atlas_priority: string | null;
      atlas_main_colony: string | null;
      atlas_polling_place: string | null;
      atlas_votes_pan: number | null;
      atlas_votes_morena: number | null;
      atlas_votes_mc: number | null;
      atlas_source: string | null;
    }>(sql`
      SELECT
        es.id::text AS id,
        es.section_num,
        es.geom_json,
        -- Una sección sin municipio se declara como tal. Antes se rotulaba "Tonalá", así
        -- que las secciones inventadas que quedaron sin municipio aparecían dentro de
        -- Tonalá y contaminaban su mapa con polígonos que no son de ahí.
        COALESCE(es.municipality, 'Sin municipio') AS municipality,
        COALESCE(ARRAY_AGG(DISTINCT col.name) FILTER (WHERE col.name IS NOT NULL), '{}') AS colonies,
        COUNT(DISTINCT cont.id)::text AS contacts_count,
        COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'completed')::text AS visits_completed,
        -- Aquí también se calculaban visitas agendadas, incidencias por estado y los representantes
        -- de cada sección, con dos uniones más que multiplicaban las filas: el mapa no usaba nada de
        -- eso. Las incidencias de la sección elegida las cuenta el mapa con las que ya tiene cargadas.
        -- Atlas de la campaña. Va por LEFT JOIN porque solo cubre un distrito: el resto de
        -- las secciones seguirá llegando sin estos campos, y el mapa las pinta como antes.
        ser.priority AS atlas_priority,
        ser.main_colony AS atlas_main_colony,
        ser.polling_place_reference AS atlas_polling_place,
        ser.votes_pan AS atlas_votes_pan,
        ser.votes_morena AS atlas_votes_morena,
        ser.votes_mc AS atlas_votes_mc,
        ser.source AS atlas_source
      FROM electoral_sections es
      LEFT JOIN section_electoral_results ser ON ser.section_num = es.section_num
      LEFT JOIN section_colonies sc ON sc.section_id = es.id
      LEFT JOIN colonies col ON col.id = sc.colony_id
      LEFT JOIN contacts cont ON cont.section_id = es.id AND cont.status = 'active' ${filtroContactos}
      LEFT JOIN visits v ON v.contact_id = cont.id
      WHERE es.geom_json IS NOT NULL
        ${isFilterAll ? sql`` : sql`AND LOWER(COALESCE(es.municipality, 'Sin municipio')) = LOWER(${targetMunicipality})`}
      GROUP BY es.id, es.section_num, es.municipality, es.geom_json,
               ser.priority, ser.main_colony, ser.polling_place_reference,
               ser.votes_pan, ser.votes_morena, ser.votes_mc, ser.source
      ORDER BY es.section_num ASC
    `);

    const features = result.rows
      .filter(row => row.geom_json)
      .map(row => {
        let geometry: any;
        try {
          geometry = typeof row.geom_json === "string"
            ? JSON.parse(row.geom_json)
            : row.geom_json;
        } catch {
          return null;
        }
        return {
          type: "Feature",
          id: row.section_num,
          properties: {
            id: row.id,
            section_num: row.section_num,
            municipality: row.municipality,
            colonies: (row.colonies || []).filter(c => c && !c.startsWith("Cabecera ") && !c.startsWith("Municipio ")),
            contactsCount: Number(row.contacts_count || 0),
            visitsCompleted: Number(row.visits_completed || 0),
            // `atlas` es null en las secciones que el documento no cubre. El mapa distingue
            // "sin datos" de "cero votos": pintar de gris una sección sin información no es
            // lo mismo que pintarla como empate.
            atlas: row.atlas_priority
              ? {
                  priority: row.atlas_priority,
                  mainColony: row.atlas_main_colony,
                  pollingPlace: row.atlas_polling_place,
                  votes: {
                    pan: Number(row.atlas_votes_pan || 0),
                    morena: Number(row.atlas_votes_morena || 0),
                    mc: Number(row.atlas_votes_mc || 0)
                  },
                  source: row.atlas_source
                }
              : null
          },
          geometry: isFilterAll ? simplificarGeometria(geometry) : redondearGeometria(geometry),
        };
      })
      .filter((f): f is NonNullable<typeof f> => Boolean(f));

    const payload = { type: "FeatureCollection", features };
    cache.set(claveCache, { en: Date.now(), payload });
    return NextResponse.json(payload);
  } catch (error) {
    registrarError("Failed to load sections GeoJSON", error);
    return NextResponse.json({ type: "FeatureCollection", features: [] });
  }
}
