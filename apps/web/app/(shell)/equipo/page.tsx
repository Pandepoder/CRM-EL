import { getServerSession } from "@/lib/session-server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema, decryptData } from "@tonala/shared/database";
import { eq, and, gte, lte, or } from "drizzle-orm";
import AgendaClient from "./AgendaClient";
import { requirePageRole } from "@/lib/authorization";

export interface LeaderStat {
  userId: string;
  displayName: string;
  email: string;
  roleKey: string;
  roleName: string;
  teamName: string;
  totalActivities: number;
  completedActivities: number;
  pendingActivities: number;
  visitasCount: number;
  platicasCount: number;
  eventosCount: number;
  brigadasCount: number;
  contactsCount: number;
  completionRate: number;
  latestActivityAt?: string | null;
}

export default async function EquipoMiDiaPage({
  searchParams
}: {
  searchParams: Promise<{ filter?: string; scope?: string; leaderId?: string; tab?: string }>;
}) {
  await requirePageRole("admin", "direction", "territorial_coordinator", "capturist", "visit_responsible");
  const session = await getServerSession();

  const resolvedParams = await searchParams;
  const filter = resolvedParams.filter || "hoy";
  const scope = resolvedParams.scope || "mis"; // "mis" | "equipo"
  const selectedLeaderId = resolvedParams.leaderId || "";
  
  const db = getDatabaseClient();
  const roleKey = session.roleKey || "";
  const isAdminOrCoordinator = ["admin", "direction", "territorial_coordinator"].includes(roleKey);

  // Date filters
  let dateFilter;
  let eventDateFilter;
  const now = new Date();
  
  if (filter === "hoy") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    dateFilter = and(gte(schema.visits.scheduledAt, start), lte(schema.visits.scheduledAt, end));
    eventDateFilter = and(gte(schema.eventReports.eventDate, start), lte(schema.eventReports.eventDate, end));
  } else if (filter === "semana") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    dateFilter = and(gte(schema.visits.scheduledAt, start), lte(schema.visits.scheduledAt, end));
    eventDateFilter = and(gte(schema.eventReports.eventDate, start), lte(schema.eventReports.eventDate, end));
  } else if (filter === "mes") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    dateFilter = and(gte(schema.visits.scheduledAt, start), lte(schema.visits.scheduledAt, end));
    eventDateFilter = and(gte(schema.eventReports.eventDate, start), lte(schema.eventReports.eventDate, end));
  } else {
    dateFilter = undefined;
    eventDateFilter = undefined;
  }

  // Determine user filter for queries
  let targetUserId: string | undefined = undefined;
  if (selectedLeaderId) {
    targetUserId = selectedLeaderId;
  } else if (scope === "mis") {
    targetUserId = session.userId;
  } else if (!isAdminOrCoordinator) {
    targetUserId = session.userId;
  }

  const visitUserCondition = targetUserId ? eq(schema.visits.assignedUserId, targetUserId) : undefined;
  const eventUserCondition = targetUserId 
    ? or(eq(schema.eventReports.assignedToUserId, targetUserId), eq(schema.eventReports.createdByUserId, targetUserId)) 
    : undefined;

  // 1. Fetch Visits
  const userVisits = await db
    .select({
      id: schema.visits.id,
      status: schema.visits.status,
      scheduledAt: schema.visits.scheduledAt,
      location: schema.visits.visitLocationText,
      contactName: schema.contacts.displayName,
      contactId: schema.contacts.id,
      assignedUserId: schema.visits.assignedUserId,
      assignedUserName: schema.userProfiles.displayName
    })
    .from(schema.visits)
    .innerJoin(schema.contacts, eq(schema.visits.contactId, schema.contacts.id))
    .leftJoin(schema.userProfiles, eq(schema.visits.assignedUserId, schema.userProfiles.id))
    .where(and(visitUserCondition, dateFilter));

  // 2. Fetch Event Reports / Tasks
  const userEvents = await db
    .select({
      id: schema.eventReports.id,
      status: schema.eventReports.status,
      scheduledAt: schema.eventReports.eventDate,
      title: schema.eventReports.title,
      description: schema.eventReports.description,
      category: schema.eventReports.category,
      municipality: schema.eventReports.municipality,
      sectionId: schema.electoralSections.id,
      sectionNum: schema.electoralSections.sectionNum,
      assignedToUserId: schema.eventReports.assignedToUserId,
      assignedUserName: schema.userProfiles.displayName
    })
    .from(schema.eventReports)
    .leftJoin(schema.electoralSections, eq(schema.eventReports.sectionId, schema.electoralSections.id))
    .leftJoin(schema.userProfiles, eq(schema.eventReports.assignedToUserId, schema.userProfiles.id))
    .where(and(eventUserCondition, eventDateFilter));

  const items = [
    ...userVisits.map(v => ({
      id: v.id,
      type: "visit" as const,
      status: v.status,
      scheduledAt: (v.scheduledAt instanceof Date ? v.scheduledAt : new Date(v.scheduledAt)).toISOString(),
      title: `🏠 Visita Domiciliaria: ${v.contactName}`,
      description: `Visita de seguimiento y vinculación territorial`,
      location: v.location || "Domicilio en campo",
      contactId: v.contactId,
      category: "visita",
      assignedUserId: v.assignedUserId || undefined,
      assignedUserName: v.assignedUserName || "Sin Asignar"
    })),
    ...userEvents.map(e => {
      let cat = e.category;
      if (e.title.toLowerCase().includes("plática") || e.title.toLowerCase().includes("platica") || e.title.includes("☕")) cat = "platica";
      else if (e.title.toLowerCase().includes("visita") || e.title.includes("🏠")) cat = "visita";
      else if (e.title.toLowerCase().includes("evento") || e.title.toLowerCase().includes("asamblea") || e.title.includes("🎤")) cat = "evento";
      else if (e.title.toLowerCase().includes("brigada") || e.title.includes("🚶‍♂️")) cat = "brigada";
      else if (e.title.toLowerCase().includes("perifoneo") || e.title.includes("📢")) cat = "perifoneo";

      return {
        id: e.id,
        type: "event" as const,
        status: e.status,
        scheduledAt: ((e.scheduledAt instanceof Date ? e.scheduledAt : new Date(e.scheduledAt || Date.now()))).toISOString(),
        title: e.title,
        description: e.description || "",
        location: e.sectionNum ? `Sección #${e.sectionNum} (${e.municipality || "Tonalá"})` : (e.municipality || "Tonalá"),
        category: cat,
        sectionId: e.sectionId || undefined,
        sectionNum: e.sectionNum || undefined,
        assignedUserId: e.assignedToUserId || undefined,
        assignedUserName: e.assignedUserName || "Sin Asignar"
      };
    })
  ].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  // 3. Load all active users with roles & teams
  const systemUsers = await db
    .select({
      id: schema.userProfiles.id,
      displayName: schema.userProfiles.displayName,
      email: schema.userProfiles.email,
      roleKey: schema.roles.key,
      roleName: schema.roles.name
    })
    .from(schema.userProfiles)
    .leftJoin(schema.roles, eq(schema.userProfiles.roleId, schema.roles.id))
    .where(eq(schema.userProfiles.status, "active"))
    .orderBy(schema.userProfiles.displayName);

  // 4. Load all operational activities and contacts across all users to compute leader stats
  const allEvents = await db
    .select({
      id: schema.eventReports.id,
      title: schema.eventReports.title,
      category: schema.eventReports.category,
      status: schema.eventReports.status,
      assignedToUserId: schema.eventReports.assignedToUserId,
      createdByUserId: schema.eventReports.createdByUserId,
      eventDate: schema.eventReports.eventDate
    })
    .from(schema.eventReports);

  const allVisits = await db
    .select({
      id: schema.visits.id,
      status: schema.visits.status,
      assignedUserId: schema.visits.assignedUserId,
      scheduledAt: schema.visits.scheduledAt
    })
    .from(schema.visits);

  const allContacts = await db
    .select({
      id: schema.contacts.id,
      createdByUserId: schema.contacts.createdByUserId
    })
    .from(schema.contacts)
    .where(eq(schema.contacts.status, "active"));

  const allTeams = await db
    .select({
      id: schema.teams.id,
      name: schema.teams.name,
      leaderId: schema.teams.leaderId
    })
    .from(schema.teams);

  // Compute LeaderStats for each user
  const leaderStats: LeaderStat[] = systemUsers.map(user => {
    const userTeam = allTeams.find(t => t.leaderId === user.id);
    const teamName = userTeam?.name || `Equipo de ${user.displayName.split(" ")[0]}`;

    // Filter events for this user
    const userEvts = allEvents.filter(e => e.assignedToUserId === user.id || e.createdByUserId === user.id);
    const userVsts = allVisits.filter(v => v.assignedUserId === user.id);
    const userConts = allContacts.filter(c => c.createdByUserId === user.id);

    let visitas = userVsts.length;
    let platicas = 0;
    let eventos = 0;
    let brigadas = 0;

    let completed = userVsts.filter(v => ["completed", "successful", "resolved"].includes(v.status || "")).length;

    userEvts.forEach(e => {
      const isComp = ["completed", "resolved", "dismissed"].includes(e.status || "");
      if (isComp) completed++;

      const t = (e.title || "").toLowerCase();
      if (t.includes("plática") || t.includes("platica") || t.includes("☕")) {
        platicas++;
      } else if (t.includes("visita") || t.includes("🏠") || e.category === "servicios") {
        visitas++;
      } else if (t.includes("evento") || t.includes("asamblea") || t.includes("mitin") || t.includes("🎤") || e.category === "mitin") {
        eventos++;
      } else {
        brigadas++;
      }
    });

    const total = userEvts.length + userVsts.length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Find latest activity timestamp
    let latestAt: Date | null = null;
    [...userEvts.map(e => e.eventDate), ...userVsts.map(v => v.scheduledAt)].forEach(d => {
      if (d) {
        const dt = new Date(d);
        if (!latestAt || dt > latestAt) latestAt = dt;
      }
    });

    return {
      userId: user.id,
      displayName: user.displayName,
      email: user.email,
      roleKey: user.roleKey || "capturist",
      roleName: user.roleName || "Operador Territorial",
      teamName,
      totalActivities: total,
      completedActivities: completed,
      pendingActivities: Math.max(0, total - completed),
      visitasCount: visitas,
      platicasCount: platicas,
      eventosCount: eventos,
      brigadasCount: brigadas,
      contactsCount: userConts.length,
      completionRate: rate,
      latestActivityAt: latestAt ? (latestAt as Date).toISOString() : null
    };
  }).sort((a, b) => (b.totalActivities + b.contactsCount) - (a.totalActivities + a.contactsCount));

  // 5. Electoral sections for selector
  const sections = await db
    .select({
      id: schema.electoralSections.id,
      sectionNum: schema.electoralSections.sectionNum
    })
    .from(schema.electoralSections)
    .orderBy(schema.electoralSections.sectionNum)
    .limit(100);

  // 6. Contacts for assignment
  const rawContacts = await db
    .select({
      id: schema.contacts.id,
      displayName: schema.contacts.displayName,
      phone: schema.contacts.phone,
      colony: schema.contacts.colony
    })
    .from(schema.contacts)
    .where(eq(schema.contacts.status, "active"))
    .orderBy(schema.contacts.displayName)
    .limit(100);

  const contacts = rawContacts.map(c => ({
    id: c.id,
    displayName: c.displayName,
    phone: decryptData(c.phone),
    colony: decryptData(c.colony)
  }));

  // 7. Rapid Activity Prospects
  const rawProspects = await db
    .select({
      id: schema.rapidActivityProspects.id,
      prospectName: schema.rapidActivityProspects.prospectName,
      organizationOrReference: schema.rapidActivityProspects.organizationOrReference,
      profileType: schema.rapidActivityProspects.profileType,
      disposition: schema.rapidActivityProspects.disposition,
      dispositionNotes: schema.rapidActivityProspects.dispositionNotes,
      activityDate: schema.rapidActivityProspects.activityDate,
      locationText: schema.rapidActivityProspects.locationText,
      commitments: schema.rapidActivityProspects.commitments,
      privateNotes: schema.rapidActivityProspects.privateNotes,
      convertedToContactId: schema.rapidActivityProspects.convertedToContactId,
      createdByUserId: schema.rapidActivityProspects.createdByUserId,
      createdByName: schema.userProfiles.displayName,
      createdAt: schema.rapidActivityProspects.createdAt
    })
    .from(schema.rapidActivityProspects)
    .leftJoin(schema.userProfiles, eq(schema.rapidActivityProspects.createdByUserId, schema.userProfiles.id))
    .orderBy(schema.rapidActivityProspects.activityDate);

  const serializedProspects = rawProspects.map(p => ({
    ...p,
    activityDate: p.activityDate ? p.activityDate.toISOString() : new Date().toISOString(),
    createdAt: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString()
  }));

  return (
    <AgendaClient
      items={items}
      filter={filter}
      scope={scope}
      selectedLeaderId={selectedLeaderId}
      canAssign={isAdminOrCoordinator}
      currentUserId={session.userId}
      currentUserRole={roleKey}
      systemUsers={systemUsers}
      leaderStats={leaderStats}
      sections={sections}
      contacts={contacts}
      initialProspects={serializedProspects}
    />
  );
}
