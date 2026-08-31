"use server";

import { revalidatePath } from "next/cache";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq } from "drizzle-orm";
import { actorFromSession } from "@/lib/api-helpers";

export async function updateReportStatusAction(reportId: string, newStatus: string) {
  const actor = await actorFromSession();
  const isAllowed = actor && (actor.roles.includes("admin") || actor.roles.includes("direction") || actor.roles.includes("territorial_coordinator"));
  if (!actor || !isAllowed) {
    return { error: "No tienes permisos para modificar incidencias." };
  }

  const db = getDatabaseClient();
  try {
    await db
      .update(schema.eventReports)
      .set({ status: newStatus })
      .where(eq(schema.eventReports.id, reportId));
      
    revalidatePath("/admin-incidencias");
    revalidatePath("/mapa");
    return { success: true };
  } catch (_error: any) {
    return { error: "Error de base de datos al actualizar el estado." };
  }
}
