import { sql } from "drizzle-orm";

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

/** Secciones de un municipio; sin municipio se asume Tonalá, igual que el mapa. */
export async function getSeccionesDeMunicipio(municipio: string): Promise<SeccionGeo[]> {
  const todas = await getSeccionesGeo();
  const objetivo = municipio.toLowerCase();
  return todas.filter((s) => (s.municipality ?? "Tonalá").toLowerCase() === objetivo);
}

/** Invalida el caché. Útil tras dar de alta o modificar secciones. */
export function invalidarSeccionesGeo(): void {
  globalThis.__tonalaSectionsGeo = undefined;
}
