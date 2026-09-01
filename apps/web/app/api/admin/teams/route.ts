import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session-server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scope = await resolveUserNetworkScope(session.userId);
  if (!scope.isGlobal && !scope.isLeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, zone, municipality, section } = body;
    // Non-global users can only create a team led by themselves — prevents assigning
    // leadership of a new team to another user without global authority.
    const leaderId = scope.isGlobal ? body.leaderId : session.userId;
    if (!name || !leaderId) {
      return NextResponse.json({ error: "Name and leaderId are required" }, { status: 400 });
    }

    const db = getDatabaseClient();
    const [team] = await db.insert(schema.teams).values({
      name,
      leaderId,
      zone: zone || null,
      municipality: municipality || null,
      section: section || null,
    }).returning({ id: schema.teams.id });

    return NextResponse.json({ success: true, id: team!.id });
  } catch (error) {
    console.error("Failed to create team:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
