import { type Database } from "@tonala/shared/database";

import type { UsersReader } from "../contracts/index.js";
import { DrizzleUsersReader } from "../infrastructure/drizzle-users.js";

export function createUsersReader(db: Database): UsersReader {
  return new DrizzleUsersReader(db);
}

// `changeUserRole` se retiró en la etapa 6: bastaba ser administración para cambiar cualquier rol,
// también el de otro administrador (A2). Las reglas viven ahora en apps/web/src/lib/gobierno-de-cuentas.ts,
// que sabe de municipios.

export const governanceApplicationName = "governance-application";
