import { getServerSession } from "@/lib/session-server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq, sql } from "drizzle-orm";
import TeamsClient from "./TeamsClient";
import { requirePageRole } from "@/lib/authorization";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";

export default async function AdminEquiposPage() {
  await requirePageRole("admin", "direction", "territorial_coordinator");
  const session = await getServerSession();
  const db = getDatabaseClient();
  
  const networkScope = await resolveUserNetworkScope(session.userId);
  const isGlobalAdmin = networkScope.isGlobal;
  const allowedTeammateIds = networkScope.teammateUserIds;

  // 1. Fetch eligible leaders / users
  const allUsers = await db
    .select({
      id: schema.userProfiles.id,
      displayName: schema.userProfiles.displayName,
      roleKey: schema.roles.key
    })
    .from(schema.userProfiles)
    .leftJoin(schema.roles, eq(schema.userProfiles.roleId, schema.roles.id))
    .where(eq(schema.userProfiles.status, "active"))
    .orderBy(schema.userProfiles.displayName);

  const users = isGlobalAdmin
    ? allUsers
    : allUsers.filter(u => allowedTeammateIds.includes(u.id));

  // 2. Fetch existing real teams
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
    .leftJoin(schema.userProfiles, eq(schema.teams.leaderId, schema.userProfiles.id))
    .orderBy(schema.teams.name);

  // 3. Fetch all team members
  const allTeamMembers = await db
    .select({
      teamId: schema.teamMembers.teamId,
      userId: schema.teamMembers.userId
    })
    .from(schema.teamMembers);

  // Filter teams visible to user
  const visibleTeams = isGlobalAdmin
    ? existingTeams
    : existingTeams.filter(t => t.leaderId === session.userId || allTeamMembers.some(m => m.teamId === t.id && m.userId === session.userId));

  // 4. Fetch count of registered contacts per user to aggregate by team
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
    if (c.userId) {
      contactCountMap.set(c.userId, Number(c.count));
    }
  });

  // Calculate stats for each team
  const teamsData = visibleTeams.map(team => {
    const teamMembersList = allTeamMembers.filter(m => m.teamId === team.id);
    const memberIds = Array.from(new Set([team.leaderId, ...teamMembersList.map(m => m.userId)].filter(Boolean)));
    
    let totalContacts = 0;
    memberIds.forEach(mId => {
      totalContacts += (contactCountMap.get(mId) || 0);
    });

    const isMyTeam = team.leaderId === session.userId || teamMembersList.some(m => m.userId === session.userId);

    return {
      id: team.id,
      name: team.name,
      zone: team.zone,
      leaderId: team.leaderId,
      leaderName: team.leaderName,
      municipality: team.municipality,
      section: team.section,
      membersCount: memberIds.length,
      contactsCount: totalContacts,
      isMyTeam
    };
  });

  return <TeamsClient teams={teamsData} users={users} isGlobalAdmin={isGlobalAdmin} currentUserId={session.userId} />;
}
