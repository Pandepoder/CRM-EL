import { NextResponse } from "next/server";

import { ESTADOS_INCIDENCIA, esEstadoValido } from "@/lib/estados-incidencia";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import {
  MOTIVO_ACTUALIZAR,
  MOTIVO_BORRAR,
  MOTIVO_ES_ACTIVIDAD,
  cargarContextoIncidencia,
  motivoAsignacionFueraDeAlcance,
  puedeSobreIncidencia
} from "@/lib/permisos-incidencias";
import { schema } from "@tonala/shared/database";
const { eventReports } = schema;
import { eq } from "drizzle-orm";
import { getDatabaseClient } from "@/lib/db-client";
import { withOutbox } from "@/lib/outbox-helper";
import { registrarError } from "@/lib/registro";
import { camposDeTextoDeIncidencia, territorioDeIncidencia } from "@/lib/campos-incidencia";

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  // Esta ruta comprobaba solo el permiso de tablero, sin mirar de quién es la
  // incidencia: se saltaba entera la regla de /api/equipo/tareas/[id]. Ahora
  // ambas usan la misma (ver lib/permisos-incidencias).
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const id = params.id;

  try {
    let body: Record<string, unknown>;
    try {
      const crudo: unknown = await request.json();
      if (!crudo || typeof crudo !== "object" || Array.isArray(crudo)) throw new Error("no es un objeto");
      body = crudo as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
    }

    const { incidencia, esAdmin, equipos, personas } = await cargarContextoIncidencia(id, actor.actorId);
    if (!incidencia) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    if (!puedeSobreIncidencia("actualizar", incidencia, actor.actorId, esAdmin, equipos, personas)) {
      return NextResponse.json({ error: MOTIVO_ACTUALIZAR }, { status: 403 });
    }
    if (incidencia.activityTypeId) {
      return NextResponse.json({ error: MOTIVO_ES_ACTIVIDAD, code: "es_actividad" }, { status: 409 });
    }

    // Reasignar es coordinar, y coordinar es cosa del líder. Un integrante puede
    // trabajar su incidencia y cerrarla, pero no pasársela a otra persona ni a
    // otra brigada.
    const reasigna = body.assignedToUserId !== undefined || body.assignedTeamId !== undefined;
    if (reasigna) {
      const alcance = await resolveUserNetworkScope(actor.actorId);
      if (!esAdmin && !alcance.isLeader) {
        return NextResponse.json(
          { error: "Solo el líder de la brigada o la administración pueden reasignar una incidencia." },
          { status: 403 }
        );
      }

      // Ser líder decía que puede reasignar, pero no hacia dónde: la incidencia salía del
      // alcance de quien la mandaba y ya no la volvía a ver. Vale también para un administrador
      // municipal, que no la manda a otro municipio (etapa 6); el maestro, a donde sea.
      const motivoDestino = motivoAsignacionFueraDeAlcance(alcance, {
        assignedToUserId: body.assignedToUserId,
        assignedTeamId: body.assignedTeamId
      });
      if (motivoDestino) {
        return NextResponse.json({ error: motivoDestino }, { status: 403 });
      }
    }
    const { status, district, assignedToUserId, assignedTeamId } = body;

    // Lo que llega igual a lo guardado no se vuelve a validar: la ventana de edición manda todos los
    // campos, y una incidencia antigua con un municipio escrito a mano no debe impedir cambiarle el
    // estado.
    const [guardada] = await getDatabaseClient()
      .select({
        title: eventReports.title,
        description: eventReports.description,
        category: eventReports.category,
        municipality: eventReports.municipality,
        sectionId: eventReports.sectionId
      })
      .from(eventReports)
      .where(eq(eventReports.id, id))
      .limit(1);
    if (!guardada) return NextResponse.json({ error: "Report not found" }, { status: 404 });
    const siCambia = (campo: "title" | "description" | "category" | "municipality" | "sectionId") => {
      const v = body[campo];
      const actual = guardada[campo] ?? "";
      return v === undefined || (v ?? "") === actual ? undefined : v;
    };

    const textos = camposDeTextoDeIncidencia(
      { title: siCambia("title"), description: siCambia("description"), category: siCambia("category"), eventDate: body.eventDate },
      false
    );
    if (!textos.ok) return NextResponse.json({ error: textos.error, campo: textos.campo }, { status: 400 });
    const territorio = await territorioDeIncidencia(
      { municipality: siCambia("municipality"), sectionId: siCambia("sectionId") },
      { municipality: guardada.municipality, sectionId: guardada.sectionId }
    );
    if (!territorio.ok) return NextResponse.json({ error: territorio.error, campo: territorio.campo }, { status: 400 });

    const updatePayload: Record<string, any> = { ...textos.valores, ...territorio.valores };

    if (status !== undefined) {
      // Esta lista estaba escrita a mano y se habia quedado sin 'pendiente' ni
      // 'rechazada', que la base si acepta: por aqui no se podia admitir ni
      // rechazar una incidencia. Es la duplicacion que el catalogo compartido
      // existe para evitar, y /api/equipo/tareas/[id] ya lo usaba.
      if (!esEstadoValido(status)) {
        return NextResponse.json({ error: `El estado "${typeof status === "string" ? status : ""}" no existe.` }, { status: 400 });
      }
      updatePayload.status = status;
      // Cuándo y quién la cerró: sin esto no había forma de saber cuándo se resolvió una
      // incidencia, y el mapa no podía mostrar solo las resueltas recientes.
      const cerrada = ESTADOS_INCIDENCIA[status]!.cerrada;
      updatePayload.closedAt = cerrada ? new Date() : null;
      updatePayload.closedByUserId = cerrada ? actor.actorId : null;
    }

    if (district !== undefined) {
      if (district !== null && (typeof district !== "string" || district.length > 60)) {
        return NextResponse.json({ error: "El distrito no es válido.", campo: "district" }, { status: 400 });
      }
      updatePayload.district = district || null;
    }
    if (assignedToUserId !== undefined) updatePayload.assignedToUserId = assignedToUserId || null;
    if (assignedTeamId !== undefined) updatePayload.assignedTeamId = assignedTeamId || null;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }
    updatePayload.updatedAt = new Date();

    let updatedReport: any = null;

    await withOutbox("event_report", id, "EventReportUpdated.v1", { id, ...updatePayload }, actor.actorId, async (tx) => {
      const [updated] = await tx
        .update(eventReports)
        .set(updatePayload)
        .where(eq(eventReports.id, id))
        .returning();
      updatedReport = updated;
    });

    if (!updatedReport) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json(updatedReport);
  } catch (error: any) {
    registrarError("Failed to update report", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const id = params.id;

  try {
    const { incidencia, esAdmin, equipos, personas } = await cargarContextoIncidencia(id, actor.actorId);
    if (!incidencia) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    if (!puedeSobreIncidencia("borrar", incidencia, actor.actorId, esAdmin, equipos, personas)) {
      return NextResponse.json({ error: MOTIVO_BORRAR }, { status: 403 });
    }
    if (incidencia.activityTypeId) {
      return NextResponse.json({ error: MOTIVO_ES_ACTIVIDAD, code: "es_actividad" }, { status: 409 });
    }

    let deletedReport: any = null;

    await withOutbox("event_report", id, "EventReportDeleted.v1", { id }, actor.actorId, async (tx) => {
      const [deleted] = await tx
        .delete(eventReports)
        .where(eq(eventReports.id, id))
        .returning();
      deletedReport = deleted;
    });

    if (!deletedReport) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Report deleted successfully",
      deletedReport
    });
  } catch (error: any) {
    registrarError("Failed to delete report", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
