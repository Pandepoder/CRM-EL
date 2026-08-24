import "dotenv/config";
import pg from "pg";
import { spawn } from "node:child_process";
import { loadAppEnv } from "../../packages/config/index.js";

function run(command: string, args: readonly string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", shell: true });
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code ?? "unknown"}`));
      }
    });
    child.on("error", reject);
  });
}

async function dropSchema() {
  const env = loadAppEnv();
  const pool = new pg.Pool({ connectionString: env.private.DATABASE_URL });
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public; DROP SCHEMA IF EXISTS drizzle CASCADE;");
  await pool.end();
}

console.log("Dropping public schema...");
await dropSchema();
console.log("Running migrations...");
await run("pnpm", ["db:migrate"]);
console.log("Running seed...");
await run("pnpm", ["db:seed"]);
