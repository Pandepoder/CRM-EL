import "dotenv/config";

import pg from "pg";

import { loadAppEnv } from "../../packages/config/index.js";

const env = loadAppEnv();
const pool = new pg.Pool({ connectionString: env.private.DATABASE_URL });

try {
  const result = await pool.query<{ now: Date }>("SELECT now()");
  console.warn(`Database reachable: ${result.rows[0]?.now.toISOString() ?? "unknown time"}`);
} finally {
  await pool.end();
}
