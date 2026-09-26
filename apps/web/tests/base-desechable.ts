import pg from "pg";

import { loadAppEnv } from "@tonala/config";

import { applyMigrations } from "../../../scripts/db/migrate.js";
import { seedDatabase } from "../../../scripts/db/seeds.js";

/**
 * Una base vacía, con las migraciones y el catálogo de roles, solo para un archivo de pruebas.
 *
 * Las pruebas que pasan por los servicios de la aplicación (alta de ciudadano, registro público)
 * procesan el outbox al terminar, y eso mueve contadores de las proyecciones que no se pueden dejar
 * como estaban. Sobre la base de desarrollo quedaría rastro; aquí no: se borra entera al final.
 *
 * Se apunta `DATABASE_URL` a la base nueva ANTES de la primera consulta: el pool de la aplicación
 * (`getDatabasePool`) se crea la primera vez que alguien lo pide y lee la variable en ese momento.
 */
export async function crearBaseDesechable(prefijo: string) {
  const original = loadAppEnv().private.DATABASE_URL;
  const conBase = (nombre: string) => {
    const u = new URL(original);
    u.pathname = `/${nombre}`;
    return u.toString();
  };
  const nombre = `tonala_os_${prefijo}_${Date.now()}`;

  const admin = async <T>(fn: (p: pg.Pool) => Promise<T>) => {
    const p = new pg.Pool({ connectionString: conBase("postgres") });
    try {
      return await fn(p);
    } finally {
      await p.end();
    }
  };

  await admin((p) => p.query(`CREATE DATABASE ${nombre}`));
  const url = conBase(nombre);
  await applyMigrations(url);
  await seedDatabase(url);
  process.env.DATABASE_URL = url;

  return {
    url,
    async borrar() {
      // Los singletons del pool y del cliente de la aplicación (`lib/db.ts`, `lib/db-client.ts`).
      const g = globalThis as { __tonalaDbPool?: pg.Pool | undefined; __tonalaDb?: unknown };
      await g.__tonalaDbPool?.end();
      g.__tonalaDbPool = undefined;
      g.__tonalaDb = undefined;
      process.env.DATABASE_URL = original;
      await admin(async (p) => {
        await p.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`, [nombre]);
        await p.query(`DROP DATABASE IF EXISTS ${nombre}`);
      });
    }
  };
}
