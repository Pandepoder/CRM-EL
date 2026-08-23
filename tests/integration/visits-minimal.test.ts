import "dotenv/config";

import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { handleAssignmentsRequest } from "../../apps/web/src/http/assignments-adapter.js";
import { handleContactsRequest } from "../../apps/web/src/http/contacts-adapter.js";
import { handleTerritoryRequest } from "../../apps/web/src/http/territory-adapter.js";
import { handleVisitsRequest } from "../../apps/web/src/http/visits-adapter.js";
import { Permission, PermissionChecker, createAuthenticatedActor } from "@tonala/shared/auth";
import { loadAppEnv } from "@tonala/config";
import { closePgPool, createDatabaseClient, createPgPool, type DatabasePool } from "@tonala/shared/database";
import { InMemoryLogger } from "@tonala/shared/observability";
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
import {
  completeVisit,
  getVisitById,
  scheduleVisit,
  type AuditWriter,
  type OutboxWriter,
  type VisitRepository,
  type VisitResultRepository
} from "@tonala/modules/visits/application";

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
const testDatabaseName = `tonala_os_visits_test_${Date.now()}`;
const testDatabaseUrl = databaseUrlForDb(env.private.DATABASE_URL, testDatabaseName);

let pool: DatabasePool;
let adminUserId: string;
let coordinatorUserId: string;
let visitResponsibleUserId: string;
let colonyIds: string[];

function db() {
  return createDatabaseClient(pool);
}

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

function visitDeps(overrides: Partial<{
  auditWriter: AuditWriter;
  outboxWriter: OutboxWriter;
  visitRepository: VisitRepository;
  visitResultRepository: VisitResultRepository;
}> = {}) {
  const database = db();
  return {
    contactsReader: new DrizzleContactsReader(database),
    territoryReader: new DrizzleTerritoryReader(database),
    assignmentsReader: new DrizzleContactAssignmentRepository(database),
    visitRepository: overrides.visitRepository ?? new DrizzleVisitRepository(database),
    visitResultRepository: overrides.visitResultRepository ?? new DrizzleVisitResultRepository(),
    transactionManager: new VisitsTransactionManager(database),
    auditWriter: overrides.auditWriter ?? new VisitsAuditWriter(),
    outboxWriter: overrides.outboxWriter ?? new VisitsOutboxWriter(),
    clock: { now: () => new Date("2026-07-30T04:00:00.000Z") },
    idGenerator: new VisitsIdGenerator(),
    logger: new InMemoryLogger(),
    permissionChecker: new PermissionChecker()
  };
}

function actor(userId = adminUserId, roles: string[] = ["admin"], permissions: Permission[] = [
  Permission.ContactsCreate,
  Permission.ContactsRead,
  Permission.TerritoryLink,
  Permission.AssignmentsCreate,
  Permission.VisitsSchedule,
  Permission.VisitsComplete
]) {
  return createAuthenticatedActor({
    actorId: userId,
    roles,
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

async function createReadyContact(name = "Visit Ready Contact"): Promise<string> {
  const created = await registerMinimalContact(actor(), { displayName: name }, contactDeps());
  expect(created.ok).toBe(true);
  if (!created.ok) throw new Error("contact setup failed");
  const territory = await linkContactToColony(actor(), { contactId: created.value.contactId, colonyId: colonyIds[0] ?? "" }, territoryDeps());
  expect(territory.ok).toBe(true);
  const assignment = await assignResponsible(actor(), {
    contactId: created.value.contactId,
    assignedUserId: visitResponsibleUserId
  }, assignmentDeps());
  expect(assignment.ok).toBe(true);
  return created.value.contactId;
}

async function scheduleReadyVisit(contactName = "Visit Scheduled"): Promise<{ contactId: string; visitId: string }> {
  const contactId = await createReadyContact(contactName);
  const scheduled = await scheduleVisit(actor(), {
    contactId,
    scheduledAt: "2026-07-30T05:00:00.000Z",
    visitLocationText: "Domicilio de visita"
  }, visitDeps());
  expect(scheduled.ok).toBe(true);
  if (!scheduled.ok) throw new Error("visit setup failed");
  return { contactId, visitId: scheduled.value.visitId };
}

describe("visits minimal integration", () => {
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
    coordinatorUserId = users.rows.find((row) => row.email === "coordinador.demo@tonala-os.local")?.id ?? "";
    const visitResponsible = await pool.query<{ id: string }>(`
      INSERT INTO user_profiles (email, display_name, role_id)
      SELECT 'visit.responsible.block7@tonala-os.local', 'Visit Responsible Block 7', roles.id
      FROM roles WHERE roles.key = 'visit_responsible'
      RETURNING id::text AS id
    `);
    visitResponsibleUserId = visitResponsible.rows[0]?.id ?? "";
    const colonies = await pool.query<{ id: string }>("SELECT id::text AS id FROM colonies ORDER BY name");
    colonyIds = colonies.rows.map((row) => row.id);
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

  it("schedules a visit with audit and pending event", async () => {
    const contactId = await createReadyContact("Schedule Visit");
    const result = await scheduleVisit(actor(), {
      contactId,
      scheduledAt: "2026-07-30T05:00:00.000Z",
      visitLocationText: "  Mercado   local  "
    }, visitDeps());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(await countRows("visits", `id = '${result.value.visitId}'`)).toBe(1);
    expect(await countRows("audit_logs", `action = 'visits.scheduled' AND entity_id = '${result.value.visitId}'`)).toBe(1);
    const event = await pool.query<{ event_name: string; status: string; payload: Record<string, string> }>(
      "SELECT event_name, status, payload FROM transactional_outbox WHERE event_name = 'VisitScheduled.v1' AND aggregate_id = $1",
      [result.value.visitId]
    );
    expect(event.rows[0]).toMatchObject({ event_name: "VisitScheduled.v1", status: "pending" });
    expect(event.rows[0]?.payload).toMatchObject({
      visit_id: result.value.visitId,
      contact_id: contactId,
      assigned_user_id: visitResponsibleUserId,
      colony_id: colonyIds[0],
      scheduled_at: "2026-07-30T05:00:00.000Z"
    });
    expect(JSON.stringify(event.rows[0])).not.toContain("Mercado local");
  });

  it("rolls back schedule on audit or outbox failure and rejects invalid scheduling", async () => {
    const auditContact = await createReadyContact("Schedule Rollback Audit");
    const beforeVisits = await countRows("visits");
    const failingAudit: AuditWriter = { write: () => Promise.reject(new Error("audit failed")) };
    const auditResult = await scheduleVisit(actor(), {
      contactId: auditContact,
      scheduledAt: "2026-07-30T05:00:00.000Z",
      visitLocationText: "Casa"
    }, visitDeps({ auditWriter: failingAudit }));
    expect(auditResult.ok).toBe(false);
    expect(await countRows("visits")).toBe(beforeVisits);

    const outboxContact = await createReadyContact("Schedule Rollback Outbox");
    const failingOutbox: OutboxWriter = {
      writeVisitScheduled: () => Promise.reject(new Error("outbox failed")),
      writeVisitCompleted: () => Promise.resolve()
    };
    const outboxResult = await scheduleVisit(actor(), {
      contactId: outboxContact,
      scheduledAt: "2026-07-30T05:00:00.000Z",
      visitLocationText: "Casa"
    }, visitDeps({ outboxWriter: failingOutbox }));
    expect(outboxResult.ok).toBe(false);
    expect(await countRows("visits")).toBe(beforeVisits);

    const past = await scheduleVisit(actor(), {
      contactId: auditContact,
      scheduledAt: "2026-07-29T05:00:00.000Z",
      visitLocationText: "Casa"
    }, visitDeps());
    expect(past.ok).toBe(false);
    if (!past.ok) expect(past.error.code).toBe("visit_scheduled_at_in_past");

    const noTerritory = await registerMinimalContact(actor(), { displayName: "No Territory Visit" }, contactDeps());
    expect(noTerritory.ok).toBe(true);
    if (!noTerritory.ok) return;
    const missingTerritory = await scheduleVisit(actor(), {
      contactId: noTerritory.value.contactId,
      scheduledAt: "2026-07-30T05:00:00.000Z",
      visitLocationText: "Casa"
    }, visitDeps());
    expect(missingTerritory.ok).toBe(false);
    if (!missingTerritory.ok) expect(missingTerritory.error.code).toBe("contact_territory_not_found");
  });

  it("reads, completes and stores result with audit and pending event", async () => {
    const { visitId } = await scheduleReadyVisit("Complete Visit");
    const read = await getVisitById(actor(undefined, ["admin"], [Permission.ContactsRead]), { visitId }, visitDeps());
    expect(read.ok).toBe(true);
    if (read.ok) expect(read.value.status).toBe("scheduled");

    const result = await completeVisit(actor(visitResponsibleUserId, ["visit_responsible"], [Permission.VisitsComplete]), {
      visitId,
      structuredOutcome: "successful",
      summary: "Visita completada correctamente"
    }, visitDeps());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe("completed");
    expect(result.value.outcome).toBe("successful");
    expect(await countRows("visit_results", `visit_id = '${visitId}'`)).toBe(1);
    expect(await countRows("audit_logs", `action = 'visits.completed' AND entity_id = '${visitId}'`)).toBe(1);
    const event = await pool.query<{ event_name: string; payload: Record<string, string> }>(
      "SELECT event_name, payload FROM transactional_outbox WHERE event_name = 'VisitCompleted.v1' AND aggregate_id = $1",
      [visitId]
    );
    expect(event.rows[0]?.payload).toMatchObject({
      visit_id: visitId,
      completed_by_user_id: visitResponsibleUserId,
      completed_at: "2026-07-30T04:00:00.000Z",
      outcome: "successful"
    });
    expect(JSON.stringify(event.rows[0])).not.toContain("Visita completada correctamente");
  });

  it("rolls back complete on result, audit or outbox failure and rejects second completion", async () => {
    const first = await scheduleReadyVisit("Complete Rollback Result");
    const failingResult: VisitResultRepository = { insert: () => Promise.reject(new Error("result failed")) };
    const resultFailure = await completeVisit(actor(visitResponsibleUserId, ["visit_responsible"], [Permission.VisitsComplete]), {
      visitId: first.visitId,
      structuredOutcome: "no_contact",
      summary: "No contesto"
    }, visitDeps({ visitResultRepository: failingResult }));
    expect(resultFailure.ok).toBe(false);
    expect(await countRows("visit_results", `visit_id = '${first.visitId}'`)).toBe(0);
    const firstState = await getVisitById(actor(undefined, ["admin"], [Permission.ContactsRead]), { visitId: first.visitId }, visitDeps());
    expect(firstState.ok && firstState.value.status).toBe("scheduled");

    const second = await scheduleReadyVisit("Complete Rollback Audit");
    const failingAudit: AuditWriter = { write: () => Promise.reject(new Error("audit failed")) };
    const auditFailure = await completeVisit(actor(visitResponsibleUserId, ["visit_responsible"], [Permission.VisitsComplete]), {
      visitId: second.visitId,
      structuredOutcome: "rejected",
      summary: "No quiso atender"
    }, visitDeps({ auditWriter: failingAudit }));
    expect(auditFailure.ok).toBe(false);
    expect(await countRows("visit_results", `visit_id = '${second.visitId}'`)).toBe(0);

    const third = await scheduleReadyVisit("Complete Rollback Outbox");
    const failingOutbox: OutboxWriter = {
      writeVisitScheduled: () => Promise.resolve(),
      writeVisitCompleted: () => Promise.reject(new Error("outbox failed"))
    };
    const outboxFailure = await completeVisit(actor(visitResponsibleUserId, ["visit_responsible"], [Permission.VisitsComplete]), {
      visitId: third.visitId,
      structuredOutcome: "follow_up_required",
      summary: "Volver despues"
    }, visitDeps({ outboxWriter: failingOutbox }));
    expect(outboxFailure.ok).toBe(false);
    expect(await countRows("visit_results", `visit_id = '${third.visitId}'`)).toBe(0);

    const completeOnce = await completeVisit(actor(visitResponsibleUserId, ["visit_responsible"], [Permission.VisitsComplete]), {
      visitId: third.visitId,
      structuredOutcome: "follow_up_required",
      summary: "Volver despues"
    }, visitDeps());
    expect(completeOnce.ok).toBe(true);
    const completeAgain = await completeVisit(actor(visitResponsibleUserId, ["visit_responsible"], [Permission.VisitsComplete]), {
      visitId: third.visitId,
      structuredOutcome: "follow_up_required",
      summary: "Otra vez"
    }, visitDeps());
    expect(completeAgain.ok).toBe(false);
    if (!completeAgain.ok) expect(completeAgain.error.code).toBe("visit_already_completed");
  });

  it("keeps operational snapshot after reassignment and territory change", async () => {
    const { contactId, visitId } = await scheduleReadyVisit("Snapshot Visit");
    const original = await getVisitById(actor(undefined, ["admin"], [Permission.ContactsRead]), { visitId }, visitDeps());
    expect(original.ok).toBe(true);
    if (!original.ok) return;

    await assignResponsible(actor(), { contactId, assignedUserId: coordinatorUserId }, assignmentDeps());
    await linkContactToColony(actor(), { contactId, colonyId: colonyIds[1] ?? "" }, territoryDeps());
    const afterChanges = await getVisitById(actor(undefined, ["admin"], [Permission.ContactsRead]), { visitId }, visitDeps());
    expect(afterChanges.ok).toBe(true);
    if (afterChanges.ok) {
      expect(afterChanges.value.assignedUserId).toBe(original.value.assignedUserId);
      expect(afterChanges.value.colonyId).toBe(original.value.colonyId);
    }
  });

  it("allows only one concurrent completion", async () => {
    const { visitId } = await scheduleReadyVisit("Concurrent Complete");
    const realRepository = new DrizzleVisitRepository(db());
    const barrier = twoPartyBarrier();
    const racingRepository: VisitRepository = {
      insert: (visit, tx) => realRepository.insert(visit, tx),
      findById: async (id, tx) => {
        const current = await realRepository.findById(id, tx);
        if (tx && current?.status === "scheduled") await barrier.wait();
        return current;
      },
      updateCompleted: (input, tx) => realRepository.updateCompleted(input, tx)
    };
    const responsibleActor = actor(visitResponsibleUserId, ["visit_responsible"], [Permission.VisitsComplete]);
    const first = completeVisit(responsibleActor, {
      visitId,
      structuredOutcome: "successful",
      summary: "Primera"
    }, visitDeps({ visitRepository: racingRepository }));
    const second = completeVisit(responsibleActor, {
      visitId,
      structuredOutcome: "no_contact",
      summary: "Segunda"
    }, visitDeps({ visitRepository: racingRepository }));
    const results = await Promise.all([first, second]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toHaveLength(1);
    expect(await countRows("visit_results", `visit_id = '${visitId}'`)).toBe(1);
    expect(await countRows("transactional_outbox", `event_name = 'VisitCompleted.v1' AND aggregate_id = '${visitId}'`)).toBe(1);
  });

  it("executes minimal HTTP E2E through contact, territory, assignment and visit", async () => {
    const headers = {
      "content-type": "application/json",
      "x-tonala-actor-id": adminUserId,
      "x-tonala-roles": "admin",
      "x-tonala-permissions": "contacts:create,contacts:read,territory:link,assignments:create,visits:schedule,visits:complete",
      "x-correlation-id": "corr-visits-http-e2e"
    };
    const envDeps = { env: { NEXT_PUBLIC_APP_ENV: "test" } };
    const postContact = await handleContactsRequest(new Request("http://test.local/api/contacts", {
      method: "POST",
      headers,
      body: JSON.stringify({ displayName: "HTTP Visit" })
    }), { ...contactDeps(), ...envDeps });
    expect(postContact.status).toBe(201);
    const contact = await postContact.json() as { contactId: string };

    expect((await handleTerritoryRequest(new Request(`http://test.local/api/contacts/${contact.contactId}/territory`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ colonyId: colonyIds[0] })
    }), { ...territoryDeps(), ...envDeps })).status).toBe(200);

    expect((await handleAssignmentsRequest(new Request(`http://test.local/api/contacts/${contact.contactId}/assignment`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ assignedUserId: visitResponsibleUserId })
    }), { ...assignmentDeps(), ...envDeps })).status).toBe(200);

    const postVisit = await handleVisitsRequest(new Request("http://test.local/api/visits", {
      method: "POST",
      headers,
      body: JSON.stringify({
        contactId: contact.contactId,
        scheduledAt: "2026-07-30T05:00:00.000Z",
        visitLocationText: "HTTP Location"
      })
    }), { ...visitDeps(), ...envDeps });
    expect(postVisit.status).toBe(201);
    const visit = await postVisit.json() as { visitId: string; status: string };
    expect(visit.status).toBe("scheduled");

    const getScheduled = await handleVisitsRequest(new Request(`http://test.local/api/visits/${visit.visitId}`, {
      method: "GET",
      headers
    }), { ...visitDeps(), ...envDeps });
    expect(getScheduled.status).toBe(200);

    const complete = await handleVisitsRequest(new Request(`http://test.local/api/visits/${visit.visitId}/complete`, {
      method: "POST",
      headers,
      body: JSON.stringify({ structuredOutcome: "successful", summary: "HTTP summary" })
    }), { ...visitDeps(), ...envDeps });
    expect(complete.status).toBe(200);

    const getCompleted = await handleVisitsRequest(new Request(`http://test.local/api/visits/${visit.visitId}`, {
      method: "GET",
      headers
    }), { ...visitDeps(), ...envDeps });
    expect(getCompleted.status).toBe(200);
    const completedBody = await getCompleted.json() as { status: string; outcome: string; summary: string };
    expect(completedBody).toMatchObject({ status: "completed", outcome: "successful", summary: "HTTP summary" });

    expect(await countRows("visits", `id = '${visit.visitId}'`)).toBe(1);
    expect(await countRows("visit_results", `visit_id = '${visit.visitId}'`)).toBe(1);
    expect(await countRows("transactional_outbox", `event_name = 'VisitScheduled.v1' AND aggregate_id = '${visit.visitId}'`)).toBe(1);
    expect(await countRows("transactional_outbox", `event_name = 'VisitCompleted.v1' AND aggregate_id = '${visit.visitId}'`)).toBe(1);
  });
});

function twoPartyBarrier(): { wait: () => Promise<void> } {
  let count = 0;
  let release: (() => void) | undefined;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return {
    wait: async () => {
      count += 1;
      if (count === 2) release?.();
      await promise;
    }
  };
}

