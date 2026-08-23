import { describe, expect, it } from "vitest";

import { InMemoryLogger } from "@tonala/shared/observability";
import { err, ok, type Result } from "@tonala/shared/kernel";

import {
  createProjectionDefinition,
  createProjectionEventDescriptor,
  createProjectionIdentity,
  createProjectionName,
  createProjectionVersion,
  type ProjectionDefinition,
  type ProjectionEvent,
  type ProjectionEventReceiptInput,
  type ProjectionEventReceiptRepository,
  type ProjectionIdentity,
  type ProjectionReceiptInsertResult,
  type ProjectionState,
  ProjectionStateConcurrencyConflict,
  ProjectionStateNotFound,
  type ProjectionStateRepository,
  ProjectionStatus,
  type ProjectionTransactionContext,
  projectionIdentityKey,
  type RebuildPolicy
} from "../contracts/index.js";
import { ProjectionRegistry } from "./registry.js";
import { LiveProjectionRunner, ProjectionLiveOutcome } from "./live-runner.js";
import { ProjectionRuntimeRegistry, type ProjectionTransactionManager } from "./runtime.js";
import { ProjectionRuntimeBindingNotFound } from "./live-errors.js";

type TestPorts = { readonly effects: string[]; readonly fail?: boolean; readonly seenMode?: string[]; readonly seenRebuildId?: unknown[] };

const rebuildPolicy: RebuildPolicy = { rebuildable: true, source: "outbox_history", strategy: "shadow" };

function mustName(value: string) {
  const result = createProjectionName(value);
  if (!result.ok) throw result.error;
  return result.value;
}

function mustVersion(value: string) {
  const result = createProjectionVersion(value);
  if (!result.ok) throw result.error;
  return result.value;
}

function identity(name: string, version = "v1") {
  return createProjectionIdentity({ projectionName: mustName(name), projectionVersion: mustVersion(version) });
}

function descriptor(eventName = "ContactRegistered", eventVersion = "v1") {
  const result = createProjectionEventDescriptor({ eventName, eventVersion });
  if (!result.ok) throw result.error;
  return result.value;
}

function event(input: Partial<ProjectionEvent> = {}): ProjectionEvent {
  return {
    eventId: "event-1",
    eventName: "ContactRegistered",
    eventVersion: mustVersion("v1"),
    aggregateType: "contact",
    aggregateId: "contact-1",
    payload: { safe: true },
    metadata: { source: "test" },
    createdAt: "2026-07-30T00:00:00.000Z",
    ...input
  };
}

function definition(name: string, input: {
  readonly version?: string;
  readonly events?: readonly ReturnType<typeof descriptor>[];
  readonly fail?: boolean;
  readonly effects?: string[];
  readonly seenMode?: string[];
  readonly seenRebuildId?: unknown[];
} = {}): ProjectionDefinition<TestPorts> {
  return createProjectionDefinition<TestPorts>({
    identity: identity(name, input.version),
    supportedEvents: input.events ?? [descriptor()],
    rebuildPolicy,
    handle: (_event, context, ports) => {
      ports.seenMode?.push(context.mode);
      ports.seenRebuildId?.push(context.rebuildId);
      if (ports.fail) return Promise.reject(new Error("handler failed"));
      ports.effects.push(projectionIdentityKey(context.projectionIdentity));
      return Promise.resolve();
    }
  });
}

function runner(input: {
  readonly definitions?: readonly ProjectionDefinition<TestPorts>[];
  readonly bindings?: readonly ProjectionDefinition<TestPorts>[];
  readonly stateRepository?: InMemoryStateRepository;
  readonly receiptRepository?: InMemoryReceiptRepository;
  readonly effects?: string[];
  readonly failBindings?: ReadonlySet<string>;
  readonly seenMode?: string[];
  readonly seenRebuildId?: unknown[];
} = {}) {
  const registry = new ProjectionRegistry();
  const runtimeRegistry = new ProjectionRuntimeRegistry();
  const effects = input.effects ?? [];
  const stateRepository = input.stateRepository ?? new InMemoryStateRepository();
  const receiptRepository = input.receiptRepository ?? new InMemoryReceiptRepository();
  const logger = new InMemoryLogger();

  for (const item of input.definitions ?? []) registry.register(item);
  for (const item of input.bindings ?? input.definitions ?? []) {
    runtimeRegistry.register({
      definition: item,
      resolvePorts: () => {
        const ports: {
          effects: string[];
          fail?: boolean;
          seenMode?: string[];
          seenRebuildId?: unknown[];
        } = { effects };
        if (input.failBindings?.has(projectionIdentityKey(item.identity))) ports.fail = true;
        if (input.seenMode) ports.seenMode = input.seenMode;
        if (input.seenRebuildId) ports.seenRebuildId = input.seenRebuildId;
        return ports;
      }
    });
  }

  return {
    runner: new LiveProjectionRunner({
      registry,
      runtimeRegistry,
      transactionManager: new InMemoryTransactionManager(),
      stateRepository,
      receiptRepository,
      logger,
      clock: { now: () => new Date("2026-07-30T00:00:01.000Z") }
    }),
    effects,
    stateRepository,
    receiptRepository,
    logger
  };
}

async function run(input: ReturnType<typeof runner>["runner"], projectionEvent = event()) {
  return input.run({
    event: projectionEvent,
    workerId: "worker-1",
    correlationId: "correlation-1",
    attempt: 1,
    processingStartedAt: new Date("2026-07-30T00:00:00.500Z")
  });
}

describe("LiveProjectionRunner", () => {
  it("returns success with empty entries for unsupported events", async () => {
    const setup = runner({ definitions: [definition("test_counter_alpha")] });
    const result = await run(setup.runner, event({ eventName: "VisitCompleted" }));
    expect(result.success).toBe(true);
    expect(result.entries).toEqual([]);
  });

  it("resolves a projection and processes active state", async () => {
    const setup = runner({ definitions: [definition("test_counter_alpha")] });
    const result = await run(setup.runner);
    expect(result.entries[0]?.outcome).toBe(ProjectionLiveOutcome.Processed);
    expect(setup.effects).toEqual(["test_counter_alpha:v1"]);
  });

  it("respects deterministic registry order", async () => {
    const setup = runner({
      definitions: [
        definition("test_counter_zeta"),
        definition("test_counter_alpha", { version: "v2" }),
        definition("test_counter_alpha", { version: "v1" })
      ]
    });
    const result = await run(setup.runner);
    expect(result.entries.map((entry) => projectionIdentityKey(entry.projectionIdentity))).toEqual([
      "test_counter_alpha:v1",
      "test_counter_alpha:v2",
      "test_counter_zeta:v1"
    ]);
  });

  it("creates state if missing", async () => {
    const setup = runner({ definitions: [definition("test_counter_alpha")] });
    await run(setup.runner);
    expect(await setup.stateRepository.getByIdentity(identity("test_counter_alpha"))).not.toBeNull();
  });

  it.each([
    [ProjectionStatus.Paused, ProjectionLiveOutcome.BlockedPaused],
    [ProjectionStatus.Failed, ProjectionLiveOutcome.BlockedFailed],
    [ProjectionStatus.Rebuilding, ProjectionLiveOutcome.BlockedRebuilding]
  ])("blocks %s state", async (status, outcome) => {
    const stateRepository = new InMemoryStateRepository();
    await stateRepository.createIfMissing(identity("test_counter_alpha"));
    stateRepository.setStatus(identity("test_counter_alpha"), status);
    const setup = runner({ definitions: [definition("test_counter_alpha")], stateRepository });
    const result = await run(setup.runner);
    expect(result.success).toBe(false);
    expect(result.entries[0]?.outcome).toBe(outcome);
    expect(setup.effects).toEqual([]);
  });

  it("skips deprecated without blocking later projections", async () => {
    const stateRepository = new InMemoryStateRepository();
    await stateRepository.createIfMissing(identity("test_counter_alpha"));
    stateRepository.setStatus(identity("test_counter_alpha"), ProjectionStatus.Deprecated);
    const setup = runner({
      definitions: [definition("test_counter_alpha"), definition("test_counter_beta")],
      stateRepository
    });
    const result = await run(setup.runner);
    expect(result.success).toBe(true);
    expect(result.entries.map((entry) => entry.outcome)).toEqual([
      ProjectionLiveOutcome.SkippedDeprecated,
      ProjectionLiveOutcome.Processed
    ]);
    expect(setup.effects).toEqual(["test_counter_beta:v1"]);
  });

  it("skips existing receipt without handler", async () => {
    const receiptRepository = new InMemoryReceiptRepository();
    await receiptRepository.insertReceipt({
      identity: identity("test_counter_alpha"),
      eventId: "event-1",
      descriptor: descriptor(),
      eventCreatedAt: new Date("2026-07-30T00:00:00.000Z"),
      processedAt: new Date("2026-07-30T00:00:01.000Z")
    });
    const setup = runner({ definitions: [definition("test_counter_alpha")], receiptRepository });
    const result = await run(setup.runner);
    expect(result.entries[0]?.outcome).toBe(ProjectionLiveOutcome.AlreadyProcessed);
    expect(setup.effects).toEqual([]);
  });

  it("stops on handler failure and does not execute later projection", async () => {
    const failed = definition("test_counter_beta");
    const setup = runner({
      definitions: [definition("test_counter_alpha"), failed, definition("test_counter_gamma")],
      failBindings: new Set([projectionIdentityKey(failed.identity)])
    });
    const result = await run(setup.runner);
    expect(result.success).toBe(false);
    expect(result.entries.map((entry) => entry.outcome)).toEqual([
      ProjectionLiveOutcome.Processed,
      ProjectionLiveOutcome.Failed
    ]);
    expect(setup.effects).toEqual(["test_counter_alpha:v1"]);
  });

  it("fails when runtime binding is missing", async () => {
    const projection = definition("test_counter_alpha");
    const setup = runner({ definitions: [projection], bindings: [] });
    const result = await run(setup.runner);
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(ProjectionRuntimeBindingNotFound);
  });

  it("fails invalid event before executing", async () => {
    const setup = runner({ definitions: [definition("test_counter_alpha")] });
    const result = await run(setup.runner, event({ eventId: "" }));
    expect(result.success).toBe(false);
    expect(setup.effects).toEqual([]);
  });

  it("passes live context without rebuildId", async () => {
    const seenMode: string[] = [];
    const seenRebuildId: unknown[] = [];
    const setup = runner({ definitions: [definition("test_counter_alpha")], seenMode, seenRebuildId });
    await run(setup.runner);
    expect(seenMode).toEqual(["live"]);
    expect(seenRebuildId).toEqual([null]);
  });

  it("does not include payload in logs", async () => {
    const setup = runner({ definitions: [definition("test_counter_alpha")] });
    await run(setup.runner, event({ payload: { phone: "secret-phone" } }));
    expect(JSON.stringify(setup.logger.entries)).not.toContain("secret-phone");
  });

  it("reports concurrency conflicts as retryable and records failure without status change", async () => {
    const stateRepository = new InMemoryStateRepository({ forceCheckpointConflict: true });
    const setup = runner({ definitions: [definition("test_counter_alpha")], stateRepository });
    const result = await run(setup.runner);
    expect(result.success).toBe(false);
    expect(result.error?.retryable).toBe(true);
    const state = await stateRepository.getByIdentity(identity("test_counter_alpha"));
    expect(state?.status).toBe(ProjectionStatus.Active);
    expect(state?.failureCount).toBe(1);
  });

  it("resolves event versions exactly", async () => {
    const setup = runner({
      definitions: [definition("test_counter_alpha", { events: [descriptor("ContactRegistered", "v2")] })]
    });
    const result = await run(setup.runner, event({ eventVersion: mustVersion("v1") }));
    expect(result.success).toBe(true);
    expect(result.entries).toEqual([]);
  });
});

class InMemoryTransactionManager implements ProjectionTransactionManager {
  public transaction<T>(runTx: (tx: ProjectionTransactionContext) => Promise<T>): Promise<T> {
    return runTx({ id: crypto.randomUUID() });
  }
}

class InMemoryStateRepository implements ProjectionStateRepository {
  private readonly states = new Map<string, ProjectionState>();

  public constructor(private readonly options: { readonly forceCheckpointConflict?: boolean } = {}) {}

  public createIfMissing(projectionIdentity: ProjectionIdentity): Promise<ProjectionState> {
    const key = projectionIdentityKey(projectionIdentity);
    const existing = this.states.get(key);
    if (existing) return Promise.resolve(existing);
    const now = new Date("2026-07-30T00:00:00.000Z");
    const state: ProjectionState = {
      identity: projectionIdentity,
      status: ProjectionStatus.Active,
      checkpoint: null,
      rebuildStartedAt: null,
      rebuildCompletedAt: null,
      failureCount: 0,
      lastError: null,
      version: 1,
      createdAt: now,
      updatedAt: now
    };
    this.states.set(key, state);
    return Promise.resolve(state);
  }

  public getByIdentity(projectionIdentity: ProjectionIdentity): Promise<ProjectionState | null> {
    return Promise.resolve(this.states.get(projectionIdentityKey(projectionIdentity)) ?? null);
  }

  public setStatus(projectionIdentity: ProjectionIdentity, status: ProjectionStatus): void {
    const key = projectionIdentityKey(projectionIdentity);
    const state = this.states.get(key);
    if (!state) throw new Error("state missing");
    this.states.set(key, { ...state, status });
  }

  public updateStatus(): Promise<Result<ProjectionState, ProjectionStateNotFound | ProjectionStateConcurrencyConflict>> {
    return Promise.reject(new Error("Not used in live runner tests"));
  }

  public updateCheckpoint(input: Parameters<ProjectionStateRepository["updateCheckpoint"]>[0]) {
    if (this.options.forceCheckpointConflict) return Promise.resolve(err(new ProjectionStateConcurrencyConflict()));
    const state = this.states.get(projectionIdentityKey(input.identity));
    if (!state) return Promise.resolve(err(new ProjectionStateNotFound(projectionIdentityKey(input.identity))));
    if (state.version !== input.expectedVersion) return Promise.resolve(err(new ProjectionStateConcurrencyConflict()));
    const updated = {
      ...state,
      checkpoint: input.checkpoint,
      version: state.version + 1,
      updatedAt: input.updatedAt
    };
    this.states.set(projectionIdentityKey(input.identity), updated);
    return Promise.resolve(ok(updated));
  }

  public recordFailure(input: Parameters<ProjectionStateRepository["recordFailure"]>[0]) {
    const state = this.states.get(projectionIdentityKey(input.identity));
    if (!state) return Promise.resolve(err(new ProjectionStateNotFound(projectionIdentityKey(input.identity))));
    const updated = {
      ...state,
      failureCount: state.failureCount + 1,
      lastError: input.lastError,
      version: state.version + 1,
      updatedAt: input.updatedAt
    };
    this.states.set(projectionIdentityKey(input.identity), updated);
    return Promise.resolve(ok(updated));
  }

  public clearFailure(): Promise<Result<ProjectionState, ProjectionStateNotFound | ProjectionStateConcurrencyConflict>> {
    return Promise.reject(new Error("Not used in live runner tests"));
  }
}

class InMemoryReceiptRepository implements ProjectionEventReceiptRepository {
  private readonly receipts = new Set<string>();

  public hasReceipt(input: { readonly identity: ProjectionIdentity; readonly eventId: string }): Promise<boolean> {
    return Promise.resolve(this.receipts.has(`${projectionIdentityKey(input.identity)}:${input.eventId}`));
  }

  public insertReceipt(input: ProjectionEventReceiptInput): Promise<Result<ProjectionReceiptInsertResult, never>> {
    const key = `${projectionIdentityKey(input.identity)}:${input.eventId}`;
    if (this.receipts.has(key)) return Promise.resolve(ok({ inserted: false, reason: "already_exists" }));
    this.receipts.add(key);
    return Promise.resolve(ok({ inserted: true }));
  }
}
