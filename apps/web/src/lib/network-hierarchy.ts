import { cache } from "react";

import { getDatabaseClient } from "./db-client.js";
import { schema } from "@tonala/shared/database";
import { and, eq, inArray } from "drizzle-orm";

export type AccessType = "coordinacion" | "enlace" | "conexion";

export interface UserNetworkScope {
  /** A quién pertenece este alcance: con él se reconoce lo que la persona registró o tiene asignado. */
  userId: string;
  accessType: AccessType;
  roleKey: string;
  /**
   * Administración: el maestro o un administrador municipal. Dice lo que puede HACER (dar de baja,
   * gestionar equipos y cuentas…), no lo que ve: eso lo deciden `isMaster` y `adminMunicipalityId`,
   * y cada acción de administración se hace solo sobre lo que ve.
   *
   * Sustituye a `isGlobal`, que quería decir las dos cosas a la vez («es administración» y «lo ve
   * todo»): con administradores por municipio dejaron de coincidir, y se quitó para que ninguna de
   * las ~50 llamadas que lo usaban siguiera leyendo «ve todo» donde ya no lo es (A1).
   */
  isAdmin: boolean;
  /** Solo el administrador maestro (0023): ve los 125 municipios sin recorte. */
  isMaster: boolean;
  /**
   * La llave del municipio que gobierna un administrador municipal. `null` para el maestro, para
   * quien no es administración y para un administrador que sigue sin municipio (la 0022 lo dejó en
   * General): ese no ve más que lo suyo hasta que el maestro se lo asigna.
   */
  adminMunicipalityId: string | null;
  /**
   * `null` solo para el maestro; [] = sin acceso. Para un administrador municipal, las personas activas
   * de su municipio; para el resto, las de su cascada de mando.
   */
  allowedUserIds: string[] | null;
  /**
   * La llave de municipio de la propia persona, si es un municipio real (no General). Sirve para lo
   * que es «de su municipio» sin ser administración, como las opciones de catálogo (A10).
   */
  userMunicipalityId: string | null;
  /** Las mismas personas que allowedUserIds: la persona, quienes están bajo su mando y, si es capturista, sus compañeros. */
  teammateUserIds: string[];
  /**
   * Solo quienes están bajo su mando, y la propia persona: los compañeros de un equipo donde solo es
   * integrante NO cuentan. Ver no es trabajar: en la coordinación, un líder ve lo que registró otro
   * líder (son compañeros), pero no se lo modifica. Es la lista para «quien manda trabaja lo de su
   * gente» (incidencias). Administración: la misma que `allowedUserIds` (`null` para el maestro).
   */
  commandUserIds: string[] | null;
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
 * - Administrador maestro: todo el sistema, los 125 municipios. Es el único.
 * - Administrador municipal: todo lo que tiene la llave de su municipio, y lo que registró o tiene
 *   asignado su gente (las personas con esa llave) aunque sea de otro municipio —lo mismo que ve el
 *   líder de una brigada de lo suyo—. Ver `condicion*` en contact-visibility, incident-visibility y
 *   alcance-municipal.
 * - Administrador sin municipio (lo que la 0022 dejó en General): solo lo suyo.
 * - Mando: los equipos que la persona lidera y, en cascada, las brigadas que lideran los
 *   integrantes de esos equipos. Así dirección ve su coordinación, a los líderes que la forman
 *   y a los integrantes de las brigadas de esos líderes, pero nada de otra dirección. A
 *   dirección también le cuentan como mando los equipos donde un administrador la puso como
 *   integrante.
 * - Pertenencia: en los equipos donde la persona es integrante sin mandar, solo el capturista ve
 *   lo de sus compañeros (el líder y los demás integrantes), porque captura y convierte prospectos
 *   para su brigada; tampoco él baja a las brigadas de ellos. El líder no ve lo de los otros líderes
 *   de su coordinación, y el brigadista ve solo lo suyo y lo que le asignan, a él o a su brigada
 *   (decisión del dueño del 2026-09-25, tras el simulacro de evento: como el registro por QR queda a
 *   nombre del dueño del enlace, «ver a los compañeros» era ver el evento entero de otro líder, y un
 *   brigadista recién aceptado veía todo el padrón de su líder).
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
async function resolverAlcance(userId: string): Promise<UserNetworkScope> {
  // Un solo argumento a propósito: `cache` memoiza por argumentos, y las pantallas que pasaban
  // además el `accessType` resolvían el alcance dos veces por petición, porque el layout lo pide
  // solo con el id (M7). El `accessType` ya no decide nada: sale de la base.
  const db = getDatabaseClient();

  const userRow = await db
    .select({
      id: schema.userProfiles.id,
      accessType: schema.userProfiles.accessType,
      status: schema.userProfiles.status,
      roleKey: schema.roles.key,
      isMasterAdmin: schema.userProfiles.isMasterAdmin,
      municipalityId: schema.userProfiles.municipalityId,
      municipioTipo: schema.municipalities.kind
    })
    .from(schema.userProfiles)
    .leftJoin(schema.roles, eq(schema.userProfiles.roleId, schema.roles.id))
    .leftJoin(schema.municipalities, eq(schema.userProfiles.municipalityId, schema.municipalities.id))
    .where(eq(schema.userProfiles.id, userId))
    .limit(1);

  const roleKey = userRow[0]?.roleKey || "";
  const accessType: AccessType = (userRow[0]?.accessType as AccessType) || "conexion";

  // Una sesión de alguien dado de baja (o inexistente) no concede nada. Antes se lanzaba un
  // error, y las páginas que leen la sesión directamente respondían 500 en vez de mostrar una
  // vista vacía; las rutas de la API ya lo cortan antes con actorFromSession.
  if (!userRow[0] || userRow[0].status !== "active") {
    return {
      userId,
      accessType: "conexion",
      roleKey,
      allowedUserIds: [],
      userMunicipalityId: null,
      teammateUserIds: [],
      commandUserIds: [],
      teamIds: [],
      commandTeamIds: [],
      commandRootTeamIds: [],
      isAdmin: false,
      isMaster: false,
      adminMunicipalityId: null,
      isLeader: false
    };
  }

  const municipioPropio = userRow[0].municipioTipo === "municipio" ? userRow[0].municipalityId : null;

  // 1. Administración: el maestro lo ve todo; un administrador municipal, su municipio.
  if (roleKey === "admin") {
    const base = {
      userMunicipalityId: municipioPropio,
      userId,
      accessType: "coordinacion" as const,
      roleKey,
      isAdmin: true,
      commandRootTeamIds: [],
      isLeader: true
    };
    if (userRow[0].isMasterAdmin) {
      return { ...base, isMaster: true, adminMunicipalityId: null, allowedUserIds: null, teammateUserIds: [userId], commandUserIds: null, teamIds: [], commandTeamIds: [] };
    }
    const municipio = municipioPropio;
    if (!municipio) {
      return { ...base, isMaster: false, adminMunicipalityId: null, allowedUserIds: [userId], teammateUserIds: [userId], commandUserIds: [userId], teamIds: [], commandTeamIds: [] };
    }
    const [gente, equipos] = await Promise.all([
      db
        .select({ id: schema.userProfiles.id })
        .from(schema.userProfiles)
        .where(and(eq(schema.userProfiles.municipalityId, municipio), eq(schema.userProfiles.status, "active"))),
      db.select({ id: schema.teams.id }).from(schema.teams).where(eq(schema.teams.municipalityId, municipio))
    ]);
    const personas = [userId, ...gente.map((g) => g.id).filter((id) => id !== userId)];
    const idsDeEquipos = equipos.map((e) => e.id);
    return {
      ...base,
      isMaster: false,
      adminMunicipalityId: municipio,
      allowedUserIds: personas,
      teammateUserIds: personas,
      commandUserIds: personas,
      teamIds: idsDeEquipos,
      commandTeamIds: idsDeEquipos
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

  // Quienes están bajo su mando, antes de sumar a los compañeros de los equipos donde solo es integrante.
  const deSuMando = new Set([...mando].flatMap((equipo) => personasPorEquipo.get(equipo) ?? []));

  // 4. Equipos donde solo es integrante: el capturista ve a sus compañeros, sin bajar a sus brigadas.
  //    El líder y el brigadista no (ver arriba): los equipos siguen en `teamIds`, así que ven lo
  //    asignado al equipo, pero no lo que registró cada compañero.
  const soloIntegrante = idsDondeEsIntegrante.filter((id) => !mando.has(id));
  if (soloIntegrante.length > 0 && roleKey === "capturist") {
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
    commandUserIds: [userId, ...activos.filter((id) => deSuMando.has(id))],
    teamIds: allTeamIds,
    commandTeamIds: [...mando],
    commandRootTeamIds: raices,
    userMunicipalityId: municipioPropio,
    isAdmin: false,
    isMaster: false,
    adminMunicipalityId: null,
    isLeader
  };
}

/** Ver `packages/shared/database/municipios.ts`. */
export { genteDelMunicipio } from "@tonala/shared/database";

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
