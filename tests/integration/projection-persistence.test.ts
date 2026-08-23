import "dotenv/config";

import { type SQL } from "drizzle-orm";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { loadAppEnv } from "@tonala/config";
import { closePgPool, createDatabaseClient, createPgPool, type DatabasePool } from "@tonala/shared/database";
import {
  createProjectionCheckpoint,
  createProjectionEventDescriptor,
  createProjectionIdentity,
  createProjectionName,
  createProjectionVersion,
  ProjectionStateConcurrencyConflict,
  ProjectionStatus
} from "@tonala/shared/projections";
import {
  DrizzleProjectionEventReceiptRepository,
  DrizzleProjectionRebuildReceiptRepository,
  DrizzleProjectionStateRepository
} from "@tonala/shared/projections/infrastructure";
import { applyMigrations } from "../../scripts/db/migrate.js";

type QueryResult<TRow> = { readonly rows: TRow[] };
type TxWithExecutor = Readonly<{ id: string; client: { execute<TRow extends Record<string, unknown>>(query: SQL): Promise<QueryResult<TRow>> } }>;

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
const testDatabaseName = `tonala_os_projection_test_${Date.now()}`;
const testDatabaseUrl = databaseUrlForDb(env.private.DATABASE_URL, testDatabaseName);

let pool: DatabasePool;

function db() {
  return createDatabaseClient(pool);
}

function stateRepo() {
  return new DrizzleProjectionStateRepository(db());
}

function liveReceipts() {
  return new DrizzleProjectionEventReceiptRepository(db());
}

function rebuildReceipts() {
  return new DrizzleProjectionRebuildReceiptRepository(db());
}

function mustIdentity(name = "walking_skeleton", version = "v1") {
  const projectionName = createProjectionName(name);
  const projectionVersion = createProjectionVersion(version);
  expect(projectionName.ok).toBe(true);
  expect(projectionVersion.ok).toBe(true);
  if (!projectionName.ok) throw projectionName.error;
  if (!projectionVersion.ok) throw projectionVersion.error;
  return createProjectionIdentity({
    projectionName: projectionName.value,
    projectionVersion: projectionVersion.value
  });
}

function mustDescriptor(eventName = "ContactRegistered", eventVersion = "v1") {
  const descriptor = createProjectionEventDescriptor({ eventName, eventVersion });
  expect(descriptor.ok).toBe(true);
  if (!descriptor.ok) throw descriptor.error;
  return descriptor.value;
}

async function countRows(table: string, where = "true"): Promise<number> {
  const result = await pool.query<{ count: number }>(`SELECT count(*)::int AS count FROM ${table} WHERE ${where}`);
  return result.rows[0]?.count ?? 0;
}

async function cleanProjectionTables(): Promise<void> {
  await pool.query("TRUNCATE projection_rebuild_receipts, projection_event_receipts, projection_states");
}

beforeAll(async () => {
  await withAdminPool(async (adminPool) => {
    await adminPool.query(`DROP DATABASE IF EXISTS ${testDatabaseName}`);
    await adminPool.query(`CREATE DATABASE ${testDatabaseName}`);
  });
  pool = createPgPool(testDatabaseUrl);
  await applyMigrations(testDatabaseUrl);
});

afterAll(async () => {
  await closePgPool(pool);
  await withAdminPool(async (adminPool) => {
    await adminPool.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid()
    `, [testDatabaseName]);
    await adminPool.query(`DROP DATABASE IF EXISTS ${testDatabaseName}`);
  });
});

describe("projection persistence PostgreSQL integration", () => {
  it("creates projection state once and returns it idempotently", async () => {
    await cleanProjectionTables();
    const identity = mustIdentity();

    const first = await stateRepo().createIfMissing(identity);
    const second = await stateRepo().createIfMissing(identity);

    expect(first.status).toBe(ProjectionStatus.Active);
    expect(first.version).toBe(1);
    expect(first.checkpoint).toBeNull();
    expect(second.createdAt.toISOString()).toBe(first.createdAt.toISOString());
    expect(await countRows("projection_states")).toBe(1);
  });

  it("gets existing state and returns null for missing identity", async () => {
    await cleanProjectionTables();
    const identity = mustIdentity();
    await stateRepo().createIfMissing(identity);

    expect(await stateRepo().getByIdentity(identity)).not.toBeNull();
    expect(await stateRepo().getByIdentity(mustIdentity("missing_projection"))).toBeNull();
  });

  it("updates status, increments version and rejects stale expectedVersion", async () => {
    await cleanProjectionTables();
    const identity = mustIdentity();
    const created = await stateRepo().createIfMissing(identity);

    const updated = await stateRepo().updateStatus({
      identity,
      nextStatus: ProjectionStatus.Paused,
      expectedVersion: created.version,
      updatedAt: new Date("2026-07-30T00:00:01.000Z")
    });
    expect(updated.ok).toBe(true);
    if (!updated.ok) throw updated.error;
    expect(updated.value.status).toBe(ProjectionStatus.Paused);
    expect(updated.value.version).toBe(2);

    const stale = await stateRepo().updateStatus({
      identity,
      nextStatus: ProjectionStatus.Active,
      expectedVersion: created.version,
      updatedAt: new Date("2026-07-30T00:00:02.000Z")
    });
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.error).toBeInstanceOf(ProjectionStateConcurrencyConflict);
  });

  it("allows only one of two concurrent versioned updates to win", async () => {
    await cleanProjectionTables();
    const identity = mustIdentity();
    const created = await stateRepo().createIfMissing(identity);

    const first = stateRepo().updateStatus({
      identity,
      nextStatus: ProjectionStatus.Paused,
      expectedVersion: created.version,
      updatedAt: new Date("2026-07-30T00:00:01.000Z")
    });
    const second = stateRepo().updateStatus({
      identity,
      nextStatus: ProjectionStatus.Failed,
      expectedVersion: created.version,
      updatedAt: new Date("2026-07-30T00:00:01.000Z")
    });

    const results = await Promise.all([first, second]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toHaveLength(1);
  });

  it("does not mutate state on invalid transition", async () => {
    await cleanProjectionTables();
    const identity = mustIdentity();
    const created = await stateRepo().createIfMissing(identity);
    const deprecated = await stateRepo().updateStatus({
      identity,
      nextStatus: ProjectionStatus.Deprecated,
      expectedVersion: created.version,
      updatedAt: new Date("2026-07-30T00:00:01.000Z")
    });
    expect(deprecated.ok).toBe(true);
    const before = await stateRepo().getByIdentity(identity);
    expect(before?.status).toBe(ProjectionStatus.Deprecated);

    const invalid = await stateRepo().updateStatus({
      identity,
      nextStatus: ProjectionStatus.Active,
      expectedVersion: before?.version ?? 0,
      updatedAt: new Date("2026-07-30T00:00:02.000Z")
    });
    expect(invalid.ok).toBe(false);
    const after = await stateRepo().getByIdentity(identity);
    expect(after?.status).toBe(ProjectionStatus.Deprecated);
    expect(after?.version).toBe(before?.version);
  });

  it("updates checkpoint without treating it as a receipt", async () => {
    await cleanProjectionTables();
    const identity = mustIdentity();
    const created = await stateRepo().createIfMissing(identity);
    const checkpoint = createProjectionCheckpoint({
      eventId: "event-checkpoint-1",
      eventCreatedAt: new Date("2026-07-30T00:00:00.000Z"),
      processedAt: new Date("2026-07-30T00:00:05.000Z")
    });
    expect(checkpoint.ok).toBe(true);
    if (!checkpoint.ok) throw checkpoint.error;

    const updated = await stateRepo().updateCheckpoint({
      identity,
      checkpoint: checkpoint.value,
      expectedVersion: created.version,
      updatedAt: new Date("2026-07-30T00:00:06.000Z")
    });

    expect(updated.ok).toBe(true);
    if (!updated.ok) throw updated.error;
    expect(updated.value.checkpoint?.eventId).toBe("event-checkpoint-1");
    expect(updated.value.version).toBe(2);
    expect(await liveReceipts().hasReceipt({ identity, eventId: "event-checkpoint-1" })).toBe(false);
  });

  it("records and clears safe failure state", async () => {
    await cleanProjectionTables();
    const identity = mustIdentity();
    const created = await stateRepo().createIfMissing(identity);

    const failed = await stateRepo().recordFailure({
      identity,
      lastError: `token secret sql ${"x".repeat(600)}`,
      expectedVersion: created.version,
      updatedAt: new Date("2026-07-30T00:00:01.000Z")
    });
    expect(failed.ok).toBe(true);
    if (!failed.ok) throw failed.error;
    expect(failed.value.failureCount).toBe(1);
    expect(failed.value.lastError).not.toContain("token");
    expect(failed.value.lastError).not.toContain("secret");
    expect(failed.value.lastError).not.toContain("sql");
    expect(failed.value.lastError?.length).toBeLessThanOrEqual(500);

    const cleared = await stateRepo().clearFailure({
      identity,
      expectedVersion: failed.value.version,
      updatedAt: new Date("2026-07-30T00:00:02.000Z")
    });
    expect(cleared.ok).toBe(true);
    if (!cleared.ok) throw cleared.error;
    expect(cleared.value.failureCount).toBe(0);
    expect(cleared.value.lastError).toBeNull();
    expect(cleared.value.status).toBe(ProjectionStatus.Active);
  });

  it("rolls back projection state updates in a shared transaction", async () => {
    await cleanProjectionTables();
    const identity = mustIdentity();
    const created = await stateRepo().createIfMissing(identity);

    await expect(db().transaction(async (client) => {
      const tx: TxWithExecutor = { id: "projection-state-rollback", client: client as TxWithExecutor["client"] };
      const result = await stateRepo().updateStatus({
        identity,
        nextStatus: ProjectionStatus.Paused,
        expectedVersion: created.version,
        updatedAt: new Date("2026-07-30T00:00:01.000Z")
      }, tx);
      expect(result.ok).toBe(true);
      throw new Error("rollback projection state");
    })).rejects.toThrow("rollback projection state");

    const after = await stateRepo().getByIdentity(identity);
    expect(after?.status).toBe(ProjectionStatus.Active);
    expect(after?.version).toBe(1);
  });

  it("inserts live receipts idempotently without payload or outbox FK coupling", async () => {
    await cleanProjectionTables();
    const identity = mustIdentity();
    const descriptor = mustDescriptor();
    const input = {
      identity,
      eventId: "event-live-1",
      descriptor,
      eventCreatedAt: new Date("2026-07-30T00:00:00.000Z"),
      processedAt: new Date("2026-07-30T00:00:01.000Z")
    };

    const first = await liveReceipts().insertReceipt(input);
    const second = await liveReceipts().insertReceipt({
      ...input,
      processedAt: new Date("2026-07-30T00:00:09.000Z")
    });

    expect(first.ok && first.value.inserted).toBe(true);
    expect(second.ok && second.value).toEqual({ inserted: false, reason: "already_exists" });
    expect(await liveReceipts().hasReceipt({ identity, eventId: "event-live-1" })).toBe(true);
    expect(await countRows("projection_event_receipts")).toBe(1);

    const row = await pool.query<{ processed_at: Date; has_payload: boolean }>(`
      SELECT processed_at, false AS has_payload
      FROM projection_event_receipts
      WHERE event_id = 'event-live-1'
    `);
    expect(row.rows[0]?.processed_at.toISOString()).toBe("2026-07-30T00:00:01.000Z");
    expect(row.rows[0]?.has_payload).toBe(false);
  });

  it("allows live receipts for different projections and versions with the same eventId", async () => {
    await cleanProjectionTables();
    const descriptor = mustDescriptor();
    const base = {
      eventId: "event-shared-1",
      descriptor,
      eventCreatedAt: new Date("2026-07-30T00:00:00.000Z"),
      processedAt: new Date("2026-07-30T00:00:01.000Z")
    };

    await liveReceipts().insertReceipt({ ...base, identity: mustIdentity("walking_skeleton", "v1") });
    await liveReceipts().insertReceipt({ ...base, identity: mustIdentity("walking_skeleton", "v2") });
    await liveReceipts().insertReceipt({ ...base, identity: mustIdentity("operations_summary", "v1") });

    expect(await countRows("projection_event_receipts")).toBe(3);
  });

  it("rolls back live receipts", async () => {
    await cleanProjectionTables();
    const identity = mustIdentity();
    const descriptor = mustDescriptor();

    await expect(db().transaction(async (client) => {
      const tx: TxWithExecutor = { id: "projection-live-receipt-rollback", client: client as TxWithExecutor["client"] };
      await liveReceipts().insertReceipt({
        identity,
        eventId: "event-live-rollback",
        descriptor,
        eventCreatedAt: new Date("2026-07-30T00:00:00.000Z"),
        processedAt: new Date("2026-07-30T00:00:01.000Z")
      }, tx);
      throw new Error("rollback live receipt");
    })).rejects.toThrow("rollback live receipt");

    expect(await liveReceipts().hasReceipt({ identity, eventId: "event-live-rollback" })).toBe(false);
  });

  it("inserts rebuild receipts idempotently and isolates rebuild executions", async () => {
    await cleanProjectionTables();
    const identity = mustIdentity();
    const descriptor = mustDescriptor("VisitCompleted", "v1");
    const base = {
      identity,
      eventId: "event-rebuild-1",
      descriptor,
      eventCreatedAt: new Date("2026-07-30T00:00:00.000Z"),
      processedAt: new Date("2026-07-30T00:00:01.000Z")
    };

    const first = await rebuildReceipts().insertReceipt({ ...base, rebuildId: "rebuild-1" });
    const duplicate = await rebuildReceipts().insertReceipt({ ...base, rebuildId: "rebuild-1" });
    const otherRebuild = await rebuildReceipts().insertReceipt({ ...base, rebuildId: "rebuild-2" });

    expect(first.ok && first.value.inserted).toBe(true);
    expect(duplicate.ok && duplicate.value).toEqual({ inserted: false, reason: "already_exists" });
    expect(otherRebuild.ok && otherRebuild.value.inserted).toBe(true);
    expect(await rebuildReceipts().hasReceipt({ rebuildId: "rebuild-1", identity, eventId: "event-rebuild-1" })).toBe(true);
    expect(await rebuildReceipts().countByRebuild("rebuild-1")).toBe(1);
    expect(await rebuildReceipts().countByRebuild("rebuild-2")).toBe(1);
  });

  it("does not collide live receipts with rebuild receipts and rolls back rebuild receipts", async () => {
    await cleanProjectionTables();
    const identity = mustIdentity();
    const descriptor = mustDescriptor();
    const base = {
      identity,
      eventId: "event-dual-1",
      descriptor,
      eventCreatedAt: new Date("2026-07-30T00:00:00.000Z"),
      processedAt: new Date("2026-07-30T00:00:01.000Z")
    };

    await liveReceipts().insertReceipt(base);
    await rebuildReceipts().insertReceipt({ ...base, rebuildId: "rebuild-dual" });
    expect(await countRows("projection_event_receipts")).toBe(1);
    expect(await countRows("projection_rebuild_receipts")).toBe(1);

    await expect(db().transaction(async (client) => {
      const tx: TxWithExecutor = { id: "projection-rebuild-receipt-rollback", client: client as TxWithExecutor["client"] };
      await rebuildReceipts().insertReceipt({
        ...base,
        eventId: "event-rebuild-rollback",
        rebuildId: "rebuild-dual"
      }, tx);
      throw new Error("rollback rebuild receipt");
    })).rejects.toThrow("rollback rebuild receipt");

    expect(await rebuildReceipts().hasReceipt({
      rebuildId: "rebuild-dual",
      identity,
      eventId: "event-rebuild-rollback"
    })).toBe(false);
  });
});

