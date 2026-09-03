import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getSeccionesGeo } from "@/lib/sections-geo-cache";
import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { buscarDireccion } from "@/lib/osm-search";
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
  // El municipio en el que se está capturando. Sin él toda búsqueda se orienta
  // a Tonalá, que es la cabecera de la estructura pero no el único municipio
  // del selector.
  const municipio = (searchParams.get("municipality") || "Tonalá").trim() || "Tonalá";

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const qLower = query.toLowerCase();

  // Desde el caché compartido en lugar de releer todas las secciones con su
  // geometría en cada búsqueda.
  const sections = await getSeccionesGeo();

  const results: any[] = [];

  // 1. Lugares conocidos, solo cuando la búsqueda contiene realmente el nombre.
  //
  // La condición incluía además `key.includes(qLower)`, es decir, el sentido
  // inverso: bastaba escribir "pan" para que "comite pan" se diera por bueno y
  // encabezara los resultados. Cualquier búsqueda corta que fuera subcadena de
  // un lugar conocido se desviaba a ese lugar.
  for (const [key, place] of Object.entries(KNOWN_PLACES)) {
    if (qLower.includes(key)) {
      results.push({
        lat: place.lat,
        lng: place.lng,
        displayName: place.address,
        formattedAddress: place.address,
        municipality: place.municipality,
        sectionNum: place.sectionNum,
        precision: "exacta"
      });
      break;
    }
  }

  // 2. Nominatim, acotado al AMG (ver lib/osm-search).
  try {
    const candidatos = await buscarDireccion(query, municipio);

    const deOSM: any[] = [];

    for (const item of candidatos) {
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);
      if (isNaN(lat) || isNaN(lng)) continue;

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
      // OSM rara vez tiene el número de casa en Tonalá. Cuando no lo tiene, el
      // punto es el de la calle entera, no el del domicilio: quien captura debe
      // saberlo para ajustar el pin en el mapa en vez de dar por bueno un punto
      // que puede estar a cuadras de distancia.
      const precision = addr.house_number ? "exacta" : "calle";

      deOSM.push({
        lat,
        lng,
        displayName: item.display_name,
        formattedAddress: `${addr.road ? addr.road + (addr.house_number ? " #" + addr.house_number : "") : item.name || query}${colony ? `, Col. ${colony}` : ""}, ${municipality}`,
        municipality,
        colony,
        postalCode: addr.postcode || "",
        precision,
        sectionId: matchedSection?.id,
        sectionNum: matchedSection?.sectionNum
      });
    }

    // Los que traen número de casa se adelantan; en todo lo demás se respeta el
    // orden de relevancia de Nominatim, que conoce el callejero mucho mejor que
    // cualquier criterio que se invente aquí. Un intento previo de desempatar
    // por sección electoral acabó poniendo una ciclovía por delante de la
    // Avenida Río Nilo. `sort` es estable, así que empates conservan su orden.
    deOSM.sort((a, b) => (a.precision === "exacta" ? 0 : 1) - (b.precision === "exacta" ? 0 : 1));

    results.push(...deOSM);
  } catch (err) {
    console.error("OSM geocode lookup error:", err);
  }

  // 3. Sin resultados no se inventa uno.
  //
  // Aquí se devolvía el centro de Tonalá con la etiqueta `"${query}, Tonalá
  // Centro"`, de modo que el cliente anunciaba "✓ Ubicado en: Av. Río Nilo
  // 8000" y clavaba el pin en la plaza principal. Era indistinguible de un
  // acierto: quien capturaba se llevaba una coordenada falsa sin ningún aviso.
  // Vale más decir que no se encontró y que se marque en el mapa.
  return NextResponse.json({ results });
}
