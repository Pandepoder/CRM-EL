import { getServerSession } from "@/lib/session-server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq } from "drizzle-orm";
import EstructuraClient from "./EstructuraClient";

import { requirePageRole } from "@/lib/authorization";

export default async function EstructuraPage() {
  await requirePageRole("admin", "direction", "territorial_coordinator");
  const _session = await getServerSession();

  const db = getDatabaseClient();

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
      .innerJoin(schema.userProfiles, eq(schema.electoralRepresentatives.userId, schema.userProfiles.id));
  } catch (_err) {
    console.warn("Table electoral_representatives not found yet, returning empty list");
    representatives = [];
  }

  const users = await db.select({
    id: schema.userProfiles.id,
    displayName: schema.userProfiles.displayName
  }).from(schema.userProfiles).where(eq(schema.userProfiles.status, "active"));

  let sections: any[] = [];
  try {
    sections = await db.select({
      id: schema.electoralSections.id,
      sectionNum: schema.electoralSections.sectionNum
    }).from(schema.electoralSections).orderBy(schema.electoralSections.sectionNum);
  } catch (_err) {
    console.warn("Table electoral_sections not found yet, returning empty list");
    sections = [];
  }

  return <EstructuraClient representatives={representatives} availableUsers={users} sections={sections} />;
}
