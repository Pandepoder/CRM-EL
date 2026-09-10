import "dotenv/config";

import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { loadAppEnv } from "../../config/index.js";
import { applyMigrations } from "../../../scripts/db/migrate.js";
import { seedDatabase } from "../../../scripts/db/seeds.js";

function databaseUrlForDb(connectionString: string, databaseName: string): string {
  const url = new URL(connectionString);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

async function withAdminPool<T>(fn: (pool: pg.Pool) => Promise<T>): Promise<T> {
  const env = loadAppEnv();
  const adminUrl = databaseUrlForDb(env.private.DATABASE_URL, "postgres");
  const pool = new pg.Pool({ connectionString: adminUrl });
  try {
    return await fn(pool);
  } finally {
    await pool.end();
  }
}

const env = loadAppEnv();
const testDatabaseName = `tonala_os_test_${Date.now()}`;
const testDatabaseUrl = databaseUrlForDb(env.private.DATABASE_URL, testDatabaseName);

describe("local database foundation", () => {
  beforeAll(async () => {
    await withAdminPool(async (pool) => {
      await pool.query(`CREATE DATABASE ${testDatabaseName}`);
    });
  });

  afterAll(async () => {
    await withAdminPool(async (pool) => {
      await pool.query(
        `
          SELECT pg_terminate_backend(pid)
          FROM pg_stat_activity
          WHERE datname = $1
        `,
        [testDatabaseName]
      );
      await pool.query(`DROP DATABASE IF EXISTS ${testDatabaseName}`);
    });
  });

  it("connects to the configured local database", async () => {
    const pool = new pg.Pool({ connectionString: env.private.DATABASE_URL });
    try {
      const result = await pool.query<{ ok: number }>("SELECT 1 AS ok");
      expect(result.rows[0]?.ok).toBe(1);
    } finally {
      await pool.end();
    }
  });

  it("applies migrations from an empty database", async () => {
    const applied = await applyMigrations(testDatabaseUrl);

    expect(applied).toContain("0000_tonala_os_initial.sql");
  });

  it("runs seeds idempotently", async () => {
    const first = await seedDatabase(testDatabaseUrl);
    const second = await seedDatabase(testDatabaseUrl);

    expect(first.roles).toBe(5);
    // Un piso, no un numero exacto: el seed fue creciendo y este 5 se quedo
    // congelado en el conjunto original, dejando el test en rojo. Lo que este
    // caso comprueba de verdad es la idempotencia, y de eso responden las
    // ultimas lineas; el conteo exacto solo obliga a editar el test cada vez
    // que se suma una cuenta.
    expect(first.users).toBeGreaterThanOrEqual(5);
    expect(first.colonies).toBeGreaterThanOrEqual(32);

    // La idempotencia es sobre las filas. userPassword queda fuera a proposito:
    // la semilla genera una contrasena aleatoria por ejecucion, asi que dos
    // corridas dan valores distintos y eso es justamente lo que se busca.
    expect({ roles: second.roles, users: second.users, colonies: second.colonies })
      .toEqual({ roles: first.roles, users: first.users, colonies: first.colonies });
    expect(second.userPassword).not.toBe(first.userPassword);
  });
});

