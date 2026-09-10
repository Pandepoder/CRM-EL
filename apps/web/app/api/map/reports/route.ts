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
import { getSeccionesGeo, ubicarEnSeccion } from "@/lib/sections-geo-cache";
import { resolverMunicipio } from "@/lib/municipios-jalisco";
import { withOutbox } from "@/lib/outbox-helper";
import { randomUUID } from "crypto";

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

    if (latitude !== undefined && longitude !== undefined) {
      // La sección y el municipio salen del polígono del INE que contiene el punto.
      //
      // Antes el municipio se deducía con rangos de número de sección escritos a mano
      // para nueve municipios del AMG, luego con nueve recuadros, y si nada cuadraba se
      // archivaba como "Tonalá": toda incidencia levantada fuera del AMG quedaba guardada
      // en Tonalá. Y el respaldo por cercanía no tenía límite de distancia, así que una
      // incidencia de Puerto Vallarta se enganchaba a la sección menos lejana del AMG.
      // ubicarEnSeccion trae el municipio de la propia sección y acota ese respaldo.
      const ubicacion = await ubicarEnSeccion(Number(latitude), Number(longitude));
      if (ubicacion) {
        if (!finalSectionId) finalSectionId = ubicacion.seccion.id;
        detectedSectionMuni = ubicacion.seccion.municipality;
      }
    }

    // Si quien levanta la incidencia eligió la sección a mano, el municipio es el de esa
    // sección y no el del punto.
    if (sectionId) {
      const elegida = (await getSeccionesGeo()).find((s) => s.id === sectionId);
      if (elegida?.municipality) detectedSectionMuni = elegida.municipality;
    }

    // El municipio explícito manda si es uno real del catálogo. Si no se sabe, se guarda
    // vacío: un hueco se ve y se corrige, un "Tonalá" inventado se queda para siempre.
    const finalMunicipality = resolverMunicipio(municipality) ?? detectedSectionMuni ?? null;

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
