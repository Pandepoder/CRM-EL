import { getServerSession } from "@/lib/session-server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { redirect } from "next/navigation";
import { eq, notInArray } from "drizzle-orm";
import TeamDetailClient from "./TeamDetailClient";

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session.isLoggedIn || session.roleKey !== "admin") {
    redirect("/login");
  }

  const { id } = await params;
  const db = getDatabaseClient();

  // Fetch team
  const teams = await db
    .select({
      id: schema.teams.id,
      name: schema.teams.name,
      zone: schema.teams.zone,
      leaderId: schema.teams.leaderId,
      leaderName: schema.userProfiles.displayName
    })
    .from(schema.teams)
    .leftJoin(schema.userProfiles, eq(schema.teams.leaderId, schema.userProfiles.id))
    .where(eq(schema.teams.id, id));

  const team = teams[0];
  if (!team) {
    redirect("/admin-equipos");
  }

  // Fetch members
  const members = await db
    .select({
      userId: schema.teamMembers.userId,
      joinedAt: schema.teamMembers.joinedAt,
      displayName: schema.userProfiles.displayName,
      roleName: schema.roles.name
    })
    .from(schema.teamMembers)
    .innerJoin(schema.userProfiles, eq(schema.teamMembers.userId, schema.userProfiles.id))
    .leftJoin(schema.roles, eq(schema.userProfiles.roleId, schema.roles.id))
    .where(eq(schema.teamMembers.teamId, id));

  // If leader is not explicitly in team_members, we could optionally push them. 
  // Let's ensure leader is displayed as a member.
  const isLeaderInMembers = members.some(m => m.userId === team.leaderId);
  if (!isLeaderInMembers && team.leaderName) {
    // We'll fake the leader entry for display purposes if not in team_members
    // but typically they should be in team_members too.
    members.unshift({
      userId: team.leaderId,
      joinedAt: new Date(),
      displayName: team.leaderName,
      roleName: "Líder Asignado"
    });
  }

  // Available users (not already in team)
  const memberUserIds = members.map(m => m.userId);
  const availableUsersQuery = db
    .select({
      id: schema.userProfiles.id,
      displayName: schema.userProfiles.displayName
    })
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.status, "active"));

  const availableUsers = await availableUsersQuery;
  const filteredUsers = availableUsers.filter(u => !memberUserIds.includes(u.id));

  return <TeamDetailClient team={team} members={members} availableUsers={filteredUsers} />;
}
