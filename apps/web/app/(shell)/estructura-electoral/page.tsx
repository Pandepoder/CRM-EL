import { getServerSession } from "@/lib/session-server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { and, eq, inArray } from "drizzle-orm";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import EstructuraClient from "./EstructuraClient";

import { requirePageRole } from "@/lib/authorization";

export default async function EstructuraPage() {
  await requirePageRole("admin", "direction", "territorial_coordinator");
  const session = await getServerSession();

  const db = getDatabaseClient();
  // Dirección y coordinación ven y asignan a gente de sus equipos. Antes esta pantalla listaba a
  // todas las personas activas y a todos los representantes del sistema.
  const alcance = await resolveUserNetworkScope(session.userId);
  const personasDelAlcance = alcance.isGlobal ? undefined : inArray(schema.userProfiles.id, alcance.teammateUserIds);

  // Try to query electoralRepresentatives if the table exists (graceful degradation)
  let representatives: any[] = [];
  try {
    representatives = await db
      .select({
        id: schema.electoralRepresentatives.id,
        sectionNum: schema.electoralSections.sectionNum,
        sectionId: schema.electoralSections.id,
        displayName: schema.userProfiles.displayName,
        role: schema.electoralRepresentatives.role,
        assignedAt: schema.electoralRepresentatives.assignedAt
      })
      .from(schema.electoralRepresentatives)
      .innerJoin(schema.electoralSections, eq(schema.electoralRepresentatives.sectionId, schema.electoralSections.id))
      .innerJoin(schema.userProfiles, eq(schema.electoralRepresentatives.userId, schema.userProfiles.id))
      .where(personasDelAlcance);
  } catch (_err) {
    console.warn("Table electoral_representatives not found yet, returning empty list");
    representatives = [];
  }

  const users = await db.select({
    id: schema.userProfiles.id,
    displayName: schema.userProfiles.displayName
  }).from(schema.userProfiles).where(and(eq(schema.userProfiles.status, "active"), personasDelAlcance));

  let sections: any[] = [];
  try {
    sections = await db.select({
      id: schema.electoralSections.id,
      sectionNum: schema.electoralSections.sectionNum,
      // Sin esto el combo rotulaba "Tonalá" al 100% de las secciones.
      municipality: schema.electoralSections.municipality
    }).from(schema.electoralSections).orderBy(schema.electoralSections.sectionNum);
  } catch (_err) {
    console.warn("Table electoral_sections not found yet, returning empty list");
    sections = [];
  }

  return <EstructuraClient representatives={representatives} availableUsers={users} sections={sections} />;
}
