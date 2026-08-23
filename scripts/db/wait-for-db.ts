import "dotenv/config";

import pg from "pg";

import { loadAppEnv } from "../../packages/config/index.js";

const env = loadAppEnv();
const maxAttempts = 30;
const delayMs = 1000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  const pool = new pg.Pool({ connectionString: env.private.DATABASE_URL });
  try {
    await pool.query("SELECT 1");
    await pool.end();
    console.warn("Database is ready.");
    process.exit(0);
  } catch (error) {
    await pool.end().catch(() => undefined);
    if (attempt === maxAttempts) {
      throw error;
    }
    await delay(delayMs);
  }
}
