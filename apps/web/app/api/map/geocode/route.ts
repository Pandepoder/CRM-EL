import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getSeccionesGeo } from "@/lib/sections-geo-cache";
import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { point } from "@turf/helpers";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";

// Coordinates for key hubs in Tonalá and Jalisco AMG for quick fallback
const KNOWN_PLACES: Record<string, { lat: number; lng: number; address: string; municipality: string; sectionNum?: number }> = {
  "comité directivo municipal pan": { lat: 20.6256, lng: -103.2435, address: "Comité Directivo Municipal PAN, Tonalá Centro, Jal.", municipality: "Tonalá", sectionNum: 2704 },
  "comite pan": { lat: 20.6256, lng: -103.2435, address: "Comité Directivo Municipal PAN, Tonalá Centro, Jal.", municipality: "Tonalá", sectionNum: 2704 },
  "comité pan": { lat: 20.6256, lng: -103.2435, address: "Comité Directivo Municipal PAN, Tonalá Centro, Jal.", municipality: "Tonalá", sectionNum: 2704 },
  "pan tonala": { lat: 20.6256, lng: -103.2435, address: "Comité Directivo Municipal PAN, Tonalá Centro, Jal.", municipality: "Tonalá", sectionNum: 2704 },
  "pan tonalá": { lat: 20.6256, lng: -103.2435, address: "Comité Directivo Municipal PAN, Tonalá Centro, Jal.", municipality: "Tonalá", sectionNum: 2704 },
  "palacio municipal tonala": { lat: 20.6248, lng: -103.2422, address: "Presidencia Municipal de Tonalá, Hidalgo 21, Centro, Tonalá", municipality: "Tonalá", sectionNum: 2704 },
  "presidencia tonala": { lat: 20.6248, lng: -103.2422, address: "Presidencia Municipal de Tonalá, Hidalgo 21, Centro, Tonalá", municipality: "Tonalá", sectionNum: 2704 },
  "plaza cihualpilli": { lat: 20.6245, lng: -103.2425, address: "Plaza Cihualpilli, Centro, Tonalá, Jal.", municipality: "Tonalá", sectionNum: 2704 },
  "tonala centro": { lat: 20.6248, lng: -103.2422, address: "Tonalá Centro, Jalisco", municipality: "Tonalá", sectionNum: 2704 },
  "tonalá centro": { lat: 20.6248, lng: -103.2422, address: "Tonalá Centro, Jalisco", municipality: "Tonalá", sectionNum: 2704 }
};

export async function GET(request: Request) {
  // Misma razón que en reverse-geocode: dejó de ser pública.
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") || "").trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const qLower = query.toLowerCase();

  // Desde el caché compartido en lugar de releer todas las secciones con su
  // geometría en cada búsqueda.
  const sections = await getSeccionesGeo();

  const results: any[] = [];

  // 1. Check known local POIs
  for (const [key, place] of Object.entries(KNOWN_PLACES)) {
    if (qLower.includes(key) || key.includes(qLower)) {
      results.push({
        lat: place.lat,
        lng: place.lng,
        displayName: place.address,
        formattedAddress: place.address,
        municipality: place.municipality,
        sectionNum: place.sectionNum
      });
      break;
    }
  }

  // 2. Query Nominatim / OpenStreetMap
  try {
    const searchQuery = query.includes("Tonalá") || query.includes("Tonala") || query.includes("Jalisco") || query.includes("Guadalajara")
      ? query
      : `${query}, Tonalá, Jalisco, México`;

    const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=mx&limit=5&addressdetails=1`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const osmRes = await fetch(osmUrl, {
      headers: {
        "User-Agent": "Tonala-OS-CRM/1.0 (territorial-planning-system)",
        "Accept-Language": "es-MX,es;q=0.9"
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (osmRes.ok) {
      const osmData = await osmRes.json();
      if (Array.isArray(osmData)) {
        for (const item of osmData) {
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          if (!isNaN(lat) && !isNaN(lng)) {
            // Find electoral section
            let matchedSection: any = null;
            const pt = point([lng, lat]);
            // El rectángulo envolvente descarta casi todas antes del cálculo caro.
            // Sin este filtro se evaluaba punto-en-polígono contra las 3789
            // secciones por cada resultado de Nominatim.
            for (const s of sections) {
              if (lng < s.bounds[0] || lng > s.bounds[2] || lat < s.bounds[1] || lat > s.bounds[3]) continue;
              try {
                const geom = typeof s.geomJson === "string" ? JSON.parse(s.geomJson) : s.geomJson;
                if (booleanPointInPolygon(pt, geom)) {
                  matchedSection = s;
                  break;
                }
              } catch {
                // Geometría malformada: se ignora
              }
            }

            const addr = item.address || {};
            const municipality = addr.city || addr.town || addr.municipality || addr.county || "Tonalá";
            const colony = addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district || "";

            results.push({
              lat,
              lng,
              displayName: item.display_name,
              formattedAddress: `${addr.road ? addr.road + (addr.house_number ? " #" + addr.house_number : "") : item.name || query}${colony ? `, Col. ${colony}` : ""}, ${municipality}`,
              municipality,
              colony,
              postalCode: addr.postcode || "",
              sectionId: matchedSection?.id,
              sectionNum: matchedSection?.sectionNum
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("OSM geocode lookup error:", err);
  }

  // 3. Fallback to Tonalá Centro centroid if no results found
  if (results.length === 0) {
    results.push({
      lat: 20.6248,
      lng: -103.2422,
      displayName: `${query}, Tonalá, Jalisco`,
      formattedAddress: `${query}, Tonalá Centro, Jal.`,
      municipality: "Tonalá",
      sectionNum: 2704
    });
  }

  return NextResponse.json({ results });
}
