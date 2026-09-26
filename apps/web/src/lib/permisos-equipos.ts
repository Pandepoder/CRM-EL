import { and, eq, inArray, ne } from "drizzle-orm";

import { schema } from "@tonala/shared/database";

import { getDatabaseClient } from "@/lib/db-client";
import { type UserNetworkScope } from "@/lib/network-hierarchy";

/**
 * Quién crea y edita equipos, y con qué líder. Regla única para la pantalla y para la API.
 *
 * Antes era solo de administración, aunque el menú ofrecía «Gestión de Equipos» a Dirección y a
 * Líder: un líder no podía dar de alta su propia brigada ni corregirle el nombre (C6, M1).
 *
 * Ahora cada quien gestiona **dentro de su mando**, que es el mismo que calcula
 * `resolveUserNetworkScope`: los equipos que lidera (a Dirección, también los que le asignaron) y,
 * en cascada, las brigadas que lideran los integrantes de esos equipos.
 *
 * - Crear: el líder del equipo nuevo tiene que ser la propia persona o un integrante de un equipo
 *   bajo su mando. Con cualquier otro, el equipo nacería fuera de su mando y dejaría de verlo en
 *   cuanto lo guardara. Un compañero de equipo sin más no cuenta: no está bajo su mando.
 * - Editar: equipos bajo su mando.
 * - Cambiar el líder: solo en las brigadas que cuelgan de su mando, y hacia alguien que también
 *   sea eslabón. En los equipos desde los que manda (los suyos) no: se quedaría sin mando sobre
 *   toda la estructura que cuelga de ahí. Eso lo hace administración.
 * - Borrar: solo administración. Borrar un equipo saca a sus integrantes de la estructura.
 *
 * Administración (etapa 6): el administrador maestro no tiene límite, salvo que el líder sea una
 * cuenta activa. Un administrador municipal gestiona los equipos de su municipio, con líderes de su
 * municipio, y no los saca de él: mover estructura entre municipios es del maestro. Un administrador
 * que sigue sin municipio no gestiona ninguno.
 */

export const ROLES_QUE_GESTIONAN_EQUIPOS: readonly string[] = ["admin", "direction", "territorial_coordinator"];

export function gestionaEquipos(scope: UserNetworkScope): boolean {
  if (scope.isAdmin) return scope.isMaster || scope.adminMunicipalityId !== null;
  return ROLES_QUE_GESTIONAN_EQUIPOS.includes(scope.roleKey);
}

export function puedeEditarEquipo(scope: UserNetworkScope, teamId: string): boolean {
  if (scope.isMaster) return true;
  // Para un administrador municipal, `commandTeamIds` son los equipos de su municipio.
  return gestionaEquipos(scope) && scope.commandTeamIds.includes(teamId);
}

export function puedeCambiarLider(scope: UserNetworkScope, teamId: string): boolean {
  if (scope.isAdmin) return puedeEditarEquipo(scope, teamId);
  return puedeEditarEquipo(scope, teamId) && !scope.commandRootTeamIds.includes(teamId);
}

/** Borrar un equipo: administración, sobre un equipo que gobierna. */
export function puedeBorrarEquipo(scope: UserNetworkScope, teamId: string): boolean {
  return scope.isAdmin && puedeEditarEquipo(scope, teamId);
}

/**
 * Personas que esta sesión puede poner al frente de un equipo: ella misma y los integrantes
 * activos, sin rol de administración, de los equipos bajo su mando. Un administrador municipal, las
 * personas activas de su municipio. `null` = cualquier cuenta activa (el maestro).
 */
export async function lideresPosibles(scope: UserNetworkScope): Promise<Set<string> | null> {
  if (scope.isMaster) return null;
  if (scope.isAdmin) return new Set(scope.allowedUserIds ?? [scope.userId]);
  const posibles = new Set<string>([scope.userId]);
  if (scope.commandTeamIds.length === 0) return posibles;

  const db = getDatabaseClient();
  const filas = await db
    .selectDistinct({ id: schema.teamMembers.userId })
    .from(schema.teamMembers)
    .innerJoin(schema.userProfiles, eq(schema.userProfiles.id, schema.teamMembers.userId))
    .innerJoin(schema.roles, eq(schema.roles.id, schema.userProfiles.roleId))
    .where(
      and(
        inArray(schema.teamMembers.teamId, scope.commandTeamIds),
        eq(schema.userProfiles.status, "active"),
        ne(schema.roles.key, "admin")
      )
    );
  for (const fila of filas) posibles.add(fila.id);
  return posibles;
}

/** ¿Puede esta sesión poner a `leaderId` al frente de un equipo? */
export async function puedeSerLider(scope: UserNetworkScope, leaderId: string): Promise<boolean> {
  const posibles = await lideresPosibles(scope);
  if (posibles) return posibles.has(leaderId);
  const db = getDatabaseClient();
  const [cuenta] = await db
    .select({ id: schema.userProfiles.id })
    .from(schema.userProfiles)
    .where(and(eq(schema.userProfiles.id, leaderId), eq(schema.userProfiles.status, "active")))
    .limit(1);
  return Boolean(cuenta);
}
