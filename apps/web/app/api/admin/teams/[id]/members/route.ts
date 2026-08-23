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
  if (!session.isLoggedIn || session.roleKey !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { userId } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const db = getDatabaseClient();
    await db.insert(schema.teamMembers).values({
      teamId: id,
      userId
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === '23505') { // Unique violation in PG
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
  if (!session.isLoggedIn || session.roleKey !== "admin") {
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
    await db.delete(schema.teamMembers)
      .where(and(eq(schema.teamMembers.teamId, id), eq(schema.teamMembers.userId, userId)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove team member:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
