import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
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
  }).from(schema.userProfiles);

  return <ReportesClient sections={sections} users={users} />;
}
