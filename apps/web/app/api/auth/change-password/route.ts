import { NextResponse } from "next/server";
import { actorFromSession } from "@/lib/api-helpers";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";
import argon2 from "argon2";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { safeErrorMessage } from "@/lib/safe-error";
import { registrarError } from "@/lib/registro";
import { getServerSession, saveServerSession } from "@/lib/session-server";

export async function POST(request: Request) {
  try {
    // De la base, no de la cookie: una cuenta dada de baja ya no cambia su contraseña.
    const actor = await actorFromSession();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = actor.actorId as string;

    const rl = checkRateLimit(`chpwd:${userId}`, 5, 60 * 60 * 1000); // 5 intentos por hora
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
      .where(eq(schema.userProfiles.id, userId));

    const user = results[0];

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Usuario no encontrado o sin contraseña configurada." }, { status: 404 });
    }

    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) {
      return NextResponse.json({ error: "Contraseña actual incorrecta." }, { status: 400 });
    }

    const newHash = await hashPassword(newPassword);
    const [actualizada] = await db.update(schema.userProfiles)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(schema.userProfiles.id, userId))
      .returning({ sessionVersion: schema.userProfiles.sessionVersion });

    // Cambiar la contraseña sube la versión de la sesión (0023): se cierran las demás sesiones abiertas
    // —si alguien más la conocía, queda fuera—, pero no esta, que es la de quien la acaba de cambiar.
    if (actualizada) {
      await saveServerSession({ ...(await getServerSession()), sessionVersion: actualizada.sessionVersion });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    registrarError("Change password route error", error);
    return NextResponse.json({ error: safeErrorMessage(error, "Error al cambiar la contraseña.") }, { status: 500 });
  }
}

