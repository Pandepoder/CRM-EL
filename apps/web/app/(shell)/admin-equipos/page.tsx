import { getServerSession } from "@/lib/session-server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import TeamsClient from "./TeamsClient";

import { requirePageRole } from "@/lib/authorization";

export default async function AdminEquiposPage() {
  await requirePageRole("admin");
  const session = await getServerSession();

  const db = getDatabaseClient();
  
  // Fetch teams with their leaders
  const teams = await db
    .select({
      id: schema.teams.id,
      name: schema.teams.name,
      zone: schema.teams.zone,
      leaderId: schema.teams.leaderId,
      leaderName: schema.userProfiles.displayName
    })
    .from(schema.teams)
    .leftJoin(schema.userProfiles, eq(schema.teams.leaderId, schema.userProfiles.id));

  // Fetch all users to be selected as leaders
  const users = await db
    .select({
      id: schema.userProfiles.id,
      displayName: schema.userProfiles.displayName
    })
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.status, "active"));

  return <TeamsClient teams={teams} users={users} />;
}
