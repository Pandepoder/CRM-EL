import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

/**
 * Hosts considered safe to skip confirmation for. Deliberately does NOT include
 * the docker-compose service name "db" — per .env.production.example, production
 * deployments (docker compose exec web pnpm db:clean) also resolve DATABASE_URL's
 * host to "db", so that name is not a reliable signal of "this is a dev machine".
 * Only a database reachable at localhost (i.e. someone running the script directly
 * on their own machine against the port-mapped local Postgres) is treated as safe.
 */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function parseDbTarget(databaseUrl: string): { host: string; database: string } {
  const url = new URL(databaseUrl);
  return { host: url.hostname, database: url.pathname.replace(/^\//, "") };
}

/**
 * Blocks a destructive, irreversible database operation unless the target is a
 * recognized local host, or the operator explicitly confirms the target database
 * by name (interactively, or via --yes + CONFIRM_DB=<database> for scripted use).
 */
export async function confirmDestructiveOperation(options: {
  databaseUrl: string;
  actionLabel: string;
}): Promise<void> {
  const { host, database } = parseDbTarget(options.databaseUrl);
  const isLocalHost = LOCAL_HOSTS.has(host);

  console.log("=================================================");
  console.log(`⚠️  Operación destructiva e irreversible: ${options.actionLabel}`);
  console.log(`    Host de base de datos: ${host}`);
  console.log(`    Base de datos:         ${database}`);
  console.log("=================================================");

  if (isLocalHost) {
    console.log("Host reconocido como local (localhost) — continuando sin confirmación adicional.");
    return;
  }

  const argsHaveYes = process.argv.includes("--yes");
  const confirmEnv = process.env.CONFIRM_DB;

  if (argsHaveYes && confirmEnv === database) {
    console.log("Confirmación no interactiva recibida (--yes + CONFIRM_DB coincide con la base de datos). Continuando...");
    return;
  }

  if (!stdin.isTTY) {
    throw new Error(
      `El host "${host}" no es local y no hay una terminal interactiva para confirmar.\n` +
        `Para ejecutar esta operación de todos modos, vuelve a correrla así:\n` +
        `  CONFIRM_DB=${database} pnpm <script> --yes\n` +
        "(esta confirmación existe a propósito: la operación borra datos de forma irreversible)"
    );
  }

  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question(
      `Este host NO es local. Escribe el nombre exacto de la base de datos ("${database}") para confirmar: `
    );
    if (answer.trim() !== database) {
      throw new Error("La confirmación no coincide con el nombre de la base de datos. Abortando sin hacer cambios.");
    }
  } finally {
    rl.close();
  }
}
