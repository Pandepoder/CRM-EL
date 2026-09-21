import { NextResponse } from "next/server";
import { z } from "zod";
import { schema } from "@tonala/shared/database";
import { and, eq } from "drizzle-orm";

import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import {
  agregarNota,
  archivarActividad,
  cancelarActividad,
  completarActividad,
  crearSeguimiento,
  editarActividad,
  historialDeActividad,
  iniciarActividad,
  reprogramarActividad,
  type ResultadoAccion
} from "@/lib/actividades-servicio";
import { actividadPorId, crearContexto } from "@/lib/bitacora-consulta";
import { getDatabaseClient } from "@/lib/db-client";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import {
  MOTIVO_BORRAR,
  cargarContextoIncidencia,
  puedeSobreIncidencia
} from "@/lib/permisos-incidencias";
import { safeErrorMessage } from "@/lib/safe-error";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_ENCONTRADA = () => NextResponse.json({ error: "La actividad no existe.", code: "no_encontrada" }, { status: 404 });
const uuid = z.string().uuid();
const nullableUuid = uuid.nullish().or(z.literal("").transform(() => null));

const seguimiento = z.object({
  title: z.string().optional(),
  scheduledAt: z.string().min(1),
  assignedToUserId: nullableUuid
});

/**
 * Cada acción tiene su propia forma y su propio efecto; ninguna selección se ignora. Antes el
 * cliente mandaba siempre `status: "resolved"` y el resultado elegido se perdía.
 */
const cuerpoAccion = z.discriminatedUnion("accion", [
  z.object({ accion: z.literal("iniciar") }),
  z.object({
    accion: z.literal("completar"),
    outcome: z.string(),
    summary: z.string(),
    seguimiento: seguimiento.optional()
  }),
  z.object({ accion: z.literal("reprogramar"), scheduledAt: z.string().min(1), reason: z.string().optional() }),
  z.object({ accion: z.literal("cancelar"), reason: z.string() }),
  z.object({ accion: z.literal("seguimiento"), ...seguimiento.shape }),
  z.object({ accion: z.literal("archivar") }),
  z.object({ accion: z.literal("restaurar") }),
  z.object({ accion: z.literal("nota"), note: z.string() }),
  z.object({
    accion: z.literal("editar"),
    title: z.string().optional(),
    description: z.string().optional(),
    activityTypeId: uuid.optional(),
    tagIds: z.array(uuid).max(12).optional(),
    assignedToUserId: nullableUuid,
    locationText: z.string().max(240).optional(),
    estimatedAttendees: z.number().int().nullable().optional(),
    sectionId: nullableUuid,
    mediaUrls: z.array(z.unknown()).max(20).optional()
  })
]);

function responder(r: ResultadoAccion) {
  if (!r.ok) return NextResponse.json({ error: r.message, code: r.code }, { status: r.status });
  return NextResponse.json({ success: true, task: r.actividad, avisos: r.avisos, seguimiento: r.seguimiento });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();
  const { id } = await params;
  if (!UUID.test(id)) return NO_ENCONTRADA();

  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la petición no es JSON válido." }, { status: 400 });
  }
  const analizado = cuerpoAccion.safeParse(cuerpo);
  if (!analizado.success) {
    return NextResponse.json(
      { error: analizado.error.issues[0]?.message ?? "Acción o datos no válidos." },
      { status: 400 }
    );
  }
  const a = analizado.data;

  try {
    switch (a.accion) {
      case "iniciar":
        return responder(await iniciarActividad(actor, id));
      case "completar":
        return responder(await completarActividad(actor, id, { outcome: a.outcome, summary: a.summary, seguimiento: a.seguimiento }));
      case "reprogramar":
        return responder(await reprogramarActividad(actor, id, { scheduledAt: a.scheduledAt, reason: a.reason }));
      case "cancelar":
        return responder(await cancelarActividad(actor, id, a.reason));
      case "seguimiento": {
        const r = await crearSeguimiento(actor, id, a);
        if (!r.ok) return NextResponse.json({ error: r.message, code: r.code }, { status: r.status });
        return NextResponse.json({ success: true, task: r.actividad, avisos: r.avisos }, { status: 201 });
      }
      case "archivar":
        return responder(await archivarActividad(actor, id, true));
      case "restaurar":
        return responder(await archivarActividad(actor, id, false));
      case "nota":
        return responder(await agregarNota(actor, id, a.note));
      case "editar":
        return responder(await editarActividad(actor, id, a));
    }
  } catch (error: unknown) {
    console.error("Error updating task:", error);
    return NextResponse.json({ error: safeErrorMessage(error, "Error al actualizar la actividad") }, { status: 500 });
  }
}

/** Ficha completa: la actividad con su historial, etiquetas y seguimientos. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();
  const { id } = await params;
  if (!UUID.test(id)) return NO_ENCONTRADA();

  const contexto = crearContexto(await resolveUserNetworkScope(actor.actorId));
  const actividad = await actividadPorId(contexto, id);
  if (!actividad) return NextResponse.json({ error: "La actividad no existe.", code: "no_encontrada" }, { status: 404 });
  // Una visita suelta no tiene historial propio: solo se muestra tal cual.
  if (actividad.origen === "visita") return NextResponse.json({ actividad, historial: [], etiquetas: [], seguimientos: [] });

  const h = await historialDeActividad(actor, id);
  if (!h.ok) return NextResponse.json({ error: h.message, code: h.code }, { status: h.status });

  const db = getDatabaseClient();
  const etiquetas = await db
    .select({ id: schema.activityCatalogOptions.id, name: schema.activityCatalogOptions.name })
    .from(schema.activityTagLinks)
    .innerJoin(schema.activityCatalogOptions, eq(schema.activityTagLinks.optionId, schema.activityCatalogOptions.id))
    .where(eq(schema.activityTagLinks.eventReportId, id));
  const seguimientos = await db
    .select({ id: schema.eventReports.id, title: schema.eventReports.title, status: schema.eventReports.status, scheduledAt: schema.eventReports.eventDate })
    .from(schema.eventReports)
    .where(eq(schema.eventReports.followUpOfId, id));
  return NextResponse.json({ actividad, historial: h.historial, etiquetas, seguimientos });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const { id } = await params;
  if (!UUID.test(id)) return NO_ENCONTRADA();
  try {
    const actorId = actor.actorId;
    const { incidencia, esAdmin, equipos, personas } = await cargarContextoIncidencia(id, actorId, actor.roles);
    if (!incidencia) {
      return NextResponse.json({ error: "Incidencia no encontrada" }, { status: 404 });
    }
    if (!puedeSobreIncidencia("borrar", incidencia, actorId, esAdmin, equipos, personas)) {
      return NextResponse.json({ error: MOTIVO_BORRAR }, { status: 403 });
    }

    const db = getDatabaseClient();
    await db.transaction(async (tx) => {
      const [fila] = await tx
        .select({ visitId: schema.eventReports.visitId })
        .from(schema.eventReports)
        .where(eq(schema.eventReports.id, id));
      // El historial y las etiquetas se van en cascada; el seguimiento que apuntaba a esta
      // actividad se queda sin vínculo. La visita que agendó, si sigue pendiente, no tiene ya
      // motivo para existir: se retira junto con la actividad.
      await tx.delete(schema.eventReports).where(eq(schema.eventReports.id, id));
      if (fila?.visitId) {
        await tx.delete(schema.visits).where(and(eq(schema.visits.id, fila.visitId), eq(schema.visits.status, "scheduled")));
      }
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting task:", error);
    return NextResponse.json({ error: safeErrorMessage(error, "Error al eliminar la actividad") }, { status: 500 });
  }
}
