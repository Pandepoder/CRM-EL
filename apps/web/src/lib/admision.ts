import { and, eq } from "drizzle-orm";

import { schema } from "@tonala/shared/database";

import { getDatabaseClient } from "@/lib/db-client";

/**
 * Admisión de cuentas nuevas: quien se registró o escaneó el QR de una brigada queda en `pending`
 * hasta que alguien lo acepta o lo rechaza.
 *
 * Había dos flujos con resultados opuestos (A3). Desde el detalle de equipo, rechazar marcaba la
 * cuenta como `rejected`; desde Control de Usuarios, **hacía `DELETE` de la fila**, y no solo de
 * cuentas pendientes: de cualquier id que le llegara. Con datos asociados chocaba contra una clave
 * foránea (500 opaco); sin ellos, la persona desaparecía sin dejar rastro. Aprobar tampoco miraba
 * el estado, así que servía para reactivar a alguien dado de baja por otro camino.
 *
 * Ahora hay un solo resultado para cada decisión, y ninguna borra nada:
 * - aceptar: `pending` → `active` (y el rol, si quien acepta lo elige);
 * - rechazar: `pending` → `rejected`, y fuera de los equipos. La cuenta no puede entrar, pero sigue
 *   ahí: si fue un error, administración la reactiva.
 *
 * Las dos actúan solo sobre cuentas en `pending`, en la misma sentencia que el cambio, así que dos
 * personas decidiendo la misma solicitud a la vez no se pisan: la segunda recibe `false`.
 * Quién puede decidir lo comprueba quien llama. Cada decisión deja su fila en `audit_logs`, en la
 * misma transacción (A5: la admisión no se auditaba).
 */

/** Quién decide: con esto se escribe la auditoría. */
export type QuienDecide = { actorId: string; correlationId: string };

export async function aceptarSolicitud(userId: string, quien: QuienDecide, opciones: { roleId?: string } = {}): Promise<boolean> {
  const db = getDatabaseClient();
  return db.transaction(async (tx) => {
    const activadas = await tx
      .update(schema.userProfiles)
      .set({ status: "active", ...(opciones.roleId ? { roleId: opciones.roleId } : {}), updatedAt: new Date() })
      .where(and(eq(schema.userProfiles.id, userId), eq(schema.userProfiles.status, "pending")))
      .returning({ id: schema.userProfiles.id });
    if (activadas.length === 0) return false;
    await tx.insert(schema.auditLogs).values({
      actorUserId: quien.actorId,
      action: "user.approve",
      entityType: "user_profile",
      entityId: userId,
      correlationId: quien.correlationId,
      beforeData: { estado: "pending" },
      afterData: { estado: "active", ...(opciones.roleId ? { roleId: opciones.roleId } : {}) }
    });
    return true;
  });
}

export async function rechazarSolicitud(userId: string, quien: QuienDecide): Promise<boolean> {
  const db = getDatabaseClient();
  return db.transaction(async (tx) => {
    const rechazadas = await tx
      .update(schema.userProfiles)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(and(eq(schema.userProfiles.id, userId), eq(schema.userProfiles.status, "pending")))
      .returning({ id: schema.userProfiles.id });
    if (rechazadas.length === 0) return false;
    // Una cuenta rechazada no cuenta como integrante de ninguna brigada.
    await tx.delete(schema.teamMembers).where(eq(schema.teamMembers.userId, userId));
    await tx.insert(schema.auditLogs).values({
      actorUserId: quien.actorId,
      action: "user.reject",
      entityType: "user_profile",
      entityId: userId,
      correlationId: quien.correlationId,
      beforeData: { estado: "pending" },
      afterData: { estado: "rejected" }
    });
    return true;
  });
}
