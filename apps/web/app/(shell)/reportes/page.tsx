import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getServerSession } from "@/lib/session-server";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import ReportesClient from "./ReportesClient";
import { requirePageRole } from "@/lib/authorization";

export default async function ReportesPage() {
  // Esta pantalla levanta incidencias, y POST /api/map/reports solo se lo permite a
  // quien coordina. Al brigadista se le quitó de aquí y del menú: la pantalla le
  // prometía un alta que la API le negaba al guardar.
  await requirePageRole("admin", "direction", "territorial_coordinator");

  const db = getDatabaseClient();
  const session = await getServerSession();
  // Se asigna a gente y equipos del alcance. Antes cargaba a todas las personas activas, con su
  // correo, y todos los equipos del sistema.
  const alcance = await resolveUserNetworkScope(session.userId);

  const sections = await db.select({
    id: schema.electoralSections.id,
    sectionNum: schema.electoralSections.sectionNum,
  }).from(schema.electoralSections);

  const users = await db.select({
    id: schema.userProfiles.id,
    displayName: schema.userProfiles.displayName,
    email: schema.userProfiles.email,
  }).from(schema.userProfiles).where(and(
    eq(schema.userProfiles.status, "active"),
    alcance.isGlobal ? undefined : inArray(schema.userProfiles.id, alcance.teammateUserIds)
  ));

  // El conteo de integrantes se muestra en el selector: asignar a un equipo
  // vacío deja la incidencia sin nadie que la atienda.
  const teams = await db.select({
    id: schema.teams.id,
    name: schema.teams.name,
    zone: schema.teams.zone,
    memberCount: sql<number>`(SELECT count(*)::int FROM team_members m WHERE m.team_id = ${schema.teams.id})`
  }).from(schema.teams)
    .where(alcance.isGlobal ? undefined : inArray(schema.teams.id, alcance.teamIds))
    .orderBy(schema.teams.name);

  return <ReportesClient sections={sections} users={users} teams={teams} />;
}
