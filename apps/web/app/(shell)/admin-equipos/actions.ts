"use server";

import { revalidatePath } from "next/cache";
import { schema } from "@tonala/shared/database";
const { teams, teamMembers } = schema;
import { actorFromSession } from "@/lib/api-helpers";
import { getDatabaseClient } from "@/lib/db-client";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { eq, and } from "drizzle-orm";
import { withOutbox } from "@/lib/outbox-helper";
import { randomUUID } from "crypto";

type Actor = { actorId: string; roles: readonly string[] };

async function assertCanManageTeam(actor: Actor | null | undefined, teamId: string) {
  if (!actor) throw new Error("No autenticado");

  const scope = await resolveUserNetworkScope(actor.actorId);
  if (scope.isGlobal) return;

  const db = getDatabaseClient();
  const existing = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
  if (!existing || existing.leaderId !== actor.actorId) {
    throw new Error("No tienes permiso para administrar este equipo");
  }
}

export async function createTeamAction(formData: FormData) {
  const actor = await actorFromSession();
  if (!actor) throw new Error("No autenticado");

  const scope = await resolveUserNetworkScope(actor.actorId);
  if (!scope.isGlobal && !scope.isLeader) {
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
  await assertCanManageTeam(actor, teamId);

  await withOutbox("team", teamId, "TeamDeleted.v1", { teamId }, actor!.actorId, async (tx) => {
    await tx.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
    await tx.delete(teams).where(eq(teams.id, teamId));
  });

  revalidatePath("/admin-equipos");
}

export async function addMemberAction(formData: FormData) {
  const teamId = formData.get("teamId") as string;
  const actor = await actorFromSession();
  await assertCanManageTeam(actor, teamId);

  const userId = formData.get("userId") as string;

  await withOutbox("team", teamId, "TeamMemberAdded.v1", { teamId, userId }, actor!.actorId, async (tx) => {
    await tx.insert(teamMembers).values({ teamId, userId }).onConflictDoNothing();
  });

  revalidatePath("/admin-equipos");
}

export async function removeMemberAction(teamId: string, userId: string) {
  const actor = await actorFromSession();
  await assertCanManageTeam(actor, teamId);

  await withOutbox("team", teamId, "TeamMemberRemoved.v1", { teamId, userId }, actor!.actorId, async (tx) => {
    await tx.delete(teamMembers).where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
  });

  revalidatePath("/admin-equipos");
}
