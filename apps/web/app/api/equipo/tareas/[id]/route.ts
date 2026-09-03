import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { eq } from "drizzle-orm";
import { safeErrorMessage } from "@/lib/safe-error";

/** Estados admitidos por la restricción `event_reports_status_check`. */
const ESTADOS = ["active", "in_progress", "resolved", "archived"] as const;
type Estado = (typeof ESTADOS)[number];

type Incidencia = {
  createdByUserId: string;
  assignedToUserId: string | null;
  assignedTeamId: string | null;
  description: string;
};

/**
 * Quién puede tocar una incidencia.
 *
 * Antes ninguna de las dos operaciones comprobaba nada más allá de tener sesión
 * abierta: cualquier usuario autenticado podía cambiar el estado o borrar
 * definitivamente cualquier incidencia del sistema con solo conocer su id.
 * Comprobado en pruebas: un capturista sin un solo registro a su nombre resolvió
 * y después borró una incidencia creada por el administrador.
 *
 * Se puede *actualizar* si es tuya, si te la asignaron, si está asignada a un
 * equipo del que formas parte, o si eres administración. Trabajar la incidencia
 * es justamente lo que se espera de la brigada asignada.
 *
 * *Borrar* es más estrecho: solo quien la creó y administración. Resolver una
 * incidencia es trabajo de campo; eliminarla del historial no lo es.
 */
function puede(
  accion: "actualizar" | "borrar",
  incidencia: Incidencia,
  actorId: string,
  esAdmin: boolean,
  equiposDelActor: string[]
): boolean {
  if (esAdmin) return true;
  if (incidencia.createdByUserId === actorId) return true;
  if (accion === "borrar") return false;
  if (incidencia.assignedToUserId === actorId) return true;
  return Boolean(incidencia.assignedTeamId && equiposDelActor.includes(incidencia.assignedTeamId));
}

async function cargarContexto(id: string, actorId: string, roles: readonly string[]) {
  const db = getDatabaseClient();
  const filas = await db
    .select({
      createdByUserId: schema.eventReports.createdByUserId,
      assignedToUserId: schema.eventReports.assignedToUserId,
      assignedTeamId: schema.eventReports.assignedTeamId,
      description: schema.eventReports.description
    })
    .from(schema.eventReports)
    .where(eq(schema.eventReports.id, id))
    .limit(1);

  const incidencia = filas[0];
  if (!incidencia) return { db, incidencia: null, esAdmin: false, equipos: [] as string[] };

  // Solo administración pasa por encima de la propiedad y del equipo. Dirección
  // trabaja las incidencias de los equipos que le asignaron, como cualquier líder.
  const esAdmin = roles.includes("admin");
  const equipos = esAdmin ? [] : (await resolveUserNetworkScope(actorId)).teamIds;
  return { db, incidencia, esAdmin, equipos };
}

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
    if (status !== undefined && !ESTADOS.includes(status as Estado)) {
      return NextResponse.json(
        { error: `Estado no válido. Admitidos: ${ESTADOS.join(", ")}.` },
        { status: 400 }
      );
    }

    const actorId = actor.actorId as string;
    const { db, incidencia, esAdmin, equipos } = await cargarContexto(id, actorId, actor.roles);
    if (!incidencia) {
      return NextResponse.json({ error: "Incidencia no encontrada" }, { status: 404 });
    }
    if (!puede("actualizar", incidencia, actorId, esAdmin, equipos)) {
      return NextResponse.json(
        { error: "No puedes modificar una incidencia que no es tuya ni está asignada a ti o a tu equipo." },
        { status: 403 }
      );
    }

    let newDescription: string | undefined = undefined;
    if (summary && summary.trim()) {
      const prevDesc = incidencia.description || "";
      newDescription = prevDesc.trim()
        ? `${prevDesc.trim()}\n\nConclusiones / Resultado: ${summary.trim()}`
        : summary.trim();
    }

    const [updated] = await db
      .update(schema.eventReports)
      .set({
        status: (status as Estado) || "resolved",
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
    const actorId = actor.actorId as string;
    const { db, incidencia, esAdmin, equipos } = await cargarContexto(id, actorId, actor.roles);
    if (!incidencia) {
      return NextResponse.json({ error: "Incidencia no encontrada" }, { status: 404 });
    }
    if (!puede("borrar", incidencia, actorId, esAdmin, equipos)) {
      return NextResponse.json(
        { error: "Solo quien creó la incidencia o la administración pueden eliminarla." },
        { status: 403 }
      );
    }

    await db.delete(schema.eventReports).where(eq(schema.eventReports.id, id));
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting task:", error);
    return NextResponse.json({ error: safeErrorMessage(error, "Error al eliminar tarea") }, { status: 500 });
  }
}
