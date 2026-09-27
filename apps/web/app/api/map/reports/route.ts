import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { getDatabaseClient } from "@/lib/db-client";
import { requireLiderParaIncidencias } from "@/lib/authorization";
import { schema } from "@tonala/shared/database";
const { eventReports } = schema;
import { and, desc, eq, gte, inArray, or, sql } from "drizzle-orm";
import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { incidentScopeCondition } from "@/lib/incident-visibility";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { esCategoriaValida } from "@/lib/categorias-incidencia";
import { camposDeTextoDeIncidencia, seccionPorId } from "@/lib/campos-incidencia";
import { motivoAsignacionFueraDeAlcance, puedeSobreIncidencia } from "@/lib/permisos-incidencias";
import { ESTADOS_ABIERTOS } from "@/lib/estados-incidencia";

/**
 * Ventana del mapa (R5): lo que sigue abierto, de cualquier fecha, y lo resuelto en los últimos
 * `DIAS_DE_RESUELTAS` días. Antes iba todo lo visible —archivadas y rechazadas incluidas, que el
 * mapa además rotulaba «Pendiente»—, sin límite: la respuesta crecía con toda la historia. El
 * historial completo sigue en Incidencias → Historial.
 */
const DIAS_DE_RESUELTAS = 30;
/** Tope de puntos por respuesta; si se alcanza, la respuesta lo dice (`truncado`). */
const MAXIMO_DE_PUNTOS = 2000;
import { ubicarEnSeccion } from "@/lib/sections-geo-cache";
import { resolverMunicipio } from "@/lib/municipios-jalisco";
import { withOutbox } from "@/lib/outbox-helper";
import { randomUUID } from "crypto";
import { registrarError } from "@/lib/registro";
import { esUuid } from "@/lib/ids";
import { crearUnaSolaVez } from "@/lib/idempotencia";
import { motivoSiAdjuntosAjenos, urlsDeAdjuntos } from "@/lib/archivos";

export async function GET(_request: Request) {
  // El mapa de incidencias dejó de estar reservado a administración y dirección.
  //
  // La regla de quién ve qué incidencia vive en lib/incident-visibility y es la misma en todas
  // las pantallas. Aquí estaba escrita a mano y daba por general cualquier incidencia sin
  // asignar, así que una dirección veía en el mapa lo que levantaban las brigadas de otra.
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const db = getDatabaseClient();

  try {
    const actorId = actor.actorId as string;
    const alcance = await resolveUserNetworkScope(actorId);

    const visibilidad = incidentScopeCondition(alcance);
    const hace = new Date(Date.now() - DIAS_DE_RESUELTAS * 24 * 60 * 60 * 1000);
    const ventana = or(
      inArray(eventReports.status, ESTADOS_ABIERTOS),
      // Cuándo se cerró: `closed_at` si lo hay; si no, la última modificación.
      and(eq(eventReports.status, "resolved"), gte(sql`COALESCE(${eventReports.closedAt}, ${eventReports.updatedAt})`, hace))
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
        createdByUserId: eventReports.createdByUserId,
        activityTypeId: eventReports.activityTypeId,
        eventDate: eventReports.eventDate,
        createdAt: eventReports.createdAt,
        longitude: eventReports.longitude,
        latitude: eventReports.latitude,
        mediaUrls: eventReports.mediaUrls,
        sectionNum: schema.electoralSections.sectionNum
      })
      .from(eventReports)
      .leftJoin(schema.electoralSections, eq(eventReports.sectionId, schema.electoralSections.id))
      .where(and(visibilidad, ventana))
      .orderBy(desc(eventReports.createdAt))
      .limit(MAXIMO_DE_PUNTOS + 1);

    const truncado = reports.length > MAXIMO_DE_PUNTOS;
    // Lo que llega aquí ya está en su alcance: administración (el maestro o la municipal) actúa sobre
    // todo lo que ve.
    const esAdmin = alcance.isAdmin;
    // Su mando, no todo lo que ve: la misma lista con la que la API decide (permisos-incidencias).
    const personas = alcance.commandUserIds ?? [];

    const geoJson = {
      type: "FeatureCollection",
      truncado,
      diasDeResueltas: DIAS_DE_RESUELTAS,
      features: reports.slice(0, MAXIMO_DE_PUNTOS).map((report) => {
        // Las actividades de la bitácora también son puntos del mapa, pero se trabajan en la Agenda:
        // cerrarlas pide un resultado y borrarlas se llevaría su historial. Desde el mapa no.
        const esActividad = report.activityTypeId != null;
        const incidencia = { createdByUserId: report.createdByUserId, assignedToUserId: report.assignedToUserId, assignedTeamId: report.assignedTeamId, description: report.description };
        return {
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
            createdAt: report.createdAt,
            esActividad,
            // Lo que la API dejará hacer a quien pregunta, con la misma regla que PATCH y DELETE:
            // el globo no ofrece botones que luego se rechazan.
            puedeActualizar: !esActividad && puedeSobreIncidencia("actualizar", incidencia, actorId, esAdmin, alcance.teamIds, personas),
            puedeBorrar: !esActividad && puedeSobreIncidencia("borrar", incidencia, actorId, esAdmin, alcance.teamIds, personas)
          },
          geometry: {
            type: "Point",
            coordinates: [Number(report.longitude), Number(report.latitude)]
          }
        };
      })
    };

    return NextResponse.json(geoJson);
  } catch (error: any) {
    registrarError("Failed to fetch reports", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const actor = await requireLiderParaIncidencias();
  if (actor instanceof NextResponse) return actor;

  try {
    const body = await request.json();
    const { title, description, latitude, longitude, category, municipality, district, eventDate, sectionId, assignedToUserId, assignedTeamId, mediaUrls, clientRequestId } = body;

    // Clave del formulario (R16): un doble toque o un reintento tras un corte de señal devuelve la
    // incidencia ya creada en vez de levantar otra. Ver `lib/idempotencia.ts`.
    if (clientRequestId !== undefined && clientRequestId !== null && !esUuid(clientRequestId)) {
      return NextResponse.json({ error: "La clave de la solicitud no es válida.", campo: "clientRequestId" }, { status: 400 });
    }

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
    // Largo del título y la descripción, y una fecha que exista: una fecha imposible llegaba a la base
    // y salía como error 500, y el reporte se perdía.
    const textos = camposDeTextoDeIncidencia({ title, description, category, eventDate }, true);
    if (!textos.ok) return NextResponse.json({ error: textos.error, campo: textos.campo }, { status: 400 });
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return NextResponse.json({ error: "La ubicación de la incidencia no es válida. Vuelve a marcarla en el mapa.", campo: "latitude" }, { status: 400 });
    }

    // Se comprobaba quién levanta la incidencia, pero no a quién se la asigna.
    const alcance = await resolveUserNetworkScope(actor.actorId);
    const motivoDestino = motivoAsignacionFueraDeAlcance(alcance, { assignedToUserId, assignedTeamId });
    if (motivoDestino) {
      return NextResponse.json({ error: motivoDestino }, { status: 403 });
    }

    const id = randomUUID();
    let newReport: any = null;

    const parsedEventDate = textos.valores.eventDate ?? undefined;
    const safeMediaUrls = Array.isArray(mediaUrls) ? mediaUrls : [];
    // Solo fotos subidas por quien levanta la incidencia: adjuntar la URL de una foto ajena la dejaría
    // a la vista de toda su cadena de mando (A12).
    const adjuntosAjenos = await motivoSiAdjuntosAjenos(actor.actorId, urlsDeAdjuntos(safeMediaUrls));
    if (adjuntosAjenos) return NextResponse.json({ error: adjuntosAjenos, campo: "mediaUrls" }, { status: 400 });

    let finalSectionId: string | undefined = undefined;
    let detectedSectionMuni: string | null = null;

    // Una sección elegida a mano tiene que existir: un identificador inventado llegaba a la base y
    // salía como error 500.
    if (sectionId) {
      const elegida = await seccionPorId(sectionId);
      if (!elegida) return NextResponse.json({ error: "La sección elegida no existe.", campo: "sectionId" }, { status: 400 });
      finalSectionId = elegida.id;
      // El municipio es el de esa sección y no el del punto.
      detectedSectionMuni = elegida.municipio;
    }

    // Sin sección elegida, la sección y el municipio salen del polígono del INE que contiene el punto.
    //
    // Antes el municipio se deducía con rangos de número de sección escritos a mano
    // para nueve municipios del AMG, luego con nueve recuadros, y si nada cuadraba se
    // archivaba como "Tonalá": toda incidencia levantada fuera del AMG quedaba guardada
    // en Tonalá. Y el respaldo por cercanía no tenía límite de distancia, así que una
    // incidencia de Puerto Vallarta se enganchaba a la sección menos lejana del AMG.
    // ubicarEnSeccion trae el municipio de la propia sección y acota ese respaldo.
    if (!finalSectionId) {
      const ubicacion = await ubicarEnSeccion(lat, lng);
      if (ubicacion) {
        finalSectionId = ubicacion.seccion.id;
        detectedSectionMuni = ubicacion.seccion.municipality;
      }
    }

    // La sección manda sobre el municipio escrito: la llave de municipio de una incidencia sale de su
    // texto antes que de su sección (0022), así que un municipio distinto al de su sección la dejaba
    // contada en otro municipio, a la vista de otra administración. El texto solo decide cuando no hay
    // sección (un punto fuera de la cartografía), y solo si es un municipio real del catálogo: si no
    // se sabe, se guarda vacío —un hueco se ve y se corrige, un "Tonalá" inventado se queda—.
    const finalMunicipality = detectedSectionMuni ?? resolverMunicipio(municipality) ?? null;

    const resultado = await crearUnaSolaVez({
      clave: clientRequestId,
      indice: "event_reports_client_request_idx",
      buscar: async (clave: string) => {
        const [previa] = await getDatabaseClient().select().from(eventReports).where(eq(eventReports.clientRequestId, clave)).limit(1);
        return previa;
      },
      creadaPor: (fila) => fila.createdByUserId,
      quien: actor.actorId,
      crear: async () => {
        await withOutbox("event_report", id, "EventReportCreated.v1", { id, title, description, latitude, longitude, category, municipality: finalMunicipality, district, eventDate: parsedEventDate, sectionId: finalSectionId, assignedToUserId, assignedTeamId, mediaUrls: safeMediaUrls }, actor.actorId, async (tx) => {
          const [inserted] = await tx
            .insert(eventReports)
            .values({
              id,
              title: textos.valores.title!,
              description: textos.valores.description!,
              latitude: lat,
              longitude: lng,
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
              clientRequestId: clientRequestId || null,
            })
            .returning();
          newReport = inserted;
        });
        return newReport as typeof eventReports.$inferSelect;
      }
    });
    if (!resultado.ok) return NextResponse.json({ error: "Esta solicitud ya se usó.", code: "solicitud_repetida" }, { status: 409 });
    if (resultado.repetida) return NextResponse.json(resultado.fila, { status: 200 });

    return NextResponse.json(newReport, { status: 201 });
  } catch (error: any) {
    registrarError("Failed to create report", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
