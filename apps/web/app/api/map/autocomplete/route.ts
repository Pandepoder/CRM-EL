import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getDatabaseClient } from "@/lib/db-client";
import { ubicarEnSeccion } from "@/lib/sections-geo-cache";
import { buscarMunicipio, resolverMunicipio } from "@/lib/municipios-jalisco";
import { buscarDireccion } from "@/lib/osm-search";
import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { sql } from "drizzle-orm";


export interface AutocompleteResult {
  id: string;
  type: "address" | "colony" | "section";
  title: string;
  subtitle: string;
  address: string;
  colony?: string | undefined;
  municipality: string;
  postcode?: string | undefined;
  lat?: number | undefined;
  lng?: number | undefined;
  sectionNum?: number | undefined;
  sectionId?: string | undefined;
}

/**
 * GET /api/map/autocomplete?q=...&municipality=<municipio del catálogo>
 * Provides real-time instant autocomplete for streets, real colonies, and sections.
 */
export async function GET(req: Request) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  // Sin municipio (o con "all") se busca en todo Jalisco. Antes el valor por omisión era
  // "Tonalá": el autocompletado de cualquier otro municipio proponía calles de Tonalá.
  const municipality = buscarMunicipio(url.searchParams.get("municipality"))?.name ?? null;

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const db = getDatabaseClient();
  const results: AutocompleteResult[] = [];
  const seenKeys = new Set<string>();

  // 1. DATABASE SEARCH: Real Official Electoral Sections (e.g. "2704" or "Sección 2687")
  const numericMatch = q.match(/\b\d{3,4}\b/);
  if (numericMatch) {
    const secNum = parseInt(numericMatch[0], 10);
    try {
      const secRows = await db.execute<{
        id: string;
        section_num: number;
        geom_json: any;
        colonies: string[];
        municipality: string;
      }>(sql`
        SELECT
          es.id::text AS id,
          es.section_num,
          es.geom_json,
          es.municipality AS municipality,
          COALESCE(ARRAY_AGG(DISTINCT col.name) FILTER (WHERE col.name IS NOT NULL), '{}') AS colonies
        FROM electoral_sections es
        LEFT JOIN section_colonies sc ON sc.section_id = es.id
        LEFT JOIN colonies col ON col.id = sc.colony_id
        WHERE es.section_num = ${secNum}
        GROUP BY es.id, es.section_num, es.municipality, es.geom_json
        LIMIT 1
      `);

      if (secRows.rows.length > 0) {
        const row = secRows.rows[0]!;
        const muni = row.municipality || municipality || "";
        
        let centerLat: number | undefined;
        let centerLng: number | undefined;
        if (row.geom_json) {
          try {
            const raw = typeof row.geom_json === "string" ? JSON.parse(row.geom_json) : row.geom_json;
            const coords = raw.type === "Polygon" ? raw.coordinates[0] : raw.geometry?.coordinates?.[0];
            if (coords && coords.length > 0) {
              let sLng = 0, sLat = 0;
              for (const c of coords) { sLng += c[0]; sLat += c[1]; }
              centerLng = sLng / coords.length;
              centerLat = sLat / coords.length;
            }
          } catch (_parseErr) {
            // Geometry parse fallback
          }
        }

        const validCols = (row.colonies || []).filter(c => c && !c.startsWith("Cabecera "));
        const subtitle = validCols.length > 0 ? `Col. ${validCols.slice(0, 3).join(", ")} · ${muni}` : `Municipio de ${muni}`;

        results.push({
          id: `sec-${row.section_num}`,
          type: "section",
          title: `Sección Electoral #${row.section_num}`,
          subtitle,
          address: `Sección #${row.section_num}, ${muni}`,
          colony: validCols[0] || "",
          municipality: muni,
          sectionNum: row.section_num,
          sectionId: row.id,
          lat: centerLat,
          lng: centerLng
        });
        seenKeys.add(`sec-${row.section_num}`);
      }
    } catch (err) {
      console.error("Section search error:", err);
    }
  }

  // 2. DATABASE SEARCH: Verified Colonies in target municipality
  try {
    const colRows = await db.execute<{
      id: string;
      name: string;
      municipality: string;
      section_num: number | null;
      section_id: string | null;
    }>(sql`
      SELECT
        col.id::text AS id,
        col.name,
        col.municipality,
        es.section_num,
        es.id::text AS section_id
      FROM colonies col
      LEFT JOIN section_colonies sc ON sc.colony_id = col.id
      LEFT JOIN electoral_sections es ON es.id = sc.section_id
      WHERE col.name ILIKE ${`%${q}%`}
        AND col.name NOT LIKE 'Cabecera %'
        AND col.name NOT LIKE 'Municipio %'
        ${municipality ? sql`AND (col.municipality = ${municipality} OR (col.municipality IS NULL AND es.municipality = ${municipality}))` : sql``}
      ORDER BY 
        CASE WHEN col.name ILIKE ${`${q}%`} THEN 1 ELSE 2 END,
        col.name ASC
      LIMIT 6
    `);

    for (const r of colRows.rows) {
      const muniCol = r.municipality || municipality || "";
        const key = `col-${r.name.toLowerCase()}-${muniCol.toLowerCase()}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        results.push({
          id: `col-${r.id}`,
          type: "colony",
          title: `Colonia ${r.name}`,
          subtitle: `${muniCol ? `${muniCol}, Jal.` : "Jalisco"}${r.section_num ? ` · Secc. #${r.section_num}` : ""}`,
          address: `Col. ${r.name}${muniCol ? `, ${muniCol}` : ""}`,
          colony: r.name,
          municipality: muniCol,
          sectionNum: r.section_num || undefined,
          sectionId: r.section_id || undefined
        });
      }
    }
  } catch (err) {
    console.error("Colony search error:", err);
  }

  // 3. OPENSTREETMAP NOMINATIM SEARCH: Live Street / Place Geocoding Bounded to Jalisco
  try {
    // Se acota al recuadro del municipio de captura y solo se amplía a Jalisco si ahí no
    // encuentra nada (ver lib/osm-search).
    const { filas: osmData } = await buscarDireccion(q, municipality, { limite: 6, msEspera: 2500 });

    for (const item of osmData) {
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);
      if (isNaN(lat) || isNaN(lng)) continue;

      const addr = item.address || {};
      const road = addr.road || addr.pedestrian || addr.street || addr.highway || addr.path || item.name || "";
      const houseNum = addr.house_number ? ` #${addr.house_number}` : "";
      const rawSuburb = addr.suburb || addr.neighbourhood || addr.quarter || addr.residential || addr.village || addr.hamlet || "";
      const suburb = rawSuburb.startsWith("Cabecera ") ? "" : rawSuburb;
      // Sección y municipio desde el polígono del INE que contiene el punto. El de la
      // sección manda si el punto cae dentro; si no, el de OpenStreetMap normalizado.
      const ubicacion = await ubicarEnSeccion(lat, lng);
      const city =
        (ubicacion?.precision === "exacta" ? ubicacion.seccion.municipality : null) ??
        resolverMunicipio(addr.city || addr.town || addr.county || addr.municipality) ??
        ubicacion?.seccion.municipality ??
        "";
      const postcode = addr.postcode || "";

      const fullStreet = `${road}${houseNum}`.trim() || item.display_name.split(",")[0];
      const dedupeKey = `addr-${fullStreet.toLowerCase()}-${suburb.toLowerCase()}-${city.toLowerCase()}`;
      if (seenKeys.has(dedupeKey)) continue;
      seenKeys.add(dedupeKey);

      const matchedSecNum = ubicacion?.seccion.sectionNum;
      const matchedSecId = ubicacion?.seccion.id;

      const parts: string[] = [];
      if (fullStreet) parts.push(fullStreet);
      if (suburb) parts.push(`Col. ${suburb}`);
      if (city) parts.push(city);
      const formatted = parts.join(", ");

      const subParts: string[] = [];
      if (suburb) subParts.push(`Col. ${suburb}`);
      if (city) subParts.push(city);
      if (matchedSecNum) subParts.push(`Secc. #${matchedSecNum}`);

      results.push({
        id: `osm-${item.place_id || Math.random().toString(36).substring(7)}`,
        type: "address",
        title: fullStreet || item.name || formatted,
        subtitle: subParts.join(" · "),
        address: formatted,
        colony: suburb,
        municipality: city,
        postcode,
        lat,
        lng,
        sectionNum: matchedSecNum,
        sectionId: matchedSecId
      });
    }
  } catch (_e) {
    // OpenStreetMap timed out or network error
  }

  return NextResponse.json({ results: results.slice(0, 10) });
}
