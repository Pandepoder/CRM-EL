import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session-server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";
import argon2 from "argon2";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { safeErrorMessage } from "@/lib/safe-error";

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = checkRateLimit(`chpwd:${session.userId}`, 5, 60 * 60 * 1000); // 5 intentos por hora
    if (!rl.allowed) return rateLimitResponse(rl);

    const { currentPassword, newPassword } = await request.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Faltan datos requeridos." }, { status: 400 });
    }

    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json(
        { error: "La nueva contraseña debe tener al menos 6 caracteres." },
        { status: 400 }
      );
    }

    const db = getDatabaseClient();
    const results = await db
      .select({ passwordHash: schema.userProfiles.passwordHash })
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.id, session.userId));

    const user = results[0];

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Usuario no encontrado o sin contraseña configurada." }, { status: 404 });
    }

    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) {
      return NextResponse.json({ error: "Contraseña actual incorrecta." }, { status: 400 });
    }

    const newHash = await hashPassword(newPassword);
    await db.update(schema.userProfiles)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(schema.userProfiles.id, session.userId));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Change password route error:", error);
    return NextResponse.json({ error: safeErrorMessage(error, "Error al cambiar la contraseña.") }, { status: 500 });
  }
}

