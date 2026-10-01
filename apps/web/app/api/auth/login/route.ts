import { NextResponse } from "next/server";

import { authenticateUserDetailed } from "@/lib/auth";
import { getDatabasePool } from "@/lib/db";
import { getHomePathForRole } from "@tonala/ui";
import { saveServerSession } from "@/lib/session-server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { safeErrorMessage } from "@/lib/safe-error";
import { registrarError } from "@/lib/registro";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";

    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim() ?? "";
    const password = body.password ?? "";

    // Dos límites. Antes era uno solo, de 10 intentos por IP, y contaba también las entradas
    // correctas: detrás de la misma IP —la WiFi de un evento, o la de la compañía celular, que
    // comparte una IP pública entre muchos teléfonos— la persona 11 que entraba en 15 minutos
    // recibía «demasiados intentos». El mismo problema que el alta pública ya resolvió (R25).
    // Ahora los 10 intentos son por cuenta y por IP, que es lo que frena adivinar una contraseña,
    // y la IP sola tiene un tope amplio que frena probar muchas cuentas desde un mismo lugar.
    const rlIp = checkRateLimit(`login:${ip}`, 300, 15 * 60 * 1000);
    if (!rlIp.allowed) return rateLimitResponse(rlIp);
    const rlCuenta = checkRateLimit(`login:${ip}:${email.toLowerCase()}`, 10, 15 * 60 * 1000);
    if (!rlCuenta.allowed) return rateLimitResponse(rlCuenta);

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
      isLoggedIn: true,
      sessionVersion: user.sessionVersion
    });
    // «Última entrada», para el panel del administrador maestro (0023). No toca nada que cierre sesiones.
    await pool.query("UPDATE user_profiles SET last_login_at = now() WHERE id = $1", [user.id]);

    return NextResponse.json({
      ok: true,
      redirectTo: getHomePathForRole(user.roleKey)
    });
  } catch (error: unknown) {
    registrarError("Login route error", error);
    const message = safeErrorMessage(error, "Error al iniciar sesión.");
    return NextResponse.json({ code: "login_failed", message }, { status: 500 });
  }
}

