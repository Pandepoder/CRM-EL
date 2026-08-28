import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session-server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session.isLoggedIn || session.roleKey !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const { name, leaderId, zone, municipality, section } = await request.json();
    
    const db = getDatabaseClient();
    await db.update(schema.teams)
      .set({
        name: name !== undefined ? name : undefined,
        leaderId: leaderId !== undefined ? leaderId : undefined,
        zone: zone !== undefined ? (zone || null) : undefined,
        municipality: municipality !== undefined ? (municipality || null) : undefined,
        section: section !== undefined ? (section || null) : undefined
      })
      .where(eq(schema.teams.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update team:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session.isLoggedIn || session.roleKey !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const db = getDatabaseClient();
    
    // First delete members of this team
    await db.delete(schema.teamMembers).where(eq(schema.teamMembers.teamId, id));
    
    // Then delete the team itself
    await db.delete(schema.teams).where(eq(schema.teams.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete team:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
