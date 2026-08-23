import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import AnalyticsClient from "./AnalyticsClient";
import { sql, isNotNull, desc, eq } from "drizzle-orm";

import { requirePageRole } from "@/lib/authorization";

export default async function AnalyticsPage() {
  await requirePageRole("admin", "direction");

  const db = getDatabaseClient();

  // 1. Total Citizens
  const totalCitizensRaw = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(schema.contacts);
  const totalCitizens = totalCitizensRaw[0]?.count || 0;

  // 2. Availability Distribution
  const availabilityDataRaw = await db
    .select({ 
      name: schema.contacts.availability, 
      value: sql<number>`cast(count(*) as integer)` 
    })
    .from(schema.contacts)
    .where(isNotNull(schema.contacts.availability))
    .groupBy(schema.contacts.availability)
    .orderBy(desc(sql<number>`count(*)`));

  const availabilityData = availabilityDataRaw.map(row => ({
    name: row.name || "No especificado",
    value: row.value
  }));

  // 3. Skills Distribution (Top 10)
  const skillDataRaw = await db
    .select({ 
      name: schema.contacts.skill, 
      value: sql<number>`cast(count(*) as integer)` 
    })
    .from(schema.contacts)
    .where(isNotNull(schema.contacts.skill))
    .groupBy(schema.contacts.skill)
    .orderBy(desc(sql<number>`count(*)`))
    .limit(10);

  const skillData = skillDataRaw.map(row => ({
    name: row.name || "Otro",
    value: row.value
  }));

  // 4. Top Colonies
  const topColoniesRaw = await db
    .select({ 
      name: schema.contacts.colony, 
      value: sql<number>`cast(count(*) as integer)` 
    })
    .from(schema.contacts)
    .where(isNotNull(schema.contacts.colony))
    .groupBy(schema.contacts.colony)
    .orderBy(desc(sql<number>`count(*)`))
    .limit(9); // 3 rows of 3 columns

  const topColonies = topColoniesRaw.map(row => ({
    name: row.name,
    value: row.value
  }));

  return (
    <AnalyticsClient 
      totalCitizens={totalCitizens} 
      availabilityData={availabilityData} 
      skillData={skillData} 
      topColonies={topColonies} 
    />
  );
}
