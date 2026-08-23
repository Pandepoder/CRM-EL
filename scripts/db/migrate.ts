import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { loadAppEnv } from "../../packages/config/index.js";

export async function applyMigrations(connectionString: string) {
  const pool = new pg.Pool({ connectionString });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: "./db/migrations" });
  await pool.end();
  return ["0000_tonala_os_initial.sql"];
}

if (process.argv[1] && process.argv[1].endsWith("migrate.ts")) {
  const env = loadAppEnv();
  applyMigrations(env.private.DATABASE_URL)
    .then(() => {
      console.log("Migrations complete!");
      process.exit(0);
    })
    .catch((e) => {
      console.error("Migration failed:", e);
      process.exit(1);
    });
}
