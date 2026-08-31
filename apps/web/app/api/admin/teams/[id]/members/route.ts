import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session-server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq, and } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { userId } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const db = getDatabaseClient();

    // Check authorization: admin, direction, territorial_coordinator, or team leader
    const isGlobalAdmin = ["admin", "direction", "territorial_coordinator"].includes(session.roleKey);
    if (!isGlobalAdmin) {
      const team = await db.query.teams.findFirst({
        where: eq(schema.teams.id, id)
      });
      if (!team || team.leaderId !== session.userId) {
        return NextResponse.json({ error: "Unauthorized to manage this team" }, { status: 403 });
      }
    }

    await db.insert(schema.teamMembers).values({
      teamId: id,
      userId
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    const isUniqueViolation =
      error?.code === "23505" ||
      error?.cause?.code === "23505" ||
      error?.message?.includes("23505") ||
      error?.message?.includes("team_members_pk") ||
      error?.message?.includes("unique constraint");

    if (isUniqueViolation) {
      return NextResponse.json({ error: "Usuario ya es miembro de este equipo" }, { status: 400 });
    }
    console.error("Failed to add team member:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const db = getDatabaseClient();

    // Check authorization: admin, direction, territorial_coordinator, or team leader
    const isGlobalAdmin = ["admin", "direction", "territorial_coordinator"].includes(session.roleKey);
    if (!isGlobalAdmin) {
      const team = await db.query.teams.findFirst({
        where: eq(schema.teams.id, id)
      });
      if (!team || team.leaderId !== session.userId) {
        return NextResponse.json({ error: "Unauthorized to manage this team" }, { status: 403 });
      }
    }

    await db.delete(schema.teamMembers)
      .where(and(eq(schema.teamMembers.teamId, id), eq(schema.teamMembers.userId, userId)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove team member:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
