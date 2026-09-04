import { headers } from "next/headers";
import { getServerSession } from "@/lib/session-server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema, decryptData } from "@tonala/shared/database";
import { redirect } from "next/navigation";
import { eq, inArray, or, and } from "drizzle-orm";
import TeamDetailClient from "./TeamDetailClient";
import { EnlaceBrigada, SolicitudesPendientes } from "./SolicitudesPendientes";
import { requirePageRole } from "@/lib/authorization";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageRole("admin", "direction", "territorial_coordinator");
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
      roleName: schema.roles.name,
      // Quien llegó por el QR queda apuntado al equipo con la cuenta en
      // `pending`: aparece como solicitud, no como integrante.
      status: schema.userProfiles.status,
      invitedByUserId: schema.userProfiles.invitedByUserId
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
      roleName: "Líder del Equipo",
      status: "active",
      invitedByUserId: null
    });
  }

  // Check authorization for non-admins
  const networkScope = await resolveUserNetworkScope(session.userId);
  const isGlobalAdmin = networkScope.isGlobal;
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

  // Las solicitudes se muestran aparte y arriba: son las únicas que piden una
  // decisión, y mezcladas con los integrantes pasaban desapercibidas.
  const nombresPorId = new Map(availableUsers.map(u => [u.id, u.displayName]));
  const solicitudes = members
    .filter(m => m.status === "pending")
    .map(m => ({
      userId: m.userId,
      displayName: m.displayName,
      invitadoPor: m.invitedByUserId ? nombresPorId.get(m.invitedByUserId) ?? null : null,
      joinedAt: m.joinedAt ? new Date(m.joinedAt).toISOString() : null
    }));

  const puedeGestionar = isGlobalAdmin || team.leaderId === session.userId;

  // El enlace del QR es el de quien está mirando: así lo que se registre queda a
  // su nombre, no al de un tercero.
  const yo = await db
    .select({ personalSlug: schema.userProfiles.personalSlug })
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.id, session.userId))
    .limit(1);
  const miSlug = yo[0]?.personalSlug ?? null;

  const cabeceras = await headers();
  const host = cabeceras.get("host") ?? "";
  const protocolo = cabeceras.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origen = host ? `${protocolo}://${host}` : "";

  return (
    <>
      {puedeGestionar ? (
        <div className="px-6 pt-6 max-w-7xl mx-auto">
          <SolicitudesPendientes teamId={id} solicitudes={solicitudes} />
          {miSlug ? <EnlaceBrigada slug={miSlug} equipo={team.name} origen={origen} /> : null}
        </div>
      ) : null}
    <TeamDetailClient
      team={team}
      members={serializedMembers}
      contacts={teamContacts}
      availableUsers={filteredUsers}
      canManage={puedeGestionar}
      currentUserId={session.userId}
    />
    </>
  );
}
