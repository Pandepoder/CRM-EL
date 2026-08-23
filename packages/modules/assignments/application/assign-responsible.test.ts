import { describe, expect, it } from "vitest";

import { Permission, PermissionChecker, createAuthenticatedActor } from "@tonala/shared/auth";
import { createEntityId } from "@tonala/shared/kernel";
import { InMemoryLogger } from "@tonala/shared/observability";

import { assignResponsible } from "./assign-responsible.js";
import {
  type AuditWriter,
  type ContactAssignmentRepository,
  type IdGenerator,
  type OutboxWriter,
  type TransactionContext,
  type TransactionManager,
  type UserDirectoryView
} from "./ports.js";

const contactId = createEntityId("00000000-0000-0000-0000-000000000101");
const firstUserId = createEntityId("00000000-0000-0000-0000-000000000201");
const secondUserId = createEntityId("00000000-0000-0000-0000-000000000202");

const actor = createAuthenticatedActor({
  actorId: "00000000-0000-0000-0000-000000000001",
  roles: ["coordinator"],
  permissions: [Permission.AssignmentsCreate],
  correlationId: "corr-assignments-test",
  authenticationMethod: "password",
  requestStartedAt: new Date("2026-07-29T00:00:00.000Z")
});

class FakeTransactionManager implements TransactionManager {
  public async transaction<T>(run: (tx: TransactionContext) => Promise<T>): Promise<T> {
    return run({ id: "tx-assignments-test" });
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
  contact: null | { readonly status: "active" };
  territory: null | { readonly status: "confirmed" | "pending" };
  user: null | UserDirectoryView;
  repository: ContactAssignmentRepository;
}> = {}) {
  const events: unknown[] = [];
  const audits: unknown[] = [];
  const repository = overrides.repository ?? memoryRepository();
  return {
    audits,
    events,
    repository,
    deps: {
      contactsReader: {
        getContactStatus: () => Promise.resolve(overrides.contact === null
          ? null
          : { contactId, status: "active" as const, version: 1 }),
        listContacts: () => Promise.resolve({ items: [], total: 0 }),
        getContactDetail: () => Promise.resolve(null)
      },
      territoryReader: {
        getContactTerritory: () => Promise.resolve(overrides.territory === null
          ? null
          : {
            contactId,
            colonyId: createEntityId("00000000-0000-0000-0000-000000000301"),
            territoryStatus: overrides.territory?.status ?? "confirmed",
            linkedAt: "2026-07-29T00:00:00.000Z",
            version: 1
          }),
        listActiveColonies: () => Promise.resolve([]),
        getSectionStats: () => Promise.resolve(null)
      },
      userDirectoryReader: {
        getUserCapability: (userId: typeof firstUserId) => Promise.resolve(overrides.user === null
          ? null
          : overrides.user ?? {
            userId,
            active: true,
            roles: ["visit_responsible"],
            permissions: []
          })
      },
      contactAssignmentRepository: repository,
      transactionManager: new FakeTransactionManager(),
      auditWriter: {
        write: (input) => {
          audits.push(input);
          return Promise.resolve();
        }
      } satisfies AuditWriter,
      outboxWriter: {
        writeResponsibleAssigned: (input) => {
          events.push(input);
          return Promise.resolve();
        }
      } satisfies OutboxWriter,
      clock: { now: () => new Date("2026-07-29T01:00:00.000Z") },
      idGenerator: new SequenceIdGenerator(),
      logger: new InMemoryLogger(),
      permissionChecker: new PermissionChecker()
    }
  };
}

function memoryRepository(): ContactAssignmentRepository {
  let current: Awaited<ReturnType<ContactAssignmentRepository["findByContactId"]>> = null;
  return {
    findByContactId: () => Promise.resolve(current),
    insertInitial: (assignment) => {
      current = {
        contactId: assignment.contactId,
        assignedUserId: assignment.assignedUserId,
        assignmentStatus: assignment.assignmentStatus,
        assignedAt: assignment.assignedAt.toISOString(),
        version: assignment.version
      };
      return Promise.resolve();
    },
    updateExisting: ({ previousVersion, next }) => {
      if (current?.version !== previousVersion) return Promise.resolve(false);
      current = {
        contactId: next.contactId,
        assignedUserId: next.assignedUserId,
        assignmentStatus: next.assignmentStatus,
        assignedAt: next.assignedAt.toISOString(),
        version: next.version
      };
      return Promise.resolve(true);
    }
  };
}

describe("assignResponsible", () => {
  it("rejects missing permission", async () => {
    const deniedActor = createAuthenticatedActor({
      actorId: actor.actorId,
      roles: ["capturist"],
      permissions: [],
      correlationId: "corr-denied",
      authenticationMethod: "password",
      requestStartedAt: new Date("2026-07-29T00:00:00.000Z")
    });
    const setup = dependencies();
    const result = await assignResponsible(deniedActor, { contactId, assignedUserId: firstUserId }, setup.deps);

    expect(result.ok).toBe(false);
    expect(setup.events).toHaveLength(0);
  });

  it("rejects missing contact, territory and invalid territory status", async () => {
    const missingContact = await assignResponsible(actor, { contactId, assignedUserId: firstUserId }, dependencies({
      contact: null
    }).deps);
    expect(missingContact.ok).toBe(false);
    if (!missingContact.ok) expect(missingContact.error.code).toBe("contact_not_found");

    const missingTerritory = await assignResponsible(actor, { contactId, assignedUserId: firstUserId }, dependencies({
      territory: null
    }).deps);
    expect(missingTerritory.ok).toBe(false);
    if (!missingTerritory.ok) expect(missingTerritory.error.code).toBe("contact_territory_not_found");

    const pendingTerritory = await assignResponsible(actor, { contactId, assignedUserId: firstUserId }, dependencies({
      territory: { status: "pending" }
    }).deps);
    expect(pendingTerritory.ok).toBe(false);
    if (!pendingTerritory.ok) expect(pendingTerritory.error.code).toBe("contact_territory_not_confirmed");
  });

  it("rejects missing, inactive or non-operational user", async () => {
    const missingUser = await assignResponsible(actor, { contactId, assignedUserId: firstUserId }, dependencies({
      user: null
    }).deps);
    expect(missingUser.ok).toBe(false);
    if (!missingUser.ok) expect(missingUser.error.code).toBe("responsible_user_not_found");

    const inactiveUser = await assignResponsible(actor, { contactId, assignedUserId: firstUserId }, dependencies({
      user: { userId: firstUserId, active: false, roles: ["visit_responsible"], permissions: [] }
    }).deps);
    expect(inactiveUser.ok).toBe(false);
    if (!inactiveUser.ok) expect(inactiveUser.error.code).toBe("responsible_user_inactive");

    const invalidUser = await assignResponsible(actor, { contactId, assignedUserId: firstUserId }, dependencies({
      user: { userId: firstUserId, active: true, roles: ["capturist"], permissions: [] }
    }).deps);
    expect(invalidUser.ok).toBe(false);
    if (!invalidUser.ok) expect(invalidUser.error.code).toBe("responsible_user_not_operational");
  });

  it("creates initial assignment with minimal event", async () => {
    const setup = dependencies();
    const result = await assignResponsible(actor, { contactId, assignedUserId: firstUserId }, setup.deps);

    expect(result.ok).toBe(true);
    expect(setup.audits).toHaveLength(1);
    expect(setup.events).toHaveLength(1);
    if (!result.ok) return;
    expect(result.value.contactAssignment).toMatchObject({
      contactId,
      assignedUserId: firstUserId,
      assignmentStatus: "active",
      version: 1
    });
  });

  it("does not emit event for same assignment", async () => {
    const setup = dependencies();
    await assignResponsible(actor, { contactId, assignedUserId: firstUserId }, setup.deps);
    const second = await assignResponsible(actor, { contactId, assignedUserId: firstUserId }, setup.deps);

    expect(second.ok).toBe(true);
    expect(setup.audits).toHaveLength(1);
    expect(setup.events).toHaveLength(1);
    if (second.ok) {
      expect(second.value.idempotent).toBe(true);
      expect(second.value.contactAssignment.version).toBe(1);
    }
  });

  it("reassigns and increments version", async () => {
    const setup = dependencies();
    await assignResponsible(actor, { contactId, assignedUserId: firstUserId }, setup.deps);
    const changed = await assignResponsible(actor, { contactId, assignedUserId: secondUserId }, setup.deps);

    expect(changed.ok).toBe(true);
    expect(setup.audits).toHaveLength(2);
    expect(setup.events).toHaveLength(2);
    if (changed.ok) {
      expect(changed.value.contactAssignment.assignedUserId).toBe(secondUserId);
      expect(changed.value.contactAssignment.version).toBe(2);
    }
  });

  it("translates stale version update into conflict", async () => {
    const base = memoryRepository();
    await base.insertInitial({
      contactId,
      assignedUserId: firstUserId,
      assignmentStatus: "active",
      assignedByUserId: actor.actorId,
      assignedAt: new Date("2026-07-29T00:00:00.000Z"),
      version: 1
    }, { id: "setup" });
    const setup = dependencies({
      repository: {
        findByContactId: (id, tx) => base.findByContactId(id, tx),
        insertInitial: (assignment, tx) => base.insertInitial(assignment, tx),
        updateExisting: () => Promise.resolve(false)
      }
    });
    const result = await assignResponsible(actor, { contactId, assignedUserId: secondUserId }, setup.deps);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("contact_assignment_version_conflict");
  });
});

