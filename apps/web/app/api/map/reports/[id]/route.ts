import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import {
  MOTIVO_ACTUALIZAR,
  MOTIVO_BORRAR,
  cargarContextoIncidencia,
  puedeSobreIncidencia
} from "@/lib/permisos-incidencias";
import { schema } from "@tonala/shared/database";
const { eventReports } = schema;
import { eq } from "drizzle-orm";
import { withOutbox } from "@/lib/outbox-helper";

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  // Esta ruta comprobaba solo el permiso de tablero, sin mirar de quién es la
  // incidencia: se saltaba entera la regla de /api/equipo/tareas/[id]. Ahora
  // ambas usan la misma (ver lib/permisos-incidencias).
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const id = params.id;

  try {
    const body = await request.json();

    const { incidencia, esAdmin, equipos } = await cargarContextoIncidencia(id, actor.actorId, actor.roles);
    if (!incidencia) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    if (!puedeSobreIncidencia("actualizar", incidencia, actor.actorId, esAdmin, equipos)) {
      return NextResponse.json({ error: MOTIVO_ACTUALIZAR }, { status: 403 });
    }

    // Reasignar es coordinar, y coordinar es cosa del líder. Un integrante puede
    // trabajar su incidencia y cerrarla, pero no pasársela a otra persona ni a
    // otra brigada.
    const reasigna = body.assignedToUserId !== undefined || body.assignedTeamId !== undefined;
    if (reasigna && !esAdmin) {
      const alcance = await resolveUserNetworkScope(actor.actorId);
      if (!alcance.isLeader) {
        return NextResponse.json(
          { error: "Solo el líder de la brigada o la administración pueden reasignar una incidencia." },
          { status: 403 }
        );
      }
    }
    const { status, title, description, category, municipality, district, sectionId, assignedToUserId, assignedTeamId, eventDate } = body;

    const updatePayload: Record<string, any> = {};

    if (status !== undefined) {
      if (!['active', 'in_progress', 'resolved', 'archived'].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updatePayload.status = status;
    }

    if (title !== undefined) updatePayload.title = title;
    if (description !== undefined) updatePayload.description = description;
    if (category !== undefined) updatePayload.category = category;
    if (municipality !== undefined) updatePayload.municipality = municipality;
    if (district !== undefined) updatePayload.district = district;
    if (sectionId !== undefined) updatePayload.sectionId = sectionId || null;
    if (assignedToUserId !== undefined) updatePayload.assignedToUserId = assignedToUserId || null;
    if (assignedTeamId !== undefined) updatePayload.assignedTeamId = assignedTeamId || null;
    if (eventDate !== undefined) updatePayload.eventDate = eventDate ? new Date(eventDate) : null;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

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
    console.error("Failed to update report", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const id = params.id;

  try {
    const { incidencia, esAdmin, equipos } = await cargarContextoIncidencia(id, actor.actorId, actor.roles);
    if (!incidencia) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    if (!puedeSobreIncidencia("borrar", incidencia, actor.actorId, esAdmin, equipos)) {
      return NextResponse.json({ error: MOTIVO_BORRAR }, { status: 403 });
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
    console.error("Failed to delete report", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
