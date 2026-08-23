import "dotenv/config";

import { sql, type SQL } from "drizzle-orm";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { Permission, PermissionChecker, createAuthenticatedActor } from "@tonala/shared/auth";
import { loadAppEnv } from "@tonala/config";
import { closePgPool, createDatabaseClient, createPgPool, type DatabasePool } from "@tonala/shared/database";
import { InMemoryLogger } from "@tonala/shared/observability";
import {
  ConsumerRegistry,
  EventDispatcher,
  OutboxWorker,
  PermanentOutboxError,
  RetryPolicy
} from "@tonala/shared/outbox";
import {
  DrizzleConsumerReceiptRepository,
  DrizzleOutboxRepository,
  WalkingSkeletonEventRecorder,
  createOutboxWorkerComposition
} from "@tonala/shared/outbox";
import { applyMigrations } from "../../scripts/db/migrate.js";
import { seedDatabase } from "../../scripts/db/seeds.js";
import {
  CryptoIdGenerator as ContactsIdGenerator,
  DrizzleAuditWriter as ContactsAuditWriter,
  DrizzleContactRepository,
  DrizzleContactsReader,
  DrizzleOutboxWriter as ContactsOutboxWriter,
  DrizzleTransactionManager as ContactsTransactionManager
} from "@tonala/modules/contacts/infrastructure";
import { registerMinimalContact } from "@tonala/modules/contacts/application";
import {
  CryptoIdGenerator as TerritoryIdGenerator,
  DrizzleAuditWriter as TerritoryAuditWriter,
  DrizzleContactTerritoryRepository,
  DrizzleOutboxWriter as TerritoryOutboxWriter,
  DrizzleTerritoryCatalogReader,
  DrizzleTerritoryReader,
  DrizzleTransactionManager as TerritoryTransactionManager
} from "@tonala/modules/territory/infrastructure";
import { linkContactToColony } from "@tonala/modules/territory/application";
import {
  CryptoIdGenerator as AssignmentsIdGenerator,
  DrizzleAuditWriter as AssignmentsAuditWriter,
  DrizzleContactAssignmentRepository,
  DrizzleOutboxWriter as AssignmentsOutboxWriter,
  DrizzleTransactionManager as AssignmentsTransactionManager,
  DrizzleUserDirectoryReader
} from "@tonala/modules/assignments/infrastructure";
import { assignResponsible } from "@tonala/modules/assignments/application";
import {
  CryptoIdGenerator as VisitsIdGenerator,
  DrizzleAuditWriter as VisitsAuditWriter,
  DrizzleOutboxWriter as VisitsOutboxWriter,
  DrizzleTransactionManager as VisitsTransactionManager,
  DrizzleVisitRepository,
  DrizzleVisitResultRepository
} from "@tonala/modules/visits/infrastructure";
import { completeVisit, scheduleVisit } from "@tonala/modules/visits/application";

type QueryResult<TRow> = { readonly rows: TRow[] };
type TxWithExecutor = Readonly<{ client: { execute<TRow extends Record<string, unknown>>(query: SQL): Promise<QueryResult<TRow>> } }>;

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
const testDatabaseName = `tonala_os_outbox_test_${Date.now()}`;
const testDatabaseUrl = databaseUrlForDb(env.private.DATABASE_URL, testDatabaseName);

let pool: DatabasePool;
let adminUserId: string;
let visitResponsibleUserId: string;
let colonyId: string;

function db() {
  return createDatabaseClient(pool);
}

function outboxRepo() {
  return new DrizzleOutboxRepository(db());
}

function receiptRepo() {
  return new DrizzleConsumerReceiptRepository(db());
}

function actor(permissions: Permission[] = [
  Permission.ContactsCreate,
  Permission.ContactsRead,
  Permission.TerritoryLink,
  Permission.AssignmentsCreate,
  Permission.VisitsSchedule,
  Permission.VisitsComplete
], actorId = adminUserId) {
  return createAuthenticatedActor({
    actorId,
    roles: ["admin"],
    permissions,
    correlationId: crypto.randomUUID(),
    authenticationMethod: "password",
    requestStartedAt: new Date("2026-07-30T00:00:00.000Z")
  });
}

async function countRows(table: string, where = "TRUE"): Promise<number> {
  const result = await pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ${table} WHERE ${where}`);
  return Number(result.rows[0]?.count ?? 0);
}

async function insertEvent(input: Partial<{
  eventId: string;
  eventName: string;
  status: string;
  attempts: number;
  nextAttemptAt: string | null;
  lockedAt: string | null;
  lockedBy: string | null;
}> = {}): Promise<string> {
  const eventId = input.eventId ?? crypto.randomUUID();
  await pool.query(
    `
      INSERT INTO transactional_outbox (
        event_id,
        aggregate_type,
        aggregate_id,
        event_name,
        event_version,
        payload,
        metadata,
        status,
        attempts,
        next_attempt_at,
        locked_at,
        locked_by
      )
      VALUES ($1, 'contact', $2, $3, 1, '{}'::jsonb, $4::jsonb, $5, $6, $7, $8, $9)
    `,
    [
      eventId,
      crypto.randomUUID(),
      input.eventName ?? "ContactRegistered.v1",
      JSON.stringify({ correlation_id: "corr-outbox-test" }),
      input.status ?? "pending",
      input.attempts ?? 0,
      input.nextAttemptAt ?? null,
      input.lockedAt ?? null,
      input.lockedBy ?? null
    ]
  );
  return eventId;
}

function customWorker(input: {
  readonly registry: ConsumerRegistry;
  readonly retryPolicy?: RetryPolicy;
  readonly now?: Date;
}) {
  const clock = { now: () => input.now ?? new Date("2026-07-30T10:00:00.000Z") };
  const outboxRepository = outboxRepo();
  const dispatcher = new EventDispatcher({
    registry: input.registry,
    receiptRepository: receiptRepo(),
    outboxRepository,
    retryPolicy: input.retryPolicy ?? new RetryPolicy(5, 5, 40),
    clock,
    logger: new InMemoryLogger()
  });
  return new OutboxWorker({
    outboxRepository,
    dispatcher,
    clock,
    logger: new InMemoryLogger()
  });
}

describe("outbox worker integration", () => {
  beforeAll(async () => {
    await withAdminPool(async (adminPool) => {
      await adminPool.query(`CREATE DATABASE ${testDatabaseName}`);
    });
    await applyMigrations(testDatabaseUrl);
    await seedDatabase(testDatabaseUrl);
    pool = createPgPool(testDatabaseUrl);

    const users = await pool.query<{ id: string; email: string }>(
      "SELECT id::text AS id, email FROM user_profiles ORDER BY email"
    );
    adminUserId = users.rows.find((row) => row.email === "admin.demo@tonala-os.local")?.id ?? "";
    const visitResponsible = await pool.query<{ id: string }>(`
      INSERT INTO user_profiles (email, display_name, role_id)
      SELECT 'visit.responsible.outbox@tonala-os.local', 'Visit Responsible Outbox', roles.id
      FROM roles WHERE roles.key = 'visit_responsible'
      RETURNING id::text AS id
    `);
    visitResponsibleUserId = visitResponsible.rows[0]?.id ?? "";
    const colony = await pool.query<{ id: string }>("SELECT id::text AS id FROM colonies ORDER BY name LIMIT 1");
    colonyId = colony.rows[0]?.id ?? "";
  });

  afterAll(async () => {
    await closePgPool(pool);
    await withAdminPool(async (adminPool) => {
      await adminPool.query(
        `
          SELECT pg_terminate_backend(pid)
          FROM pg_stat_activity
          WHERE datname = $1
        `,
        [testDatabaseName]
      );
      await adminPool.query(`DROP DATABASE IF EXISTS ${testDatabaseName}`);
    });
  });

  it("claims pending events safely and prevents double claim", async () => {
    const eventId = await insertEvent();
    const first = await outboxRepo().claimPending({
      batchSize: 1,
      workerId: "worker-a",
      now: new Date("2026-07-30T10:00:00.000Z")
    });
    const second = await outboxRepo().claimPending({
      batchSize: 1,
      workerId: "worker-b",
      now: new Date("2026-07-30T10:00:00.000Z")
    });

    expect(first.map((event) => event.eventId)).toEqual([eventId]);
    expect(first[0]?.attempt).toBe(1);
    expect(second).toHaveLength(0);
    const row = await pool.query<{ status: string; locked_by: string }>(
      "SELECT status, locked_by FROM transactional_outbox WHERE event_id = $1",
      [eventId]
    );
    expect(row.rows[0]).toEqual({ status: "processing", locked_by: "worker-a" });
  });

  it("processes an event, writes receipt and processed event log, then skips duplicates", async () => {
    await insertEvent();
    const composition = createOutboxWorkerComposition({ db: db(), workerId: "worker-recorder" });
    const first = await composition.worker.runOnce({
      workerId: composition.workerId,
      batchSize: 10,
      abandonedTimeoutSeconds: 300
    });
    expect(first.processed).toBeGreaterThanOrEqual(1);
    expect(await countRows("outbox_consumer_receipts", "consumer_name = 'walking_skeleton_event_recorder'")).toBeGreaterThanOrEqual(1);
    expect(await countRows("processed_event_log", "consumer_name = 'walking_skeleton_event_recorder'")).toBeGreaterThanOrEqual(1);

    const beforeLogs = await countRows("processed_event_log", "consumer_name = 'walking_skeleton_event_recorder'");
    const second = await composition.worker.runOnce({
      workerId: composition.workerId,
      batchSize: 10,
      abandonedTimeoutSeconds: 300
    });
    expect(second.claimed).toBe(0);
    expect(await countRows("processed_event_log", "consumer_name = 'walking_skeleton_event_recorder'")).toBe(beforeLogs);
  });

  it("retries transient failures, respects next_attempt_at and dead-letters exhausted events", async () => {
    const retryEventId = await insertEvent();
    const retryRegistry = new ConsumerRegistry();
    retryRegistry.register({
      consumerName: "failing_transient",
      supportedEvents: ["ContactRegistered.v1"],
      handle: () => Promise.reject(new Error("temporary token abc"))
    });
    const retryWorker = customWorker({ registry: retryRegistry, retryPolicy: new RetryPolicy(5, 5, 5) });
    const retry = await retryWorker.runOnce({ workerId: "worker-retry", batchSize: 1, abandonedTimeoutSeconds: 300 });
    expect(retry.retried).toBe(1);
    const retryRow = await pool.query<{ status: string; last_error: string; next_attempt_at: Date }>(
      "SELECT status, last_error, next_attempt_at FROM transactional_outbox WHERE event_id = $1",
      [retryEventId]
    );
    expect(retryRow.rows[0]?.status).toBe("pending");
    expect(retryRow.rows[0]?.last_error).toContain("[REDACTED]");
    const notYet = await outboxRepo().claimPending({
      batchSize: 1,
      workerId: "too-early",
      now: new Date("2026-07-30T10:00:01.000Z")
    });
    expect(notYet).toHaveLength(0);

    const deadEventId = await insertEvent();
    const deadRegistry = new ConsumerRegistry();
    deadRegistry.register({
      consumerName: "failing_permanent",
      supportedEvents: ["ContactRegistered.v1"],
      handle: () => Promise.reject(new PermanentOutboxError("bad payload"))
    });
    const dead = await customWorker({ registry: deadRegistry }).runOnce({
      workerId: "worker-dead",
      batchSize: 1,
      abandonedTimeoutSeconds: 300
    });
    expect(dead.deadLettered).toBe(1);
    const deadRow = await pool.query<{ status: string; processed_at: Date | null }>(
      "SELECT status, processed_at FROM transactional_outbox WHERE event_id = $1",
      [deadEventId]
    );
    expect(deadRow.rows[0]).toEqual({ status: "dead_letter", processed_at: null });
  });

  it("recovers abandoned events but leaves recent processing events alone", async () => {
    const oldEventId = await insertEvent({
      status: "processing",
      attempts: 1,
      lockedAt: "2026-07-30T08:00:00.000Z",
      lockedBy: "dead-worker"
    });
    const recentEventId = await insertEvent({
      status: "processing",
      attempts: 1,
      lockedAt: "2026-07-30T09:59:00.000Z",
      lockedBy: "active-worker"
    });
    const recovered = await outboxRepo().recoverAbandoned({
      abandonedBefore: new Date("2026-07-30T09:00:00.000Z"),
      nextAttemptAt: new Date("2026-07-30T10:00:00.000Z")
    });
    expect(recovered).toBe(1);
    const rows = await pool.query<{ event_id: string; status: string }>(
      "SELECT event_id::text, status FROM transactional_outbox WHERE event_id = ANY($1::uuid[]) ORDER BY event_id",
      [[oldEventId, recentEventId]]
    );
    expect(rows.rows.find((row) => row.event_id === oldEventId)?.status).toBe("pending");
    expect(rows.rows.find((row) => row.event_id === recentEventId)?.status).toBe("processing");
  });

  it("rolls back technical effect when receipt transaction fails and handles multiple consumers", async () => {
    await insertEvent();
    const registry = new ConsumerRegistry();
    registry.register(new WalkingSkeletonEventRecorder());
    registry.register({
      consumerName: "failing_after_effect",
      supportedEvents: ["ContactRegistered.v1"],
      handle: async (event, context) => {
        const tx = context.transaction as unknown as TxWithExecutor;
        await tx.client.execute(sql`
          INSERT INTO processed_event_log (
            event_id,
            consumer_name,
            event_name,
            aggregate_type,
            aggregate_id,
            processed_at
          )
          VALUES (
            ${event.eventId},
            'failing_after_effect',
            ${event.eventName},
            ${event.aggregateType},
            ${event.aggregateId},
            ${context.processingStartedAt.toISOString()}
          )
        `);
        throw new Error("after effect failure");
      }
    });
    const worker = customWorker({ registry, retryPolicy: new RetryPolicy(5, 1, 1) });
    const first = await worker.runOnce({ workerId: "worker-partial", batchSize: 1, abandonedTimeoutSeconds: 300 });
    expect(first.retried).toBe(1);
    expect(await countRows("processed_event_log", "consumer_name = 'failing_after_effect'")).toBe(0);
    expect(await countRows("outbox_consumer_receipts", "consumer_name = 'walking_skeleton_event_recorder'")).toBeGreaterThanOrEqual(1);
  });

  it("marks events without consumers as processed", async () => {
    const eventId = await insertEvent({ eventName: "NoConsumer.v1" });
    const empty = await customWorker({ registry: new ConsumerRegistry() }).runOnce({
      workerId: "worker-empty",
      batchSize: 20,
      abandonedTimeoutSeconds: 300
    });
    expect(empty.processed).toBeGreaterThanOrEqual(1);
    const row = await pool.query<{ status: string }>(
      "SELECT status FROM transactional_outbox WHERE event_id = $1",
      [eventId]
    );
    expect(row.rows[0]?.status).toBe("processed");
  });

  it("processes the functional flow five-event outbox end-to-end", async () => {
    await pool.query("TRUNCATE processed_event_log, outbox_consumer_receipts, transactional_outbox RESTART IDENTITY CASCADE");
    const contactDependencies = contactDeps();
    const territoryDependencies = territoryDeps();
    const assignmentDependencies = assignmentDeps();
    const visitDependencies = visitDeps();

    const contact = await registerMinimalContact(actor(), { displayName: "Outbox E2E" }, contactDependencies);
    expect(contact.ok).toBe(true);
    if (!contact.ok) return;
    expect((await linkContactToColony(actor(), { contactId: contact.value.contactId, colonyId }, territoryDependencies)).ok).toBe(true);
    expect((await assignResponsible(actor(), {
      contactId: contact.value.contactId,
      assignedUserId: visitResponsibleUserId
    }, assignmentDependencies)).ok).toBe(true);
    const visit = await scheduleVisit(actor(), {
      contactId: contact.value.contactId,
      scheduledAt: "2026-07-30T12:00:00.000Z",
      visitLocationText: "Outbox test"
    }, visitDependencies);
    expect(visit.ok).toBe(true);
    if (!visit.ok) return;
    expect((await completeVisit(actor([Permission.VisitsComplete], visitResponsibleUserId), {
      visitId: visit.value.visitId,
      structuredOutcome: "successful",
      summary: "Done"
    }, visitDependencies)).ok).toBe(true);

    expect(await countRows("transactional_outbox", "status = 'pending'")).toBe(5);
    const composition = createOutboxWorkerComposition({ db: db(), workerId: "worker-e2e" });
    const first = await composition.worker.runOnce({
      workerId: composition.workerId,
      batchSize: 10,
      abandonedTimeoutSeconds: 300
    });
    expect(first).toMatchObject({ claimed: 5, processed: 5, retried: 0, deadLettered: 0 });
    expect(await countRows("transactional_outbox", "status = 'processed'")).toBe(5);
    expect(await countRows("processed_event_log")).toBe(5);
    expect(await countRows("outbox_consumer_receipts")).toBe(5);

    const second = await composition.worker.runOnce({
      workerId: composition.workerId,
      batchSize: 10,
      abandonedTimeoutSeconds: 300
    });
    expect(second.claimed).toBe(0);
    expect(await countRows("processed_event_log")).toBe(5);
    expect(await countRows("outbox_consumer_receipts")).toBe(5);
  });
});

function contactDeps() {
  const database = db();
  return {
    contactRepository: new DrizzleContactRepository(database),
    transactionManager: new ContactsTransactionManager(database),
    auditWriter: new ContactsAuditWriter(),
    outboxWriter: new ContactsOutboxWriter(),
    clock: { now: () => new Date("2026-07-30T01:00:00.000Z") },
    idGenerator: new ContactsIdGenerator(),
    logger: new InMemoryLogger(),
    permissionChecker: new PermissionChecker()
  };
}

function territoryDeps() {
  const database = db();
  return {
    contactsReader: new DrizzleContactsReader(database),
    territoryCatalogReader: new DrizzleTerritoryCatalogReader(database),
    contactTerritoryRepository: new DrizzleContactTerritoryRepository(database),
    transactionManager: new TerritoryTransactionManager(database),
    auditWriter: new TerritoryAuditWriter(),
    outboxWriter: new TerritoryOutboxWriter(),
    clock: { now: () => new Date("2026-07-30T02:00:00.000Z") },
    idGenerator: new TerritoryIdGenerator(),
    logger: new InMemoryLogger(),
    permissionChecker: new PermissionChecker()
  };
}

function assignmentDeps() {
  const database = db();
  return {
    contactsReader: new DrizzleContactsReader(database),
    territoryReader: new DrizzleTerritoryReader(database),
    userDirectoryReader: new DrizzleUserDirectoryReader(database),
    contactAssignmentRepository: new DrizzleContactAssignmentRepository(database),
    transactionManager: new AssignmentsTransactionManager(database),
    auditWriter: new AssignmentsAuditWriter(),
    outboxWriter: new AssignmentsOutboxWriter(),
    clock: { now: () => new Date("2026-07-30T03:00:00.000Z") },
    idGenerator: new AssignmentsIdGenerator(),
    logger: new InMemoryLogger(),
    permissionChecker: new PermissionChecker()
  };
}

function visitDeps() {
  const database = db();
  return {
    contactsReader: new DrizzleContactsReader(database),
    territoryReader: new DrizzleTerritoryReader(database),
    assignmentsReader: new DrizzleContactAssignmentRepository(database),
    visitRepository: new DrizzleVisitRepository(database),
    visitResultRepository: new DrizzleVisitResultRepository(),
    transactionManager: new VisitsTransactionManager(database),
    auditWriter: new VisitsAuditWriter(),
    outboxWriter: new VisitsOutboxWriter(),
    clock: { now: () => new Date("2026-07-30T04:00:00.000Z") },
    idGenerator: new VisitsIdGenerator(),
    logger: new InMemoryLogger(),
    permissionChecker: new PermissionChecker()
  };
}

