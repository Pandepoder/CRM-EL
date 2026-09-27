import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { requireActorRoles } from "@/lib/authorization";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
const { eventReports } = schema;
import { eq, and, isNull } from "drizzle-orm";
import { registrarError } from "@/lib/registro";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { incidentScopeCondition } from "@/lib/incident-visibility";

export async function POST(request: Request) {
  // Archivar de golpe las resueltas no comprueba propiedad ni equipo una por una, así que queda
  // reservado a administración. Dirección coordina sus brigadas desde la ficha de cada incidencia,
  // donde sí se comprueba a quién pertenece.
  const actor = await requireActorRoles("admin");
  if (actor instanceof NextResponse) return actor;

  const db = getDatabaseClient();
  // Administración, pero sobre lo que ve (etapa 6): un administrador municipal no archiva las
  // incidencias de otro municipio. Las que no ve no cuentan.
  const alcance = await resolveUserNetworkScope(actor.actorId);
  const enSuAlcance = incidentScopeCondition(alcance);

  try {
    const body = await request.json();
    const { action, municipality } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    // Solo incidencias: las actividades de la bitácora comparten la tabla y tienen su propio cierre.
    const soloIncidencias = and(isNull(eventReports.activityTypeId), enSuAlcance);

    // «Purgar» las resueltas: pasan al historial como archivadas.
    //
    // Antes las BORRABA de verdad, y no solo las incidencias: `status = 'resolved'` también es una
    // actividad cerrada de la bitácora, con su historial y sus etiquetas en cascada. En la base local
    // habría borrado 130 incidencias y 30 actividades, sin vuelta atrás y sin dejar rastro. Archivar
    // saca del mapa y de la bandeja lo ya atendido, que es lo que se buscaba, sin perder nada.
    if (action === "purge_resolved") {
      const condiciones = [eq(eventReports.status, "resolved"), soloIncidencias];
      if (municipality && municipality !== "all") condiciones.push(eq(eventReports.municipality, municipality));

      const archivadas = await db.transaction(async (tx) => {
        const filas = await tx
          .update(eventReports)
          .set({ status: "archived", updatedAt: new Date() })
          .where(and(...condiciones))
          .returning({ id: eventReports.id });
        if (filas.length > 0) {
          await tx.insert(schema.auditLogs).values(filas.map((f) => ({
            actorUserId: actor.actorId,
            action: "incidents.archive_resolved",
            entityType: "event_report",
            entityId: f.id,
            correlationId: actor.correlationId,
            beforeData: { status: "resolved" },
            afterData: { status: "archived", municipio: municipality || "all" }
          })));
        }
        return filas;
      });

      return NextResponse.json({
        success: true,
        message: `${archivadas.length} incidencias resueltas pasaron al historial como archivadas`,
        count: archivadas.length
      });
    }

    // Resolver, reabrir, borrar y reasignar en bloque ya no existen: ninguna pantalla las usaba, ninguna
    // dejaba rastro en la auditoría ni en el outbox, y «borrar» eliminaba incidencias para siempre. Cada
    // incidencia se trabaja desde su ficha, donde sí se comprueba y se registra todo.
    return NextResponse.json({ error: "Esa acción no existe." }, { status: 400 });
  } catch (error: any) {
    registrarError("Bulk incident action failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
