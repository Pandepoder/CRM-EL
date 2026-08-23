import "dotenv/config";

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
  LiveProjectionRunner,
  ProjectionLiveOutcome,
  ProjectionRegistry,
  ProjectionRuntimeRegistry,
  type ProjectionDefinition,
  type ProjectionEvent,
  type RebuildPolicy
} from "@tonala/shared/projections";
import {
  DrizzleProjectionEventReceiptRepository,
  DrizzleProjectionStateRepository,
  DrizzleProjectionTransactionManager
} from "@tonala/shared/projections/infrastructure";
import { applyMigrations } from "../../scripts/db/migrate.js";
import {
  DrizzleWalkingSkeletonProjectionReader,
  DrizzleWalkingSkeletonProjectionWriter
} from "../../packages/modules/command-center/infrastructure/index.js";
import {
  walkingSkeletonProjection,
  walkingSkeletonProjectionIdentity
} from "../../packages/modules/command-center/projections/index.js";

type FailingPorts = Readonly<{ handle(): Promise<void> }>;

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
const testDatabaseName = `tonala_os_walking_projection_test_${Date.now()}`;
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

function mustDescriptor(eventName: string, eventVersion = "v1") {
  const result = createProjectionEventDescriptor({ eventName, eventVersion });
  if (!result.ok) throw result.error;
  return result.value;
}

function event(input: Partial<ProjectionEvent> = {}): ProjectionEvent {
  return {
    eventId: crypto.randomUUID(),
    eventName: "ContactRegistered",
    eventVersion: mustVersion("v1"),
    aggregateType: "contact",
    aggregateId: crypto.randomUUID(),
    payload: {},
    metadata: { source: "walking-skeleton-projection-test" },
    createdAt: "2026-07-30T00:00:00.000Z",
    ...input
  };
}

function failingProjection(): ProjectionDefinition<FailingPorts> {
  return createProjectionDefinition<FailingPorts>({
    identity: createProjectionIdentity({
      projectionName: mustName("zzz_failing_projection"),
      projectionVersion: mustVersion("v1")
    }),
    supportedEvents: [mustDescriptor("ContactRegistered")],
    rebuildPolicy,
    handle: async (_event, _context, ports) => ports.handle()
  });
}

function runner(input: {
  readonly failing?: { readonly fail: boolean };
} = {}) {
  const projectionRegistry = new ProjectionRegistry();
  const runtimeRegistry = new ProjectionRuntimeRegistry();
  const database = db();

  projectionRegistry.register(walkingSkeletonProjection);
  runtimeRegistry.register({
    definition: walkingSkeletonProjection,
    resolvePorts: ({ tx }) => new DrizzleWalkingSkeletonProjectionWriter(tx)
  });

  if (input.failing) {
    const definition = failingProjection();
    projectionRegistry.register(definition);
    runtimeRegistry.register({
      definition,
      resolvePorts: () => ({
        handle: () => {
          if (input.failing?.fail) throw new Error("technical projection failure");
          return Promise.resolve();
        }
      })
    });
  }

  return new LiveProjectionRunner({
    registry: projectionRegistry,
    runtimeRegistry,
    transactionManager: new DrizzleProjectionTransactionManager(database),
    stateRepository: new DrizzleProjectionStateRepository(database),
    receiptRepository: new DrizzleProjectionEventReceiptRepository(database),
    logger: new InMemoryLogger()
  });
}

async function runProjection(projectionRunner: LiveProjectionRunner, projectionEvent: ProjectionEvent) {
  return projectionRunner.run({
    event: projectionEvent,
    workerId: "walking-projection-test",
    correlationId: "correlation-walking-projection",
    attempt: 1,
    processingStartedAt: new Date("2026-07-30T10:00:00.000Z")
  });
}

async function countRows(table: string, where = "TRUE"): Promise<number> {
  const result = await pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ${table} WHERE ${where}`);
  return Number(result.rows[0]?.count ?? 0);
}

async function cleanTables(): Promise<void> {
  await pool.query("TRUNCATE walking_skeleton_projection_v1, projection_event_receipts, projection_rebuild_receipts, projection_states");
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

describe("walking skeleton projection PostgreSQL integration", () => {
  it("creates the global row and updates the projection checkpoint atomically", async () => {
    await cleanTables();
    const result = await runProjection(runner(), event({
      eventId: "event-walking-1",
      createdAt: "2026-07-30T01:00:00.000Z"
    }));

    expect(result.success).toBe(true);
    expect(result.entries[0]?.outcome).toBe(ProjectionLiveOutcome.Processed);

    const snapshot = await new DrizzleWalkingSkeletonProjectionReader(db()).getSnapshot();
    expect(snapshot).toMatchObject({
      projectionKey: "global",
      contactRegisteredCount: 1,
      contactLinkedCount: 0,
      responsibleAssignedCount: 0,
      visitScheduledCount: 0,
      visitCompletedCount: 0,
      lastEventAt: "2026-07-30T01:00:00.000Z",
      version: 2
    });
    expect(await countRows("projection_event_receipts", "projection_name = 'walking_skeleton'")).toBe(1);

    const stateRepository = new DrizzleProjectionStateRepository(db());
    const state = await stateRepository.getByIdentity(walkingSkeletonProjectionIdentity);
    expect(state?.checkpoint?.eventId).toBe("event-walking-1");
  });

  it("increments the five technical counters and keeps last_event_at as the greatest event timestamp", async () => {
    await cleanTables();
    const projectionRunner = runner();
    const events = [
      event({ eventId: "event-counter-contact", eventName: "ContactRegistered", createdAt: "2026-07-30T05:00:00.000Z" }),
      event({ eventId: "event-counter-linked", eventName: "ContactLinkedToColony", createdAt: "2026-07-30T02:00:00.000Z" }),
      event({ eventId: "event-counter-assigned", eventName: "ResponsibleAssigned", createdAt: "2026-07-30T03:00:00.000Z" }),
      event({ eventId: "event-counter-scheduled", eventName: "VisitScheduled", createdAt: "2026-07-30T04:00:00.000Z" }),
      event({ eventId: "event-counter-completed", eventName: "VisitCompleted", createdAt: "2026-07-30T01:00:00.000Z" })
    ];

    for (const item of events) {
      expect((await runProjection(projectionRunner, item)).success).toBe(true);
    }

    const snapshot = await new DrizzleWalkingSkeletonProjectionReader(db()).getSnapshot();
    expect(snapshot).toMatchObject({
      contactRegisteredCount: 1,
      contactLinkedCount: 1,
      responsibleAssignedCount: 1,
      visitScheduledCount: 1,
      visitCompletedCount: 1,
      lastEventAt: "2026-07-30T05:00:00.000Z",
      version: 6
    });
  });

  it("does not duplicate effects when the same event is processed twice", async () => {
    await cleanTables();
    const projectionRunner = runner();
    const projectionEvent = event({ eventId: "event-duplicate" });

    const first = await runProjection(projectionRunner, projectionEvent);
    const second = await runProjection(projectionRunner, projectionEvent);

    expect(first.entries[0]?.outcome).toBe(ProjectionLiveOutcome.Processed);
    expect(second.entries[0]?.outcome).toBe(ProjectionLiveOutcome.AlreadyProcessed);
    const snapshot = await new DrizzleWalkingSkeletonProjectionReader(db()).getSnapshot();
    expect(snapshot?.contactRegisteredCount).toBe(1);
    expect(await countRows("projection_event_receipts", "event_id = 'event-duplicate'")).toBe(1);
  });

  it("persists a successful projection when a later projection fails, then resumes idempotently", async () => {
    await cleanTables();
    const projectionEvent = event({ eventId: "event-partial-failure" });

    const failed = await runProjection(runner({ failing: { fail: true } }), projectionEvent);
    expect(failed.success).toBe(false);
    expect(failed.entries.map((entry) => entry.outcome)).toEqual([
      ProjectionLiveOutcome.Processed,
      ProjectionLiveOutcome.Failed
    ]);
    expect((await new DrizzleWalkingSkeletonProjectionReader(db()).getSnapshot())?.contactRegisteredCount).toBe(1);
    expect(await countRows("projection_event_receipts", "projection_name = 'walking_skeleton'")).toBe(1);
    expect(await countRows("projection_event_receipts", "projection_name = 'zzz_failing_projection'")).toBe(0);

    const recovered = await runProjection(runner({ failing: { fail: false } }), projectionEvent);
    expect(recovered.success).toBe(true);
    expect(recovered.entries.map((entry) => entry.outcome)).toEqual([
      ProjectionLiveOutcome.AlreadyProcessed,
      ProjectionLiveOutcome.Processed
    ]);
    expect((await new DrizzleWalkingSkeletonProjectionReader(db()).getSnapshot())?.contactRegisteredCount).toBe(1);
    expect(await countRows("projection_event_receipts", "event_id = 'event-partial-failure'")).toBe(2);
  });

  it("runs concurrent duplicate attempts without duplicate projection effects", async () => {
    await cleanTables();
    const projectionRunner = runner();
    const projectionEvent = event({ eventId: "event-concurrent-duplicate" });

    await Promise.all([
      runProjection(projectionRunner, projectionEvent),
      runProjection(projectionRunner, projectionEvent)
    ]);

    const snapshot = await new DrizzleWalkingSkeletonProjectionReader(db()).getSnapshot();
    expect(snapshot?.contactRegisteredCount).toBe(1);
    expect(await countRows("projection_event_receipts", "event_id = 'event-concurrent-duplicate'")).toBe(1);
  });

  it("keeps the writer scoped to the projection transaction context", async () => {
    await cleanTables();
    const transactionManager = new DrizzleProjectionTransactionManager(db());
    await transactionManager.transaction(async (tx) => {
      await new DrizzleWalkingSkeletonProjectionWriter(tx).incrementContactRegistered(new Date("2026-07-30T06:00:00.000Z"));
    });

    const snapshot = await new DrizzleWalkingSkeletonProjectionReader(db()).getSnapshot();
    expect(snapshot?.contactRegisteredCount).toBe(1);
  });
});

