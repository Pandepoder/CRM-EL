"use server";

import { revalidatePath } from "next/cache";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { and, eq, isNull } from "drizzle-orm";
import { actorFromSession } from "@/lib/api-helpers";
import { ESTADOS_INCIDENCIA, esEstadoValido } from "@/lib/estados-incidencia";
import { incidenciasQuePuedeTrabajar } from "@/lib/incident-visibility";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";

export async function updateReportStatusAction(reportId: string, newStatus: string) {
  const actor = await actorFromSession();
  const isAllowed = actor && (actor.roles.includes("admin") || actor.roles.includes("direction") || actor.roles.includes("territorial_coordinator"));
  if (!actor || !isAllowed) {
    return { error: "No tienes permisos para modificar incidencias." };
  }

  // El estado llegaba del cliente y se escribía tal cual: cualquier cadena
  // acababa estrellándose contra la restricción de la base y saliendo como
  // "error de base de datos" sin decir qué pasó.
  if (!esEstadoValido(newStatus)) {
    return { error: `El estado "${newStatus}" no existe.` };
  }

  // El estado se cambiaba solo por identificador: el rol bastaba y nadie miraba de quién es la
  // incidencia, así que un coordinador que conociera el id cerraba la de otra dirección. El
  // alcance va dentro del WHERE para que no haya hueco entre comprobar y escribir.
  //
  // La regla de quién *trabaja* una incidencia (`incidenciasQuePuedeTrabajar`, la de
  // puedeSobreIncidencia en SQL): su autor, quien la tiene asignada, su equipo o quien manda sobre
  // ellos —así dirección acepta lo que levanta su cadena de mando, que es para lo que existe esta
  // pantalla—. Antes bastaba con verla, y quien solo es compañero de equipo (dos líderes de la misma
  // coordinación) le cambiaba el estado a lo del otro.
  const alcance = await resolveUserNetworkScope(actor.actorId);

  const db = getDatabaseClient();
  try {
    const [actualizada] = await db
      .update(schema.eventReports)
      // Cuándo y quién la cerró: ver la misma nota en `api/map/reports/[id]`.
      .set({
        status: newStatus,
        updatedAt: new Date(),
        closedAt: ESTADOS_INCIDENCIA[newStatus]?.cerrada ? new Date() : null,
        closedByUserId: ESTADOS_INCIDENCIA[newStatus]?.cerrada ? actor.actorId : null
      })
      // Solo incidencias: una actividad de la bitácora se cierra en la Agenda, con su resultado.
      .where(and(eq(schema.eventReports.id, reportId), isNull(schema.eventReports.activityTypeId), incidenciasQuePuedeTrabajar(alcance)))
      .returning({ id: schema.eventReports.id });

    if (!actualizada) {
      return {
        error: "Esa incidencia no está bajo tu mando: solo puede cambiarla quien la tiene a su cargo."
      };
    }

    revalidatePath("/admin-incidencias");
    revalidatePath("/historial-incidencias");
    revalidatePath("/mapa");
    return { success: true };
  } catch (_error: any) {
    return { error: "Error de base de datos al actualizar el estado." };
  }
}
