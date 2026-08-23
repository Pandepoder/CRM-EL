import { type Database } from "@tonala/shared/database";

import type { UsersReader } from "../contracts/index.js";
import { DrizzleUsersReader } from "../infrastructure/drizzle-users.js";

export function createUsersReader(db: Database): UsersReader {
  return new DrizzleUsersReader(db);
}

export { changeUserRole } from "./change-user-role.js";
export type { ChangeUserRoleDependencies, ChangeUserRoleInput } from "./change-user-role.js";

export const governanceApplicationName = "governance-application";
