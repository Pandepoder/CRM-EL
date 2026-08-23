import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session-server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";
import argon2 from "argon2";

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session.isLoggedIn || !session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await request.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const db = getDatabaseClient();
  const results = await db
    .select({ passwordHash: schema.userProfiles.passwordHash })
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.id, session.userId));

  const user = results[0];

  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "Usuario no encontrado o sin contraseña configurada" }, { status: 404 });
  }

  const valid = await argon2.verify(user.passwordHash, currentPassword);
  if (!valid) {
    return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 400 });
  }

  const newHash = await hashPassword(newPassword);
  await db.update(schema.userProfiles)
    .set({ passwordHash: newHash })
    .where(eq(schema.userProfiles.id, session.userId));

  return NextResponse.json({ success: true });
}
