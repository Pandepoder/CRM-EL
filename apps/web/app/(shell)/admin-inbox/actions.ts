"use server";

import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { actorFromSession } from "@/lib/api-helpers";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";

/** Los mismos que deja entrar el layout de /admin-inbox: la guarda pedía solo administración. */
const ROLES_BANDEJA = ["admin", "direction", "territorial_coordinator"];

export async function markAsProcessedAction(messageId: string) {
  const actor = await actorFromSession();
  if (!actor || !ROLES_BANDEJA.some((rol) => actor.roles.includes(rol))) {
    return { error: "No tienes permiso para procesar mensajes de la bandeja." };
  }

  try {
    const db = getDatabaseClient();

    // El mensaje se marcaba por identificador y nada más: quien conociera el id cerraba la
    // conversación de otra dirección. La conversación es de quien la tiene asignada, así que el
    // alcance se mide sobre esa persona.
    const filas = await db
      .select({ asignadaA: schema.inboxConversations.assignedToUserId })
      .from(schema.inboxMessages)
      .innerJoin(
        schema.inboxConversations,
        eq(schema.inboxMessages.conversationId, schema.inboxConversations.id)
      )
      .where(eq(schema.inboxMessages.id, messageId))
      .limit(1);

    const conversacion = filas[0];
    if (!conversacion) {
      return { error: "Ese mensaje ya no existe." };
    }

    const alcance = await resolveUserNetworkScope(actor.actorId);
    const asignadaA = conversacion.asignadaA;
    const enAlcance =
      alcance.isGlobal ||
      (asignadaA !== null && (alcance.allowedUserIds ?? []).includes(asignadaA));
    if (!enAlcance) {
      return {
        error: "Esa conversación no está a tu cargo. Pídeselo a quien la tiene asignada."
      };
    }

    await db.update(schema.inboxMessages)
      .set({ status: 'read' })
      .where(eq(schema.inboxMessages.id, messageId));

    revalidatePath("/admin-inbox");
    return { success: true };
  } catch (error) {
    console.error("markAsProcessedAction failed:", error);
    return { error: "No se pudo marcar el mensaje como procesado." };
  }
}
