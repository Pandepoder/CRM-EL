"use server";

import { revalidatePath } from "next/cache";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { and, eq } from "drizzle-orm";
import { actorFromSession } from "@/lib/api-helpers";
import { esEstadoValido } from "@/lib/estados-incidencia";
import { incidentScopeCondition } from "@/lib/incident-visibility";
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
  // Aquí manda el alcance y no puedeSobreIncidencia (lib/permisos-incidencias): esa regla dice
  // quién *trabaja* una incidencia —su autor, quien la tiene asignada o su brigada— y dejaría a
  // dirección sin poder aceptar lo que levanta su cadena de mando, que es para lo que existe
  // esta pantalla.
  const alcance = await resolveUserNetworkScope(actor.actorId);

  const db = getDatabaseClient();
  try {
    const [actualizada] = await db
      .update(schema.eventReports)
      .set({ status: newStatus })
      .where(and(eq(schema.eventReports.id, reportId), incidentScopeCondition(alcance)))
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
