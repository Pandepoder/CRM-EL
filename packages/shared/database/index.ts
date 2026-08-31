import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as schema from "./schema.js";
export * from "./schema.js";
export * from "./crypto.js";

export type DatabasePool = pg.Pool;
export type Database = ReturnType<typeof createDatabaseClient>;

export function createPgPool(connectionString: string): DatabasePool {
  return new pg.Pool({ connectionString });
}

export function createDatabaseClient(pool: DatabasePool) {
  return drizzle(pool, { schema });
}

export async function closePgPool(pool: DatabasePool | undefined | null): Promise<void> {
  if (!pool) {
    return;
  }
  await pool.end();
}

export { schema };
