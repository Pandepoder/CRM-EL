import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { getDatabaseClient } from "@/lib/db-client";
import { requireActorPermission, Permission } from "@/lib/authorization";
import { schema } from "@tonala/shared/database";
import { eq } from "drizzle-orm";

export async function GET(_request: Request) {
  const actor = await requireActorPermission(Permission.DashboardRead);
  if (actor instanceof NextResponse) return actor;

  const db = getDatabaseClient();

  try {
    const users = await db
      .select({
        id: schema.userProfiles.id,
        displayName: schema.userProfiles.displayName,
        email: schema.userProfiles.email,
        role: schema.roles.name
      })
      .from(schema.userProfiles)
      .leftJoin(schema.roles, eq(schema.userProfiles.roleId, schema.roles.id))
      .where(eq(schema.userProfiles.status, "active"));

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching map users:", error);
    return NextResponse.json({ users: [] });
  }
}
