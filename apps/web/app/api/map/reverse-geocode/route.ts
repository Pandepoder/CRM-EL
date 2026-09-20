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
/**
 * Caché en proceso de la búsqueda inversa de OpenStreetMap.
 *
 * En jornada, varias personas capturan sobre la misma calle y el mismo punto se consulta una
 * y otra vez. Nominatim limita a una petición por segundo y castiga el abuso: pasado el
 * límite deja de responder y la dirección real se pierde justo cuando hay más gente en
 * campo. La clave son las coordenadas a cinco decimales, poco más de un metro, así que dos
 * lecturas del mismo punto comparten respuesta sin mezclar direcciones distintas.
 */
declare global {
  var __osmInversoCache: Map<string, { en: number; datos: Record<string, unknown> | null }> | undefined;
}
const CACHE_INVERSO_MS = 10 * 60 * 1000;
// Tope de entradas: cada lectura de GPS es una coordenada distinta al metro y sin tope el mapa
// crecía durante toda la vida del proceso. Map conserva el orden de inserción, así que la
// primera clave es la más vieja.
const CACHE_INVERSO_MAX = 2000;

/** Niveles de OpenStreetMap que son un lugar administrativo y no un sitio concreto. */
const NIVELES_ADMINISTRATIVOS = new Set([
  "city", "town", "village", "hamlet", "suburb", "neighbourhood", "quarter", "borough",
  "city_district", "district", "county", "municipality", "state_district", "state", "region",
  "postcode", "country", "isolated_dwelling", "farm", "locality"
]);

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
  // Las secciones traen colonias de relleno ("Cabecera X", "Municipio Y") que no son lugares.
  const validSectionColonies = sectionColonies.filter((c) => c && !c.startsWith("Cabecera ") && !c.startsWith("Municipio "));
  let detectedColony = validSectionColonies[0] || "";
  let municipioOSM: string | null = null;
  // Antes arrancaba en "45400", el código postal de Tonalá centro, y se quedaba ahí si
  // Nominatim no traía uno: cualquier punto de Jalisco sin CP salía con el de Tonalá.
  let postcode = "";
  let road = "";
  let houseNum = "";
  // Nombre del sitio cuando OpenStreetMap lo conoce (escuela, plaza, mercado, iglesia). En
  // campo, "Escuela Primaria Juan Escutia" ubica mejor que una calle sin número, y muchas
  // esquinas de Jalisco no tienen número de casa.
  let nombreLugar = "";
  // La colonia de la sección es un respaldo: una sección abarca varias colonias y se tomaba
  // la primera por orden alfabético. Solo se afirma en el domicilio cuando la vio
  // OpenStreetMap, o cuando la sección tiene una sola y no hay ambigüedad.
  let colonyDeOsm = false;
  let osmRespondio = false;

  /** Vuelca en las variables de arriba lo que trae una respuesta de Nominatim. */
  const aplicarOsm = (data: any): void => {
    const a = data?.address;
    if (!a) return;

    road = a.road || a.pedestrian || a.street || a.highway || a.neighbourhood_road || a.path || a.footway || "";
    // Algunos números llegan de OpenStreetMap como "45.0": se deja el número tal como se
    // escribe en una fachada.
    const numero = a.house_number ? String(a.house_number).trim().replace(/^(\d+)\.0+$/, "$1") : "";
    houseNum = numero ? ` #${numero}` : "";

    // El nombre propio del punto, si lo tiene. Sale del objeto (name) o del tipo de sitio;
    // nunca se usa el nombre de la calle como si fuera un lugar.
    // Un pueblo, una colonia o un municipio no son "el sitio": Nominatim rotula con name
    // cualquier objeto, y en zona rural devolvía "El Rosario" como si fuera una escuela, con la
    // dirección marcada como domicilio exacto.
    const esAdministrativo =
      ["place", "boundary", "landuse"].includes(data.class) || NIVELES_ADMINISTRATIVOS.has(data.addresstype);
    const edificio = a.building && a.building !== "yes" ? a.building : "";
    const posibleNombre = (esAdministrativo ? "" : data.name) || a.amenity || a.shop || edificio || a.office || a.leisure || a.tourism || "";
    if (posibleNombre && posibleNombre !== road) nombreLugar = String(posibleNombre);

    const suburb = a.suburb || a.neighbourhood || a.quarter || a.residential || a.village || a.hamlet || a.subdivision || a.city_block || "";
    if (a.postcode) postcode = a.postcode;
    municipioOSM = resolverMunicipio(a.city || a.town || a.county || a.municipality || a.state_district);
    if (suburb && !suburb.startsWith("Cabecera ")) {
      detectedColony = suburb;
      colonyDeOsm = true;
    }
    if (!road && !nombreLugar && data.display_name) streetAddress = data.display_name;
  };

  const claveCache = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  const cacheInverso = (globalThis.__osmInversoCache ??= new Map());
  const guardado = cacheInverso.get(claveCache);

  if (guardado && Date.now() - guardado.en < CACHE_INVERSO_MS) {
    osmRespondio = true;
    if (guardado.datos) aplicarOsm(guardado.datos);
  } else {
    try {
      const controller = new AbortController();
      // 5 segundos y no 3: en campo se levanta la incidencia con la red del teléfono, y a 3
      // segundos la dirección real se perdía justo donde más falta hace, dejando "Lat/Lng".
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // zoom=18 es nivel de edificio, lo más fino que da la búsqueda inversa de Nominatim.
      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&namedetails=1&accept-language=es`;
      const res = await fetch(nominatimUrl, {
        // Sin el correo del administrador: iba en cada petición a un servicio de terceros.
        headers: { "User-Agent": "Tonala-OS-CRM/1.0 (territorial-planning-system)" },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        osmRespondio = true;
        if (cacheInverso.size >= CACHE_INVERSO_MAX) {
          const masVieja = cacheInverso.keys().next().value;
          if (masVieja !== undefined) cacheInverso.delete(masVieja);
        }
        cacheInverso.set(claveCache, { en: Date.now(), datos: data?.address ? data : null });
        aplicarOsm(data);
      }
    } catch {
      // OpenStreetMap no respondió o tardó demasiado: se sigue con lo que dice la cartografía
      // y el cliente se entera por `osm`, en vez de recibir una dirección de nivel colonia
      // presentada como si estuviera medida sobre el punto.
    }
  }

  // El municipio del polígono manda cuando el punto cae dentro: es el dato del INE y el
  // que ordena el trabajo electoral, mientras que Nominatim rotula "Guadalajara" a colonias
  // de Zapopan y viceversa. Si no hay polígono que lo contenga, se usa Nominatim; si
  // tampoco, la sección cercana; y si nada, se deja vacío en lugar de inventarlo.
  const detectedMunicipality =
    (precision === "exacta" ? sectionMunicipality : null) ?? municipioOSM ?? sectionMunicipality ?? null;

  // El domicilio se arma de lo más preciso a lo más general, y se omite lo que no se sepa en
  // vez de rellenarlo: sitio, calle y número, colonia, código postal y municipio. Antes se
  // quedaba en calle, colonia y municipio, así que dos puntos a cuadras de distancia podían
  // devolver exactamente el mismo texto.
  // Una colonia heredada de la sección solo se escribe cuando no hay ambigüedad: si la
  // sección tiene varias, decir "Col. <la primera>" es inventar una precisión que no se tiene.
  const colonyAfirmable = colonyDeOsm || validSectionColonies.length === 1;

  if (nombreLugar || road || detectedColony || detectedMunicipality) {
    const parts: string[] = [];
    if (nombreLugar) parts.push(nombreLugar);
    if (road) parts.push(`${road}${houseNum}`);
    if (detectedColony && colonyAfirmable) parts.push(`Col. ${detectedColony}`);
    if (postcode) parts.push(`CP ${postcode}`);
    if (detectedMunicipality) parts.push(detectedMunicipality);
    if (parts.length > 0) streetAddress = parts.join(", ");
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
    placeName: nombreLugar || undefined,
    street: road || undefined,
    houseNumber: houseNum ? houseNum.replace(" #", "") : undefined,
    // Solo la colonia que se puede afirmar. Una sección con varias colonias no dice en cuál
    // cae el punto; las candidatas siguen en `colonies` para quien quiera ofrecerlas.
    colony: colonyAfirmable ? detectedColony : "",
    municipality: detectedMunicipality,
    postalCode: postcode,
    postcode,
    sectionId,
    sectionNum,
    sectionName: sectionNum ? `Sección ${sectionNum}` : undefined,
    precision,
    // Qué tan medida está la dirección: "domicilio" si OpenStreetMap ubicó calle o sitio,
    // "aproximada" si solo alcanzó para colonia o municipio, y "sin_referencia" si no
    // respondió. La interfaz ya no puede presentar las tres como si fueran lo mismo.
    addressPrecision: !osmRespondio ? "sin_referencia" : (road || nombreLugar) ? "domicilio" : "aproximada",
    colonySource: colonyDeOsm ? "osm" : detectedColony ? "seccion" : null,
    colonies: sectionColonies
  });
}
