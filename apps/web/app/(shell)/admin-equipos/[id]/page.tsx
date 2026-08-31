import { getServerSession } from "@/lib/session-server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema, decryptData } from "@tonala/shared/database";
import { redirect } from "next/navigation";
import { eq, inArray, or, and } from "drizzle-orm";
import TeamDetailClient from "./TeamDetailClient";
import { requirePageRole } from "@/lib/authorization";

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageRole("admin", "direction", "territorial_coordinator", "visit_responsible", "capturist");
  const session = await getServerSession();

  const { id } = await params;
  const db = getDatabaseClient();

  // 1. Fetch team
  const teams = await db
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
    .where(eq(schema.teams.id, id));

  const team = teams[0];
  if (!team) {
    redirect("/admin-equipos");
  }

  // 2. Fetch members
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

  // Ensure leader is displayed as a member
  const isLeaderInMembers = members.some(m => m.userId === team.leaderId);
  if (!isLeaderInMembers && team.leaderName) {
    members.unshift({
      userId: team.leaderId,
      joinedAt: new Date().toISOString() as any,
      displayName: team.leaderName,
      roleName: "Líder del Equipo"
    });
  }

  // Check authorization for non-admins
  const isGlobalAdmin = ["admin", "direction", "territorial_coordinator"].includes(session.roleKey);
  const isLeaderOrMember = team.leaderId === session.userId || members.some(m => m.userId === session.userId);
  if (!isGlobalAdmin && !isLeaderOrMember) {
    redirect("/admin-equipos");
  }

  // 3. Fetch ALL contacts / citizens registered by this team (leader + members)
  const teamMemberIds = Array.from(new Set([team.leaderId, ...members.map(m => m.userId)].filter(Boolean)));
  
  let rawContacts: any[] = [];
  if (teamMemberIds.length > 0) {
    rawContacts = await db
      .select({
        id: schema.contacts.id,
        displayName: schema.contacts.displayName,
        phone: schema.contacts.phone,
        colony: schema.contacts.colony,
        municipality: schema.contacts.municipality,
        sectionNum: schema.electoralSections.sectionNum,
        status: schema.contacts.status,
        createdAt: schema.contacts.createdAt,
        createdByUserId: schema.contacts.createdByUserId,
        createdByName: schema.userProfiles.displayName
      })
      .from(schema.contacts)
      .leftJoin(schema.electoralSections, eq(schema.contacts.sectionId, schema.electoralSections.id))
      .leftJoin(schema.userProfiles, eq(schema.contacts.createdByUserId, schema.userProfiles.id))
      .where(
        and(
          eq(schema.contacts.status, "active"),
          or(
            inArray(schema.contacts.createdByUserId, teamMemberIds),
            inArray(schema.contacts.referredByUserId, teamMemberIds)
          )
        )
      )
      .orderBy(schema.contacts.createdAt);
  }

  const teamContacts = rawContacts.map(c => ({
    id: c.id,
    displayName: c.displayName,
    phone: decryptData(c.phone),
    colony: decryptData(c.colony),
    municipality: decryptData(c.municipality),
    sectionNum: c.sectionNum,
    status: c.status,
    createdAt: (c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt)).toISOString(),
    createdByName: c.createdByName || "Integrante del Equipo",
    createdByUserId: c.createdByUserId || null
  }));

  const serializedMembers = members.map(m => ({
    ...m,
    joinedAt: (m.joinedAt instanceof Date ? m.joinedAt : new Date(m.joinedAt)).toISOString()
  }));

  // 4. Available users (not already in team)
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

  return (
    <TeamDetailClient
      team={team}
      members={serializedMembers}
      contacts={teamContacts}
      availableUsers={filteredUsers}
      canManage={isGlobalAdmin || team.leaderId === session.userId}
      currentUserId={session.userId}
    />
  );
}
