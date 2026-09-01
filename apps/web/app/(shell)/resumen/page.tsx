import { getServerSession } from "@/lib/session-server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq, count, gte, desc, and, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import ResumenClient from "./ResumenClient";
import { requirePageRole } from "@/lib/authorization";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";

export default async function ResumenPage() {
  await requirePageRole("admin", "direction", "territorial_coordinator");
  const session = await getServerSession();
  if (!session.isLoggedIn || !session.userId) redirect("/login");

  const db = getDatabaseClient();

  // 1. Current user
  const userRows = await db
    .select({
      id: schema.userProfiles.id,
      displayName: schema.userProfiles.displayName,
      accessType: schema.userProfiles.accessType,
      personalSlug: schema.userProfiles.personalSlug,
      roleKey: schema.roles.key
    })
    .from(schema.userProfiles)
    .leftJoin(schema.roles, eq(schema.userProfiles.roleId, schema.roles.id))
    .where(eq(schema.userProfiles.id, session.userId))
    .limit(1);

  const currentUser = userRows[0] || {
    id: session.userId,
    displayName: session.displayName || "Usuario",
    accessType: "conexion",
    personalSlug: null
  };

  // Non-global users (líderes/coordinadores) must only see their own brigade's
  // performance data here — otherwise this page becomes a cross-team leaderboard
  // that fuels comparison/rivalry between unrelated coordinators.
  const networkScope = await resolveUserNetworkScope(session.userId);
  const scopedUserIds = networkScope.isGlobal ? null : networkScope.teammateUserIds;

  // Start of today for daily pulse
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 2. Global & Today KPIs
  const [contactsCountRow] = await db
    .select({ count: count() })
    .from(schema.contacts)
    .where(eq(schema.contacts.status, "active"));

  const [todayContactsRow] = await db
    .select({ count: count() })
    .from(schema.contacts)
    .where(gte(schema.contacts.createdAt, startOfDay));

  const [panContactsCountRow] = await db
    .select({ count: count() })
    .from(schema.contacts)
    .where(eq(schema.contacts.panMilitancy, "confirmada"));

  const [visitsCountRow] = await db
    .select({ count: count() })
    .from(schema.visits);

  const [todayVisitsRow] = await db
    .select({ count: count() })
    .from(schema.visits)
    .where(gte(schema.visits.createdAt, startOfDay));

  const [eventsCountRow] = await db
    .select({ count: count() })
    .from(schema.eventReports);

  const [socialListeningCountRow] = await db
    .select({ count: count() })
    .from(schema.socialListening);

  const totalActivities = (visitsCountRow?.count || 0) + (eventsCountRow?.count || 0);
  const todayActivities = (todayVisitsRow?.count || 0);

  // 3. Recent registrations feed (last 6)
  const recentContactsRows = await db
    .select({
      id: schema.contacts.id,
      displayName: schema.contacts.displayName,
      firstName: schema.contacts.firstName,
      lastName: schema.contacts.lastName,
      colony: schema.contacts.colony,
      municipality: schema.contacts.municipality,
      sectionNum: schema.electoralSections.sectionNum,
      panMilitancy: schema.contacts.panMilitancy,
      createdAt: schema.contacts.createdAt
    })
    .from(schema.contacts)
    .leftJoin(schema.electoralSections, eq(schema.contacts.sectionId, schema.electoralSections.id))
    .where(
      scopedUserIds
        ? and(eq(schema.contacts.status, "active"), inArray(schema.contacts.createdByUserId, scopedUserIds))
        : eq(schema.contacts.status, "active")
    )
    .orderBy(desc(schema.contacts.createdAt))
    .limit(6);

  const recentContacts = recentContactsRows.map(r => ({
    id: r.id,
    firstName: r.firstName || r.displayName || "Contacto",
    lastName: r.lastName || "",
    colony: r.colony || null,
    municipality: r.municipality || null,
    sectionNum: r.sectionNum ?? null,
    panMilitancy: r.panMilitancy || null,
    createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString()
  }));

  // 4. User performance leaderboard — scoped to the viewer's own brigade
  // unless they are a global admin/direction.
  let allUsersQuery = db
    .select({
      userId: schema.userProfiles.id,
      displayName: schema.userProfiles.displayName,
      email: schema.userProfiles.email,
      accessType: schema.userProfiles.accessType,
      parentEnlaceId: schema.userProfiles.parentEnlaceId,
      personalSlug: schema.userProfiles.personalSlug
    })
    .from(schema.userProfiles)
    .$dynamic();

  if (scopedUserIds) {
    allUsersQuery = allUsersQuery.where(inArray(schema.userProfiles.id, scopedUserIds));
  }

  const allUsers = await allUsersQuery;

  const userContacts = await db
    .select({
      createdByUserId: schema.contacts.createdByUserId,
      panMilitancy: schema.contacts.panMilitancy,
      colony: schema.contacts.colony
    })
    .from(schema.contacts)
    .where(eq(schema.contacts.status, "active"));

  const userVisits = await db
    .select({
      assignedUserId: schema.visits.assignedUserId,
      status: schema.visits.status
    })
    .from(schema.visits);

  const userEvents = await db
    .select({
      assignedToUserId: schema.eventReports.assignedToUserId
    })
    .from(schema.eventReports);

  const leaderboard = allUsers.map(u => {
    const parent = allUsers.find(p => p.userId === u.parentEnlaceId);
    const uContacts = userContacts.filter(c => c.createdByUserId === u.userId);
    const panCount = uContacts.filter(c => c.panMilitancy === "confirmada").length;
    const uVisits = userVisits.filter(v => v.assignedUserId === u.userId);
    const uEvents = userEvents.filter(e => e.assignedToUserId === u.userId);
    const totalActs = uVisits.length + uEvents.length;
    const completedActs = uVisits.filter(v => v.status === "completed").length;
    const rate = totalActs > 0 ? Math.round((completedActs / totalActs) * 100) : 100;

    const isEligibleForPromotion = u.accessType === "conexion" && (uContacts.length >= 5 || totalActs >= 3);

    return {
      userId: u.userId,
      displayName: u.displayName,
      email: u.email,
      accessType: u.accessType || "conexion",
      parentEnlaceName: parent?.displayName || null,
      personalSlug: u.personalSlug || null,
      contactsCount: uContacts.length,
      panContactsCount: panCount,
      activitiesCount: totalActs,
      completionRate: rate,
      isEligibleForPromotion
    };
  }).sort((a, b) => (b.contactsCount + b.activitiesCount) - (a.contactsCount + a.activitiesCount));

  return (
    <ResumenClient
      currentUser={{
        id: currentUser.id,
        displayName: currentUser.displayName,
        accessType: currentUser.accessType || "conexion",
        personalSlug: currentUser.personalSlug || null
      }}
      kpis={{
        totalContacts: contactsCountRow?.count || 0,
        todayContacts: todayContactsRow?.count || 0,
        panConfirmedContacts: panContactsCountRow?.count || 0,
        totalActivities,
        todayActivities,
        totalSocialListening: socialListeningCountRow?.count || 0
      }}
      recentContacts={recentContacts}
      leaderboard={leaderboard}
    />
  );
}
