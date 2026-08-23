import { NextResponse } from "next/server";
import { getServerSession, saveServerSession } from "@/lib/session-server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq } from "drizzle-orm";

export async function PATCH(request: Request) {
  const session = await getServerSession();
  if (!session.isLoggedIn || !session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { displayName } = await request.json();
  if (!displayName || displayName.trim() === "") {
    return NextResponse.json({ error: "Nombre no válido" }, { status: 400 });
  }

  const newName = displayName.trim();

  const db = getDatabaseClient();
  await db.update(schema.userProfiles)
    .set({ displayName: newName })
    .where(eq(schema.userProfiles.id, session.userId));

  await saveServerSession({ ...session, displayName: newName });

  return NextResponse.json({ success: true, displayName: newName });
}
