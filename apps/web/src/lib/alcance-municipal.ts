import { and, eq, inArray, or, sql, type SQL, type SQLWrapper } from "drizzle-orm";

import { schema } from "@tonala/shared/database";

import { getDatabaseClient } from "@/lib/db-client";
import { genteDelMunicipio, type UserNetworkScope } from "@/lib/network-hierarchy";

/**
 * La frontera de municipio de la etapa 6, para lo que no son ciudadanos ni incidencias (esos viven en
 * `contact-visibility.ts` e `incident-visibility.ts`, con la misma regla):
 *
 * - el administrador maestro ve y gobierna todo;
 * - un administrador municipal ve lo que tiene la llave de su municipio y lo que hizo su gente (las
 *   personas con esa llave), y gobierna solo a su gente;
 * - un administrador sin municipio ve solo lo suyo y no gobierna a nadie;
 * - quien no es administración sigue con su cascada de mando.
 */

/**
 * Para tablas con llave de municipio y autor (escucha social, prospectos): qué filas ve un alcance.
 * `undefined` = todas.
 */
export function condicionPorAutor(scope: UserNetworkScope, llave: SQLWrapper, autor: SQLWrapper): SQL | undefined {
  if (scope.isMaster) return undefined;
  if (scope.isAdmin) {
    const municipio = scope.adminMunicipalityId;
    if (!municipio) return sql`${autor} = ${scope.userId}`;
    return or(sql`${llave} = ${municipio}`, sql`${autor} IN (${genteDelMunicipio(municipio)})`);
  }
  const personas = scope.allowedUserIds ?? [];
  return personas.length ? inArray(autor as typeof schema.socialListening.createdByUserId, personas) : sql`false`;
}

/**
 * Lo mismo, para **trabajar** la fila —cambiar su estado o sus notas—, no para verla: fuera de
 * administración cuenta solo lo de la propia persona y lo de quien está bajo su mando
 * (`commandUserIds`). El capturista ve lo de sus compañeros de brigada, pero no se lo cambia (A20:
 * ver no es trabajar).
 */
export function condicionParaTrabajarPorAutor(scope: UserNetworkScope, llave: SQLWrapper, autor: SQLWrapper): SQL | undefined {
  if (scope.isAdmin) return condicionPorAutor(scope, llave, autor);
  const personas = scope.commandUserIds ?? [];
  return personas.length ? inArray(autor as typeof schema.socialListening.createdByUserId, personas) : sql`false`;
}

/** Qué equipos ve un alcance: el maestro, todos; un administrador municipal, los de su municipio. */
export function condicionDeEquipos(scope: UserNetworkScope): SQL | undefined {
  if (scope.isMaster) return undefined;
  if (scope.isAdmin && scope.adminMunicipalityId) return eq(schema.teams.municipalityId, scope.adminMunicipalityId);
  return scope.teamIds.length ? inArray(schema.teams.id, scope.teamIds) : sql`false`;
}

/**
 * Qué cuentas gobierna un alcance —aprobar, dar de baja, cambiar rol o contraseña—, como condición
 * sobre `user_profiles`:
 * - el maestro, todas menos la suya (eso se hace desde el servidor, para que nunca se quede el
 *   sistema sin maestro por un clic);
 * - un administrador municipal, las de su municipio que no son de administración: ningún
 *   administrador toca a otro (A2);
 * - nadie más.
 */
export function condicionDeCuentasGobernadas(scope: UserNetworkScope): SQL {
  const up = schema.userProfiles;
  if (scope.isMaster) return sql`${up.id} <> ${scope.userId}`;
  if (scope.isAdmin && scope.adminMunicipalityId) {
    return and(
      eq(up.municipalityId, scope.adminMunicipalityId),
      sql`${up.roleId} <> (SELECT r.id FROM roles r WHERE r.key = 'admin')`
    )!;
  }
  return sql`false`;
}

export type CuentaGobernada = {
  id: string;
  displayName: string;
  status: string;
  roleKey: string;
  isMasterAdmin: boolean;
  municipalityId: string;
  municipioTipo: string;
};

/** La cuenta, si este alcance la gobierna; `null` si no existe o no es suya. */
export async function cuentaGobernada(scope: UserNetworkScope, userId: string): Promise<CuentaGobernada | null> {
  const db = getDatabaseClient();
  const [cuenta] = await db
    .select({
      id: schema.userProfiles.id,
      displayName: schema.userProfiles.displayName,
      status: schema.userProfiles.status,
      roleKey: schema.roles.key,
      isMasterAdmin: schema.userProfiles.isMasterAdmin,
      municipalityId: schema.userProfiles.municipalityId,
      municipioTipo: schema.municipalities.kind
    })
    .from(schema.userProfiles)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.userProfiles.roleId))
    .innerJoin(schema.municipalities, eq(schema.municipalities.id, schema.userProfiles.municipalityId))
    .where(and(eq(schema.userProfiles.id, userId), condicionDeCuentasGobernadas(scope)))
    .limit(1);
  return cuenta ?? null;
}

/**
 * El municipio de una persona que ve un administrador municipal: el suyo. El maestro no tiene uno; los
 * demás, tampoco para esto.
 */
export function municipioDeAdministracion(scope: UserNetworkScope): string | null {
  return scope.isAdmin && !scope.isMaster ? scope.adminMunicipalityId : null;
}

/** El id de General (estatal): lo que no tiene municipio confirmado, y el municipio del maestro. */
export async function idDeGeneral(): Promise<string> {
  const [fila] = await getDatabaseClient()
    .select({ id: schema.municipalities.id })
    .from(schema.municipalities)
    .where(eq(schema.municipalities.kind, "general"))
    .limit(1);
  if (!fila) throw new Error("Falta la fila General de municipalities (migración 0022).");
  return fila.id;
}

/** El nombre oficial de un municipio por su llave, o `null` si no existe. */
export async function nombreDeMunicipio(id: string): Promise<string | null> {
  const [fila] = await getDatabaseClient()
    .select({ name: schema.municipalities.name })
    .from(schema.municipalities)
    .where(eq(schema.municipalities.id, id))
    .limit(1);
  return fila?.name ?? null;
}

/**
 * El municipio con que un administrador municipal da de alta algo (un equipo, un almacén, una
 * cuenta): el suyo, siempre. Si pidió otro, el motivo del rechazo. El maestro y quien no es
 * administración no pasan por aquí.
 */
export async function municipioParaUnAdministrador(
  scope: UserNetworkScope,
  pedido: string | null | undefined
): Promise<{ ok: true; id: string; nombre: string } | { ok: false; motivo: string }> {
  const propio = scope.adminMunicipalityId;
  if (!propio) return { ok: false, motivo: "Tu cuenta de administración aún no tiene municipio: el administrador maestro te lo asigna." };
  const nombre = await nombreDeMunicipio(propio);
  if (!nombre) return { ok: false, motivo: "Tu municipio no existe en el catálogo." };
  if (pedido && pedido !== nombre) {
    return { ok: false, motivo: `Administras ${nombre}: lo de otro municipio lo da de alta su administración o el administrador maestro.` };
  }
  return { ok: true, id: propio, nombre };
}

/**
 * Fragmento para SQL escrito a mano sobre una columna con el id de una persona: `AND <columna> IN (…)`.
 * El maestro no se acota; un administrador municipal, a su gente (también la que ya no está activa);
 * el resto, a su estructura. Con la lista vacía, `AND false`.
 */
export function sqlRestriccionPersonas(columna: SQL, scope: UserNetworkScope): SQL {
  if (scope.isMaster) return sql``;
  if (scope.isAdmin && scope.adminMunicipalityId) return sql`AND ${columna} IN (${genteDelMunicipio(scope.adminMunicipalityId)})`;
  const personas = scope.allowedUserIds ?? [];
  if (personas.length === 0) return sql`AND false`;
  return sql`AND ${columna} IN (${sql.join(personas.map((id) => sql`${id}::uuid`), sql`, `)})`;
}

/** ¿Tiene esta persona la llave de este municipio? (en cualquier estado) */
export async function esDelMunicipio(userId: string, municipioId: string): Promise<boolean> {
  const [fila] = await getDatabaseClient()
    .select({ id: schema.userProfiles.id })
    .from(schema.userProfiles)
    .where(and(eq(schema.userProfiles.id, userId), eq(schema.userProfiles.municipalityId, municipioId)))
    .limit(1);
  return Boolean(fila);
}
