import { getDatabaseClient } from "./db-client.js";
import { schema } from "@tonala/shared/database";
import { eq, inArray, and, ne } from "drizzle-orm";

export type AccessType = "coordinacion" | "enlace" | "conexion";

export interface UserNetworkScope {
  /** A quién pertenece este alcance: con él se reconoce lo que la persona registró o tiene asignado. */
  userId: string;
  accessType: AccessType;
  roleKey: string;
  allowedUserIds: string[] | null; // null solo para administración activa; [] = sin acceso
  teammateUserIds: string[]; // List of user IDs in the same brigade/team
  teamIds: string[]; // Teams the user leads or belongs to
  isGlobal: boolean;
  isLeader: boolean;
}

/**
 * Resuelve el alcance de un usuario: a qué otros usuarios y equipos puede ver.
 *
 * - Administración: vista global de todo el sistema.
 * - Dirección: solo los equipos que un administrador le haya asignado, y puede
 *   tener varios. Coordina dentro de ellos como un líder, pero no ve el resto
 *   de la estructura. Antes tenía vista global igual que administración.
 * - Líder (territorial_coordinator): sus equipos. Las invitaciones ya no suman alcance.
 * - Capturista y brigadista: su propio equipo y sus registros.
 */
export async function resolveUserNetworkScope(
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
      isGlobal: true,
      isLeader: true
    };
  }

  // 2. Find teams led by this user
  const ledTeams = await db
    .select({ id: schema.teams.id })
    .from(schema.teams)
    .where(eq(schema.teams.leaderId, userId));

  // 3. Find teams where this user is a member
  const memberTeams = await db
    .select({ teamId: schema.teamMembers.teamId })
    .from(schema.teamMembers)
    .where(eq(schema.teamMembers.userId, userId));

  const allTeamIds = Array.from(
    new Set([
      ...ledTeams.map((t) => t.id),
      ...memberTeams.map((m) => m.teamId)
    ])
  );

  // Dirección coordina dentro de los equipos que le asignaron, sea como líder
  // formal o como integrante: puede asignar trabajo y ver a sus compañeros de
  // equipo, pero ya no al resto de la estructura.
  const isLeader =
    roleKey === "territorial_coordinator" || roleKey === "direction" || ledTeams.length > 0;

  // 4. Find all teammates across user's teams (including leaders and members)
  let teammateUserIds: string[] = [userId];
  if (allTeamIds.length > 0) {
    const [teamMembersRows, teamsRows] = await Promise.all([
      db
        .select({ userId: schema.teamMembers.userId })
        .from(schema.teamMembers)
        .where(inArray(schema.teamMembers.teamId, allTeamIds)),
      db
        .select({ leaderId: schema.teams.leaderId })
        .from(schema.teams)
        .where(inArray(schema.teams.id, allTeamIds))
    ]);

    const memberIds = teamMembersRows.map((r) => r.userId);
    const leaderIds = teamsRows.map((r) => r.leaderId);
    teammateUserIds = Array.from(new Set([userId, ...memberIds, ...leaderIds]));
  }

  // Membership must be explicit. Invitations and accessType do not grant access.
  const activePeers = await db.select({ id: schema.userProfiles.id })
    .from(schema.userProfiles)
    .leftJoin(schema.roles, eq(schema.userProfiles.roleId, schema.roles.id))
    .where(and(inArray(schema.userProfiles.id, teammateUserIds), eq(schema.userProfiles.status, "active"), ne(schema.roles.key, "admin")));
  const allowed = Array.from(new Set([userId, ...activePeers.map(u => u.id)]));
  return { userId, accessType, roleKey, allowedUserIds: allowed, teammateUserIds: allowed,
    teamIds: allTeamIds, isGlobal: false, isLeader };
}
