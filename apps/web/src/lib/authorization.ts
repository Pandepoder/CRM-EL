import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import {
  Permission,
  requirePermission,
  type ActorContext
} from "@tonala/shared/auth";

import { actorFromSession, unauthorized, permissionChecker } from "@/lib/api-helpers";
import { getHomePathForRole } from "@tonala/ui";
import { getServerSession } from "@/lib/session-server";
import { roleHasAny } from "@/lib/permissions";

export type AuthFailure = NextResponse;

export async function requireActor(): Promise<ActorContext | AuthFailure> {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();
  return actor;
}

export async function requireActorPermission(
  permission: Permission
): Promise<ActorContext | AuthFailure> {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const auth = requirePermission(actor, permission, permissionChecker);
  if (!auth.ok) {
    return NextResponse.json(
      { code: auth.error.code, message: auth.error.publicMessage ?? "Acceso denegado." },
      { status: auth.error.category === "forbidden" ? 403 : 401 }
    );
  }
  return auth.value;
}

export async function requireActorRoles(
  ...roles: string[]
): Promise<ActorContext | AuthFailure> {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const roleKey = actor.roles[0] ?? "";
  if (!roleHasAny(roleKey, roles)) {
    return NextResponse.json(
      { code: "forbidden", message: "No tienes permiso para esta acción." },
      { status: 403 }
    );
  }
  return actor;
}

/**
 * Server Component / server action guard. Redirects unauthenticated users to login
 * and authenticated-but-forbidden users to their role home.
 */
export async function requirePageRole(...allowedRoles: string[]): Promise<void> {
  const session = await getServerSession();
  if (!session.isLoggedIn) {
    redirect("/login");
  }
  const actor = await actorFromSession();
  if (!actor) {
    redirect("/login");
  }
  const currentRole = actor.roles[0] ?? session.roleKey;
  if (allowedRoles.length > 0 && !roleHasAny(currentRole, allowedRoles)) {
    redirect(getHomePathForRole(currentRole));
  }
}

export async function requirePageSession(): Promise<void> {
  const session = await getServerSession();
  if (!session.isLoggedIn) {
    redirect("/login");
  }
}

export function assertActorPermission(
  actor: ActorContext,
  permission: Permission
): void {
  const auth = requirePermission(actor, permission, permissionChecker);
  if (!auth.ok) {
    const err = auth.error;
    throw new Error(err.publicMessage ?? "Unauthorized");
  }
}

export { Permission, permissionChecker };
