import { and, eq } from "drizzle-orm";

import type { ActorContext } from "@tonala/shared/auth";
import { schema } from "@tonala/shared/database";

import { getDatabaseClient } from "@/lib/db-client";
import { esMetaValida, META_MAXIMA, META_MINIMA } from "@/lib/logros";
import type { UserNetworkScope } from "@/lib/network-hierarchy";

/**
 * La meta del día que fija quien manda (0026; plan de experiencia sencilla §4, decisión 4).
 *
 * Quién puede ponerla: quien tiene a la persona bajo su mando (`commandUserIds`, la misma lista con que
 * se decide quién trabaja lo de quién), o administración en su alcance; el maestro, a cualquiera. Nadie
 * se la pone a sí mismo: para eso está su ritmo en «Mi día». Ver no basta: un líder que solo es
 * compañero de otro en la coordinación no le pone metas.
 */
export function puedeFijarMeta(alcance: UserNetworkScope, personaId: string): boolean {
  if (!personaId || personaId === alcance.userId) return false;
  if (alcance.commandUserIds === null) return alcance.isMaster;
  return alcance.commandUserIds.includes(personaId);
}

export type ResultadoDeMeta =
  | { ok: true; meta: number | null }
  | { ok: false; status: 400 | 403 | 404; error: string };

/** Pone (o quita, con `null`) la meta del día de una persona y deja constancia en `audit_logs`. */
export async function fijarMetaDelLider(
  actor: ActorContext,
  alcance: UserNetworkScope,
  personaId: string,
  meta: unknown
): Promise<ResultadoDeMeta> {
  if (meta !== null && !esMetaValida(meta)) {
    return { ok: false, status: 400, error: `La meta va de ${META_MINIMA} a ${META_MAXIMA} acciones al día, en número entero.` };
  }
  if (!puedeFijarMeta(alcance, personaId)) {
    return { ok: false, status: 403, error: "Solo quien coordina a esta persona puede ponerle meta." };
  }

  const db = getDatabaseClient();
  const [antes] = await db
    .select({ meta: schema.userProfiles.dailyGoal })
    .from(schema.userProfiles)
    .where(and(eq(schema.userProfiles.id, personaId), eq(schema.userProfiles.status, "active")))
    .limit(1);
  if (!antes) return { ok: false, status: 404, error: "Esa persona ya no está activa." };
  if (antes.meta === meta) return { ok: true, meta };

  await db.transaction(async (tx) => {
    await tx
      .update(schema.userProfiles)
      .set({
        dailyGoal: meta,
        dailyGoalSetByUserId: meta === null ? null : actor.actorId,
        dailyGoalSetAt: meta === null ? null : new Date(),
        updatedAt: new Date()
      })
      .where(eq(schema.userProfiles.id, personaId));
    await tx.insert(schema.auditLogs).values({
      actorUserId: actor.actorId,
      action: "user.daily_goal_set",
      entityType: "user_profile",
      entityId: personaId,
      correlationId: actor.correlationId,
      beforeData: { meta: antes.meta },
      afterData: { meta }
    });
  });
  return { ok: true, meta };
}
