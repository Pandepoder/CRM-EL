import { getDatabaseClient } from "./db-client.js";
import { schema } from "@tonala/shared/database";
import { eq, or, inArray } from "drizzle-orm";

export type AccessType = "coordinacion" | "enlace" | "conexion";

export interface UserNetworkScope {
  accessType: AccessType;
  roleKey: string;
  allowedUserIds: string[] | null; // null means GLOBAL (coordinacion/admin/direction)
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
 * - Líder (territorial_coordinator): sus equipos y la red que dependen de él.
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
      roleKey: schema.roles.key
    })
    .from(schema.userProfiles)
    .leftJoin(schema.roles, eq(schema.userProfiles.roleId, schema.roles.id))
    .where(eq(schema.userProfiles.id, userId))
    .limit(1);

  const roleKey = userRow[0]?.roleKey || "";
  const accessType: AccessType = (userAccessType as AccessType) || (userRow[0]?.accessType as AccessType) || "conexion";

  // 1. Solo administración tiene acceso global.
  if (roleKey === "admin") {
    return {
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

  // 5. Find invited/network conexiones (direct downline)
  const conexiones = await db
    .select({ id: schema.userProfiles.id })
    .from(schema.userProfiles)
    .where(
      or(
        eq(schema.userProfiles.parentEnlaceId, userId),
        eq(schema.userProfiles.invitedByUserId, userId)
      )
    );
  const conexionIds = conexiones.map((c) => c.id);

  // Combine allowed user IDs for contact and activity visibility
  const allNetworkUserIds = Array.from(
    new Set([...teammateUserIds, ...conexionIds])
  );

  // If Líder (territorial_coordinator) or Enlace accessType
  if (isLeader || accessType === "enlace" || accessType === "coordinacion") {
    return {
      accessType: isLeader ? "enlace" : accessType,
      roleKey,
      allowedUserIds: allNetworkUserIds.length > 0 ? allNetworkUserIds : [userId],
      teammateUserIds: allNetworkUserIds.length > 0 ? allNetworkUserIds : [userId],
      teamIds: allTeamIds,
      isGlobal: false,
      isLeader: true
    };
  }

  // Conexión / Brigadista / Coordinador Territorial in a brigade
  return {
    accessType: "conexion",
    roleKey,
    allowedUserIds: allNetworkUserIds.length > 0 ? allNetworkUserIds : [userId],
    teammateUserIds: allNetworkUserIds.length > 0 ? allNetworkUserIds : [userId],
    teamIds: allTeamIds,
    isGlobal: false,
    isLeader: false
  };
}
