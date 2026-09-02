import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq, sql } from "drizzle-orm";
import ReportesClient from "./ReportesClient";
import { requirePageRole } from "@/lib/authorization";

export default async function ReportesPage() {
  await requirePageRole("admin", "territorial_coordinator", "visit_responsible");
  
  const db = getDatabaseClient();

  const sections = await db.select({
    id: schema.electoralSections.id,
    sectionNum: schema.electoralSections.sectionNum,
  }).from(schema.electoralSections);

  const users = await db.select({
    id: schema.userProfiles.id,
    displayName: schema.userProfiles.displayName,
    email: schema.userProfiles.email,
  }).from(schema.userProfiles).where(eq(schema.userProfiles.status, "active"));

  // El conteo de integrantes se muestra en el selector: asignar a un equipo
  // vacío deja la incidencia sin nadie que la atienda.
  const teams = await db.select({
    id: schema.teams.id,
    name: schema.teams.name,
    zone: schema.teams.zone,
    memberCount: sql<number>`(SELECT count(*)::int FROM team_members m WHERE m.team_id = ${schema.teams.id})`
  }).from(schema.teams).orderBy(schema.teams.name);

  return <ReportesClient sections={sections} users={users} teams={teams} />;
}
