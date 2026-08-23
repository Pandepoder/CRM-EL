import { NextResponse } from "next/server";

import { authenticateUser } from "@/lib/auth";
import { getDatabasePool } from "@/lib/db";
import { getHomePathForRole } from "@tonala/ui";
import { saveServerSession } from "@/lib/session-server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim() ?? "";
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json(
        { code: "validation_error", message: "Correo y contraseña son requeridos." },
        { status: 400 }
      );
    }

    const pool = getDatabasePool();
    const user = await authenticateUser(pool, email, password);

    if (!user) {
      return NextResponse.json(
        { code: "invalid_credentials", message: "Credenciales incorrectas." },
        { status: 401 }
      );
    }

    await saveServerSession({
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      roleKey: user.roleKey,
      roleName: user.roleName,
      isLoggedIn: true
    });

    return NextResponse.json({
      ok: true,
      redirectTo: getHomePathForRole(user.roleKey)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed.";
    return NextResponse.json({ code: "login_failed", message }, { status: 500 });
  }
}
