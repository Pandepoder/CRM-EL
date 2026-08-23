import "dotenv/config";

import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

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
  DrizzleTransactionManager as TerritoryTransactionManager
} from "@tonala/modules/territory/infrastructure";
import {
  getContactTerritory,
  linkContactToColony,
  type AuditWriter,
  type ContactTerritoryRepository,
  type OutboxWriter,
} from "@tonala/modules/territory/application";

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
const testDatabaseName = `tonala_os_territory_test_${Date.now()}`;
const testDatabaseUrl = databaseUrlForDb(env.private.DATABASE_URL, testDatabaseName);

let pool: DatabasePool;
let adminUserId: string;
let colonyIds: string[];

function buildContactDependencies() {
  const db = createDatabaseClient(pool);
  return {
    contactRepository: new DrizzleContactRepository(db),
    transactionManager: new ContactsTransactionManager(db),
    auditWriter: new ContactsAuditWriter(),
    outboxWriter: new ContactsOutboxWriter(),
    clock: { now: () => new Date("2026-07-28T01:00:00.000Z") },
    idGenerator: new ContactsIdGenerator(),
    logger: new InMemoryLogger(),
    permissionChecker: new PermissionChecker()
  };
}

function buildTerritoryDependencies(overrides: Partial<{
  auditWriter: AuditWriter;
  outboxWriter: OutboxWriter;
  repository: ContactTerritoryRepository;
}> = {}) {
  const db = createDatabaseClient(pool);
  return {
    contactsReader: new DrizzleContactsReader(db),
    territoryCatalogReader: new DrizzleTerritoryCatalogReader(db),
    contactTerritoryRepository: overrides.repository ?? new DrizzleContactTerritoryRepository(db),
    transactionManager: new TerritoryTransactionManager(db),
    auditWriter: overrides.auditWriter ?? new TerritoryAuditWriter(),
    outboxWriter: overrides.outboxWriter ?? new TerritoryOutboxWriter(),
    clock: { now: () => new Date("2026-07-28T02:00:00.000Z") },
    idGenerator: new TerritoryIdGenerator(),
    logger: new InMemoryLogger(),
    permissionChecker: new PermissionChecker()
  };
}

function actor(permissions: Permission[] = [
  Permission.ContactsCreate,
  Permission.ContactsRead,
  Permission.TerritoryLink
]) {
  return createAuthenticatedActor({
    actorId: adminUserId,
    roles: ["admin"],
    permissions,
    correlationId: crypto.randomUUID(),
    authenticationMethod: "password",
    requestStartedAt: new Date("2026-07-28T00:00:00.000Z")
  });
}

async function countRows(table: string, where = "TRUE"): Promise<number> {
  const result = await pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ${table} WHERE ${where}`);
  return Number(result.rows[0]?.count ?? 0);
}

async function createContact(displayName = "Territory Contact"): Promise<string> {
  const result = await registerMinimalContact(actor(), { displayName }, buildContactDependencies());
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Contact setup failed");
  return result.value.contactId;
}

describe("territory minimal integration", () => {
  beforeAll(async () => {
    await withAdminPool(async (adminPool) => {
      await adminPool.query(`CREATE DATABASE ${testDatabaseName}`);
    });
    await applyMigrations(testDatabaseUrl);
    await seedDatabase(testDatabaseUrl);
    pool = createPgPool(testDatabaseUrl);
    const user = await pool.query<{ id: string }>(
      "SELECT id::text AS id FROM user_profiles WHERE email = 'admin.demo@tonala-os.local'"
    );
    adminUserId = user.rows[0]?.id ?? "";
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

  it("creates contact_territory, audit log and pending outbox event atomically", async () => {
    const contactId = await createContact("Initial Territory");
    const result = await linkContactToColony(actor(), {
      contactId,
      colonyId: colonyIds[0] ?? ""
    }, buildTerritoryDependencies());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(await countRows("contact_territory", `contact_id = '${contactId}'`)).toBe(1);
    expect(await countRows("audit_logs", `action = 'territory.contact_linked' AND entity_id = '${contactId}'`)).toBe(1);

    const event = await pool.query<{
      event_name: string;
      status: string;
      payload: { contact_id: string; colony_id: string; territory_status: string; linked_at: string };
      metadata: { aggregate_type: string; aggregate_id: string; actor_id: string };
    }>(
      "SELECT event_name, status, payload, metadata FROM transactional_outbox WHERE event_name = 'ContactLinkedToColony.v1' AND aggregate_id = $1",
      [contactId]
    );
    expect(event.rows[0]).toMatchObject({
      event_name: "ContactLinkedToColony.v1",
      status: "pending"
    });
    expect(event.rows[0]?.payload).toEqual({
      contact_id: contactId,
      colony_id: colonyIds[0],
      territory_status: "confirmed",
      linked_at: "2026-07-28T02:00:00.000Z"
    });
    expect(JSON.stringify(event.rows[0])).not.toContain("Initial Territory");
  });

  it("rolls back territory link when audit fails", async () => {
    const contactId = await createContact("Rollback Territory Audit");
    const beforeLinks = await countRows("contact_territory");
    const failingAudit: AuditWriter = {
      write: () => Promise.reject(new Error("audit failed"))
    };

    const result = await linkContactToColony(actor(), {
      contactId,
      colonyId: colonyIds[0] ?? ""
    }, buildTerritoryDependencies({ auditWriter: failingAudit }));

    expect(result.ok).toBe(false);
    expect(await countRows("contact_territory")).toBe(beforeLinks);
  });

  it("rolls back territory link and audit when outbox fails", async () => {
    const contactId = await createContact("Rollback Territory Outbox");
    const beforeLinks = await countRows("contact_territory");
    const beforeAudit = await countRows("audit_logs");
    const failingOutbox: OutboxWriter = {
      writeContactLinkedToColony: () => Promise.reject(new Error("outbox failed"))
    };

    const result = await linkContactToColony(actor(), {
      contactId,
      colonyId: colonyIds[0] ?? ""
    }, buildTerritoryDependencies({ outboxWriter: failingOutbox }));

    expect(result.ok).toBe(false);
    expect(await countRows("contact_territory")).toBe(beforeLinks);
    expect(await countRows("audit_logs")).toBe(beforeAudit);
  });

  it("rejects missing contact and missing colony", async () => {
    const missingContact = await linkContactToColony(actor(), {
      contactId: crypto.randomUUID(),
      colonyId: colonyIds[0] ?? ""
    }, buildTerritoryDependencies());
    expect(missingContact.ok).toBe(false);
    if (!missingContact.ok) expect(missingContact.error.code).toBe("contact_not_found");

    const contactId = await createContact("Missing Colony");
    const missingColony = await linkContactToColony(actor(), {
      contactId,
      colonyId: crypto.randomUUID()
    }, buildTerritoryDependencies());
    expect(missingColony.ok).toBe(false);
    if (!missingColony.ok) expect(missingColony.error.code).toBe("colony_not_found");
  });

  it("does not duplicate event or increment version for the same colony", async () => {
    const contactId = await createContact("Idempotent Territory");
    const first = await linkContactToColony(actor(), {
      contactId,
      colonyId: colonyIds[0] ?? ""
    }, buildTerritoryDependencies());
    const beforeEvents = await countRows(
      "transactional_outbox",
      `event_name = 'ContactLinkedToColony.v1' AND aggregate_id = '${contactId}'`
    );
    const second = await linkContactToColony(actor(), {
      contactId,
      colonyId: colonyIds[0] ?? ""
    }, buildTerritoryDependencies());

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.value.idempotent).toBe(true);
      expect(second.value.contactTerritory.version).toBe(1);
    }
    expect(await countRows(
      "transactional_outbox",
      `event_name = 'ContactLinkedToColony.v1' AND aggregate_id = '${contactId}'`
    )).toBe(beforeEvents);
  });

  it("changes colony and increments version", async () => {
    const contactId = await createContact("Changed Territory");
    await linkContactToColony(actor(), { contactId, colonyId: colonyIds[0] ?? "" }, buildTerritoryDependencies());
    const changed = await linkContactToColony(actor(), {
      contactId,
      colonyId: colonyIds[1] ?? ""
    }, buildTerritoryDependencies());

    expect(changed.ok).toBe(true);
    if (changed.ok) {
      expect(changed.value.contactTerritory.colonyId).toBe(colonyIds[1]);
      expect(changed.value.contactTerritory.version).toBe(2);
    }
  });

  it("reads current territory and returns not_found when missing", async () => {
    const contactId = await createContact("Read Territory");
    await linkContactToColony(actor(), { contactId, colonyId: colonyIds[0] ?? "" }, buildTerritoryDependencies());

    const found = await getContactTerritory(actor([Permission.ContactsRead]), { contactId }, buildTerritoryDependencies());
    expect(found.ok).toBe(true);
    if (found.ok) {
      expect(found.value.colonyName).toBeTruthy();
      expect(found.value.territoryStatus).toBe("confirmed");
    }

    const missing = await getContactTerritory(actor([Permission.ContactsRead]), {
      contactId: crypto.randomUUID()
    }, buildTerritoryDependencies());
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.error.code).toBe("contact_territory_not_found");
  });

  it("rejects one concurrent change through optimistic versioning", async () => {
    const contactId = await createContact("Concurrent Territory");
    await linkContactToColony(actor(), { contactId, colonyId: colonyIds[0] ?? "" }, buildTerritoryDependencies());
    const realRepository = new DrizzleContactTerritoryRepository(createDatabaseClient(pool));
    const barrier = twoPartyBarrier();
    const racingRepository: ContactTerritoryRepository = {
      findByContactId: async (id, tx) => {
        const current = await realRepository.findByContactId(id, tx);
        if (tx && current?.version === 1) {
          await barrier.wait();
        }
        return current;
      },
      updateExisting: (input, tx) => realRepository.updateExisting(input, tx),
      upsertInitial: (link, tx) => realRepository.upsertInitial(link, tx)
    };

    const first = linkContactToColony(actor(), {
      contactId,
      colonyId: colonyIds[1] ?? ""
    }, buildTerritoryDependencies({ repository: racingRepository }));
    const second = linkContactToColony(actor(), {
      contactId,
      colonyId: colonyIds[2] ?? ""
    }, buildTerritoryDependencies({ repository: racingRepository }));

    const results = await Promise.all([first, second]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toHaveLength(1);
    const row = await pool.query<{ version: number }>(
      "SELECT version FROM contact_territory WHERE contact_id = $1",
      [contactId]
    );
    expect(row.rows[0]?.version).toBe(2);
  });

  it("executes minimal HTTP E2E POST, PUT, GET and idempotent PUT", async () => {
    const contactDeps = {
      ...buildContactDependencies(),
      env: { NEXT_PUBLIC_APP_ENV: "test" }
    };
    const territoryDeps = {
      ...buildTerritoryDependencies(),
      env: { NEXT_PUBLIC_APP_ENV: "test" }
    };
    const headers = {
      "content-type": "application/json",
      "x-tonala-actor-id": adminUserId,
      "x-tonala-roles": "admin",
      "x-tonala-permissions": "contacts:create,contacts:read,territory:link",
      "x-correlation-id": "corr-territory-http-e2e"
    };

    const post = await handleContactsRequest(new Request("http://test.local/api/contacts", {
      method: "POST",
      headers,
      body: JSON.stringify({ displayName: "HTTP Territory" })
    }), contactDeps);
    expect(post.status).toBe(201);
    const created = await post.json() as { contactId: string };

    const put = await handleTerritoryRequest(new Request(`http://test.local/api/contacts/${created.contactId}/territory`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ colonyId: colonyIds[0] })
    }), territoryDeps);
    expect(put.status).toBe(200);

    const get = await handleTerritoryRequest(new Request(`http://test.local/api/contacts/${created.contactId}/territory`, {
      method: "GET",
      headers
    }), territoryDeps);
    expect(get.status).toBe(200);

    const beforeEvents = await countRows(
      "transactional_outbox",
      `event_name = 'ContactLinkedToColony.v1' AND aggregate_id = '${created.contactId}'`
    );
    const idempotentPut = await handleTerritoryRequest(new Request(`http://test.local/api/contacts/${created.contactId}/territory`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ colonyId: colonyIds[0] })
    }), territoryDeps);
    expect(idempotentPut.status).toBe(200);
    const idempotentBody = await idempotentPut.json() as { idempotent: boolean; contactTerritory: { version: number } };
    expect(idempotentBody.idempotent).toBe(true);
    expect(idempotentBody.contactTerritory.version).toBe(1);
    expect(await countRows(
      "transactional_outbox",
      `event_name = 'ContactLinkedToColony.v1' AND aggregate_id = '${created.contactId}'`
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
      if (count === 2) {
        release?.();
      }
      await promise;
    }
  };
}

