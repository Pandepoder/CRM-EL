import { and, eq } from "drizzle-orm";

import { type ActorContext } from "@tonala/shared/auth";
import { schema } from "@tonala/shared/database";

import { getDatabaseClient } from "@/lib/db-client";

/**
 * Dar de baja a un ciudadano. Es la única forma de quitarlo del padrón que ofrece el sistema.
 *
 * Había dos caminos con efectos opuestos (D10). La API marcaba la ficha como inactiva y lo
 * auditaba; el botón del Directorio y del detalle de equipo la **borraba físicamente**, sin
 * auditoría, con una cascada a mano que cubría 5 de las 9 claves foráneas hacia `contacts`. Uno de
 * cada seis ciudadanos (549 de 3 385) no se podía borrar: la transacción chocaba con
 * `visit_results`. Y los demás desaparecían para siempre, con sus notas, visitas y encuestas.
 *
 * La baja conserva todo el historial: la ficha pasa a `inactive` y deja de contarse en el
 * directorio, el mapa y los tableros, que ya filtran por `status = 'active'`. Queda una fila en
 * `audit_logs` con quién y cuándo. Las visitas que seguían agendadas se cierran como rechazadas,
 * para que no queden en la agenda de nadie.
 *
 * Quién puede hacerlo lo decide quien llama (hoy, solo administración).
 *
 * @returns `false` si el ciudadano no existe; `true` si quedó dado de baja (también si ya lo estaba).
 */
export async function darDeBajaCiudadano(contactId: string, actor: ActorContext): Promise<boolean> {
  const db = getDatabaseClient();
  return db.transaction(async (tx) => {
    const desactivados = await tx
      .update(schema.contacts)
      .set({ status: "inactive" })
      .where(eq(schema.contacts.id, contactId))
      .returning({ id: schema.contacts.id });
    if (desactivados.length === 0) return false;

    await tx.insert(schema.auditLogs).values({
      actorUserId: actor.actorId,
      action: "contacts.deactivate",
      entityType: "contact",
      entityId: contactId,
      correlationId: actor.correlationId,
      beforeData: null,
      afterData: { status: "inactive" }
    });

    const agendadas = and(eq(schema.visits.contactId, contactId), eq(schema.visits.status, "scheduled"));
    const pendientes = await tx.select({ id: schema.visits.id }).from(schema.visits).where(agendadas);
    if (pendientes.length > 0) {
      await tx
        .update(schema.visits)
        .set({ status: "completed", completedAt: new Date(), completedByUserId: actor.actorId })
        .where(agendadas);
      await tx.insert(schema.visitResults).values(
        pendientes.map((v) => ({
          visitId: v.id,
          structuredOutcome: "rejected",
          summary: "Cancelada automáticamente: el ciudadano se dio de baja del padrón.",
          completedByUserId: actor.actorId,
          completedAt: new Date()
        }))
      );
    }
    return true;
  });
}
