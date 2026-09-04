"use server";

import { revalidatePath } from "next/cache";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq } from "drizzle-orm";
import { actorFromSession } from "@/lib/api-helpers";
import { esEstadoValido } from "@/lib/estados-incidencia";

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

  const db = getDatabaseClient();
  try {
    await db
      .update(schema.eventReports)
      .set({ status: newStatus })
      .where(eq(schema.eventReports.id, reportId));

    revalidatePath("/admin-incidencias");
    revalidatePath("/historial-incidencias");
    revalidatePath("/mapa");
    return { success: true };
  } catch (_error: any) {
    return { error: "Error de base de datos al actualizar el estado." };
  }
}
