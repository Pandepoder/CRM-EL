import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { getDatabaseClient } from "@/lib/db-client";
import { requireLiderParaIncidencias } from "@/lib/authorization";
import { schema } from "@tonala/shared/database";
const { eventReports } = schema;
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { esCategoriaValida } from "@/lib/categorias-incidencia";
import { getSeccionesEnPunto, getSeccionesGeo, type SeccionGeo } from "@/lib/sections-geo-cache";
import { withOutbox } from "@/lib/outbox-helper";
import { randomUUID } from "crypto";
import { point } from "@turf/helpers";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";

/**
 * Municipio a partir del número de sección. Se mantiene tal cual estaba: la
 * columna `municipality` de electoral_sections viene vacía en la base, así que
 * estos rangos siguen siendo la única fuente.
 */
function municipioPorSeccion(sNum: number): string | null {
  if (sNum >= 2700 && sNum <= 2800) return "Tonalá";
  if (sNum >= 900 && sNum <= 1450) return "Guadalajara";
  if (sNum >= 3000 && sNum <= 3500) return "Zapopan";
  if (sNum >= 2500 && sNum <= 2699) return "San Pedro Tlaquepaque";
  if (sNum >= 2400 && sNum <= 2499) return "Tlajomulco de Zúñiga";
  if (sNum >= 1950 && sNum <= 2050) return "El Salto";
  if (sNum >= 3600 && sNum <= 3650) return "Zapotlanejo";
  if (sNum >= 1750 && sNum <= 1800) return "Ixtlahuacán de los Membrillos";
  if (sNum >= 1850 && sNum <= 1900) return "Juanacatlán";
  return null;
}

/** Convierte la geometría guardada en una Feature que Turf pueda evaluar. */
function comoFeature(geomJson: unknown): any {
  try {
    const bruto: any = typeof geomJson === "string" ? JSON.parse(geomJson) : geomJson;
    if (!bruto) return null;
    return bruto.type === "Feature" ? bruto : { type: "Feature" as const, geometry: bruto, properties: {} };
  } catch {
    return null;
  }
}

export async function GET(_request: Request) {
  // El mapa de incidencias dejó de estar reservado a administración y dirección.
  //
  // Una incidencia sin asignar a nadie es información general de la operación y
  // la ve toda la estructura. En cuanto se asigna —a un equipo o a una persona—
  // se convierte en trabajo de esa brigada: la ven sus integrantes, su líder,
  // quien la creó y administración, y nadie más.
  //
  // La asignación a una persona restringe igual que la de equipo. Antes solo
  // contaba el equipo, así que una tarea con nombre y apellido seguía siendo
  // visible para toda la estructura.
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const db = getDatabaseClient();

  try {
    const actorId = actor.actorId as string;
    const alcance = await resolveUserNetworkScope(actorId);

    const visibilidad = alcance.isGlobal
      ? undefined
      : or(
          // General: sin equipo y sin persona asignada.
          and(isNull(eventReports.assignedTeamId), isNull(eventReports.assignedToUserId)),
          eq(eventReports.createdByUserId, actorId),
          // Asignada a alguien de mi equipo. `teammateUserIds` incluye al líder
          // y a mí mismo, así que con esta condición la tarea de un brigadista
          // la ven él, sus compañeros y su líder.
          inArray(eventReports.assignedToUserId, alcance.teammateUserIds),
          ...(alcance.teamIds.length > 0
            ? [inArray(eventReports.assignedTeamId, alcance.teamIds)]
            : [])
        );

    const reports = await db
      .select({
        id: eventReports.id,
        title: eventReports.title,
        description: eventReports.description,
        category: eventReports.category,
        status: eventReports.status,
        municipality: eventReports.municipality,
        district: eventReports.district,
        sectionId: eventReports.sectionId,
        assignedToUserId: eventReports.assignedToUserId,
        assignedTeamId: eventReports.assignedTeamId,
        eventDate: eventReports.eventDate,
        createdAt: eventReports.createdAt,
        longitude: eventReports.longitude,
        latitude: eventReports.latitude,
        mediaUrls: eventReports.mediaUrls,
        sectionNum: schema.electoralSections.sectionNum
      })
      .from(eventReports)
      .leftJoin(schema.electoralSections, eq(eventReports.sectionId, schema.electoralSections.id))
      .where(visibilidad ? and(visibilidad) : undefined)
      .orderBy(desc(eventReports.createdAt));

    const geoJson = {
      type: "FeatureCollection",
      features: reports.map((report) => ({
        type: "Feature",
        properties: {
          id: report.id,
          title: report.title,
          description: report.description,
          category: report.category,
          status: report.status,
          municipality: report.municipality,
          district: report.district,
          sectionId: report.sectionId,
          sectionNum: report.sectionNum,
          assignedToUserId: report.assignedToUserId,
          assignedTeamId: report.assignedTeamId,
          eventDate: report.eventDate,
          mediaUrls: Array.isArray(report.mediaUrls) ? report.mediaUrls : [],
          createdAt: report.createdAt
        },
        geometry: {
          type: "Point",
          coordinates: [Number(report.longitude), Number(report.latitude)]
        }
      }))
    };

    return NextResponse.json(geoJson);
  } catch (error: any) {
    console.error("Failed to fetch reports", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const actor = await requireLiderParaIncidencias();
  if (actor instanceof NextResponse) return actor;

  try {
    const body = await request.json();
    const { title, description, latitude, longitude, category, municipality, district, eventDate, sectionId, assignedToUserId, assignedTeamId, mediaUrls } = body;

    if (!title || !description || latitude === undefined || longitude === undefined || !category) {
      return NextResponse.json({ error: "Faltan datos obligatorios de la incidencia." }, { status: 400 });
    }

    // Una categoría fuera del catálogo reventaba contra la restricción de la
    // base y salía como error 500: quien levantaba el reporte solo veía "error"
    // y lo perdía. Ahora se rechaza antes, diciendo qué pasó.
    const puedeAceptar = actor.roles.includes("admin") || actor.roles.includes("direction");

    if (!esCategoriaValida(category)) {
      return NextResponse.json(
        { error: `La categoría "${category}" no existe. Elige una de la lista.` },
        { status: 400 }
      );
    }

    const id = randomUUID();
    let newReport: any = null;

    const parsedEventDate = eventDate ? new Date(eventDate) : undefined;
    const safeMediaUrls = Array.isArray(mediaUrls) ? mediaUrls : [];

    let finalSectionId = sectionId;
    let detectedSectionMuni: string | null = null;
    const db = getDatabaseClient();

    if (latitude !== undefined && longitude !== undefined) {
      // Este bloque cargaba TODAS las secciones con su geometría completa en
      // cada alta de incidencia: en producción son 3789 filas y unos 15 MB de
      // JSONB por cada bache que reporta un brigadista desde el teléfono.
      //
      // El caché compartido ya resolvía exactamente esto para geocode,
      // reverse-geocode y autocomplete; esta ruta se quedó sin migrar. Además
      // del caché, el filtro por rectángulo envolvente deja el punto-en-polígono
      // —que es lo caro— en unas pocas candidatas en vez de las 3789.
      const pt = point([Number(longitude), Number(latitude)]);
      const candidatas = await getSeccionesEnPunto(Number(latitude), Number(longitude));

      let contenedora: SeccionGeo | undefined;
      for (const seccion of candidatas) {
        const feature = comoFeature(seccion.geomJson);
        if (feature && booleanPointInPolygon(pt, feature)) {
          contenedora = seccion;
          break;
        }
      }

      if (contenedora) {
        if (!finalSectionId) finalSectionId = contenedora.id;
        detectedSectionMuni = municipioPorSeccion(contenedora.sectionNum);
      } else if (!finalSectionId) {
        // Ninguna sección contiene el punto: se toma la del centroide más
        // cercano, igual que antes. Sale del caché, sin volver a la base.
        let seccionCercana: string | null = null;
        let distanciaMinima = Infinity;

        for (const seccion of await getSeccionesGeo()) {
          const bruto: any = comoFeature(seccion.geomJson)?.geometry;
          const coords = bruto?.type === "Polygon" ? bruto.coordinates?.[0] : bruto?.coordinates?.[0]?.[0];
          if (!coords || coords.length === 0) continue;

          let sumaLng = 0;
          let sumaLat = 0;
          for (const c of coords) {
            sumaLng += c[0];
            sumaLat += c[1];
          }
          const distancia = Math.hypot(
            Number(longitude) - sumaLng / coords.length,
            Number(latitude) - sumaLat / coords.length
          );
          if (distancia < distanciaMinima) {
            distanciaMinima = distancia;
            seccionCercana = seccion.id;
          }
        }

        if (seccionCercana) finalSectionId = seccionCercana;
      }
    }

    // Auto-resolve municipality
    let finalMunicipality = municipality || detectedSectionMuni;
    if (!finalMunicipality && latitude !== undefined && longitude !== undefined) {
      if (longitude >= -103.285 && longitude <= -103.170 && latitude >= 20.570 && latitude <= 20.685) finalMunicipality = "Tonalá";
      else if (longitude >= -103.395 && longitude <= -103.285 && latitude >= 20.620 && latitude <= 20.735) finalMunicipality = "Guadalajara";
      else if (longitude >= -103.520 && longitude <= -103.350 && latitude >= 20.635 && latitude <= 20.820) finalMunicipality = "Zapopan";
      else if (longitude >= -103.420 && longitude <= -103.275 && latitude >= 20.550 && latitude <= 20.640) finalMunicipality = "San Pedro Tlaquepaque";
      else if (longitude >= -103.500 && longitude <= -103.310 && latitude >= 20.410 && latitude <= 20.570) finalMunicipality = "Tlajomulco de Zúñiga";
      else if (longitude >= -103.285 && longitude <= -103.175 && latitude >= 20.470 && latitude <= 20.570) finalMunicipality = "El Salto";
      else if (longitude >= -103.170 && longitude <= -103.020 && latitude >= 20.570 && latitude <= 20.730) finalMunicipality = "Zapotlanejo";
      else if (longitude >= -103.260 && longitude <= -103.140 && latitude >= 20.350 && latitude <= 20.460) finalMunicipality = "Ixtlahuacán de los Membrillos";
      else if (longitude >= -103.200 && longitude <= -103.120 && latitude >= 20.470 && latitude <= 20.550) finalMunicipality = "Juanacatlán";
      else finalMunicipality = "Tonalá";
    }

    await withOutbox("event_report", id, "EventReportCreated.v1", { id, title, description, latitude, longitude, category, municipality: finalMunicipality, district, eventDate: parsedEventDate, sectionId: finalSectionId, assignedToUserId, assignedTeamId, mediaUrls: safeMediaUrls }, actor.actorId, async (tx) => {
      const [inserted] = await tx
        .insert(eventReports)
        .values({
          id,
          title,
          description,
          latitude,
          longitude,
          category,
          municipality: finalMunicipality,
          district,
          sectionId: finalSectionId,
          assignedToUserId,
          assignedTeamId: assignedTeamId || null,
          eventDate: parsedEventDate,
          mediaUrls: safeMediaUrls,
          // Un reporte levantado en campo entra en admisión: alguien tiene que
          // aceptarlo antes de que la estructura empiece a trabajarlo. Quien ya
          // es la autoridad que acepta no se acepta a sí mismo, así que sus
          // altas entran directamente como aceptadas.
          status: puedeAceptar ? "active" : "pendiente",
          createdByUserId: actor.actorId,
        })
        .returning();
      newReport = inserted;
    });

    return NextResponse.json(newReport, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create report", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
