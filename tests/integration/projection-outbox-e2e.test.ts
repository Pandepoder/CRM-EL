import "dotenv/config";

import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { Permission, PermissionChecker, createAuthenticatedActor } from "@tonala/shared/auth";
import { loadAppEnv } from "@tonala/config";
import { closePgPool, createDatabaseClient, createPgPool, type DatabasePool } from "@tonala/shared/database";
import { InMemoryLogger } from "@tonala/shared/observability";
import { createOutboxWorkerComposition } from "@tonala/shared/outbox";
import { applyMigrations } from "../../scripts/db/migrate.js";
import { seedDatabase } from "../../scripts/db/seeds.js";
import { registerProjectionEngineConsumer } from "../../scripts/composition/projection-engine.js";
import { DrizzleWalkingSkeletonProjectionReader } from "../../packages/modules/command-center/infrastructure/index.js";
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
const testDatabaseName = `tonala_os_projection_outbox_e2e_${Date.now()}`;
const testDatabaseUrl = databaseUrlForDb(env.private.DATABASE_URL, testDatabaseName);

let pool: DatabasePool;
let adminUserId: string;
let visitResponsibleUserId: string;
let colonyId: string;

function db() {
  return createDatabaseClient(pool);
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

beforeAll(async () => {
  await withAdminPool(async (adminPool) => {
    await adminPool.query(`DROP DATABASE IF EXISTS ${testDatabaseName}`);
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
    SELECT 'visit.responsible.projection@tonala-os.local', 'Visit Responsible Projection', roles.id
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
    await adminPool.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid()
    `, [testDatabaseName]);
    await adminPool.query(`DROP DATABASE IF EXISTS ${testDatabaseName}`);
  });
});

describe("projection engine outbox E2E", () => {
  it("projects the five-event walking skeleton flow and stays idempotent on the next worker pass", async () => {
    await pool.query("TRUNCATE walking_skeleton_projection_v1, projection_event_receipts, projection_rebuild_receipts, projection_states, processed_event_log, outbox_consumer_receipts, transactional_outbox RESTART IDENTITY CASCADE");

    const contact = await registerMinimalContact(actor(), { displayName: "Projection Outbox E2E" }, contactDeps());
    expect(contact.ok).toBe(true);
    if (!contact.ok) return;
    expect((await linkContactToColony(actor(), { contactId: contact.value.contactId, colonyId }, territoryDeps())).ok).toBe(true);
    expect((await assignResponsible(actor(), {
      contactId: contact.value.contactId,
      assignedUserId: visitResponsibleUserId
    }, assignmentDeps())).ok).toBe(true);
    const visit = await scheduleVisit(actor(), {
      contactId: contact.value.contactId,
      scheduledAt: "2026-07-30T12:00:00.000Z",
      visitLocationText: "Projection outbox test"
    }, visitDeps());
    expect(visit.ok).toBe(true);
    if (!visit.ok) return;
    expect((await completeVisit(actor([Permission.VisitsComplete], visitResponsibleUserId), {
      visitId: visit.value.visitId,
      structuredOutcome: "successful",
      summary: "Done"
    }, visitDeps())).ok).toBe(true);

    expect(await countRows("transactional_outbox", "status = 'pending'")).toBe(5);

    const composition = createOutboxWorkerComposition({ db: db(), workerId: "worker-projection-e2e" });
    registerProjectionEngineConsumer({
      db: db(),
      logger: composition.logger,
      registry: composition.registry
    });

    const first = await composition.worker.runOnce({
      workerId: composition.workerId,
      batchSize: 10,
      abandonedTimeoutSeconds: 300
    });
    expect(first).toMatchObject({ claimed: 5, processed: 5, retried: 0, deadLettered: 0 });

    const snapshot = await new DrizzleWalkingSkeletonProjectionReader(db()).getSnapshot();
    expect(snapshot).toMatchObject({
      contactRegisteredCount: 1,
      contactLinkedCount: 1,
      responsibleAssignedCount: 1,
      visitScheduledCount: 1,
      visitCompletedCount: 1,
      version: 6
    });
    expect(await countRows("projection_event_receipts", "projection_name = 'walking_skeleton'")).toBe(5);
    expect(await countRows("outbox_consumer_receipts", "consumer_name = 'projection_engine.v1'")).toBe(5);
    expect(await countRows("outbox_consumer_receipts", "consumer_name = 'walking_skeleton_event_recorder'")).toBe(5);
    expect(await countRows("transactional_outbox", "status = 'processed'")).toBe(5);

    const second = await composition.worker.runOnce({
      workerId: composition.workerId,
      batchSize: 10,
      abandonedTimeoutSeconds: 300
    });
    expect(second.claimed).toBe(0);
    expect((await new DrizzleWalkingSkeletonProjectionReader(db()).getSnapshot())?.version).toBe(6);
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

