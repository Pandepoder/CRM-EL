import "dotenv/config";

import { sql, type SQL } from "drizzle-orm";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { loadAppEnv } from "@tonala/config";
import { closePgPool, createDatabaseClient, createPgPool, type DatabasePool } from "@tonala/shared/database";
import { InMemoryLogger } from "@tonala/shared/observability";
import {
  createProjectionDefinition,
  createProjectionEventDescriptor,
  createProjectionIdentity,
  createProjectionName,
  createProjectionVersion,
  type ProjectionDefinition,
  type ProjectionEvent,
  projectionIdentityKey,
  ProjectionRegistry,
  ProjectionRuntimeRegistry,
  ProjectionStatus,
  LiveProjectionRunner,
  ProjectionLiveOutcome,
  type ProjectionTransactionContext,
  type RebuildPolicy
} from "@tonala/shared/projections";
import {
  DrizzleProjectionEventReceiptRepository,
  DrizzleProjectionStateRepository,
  DrizzleProjectionTransactionManager
} from "@tonala/shared/projections/infrastructure";
import { applyMigrations } from "../../scripts/db/migrate.js";

type QueryResult<TRow> = { readonly rows: TRow[] };
type TxWithExecutor = ProjectionTransactionContext & Readonly<{
  client: { execute<TRow extends Record<string, unknown>>(query: SQL): Promise<QueryResult<TRow>> };
}>;

type TestPorts = Readonly<{
  increment(): Promise<void>;
  forceCheckpointConflict?(): Promise<void>;
}>;

const rebuildPolicy: RebuildPolicy = { rebuildable: true, source: "outbox_history", strategy: "shadow" };

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
const testDatabaseName = `tonala_os_projection_live_test_${Date.now()}`;
const testDatabaseUrl = databaseUrlForDb(env.private.DATABASE_URL, testDatabaseName);

let pool: DatabasePool;

function db() {
  return createDatabaseClient(pool);
}

function mustName(value: string) {
  const result = createProjectionName(value);
  if (!result.ok) throw result.error;
  return result.value;
}

function mustVersion(value: string) {
  const result = createProjectionVersion(value);
  if (!result.ok) throw result.error;
  return result.value;
}

function identity(name: string, version = "v1") {
  return createProjectionIdentity({ projectionName: mustName(name), projectionVersion: mustVersion(version) });
}

function descriptor(eventName = "ContactRegistered", eventVersion = "v1") {
  const result = createProjectionEventDescriptor({ eventName, eventVersion });
  if (!result.ok) throw result.error;
  return result.value;
}

function projectionEvent(input: Partial<ProjectionEvent> = {}): ProjectionEvent {
  return {
    eventId: "event-live-1",
    eventName: "ContactRegistered",
    eventVersion: mustVersion("v1"),
    aggregateType: "contact",
    aggregateId: "contact-1",
    payload: { technical: true },
    metadata: { source: "projection-live-test" },
    createdAt: "2026-07-30T00:00:00.000Z",
    ...input
  };
}

function definition(name: string, input: {
  readonly version?: string;
  readonly fail?: boolean;
  readonly forceCheckpointConflict?: boolean;
} = {}): ProjectionDefinition<TestPorts> {
  return createProjectionDefinition<TestPorts>({
    identity: identity(name, input.version),
    supportedEvents: [descriptor()],
    rebuildPolicy,
    handle: async (_event, _context, ports) => {
      await ports.increment();
      if (input.forceCheckpointConflict) await ports.forceCheckpointConflict?.();
      if (input.fail) throw new Error("technical handler failure");
    }
  });
}

function buildRunner(definitions: readonly ProjectionDefinition<TestPorts>[]) {
  const registry = new ProjectionRegistry();
  const runtimeRegistry = new ProjectionRuntimeRegistry();
  const database = db();
  const stateRepository = new DrizzleProjectionStateRepository(database);
  const receiptRepository = new DrizzleProjectionEventReceiptRepository(database);
  const logger = new InMemoryLogger();

  for (const item of definitions) {
    registry.register(item);
    runtimeRegistry.register({
      definition: item,
      resolvePorts: ({ tx, identity: projectionIdentity }) => {
        const transactional = tx as TxWithExecutor;
        return {
          increment: async () => {
            await transactional.client.execute(sql`
              INSERT INTO test_projection_counter (projection_key, effect_count)
              VALUES (${projectionIdentityKey(projectionIdentity)}, 1)
              ON CONFLICT (projection_key)
              DO UPDATE SET effect_count = test_projection_counter.effect_count + 1
            `);
          },
          forceCheckpointConflict: async () => {
            await transactional.client.execute(sql`
              UPDATE projection_states
              SET version = version + 1
              WHERE projection_name = ${projectionIdentity.projectionName}
                AND projection_version = ${projectionIdentity.projectionVersion}
            `);
          }
        };
      }
    });
  }

  return {
    runner: new LiveProjectionRunner({
      registry,
      runtimeRegistry,
      transactionManager: new DrizzleProjectionTransactionManager(database),
      stateRepository,
      receiptRepository,
      logger
    }),
    stateRepository,
    receiptRepository,
    logger
  };
}

async function run(runner: LiveProjectionRunner, event = projectionEvent()) {
  return runner.run({
    event,
    workerId: "worker-live-test",
    correlationId: "correlation-live-test",
    attempt: 1,
    processingStartedAt: new Date("2026-07-30T00:00:01.000Z")
  });
}

async function countEffects(key: string): Promise<number> {
  const result = await pool.query<{ effect_count: number }>(
    "SELECT effect_count FROM test_projection_counter WHERE projection_key = $1",
    [key]
  );
  return result.rows[0]?.effect_count ?? 0;
}

async function countRows(table: string, where = "true"): Promise<number> {
  const result = await pool.query<{ count: number }>(`SELECT count(*)::int AS count FROM ${table} WHERE ${where}`);
  return result.rows[0]?.count ?? 0;
}

async function cleanTables(): Promise<void> {
  await pool.query("TRUNCATE test_projection_counter, projection_event_receipts, projection_rebuild_receipts, projection_states");
}

beforeAll(async () => {
  await withAdminPool(async (adminPool) => {
    await adminPool.query(`DROP DATABASE IF EXISTS ${testDatabaseName}`);
    await adminPool.query(`CREATE DATABASE ${testDatabaseName}`);
  });
  pool = createPgPool(testDatabaseUrl);
  await applyMigrations(testDatabaseUrl);
  await pool.query(`
    CREATE TABLE test_projection_counter (
      projection_key text PRIMARY KEY,
      effect_count integer NOT NULL DEFAULT 0
    )
  `);
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

describe("LiveProjectionRunner PostgreSQL integration", () => {
  it("commits handler effect, receipt and checkpoint together", async () => {
    await cleanTables();
    const setup = buildRunner([definition("test_counter_alpha")]);
    const result = await run(setup.runner);

    expect(result.success).toBe(true);
    expect(result.entries[0]?.outcome).toBe(ProjectionLiveOutcome.Processed);
    expect(await countEffects("test_counter_alpha:v1")).toBe(1);
    expect(await countRows("projection_event_receipts")).toBe(1);
    const state = await setup.stateRepository.getByIdentity(identity("test_counter_alpha"));
    expect(state?.checkpoint?.eventId).toBe("event-live-1");
    expect(state?.checkpoint?.eventCreatedAt.toISOString()).toBe("2026-07-30T00:00:00.000Z");
    expect(state?.version).toBe(2);
  });

  it("rolls back effect, receipt and checkpoint when handler fails", async () => {
    await cleanTables();
    const setup = buildRunner([definition("test_failing_projection", { fail: true })]);
    const result = await run(setup.runner);

    expect(result.success).toBe(false);
    expect(await countEffects("test_failing_projection:v1")).toBe(0);
    expect(await countRows("projection_event_receipts")).toBe(0);
    const state = await setup.stateRepository.getByIdentity(identity("test_failing_projection"));
    expect(state?.checkpoint).toBeNull();
    expect(state?.failureCount).toBe(1);
    expect(state?.status).toBe(ProjectionStatus.Active);
  });

  it("rolls back effect and receipt when checkpoint update conflicts", async () => {
    await cleanTables();
    const setup = buildRunner([definition("test_counter_alpha", { forceCheckpointConflict: true })]);
    const result = await run(setup.runner);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("projection_state_concurrency_conflict");
    expect(await countEffects("test_counter_alpha:v1")).toBe(0);
    expect(await countRows("projection_event_receipts")).toBe(0);
  });

  it("does not execute handler when receipt already exists and keeps one effect across sequential retries", async () => {
    await cleanTables();
    const setup = buildRunner([definition("test_counter_alpha")]);

    const first = await run(setup.runner);
    const second = await run(setup.runner);

    expect(first.entries[0]?.outcome).toBe(ProjectionLiveOutcome.Processed);
    expect(second.entries[0]?.outcome).toBe(ProjectionLiveOutcome.AlreadyProcessed);
    expect(await countEffects("test_counter_alpha:v1")).toBe(1);
    expect(await countRows("projection_event_receipts")).toBe(1);
  });

  it("concurrent attempts produce a single effect", async () => {
    await cleanTables();
    const setup = buildRunner([definition("test_counter_alpha")]);

    const [first, second] = await Promise.all([run(setup.runner), run(setup.runner)]);
    expect([first.entries[0]?.outcome, second.entries[0]?.outcome].sort()).toEqual([
      ProjectionLiveOutcome.AlreadyProcessed,
      ProjectionLiveOutcome.Processed
    ].sort());
    expect(await countEffects("test_counter_alpha:v1")).toBe(1);
    expect(await countRows("projection_event_receipts")).toBe(1);
  });

  it("different projection versions and names process the same eventId independently", async () => {
    await cleanTables();
    const setup = buildRunner([
      definition("test_counter_alpha", { version: "v1" }),
      definition("test_counter_alpha", { version: "v2" }),
      definition("test_counter_beta", { version: "v1" })
    ]);

    const result = await run(setup.runner);
    expect(result.success).toBe(true);
    expect(await countEffects("test_counter_alpha:v1")).toBe(1);
    expect(await countEffects("test_counter_alpha:v2")).toBe(1);
    expect(await countEffects("test_counter_beta:v1")).toBe(1);
    expect(await countRows("projection_event_receipts")).toBe(3);
  });

  it.each([
    [ProjectionStatus.Paused, ProjectionLiveOutcome.BlockedPaused],
    [ProjectionStatus.Failed, ProjectionLiveOutcome.BlockedFailed],
    [ProjectionStatus.Rebuilding, ProjectionLiveOutcome.BlockedRebuilding],
    [ProjectionStatus.Deprecated, ProjectionLiveOutcome.SkippedDeprecated]
  ])("does not create receipt for %s state", async (status, outcome) => {
    await cleanTables();
    const setup = buildRunner([definition("test_counter_alpha")]);
    const created = await setup.stateRepository.createIfMissing(identity("test_counter_alpha"));
    if (created.status !== status) {
      const updated = await setup.stateRepository.updateStatus({
        identity: identity("test_counter_alpha"),
        nextStatus: status,
        expectedVersion: created.version,
        updatedAt: new Date("2026-07-30T00:00:01.000Z")
      });
      expect(updated.ok).toBe(true);
    }

    const result = await run(setup.runner);
    expect(result.entries[0]?.outcome).toBe(outcome);
    expect(await countRows("projection_event_receipts")).toBe(0);
    expect(await countEffects("test_counter_alpha:v1")).toBe(0);
  });

  it("keeps previous projection committed when a later projection fails, then retry skips previous and continues", async () => {
    await cleanTables();
    const firstSetup = buildRunner([
      definition("test_counter_alpha"),
      definition("test_counter_beta", { fail: true }),
      definition("test_counter_gamma")
    ]);
    const first = await run(firstSetup.runner);
    expect(first.success).toBe(false);
    expect(first.entries.map((entry) => entry.outcome)).toEqual([
      ProjectionLiveOutcome.Processed,
      ProjectionLiveOutcome.Failed
    ]);
    expect(await countEffects("test_counter_alpha:v1")).toBe(1);
    expect(await countEffects("test_counter_beta:v1")).toBe(0);
    expect(await countEffects("test_counter_gamma:v1")).toBe(0);

    const retrySetup = buildRunner([
      definition("test_counter_alpha"),
      definition("test_counter_beta"),
      definition("test_counter_gamma")
    ]);
    const retry = await run(retrySetup.runner);
    expect(retry.success).toBe(true);
    expect(retry.entries.map((entry) => entry.outcome)).toEqual([
      ProjectionLiveOutcome.AlreadyProcessed,
      ProjectionLiveOutcome.Processed,
      ProjectionLiveOutcome.Processed
    ]);
    expect(await countEffects("test_counter_alpha:v1")).toBe(1);
    expect(await countEffects("test_counter_beta:v1")).toBe(1);
    expect(await countEffects("test_counter_gamma:v1")).toBe(1);
  });

  it("does not store payload in receipts", async () => {
    await cleanTables();
    const setup = buildRunner([definition("test_counter_alpha")]);
    await run(setup.runner, projectionEvent({ payload: { phone: "555-0101" } }));

    const columns = await pool.query<{ column_name: string }>(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'projection_event_receipts'
      ORDER BY ordinal_position
    `);
    expect(columns.rows.map((row) => row.column_name)).not.toContain("payload");
    expect(JSON.stringify(setup.logger.entries)).not.toContain("555-0101");
  });
});

