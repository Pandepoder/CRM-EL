import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import {
  Permission,
  requirePermission,
  type ActorContext
} from "@tonala/shared/auth";

import { actorFromSession, unauthorized, permissionChecker } from "@/lib/api-helpers";
import { getHomePathForRole, rolesDePantalla, type PantallaDelPanel } from "@tonala/ui";
import { getServerSession } from "@/lib/session-server";
import { roleHasAny } from "@/lib/permissions";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";

export type AuthFailure = NextResponse;

/** A dónde va una sesión cuya cuenta ya no está activa: la cierra y explica por qué. */
export const RUTA_SESION_INACTIVA = "/api/auth/salir";

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

  // Todos los roles del actor, no solo el primero: el maestro es `admin` y además `master_admin`
  // (etapa 6), y lo que es solo suyo se pide con el segundo.
  if (!actor.roles.some((rol) => roleHasAny(rol, roles))) {
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
 *
 * Llamarla sin roles no abre la pantalla a todo el mundo: es un error de
 * programación. Antes se comportaba como "basta con haber iniciado sesión" y
 * varias pantallas quedaron así por descuido, pareciendo protegidas cuando no lo
 * estaban. Si de verdad basta la sesión, la función que toca es
 * requirePageSession().
 */
export async function requirePageRole(...allowedRoles: string[]): Promise<void> {
  if (allowedRoles.length === 0) {
    throw new Error(
      "requirePageRole necesita al menos un rol. Si la pantalla solo exige sesión iniciada, usa requirePageSession()."
    );
  }

  const session = await getServerSession();
  if (!session.isLoggedIn) {
    redirect("/login");
  }
  const actor = await actorFromSession();
  if (!actor) {
    // Hay cookie pero la cuenta ya no está activa. A /login no: el middleware, que solo ve la
    // cookie, la devolvía aquí y entraba en un bucle infinito. Ver /api/auth/salir.
    redirect(RUTA_SESION_INACTIVA);
  }
  const currentRole = actor.roles[0] ?? session.roleKey;
  if (!actor.roles.some((rol) => roleHasAny(rol, allowedRoles))) {
    redirect(getHomePathForRole(currentRole));
  }
}

/**
 * Pantallas que abre cualquier rol, siempre que la cuenta siga activa.
 *
 * Antes solo miraba la cookie, así que una cuenta dada de baja seguía abriendo el mapa y su
 * perfil con la sesión que ya tenía. Comprobado: `/mapa` y `/perfil` respondían 200.
 */
/**
 * La guarda de una pantalla del panel. Los roles no se escriben aquí: salen de
 * `ACCESO_A_PANTALLAS` (`packages/ui/capacidades.ts`), la misma lista con la que se arma el menú.
 * Toda pantalla bajo `app/(shell)` entra por aquí —en su página o en un layout suyo—, y
 * `tests/unit/capacidades.test.ts` falla si alguna usa otra guarda o protege con otra lista.
 */
export async function requirePageAccess(pantalla: PantallaDelPanel): Promise<void> {
  await requirePageRole(...rolesDePantalla(pantalla));
}

export async function requirePageSession(): Promise<void> {
  const session = await getServerSession();
  if (!session.isLoggedIn) {
    redirect("/login");
  }
  if (!(await actorFromSession())) {
    redirect(RUTA_SESION_INACTIVA);
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

/**
 * Levantar una incidencia queda en manos de quien coordina la brigada, no de
 * cada integrante: administración, dirección, los coordinadores territoriales y
 * quien lidere un equipo. Un brigadista la reporta a su líder, que es quien la
 * registra y responde de ella.
 *
 * El mensaje explica el motivo y qué hacer, en vez del "Acceso denegado" a secas
 * que devolvía la comprobación genérica: quien se topa con esto en campo
 * necesita saber si le falta un permiso o si está haciendo algo que no le toca.
 */
export async function requireLiderParaIncidencias(
  // La misma regla guarda el alta de actividades (`/api/equipo/tareas`); el mensaje decía
  // «levantar incidencias» también ahí, a quien intentaba registrar una actividad.
  que: "incidencias" | "actividades" = "incidencias"
): Promise<ActorContext | AuthFailure> {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const alcance = await resolveUserNetworkScope(actor.actorId);
  if (alcance.isAdmin || alcance.isLeader) return actor;

  return NextResponse.json(
    {
      code: "forbidden_no_es_lider",
      message:
        que === "actividades"
          ? "Solo quien lidera la brigada puede registrar actividades. " +
            "Pídesela a tu líder para que quede registrada a nombre del equipo."
          : "Solo el líder de la brigada puede levantar incidencias. " +
            "Repórtasela a tu líder para que quede registrada a nombre del equipo."
    },
    { status: 403 }
  );
}
