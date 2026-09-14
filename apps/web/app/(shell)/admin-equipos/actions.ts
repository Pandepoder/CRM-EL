"use server";

import { revalidatePath } from "next/cache";
import { schema } from "@tonala/shared/database";
const { teams, teamMembers } = schema;
import { actorFromSession } from "@/lib/api-helpers";
import { getDatabaseClient } from "@/lib/db-client";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { eq, and, or } from "drizzle-orm";
import { withOutbox } from "@/lib/outbox-helper";
import { randomUUID } from "crypto";

type Actor = { actorId: string; roles: readonly string[] };

/** Crear, editar o borrar un equipo: solo administración. */
async function assertIsAdmin(actor: Actor | null | undefined) {
  if (!actor) throw new Error("No autenticado");
  const scope = await resolveUserNetworkScope(actor.actorId);
  if (!scope.isGlobal) throw new Error("Solo administración puede crear, editar o borrar equipos");
  return scope;
}

/**
 * Integrantes y solicitudes del QR: administración o el líder de ESE equipo.
 *
 * Al pasar la gestión de equipos a "solo administración", las solicitudes de quien entra por el
 * QR de una brigada quedaban esperando a un admin y el líder no podía admitir a su propia gente.
 * El líder recupera eso para su equipo, y nada más: no toca equipos ajenos.
 */
async function assertCanManageMembers(actor: Actor | null | undefined, teamId: string) {
  if (!actor) throw new Error("No autenticado");
  const scope = await resolveUserNetworkScope(actor.actorId);
  if (scope.isGlobal) return { scope, esAdmin: true };

  const db = getDatabaseClient();
  const equipo = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
  if (!equipo || equipo.leaderId !== actor.actorId) {
    throw new Error("Solo administración o el líder de este equipo pueden gestionar sus integrantes");
  }
  return { scope, esAdmin: false };
}

export async function createTeamAction(formData: FormData) {
  const actor = await actorFromSession();
  if (!actor) throw new Error("No autenticado");

  const scope = await resolveUserNetworkScope(actor.actorId);
  if (!scope.isGlobal) {
    throw new Error("No tienes permiso para crear equipos");
  }

  const name = formData.get("name") as string;
  // Non-global users can only create a team led by themselves.
  const leaderId = scope.isGlobal ? (formData.get("leaderId") as string) : actor.actorId;
  const zone = formData.get("zone") as string;

  if (!name || !leaderId) throw new Error("Nombre y Líder son requeridos");

  const id = randomUUID();
  await withOutbox("team", id, "TeamCreated.v1", { name, leaderId, zone }, actor.actorId, async (tx) => {
    await tx.insert(teams).values({ id, name, leaderId, zone });
  });

  revalidatePath("/admin-equipos");
}

export async function deleteTeamAction(teamId: string) {
  const actor = await actorFromSession();
  await assertIsAdmin(actor);

  await withOutbox("team", teamId, "TeamDeleted.v1", { teamId }, actor!.actorId, async (tx) => {
    await tx.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
    await tx.delete(teams).where(eq(teams.id, teamId));
  });

  revalidatePath("/admin-equipos");
}

export async function addMemberAction(formData: FormData) {
  const teamId = formData.get("teamId") as string;
  const actor = await actorFromSession();
  const { esAdmin } = await assertCanManageMembers(actor, teamId);

  const userId = formData.get("userId") as string;
  if (!userId) throw new Error("Falta la persona a agregar");

  // Un líder solo suma a gente que él mismo trajo (invitada o bajo su enlace) y que ya está
  // activa. Así no puede recorrer el padrón de usuarios ni meter a su equipo a alguien de otra
  // estructura, ni saltarse la aprobación de una cuenta pendiente.
  if (!esAdmin) {
    const db = getDatabaseClient();
    const persona = await db.query.userProfiles.findFirst({
      where: and(
        eq(schema.userProfiles.id, userId),
        eq(schema.userProfiles.status, "active"),
        or(eq(schema.userProfiles.invitedByUserId, actor!.actorId), eq(schema.userProfiles.parentEnlaceId, actor!.actorId))
      )
    });
    if (!persona) throw new Error("Solo puedes agregar a personas activas que tú invitaste");
  }

  await withOutbox("team", teamId, "TeamMemberAdded.v1", { teamId, userId }, actor!.actorId, async (tx) => {
    await tx.insert(teamMembers).values({ teamId, userId }).onConflictDoNothing();
  });

  revalidatePath("/admin-equipos");
}

export async function removeMemberAction(teamId: string, userId: string) {
  const actor = await actorFromSession();
  await assertCanManageMembers(actor, teamId);

  await withOutbox("team", teamId, "TeamMemberRemoved.v1", { teamId, userId }, actor!.actorId, async (tx) => {
    await tx.delete(teamMembers).where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
  });

  revalidatePath("/admin-equipos");
}

/**
 * Admisión de quien llegó por el QR de la brigada.
 *
 * Quien escanea queda apuntado al equipo desde el primer momento, pero con la
 * cuenta en `pending`: no puede entrar. Es deliberado, porque un enlace acaba
 * reenviado en cualquier grupo de WhatsApp y sin este paso bastaría tenerlo para
 * estar dentro de la estructura.
 *
 * Aceptar activa la cuenta —ya está en el equipo, nadie tiene que acordarse de
 * añadirla—. Rechazar la saca del equipo y deja la cuenta marcada, sin borrar a
 * la persona: si fue un error, un administrador puede revisarlo.
 */
export async function aceptarSolicitudAction(teamId: string, userId: string) {
  const actor = await actorFromSession();
  try {
    await assertCanManageMembers(actor, teamId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sin permiso" };
  }

  const db = getDatabaseClient();
  const pertenece = await db.query.teamMembers.findFirst({
    where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId))
  });
  if (!pertenece) return { error: "Esa persona no está en este equipo." };

  // Solo se activa a quien está esperando. Sin esta condición, aceptar reactivaba a cualquier
  // integrante, incluido alguien que administración había dado de baja.
  const activadas = await db
    .update(schema.userProfiles)
    .set({ status: "active" })
    .where(and(eq(schema.userProfiles.id, userId), eq(schema.userProfiles.status, "pending")))
    .returning({ id: schema.userProfiles.id });
  if (activadas.length === 0) return { error: "Esa solicitud ya no está pendiente." };

  revalidatePath(`/admin-equipos/${teamId}`);
  revalidatePath("/admin-equipos");
  return { success: true };
}

export async function rechazarSolicitudAction(teamId: string, userId: string) {
  const actor = await actorFromSession();
  try {
    await assertCanManageMembers(actor, teamId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sin permiso" };
  }

  const db = getDatabaseClient();
  const persona = await db.query.userProfiles.findFirst({
    where: eq(schema.userProfiles.id, userId)
  });
  // Solo se rechaza a quien está esperando: una cuenta ya activa no se desactiva
  // por aquí sin querer.
  if (!persona || persona.status !== "pending") {
    return { error: "Esa solicitud ya no está pendiente." };
  }

  await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
  await db
    .update(schema.userProfiles)
    .set({ status: "rejected" })
    .where(eq(schema.userProfiles.id, userId));

  revalidatePath(`/admin-equipos/${teamId}`);
  revalidatePath("/admin-equipos");
  return { success: true };
}
