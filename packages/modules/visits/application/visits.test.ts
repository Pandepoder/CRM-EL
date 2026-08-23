import { describe, expect, it } from "vitest";

import { Permission, PermissionChecker, createAuthenticatedActor } from "@tonala/shared/auth";
import { createEntityId } from "@tonala/shared/kernel";
import { InMemoryLogger } from "@tonala/shared/observability";

import { completeVisit } from "./complete-visit.js";
import { scheduleVisit } from "./schedule-visit.js";
import {
  type AuditWriter,
  type IdGenerator,
  type OutboxWriter,
  type TransactionContext,
  type TransactionManager,
  type VisitRepository,
  type VisitResultRepository
} from "./ports.js";

const contactId = createEntityId("00000000-0000-0000-0000-000000000101");
const colonyId = createEntityId("00000000-0000-0000-0000-000000000201");
const assignedUserId = createEntityId("00000000-0000-0000-0000-000000000301");
const visitId = createEntityId("00000000-0000-0000-0000-000000000401");

const scheduler = createAuthenticatedActor({
  actorId: "00000000-0000-0000-0000-000000000001",
  roles: ["coordinator"],
  permissions: [Permission.VisitsSchedule, Permission.VisitsComplete, Permission.ContactsRead],
  correlationId: "corr-visits-test",
  authenticationMethod: "password",
  requestStartedAt: new Date("2026-07-30T00:00:00.000Z")
});

const responsible = createAuthenticatedActor({
  actorId: assignedUserId,
  roles: ["visit_responsible"],
  permissions: [Permission.VisitsComplete],
  correlationId: "corr-responsible",
  authenticationMethod: "password",
  requestStartedAt: new Date("2026-07-30T00:00:00.000Z")
});

class FakeTransactionManager implements TransactionManager {
  public async transaction<T>(run: (tx: TransactionContext) => Promise<T>): Promise<T> {
    return run({ id: "tx-visits-test" });
  }
}

class SequenceIdGenerator implements IdGenerator {
  private next = 1;

  public newId() {
    if (this.next === 1) {
      this.next += 1;
      return visitId;
    }
    const id = `00000000-0000-0000-0000-${String(500 + this.next).padStart(12, "0")}`;
    this.next += 1;
    return createEntityId(id);
  }
}

function setup() {
  const audits: unknown[] = [];
  const scheduledEvents: unknown[] = [];
  const completedEvents: unknown[] = [];
  const visitRepository = memoryVisitRepository();
  const visitResultRepository: VisitResultRepository & { readonly results: unknown[] } = {
    results: [],
    insert: (result) => {
      visitResultRepository.results.push(result);
      return Promise.resolve();
    }
  };
  const auditWriter: AuditWriter = {
    write: (input) => {
      audits.push(input);
      return Promise.resolve();
    }
  };
  const outboxWriter: OutboxWriter = {
    writeVisitScheduled: (input) => {
      scheduledEvents.push({
        payload: {
          visit_id: input.visit.visitId,
          contact_id: input.visit.contactId,
          assigned_user_id: input.visit.assignedUserId,
          colony_id: input.visit.colonyId,
          scheduled_at: input.visit.scheduledAt.toISOString()
        }
      });
      return Promise.resolve();
    },
    writeVisitCompleted: (input) => {
      completedEvents.push({
        payload: {
          visit_id: input.visit.visitId,
          contact_id: input.visit.contactId,
          completed_by_user_id: input.result.completedByUserId,
          completed_at: input.result.completedAt.toISOString(),
          outcome: input.result.structuredOutcome
        }
      });
      return Promise.resolve();
    }
  };
  const common = {
    visitRepository,
    transactionManager: new FakeTransactionManager(),
    auditWriter,
    outboxWriter,
    clock: { now: () => new Date("2026-07-30T01:00:00.000Z") },
    idGenerator: new SequenceIdGenerator(),
    logger: new InMemoryLogger(),
    permissionChecker: new PermissionChecker()
  };

  return {
    audits,
    scheduledEvents,
    completedEvents,
    visitRepository,
    visitResultRepository,
    scheduleDeps: {
      contactsReader: {
        getContactStatus: () => Promise.resolve({ contactId, status: "active" as const, version: 1 }),
        listContacts: () => Promise.resolve({ items: [], total: 0 }),
        getContactDetail: () => Promise.resolve(null)
      },
      territoryReader: {
        getContactTerritory: () => Promise.resolve({
          contactId,
          colonyId,
          territoryStatus: "confirmed" as const,
          linkedAt: new Date().toISOString(),
          version: 1
        }),
        listActiveColonies: () => Promise.resolve([]),
        getSectionStats: () => Promise.resolve(null)
      },
      assignmentsReader: {
        getContactAssignment: () => Promise.resolve({
          contactId,
          assignedUserId,
          assignmentStatus: "active" as const,
          assignedAt: "2026-07-30T00:00:00.000Z",
          version: 1
        })
      },
      ...common
    },
    completeDeps: {
      ...common,
      visitResultRepository
    }
  };
}

function memoryVisitRepository(): VisitRepository {
  let current: Awaited<ReturnType<VisitRepository["findById"]>> = null;
  return {
    insert: (visit) => {
      current = {
        visitId: visit.visitId,
        contactId: visit.contactId,
        colonyId: visit.colonyId,
        assignedUserId: visit.assignedUserId,
        scheduledAt: visit.scheduledAt.toISOString(),
        status: visit.status,
        visitLocationText: visit.visitLocationText,
        createdAt: visit.createdAt.toISOString(),
        completedAt: null,
        completedByUserId: null,
        outcome: null,
        summary: null,
        version: visit.version
      };
      return Promise.resolve();
    },
    findById: () => Promise.resolve(current),
    updateCompleted: ({ previousVersion, next }) => {
      if (!current || current.version !== previousVersion || current.status !== "scheduled") {
        return Promise.resolve(false);
      }
      current = {
        ...current,
        status: "completed",
        completedAt: next.completedAt.toISOString(),
        completedByUserId: next.completedByUserId,
        version: next.version
      };
      return Promise.resolve(true);
    }
  };
}

describe("visits application", () => {
  it("schedules a visit with snapshot and minimal event", async () => {
    const s = setup();
    const result = await scheduleVisit(scheduler, {
      contactId,
      scheduledAt: "2026-07-30T02:00:00.000Z",
      visitLocationText: "  Oficina   principal  "
    }, s.scheduleDeps);

    expect(result.ok).toBe(true);
    expect(s.audits).toHaveLength(1);
    expect(s.scheduledEvents).toHaveLength(1);
    if (result.ok) {
      expect(result.value).toMatchObject({
        contactId,
        colonyId,
        assignedUserId,
        status: "scheduled",
        visitLocationText: "Oficina principal",
        version: 1
      });
    }
    expect(JSON.stringify(s.scheduledEvents[0])).not.toContain("Oficina principal");
  });

  it("rejects schedule without permission, missing prerequisites, past date or empty location", async () => {
    const denied = createAuthenticatedActor({
      actorId: scheduler.actorId,
      roles: [],
      permissions: [],
      correlationId: "corr-denied",
      authenticationMethod: "password",
      requestStartedAt: new Date("2026-07-30T00:00:00.000Z")
    });
    const s = setup();
    const noPermission = await scheduleVisit(denied, {
      contactId,
      scheduledAt: "2026-07-30T02:00:00.000Z",
      visitLocationText: "Casa"
    }, s.scheduleDeps);
    expect(noPermission.ok).toBe(false);

    const past = await scheduleVisit(scheduler, {
      contactId,
      scheduledAt: "2026-07-29T02:00:00.000Z",
      visitLocationText: "Casa"
    }, s.scheduleDeps);
    expect(past.ok).toBe(false);
    if (!past.ok) expect(past.error.code).toBe("visit_scheduled_at_in_past");

    const empty = await scheduleVisit(scheduler, {
      contactId,
      scheduledAt: "2026-07-30T02:00:00.000Z",
      visitLocationText: "   "
    }, s.scheduleDeps);
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.error.code).toBe("visit_location_required");
  });

  it("completes a visit with result and minimal event", async () => {
    const s = setup();
    await scheduleVisit(scheduler, {
      contactId,
      scheduledAt: "2026-07-30T02:00:00.000Z",
      visitLocationText: "Casa"
    }, s.scheduleDeps);
    const result = await completeVisit(responsible, {
      visitId,
      structuredOutcome: "follow_up_required",
      summary: "  Pidio   nueva reunion  "
    }, s.completeDeps);

    expect(result.ok).toBe(true);
    expect(s.completedEvents).toHaveLength(1);
    expect(s.visitResultRepository.results).toHaveLength(1);
    if (result.ok) {
      expect(result.value.status).toBe("completed");
      expect(result.value.outcome).toBe("follow_up_required");
      expect(result.value.summary).toBe("Pidio nueva reunion");
      expect(result.value.version).toBe(2);
    }
    expect(JSON.stringify(s.completedEvents[0])).not.toContain("Pidio nueva reunion");
  });

  it("rejects unauthorized, invalid outcome, empty summary and second completion", async () => {
    const s = setup();
    await scheduleVisit(scheduler, {
      contactId,
      scheduledAt: "2026-07-30T02:00:00.000Z",
      visitLocationText: "Casa"
    }, s.scheduleDeps);
    const outsider = createAuthenticatedActor({
      actorId: "00000000-0000-0000-0000-000000000999",
      roles: ["visit_responsible"],
      permissions: [Permission.VisitsComplete],
      correlationId: "corr-outsider",
      authenticationMethod: "password",
      requestStartedAt: new Date("2026-07-30T00:00:00.000Z")
    });
    const unauthorized = await completeVisit(outsider, {
      visitId,
      structuredOutcome: "successful",
      summary: "Ok"
    }, s.completeDeps);
    expect(unauthorized.ok).toBe(false);
    if (!unauthorized.ok) expect(unauthorized.error.code).toBe("visit_completion_not_authorized");

    const invalidOutcome = await completeVisit(responsible, {
      visitId,
      structuredOutcome: "other",
      summary: "Ok"
    }, s.completeDeps);
    expect(invalidOutcome.ok).toBe(false);
    if (!invalidOutcome.ok) expect(invalidOutcome.error.code).toBe("visit_outcome_invalid");

    const emptySummary = await completeVisit(responsible, {
      visitId,
      structuredOutcome: "successful",
      summary: " "
    }, s.completeDeps);
    expect(emptySummary.ok).toBe(false);
    if (!emptySummary.ok) expect(emptySummary.error.code).toBe("visit_summary_required");

    const completed = await completeVisit(responsible, {
      visitId,
      structuredOutcome: "successful",
      summary: "Ok"
    }, s.completeDeps);
    expect(completed.ok).toBe(true);
    const second = await completeVisit(responsible, {
      visitId,
      structuredOutcome: "successful",
      summary: "Again"
    }, s.completeDeps);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe("visit_already_completed");
  });
});


