import { sql } from "drizzle-orm";
import { point } from "@turf/helpers";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";

import { getDatabaseClient } from "@/lib/db-client";

/**
 * Caché en memoria de la geometría de secciones electorales.
 *
 * Las tres rutas de geocodificación —geocode, reverse-geocode y autocomplete—
 * cargaban las 3789 secciones con su geometría completa en CADA petición: unos
 * 15 MB de JSONB y medio millón de vértices para resolver una consulta que
 * devuelve un kilobyte. Aquí se cargan una vez cada TTL y se comparten.
 *
 * Además se precalcula el rectángulo envolvente de cada polígono. Con él, una
 * consulta por coordenada solo evalúa punto-en-polígono contra las pocas
 * secciones cuyo rectángulo contiene el punto, en vez de contra las 3789.
 *
 * El caché vive en `globalThis` para sobrevivir al hot-reload de Next en
 * desarrollo, igual que el pool de conexiones.
 */

export type SeccionGeo = Readonly<{
  id: string;
  sectionNum: number;
  municipality: string | null;
  geomJson: unknown;
  /** [minLng, minLat, maxLng, maxLat] */
  bounds: readonly [number, number, number, number];
}>;

type Entrada = { cargadoEn: number; filas: SeccionGeo[] };

declare global {
  var __tonalaSectionsGeo: Entrada | undefined;
}

const TTL_MS = 5 * 60 * 1000;

function calcularBounds(geom: unknown): [number, number, number, number] | null {
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
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
    }
  }

  return Number.isFinite(minLng) ? [minLng, minLat, maxLng, maxLat] : null;
}

/** Devuelve todas las secciones con geometría, desde caché si sigue vigente. */
export async function getSeccionesGeo(): Promise<SeccionGeo[]> {
  const cache = globalThis.__tonalaSectionsGeo;
  if (cache && Date.now() - cache.cargadoEn < TTL_MS) return cache.filas;

  const db = getDatabaseClient();
  const res = await db.execute<{
    id: string;
    section_num: number;
    municipality: string | null;
    geom_json: unknown;
  }>(sql`
    SELECT id::text, section_num, municipality, geom_json
    FROM electoral_sections
    WHERE geom_json IS NOT NULL
  `);

  const filas: SeccionGeo[] = [];
  for (const r of res.rows) {
    const bounds = calcularBounds(r.geom_json);
    if (!bounds) continue;
    filas.push({
      id: r.id,
      sectionNum: r.section_num,
      municipality: r.municipality,
      geomJson: r.geom_json,
      bounds
    });
  }

  globalThis.__tonalaSectionsGeo = { cargadoEn: Date.now(), filas };
  return filas;
}

/**
 * Secciones cuyo rectángulo envolvente contiene el punto. Es un filtro barato
 * previo al punto-en-polígono, que sí es caro.
 */
export async function getSeccionesEnPunto(lat: number, lng: number): Promise<SeccionGeo[]> {
  const todas = await getSeccionesGeo();
  return todas.filter(
    (s) => lng >= s.bounds[0] && lng <= s.bounds[2] && lat >= s.bounds[1] && lat <= s.bounds[3]
  );
}

/**
 * Secciones de un municipio. Una sección sin municipio no pertenece a ninguno: antes se
 * daba por hecha de Tonalá, y así las secciones que quedaron sin ese dato aparecían dentro
 * de Tonalá sin serlo.
 */
export async function getSeccionesDeMunicipio(municipio: string): Promise<SeccionGeo[]> {
  const todas = await getSeccionesGeo();
  const objetivo = municipio.toLowerCase();
  return todas.filter((s) => s.municipality?.toLowerCase() === objetivo);
}

/** Invalida el caché. Útil tras dar de alta o modificar secciones. */
export function invalidarSeccionesGeo(): void {
  globalThis.__tonalaSectionsGeo = undefined;
}

/**
 * Distancia máxima, en kilómetros, a la que se acepta la sección más cercana cuando ningún
 * polígono contiene el punto.
 *
 * Con la cartografía completa de Jalisco cargada, casi todo punto del estado cae dentro de
 * algún polígono; el respaldo solo cubre las rendijas entre polígonos vecinos y los puntos
 * que el GPS deja apenas fuera del borde. Antes no tenía límite: con 244 secciones en la
 * base, una incidencia levantada en Puerto Vallarta se enganchaba a la sección del AMG menos
 * lejana, a 250 km, y se archivaba ahí sin ninguna señal de que era un respaldo.
 */
export const RADIO_RESPALDO_KM = 1.5;

export type UbicacionEnSeccion = Readonly<{
  seccion: SeccionGeo;
  /** "exacta": el punto está dentro del polígono. "aproximada": es la más cercana dentro del radio. */
  precision: "exacta" | "aproximada";
}>;

function comoFeature(geomJson: unknown): any {
  try {
    const bruto: any = typeof geomJson === "string" ? JSON.parse(geomJson) : geomJson;
    if (!bruto) return null;
    return bruto.type === "Feature" ? bruto : { type: "Feature" as const, geometry: bruto, properties: {} };
  } catch {
    return null;
  }
}

/** Distancia aproximada en km; basta con equirectangular a estas escalas. */
function kilometros(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const kmPorGrado = 111.32;
  const dLat = (lat2 - lat1) * kmPorGrado;
  const dLng = (lng2 - lng1) * kmPorGrado * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
  return Math.hypot(dLat, dLng);
}

/**
 * Sección electoral en la que cae un punto, o null si no hay ninguna razonable.
 *
 * Es la fuente del municipio de cualquier punto de Jalisco: la sección trae el suyo del INE.
 * Las rutas de geocodificación y el alta de incidencias resolvían esto cada una por su lado,
 * con respaldos distintos y sin límite de distancia.
 */
export async function ubicarEnSeccion(lat: number, lng: number): Promise<UbicacionEnSeccion | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const pt = point([lng, lat]);
  // Se revisan todas las que contienen el punto, no solo la primera: quedan secciones
  // inventadas, sin municipio, encimadas sobre secciones reales —la 2360 cubre el centro de
  // Tlajomulco encima de la 2440—, y si ganaba la primera el punto se quedaba sin municipio.
  // Manda la que trae municipio del INE.
  let sinMunicipio: SeccionGeo | null = null;
  for (const seccion of await getSeccionesEnPunto(lat, lng)) {
    const feature = comoFeature(seccion.geomJson);
    try {
      if (!feature || !booleanPointInPolygon(pt, feature)) continue;
    } catch {
      // Geometría malformada: se ignora esa sección.
      continue;
    }
    if (seccion.municipality) return { seccion, precision: "exacta" };
    sinMunicipio ??= seccion;
  }
  if (sinMunicipio) return { seccion: sinMunicipio, precision: "exacta" };

  let masCercana: SeccionGeo | null = null;
  let distanciaMinima = Infinity;
  for (const seccion of await getSeccionesGeo()) {
    const cLng = (seccion.bounds[0] + seccion.bounds[2]) / 2;
    const cLat = (seccion.bounds[1] + seccion.bounds[3]) / 2;
    const d = kilometros(lat, lng, cLat, cLng);
    if (d < distanciaMinima) {
      distanciaMinima = d;
      masCercana = seccion;
    }
  }

  return masCercana && distanciaMinima <= RADIO_RESPALDO_KM ? { seccion: masCercana, precision: "aproximada" } : null;
}
