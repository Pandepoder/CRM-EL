import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { and, between, count, desc, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import { actorFromSession } from "@/lib/api-helpers";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { contactosVisibles, contactIdRestriction } from "@/lib/contact-visibility";
import { registrarError } from "@/lib/registro";
import { getSeccionesGeo } from "@/lib/sections-geo-cache";
import { agruparEnRejilla, dentroDe, ladoDeRejilla, leerRecuadro, type PuntoDelMapa } from "@/lib/mapa-rejilla";
import { contactoConGps, contactoSinGps, contactoSinUbicacionEnMapa } from "@/lib/ubicacion-contacto";

// Assigned color palette for teams/networks
const NETWORK_COLORS = [
  "#2563eb", // blue
  "#7c3aed", // violet
  "#059669", // emerald
  "#d97706", // amber
  "#dc2626", // red
  "#0891b2", // cyan
  "#c026d3", // fuchsia
  "#475569"  // slate
];

/**
 * Tope de fichas completas por respuesta. Agrupando no se llega; sin agrupar (al máximo acercamiento
 * o con la agrupación apagada a nivel estatal) protege al teléfono de recibir el padrón entero.
 */
const MAXIMO_DE_FICHAS = 3000;

/**
 * Contactos para el mapa.
 *
 * Parámetros:
 *   - `bbox=minLng,minLat,maxLng,maxLat`: solo lo que cae en la vista. Se filtra en SQL; antes se
 *     traía todo el alcance —descifrando colonia y municipio de cada ficha— y se recortaba en
 *     JavaScript (R6).
 *   - `zoom=N`: por debajo de 15 el servidor agrupa en la rejilla de siempre y solo manda completos
 *     los contactos que quedan solos en su celda (C10). `agrupar=0` lo desactiva.
 *   - `solo=conteo`: solo los números, para el rótulo de la capa cuando está apagada. Antes se
 *     descargaban todas las fichas del recuadro (1,5 MB para administración) aunque la capa no se
 *     viera.
 *
 * `cobertura` cuenta en todo el alcance, dentro y fuera de la vista: el rótulo dice el total real, y
 * `sinUbicacion` son los ciudadanos que el mapa no puede dibujar (sin GPS ni sección, C21).
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const recuadro = leerRecuadro(url.searchParams.get("bbox"));
    // Sin `zoom` no se agrupa. Ojo: `Number(null)` es 0, que es un zoom válido y agruparía todo.
    const zoomTexto = url.searchParams.get("zoom");
    const zoom = zoomTexto ? Number(zoomTexto) : Number.NaN;
    const lado = url.searchParams.get("agrupar") === "0" ? null : ladoDeRejilla(zoom);
    const soloConteo = url.searchParams.get("solo") === "conteo";

    // De la base, no de la cookie: con una cuenta dada de baja esto respondía 200 con una lista
    // vacía (su alcance queda vacío) en vez de 401, y la pantalla no sabía que la sesión ya no vale.
    const actor = await actorFromSession();
    if (!actor) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const db = getDatabaseClient();
    const networkScope = await resolveUserNetworkScope(actor.actorId);

    // Las condiciones se acumulan y se aplican juntas: encadenar `.where()` sobre una consulta
    // `$dynamic()` no las suma, la segunda sustituye a la primera. Los mismos contactos que el
    // directorio: antes el mapa pintaba puntos cuya ficha luego respondía "no encontrado".
    const C = schema.contacts;
    const condiciones: SQL[] = [eq(C.status, "active")];
    const restriccion = contactIdRestriction(await contactosVisibles(networkScope));
    if (restriccion) condiciones.push(restriccion);

    const conGps = contactoConGps;
    const sinGps = contactoSinGps;

    // Cobertura del alcance entero, sin descifrar nada. La misma regla que el filtro «Sin ubicación»
    // del Directorio (`lib/ubicacion-contacto.ts`), al que enlaza el aviso del mapa.
    const [c] = await db
      .select({
        total: count(),
        exactos: sql<number>`count(*) FILTER (WHERE ${conGps})`,
        sinUbicacion: sql<number>`count(*) FILTER (WHERE ${contactoSinUbicacionEnMapa})`
      })
      .from(C)
      .leftJoin(schema.electoralSections, eq(C.sectionId, schema.electoralSections.id))
      .where(and(...condiciones));
    const total = Number(c?.total ?? 0);
    const exactos = Number(c?.exactos ?? 0);
    // Sin GPS y sin una sección con cartografía: el mapa no tiene dónde ponerlos.
    const sinUbicacion = Number(c?.sinUbicacion ?? 0);
    const porSeccion = total - exactos - sinUbicacion;
    const cobertura = {
      contactos: total,
      exactos,
      porSeccion,
      sinUbicacion,
      ubicables: exactos + porSeccion,
      enVista: 0,
      dibujados: 0,
      truncado: false
    };
    if (soloConteo) return NextResponse.json({ type: "FeatureCollection", features: [], grupos: [], cobertura });

    // Un contacto sin GPS se ubica en el centro de su sección —una aproximación con significado,
    // marcada como tal— y sin sección no se dibuja. Nunca se inventa un punto.
    const secciones = await getSeccionesGeo();
    const centroDe = new Map<string, readonly [number, number]>();
    for (const s of secciones) if (s.centro) centroDe.set(s.id, s.centro);

    const enVista: SQL[] = [];
    if (recuadro) {
      const seccionesEnVista = secciones.filter((s) => s.centro && dentroDe(recuadro, s.centro[0], s.centro[1])).map((s) => s.id);
      enVista.push(
        or(
          and(conGps, between(C.exactLongitude, recuadro[0], recuadro[2]), between(C.exactLatitude, recuadro[1], recuadro[3])),
          seccionesEnVista.length > 0 ? and(sinGps, inArray(C.sectionId, seccionesEnVista)) : undefined
        )!
      );
    }

    const filas = await db
      .select({ id: C.id, lat: C.exactLatitude, lng: C.exactLongitude, sectionId: C.sectionId, pan: C.panMilitancy })
      .from(C)
      .where(and(...condiciones, ...enVista))
      .orderBy(desc(C.createdAt), desc(C.id));

    const puntos: PuntoDelMapa[] = [];
    for (const f of filas) {
      if (f.lat != null && f.lng != null) {
        puntos.push({ id: f.id, lng: f.lng, lat: f.lat, pan: f.pan === "confirmada", aprox: false });
        continue;
      }
      const centro = f.sectionId ? centroDe.get(f.sectionId) : undefined;
      if (centro) puntos.push({ id: f.id, lng: centro[0], lat: centro[1], pan: f.pan === "confirmada", aprox: true });
    }
    cobertura.enVista = puntos.length;

    const { grupos, sueltos } = lado ? agruparEnRejilla(puntos, lado) : { grupos: [], sueltos: puntos.map((p) => p.id) };
    cobertura.truncado = sueltos.length > MAXIMO_DE_FICHAS;
    const idsSueltos = sueltos.slice(0, MAXIMO_DE_FICHAS);
    const puntoDe = new Map(puntos.map((p) => [p.id, p]));

    // Solo de los que se dibujan sueltos se piden y se descifran los datos de su ficha.
    const fichas = idsSueltos.length === 0 ? [] : await db
      .select({
        id: C.id,
        displayName: C.displayName,
        colony: C.colony,
        municipality: C.municipality,
        panMilitancy: C.panMilitancy,
        sectionNum: schema.electoralSections.sectionNum,
        createdByUserId: C.createdByUserId,
        creatorName: schema.userProfiles.displayName,
        creatorAccessType: schema.userProfiles.accessType,
        createdAt: C.createdAt
      })
      .from(C)
      .leftJoin(schema.userProfiles, eq(C.createdByUserId, schema.userProfiles.id))
      .leftJoin(schema.electoralSections, eq(C.sectionId, schema.electoralSections.id))
      .where(inArray(C.id, idsSueltos));

    const features = fichas.map((f) => {
      const p = puntoDe.get(f.id)!;
      const colorIndex = Math.abs(f.createdByUserId.charCodeAt(0)) % NETWORK_COLORS.length;
      return {
        type: "Feature",
        properties: {
          id: f.id,
          displayName: f.displayName,
          // El teléfono no viaja: el mapa no lo usa. Sin dato va vacío, nunca "Tonalá".
          // `colony` y `municipality` ya llegan descifrados por el esquema.
          colony: f.colony || null,
          municipality: f.municipality || null,
          panMilitancy: f.panMilitancy || "no_registrada",
          isPanConfirmed: f.panMilitancy === "confirmada",
          creatorName: f.creatorName || "Integrante",
          creatorAccessType: f.creatorAccessType || "conexion",
          networkColor: NETWORK_COLORS[colorIndex],
          // El cliente pinta distinto lo aproximado para que nadie lo confunda con un domicilio.
          precision: p.aprox ? "seccion" : "exacta",
          isApproximate: p.aprox,
          sectionNum: f.sectionNum ?? null,
          createdAt: f.createdAt ? f.createdAt.toISOString() : null
        },
        geometry: { type: "Point", coordinates: [p.lng, p.lat] }
      };
    });
    cobertura.dibujados = features.length + grupos.reduce((n, g) => n + g.total, 0);

    return NextResponse.json({ type: "FeatureCollection", features, grupos, cobertura });
  } catch (error: unknown) {
    registrarError("Failed to fetch contacts for map", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
