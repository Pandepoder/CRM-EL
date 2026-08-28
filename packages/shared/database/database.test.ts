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
    expect(first.users).toBe(5);
    expect(first.colonies).toBeGreaterThanOrEqual(32);
    expect(second).toEqual(first);
  });
});

