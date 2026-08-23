import { NextResponse } from "next/server";

import {
  createAuthenticatedActor,
  PermissionChecker,
  type ActorContext
} from "@tonala/shared/auth";
import { type TonalaOsError } from "@tonala/shared/errors";
import { type Result } from "@tonala/shared/kernel";

import { getServerSession } from "@/lib/session-server";
import { getDatabaseClient } from "@/lib/db-client";
import { createUsersReader } from "@tonala/modules/governance/application";
import { permissionsForRole } from "@/lib/permissions";

/**
 * Lee la sesión iron-session del request y construye un ActorContext.
 * Refresca el rol desde la BD para reflejar cambios de privilegios sin re-login.
 * Retorna null si la sesión no está activa o el usuario fue desactivado.
 */
export async function actorFromSession(): Promise<ActorContext | null> {
  const session = await getServerSession();
  if (!session.isLoggedIn || !session.userId) return null;

  const db = getDatabaseClient();
  const usersReader = createUsersReader(db);
  const user = await usersReader.getUserById(session.userId);
  if (!user || user.status !== "active") return null;

  return createAuthenticatedActor({
    actorId: session.userId,
    roles: [user.roleKey],
    permissions: permissionsForRole(user.roleKey),
    correlationId: crypto.randomUUID(),
    authenticationMethod: "password",
    requestStartedAt: new Date()
  });
}

export const permissionChecker = new PermissionChecker();

/**
 * Convierte el Result de un caso de uso en una NextResponse.
 */
export function resultToResponse<T>(
  result: Result<T, TonalaOsError>
): NextResponse {
  if (!result.ok) {
    const err = result.error;
    const status =
      err.category === "not_found" ? 404
      : err.category === "unauthorized" ? 401
      : err.category === "forbidden" ? 403
      : err.category === "validation" ? 400
      : 500;
    return NextResponse.json(
      { code: err.code, message: err.publicMessage ?? "Error interno." },
      { status }
    );
  }
  return NextResponse.json(result.value);
}

export function unauthorized(): NextResponse {
  return NextResponse.json(
    { code: "unauthorized", message: "Sesión requerida." },
    { status: 401 }
  );
}
