import { getDatabaseClient } from "./db-client.js";
import { schema } from "@tonala/shared/database";
import { eq, or, inArray } from "drizzle-orm";

export type AccessType = "coordinacion" | "enlace" | "conexion";

export interface UserNetworkScope {
  accessType: AccessType;
  allowedUserIds: string[] | null; // null means GLOBAL (coordinacion)
  isGlobal: boolean;
}

/**
 * Resolves the hierarchical user IDs that a user is permitted to see according to ElApp 3-tier access rules:
 * - Coordinación: null (can see all records in the municipality)
 * - Enlace: [userId, ...conectionIds] (own records + all records uploaded by Conexiones in their network)
 * - Conexión: [userId] (strictly only their own registered records)
 */
export async function resolveUserNetworkScope(
  userId: string,
  userAccessType?: string | null
): Promise<UserNetworkScope> {
  const db = getDatabaseClient();

  // If accessType not provided, fetch from DB
  let accessType: AccessType = (userAccessType as AccessType) || "conexion";

  if (!userAccessType) {
    const userRow = await db
      .select({
        accessType: schema.userProfiles.accessType,
        roleKey: schema.roles.key
      })
      .from(schema.userProfiles)
      .leftJoin(schema.roles, eq(schema.userProfiles.roleId, schema.roles.id))
      .where(eq(schema.userProfiles.id, userId))
      .limit(1);

    if (userRow[0]) {
      if (userRow[0].accessType) {
        accessType = userRow[0].accessType as AccessType;
      } else if (userRow[0].roleKey === "admin" || userRow[0].roleKey === "direction") {
        accessType = "coordinacion";
      }
    }
  }

  // 1. Coordinación has global view
  if (accessType === "coordinacion") {
    return {
      accessType: "coordinacion",
      allowedUserIds: null,
      isGlobal: true
    };
  }

  // 2. Enlace sees themselves + all Conexiones in their network
  if (accessType === "enlace") {
    const conexiones = await db
      .select({ id: schema.userProfiles.id })
      .from(schema.userProfiles)
      .where(
        or(
          eq(schema.userProfiles.parentEnlaceId, userId),
          eq(schema.userProfiles.invitedByUserId, userId)
        )
      );

    // Also include team members if this Enlace leads a team
    const teamRows = await db
      .select({ id: schema.teams.id })
      .from(schema.teams)
      .where(eq(schema.teams.leaderId, userId));

    const teamMemberIds: string[] = [];
    if (teamRows.length > 0) {
      const teamIds = teamRows.map((t: { id: string }) => t.id);
      const members = await db
        .select({ userId: schema.teamMembers.userId })
        .from(schema.teamMembers)
        .where(inArray(schema.teamMembers.teamId, teamIds));
      teamMemberIds.push(...members.map((m: { userId: string }) => m.userId));
    }

    const allNetworkUserIds = Array.from(
      new Set([userId, ...conexiones.map((c: { id: string }) => c.id), ...teamMemberIds])
    );

    return {
      accessType: "enlace",
      allowedUserIds: allNetworkUserIds,
      isGlobal: false
    };
  }

  // 3. Conexión strictly sees only their own records
  return {
    accessType: "conexion",
    allowedUserIds: [userId],
    isGlobal: false
  };
}
