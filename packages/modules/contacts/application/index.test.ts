import { describe, expect, it } from "vitest";

import { Permission, PermissionChecker, createAuthenticatedActor } from "@tonala/shared/auth";
import { InMemoryLogger } from "@tonala/shared/observability";

import { registerMinimalContact } from "./index.js";
import {
  type AuditWriter,
  type ContactRepository,
  type IdGenerator,
  type OutboxWriter,
  type TransactionContext,
  type TransactionManager
} from "./ports.js";

const actor = createAuthenticatedActor({
  actorId: "00000000-0000-0000-0000-000000000001",
  roles: ["capturist"],
  permissions: [Permission.ContactsCreate],
  correlationId: "corr-contacts-test",
  authenticationMethod: "password",
  requestStartedAt: new Date("2026-07-28T00:00:00.000Z")
});

class FakeTransactionManager implements TransactionManager {
  public async transaction<T>(run: (tx: TransactionContext) => Promise<T>): Promise<T> {
    return run({ id: "tx-test" });
  }
}

class SequenceIdGenerator implements IdGenerator {
  private next = 1;

  public newId() {
    const id = `00000000-0000-0000-0000-${String(this.next).padStart(12, "0")}`;
    this.next += 1;
    return id as ReturnType<IdGenerator["newId"]>;
  }
}

function dependencies(overrides: Partial<{
  contactRepository: ContactRepository;
  auditWriter: AuditWriter;
  outboxWriter: OutboxWriter;
}> = {}) {
  const inserted: unknown[] = [];
  const events: unknown[] = [];
  return {
    inserted,
    events,
    deps: {
      contactRepository: overrides.contactRepository ?? {
        insert: (contact) => {
          inserted.push(contact);
          return Promise.resolve();
        },
        findById: () => Promise.resolve(null)
      },
      transactionManager: new FakeTransactionManager(),
      auditWriter: overrides.auditWriter ?? {
        write: () => Promise.resolve()
      },
      outboxWriter: overrides.outboxWriter ?? {
        writeContactRegistered: (event) => {
          events.push(event);
          return Promise.resolve();
        }
      },
      clock: { now: () => new Date("2026-07-28T00:00:00.000Z") },
      idGenerator: new SequenceIdGenerator(),
      logger: new InMemoryLogger(),
      permissionChecker: new PermissionChecker()
    }
  };
}

describe("registerMinimalContact", () => {
  it("creates a contact and minimal event when permission is allowed", async () => {
    const setup = dependencies();
    const result = await registerMinimalContact(actor, { displayName: "  Maria   Lopez  " }, setup.deps);

    expect(result.ok).toBe(true);
    expect(setup.inserted).toHaveLength(1);
    expect(setup.events).toHaveLength(1);
    if (result.ok) {
      expect(result.value.displayName).toBe("Maria Lopez");
    }
  });

  it("rejects missing permission", async () => {
    const deniedActor = createAuthenticatedActor({
      actorId: "00000000-0000-0000-0000-000000000001",
      roles: ["capturist"],
      permissions: [],
      correlationId: "corr-denied",
      authenticationMethod: "password",
      requestStartedAt: new Date("2026-07-28T00:00:00.000Z")
    });
    const setup = dependencies();
    const result = await registerMinimalContact(deniedActor, { displayName: "Maria" }, setup.deps);

    expect(result.ok).toBe(false);
    expect(setup.inserted).toHaveLength(0);
  });
});


