import { kpisDelResumen, restriccionesDelResumen } from "@/lib/resumen-kpis";
import { getServerSession } from "@/lib/session-server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq, desc, and, inArray } from "drizzle-orm";
import ResumenClient from "./ResumenClient";
import { requirePageAccess } from "@/lib/authorization";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { asegurarEnlacePersonal } from "@/lib/personal-slug";

export default async function ResumenPage() {
  await requirePageAccess("/resumen");
  const session = await getServerSession();

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
  // El maestro ve a todas; un administrador municipal, a las personas activas de su municipio (etapa 6).
  const scopedUserIds = networkScope.isMaster ? null : networkScope.teammateUserIds;

  // Los números de cabecera y las condiciones de alcance salen de `resumen-kpis.ts`, la misma fuente
  // que `/api/resumen` (M4). El tablero de abajo usa esas mismas condiciones.
  const restricciones = await restriccionesDelResumen(networkScope);
  const { contactos: contactRestriction, visitas: visitRestriction, incidencias: eventRestriction } = restricciones;
  const kpis = await kpisDelResumen(networkScope, { restricciones });

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
    .where(contactRestriction)
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

  // El resto de las pantallas solo lista cuentas activas; aquí faltaba, así que el tablero
  // seguía nombrando a gente dada de baja.
  allUsersQuery = allUsersQuery.where(
    and(
      eq(schema.userProfiles.status, "active"),
      scopedUserIds ? inArray(schema.userProfiles.id, scopedUserIds) : undefined
    )
  );

  const allUsers = await allUsersQuery;

  const userContacts = await db
    .select({
      createdByUserId: schema.contacts.createdByUserId,
      panMilitancy: schema.contacts.panMilitancy
    })
    .from(schema.contacts)
    .where(contactRestriction);

  const userVisits = await db
    .select({
      assignedUserId: schema.visits.assignedUserId,
      status: schema.visits.status
    })
    .from(schema.visits).where(visitRestriction);

  const userEvents = await db
    .select({
      assignedToUserId: schema.eventReports.assignedToUserId
    })
    .from(schema.eventReports).where(eventRestriction);

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
      canManageSensitive={networkScope.isAdmin}
      currentUser={{
        id: currentUser.id,
        displayName: currentUser.displayName,
        accessType: currentUser.accessType || "conexion",
        personalSlug: await asegurarEnlacePersonal(currentUser.id, currentUser.displayName, currentUser.personalSlug)
      }}
      kpis={kpis}
      recentContacts={recentContacts}
      leaderboard={leaderboard}
    />
  );
}
