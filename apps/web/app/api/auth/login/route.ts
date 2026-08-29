import { NextResponse } from "next/server";

import { authenticateUserDetailed } from "@/lib/auth";
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
    const result = await authenticateUserDetailed(pool, email, password);

    if (!result.success) {
      if (result.reason === "pending_approval") {
        return NextResponse.json(
          { code: "pending_approval", message: "Tu solicitud de cuenta está registrada y pendiente de aprobación por el Administrador." },
          { status: 403 }
        );
      }
      if (result.reason === "inactive_account") {
        return NextResponse.json(
          { code: "inactive_account", message: "Esta cuenta está inactiva. Contacta al Administrador." },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { code: "invalid_credentials", message: "Credenciales incorrectas." },
        { status: 401 }
      );
    }

    const user = result.user;

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
