import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session-server";
import { schema } from "@tonala/shared/database";
import { withOutbox } from "@/lib/outbox-helper";
import { actorFromSession } from "@/lib/api-helpers";

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session.isLoggedIn || !["admin", "direction", "territorial_coordinator"].includes(session.roleKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const actor = await actorFromSession();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { sectionId, userId, role } = await request.json();
    if (!sectionId || !userId || !role) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    await withOutbox("electoral_representative", userId, "RepresentativeAssigned.v1", { sectionId, userId, role }, actor.actorId, async (tx) => {
      await tx.insert(schema.electoralRepresentatives).values({
        sectionId,
        userId,
        role
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === '23505') {
       return NextResponse.json({ error: "El usuario ya esto asignado a esta seccin" }, { status: 400 });
    }
    console.error("Failed to assign representative:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
