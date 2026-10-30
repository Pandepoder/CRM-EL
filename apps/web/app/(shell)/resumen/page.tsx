import { kpisDelResumen, restriccionesDelResumen } from "@/lib/resumen-kpis";
import { getServerSession } from "@/lib/session-server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq, desc } from "drizzle-orm";
import ResumenClient from "./ResumenClient";
import { requirePageAccess } from "@/lib/authorization";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { tableroDelResumen } from "@/lib/resumen-tablero";
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

  // Quien no es el maestro ve solo a su gente (ver `tableroDelResumen`): si no, esta pantalla sería un
  // tablero de todo el sistema que pone a competir a coordinaciones que no tienen nada que ver.
  const networkScope = await resolveUserNetworkScope(session.userId);

  // Los números de cabecera y las condiciones de alcance salen de `resumen-kpis.ts`, la misma fuente
  // que `/api/resumen` (M4). El tablero de abajo usa esas mismas condiciones.
  const restricciones = await restriccionesDelResumen(networkScope);
  const { contactos: contactRestriction } = restricciones;
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

  // 4. Tablero «Rendimiento»: las personas del alcance de quien mira, con su semana contra su propia meta.
  const leaderboard = await tableroDelResumen(networkScope, restricciones);

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
