import { describe, expect, it } from "vitest";

import { Permission, PermissionChecker, createAuthenticatedActor } from "@tonala/shared/auth";
import { createEntityId } from "@tonala/shared/kernel";
import { InMemoryLogger } from "@tonala/shared/observability";

import { linkContactToColony } from "./link-contact-to-colony.js";
import {
  type AuditWriter,
  type ContactTerritoryRepository,
  type IdGenerator,
  type OutboxWriter,
  type TransactionContext,
  type TransactionManager
} from "./ports.js";

const contactId = createEntityId("00000000-0000-0000-0000-000000000101");
const firstColonyId = createEntityId("00000000-0000-0000-0000-000000000201");
const secondColonyId = createEntityId("00000000-0000-0000-0000-000000000202");

const actor = createAuthenticatedActor({
  actorId: "00000000-0000-0000-0000-000000000001",
  roles: ["coordinator"],
  permissions: [Permission.TerritoryLink],
  correlationId: "corr-territory-test",
  authenticationMethod: "password",
  requestStartedAt: new Date("2026-07-28T00:00:00.000Z")
});

class FakeTransactionManager implements TransactionManager {
  public async transaction<T>(run: (tx: TransactionContext) => Promise<T>): Promise<T> {
    return run({ id: "tx-territory-test" });
  }
}

class SequenceIdGenerator implements IdGenerator {
  private next = 1;

  public newId() {
    const id = `00000000-0000-0000-0000-${String(this.next).padStart(12, "0")}`;
    this.next += 1;
    return createEntityId(id);
  }
}

function dependencies(overrides: Partial<{
  contactExists: boolean;
  colonyExists: boolean;
  repository: ContactTerritoryRepository;
}> = {}) {
  const events: unknown[] = [];
  const audits: unknown[] = [];
  const repository = overrides.repository ?? memoryRepository();
  return {
    events,
    audits,
    repository,
    deps: {
      contactsReader: {
        getContactStatus: () => Promise.resolve(overrides.contactExists === false
          ? null
          : { contactId, status: "active" as const, version: 1 }),
        listContacts: () => Promise.resolve({ items: [], total: 0 }),
        getContactDetail: () => Promise.resolve(null)
      },
      territoryCatalogReader: {
        findActiveColonyById: (colony: typeof firstColonyId) => Promise.resolve(overrides.colonyExists === false
          ? null
          : { colonyId: colony, name: "Centro" }),
        listActiveColonies: () => Promise.resolve([])
      },
      contactTerritoryRepository: repository,
      transactionManager: new FakeTransactionManager(),
      auditWriter: {
        write: (input) => {
          audits.push(input);
          return Promise.resolve();
        }
      } satisfies AuditWriter,
      outboxWriter: {
        writeContactLinkedToColony: (input) => {
          events.push(input);
          return Promise.resolve();
        }
      } satisfies OutboxWriter,
      clock: { now: () => new Date("2026-07-28T00:00:00.000Z") },
      idGenerator: new SequenceIdGenerator(),
      logger: new InMemoryLogger(),
      permissionChecker: new PermissionChecker()
    }
  };
}

function memoryRepository(): ContactTerritoryRepository {
  let current: Awaited<ReturnType<ContactTerritoryRepository["findByContactId"]>> = null;
  return {
    findByContactId: () => Promise.resolve(current),
    upsertInitial: (link) => {
      current = {
        contactId: link.contactId,
        colonyId: link.colonyId,
        colonyName: "Centro",
        territoryStatus: link.territoryStatus,
        linkedAt: link.linkedAt.toISOString(),
        version: link.version
      };
      return Promise.resolve();
    },
    updateExisting: ({ previousVersion, next }) => {
      if (current?.version !== previousVersion) {
        return Promise.resolve(false);
      }
      current = {
        contactId: next.contactId,
        colonyId: next.colonyId,
        colonyName: "Centro",
        territoryStatus: next.territoryStatus,
        linkedAt: next.linkedAt.toISOString(),
        version: next.version
      };
      return Promise.resolve(true);
    }
  };
}

describe("linkContactToColony", () => {
  it("rejects missing permission", async () => {
    const deniedActor = createAuthenticatedActor({
      actorId: actor.actorId,
      roles: ["capturist"],
      permissions: [],
      correlationId: "corr-denied",
      authenticationMethod: "password",
      requestStartedAt: new Date("2026-07-28T00:00:00.000Z")
    });
    const setup = dependencies();
    const result = await linkContactToColony(deniedActor, {
      contactId,
      colonyId: firstColonyId
    }, setup.deps);

    expect(result.ok).toBe(false);
    expect(setup.events).toHaveLength(0);
  });

  it("returns not_found when contact does not exist", async () => {
    const setup = dependencies({ contactExists: false });
    const result = await linkContactToColony(actor, { contactId, colonyId: firstColonyId }, setup.deps);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("contact_not_found");
  });

  it("returns not_found when colony does not exist", async () => {
    const setup = dependencies({ colonyExists: false });
    const result = await linkContactToColony(actor, { contactId, colonyId: firstColonyId }, setup.deps);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("colony_not_found");
  });

  it("creates an initial confirmed territory link and minimal event", async () => {
    const setup = dependencies();
    const result = await linkContactToColony(actor, { contactId, colonyId: firstColonyId }, setup.deps);

    expect(result.ok).toBe(true);
    expect(setup.audits).toHaveLength(1);
    expect(setup.events).toHaveLength(1);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      changed: true,
      idempotent: false,
      contactTerritory: {
        contactId,
        colonyId: firstColonyId,
        territoryStatus: "confirmed",
        version: 1
      }
    });
    expect(setup.events[0]).toMatchObject({
      contactTerritory: {
        contactId,
        colonyId: firstColonyId,
        territoryStatus: "confirmed"
      }
    });
  });

  it("does not create audit or event for the same colony", async () => {
    const setup = dependencies();
    await linkContactToColony(actor, { contactId, colonyId: firstColonyId }, setup.deps);
    const second = await linkContactToColony(actor, { contactId, colonyId: firstColonyId }, setup.deps);

    expect(second.ok).toBe(true);
    expect(setup.audits).toHaveLength(1);
    expect(setup.events).toHaveLength(1);
    if (second.ok) {
      expect(second.value.changed).toBe(false);
      expect(second.value.idempotent).toBe(true);
      expect(second.value.contactTerritory.version).toBe(1);
    }
  });

  it("changes colony and increments version", async () => {
    const setup = dependencies();
    await linkContactToColony(actor, { contactId, colonyId: firstColonyId }, setup.deps);
    const changed = await linkContactToColony(actor, { contactId, colonyId: secondColonyId }, setup.deps);

    expect(changed.ok).toBe(true);
    expect(setup.audits).toHaveLength(2);
    expect(setup.events).toHaveLength(2);
    if (changed.ok) {
      expect(changed.value.contactTerritory.colonyId).toBe(secondColonyId);
      expect(changed.value.contactTerritory.version).toBe(2);
    }
  });

  it("translates stale version update into conflict", async () => {
    const staleRepository = memoryRepository();
    await staleRepository.upsertInitial({
      contactId,
      colonyId: firstColonyId,
      territoryStatus: "confirmed",
      linkedByUserId: actor.actorId,
      linkedAt: new Date("2026-07-28T00:00:00.000Z"),
      version: 1
    }, { id: "setup" });
    const setup = dependencies({
      repository: {
        ...staleRepository,
        updateExisting: () => Promise.resolve(false)
      }
    });

    const result = await linkContactToColony(actor, { contactId, colonyId: secondColonyId }, setup.deps);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("contact_territory_version_conflict");
  });
});

