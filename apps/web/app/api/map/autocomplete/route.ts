import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getDatabaseClient } from "@/lib/db-client";
import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { sql } from "drizzle-orm";
// @ts-ignore
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
// @ts-ignore
import { point } from "@turf/helpers";

const TONALA_OFFICIAL_SECTIONS = new Set([
  2650, 2651, 2652, 2653, 2654, 2655, 2656, 2657, 2658, 2659, 2660, 2661, 2663, 2664, 2665, 2666, 2667, 2668, 2669, 2670,
  2671, 2672, 2673, 2674, 2675, 2677, 2678, 2679, 2680, 2681, 2682, 2683, 2684, 2685, 2687, 2688, 2689, 2690, 2691, 2692,
  2693, 2694, 2695, 2696, 2697, 2698, 2699, 2700, 2701, 2702, 2703, 2704, 2705, 2706, 2707, 2708, 2709, 2710, 2712, 2713,
  2714, 2715, 2716, 2717, 2718, 2719, 2720, 2721, 2723, 2724, 2725, 2726, 2727, 2729, 3311, 3704, 3705, 3706, 3707, 3708,
  3709, 3710, 3711, 3712, 3713, 3714, 3715, 3740, 3741, 3742, 3743, 3744, 3745, 3800, 3801, 3802, 3803, 3804, 3805, 3806,
  3861, 3862, 3863, 3864, 3865, 3866, 3867, 3868, 3869, 3870, 3871, 3872, 3873
]);

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
 * GET /api/map/autocomplete?q=...&municipality=Tonalá
 * Provides real-time instant autocomplete for streets, real colonies, and sections.
 */
export async function GET(req: Request) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const municipality = (url.searchParams.get("municipality") || "Tonalá").trim();

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
          COALESCE(ARRAY_AGG(DISTINCT col.name) FILTER (WHERE col.name IS NOT NULL), '{}') AS colonies,
          COALESCE(MIN(col.municipality), 'Tonalá') AS municipality
        FROM electoral_sections es
        LEFT JOIN section_colonies sc ON sc.section_id = es.id
        LEFT JOIN colonies col ON col.id = sc.colony_id
        WHERE es.section_num = ${secNum}
        GROUP BY es.id, es.section_num, es.geom_json
        LIMIT 1
      `);

      if (secRows.rows.length > 0) {
        const row = secRows.rows[0]!;
        const muni = TONALA_OFFICIAL_SECTIONS.has(row.section_num) ? "Tonalá" : row.municipality || municipality;
        
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
        ${municipality ? sql`AND (col.municipality ILIKE ${municipality} OR col.municipality IS NULL)` : sql``}
      ORDER BY 
        CASE WHEN col.name ILIKE ${`${q}%`} THEN 1 ELSE 2 END,
        col.name ASC
      LIMIT 6
    `);

    for (const r of colRows.rows) {
      const key = `col-${r.name.toLowerCase()}-${r.municipality.toLowerCase()}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        results.push({
          id: `col-${r.id}`,
          type: "colony",
          title: `Colonia ${r.name}`,
          subtitle: `${r.municipality || municipality}, Jal.${r.section_num ? ` · Secc. #${r.section_num}` : ""}`,
          address: `Col. ${r.name}, ${r.municipality || municipality}`,
          colony: r.name,
          municipality: r.municipality || municipality,
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
    const searchTarget = `${q}, ${municipality}, Jalisco, México`;
    const encoded = encodeURIComponent(searchTarget);
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&addressdetails=1&limit=6&countrycodes=mx&viewbox=-105.7,21.9,-101.5,18.9&bounded=0&accept-language=es`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const osmRes = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "Tonala-CRM-OS/2.0 (Municipal Electoral System; admin@tonala.gob.mx)"
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (osmRes.ok) {
      const osmData = await osmRes.json();
      if (Array.isArray(osmData)) {
        // Pre-fetch sections for Point-In-Polygon matching
        let cachedSections: any[] = [];
        try {
          const sRes = await db.execute<{ id: string; section_num: number; geom_json: any }>(sql`
            SELECT id::text, section_num, geom_json FROM electoral_sections WHERE geom_json IS NOT NULL
          `);
          cachedSections = sRes.rows;
        } catch (_dbErr) {
          // Ignore cache error
        }

        for (const item of osmData) {
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          if (isNaN(lat) || isNaN(lng)) continue;

          const addr = item.address || {};
          const road = addr.road || addr.pedestrian || addr.street || addr.highway || addr.path || item.name || "";
          const houseNum = addr.house_number ? ` #${addr.house_number}` : "";
          const rawSuburb = addr.suburb || addr.neighbourhood || addr.quarter || addr.residential || addr.village || addr.hamlet || "";
          const suburb = rawSuburb.startsWith("Cabecera ") ? "" : rawSuburb;
          const city = addr.city || addr.town || addr.county || addr.municipality || municipality;
          const postcode = addr.postcode || "";

          const fullStreet = `${road}${houseNum}`.trim() || item.display_name.split(",")[0];
          const dedupeKey = `addr-${fullStreet.toLowerCase()}-${suburb.toLowerCase()}-${city.toLowerCase()}`;
          if (seenKeys.has(dedupeKey)) continue;
          seenKeys.add(dedupeKey);

          // Point in Polygon matching to detect exact Section Electoral
          let matchedSecNum: number | undefined;
          let matchedSecId: string | undefined;

          if (cachedSections.length > 0) {
            const pt = point([lng, lat]);
            for (const sec of cachedSections) {
              if (!sec.geom_json) continue;
              try {
                const geom = typeof sec.geom_json === "string" ? JSON.parse(sec.geom_json) : sec.geom_json;
                const poly = geom.type === "Feature" ? geom : { type: "Feature", geometry: geom, properties: {} };
                if (booleanPointInPolygon(pt, poly)) {
                  matchedSecNum = sec.section_num;
                  matchedSecId = sec.id;
                  break;
                }
              } catch (_polyErr) {
                // Ignore polygon parsing issue
              }
            }
          }

          const parts: string[] = [];
          if (fullStreet) parts.push(fullStreet);
          if (suburb) parts.push(`Col. ${suburb}`);
          if (city) parts.push(city);
          const formatted = parts.join(", ");

          const subParts: string[] = [];
          if (suburb) subParts.push(`Col. ${suburb}`);
          subParts.push(city);
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
      }
    }
  } catch (_e) {
    // OpenStreetMap timed out or network error
  }

  return NextResponse.json({ results: results.slice(0, 10) });
}
