import "dotenv/config";

import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { loadAppEnv } from "../../packages/config/index.js";
import * as esquema from "../../packages/shared/database/schema.js";
import { applyMigrations } from "../../scripts/db/migrate.js";

/**
 * ¿Crean las migraciones exactamente lo que declara `schema.ts`?
 *
 * Es la clase de fallo que tumbó `/resumen`: el código consultaba `event_reports.visit_id`, que
 * `schema.ts` declaraba, pero la base no tenía. Y la contraria también pasó: la base local tenía la
 * tabla `rapid_activity_prospects` sin que su migración estuviera aplicada, creada por otro camino.
 * Además las migraciones se escriben a mano —`drizzle-kit generate` ya no sirve aquí—, así que es
 * fácil tocar `schema.ts` y olvidar la migración, o al revés.
 *
 * La prueba parte de una base VACÍA y le aplica solo las migraciones: lo que haya en ella salió de
 * ahí y de nada más. Luego compara tabla por tabla y columna por columna con `schema.ts`, en los dos
 * sentidos. Corre en CI con cada cambio (`pnpm validate`), así que la diferencia se ve en el PR y no
 * en producción.
 */

function urlParaBase(url: string, nombre: string): string {
  const u = new URL(url);
  u.pathname = `/${nombre}`;
  return u.toString();
}

const env = loadAppEnv();
const nombreDeLaBase = `tonala_os_esquema_${Date.now()}`;
const urlDeLaBase = urlParaBase(env.private.DATABASE_URL, nombreDeLaBase);

async function conAdministrador<T>(fn: (pool: pg.Pool) => Promise<T>): Promise<T> {
  const pool = new pg.Pool({ connectionString: urlParaBase(env.private.DATABASE_URL, "postgres") });
  try {
    return await fn(pool);
  } finally {
    await pool.end();
  }
}

/** Tablas y columnas del esquema `public` que declara schema.ts. */
function esquemaDeclarado(): Map<string, Set<string>> {
  const declarado = new Map<string, Set<string>>();
  for (const valor of Object.values(esquema)) {
    if (!(valor instanceof PgTable)) continue;
    const config = getTableConfig(valor);
    if ((config.schema ?? "public") !== "public") continue;
    declarado.set(config.name, new Set(config.columns.map((columna) => columna.name)));
  }
  return declarado;
}

const enLaBase = new Map<string, Set<string>>();

describe("esquema declarado frente a migraciones", () => {
  beforeAll(async () => {
    await conAdministrador((pool) => pool.query(`CREATE DATABASE ${nombreDeLaBase}`));
    await applyMigrations(urlDeLaBase);

    const pool = new pg.Pool({ connectionString: urlDeLaBase });
    try {
      const { rows } = await pool.query<{ table_name: string; column_name: string }>(
        `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`
      );
      for (const fila of rows) {
        const columnas = enLaBase.get(fila.table_name) ?? new Set<string>();
        columnas.add(fila.column_name);
        enLaBase.set(fila.table_name, columnas);
      }
    } finally {
      await pool.end();
    }
  }, 120_000);

  afterAll(async () => {
    await conAdministrador(async (pool) => {
      await pool.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`, [nombreDeLaBase]);
      await pool.query(`DROP DATABASE IF EXISTS ${nombreDeLaBase}`);
    });
  });

  it("todo lo que declara schema.ts lo crea alguna migración", () => {
    const faltan: string[] = [];
    for (const [tabla, columnas] of esquemaDeclarado()) {
      const reales = enLaBase.get(tabla);
      if (!reales) {
        faltan.push(`${tabla} (la tabla entera)`);
        continue;
      }
      for (const columna of columnas) if (!reales.has(columna)) faltan.push(`${tabla}.${columna}`);
    }
    // Si esto falla: el código espera algo que ninguna migración crea. En producción, las pantallas
    // que lo usen responderían 500. Falta escribir la migración.
    expect(faltan).toEqual([]);
  });

  it("todo lo que crean las migraciones está declarado en schema.ts", () => {
    const declarado = esquemaDeclarado();
    const sobran: string[] = [];
    for (const [tabla, columnas] of enLaBase) {
      const declaradas = declarado.get(tabla);
      if (!declaradas) {
        sobran.push(`${tabla} (la tabla entera)`);
        continue;
      }
      for (const columna of columnas) if (!declaradas.has(columna)) sobran.push(`${tabla}.${columna}`);
    }
    // Si esto falla: una migración crea algo que el código no conoce. Falta declararlo en schema.ts.
    expect(sobran).toEqual([]);
  });
});
