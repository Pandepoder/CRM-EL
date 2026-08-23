"use server";

import { revalidatePath } from "next/cache";
import { schema } from "@tonala/shared/database";
const { teams, teamMembers } = schema;
import { actorFromSession } from "@/lib/api-helpers";
import { eq, and } from "drizzle-orm";
import { withOutbox } from "@/lib/outbox-helper";
import { randomUUID } from "crypto";

export async function createTeamAction(formData: FormData) {
  const actor = await actorFromSession();
  if (!actor || !actor.roles.includes("admin")) throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const leaderId = formData.get("leaderId") as string;
  const zone = formData.get("zone") as string;

  if (!name || !leaderId) throw new Error("Missing fields");

  const id = randomUUID();
  await withOutbox("team", id, "TeamCreated.v1", { name, leaderId, zone }, actor.actorId, async (tx) => {
    await tx.insert(teams).values({ id, name, leaderId, zone });
  });

  revalidatePath("/admin-equipos");
}

export async function deleteTeamAction(teamId: string) {
  const actor = await actorFromSession();
  if (!actor || !actor.roles.includes("admin")) throw new Error("Unauthorized");

  await withOutbox("team", teamId, "TeamDeleted.v1", { teamId }, actor.actorId, async (tx) => {
    await tx.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
    await tx.delete(teams).where(eq(teams.id, teamId));
  });

  revalidatePath("/admin-equipos");
}

export async function addMemberAction(formData: FormData) {
  const actor = await actorFromSession();
  if (!actor || !actor.roles.includes("admin")) throw new Error("Unauthorized");

  const teamId = formData.get("teamId") as string;
  const userId = formData.get("userId") as string;

  await withOutbox("team", teamId, "TeamMemberAdded.v1", { teamId, userId }, actor.actorId, async (tx) => {
    await tx.insert(teamMembers).values({ teamId, userId }).onConflictDoNothing();
  });

  revalidatePath("/admin-equipos");
}

export async function removeMemberAction(teamId: string, userId: string) {
  const actor = await actorFromSession();
  if (!actor || !actor.roles.includes("admin")) throw new Error("Unauthorized");

  await withOutbox("team", teamId, "TeamMemberRemoved.v1", { teamId, userId }, actor.actorId, async (tx) => {
    await tx.delete(teamMembers).where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
  });

  revalidatePath("/admin-equipos");
}
