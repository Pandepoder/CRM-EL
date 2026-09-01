import { getServerSession } from "@/lib/session-server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema, decryptData } from "@tonala/shared/database";
import { eq, or, desc } from "drizzle-orm";
import { requirePageRole } from "@/lib/authorization";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { notFound } from "next/navigation";
import LeaderProfileClient from "./LeaderProfileClient";

export default async function LeaderProfilePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageRole();
  const session = await getServerSession();
  const { id: targetUserId } = await params;

  const db = getDatabaseClient();

  // 1. Fetch user & role
  const userRows = await db
    .select({
      id: schema.userProfiles.id,
      displayName: schema.userProfiles.displayName,
      email: schema.userProfiles.email,
      status: schema.userProfiles.status,
      createdAt: schema.userProfiles.createdAt,
      roleKey: schema.roles.key,
      roleName: schema.roles.name
    })
    .from(schema.userProfiles)
    .leftJoin(schema.roles, eq(schema.userProfiles.roleId, schema.roles.id))
    .where(eq(schema.userProfiles.id, targetUserId))
    .limit(1);

  const targetUser = userRows[0];
  if (!targetUser) return notFound();

  // Only the user themself, a global admin, or someone within the same
  // brigade/network scope (leader <-> teammate) may view this profile —
  // otherwise contact PII and activity registered by the target user would
  // leak across unrelated brigades.
  if (session.userId !== targetUserId) {
    const viewerScope = await resolveUserNetworkScope(session.userId);
    const canView = viewerScope.isGlobal || viewerScope.teammateUserIds.includes(targetUserId);
    if (!canView) {
      return notFound();
    }
  }

  // 2. Fetch Team
  const teamRows = await db
    .select({
      id: schema.teams.id,
      name: schema.teams.name,
      zone: schema.teams.zone,
      municipality: schema.teams.municipality
    })
    .from(schema.teams)
    .where(eq(schema.teams.leaderId, targetUserId))
    .limit(1);

  const team = teamRows[0] || {
    id: targetUser.id,
    name: `Equipo de ${targetUser.displayName.split(" ")[0]}`,
    zone: "Tonalá Centro",
    municipality: "Tonalá"
  };

  // 3. Fetch Contacts Registered by this user
  const rawContacts = await db
    .select({
      id: schema.contacts.id,
      displayName: schema.contacts.displayName,
      firstName: schema.contacts.firstName,
      lastName: schema.contacts.lastName,
      phone: schema.contacts.phone,
      email: schema.contacts.email,
      address: schema.contacts.address,
      colony: schema.contacts.colony,
      municipality: schema.contacts.municipality,
      profession: schema.contacts.profession,
      companyOrWork: schema.contacts.companyOrWork,
      sectionId: schema.contacts.sectionId,
      sectionNum: schema.electoralSections.sectionNum,
      status: schema.contacts.status,
      createdAt: schema.contacts.createdAt
    })
    .from(schema.contacts)
    .leftJoin(schema.electoralSections, eq(schema.contacts.sectionId, schema.electoralSections.id))
    .where(or(eq(schema.contacts.createdByUserId, targetUserId), eq(schema.contacts.referredByUserId, targetUserId)))
    .orderBy(desc(schema.contacts.createdAt));

  const contacts = rawContacts.map(c => ({
    id: c.id,
    displayName: c.displayName,
    firstName: decryptData(c.firstName),
    lastName: decryptData(c.lastName),
    phone: decryptData(c.phone),
    email: decryptData(c.email),
    address: decryptData(c.address),
    colony: decryptData(c.colony),
    municipality: decryptData(c.municipality) || "Tonalá",
    profession: decryptData(c.profession),
    companyOrWork: decryptData(c.companyOrWork),
    sectionNum: c.sectionNum || undefined,
    status: c.status,
    createdAt: (c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt)).toISOString()
  }));

  // 4. Fetch Event Reports / Activities
  const rawEvents = await db
    .select({
      id: schema.eventReports.id,
      title: schema.eventReports.title,
      description: schema.eventReports.description,
      category: schema.eventReports.category,
      status: schema.eventReports.status,
      eventDate: schema.eventReports.eventDate,
      municipality: schema.eventReports.municipality,
      latitude: schema.eventReports.latitude,
      longitude: schema.eventReports.longitude,
      sectionNum: schema.electoralSections.sectionNum,
      createdAt: schema.eventReports.createdAt
    })
    .from(schema.eventReports)
    .leftJoin(schema.electoralSections, eq(schema.eventReports.sectionId, schema.electoralSections.id))
    .where(or(eq(schema.eventReports.assignedToUserId, targetUserId), eq(schema.eventReports.createdByUserId, targetUserId)))
    .orderBy(desc(schema.eventReports.eventDate));

  // 5. Fetch Visits
  const rawVisits = await db
    .select({
      id: schema.visits.id,
      status: schema.visits.status,
      scheduledAt: schema.visits.scheduledAt,
      location: schema.visits.visitLocationText,
      contactId: schema.contacts.id,
      contactName: schema.contacts.displayName,
      createdAt: schema.visits.createdAt
    })
    .from(schema.visits)
    .innerJoin(schema.contacts, eq(schema.visits.contactId, schema.contacts.id))
    .where(or(eq(schema.visits.assignedUserId, targetUserId), eq(schema.visits.createdByUserId, targetUserId)))
    .orderBy(desc(schema.visits.scheduledAt));

  const activities = [
    ...rawVisits.map(v => ({
      id: v.id,
      type: "visita",
      category: "visita",
      title: `Visita Domiciliaria: ${v.contactName}`,
      description: `Visita de seguimiento y vinculación en campo`,
      location: v.location || "Domicilio en campo",
      status: v.status,
      scheduledAt: (v.scheduledAt instanceof Date ? v.scheduledAt : new Date(v.scheduledAt)).toISOString(),
      createdAt: (v.createdAt instanceof Date ? v.createdAt : new Date(v.createdAt)).toISOString(),
      contactId: v.contactId
    })),
    ...rawEvents.map(e => {
      let cat = e.category;
      const t = (e.title || "").toLowerCase();
      if (t.includes("plática") || t.includes("platica")) cat = "platica";
      else if (t.includes("visita")) cat = "visita";
      else if (t.includes("evento") || t.includes("asamblea") || t.includes("mitin")) cat = "evento";
      else if (t.includes("brigada") || t.includes("volanteo")) cat = "brigada";
      else if (t.includes("perifoneo")) cat = "perifoneo";

      return {
        id: e.id,
        type: "event",
        category: cat,
        title: e.title,
        description: e.description || "",
        location: e.sectionNum ? `Sección #${e.sectionNum} (${e.municipality || "Tonalá"})` : (e.municipality || "Tonalá"),
        status: e.status,
        scheduledAt: (e.eventDate instanceof Date ? e.eventDate : new Date(e.eventDate || Date.now())).toISOString(),
        createdAt: (e.createdAt instanceof Date ? e.createdAt : new Date(e.createdAt)).toISOString(),
        latitude: e.latitude,
        longitude: e.longitude
      };
    })
  ].sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  // 6. Calculate Colonias and Sections presence
  const colonyCounts: Record<string, number> = {};
  const sectionCounts: Record<string, number> = {};

  contacts.forEach(c => {
    if (c.colony) {
      colonyCounts[c.colony] = (colonyCounts[c.colony] || 0) + 1;
    }
    if (c.sectionNum) {
      const secKey = `Secc. #${c.sectionNum}`;
      sectionCounts[secKey] = (sectionCounts[secKey] || 0) + 1;
    }
  });

  const topColonies = Object.entries(colonyCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const topSections = Object.entries(sectionCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return (
    <LeaderProfileClient
      user={{
        id: targetUser.id,
        displayName: targetUser.displayName,
        email: targetUser.email,
        status: targetUser.status,
        createdAt: (targetUser.createdAt instanceof Date ? targetUser.createdAt : new Date(targetUser.createdAt)).toISOString(),
        roleKey: targetUser.roleKey || "capturist",
        roleName: targetUser.roleName || "Operador Territorial"
      }}
      team={team}
      contacts={contacts}
      activities={activities}
      topColonies={topColonies}
      topSections={topSections}
      isCurrentUser={session.userId === targetUserId}
      currentUserId={session.userId}
      currentUserRole={session.roleKey || ""}
    />
  );
}
