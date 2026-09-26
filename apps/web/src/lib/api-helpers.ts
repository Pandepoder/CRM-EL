import { cache } from "react";
import { NextResponse } from "next/server";

import {
  createAuthenticatedActor,
  PermissionChecker,
  Role,
  type ActorContext
} from "@tonala/shared/auth";
import { toSafeHttpError, type TonalaOsError } from "@tonala/shared/errors";
import { type Result } from "@tonala/shared/kernel";

import { getServerSession } from "@/lib/session-server";
import { getDatabaseClient } from "@/lib/db-client";
import { createUsersReader } from "@tonala/modules/governance/application";
import { permissionsForRole } from "@/lib/permissions";
import { idDePeticion } from "@/lib/registro";

/**
 * Lee la sesión iron-session del request y construye un ActorContext.
 * Refresca el rol desde la BD para reflejar cambios de privilegios sin re-login.
 * Retorna null si la sesión no está activa o el usuario fue desactivado.
 *
 * Memoizada por petición: una pantalla con guarda en el layout y en la página la pedía dos
 * veces, y cada vez iba a la base por el mismo usuario. Igual que resolveUserNetworkScope.
 */
export const actorFromSession = cache(leerActorDeLaSesion);

async function leerActorDeLaSesion(): Promise<ActorContext | null> {
  const session = await getServerSession();
  if (!session.isLoggedIn || !session.userId) return null;

  const db = getDatabaseClient();
  const usersReader = createUsersReader(db);
  const user = await usersReader.getUserById(session.userId);
  if (!user || user.status !== "active") return null;
  // Le cambiaron el rol, el estado, la contraseña o —si es administración— el municipio después de
  // abrir esta sesión (0023): deja de valer, igual que una cuenta dada de baja. Así restablecer la
  // contraseña de una cuenta robada echa también a quien la estaba usando.
  if (session.sessionVersion !== user.sessionVersion) return null;

  return createAuthenticatedActor({
    actorId: session.userId,
    // El maestro lleva, además de su rol, la marca `master_admin`: el primero sigue siendo `admin`, así
    // que todo lo que administración puede hacer lo puede él, y lo que es solo suyo mira la marca.
    roles: user.isMasterAdmin ? [user.roleKey, Role.MasterAdmin] : [user.roleKey],
    permissions: permissionsForRole(user.roleKey),
    // El identificador que el middleware le puso a esta petición, no uno nuevo: así lo que se
    // escribe en `audit_logs` y en el outbox con este actor se une con la línea del registro y con
    // la cabecera `x-request-id` que recibió el cliente. Fuera de una petición, uno nuevo.
    correlationId: (await idDePeticion()) ?? crypto.randomUUID(),
    authenticationMethod: "password",
    requestStartedAt: new Date()
  });
}

export const permissionChecker = new PermissionChecker();

/**
 * Convierte el Result de un caso de uso en una NextResponse.
 *
 * El código HTTP sale de `toSafeHttpError`, que es el mapa del kernel. Aquí había una copia
 * escrita a mano que solo conocía cuatro categorías de las ocho y mandaba el resto a 500.
 * Consecuencia medida: dar de alta un ciudadano sin nombre respondía
 * `500 {"code":"contact_display_name_required"}` —un DomainError, categoría `domain`, que
 * debe ser 422—, así que el cliente no podía distinguir "te faltó un campo" de "el servidor
 * se cayó" y ni el mensaje ni el reintento se comportaban bien. Lo mismo les pasaba a
 * `conflict` (409) y a `infrastructure` (503).
 *
 * No se vuelve a duplicar el mapa: si mañana aparece otra categoría, basta con añadirla en
 * `packages/shared/errors`.
 */
export function resultToResponse<T>(
  result: Result<T, TonalaOsError>
): NextResponse {
  if (!result.ok) {
    const { status, code, message } = toSafeHttpError(result.error);
    return NextResponse.json({ code, message }, { status });
  }
  return NextResponse.json(result.value);
}

export function unauthorized(): NextResponse {
  return NextResponse.json(
    { code: "unauthorized", message: "Sesión requerida." },
    { status: 401 }
  );
}
