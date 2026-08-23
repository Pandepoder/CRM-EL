import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session-server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session.isLoggedIn || session.roleKey !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, leaderId, zone } = await request.json();
    if (!name || !leaderId) {
      return NextResponse.json({ error: "Name and leaderId are required" }, { status: 400 });
    }

    const db = getDatabaseClient();
    const [team] = await db.insert(schema.teams).values({
      name,
      leaderId,
      zone: zone || null,
    }).returning({ id: schema.teams.id });

    return NextResponse.json({ success: true, id: team!.id });
  } catch (error) {
    console.error("Failed to create team:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
