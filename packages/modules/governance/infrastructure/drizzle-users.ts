import { eq, desc } from "drizzle-orm";
import { type Database } from "@tonala/shared/database";

import { schema } from "@tonala/shared/database";
const { userProfiles, roles } = schema;

import type { UserSummary, UsersReader } from "../contracts/index.js";

export class DrizzleUsersReader implements UsersReader {
  constructor(private readonly db: Database) {}

  async listUsers(): Promise<UserSummary[]> {
    const records = await this.db
      .select({
        userId: userProfiles.id,
        email: userProfiles.email,
        displayName: userProfiles.displayName,
        roleId: userProfiles.roleId,
        roleKey: roles.key,
        roleName: roles.name,
        status: userProfiles.status,
        createdAt: userProfiles.createdAt
      })
      .from(userProfiles)
      .innerJoin(roles, eq(roles.id, userProfiles.roleId))
      .orderBy(desc(userProfiles.createdAt));

    return records.map((record) => ({
      ...record,
      createdAt: record.createdAt.toISOString()
    }));
  }

  async getUserById(userId: string): Promise<UserSummary | null> {
    const records = await this.db
      .select({
        userId: userProfiles.id,
        email: userProfiles.email,
        displayName: userProfiles.displayName,
        roleId: userProfiles.roleId,
        roleKey: roles.key,
        roleName: roles.name,
        status: userProfiles.status,
        createdAt: userProfiles.createdAt
      })
      .from(userProfiles)
      .innerJoin(roles, eq(roles.id, userProfiles.roleId))
      .where(eq(userProfiles.id, userId))
      .limit(1);

    const record = records[0];
    if (!record) return null;

    return {
      ...record,
      createdAt: record.createdAt.toISOString()
    };
  }
}
