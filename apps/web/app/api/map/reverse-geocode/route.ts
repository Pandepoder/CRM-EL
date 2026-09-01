import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getDatabaseClient } from "@/lib/db-client";
import { point } from "@turf/helpers";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { sql } from "drizzle-orm";

// High-precision bounding box heuristic for Metropolitan Municipalities of Jalisco
const METRO_BOUNDS: Array<{
  municipality: string;
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}> = [
  // 1. Tonalá
  { municipality: "Tonalá", minLng: -103.285, maxLng: -103.170, minLat: 20.570, maxLat: 20.685 },
  // 2. Guadalajara
  { municipality: "Guadalajara", minLng: -103.395, maxLng: -103.285, minLat: 20.620, maxLat: 20.735 },
  // 3. Zapopan
  { municipality: "Zapopan", minLng: -103.520, maxLng: -103.350, minLat: 20.635, maxLat: 20.820 },
  // 4. San Pedro Tlaquepaque
  { municipality: "San Pedro Tlaquepaque", minLng: -103.420, maxLng: -103.275, minLat: 20.550, maxLat: 20.640 },
  // 5. Tlajomulco de Zúñiga
  { municipality: "Tlajomulco de Zúñiga", minLng: -103.500, maxLng: -103.310, minLat: 20.410, maxLat: 20.570 },
  // 6. El Salto
  { municipality: "El Salto", minLng: -103.285, maxLng: -103.175, minLat: 20.470, maxLat: 20.570 },
  // 7. Zapotlanejo
  { municipality: "Zapotlanejo", minLng: -103.170, maxLng: -103.020, minLat: 20.570, maxLat: 20.730 },
  // 8. Ixtlahuacán de los Membrillos
  { municipality: "Ixtlahuacán de los Membrillos", minLng: -103.260, maxLng: -103.140, minLat: 20.350, maxLat: 20.460 },
  // 9. Juanacatlán
  { municipality: "Juanacatlán", minLng: -103.200, maxLng: -103.120, minLat: 20.470, maxLat: 20.550 },
];

function normalizeMunicipalityName(rawMuni: string = ""): string {
  const m = rawMuni.toLowerCase();
  if (m.includes("tonal") || m.includes("tonala")) return "Tonalá";
  if (m.includes("guadalajara")) return "Guadalajara";
  if (m.includes("zapopan")) return "Zapopan";
  if (m.includes("tlaquepaque") || m.includes("san pedro")) return "San Pedro Tlaquepaque";
  if (m.includes("tlajomulco")) return "Tlajomulco de Zúñiga";
  if (m.includes("salto")) return "El Salto";
  if (m.includes("zapotlanejo")) return "Zapotlanejo";
  if (m.includes("ixtlahuac") || m.includes("ixtlahuacán")) return "Ixtlahuacán de los Membrillos";
  if (m.includes("juanacat") || m.includes("juanacatlán")) return "Juanacatlán";
  return rawMuni || "Tonalá";
}

function resolveMunicipalityByCoords(lat: number, lng: number): string {
  for (const b of METRO_BOUNDS) {
    if (lng >= b.minLng && lng <= b.maxLng && lat >= b.minLat && lat <= b.maxLat) {
      return b.municipality;
    }
  }
  return "Tonalá";
}


/**
 * GET /api/map/reverse-geocode?lat=20.624&lng=-103.235
 * Accurately detects street address, colony, municipality, and electoral section for any coordinate in Jalisco AMG.
 */
export async function GET(request: Request) {

  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");

  if (!latStr || !lngStr) {
    return NextResponse.json({ error: "Missing lat or lng parameters" }, { status: 400 });
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "Invalid coordinate values" }, { status: 400 });
  }

  const db = getDatabaseClient();

  // 1. Cross-reference against PostgreSQL Electoral Sections database (Point-in-Polygon + Centroid Fallback)
  let sectionId: string | null = null;
  let sectionNum: number | null = null;
  let sectionMunicipality: string | null = null;
  let sectionColonies: string[] = [];

  try {
    const sectionsRes = await db.execute<{
      id: string;
      section_num: number;
      geom_json: any;
      colonies: string[];
      municipality: string;
    }>(sql`
      SELECT 
        es.id::text,
        es.section_num,
        es.geom_json,
        COALESCE(es.municipality, 'Tonalá') AS municipality,
        COALESCE(ARRAY_AGG(DISTINCT col.name) FILTER (WHERE col.name IS NOT NULL), '{}') AS colonies
      FROM electoral_sections es
      LEFT JOIN section_colonies sc ON sc.section_id = es.id
      LEFT JOIN colonies col ON col.id = sc.colony_id
      WHERE es.geom_json IS NOT NULL
      GROUP BY es.id, es.section_num, es.municipality, es.geom_json
    `);

    const pt = point([lng, lat]);
    let closestSection: any = null;
    let minDistance = Infinity;

    for (const row of sectionsRes.rows) {
      if (!row.geom_json) continue;
      try {
        const rawGeom = typeof row.geom_json === "string" ? JSON.parse(row.geom_json) : row.geom_json;
        const polyFeature = rawGeom.type === "Feature" ? rawGeom : { type: "Feature" as const, geometry: rawGeom, properties: {} };
        
        // Exact Point-in-Polygon Match
        if (booleanPointInPolygon(pt, polyFeature)) {
          sectionId = row.id;
          sectionNum = row.section_num;
          sectionMunicipality = row.municipality || "Tonalá";
          sectionColonies = row.colonies || [];
          break;
        }

        // Centroid calculation for fallback if point is on edge or slightly beyond Voronoi box
        const coords = rawGeom.type === "Polygon" ? rawGeom.coordinates[0] : rawGeom.geometry?.coordinates?.[0];
        if (coords && coords.length > 0) {
          let sumLng = 0, sumLat = 0;
          for (const c of coords) {
            sumLng += c[0];
            sumLat += c[1];
          }
          const cLng = sumLng / coords.length;
          const cLat = sumLat / coords.length;
          const dist = Math.hypot(lng - cLng, lat - cLat);
          if (dist < minDistance) {
            minDistance = dist;
            closestSection = row;
          }
        }
      } catch {
        // Skip malformed geometry
      }
    }

    // Centroid fallback if no polygon directly enclosed the point
    if (!sectionId && closestSection) {
      sectionId = closestSection.id;
      sectionNum = closestSection.section_num;
      sectionMunicipality = closestSection.municipality || "Tonalá";
      sectionColonies = closestSection.colonies || [];
    }
  } catch (err) {
    console.error("Section lookup error:", err);
  }

  // 2. Fetch real street address from OpenStreetMap Nominatim Reverse Geocoding
  let streetAddress = "";
  // Filter out any dummy 'Cabecera' placeholder from section colonies
  const validSectionColonies = (sectionColonies || []).filter(c => c && !c.startsWith("Cabecera ") && !c.startsWith("Municipio "));
  let detectedColony = validSectionColonies[0] || "";
  let detectedMunicipality = sectionMunicipality || resolveMunicipalityByCoords(lat, lng);
  let postcode = "45400";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=es`;
    const res = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "Tonala-CRM-OS/2.0 (Municipal Electoral System; admin@tonala.gob.mx)"
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const a = data.address;
        
        const road = a.road || a.pedestrian || a.street || a.highway || a.neighbourhood_road || a.path || a.footway || "";
        const houseNum = a.house_number ? ` #${a.house_number}` : "";
        const suburb = a.suburb || a.neighbourhood || a.quarter || a.residential || a.village || a.hamlet || a.subdivision || "";
        const city = a.city || a.town || a.county || a.municipality || a.state_district || "";
        
        if (a.postcode) postcode = a.postcode;

        if (city) {
          detectedMunicipality = normalizeMunicipalityName(city);
        }

        if (suburb && !suburb.startsWith("Cabecera ")) {
          detectedColony = suburb;
        }

        // Build friendly formatted address
        const parts: string[] = [];
        if (road) parts.push(`${road}${houseNum}`);
        if (detectedColony) parts.push(`Col. ${detectedColony}`);
        if (detectedMunicipality) parts.push(detectedMunicipality);
        
        streetAddress = parts.join(", ") || data.display_name || "";
      }
    }
  } catch (_e) {
    // OpenStreetMap fetch failed or timed out — fallback to coordinates
    streetAddress = `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`;
  }

  if (!streetAddress) {
    streetAddress = `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`;
  }

  return NextResponse.json({
    success: true,
    latitude: lat,
    longitude: lng,
    formattedAddress: streetAddress,
    address: streetAddress,
    colony: detectedColony,
    municipality: detectedMunicipality,
    postalCode: postcode,
    postcode: postcode,
    sectionId,
    sectionNum,
    sectionName: sectionNum ? `Sección ${sectionNum}` : undefined,
    colonies: sectionColonies
  });
}
