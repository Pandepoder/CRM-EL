import {
  createDatabaseClient,
  type Database
} from "@tonala/shared/database";

import { getDatabasePool } from "@/lib/db";

declare global {
  var __tonalaDb: Database | undefined;
}

/**
 * Singleton del cliente Drizzle — sobrevive hot-reload igual que getDatabasePool().
 */
export function getDatabaseClient(): Database {
  if (!global.__tonalaDb) {
    global.__tonalaDb = createDatabaseClient(getDatabasePool());
  }
  return global.__tonalaDb;
}
