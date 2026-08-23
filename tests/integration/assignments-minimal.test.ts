import "dotenv/config";

import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { handleAssignmentsRequest } from "../../apps/web/src/http/assignments-adapter.js";
import { handleContactsRequest } from "../../apps/web/src/http/contacts-adapter.js";
import { handleTerritoryRequest } from "../../apps/web/src/http/territory-adapter.js";
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
import {
  assignResponsible,
  getContactAssignment,
  type AuditWriter,
  type ContactAssignmentRepository,
  type OutboxWriter
} from "@tonala/modules/assignments/application";

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
const testDatabaseName = `tonala_os_assignments_test_${Date.now()}`;
const testDatabaseUrl = databaseUrlForDb(env.private.DATABASE_URL, testDatabaseName);

let pool: DatabasePool;
let adminUserId: string;
let coordinatorUserId: string;
let visitResponsibleUserId: string;
let inactiveUserId: string;
let invalidUserId: string;
let colonyId: string;

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
    clock: { now: () => new Date("2026-07-29T01:00:00.000Z") },
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
    clock: { now: () => new Date("2026-07-29T02:00:00.000Z") },
    idGenerator: new TerritoryIdGenerator(),
    logger: new InMemoryLogger(),
    permissionChecker: new PermissionChecker()
  };
}

function assignmentDeps(overrides: Partial<{
  auditWriter: AuditWriter;
  outboxWriter: OutboxWriter;
  repository: ContactAssignmentRepository;
}> = {}) {
  const database = db();
  return {
    contactsReader: new DrizzleContactsReader(database),
    territoryReader: new DrizzleTerritoryReader(database),
    userDirectoryReader: new DrizzleUserDirectoryReader(database),
    contactAssignmentRepository: overrides.repository ?? new DrizzleContactAssignmentRepository(database),
    transactionManager: new AssignmentsTransactionManager(database),
    auditWriter: overrides.auditWriter ?? new AssignmentsAuditWriter(),
    outboxWriter: overrides.outboxWriter ?? new AssignmentsOutboxWriter(),
    clock: { now: () => new Date("2026-07-29T03:00:00.000Z") },
    idGenerator: new AssignmentsIdGenerator(),
    logger: new InMemoryLogger(),
    permissionChecker: new PermissionChecker()
  };
}

function actor(permissions: Permission[] = [
  Permission.ContactsCreate,
  Permission.ContactsRead,
  Permission.TerritoryLink,
  Permission.AssignmentsCreate
]) {
  return createAuthenticatedActor({
    actorId: adminUserId,
    roles: ["admin"],
    permissions,
    correlationId: crypto.randomUUID(),
    authenticationMethod: "password",
    requestStartedAt: new Date("2026-07-29T00:00:00.000Z")
  });
}

async function countRows(table: string, where = "TRUE"): Promise<number> {
  const result = await pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ${table} WHERE ${where}`);
  return Number(result.rows[0]?.count ?? 0);
}

async function createContactWithTerritory(name = "Assigned Contact"): Promise<string> {
  const created = await registerMinimalContact(actor(), { displayName: name }, contactDeps());
  expect(created.ok).toBe(true);
  if (!created.ok) throw new Error("Contact setup failed");
  const territory = await linkContactToColony(actor(), { contactId: created.value.contactId, colonyId }, territoryDeps());
  expect(territory.ok).toBe(true);
  return created.value.contactId;
}

describe("assignments minimal integration", () => {
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
    const colony = await pool.query<{ id: string }>("SELECT id::text AS id FROM colonies ORDER BY name LIMIT 1");
    colonyId = colony.rows[0]?.id ?? "";

    const invalid = await pool.query<{ id: string }>(`
      INSERT INTO user_profiles (email, display_name, role_id)
      SELECT 'capturista.invalid@tonala-os.local', 'Capturista Invalid', roles.id
      FROM roles WHERE roles.key = 'capturist'
      RETURNING id::text AS id
    `);
    invalidUserId = invalid.rows[0]?.id ?? "";

    const visitResponsible = await pool.query<{ id: string }>(`
      INSERT INTO user_profiles (email, display_name, role_id)
      SELECT 'visit.responsible@tonala-os.local', 'Visit Responsible', roles.id
      FROM roles WHERE roles.key = 'visit_responsible'
      RETURNING id::text AS id
    `);
    visitResponsibleUserId = visitResponsible.rows[0]?.id ?? "";

    const inactive = await pool.query<{ id: string }>(`
      INSERT INTO user_profiles (email, display_name, role_id, status)
      SELECT 'inactive.responsible@tonala-os.local', 'Inactive Responsible', roles.id, 'inactive'
      FROM roles WHERE roles.key = 'visit_responsible'
      RETURNING id::text AS id
    `);
    inactiveUserId = inactive.rows[0]?.id ?? "";
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

  it("creates assignment, audit and pending outbox atomically", async () => {
    const contactId = await createContactWithTerritory("Initial Assignment");
    const result = await assignResponsible(actor(), { contactId, assignedUserId: coordinatorUserId }, assignmentDeps());

    expect(result.ok).toBe(true);
    expect(await countRows("contact_assignments", `contact_id = '${contactId}'`)).toBe(1);
    expect(await countRows("audit_logs", `action = 'assignments.responsible_assigned' AND entity_id = '${contactId}'`)).toBe(1);
    const event = await pool.query<{
      event_name: string;
      status: string;
      payload: Record<string, string>;
    }>(
      "SELECT event_name, status, payload FROM transactional_outbox WHERE event_name = 'ResponsibleAssigned.v1' AND aggregate_id = $1",
      [contactId]
    );
    expect(event.rows[0]).toMatchObject({ event_name: "ResponsibleAssigned.v1", status: "pending" });
    expect(event.rows[0]?.payload).toEqual({
      contact_id: contactId,
      assigned_user_id: coordinatorUserId,
      assigned_by_user_id: adminUserId,
      assigned_at: "2026-07-29T03:00:00.000Z"
    });
    expect(JSON.stringify(event.rows[0])).not.toContain("Initial Assignment");
  });

  it("rolls back assignment when audit fails or outbox fails", async () => {
    const auditContactId = await createContactWithTerritory("Rollback Audit Assignment");
    const beforeAssignments = await countRows("contact_assignments");
    const failingAudit: AuditWriter = { write: () => Promise.reject(new Error("audit failed")) };
    const auditResult = await assignResponsible(actor(), {
      contactId: auditContactId,
      assignedUserId: coordinatorUserId
    }, assignmentDeps({ auditWriter: failingAudit }));
    expect(auditResult.ok).toBe(false);
    expect(await countRows("contact_assignments")).toBe(beforeAssignments);

    const outboxContactId = await createContactWithTerritory("Rollback Outbox Assignment");
    const beforeAudit = await countRows("audit_logs");
    const failingOutbox: OutboxWriter = { writeResponsibleAssigned: () => Promise.reject(new Error("outbox failed")) };
    const outboxResult = await assignResponsible(actor(), {
      contactId: outboxContactId,
      assignedUserId: coordinatorUserId
    }, assignmentDeps({ outboxWriter: failingOutbox }));
    expect(outboxResult.ok).toBe(false);
    expect(await countRows("contact_assignments")).toBe(beforeAssignments);
    expect(await countRows("audit_logs")).toBe(beforeAudit);
  });

  it("rejects missing contact, contact without territory and invalid users", async () => {
    const missingContact = await assignResponsible(actor(), {
      contactId: crypto.randomUUID(),
      assignedUserId: coordinatorUserId
    }, assignmentDeps());
    expect(missingContact.ok).toBe(false);
    if (!missingContact.ok) expect(missingContact.error.code).toBe("contact_not_found");

    const created = await registerMinimalContact(actor(), { displayName: "No Territory" }, contactDeps());
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const withoutTerritory = await assignResponsible(actor(), {
      contactId: created.value.contactId,
      assignedUserId: coordinatorUserId
    }, assignmentDeps());
    expect(withoutTerritory.ok).toBe(false);
    if (!withoutTerritory.ok) expect(withoutTerritory.error.code).toBe("contact_territory_not_found");

    const contactId = await createContactWithTerritory("Invalid Users");
    const missingUser = await assignResponsible(actor(), { contactId, assignedUserId: crypto.randomUUID() }, assignmentDeps());
    expect(missingUser.ok).toBe(false);
    if (!missingUser.ok) expect(missingUser.error.code).toBe("responsible_user_not_found");

    const inactiveUser = await assignResponsible(actor(), { contactId, assignedUserId: inactiveUserId }, assignmentDeps());
    expect(inactiveUser.ok).toBe(false);
    if (!inactiveUser.ok) expect(inactiveUser.error.code).toBe("responsible_user_inactive");

    const invalidUser = await assignResponsible(actor(), { contactId, assignedUserId: invalidUserId }, assignmentDeps());
    expect(invalidUser.ok).toBe(false);
    if (!invalidUser.ok) expect(invalidUser.error.code).toBe("responsible_user_not_operational");
  });

  it("is idempotent for same responsible and increments version on reassignment", async () => {
    const contactId = await createContactWithTerritory("Idempotent Assignment");
    const first = await assignResponsible(actor(), { contactId, assignedUserId: coordinatorUserId }, assignmentDeps());
    const beforeEvents = await countRows(
      "transactional_outbox",
      `event_name = 'ResponsibleAssigned.v1' AND aggregate_id = '${contactId}'`
    );
    const same = await assignResponsible(actor(), { contactId, assignedUserId: coordinatorUserId }, assignmentDeps());
    expect(first.ok).toBe(true);
    expect(same.ok).toBe(true);
    if (same.ok) {
      expect(same.value.idempotent).toBe(true);
      expect(same.value.contactAssignment.version).toBe(1);
    }
    expect(await countRows(
      "transactional_outbox",
      `event_name = 'ResponsibleAssigned.v1' AND aggregate_id = '${contactId}'`
    )).toBe(beforeEvents);

    const changed = await assignResponsible(actor(), { contactId, assignedUserId: adminUserId }, assignmentDeps());
    expect(changed.ok).toBe(true);
    if (changed.ok) {
      expect(changed.value.contactAssignment.assignedUserId).toBe(adminUserId);
      expect(changed.value.contactAssignment.version).toBe(2);
    }
  });

  it("reads current assignment and returns not_found", async () => {
    const contactId = await createContactWithTerritory("Read Assignment");
    await assignResponsible(actor(), { contactId, assignedUserId: coordinatorUserId }, assignmentDeps());
    const found = await getContactAssignment(actor([Permission.ContactsRead]), { contactId }, assignmentDeps());
    expect(found.ok).toBe(true);
    if (found.ok) expect(found.value.assignedUserId).toBe(coordinatorUserId);

    const missing = await getContactAssignment(actor([Permission.ContactsRead]), {
      contactId: crypto.randomUUID()
    }, assignmentDeps());
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.error.code).toBe("contact_assignment_not_found");
  });

  it("rejects one concurrent reassignment with optimistic versioning", async () => {
    const contactId = await createContactWithTerritory("Concurrent Assignment");
    await assignResponsible(actor(), { contactId, assignedUserId: coordinatorUserId }, assignmentDeps());
    const realRepository = new DrizzleContactAssignmentRepository(db());
    const barrier = twoPartyBarrier();
    const racingRepository: ContactAssignmentRepository = {
      findByContactId: async (id, tx) => {
        const current = await realRepository.findByContactId(id, tx);
        if (tx && current?.version === 1) await barrier.wait();
        return current;
      },
      insertInitial: (assignment, tx) => realRepository.insertInitial(assignment, tx),
      updateExisting: (input, tx) => realRepository.updateExisting(input, tx)
    };

    const first = assignResponsible(actor(), { contactId, assignedUserId: adminUserId }, assignmentDeps({
      repository: racingRepository
    }));
    const second = assignResponsible(actor(), { contactId, assignedUserId: visitResponsibleUserId }, assignmentDeps({
      repository: racingRepository
    }));
    const results = await Promise.all([first, second]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toHaveLength(1);
    const row = await pool.query<{ version: number }>(
      "SELECT version FROM contact_assignments WHERE contact_id = $1",
      [contactId]
    );
    expect(row.rows[0]?.version).toBe(2);
  });

  it("executes minimal HTTP E2E contact, territory, assignment and idempotent assignment", async () => {
    const headers = {
      "content-type": "application/json",
      "x-tonala-actor-id": adminUserId,
      "x-tonala-roles": "admin",
      "x-tonala-permissions": "contacts:create,contacts:read,territory:link,assignments:create",
      "x-correlation-id": "corr-assignments-http-e2e"
    };
    const envDeps = { env: { NEXT_PUBLIC_APP_ENV: "test" } };
    const post = await handleContactsRequest(new Request("http://test.local/api/contacts", {
      method: "POST",
      headers,
      body: JSON.stringify({ displayName: "HTTP Assignment" })
    }), { ...contactDeps(), ...envDeps });
    expect(post.status).toBe(201);
    const created = await post.json() as { contactId: string };

    const territory = await handleTerritoryRequest(new Request(`http://test.local/api/contacts/${created.contactId}/territory`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ colonyId })
    }), { ...territoryDeps(), ...envDeps });
    expect(territory.status).toBe(200);

    const put = await handleAssignmentsRequest(new Request(`http://test.local/api/contacts/${created.contactId}/assignment`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ assignedUserId: coordinatorUserId })
    }), { ...assignmentDeps(), ...envDeps });
    expect(put.status).toBe(200);

    const get = await handleAssignmentsRequest(new Request(`http://test.local/api/contacts/${created.contactId}/assignment`, {
      method: "GET",
      headers
    }), { ...assignmentDeps(), ...envDeps });
    expect(get.status).toBe(200);

    const beforeEvents = await countRows(
      "transactional_outbox",
      `event_name = 'ResponsibleAssigned.v1' AND aggregate_id = '${created.contactId}'`
    );
    const same = await handleAssignmentsRequest(new Request(`http://test.local/api/contacts/${created.contactId}/assignment`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ assignedUserId: coordinatorUserId })
    }), { ...assignmentDeps(), ...envDeps });
    expect(same.status).toBe(200);
    const body = await same.json() as { idempotent: boolean; contactAssignment: { version: number } };
    expect(body.idempotent).toBe(true);
    expect(body.contactAssignment.version).toBe(1);
    expect(await countRows(
      "transactional_outbox",
      `event_name = 'ResponsibleAssigned.v1' AND aggregate_id = '${created.contactId}'`
    )).toBe(beforeEvents);
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

