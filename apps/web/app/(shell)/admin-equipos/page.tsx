import { getServerSession } from "@/lib/session-server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq, sql } from "drizzle-orm";
import TeamsClient from "./TeamsClient";
import { requirePageRole } from "@/lib/authorization";

export default async function AdminEquiposPage() {
  await requirePageRole("admin", "direction", "territorial_coordinator", "visit_responsible", "capturist");
  const session = await getServerSession();
  const db = getDatabaseClient();
  
  const isGlobalAdmin = ["admin", "direction", "territorial_coordinator"].includes(session.roleKey);

  // 1. Fetch all active users
  const users = await db
    .select({
      id: schema.userProfiles.id,
      displayName: schema.userProfiles.displayName,
      roleKey: schema.roles.key
    })
    .from(schema.userProfiles)
    .leftJoin(schema.roles, eq(schema.userProfiles.roleId, schema.roles.id))
    .where(eq(schema.userProfiles.status, "active"))
    .orderBy(schema.userProfiles.displayName);

  // 2. Fetch existing teams
  const existingTeams = await db
    .select({
      id: schema.teams.id,
      name: schema.teams.name,
      zone: schema.teams.zone,
      leaderId: schema.teams.leaderId,
      municipality: schema.teams.municipality,
      section: schema.teams.section,
      leaderName: schema.userProfiles.displayName
    })
    .from(schema.teams)
    .leftJoin(schema.userProfiles, eq(schema.teams.leaderId, schema.userProfiles.id));

  // 3. Auto-provision team for each user if they don't have one
  const existingLeaderIds = new Set(existingTeams.map(t => t.leaderId));
  for (const u of users) {
    if (!existingLeaderIds.has(u.id)) {
      try {
        const [newTeam] = await db
          .insert(schema.teams)
          .values({
            name: `Equipo ${u.displayName}`,
            leaderId: u.id,
            zone: "Tonalá",
            municipality: "Tonalá"
          })
          .returning({
            id: schema.teams.id,
            name: schema.teams.name,
            zone: schema.teams.zone,
            leaderId: schema.teams.leaderId,
            municipality: schema.teams.municipality,
            section: schema.teams.section
          });

        if (newTeam) {
          existingTeams.push({
            ...newTeam,
            leaderName: u.displayName
          });
        }
      } catch (err) {
        console.error("Auto-provision team error for user", u.id, err);
      }
    }
  }

  // 4. Fetch all team members
  const allTeamMembers = await db
    .select({
      teamId: schema.teamMembers.teamId,
      userId: schema.teamMembers.userId
    })
    .from(schema.teamMembers);

  // 5. Fetch count of registered contacts per user to aggregate by team
  const contactCounts = await db
    .select({
      userId: schema.contacts.createdByUserId,
      count: sql<number>`count(*)::int`
    })
    .from(schema.contacts)
    .where(eq(schema.contacts.status, "active"))
    .groupBy(schema.contacts.createdByUserId);

  const contactCountMap = new Map<string, number>();
  contactCounts.forEach(c => {
    if (c.userId) contactCountMap.set(c.userId, Number(c.count) || 0);
  });

  // Calculate stats for each team
  const teamsWithStats = existingTeams.map(t => {
    const members = allTeamMembers.filter(m => m.teamId === t.id);
    const memberIds = new Set([t.leaderId, ...members.map(m => m.userId)].filter(Boolean));
    
    let totalContacts = 0;
    memberIds.forEach(uId => {
      if (uId) totalContacts += (contactCountMap.get(uId) || 0);
    });

    return {
      ...t,
      membersCount: memberIds.size,
      contactsCount: totalContacts,
      isMyTeam: t.leaderId === session.userId || members.some(m => m.userId === session.userId)
    };
  });

  // Filter for non-admin users
  const visibleTeams = isGlobalAdmin
    ? teamsWithStats
    : teamsWithStats.filter(t => t.isMyTeam);

  return (
    <TeamsClient
      teams={visibleTeams}
      users={users}
      isGlobalAdmin={isGlobalAdmin}
      currentUserId={session.userId}
    />
  );
}
