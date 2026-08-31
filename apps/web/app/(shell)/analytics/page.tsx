import { getDatabaseClient } from "@/lib/db-client";
import { schema, decryptData } from "@tonala/shared/database";
import AnalyticsClient from "./AnalyticsClient";
import { requirePageRole } from "@/lib/authorization";

export default async function AnalyticsPage() {
  await requirePageRole("admin", "direction");

  const db = getDatabaseClient();

  // 1. Fetch ALL contacts (since we need to decrypt them to group them)
  const contacts = await db.select().from(schema.contacts);
  
  const totalCitizens = contacts.length;
  
  // Aggregate data in memory
  const availabilityCount: Record<string, number> = {};
  const skillCount: Record<string, number> = {};
  const colonyCount: Record<string, number> = {};

  for (const c of contacts) {
    // Decrypt categorical fields
    const availability = c.availability ? decryptData(c.availability) : null;
    const skill = c.skill ? decryptData(c.skill) : null;
    const colony = c.colony ? decryptData(c.colony) : null;

    if (availability) {
      availabilityCount[availability] = (availabilityCount[availability] || 0) + 1;
    }
    if (skill) {
      skillCount[skill] = (skillCount[skill] || 0) + 1;
    }
    if (colony) {
      colonyCount[colony] = (colonyCount[colony] || 0) + 1;
    }
  }

  // 2. Availability Distribution
  const availabilityData = Object.entries(availabilityCount || {})
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  // 3. Skills Distribution (Top 10)
  const skillData = Object.entries(skillCount || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));

  // 4. Top Colonies (Top 9)
  const topColonies = Object.entries(colonyCount || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 9)
    .map(([name, value]) => ({ name, value }));

  return (
    <AnalyticsClient 
      totalCitizens={totalCitizens} 
      availabilityData={availabilityData} 
      skillData={skillData} 
      topColonies={topColonies} 
    />
  );
}
