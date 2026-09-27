import { and, eq, inArray, or, sql, type SQL } from "drizzle-orm";

import { schema } from "@tonala/shared/database";

import { condicionDeEquipos } from "@/lib/alcance-municipal";
import { getDatabaseClient } from "@/lib/db-client";
import { resolveUserNetworkScope, type UserNetworkScope } from "@/lib/network-hierarchy";
import { puedeEditarEquipo } from "@/lib/permisos-equipos";

/**
 * Quién puede sumar o quitar integrantes de un equipo, y a quién. Una sola regla para la API
 * (`/api/admin/teams/[id]/members`) y para el tablero de /admin-equipos, que solo ofrece lo que la API
 * va a aceptar:
 *
 * - administración, sobre los equipos que gobierna (el maestro, todos; un administrador municipal, los
 *   de su municipio), y solo con personas de su alcance (el maestro, cualquiera);
 * - el líder de un equipo, sobre ese equipo, y solo con personas activas que él invitó.
 */

export type PermisoSobreIntegrantes = { ok: boolean; esAdmin: boolean; scope: UserNetworkScope };

export async function permisoSobreIntegrantes(actorId: string, teamId: string, scope?: UserNetworkScope): Promise<PermisoSobreIntegrantes> {
  const alcance = scope ?? (await resolveUserNetworkScope(actorId));
  if (alcance.isAdmin) return { ok: puedeEditarEquipo(alcance, teamId), esAdmin: true, scope: alcance };
  const equipo = await getDatabaseClient().query.teams.findFirst({ where: eq(schema.teams.id, teamId), columns: { leaderId: true } });
  return { ok: Boolean(equipo && equipo.leaderId === actorId), esAdmin: false, scope: alcance };
}

/** Las personas que alguien puede sumar a un equipo que gobierna, como condición sobre `user_profiles`. */
export function condicionDePersonasQuePuedeSumar(scope: UserNetworkScope, actorId: string): SQL | undefined {
  const u = schema.userProfiles;
  if (scope.isAdmin) {
    if (scope.isMaster) return undefined;
    const alcance = scope.allowedUserIds ?? [];
    return alcance.length ? inArray(u.id, alcance) : sql`false`;
  }
  return and(eq(u.status, "active"), or(eq(u.invitedByUserId, actorId), eq(u.parentEnlaceId, actorId)));
}

/** Por qué no se puede sumar a esta persona a un equipo sobre el que ya se tiene permiso; `null` si se puede. */
export async function motivoParaNoSumar(permiso: PermisoSobreIntegrantes, actorId: string, userId: string): Promise<string | null> {
  if (permiso.esAdmin) {
    if (permiso.scope.isMaster || (permiso.scope.allowedUserIds ?? []).includes(userId)) return null;
    return "Solo puedes sumar a personas activas de tu municipio.";
  }
  const persona = await getDatabaseClient().query.userProfiles.findFirst({
    where: and(eq(schema.userProfiles.id, userId), condicionDePersonasQuePuedeSumar(permiso.scope, actorId)),
    columns: { id: true }
  });
  return persona ? null : "Solo puedes agregar a personas activas que tú invitaste";
}

export type PersonaDelTablero = {
  id: string;
  nombre: string;
  foto: string | null;
  rol: string | null;
  /** En cuántos equipos está (como integrante o al frente), contando los que no se ven aquí. */
  equipos: number;
};

export type ColumnaDelTablero = {
  id: string;
  nombre: string;
  municipio: { nombre: string; esGeneral: boolean };
  lider: { id: string; nombre: string; foto: string | null } | null;
  integrantes: PersonaDelTablero[];
};

export type Tablero = { columnas: ColumnaDelTablero[]; disponibles: PersonaDelTablero[] };

/**
 * El tablero de /admin-equipos: los equipos cuyos integrantes puede cambiar quien lo abre (una columna
 * cada uno) y las personas que puede sumar. Vacío si no gobierna ningún equipo.
 */
export async function tableroDeEquipos(scope: UserNetworkScope, actorId: string): Promise<Tablero> {
  const db = getDatabaseClient();
  const t = schema.teams;
  const u = schema.userProfiles;
  const equipos = (
    await db
      .select({
        id: t.id,
        nombre: t.name,
        liderId: t.leaderId,
        municipio: schema.municipalities.name,
        municipioTipo: schema.municipalities.kind
      })
      .from(t)
      .innerJoin(schema.municipalities, eq(schema.municipalities.id, t.municipalityId))
      .where(scope.isAdmin ? condicionDeEquipos(scope) : eq(t.leaderId, actorId))
      .orderBy(t.name)
  ).filter((e) => (scope.isAdmin ? puedeEditarEquipo(scope, e.id) : e.liderId === actorId));
  if (equipos.length === 0) return { columnas: [], disponibles: [] };

  const [integrantes, disponibles] = await Promise.all([
    db
      .select({ equipo: schema.teamMembers.teamId, id: u.id, nombre: u.displayName, foto: u.photoUrl, rol: schema.roles.name })
      .from(schema.teamMembers)
      .innerJoin(u, eq(u.id, schema.teamMembers.userId))
      .leftJoin(schema.roles, eq(schema.roles.id, u.roleId))
      .where(inArray(schema.teamMembers.teamId, equipos.map((e) => e.id))),
    db
      .select({ id: u.id, nombre: u.displayName, foto: u.photoUrl, rol: schema.roles.name })
      .from(u)
      .leftJoin(schema.roles, eq(schema.roles.id, u.roleId))
      .where(and(eq(u.status, "active"), condicionDePersonasQuePuedeSumar(scope, actorId)))
      .orderBy(u.displayName)
  ]);

  const lideres = equipos.map((e) => e.liderId).filter((x): x is string => Boolean(x));
  const personas = [...new Set([...disponibles.map((d) => d.id), ...integrantes.map((i) => i.id), ...lideres])];
  const [membresias, alFrente, datosDeLideres] = personas.length
    ? await Promise.all([
        db.select({ persona: schema.teamMembers.userId, equipo: schema.teamMembers.teamId }).from(schema.teamMembers).where(inArray(schema.teamMembers.userId, personas)),
        db.select({ persona: t.leaderId, equipo: t.id }).from(t).where(inArray(t.leaderId, personas)),
        lideres.length
          ? db.select({ id: u.id, nombre: u.displayName, foto: u.photoUrl }).from(u).where(inArray(u.id, lideres))
          : Promise.resolve([] as { id: string; nombre: string; foto: string | null }[])
      ])
    : [[], [], []];
  const equiposDe = new Map<string, Set<string>>();
  for (const m of [...membresias, ...alFrente]) {
    if (!m.persona) continue;
    const s = equiposDe.get(m.persona) ?? new Set<string>();
    s.add(m.equipo);
    equiposDe.set(m.persona, s);
  }
  const persona = (p: { id: string; nombre: string; foto: string | null; rol: string | null }): PersonaDelTablero => ({
    id: p.id,
    nombre: p.nombre,
    foto: p.foto,
    rol: p.rol,
    equipos: equiposDe.get(p.id)?.size ?? 0
  });
  const lider = new Map(datosDeLideres.map((l) => [l.id, l]));

  return {
    columnas: equipos.map((e) => ({
      id: e.id,
      nombre: e.nombre,
      municipio: { nombre: e.municipio, esGeneral: e.municipioTipo === "general" },
      lider: e.liderId && lider.get(e.liderId) ? { id: e.liderId, nombre: lider.get(e.liderId)!.nombre, foto: lider.get(e.liderId)!.foto } : null,
      integrantes: integrantes
        .filter((i) => i.equipo === e.id && i.id !== e.liderId)
        .map(persona)
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
    })),
    disponibles: disponibles.map(persona)
  };
}
