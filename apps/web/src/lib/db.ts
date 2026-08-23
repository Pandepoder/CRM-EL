import pg from "pg";

import { loadAppEnv } from "@tonala/config";

// Singleton que sobrevive hot-reload de Next.js en desarrollo.
// En producción el proceso no recarga, así que el comportamiento es idéntico.
declare global {
  var __tonalaDbPool: pg.Pool | undefined;
}

export function getDatabasePool(): pg.Pool {
  if (!global.__tonalaDbPool) {
    const env = loadAppEnv();
    global.__tonalaDbPool = new pg.Pool({
      connectionString: env.private.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000
    });
  }
  return global.__tonalaDbPool;
}
