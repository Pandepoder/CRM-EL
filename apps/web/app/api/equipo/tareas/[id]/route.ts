import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import {
  ESTADOS_INCIDENCIA,
  MOTIVO_ACTUALIZAR,
  MOTIVO_BORRAR,
  cargarContextoIncidencia,
  esEstadoValido,
  puedeSobreIncidencia,
  type EstadoIncidencia
} from "@/lib/permisos-incidencias";
import { eq } from "drizzle-orm";
import { safeErrorMessage } from "@/lib/safe-error";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const { id } = await params;
  try {
    const body = await req.json();
    const { status, summary } = body as { status?: string; summary?: string };

    // El estado llegaba del cliente sin validar y se escribía tal cual.
    if (status !== undefined && !esEstadoValido(status)) {
      return NextResponse.json(
        { error: `Estado no válido. Admitidos: ${ESTADOS_INCIDENCIA.join(", ")}.` },
        { status: 400 }
      );
    }

    const actorId = actor.actorId;
    const { incidencia, esAdmin, equipos } = await cargarContextoIncidencia(id, actorId, actor.roles);
    if (!incidencia) {
      return NextResponse.json({ error: "Incidencia no encontrada" }, { status: 404 });
    }
    if (!puedeSobreIncidencia("actualizar", incidencia, actorId, esAdmin, equipos)) {
      return NextResponse.json({ error: MOTIVO_ACTUALIZAR }, { status: 403 });
    }

    let newDescription: string | undefined = undefined;
    if (summary && summary.trim()) {
      const prevDesc = incidencia.description || "";
      newDescription = prevDesc.trim()
        ? `${prevDesc.trim()}\n\nConclusiones / Resultado: ${summary.trim()}`
        : summary.trim();
    }

    const db = getDatabaseClient();
    const [updated] = await db
      .update(schema.eventReports)
      .set({
        status: (status as EstadoIncidencia) || "resolved",
        ...(newDescription ? { description: newDescription } : {})
      })
      .where(eq(schema.eventReports.id, id))
      .returning();

    return NextResponse.json({ success: true, task: updated });
  } catch (error: unknown) {
    console.error("Error updating task status:", error);
    return NextResponse.json({ error: safeErrorMessage(error, "Error al actualizar tarea") }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const { id } = await params;
  try {
    const actorId = actor.actorId;
    const { incidencia, esAdmin, equipos } = await cargarContextoIncidencia(id, actorId, actor.roles);
    if (!incidencia) {
      return NextResponse.json({ error: "Incidencia no encontrada" }, { status: 404 });
    }
    if (!puedeSobreIncidencia("borrar", incidencia, actorId, esAdmin, equipos)) {
      return NextResponse.json({ error: MOTIVO_BORRAR }, { status: 403 });
    }

    const db = getDatabaseClient();
    await db.delete(schema.eventReports).where(eq(schema.eventReports.id, id));
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting task:", error);
    return NextResponse.json({ error: safeErrorMessage(error, "Error al eliminar tarea") }, { status: 500 });
  }
}
