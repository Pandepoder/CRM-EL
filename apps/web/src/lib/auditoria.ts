import { and, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { type ActorContext } from "@tonala/shared/auth";
import { schema } from "@tonala/shared/database";

import { getDatabaseClient } from "@/lib/db-client";
import { type UserNetworkScope } from "@/lib/network-hierarchy";

import { GRUPOS_DE_ACCIONES } from "./auditoria-acciones";

export { ACCIONES, GRUPOS_DE_ACCIONES } from "./auditoria-acciones";

/**
 * Auditoría (etapa 6): qué queda en `audit_logs` y cómo se consulta.
 *
 * El administrador maestro lo ve todo sin recorte, así que cada ficha que abre —de un ciudadano o de
 * una persona— deja constancia (§0 del plan): es lo que hace que ver todo no sea ver a escondidas.
 */
export async function registrarConsultaDelMaestro(
  actor: ActorContext,
  alcance: UserNetworkScope,
  entidad: "contact" | "user_profile",
  id: string
): Promise<void> {
  if (!alcance.isMaster) return;
  await getDatabaseClient().insert(schema.auditLogs).values({
    actorUserId: actor.actorId,
    action: "master.view",
    entityType: entidad,
    entityId: id,
    correlationId: actor.correlationId,
    beforeData: null,
    afterData: { consulta: entidad === "contact" ? "ficha de ciudadano" : "perfil de persona" }
  });
}

export const POR_PAGINA_DE_AUDITORIA = 50;

export async function consultarAuditoria(filtros: { grupo?: string | undefined; pagina: number }) {
  const db = getDatabaseClient();
  const a = schema.auditLogs;
  const quien = alias(schema.userProfiles, "quien");
  const persona = alias(schema.userProfiles, "persona");
  const ciudadano = alias(schema.contacts, "ciudadano");

  const grupo = GRUPOS_DE_ACCIONES.find((g) => g.clave === filtros.grupo);
  const condicion: SQL | undefined = grupo
    ? or(...grupo.prefijos.map((p) => (p.endsWith(".") ? like(a.action, `${p}%`) : eq(a.action, p))))
    : undefined;

  const [{ total } = { total: 0 }] = await db.select({ total: sql<number>`count(*)::int` }).from(a).where(condicion);
  const filas = await db
    .select({
      id: a.id,
      fecha: a.createdAt,
      accion: a.action,
      entidad: a.entityType,
      entidadId: a.entityId,
      antes: a.beforeData,
      despues: a.afterData,
      quienId: a.actorUserId,
      quien: quien.displayName,
      sobrePersona: persona.displayName,
      sobreCiudadano: ciudadano.displayName
    })
    .from(a)
    .leftJoin(quien, eq(quien.id, a.actorUserId))
    .leftJoin(persona, and(eq(a.entityType, "user_profile"), eq(persona.id, a.entityId)))
    .leftJoin(ciudadano, and(eq(a.entityType, "contact"), eq(ciudadano.id, a.entityId)))
    .where(condicion)
    .orderBy(desc(a.createdAt), desc(a.id))
    .limit(POR_PAGINA_DE_AUDITORIA)
    .offset((Math.max(1, filtros.pagina) - 1) * POR_PAGINA_DE_AUDITORIA);

  return { total, filas };
}
