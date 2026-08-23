import { describe, expect, it } from "vitest";

import { InMemoryLogger } from "@tonala/shared/observability";

import {
  createProjectionDefinition,
  createProjectionEventDescriptor,
  createProjectionIdentity,
  createProjectionName,
  createProjectionVersion,
  DuplicateSupportedEvent,
  EmptySupportedEvents,
  ProjectionMode,
  ProjectionRegistry,
  ProjectionStatus,
  createProjectionCheckpoint,
  transitionProjectionStatus,
  InvalidProjectionStatusTransition,
  ProjectionStateConcurrencyConflict,
  ProjectionStateNotFound,
  ProjectionReceiptAlreadyExists,
  projectionConsumerName,
  projectionEventDescriptorKey,
  projectionIdentityKey,
  type ProjectionDefinition,
  type ProjectionEvent,
  type ProjectionName,
  type ProjectionVersion,
  type RebuildPolicy
} from "../public.js";

const rebuildPolicy: RebuildPolicy = {
  rebuildable: true,
  source: "outbox_history",
  strategy: "shadow"
};

function mustName(value: string): ProjectionName {
  const result = createProjectionName(value);
  expect(result.ok).toBe(true);
  if (!result.ok) throw result.error;
  return result.value;
}

function mustVersion(value: string): ProjectionVersion {
  const result = createProjectionVersion(value);
  expect(result.ok).toBe(true);
  if (!result.ok) throw result.error;
  return result.value;
}

function mustDescriptor(eventName: string, eventVersion = "v1") {
  const result = createProjectionEventDescriptor({ eventName, eventVersion });
  expect(result.ok).toBe(true);
  if (!result.ok) throw result.error;
  return result.value;
}

function definition(input: {
  readonly name: string;
  readonly version?: string;
  readonly events?: readonly ReturnType<typeof mustDescriptor>[];
}): ProjectionDefinition<Record<string, never>> {
  return createProjectionDefinition({
    identity: createProjectionIdentity({
      projectionName: mustName(input.name),
      projectionVersion: mustVersion(input.version ?? "v1")
    }),
    supportedEvents: input.events ?? [mustDescriptor("ContactRegistered", "v1")],
    rebuildPolicy,
    handle: () => Promise.resolve()
  });
}

function event(eventName = "ContactRegistered", eventVersion = "v1"): ProjectionEvent {
  return {
    eventId: "event-1",
    eventName,
    eventVersion: mustVersion(eventVersion),
    aggregateType: "contact",
    aggregateId: "contact-1",
    payload: {},
    metadata: {},
    createdAt: "2026-07-30T00:00:00.000Z"
  };
}

describe("ProjectionName", () => {
  it("accepts lowercase snake_case names", () => {
    expect(createProjectionName("walking_skeleton").ok).toBe(true);
  });

  it("rejects empty names", () => {
    expect(createProjectionName("").ok).toBe(false);
  });

  it("rejects uppercase names", () => {
    expect(createProjectionName("WalkingSkeleton").ok).toBe(false);
  });

  it("rejects spaces", () => {
    expect(createProjectionName("walking skeleton").ok).toBe(false);
  });

  it("rejects invalid characters", () => {
    expect(createProjectionName("walking-skeleton").ok).toBe(false);
  });

  it("rejects names over the maximum length", () => {
    expect(createProjectionName("a".repeat(65)).ok).toBe(false);
  });
});

describe("ProjectionVersion", () => {
  it("accepts v1", () => {
    expect(createProjectionVersion("v1").ok).toBe(true);
  });

  it("accepts v2", () => {
    expect(createProjectionVersion("v2").ok).toBe(true);
  });

  it("rejects empty versions", () => {
    expect(createProjectionVersion("").ok).toBe(false);
  });

  it("rejects v0", () => {
    expect(createProjectionVersion("v0").ok).toBe(false);
  });

  it("rejects versions without v prefix", () => {
    expect(createProjectionVersion("1").ok).toBe(false);
  });

  it("rejects negative or non-integer versions", () => {
    expect(createProjectionVersion("v-1").ok).toBe(false);
    expect(createProjectionVersion("v1.5").ok).toBe(false);
  });
});

describe("ProjectionIdentity", () => {
  it("has stable equality through its key", () => {
    const left = createProjectionIdentity({ projectionName: mustName("walking_skeleton"), projectionVersion: mustVersion("v1") });
    const right = createProjectionIdentity({ projectionName: mustName("walking_skeleton"), projectionVersion: mustVersion("v1") });
    expect(projectionIdentityKey(left)).toBe(projectionIdentityKey(right));
  });

  it("differs by name", () => {
    const left = createProjectionIdentity({ projectionName: mustName("walking_skeleton"), projectionVersion: mustVersion("v1") });
    const right = createProjectionIdentity({ projectionName: mustName("other_projection"), projectionVersion: mustVersion("v1") });
    expect(projectionIdentityKey(left)).not.toBe(projectionIdentityKey(right));
  });

  it("differs by version", () => {
    const left = createProjectionIdentity({ projectionName: mustName("walking_skeleton"), projectionVersion: mustVersion("v1") });
    const right = createProjectionIdentity({ projectionName: mustName("walking_skeleton"), projectionVersion: mustVersion("v2") });
    expect(projectionIdentityKey(left)).not.toBe(projectionIdentityKey(right));
  });

  it("has stable log and consumer representations", () => {
    const identity = createProjectionIdentity({ projectionName: mustName("walking_skeleton"), projectionVersion: mustVersion("v1") });
    expect(projectionIdentityKey(identity)).toBe("walking_skeleton:v1");
    expect(projectionConsumerName(identity)).toBe("projection.walking_skeleton.v1");
  });
});

describe("ProjectionEventDescriptor", () => {
  it("accepts event name and version", () => {
    const descriptor = mustDescriptor("ContactRegistered", "v1");
    expect(projectionEventDescriptorKey(descriptor)).toBe("ContactRegistered:v1");
  });

  it("rejects empty event names", () => {
    expect(createProjectionEventDescriptor({ eventName: "", eventVersion: "v1" }).ok).toBe(false);
  });

  it("rejects invalid event versions", () => {
    expect(createProjectionEventDescriptor({ eventName: "ContactRegistered", eventVersion: "1" }).ok).toBe(false);
  });

  it("rejects duplicated descriptors in supported events", () => {
    const descriptor = mustDescriptor("ContactRegistered", "v1");
    expect(() => definition({ name: "walking_skeleton", events: [descriptor, descriptor] })).toThrow(DuplicateSupportedEvent);
  });
});

describe("ProjectionDefinition", () => {
  it("rejects empty supported events", () => {
    expect(() => definition({ name: "walking_skeleton", events: [] })).toThrow(EmptySupportedEvents);
  });

  it("accepts multiple events and preserves identity", () => {
    const projection = definition({
      name: "walking_skeleton",
      events: [
        mustDescriptor("ContactRegistered", "v1"),
        mustDescriptor("VisitCompleted", "v1")
      ]
    });
    expect(projectionIdentityKey(projection.identity)).toBe("walking_skeleton:v1");
    expect(projection.supportedEvents).toHaveLength(2);
  });

  it("defines execution context without ActorContext or concrete repositories", async () => {
    const projection = definition({ name: "walking_skeleton" });
    await expect(projection.handle(event(), {
      projectionIdentity: projection.identity,
      mode: ProjectionMode.Live,
      workerId: "worker-1",
      correlationId: "correlation-1",
      attempt: 1,
      processingStartedAt: new Date("2026-07-30T00:00:00.000Z"),
      rebuildId: null,
      logger: new InMemoryLogger()
    }, {})).resolves.toBeUndefined();
  });
});

describe("ProjectionRegistry", () => {
  it("registers a projection", () => {
    const registry = new ProjectionRegistry();
    registry.register(definition({ name: "walking_skeleton" }));
    expect(registry.all()).toHaveLength(1);
  });

  it("rejects duplicate identity", () => {
    const registry = new ProjectionRegistry();
    registry.register(definition({ name: "walking_skeleton" }));
    expect(() => registry.register(definition({ name: "walking_skeleton" }))).toThrow("Projection identity");
  });

  it("allows same name with different versions", () => {
    const registry = new ProjectionRegistry();
    registry.register(definition({ name: "walking_skeleton", version: "v1" }));
    registry.register(definition({ name: "walking_skeleton", version: "v2" }));
    expect(registry.all()).toHaveLength(2);
  });

  it("resolves by event name and version", () => {
    const registry = new ProjectionRegistry();
    registry.register(definition({ name: "walking_skeleton", events: [mustDescriptor("ContactRegistered", "v1")] }));
    expect(registry.projectionsForEvent(event("ContactRegistered", "v1"))).toHaveLength(1);
  });

  it("does not return incompatible projections", () => {
    const registry = new ProjectionRegistry();
    registry.register(definition({ name: "walking_skeleton", events: [mustDescriptor("ContactRegistered", "v1")] }));
    expect(registry.projectionsForEvent(event("ContactRegistered", "v2"))).toHaveLength(0);
    expect(registry.projectionsForEvent(event("VisitCompleted", "v1"))).toHaveLength(0);
  });

  it("keeps deterministic order by projection name and version", () => {
    const registry = new ProjectionRegistry();
    registry.register(definition({ name: "zeta_projection", version: "v1" }));
    registry.register(definition({ name: "alpha_projection", version: "v2" }));
    registry.register(definition({ name: "alpha_projection", version: "v1" }));
    expect(registry.all().map((projection) => projectionIdentityKey(projection.identity))).toEqual([
      "alpha_projection:v1",
      "alpha_projection:v2",
      "zeta_projection:v1"
    ]);
  });

  it("lists active projections through an explicit external state filter", () => {
    const registry = new ProjectionRegistry();
    registry.register(definition({ name: "walking_skeleton", version: "v1" }));
    registry.register(definition({ name: "walking_skeleton", version: "v2" }));
    expect(registry.active({ isActive: (identity) => identity.projectionVersion === "v2" })).toHaveLength(1);
  });

  it("allows multiple projections to consume the same event", () => {
    const registry = new ProjectionRegistry();
    registry.register(definition({ name: "walking_skeleton" }));
    registry.register(definition({ name: "operations_summary" }));
    expect(registry.projectionsForDescriptor(mustDescriptor("ContactRegistered", "v1"))).toHaveLength(2);
  });
});

describe("ProjectionState", () => {
  it("represents an initial state with null checkpoint and version one", () => {
    const identity = createProjectionIdentity({
      projectionName: mustName("walking_skeleton"),
      projectionVersion: mustVersion("v1")
    });
    const state = {
      identity,
      status: ProjectionStatus.Active,
      checkpoint: null,
      rebuildStartedAt: null,
      rebuildCompletedAt: null,
      failureCount: 0,
      lastError: null,
      version: 1,
      createdAt: new Date("2026-07-30T00:00:00.000Z"),
      updatedAt: new Date("2026-07-30T00:00:00.000Z")
    };

    expect(projectionIdentityKey(state.identity)).toBe("walking_skeleton:v1");
    expect(state.checkpoint).toBeNull();
    expect(state.failureCount).toBe(0);
    expect(state.version).toBe(1);
  });
});

describe("projection status transitions", () => {
  const identity = createProjectionIdentity({
    projectionName: mustName("walking_skeleton"),
    projectionVersion: mustVersion("v1")
  });

  it.each([
    [ProjectionStatus.Active, ProjectionStatus.Rebuilding],
    [ProjectionStatus.Active, ProjectionStatus.Paused],
    [ProjectionStatus.Active, ProjectionStatus.Failed],
    [ProjectionStatus.Active, ProjectionStatus.Deprecated],
    [ProjectionStatus.Rebuilding, ProjectionStatus.Active],
    [ProjectionStatus.Rebuilding, ProjectionStatus.Failed],
    [ProjectionStatus.Paused, ProjectionStatus.Active],
    [ProjectionStatus.Failed, ProjectionStatus.Paused],
    [ProjectionStatus.Failed, ProjectionStatus.Rebuilding]
  ])("allows %s -> %s", (current, next) => {
    const result = transitionProjectionStatus({ identity, current, next });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ changed: true, status: next });
  });

  it("treats transition to the same state as idempotent", () => {
    const result = transitionProjectionStatus({
      identity,
      current: ProjectionStatus.Active,
      next: ProjectionStatus.Active
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ changed: false, status: ProjectionStatus.Active });
  });

  it("rejects deprecated exits", () => {
    const result = transitionProjectionStatus({
      identity,
      current: ProjectionStatus.Deprecated,
      next: ProjectionStatus.Active
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(InvalidProjectionStatusTransition);
  });

  it("rejects failed -> active directly", () => {
    const result = transitionProjectionStatus({
      identity,
      current: ProjectionStatus.Failed,
      next: ProjectionStatus.Active
    });
    expect(result.ok).toBe(false);
  });
});

describe("ProjectionCheckpoint", () => {
  it("creates a checkpoint with eventId, eventCreatedAt and processedAt", () => {
    const checkpoint = createProjectionCheckpoint({
      eventId: "event-1",
      eventCreatedAt: new Date("2026-07-30T00:00:00.000Z"),
      processedAt: new Date("2026-07-30T00:00:01.000Z")
    });
    expect(checkpoint.ok).toBe(true);
  });

  it("requires eventId", () => {
    expect(createProjectionCheckpoint({
      eventId: "",
      eventCreatedAt: new Date("2026-07-30T00:00:00.000Z"),
      processedAt: new Date("2026-07-30T00:00:01.000Z")
    }).ok).toBe(false);
  });

  it("requires eventCreatedAt and processedAt by type contract", () => {
    const checkpoint = createProjectionCheckpoint({
      eventId: "event-1",
      eventCreatedAt: new Date("2026-07-30T00:00:00.000Z"),
      processedAt: new Date("2026-07-30T00:00:01.000Z")
    });
    expect(checkpoint.ok && checkpoint.value.eventCreatedAt).toBeInstanceOf(Date);
    expect(checkpoint.ok && checkpoint.value.processedAt).toBeInstanceOf(Date);
  });
});

describe("projection persistence errors", () => {
  it("defines typed errors for repository failures", () => {
    expect(new ProjectionStateNotFound("walking_skeleton:v1").code).toBe("projection_state_not_found");
    expect(new ProjectionStateConcurrencyConflict().code).toBe("projection_state_concurrency_conflict");
    expect(new ProjectionReceiptAlreadyExists().code).toBe("projection_receipt_already_exists");
  });
});
