import { cache } from "react";

import { getDatabaseClient } from "./db-client.js";
import { schema } from "@tonala/shared/database";
import { eq, inArray } from "drizzle-orm";

export type AccessType = "coordinacion" | "enlace" | "conexion";

export interface UserNetworkScope {
  /** A quién pertenece este alcance: con él se reconoce lo que la persona registró o tiene asignado. */
  userId: string;
  accessType: AccessType;
  roleKey: string;
  allowedUserIds: string[] | null; // null solo para administración activa; [] = sin acceso
  /** Las mismas personas que allowedUserIds: la persona, sus compañeros y quienes están bajo su mando. */
  teammateUserIds: string[];
  /** Equipos a los que pertenece más los que están bajo su mando, en cascada. */
  teamIds: string[];
  /** Solo los equipos bajo su mando: los que lidera (o le asignaron, si es dirección) y las brigadas que cuelgan de ellos. */
  commandTeamIds: string[];
  /**
   * Los equipos desde los que manda: los que lidera, o los que le asignaron si es dirección. Su
   * territorio es el que responde por toda la estructura que cuelga de ellos (una coordinación
   * cubre su municipio aunque sus brigadas tengan solo unas secciones).
   */
  commandRootTeamIds: string[];
  isGlobal: boolean;
  isLeader: boolean;
}

/**
 * Hasta cuántos niveles baja la cascada de mando. La estructura real tiene dos (dirección →
 * coordinación → brigada); el tope solo evita recorrer de más si alguien arma una cadena
 * absurda. Los ciclos (A lidera a B y B lidera a A) se cortan con los equipos ya visitados.
 */
const MAX_NIVELES_DE_MANDO = 8;

/**
 * Resuelve el alcance de un usuario: a qué otros usuarios y equipos puede ver.
 *
 * - Administración: vista global de todo el sistema. Es la única.
 * - Mando: los equipos que la persona lidera y, en cascada, las brigadas que lideran los
 *   integrantes de esos equipos. Así dirección ve su coordinación, a los líderes que la forman
 *   y a los integrantes de las brigadas de esos líderes, pero nada de otra dirección. A
 *   dirección también le cuentan como mando los equipos donde un administrador la puso como
 *   integrante.
 * - Pertenencia: en los equipos donde la persona es integrante sin mandar ve a sus compañeros
 *   (el líder y los demás integrantes), pero no baja a las brigadas de ellos: nadie ve
 *   integrantes de brigadas que no estén bajo su mando.
 *
 * La cascada sigue la estructura aunque el eslabón esté dado de baja (una brigada no deja de
 * ser de su coordinación porque su líder cause baja); lo que se ve, en cambio, son solo
 * personas activas. Administración no hace de eslabón: sus equipos no se cuelgan de nadie.
 * Invitaciones y accessType no dan acceso.
 */
export const resolveUserNetworkScope = cache(resolverAlcance);

/**
 * Resolverlo cuesta una decena de consultas para quien manda, y cada pantalla lo pedía de nuevo:
 * el layout, la página y cada ruta de la API. `cache` de React lo comparte dentro de la misma
 * petición, como ya se hace con el municipio del usuario.
 */
async function resolverAlcance(
  userId: string,
  userAccessType?: string | null
): Promise<UserNetworkScope> {
  const db = getDatabaseClient();

  const userRow = await db
    .select({
      id: schema.userProfiles.id,
      accessType: schema.userProfiles.accessType,
      status: schema.userProfiles.status,
      roleKey: schema.roles.key
    })
    .from(schema.userProfiles)
    .leftJoin(schema.roles, eq(schema.userProfiles.roleId, schema.roles.id))
    .where(eq(schema.userProfiles.id, userId))
    .limit(1);

  const roleKey = userRow[0]?.roleKey || "";
  const accessType: AccessType = (userAccessType as AccessType) || (userRow[0]?.accessType as AccessType) || "conexion";

  // Una sesión de alguien dado de baja (o inexistente) no concede nada. Antes se lanzaba un
  // error, y las páginas que leen la sesión directamente respondían 500 en vez de mostrar una
  // vista vacía; las rutas de la API ya lo cortan antes con actorFromSession.
  if (!userRow[0] || userRow[0].status !== "active") {
    return {
      userId,
      accessType: "conexion",
      roleKey,
      allowedUserIds: [],
      teammateUserIds: [],
      teamIds: [],
      commandTeamIds: [],
      commandRootTeamIds: [],
      isGlobal: false,
      isLeader: false
    };
  }

  // 1. Solo administración tiene acceso global.
  if (roleKey === "admin") {
    return {
      userId,
      accessType: "coordinacion",
      roleKey,
      allowedUserIds: null,
      teammateUserIds: [userId],
      teamIds: [],
      commandTeamIds: [],
      commandRootTeamIds: [],
      isGlobal: true,
      isLeader: true
    };
  }

  // 2. Equipos que lidera y equipos a los que pertenece.
  const [ledTeams, memberTeams] = await Promise.all([
    db.select({ id: schema.teams.id }).from(schema.teams).where(eq(schema.teams.leaderId, userId)),
    db.select({ teamId: schema.teamMembers.teamId }).from(schema.teamMembers).where(eq(schema.teamMembers.userId, userId))
  ]);
  const idsLiderados = ledTeams.map((t) => t.id);
  const idsDondeEsIntegrante = memberTeams.map((m) => m.teamId);

  // 3. Mando en cascada. A dirección le cuentan como mando también los equipos donde la
  //    pusieron como integrante: un administrador la asigna a coordinar ahí.
  const raices = [...new Set(roleKey === "direction" ? [...idsLiderados, ...idsDondeEsIntegrante] : idsLiderados)];
  const mando = new Set<string>(raices);
  const personasPorEquipo = new Map<string, string[]>();
  let frontera = [...mando];

  for (let nivel = 0; frontera.length > 0 && nivel <= MAX_NIVELES_DE_MANDO; nivel++) {
    const personas = await personasDeEquipos(frontera);
    for (const [equipo, { lider, integrantes }] of personas) personasPorEquipo.set(equipo, [lider, ...integrantes]);

    // Nadie más baja de aquí: se alcanzó el tope y lo que ya está en `mando` se queda.
    if (nivel === MAX_NIVELES_DE_MANDO) break;

    // Los eslabones son los integrantes, no el líder: el líder de un equipo bajo mando es la
    // propia persona o alguien que ya fue eslabón en el nivel anterior. Si dirección está como
    // integrante en un equipo ajeno, su líder no queda bajo su mando ni arrastra sus brigadas.
    const integrantesDeFrontera = [...new Set([...personas.values()].flatMap((p) => p.integrantes))];
    const eslabones = await sinAdministracion(integrantesDeFrontera.filter((id) => id !== userId));
    if (eslabones.length === 0) break;

    const brigadas = await db
      .select({ id: schema.teams.id })
      .from(schema.teams)
      .where(inArray(schema.teams.leaderId, eslabones));
    frontera = brigadas.map((b) => b.id).filter((id) => !mando.has(id));
    for (const id of frontera) mando.add(id);
  }

  // 4. Equipos donde solo es integrante: ve a sus compañeros, sin bajar a sus brigadas.
  const soloIntegrante = idsDondeEsIntegrante.filter((id) => !mando.has(id));
  if (soloIntegrante.length > 0) {
    for (const [equipo, { lider, integrantes }] of await personasDeEquipos(soloIntegrante)) {
      personasPorEquipo.set(equipo, [lider, ...integrantes]);
    }
  }

  const allTeamIds = [...new Set([...mando, ...idsDondeEsIntegrante])];
  const candidatos = [...new Set([...personasPorEquipo.values()].flat())].filter((id) => id !== userId);

  // Se ven solo personas activas y que no sean administración.
  const activos = await activosSinAdministracion(candidatos);
  const allowed = [userId, ...activos];

  const isLeader = roleKey === "territorial_coordinator" || roleKey === "direction" || idsLiderados.length > 0;

  return {
    userId,
    accessType,
    roleKey,
    allowedUserIds: allowed,
    teammateUserIds: allowed,
    teamIds: allTeamIds,
    commandTeamIds: [...mando],
    commandRootTeamIds: raices,
    isGlobal: false,
    isLeader
  };
}

/** Líder e integrantes de cada equipo, sin importar su estado. */
async function personasDeEquipos(teamIds: string[]): Promise<Map<string, { lider: string; integrantes: string[] }>> {
  const resultado = new Map<string, { lider: string; integrantes: string[] }>();
  if (teamIds.length === 0) return resultado;
  const db = getDatabaseClient();

  const [integrantes, lideres] = await Promise.all([
    db
      .select({ teamId: schema.teamMembers.teamId, userId: schema.teamMembers.userId })
      .from(schema.teamMembers)
      .where(inArray(schema.teamMembers.teamId, teamIds)),
    db.select({ id: schema.teams.id, leaderId: schema.teams.leaderId }).from(schema.teams).where(inArray(schema.teams.id, teamIds))
  ]);

  for (const equipo of lideres) resultado.set(equipo.id, { lider: equipo.leaderId, integrantes: [] });
  for (const fila of integrantes) resultado.get(fila.teamId)?.integrantes.push(fila.userId);
  return resultado;
}

async function rolesDe(userIds: string[]) {
  if (userIds.length === 0) return [];
  const db = getDatabaseClient();
  return db
    .select({ id: schema.userProfiles.id, status: schema.userProfiles.status, roleKey: schema.roles.key })
    .from(schema.userProfiles)
    .leftJoin(schema.roles, eq(schema.userProfiles.roleId, schema.roles.id))
    .where(inArray(schema.userProfiles.id, userIds));
}

/** Eslabones de la cascada: cualquier estado, menos administración. */
async function sinAdministracion(userIds: string[]): Promise<string[]> {
  return (await rolesDe(userIds)).filter((u) => u.roleKey !== "admin").map((u) => u.id);
}

async function activosSinAdministracion(userIds: string[]): Promise<string[]> {
  return (await rolesDe(userIds)).filter((u) => u.status === "active" && u.roleKey !== "admin").map((u) => u.id);
}
