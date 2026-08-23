import "dotenv/config";

import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { handleContactsRequest } from "../../apps/web/src/http/contacts-adapter.js";
import { Permission, PermissionChecker, createAuthenticatedActor } from "@tonala/shared/auth";
import { loadAppEnv } from "@tonala/config";
import { createDatabaseClient, createPgPool, closePgPool, type DatabasePool } from "@tonala/shared/database";
import { InMemoryLogger } from "@tonala/shared/observability";
import { applyMigrations } from "../../scripts/db/migrate.js";
import { seedDatabase } from "../../scripts/db/seeds.js";
import {
  CryptoIdGenerator,
  DrizzleAuditWriter,
  DrizzleContactRepository,
  DrizzleOutboxWriter,
  DrizzleTransactionManager
} from "@tonala/modules/contacts/infrastructure";
import {
  getContactById,
  registerMinimalContact,
  type AuditWriter,
  type OutboxWriter
} from "@tonala/modules/contacts/application";

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
const testDatabaseName = `tonala_os_contacts_test_${Date.now()}`;
const testDatabaseUrl = databaseUrlForDb(env.private.DATABASE_URL, testDatabaseName);

let pool: DatabasePool;
let adminUserId: string;

function buildDependencies(overrides: Partial<{
  auditWriter: AuditWriter;
  outboxWriter: OutboxWriter;
}> = {}) {
  const db = createDatabaseClient(pool);
  return {
    contactRepository: new DrizzleContactRepository(db),
    transactionManager: new DrizzleTransactionManager(db),
    auditWriter: overrides.auditWriter ?? new DrizzleAuditWriter(),
    outboxWriter: overrides.outboxWriter ?? new DrizzleOutboxWriter(),
    clock: { now: () => new Date("2026-07-28T01:00:00.000Z") },
    idGenerator: new CryptoIdGenerator(),
    logger: new InMemoryLogger(),
    permissionChecker: new PermissionChecker()
  };
}

function actor(permissions: Permission[] = [Permission.ContactsCreate, Permission.ContactsRead]) {
  return createAuthenticatedActor({
    actorId: adminUserId,
    roles: ["admin"],
    permissions,
    correlationId: crypto.randomUUID(),
    authenticationMethod: "password",
    requestStartedAt: new Date("2026-07-28T00:00:00.000Z")
  });
}

async function countRows(table: string): Promise<number> {
  const result = await pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ${table}`);
  return Number(result.rows[0]?.count ?? 0);
}

describe("contacts registry integration", () => {
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

  it("registers a contact, audit log and pending outbox event atomically", async () => {
    const result = await registerMinimalContact(
      actor(),
      { displayName: "  Contacto   Demo  " },
      buildDependencies()
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(await countRows("contacts")).toBe(1);
    expect(await countRows("audit_logs")).toBe(1);
    expect(await countRows("transactional_outbox")).toBe(1);

    const event = await pool.query<{
      event_name: string;
      status: string;
      payload: { contact_id: string; created_by_user_id: string; created_at: string };
      metadata: { aggregate_type: string; aggregate_id: string; event_version: number };
    }>("SELECT event_name, status, payload, metadata FROM transactional_outbox LIMIT 1");

    expect(event.rows[0]).toMatchObject({
      event_name: "ContactRegistered.v1",
      status: "pending"
    });
    expect(event.rows[0]?.payload).toEqual({
      contact_id: result.value.contactId,
      created_by_user_id: adminUserId,
      created_at: "2026-07-28T01:00:00.000Z"
    });
    expect(JSON.stringify(event.rows[0])).not.toContain("Contacto Demo");
  });

  it("reads a contact by id and returns not_found for missing contact", async () => {
    const created = await registerMinimalContact(actor(), { displayName: "Lectura Demo" }, buildDependencies());
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const found = await getContactById(actor([Permission.ContactsRead]), {
      contactId: created.value.contactId
    }, buildDependencies());
    expect(found).toEqual(created);

    const missing = await getContactById(actor([Permission.ContactsRead]), {
      contactId: crypto.randomUUID()
    }, buildDependencies());
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.error.code).toBe("contact_not_found");
    }
  });

  it("rolls back contact insert when audit fails", async () => {
    const before = await countRows("contacts");
    const failingAudit: AuditWriter = {
      write: () => Promise.reject(new Error("audit failed"))
    };

    const result = await registerMinimalContact(actor(), { displayName: "Rollback Audit" }, buildDependencies({
      auditWriter: failingAudit
    }));

    expect(result.ok).toBe(false);
    expect(await countRows("contacts")).toBe(before);
  });

  it("rolls back contact insert and audit when outbox fails", async () => {
    const beforeContacts = await countRows("contacts");
    const beforeAudit = await countRows("audit_logs");
    const failingOutbox: OutboxWriter = {
      writeContactRegistered: () => Promise.reject(new Error("outbox failed"))
    };

    const result = await registerMinimalContact(actor(), { displayName: "Rollback Outbox" }, buildDependencies({
      outboxWriter: failingOutbox
    }));

    expect(result.ok).toBe(false);
    expect(await countRows("contacts")).toBe(beforeContacts);
    expect(await countRows("audit_logs")).toBe(beforeAudit);
  });

  it("creates a different id for a second request", async () => {
    const first = await registerMinimalContact(actor(), { displayName: "Primero" }, buildDependencies());
    const second = await registerMinimalContact(actor(), { displayName: "Segundo" }, buildDependencies());

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.value.contactId).not.toBe(second.value.contactId);
    }
  });

  it("executes minimal HTTP E2E POST and GET", async () => {
    const deps = {
      ...buildDependencies(),
      env: { NEXT_PUBLIC_APP_ENV: "test" }
    };
    const headers = {
      "content-type": "application/json",
      "x-tonala-actor-id": adminUserId,
      "x-tonala-roles": "admin",
      "x-tonala-permissions": "contacts:create,contacts:read",
      "x-correlation-id": "corr-http-e2e"
    };

    const post = await handleContactsRequest(new Request("http://test.local/api/contacts", {
      method: "POST",
      headers,
      body: JSON.stringify({ displayName: "HTTP Demo" })
    }), deps);
    expect(post.status).toBe(201);
    const created = await post.json() as { contactId: string };

    const get = await handleContactsRequest(new Request(`http://test.local/api/contacts/${created.contactId}`, {
      method: "GET",
      headers
    }), deps);
    expect(get.status).toBe(200);

    const dbState = await pool.query<{ status: string }>(
      "SELECT status FROM transactional_outbox WHERE aggregate_id = $1",
      [created.contactId]
    );
    expect(dbState.rows[0]?.status).toBe("pending");
  });
});

