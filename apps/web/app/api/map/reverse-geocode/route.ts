import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getDatabaseClient } from "@/lib/db-client";
import { ubicarEnSeccion } from "@/lib/sections-geo-cache";
import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { resolverMunicipio } from "@/lib/municipios-jalisco";
import { sql } from "drizzle-orm";

/**
 * GET /api/map/reverse-geocode?lat=20.624&lng=-103.235
 *
 * Domicilio, colonia, municipio y sección electoral de una coordenada de Jalisco.
 *
 * Antes el municipio salía de nueve recuadros dibujados a mano sobre el AMG y, fuera de
 * ellos, se devolvía "Tonalá"; la sección salía del polígono que contenía el punto o, si
 * ninguno, del centroide más cercano sin límite de distancia. Con solo el AMG cargado, un
 * punto de Puerto Vallarta volvía como una sección de Tlaquepaque en el municipio de
 * Tonalá, sin ninguna señal de que era un respaldo.
 *
 * Ahora la cartografía de los 125 municipios está en la base y el polígono del INE que
 * contiene el punto trae el municipio correcto. Cuando no se sabe, se devuelve vacío.
 */
export async function GET(request: Request) {
  // Antes era pública: cada llamada cargaba las 3789 secciones con geometría, así
  // que cualquiera sin credenciales podía encadenar peticiones y saturar la base.
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

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

  // 1. Sección electoral que contiene el punto.
  let sectionId: string | null = null;
  let sectionNum: number | null = null;
  let sectionMunicipality: string | null = null;
  let sectionColonies: string[] = [];
  // "sin_seccion" le dice al cliente que no hay sección fiable, en vez de darle una
  // lejana como si fuera la buena.
  let precision: "exacta" | "aproximada" | "sin_seccion" = "sin_seccion";

  try {
    const ubicacion = await ubicarEnSeccion(lat, lng);
    if (ubicacion) {
      sectionId = ubicacion.seccion.id;
      sectionNum = ubicacion.seccion.sectionNum;
      sectionMunicipality = ubicacion.seccion.municipality;
      precision = ubicacion.precision;

      // Las colonias solo hacen falta para la sección que ganó, así que se piden
      // sueltas en lugar de unir el catálogo entero con todas las secciones.
      const colRes = await db.execute<{ name: string }>(sql`
        SELECT col.name
        FROM section_colonies sc
        JOIN colonies col ON col.id = sc.colony_id
        WHERE sc.section_id = ${ubicacion.seccion.id}::uuid
      `);
      sectionColonies = colRes.rows.map((r) => r.name).filter(Boolean);
    }
  } catch (err) {
    console.error("Section lookup error:", err);
  }

  // 2. Domicilio real desde OpenStreetMap.
  let streetAddress = "";
  // Filter out any dummy 'Cabecera' placeholder from section colonies
  const validSectionColonies = sectionColonies.filter((c) => c && !c.startsWith("Cabecera ") && !c.startsWith("Municipio "));
  let detectedColony = validSectionColonies[0] || "";
  let municipioOSM: string | null = null;
  // Antes arrancaba en "45400", el código postal de Tonalá centro, y se quedaba ahí si
  // Nominatim no traía uno: cualquier punto de Jalisco sin CP salía con el de Tonalá.
  let postcode = "";
  let road = "";
  let houseNum = "";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=es`;
    const res = await fetch(nominatimUrl, {
      // Sin el correo del administrador: iba en cada petición a un servicio de terceros.
      headers: { "User-Agent": "Tonala-OS-CRM/1.0 (territorial-planning-system)" },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data?.address) {
        const a = data.address;
        road = a.road || a.pedestrian || a.street || a.highway || a.neighbourhood_road || a.path || a.footway || "";
        houseNum = a.house_number ? ` #${a.house_number}` : "";
        const suburb = a.suburb || a.neighbourhood || a.quarter || a.residential || a.village || a.hamlet || a.subdivision || "";
        if (a.postcode) postcode = a.postcode;
        municipioOSM = resolverMunicipio(a.city || a.town || a.county || a.municipality || a.state_district);
        if (suburb && !suburb.startsWith("Cabecera ")) detectedColony = suburb;
        if (!road && data.display_name) streetAddress = data.display_name;
      }
    }
  } catch (_e) {
    // OpenStreetMap no respondió: se sigue con lo que dice la cartografía.
  }

  // El municipio del polígono manda cuando el punto cae dentro: es el dato del INE y el
  // que ordena el trabajo electoral, mientras que Nominatim rotula "Guadalajara" a colonias
  // de Zapopan y viceversa. Si no hay polígono que lo contenga, se usa Nominatim; si
  // tampoco, la sección cercana; y si nada, se deja vacío en lugar de inventarlo.
  const detectedMunicipality =
    (precision === "exacta" ? sectionMunicipality : null) ?? municipioOSM ?? sectionMunicipality ?? null;

  if (road || detectedColony || detectedMunicipality) {
    const parts: string[] = [];
    if (road) parts.push(`${road}${houseNum}`);
    if (detectedColony) parts.push(`Col. ${detectedColony}`);
    if (detectedMunicipality) parts.push(detectedMunicipality);
    streetAddress = parts.join(", ");
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
    postcode,
    sectionId,
    sectionNum,
    sectionName: sectionNum ? `Sección ${sectionNum}` : undefined,
    precision,
    colonies: sectionColonies
  });
}
