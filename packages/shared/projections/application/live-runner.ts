import { type Logger, LogLevel } from "@tonala/shared/observability";

import {
  createProjectionCheckpoint,
  createProjectionEventDescriptor,
  createProjectionVersion,
  type ProjectionEvent,
  type ProjectionEventReceiptRepository,
  type ProjectionIdentity,
  projectionIdentityKey,
  ProjectionMode,
  type ProjectionStateRepository,
  ProjectionStatus
} from "../contracts/index.js";
import { type ProjectionRegistry } from "./registry.js";
import {
  InvalidProjectionEvent,
  ProjectionHandlerFailed,
  ProjectionLiveProcessingFailed,
  ProjectionProcessingBlocked,
  ProjectionRuntimeBindingNotFound
} from "./live-errors.js";
import { type ProjectionRuntimeRegistry, type ProjectionTransactionManager } from "./runtime.js";

export const ProjectionLiveOutcome = {
  Processed: "processed",
  AlreadyProcessed: "already_processed",
  SkippedDeprecated: "skipped_deprecated",
  BlockedPaused: "blocked_paused",
  BlockedFailed: "blocked_failed",
  BlockedRebuilding: "blocked_rebuilding",
  Failed: "failed"
} as const;

export type ProjectionLiveOutcome = (typeof ProjectionLiveOutcome)[keyof typeof ProjectionLiveOutcome];

export type ProjectionLiveRunEntry = Readonly<{
  projectionIdentity: ProjectionIdentity;
  outcome: ProjectionLiveOutcome;
  receiptStatus: "inserted" | "already_exists" | "not_created";
  checkpointUpdated: boolean;
  durationMs: number;
  errorCode: string | null;
}>;

export type ProjectionLiveRunResult = Readonly<{
  eventId: string;
  eventName: string;
  eventVersion: string;
  success: boolean;
  entries: readonly ProjectionLiveRunEntry[];
  stoppedAtProjection: ProjectionIdentity | null;
  error: ProjectionLiveProcessingFailed | ProjectionProcessingBlocked | ProjectionRuntimeBindingNotFound | InvalidProjectionEvent | null;
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
}>;

export type LiveProjectionRunnerInput = Readonly<{
  event: ProjectionEvent;
  workerId: string;
  correlationId: string;
  attempt: number;
  processingStartedAt: Date;
}>;

export class LiveProjectionRunner {
  public constructor(private readonly dependencies: {
    readonly registry: ProjectionRegistry;
    readonly runtimeRegistry: ProjectionRuntimeRegistry;
    readonly transactionManager: ProjectionTransactionManager;
    readonly stateRepository: ProjectionStateRepository;
    readonly receiptRepository: ProjectionEventReceiptRepository;
    readonly logger: Logger;
    readonly clock?: { now(): Date };
  }) {}

  public async run(input: LiveProjectionRunnerInput): Promise<ProjectionLiveRunResult> {
    const startedAt = this.dependencies.clock?.now() ?? new Date();
    const entries: ProjectionLiveRunEntry[] = [];
    const invalid = validateProjectionEvent(input.event);
    if (invalid) {
      return this.finish({
        input,
        startedAt,
        entries,
        stoppedAtProjection: null,
        error: invalid
      });
    }

    this.log("projection.live.started", input, null, { outcome: "started" });
    const definitions = this.dependencies.registry.projectionsForEvent(input.event);
    if (definitions.length === 0) {
      this.log("projection.live.completed", input, null, { outcome: "no_matching_projections" });
      return this.finish({ input, startedAt, entries, stoppedAtProjection: null, error: null });
    }

    for (const definition of definitions) {
      const projectionStartedAt = this.dependencies.clock?.now() ?? new Date();
      const identity = definition.identity;
      const binding = this.dependencies.runtimeRegistry.bindingFor(identity);
      if (!binding) {
        const error = new ProjectionRuntimeBindingNotFound(projectionIdentityKey(identity));
        entries.push(entry(identity, ProjectionLiveOutcome.Failed, "not_created", false, projectionStartedAt, this.now(), error.code));
        this.log("projection.live.failed", input, identity, { outcome: ProjectionLiveOutcome.Failed, errorCode: error.code });
        return this.finish({ input, startedAt, entries, stoppedAtProjection: identity, error });
      }

      const state = await this.dependencies.stateRepository.createIfMissing(identity);
      const blocked = blockedOutcomeForStatus(state.status);
      if (blocked) {
        const blockedEntry = entry(identity, blocked.outcome, "not_created", false, projectionStartedAt, this.now(), blocked.error?.code ?? null);
        entries.push(blockedEntry);
        this.log(blocked.outcome === ProjectionLiveOutcome.SkippedDeprecated ? "projection.live.skipped" : "projection.live.failed", input, identity, {
          outcome: blocked.outcome,
          errorCode: blocked.error?.code
        });
        if (blocked.error) {
          return this.finish({ input, startedAt, entries, stoppedAtProjection: identity, error: blocked.error });
        }
        continue;
      }

      if (await this.dependencies.receiptRepository.hasReceipt({ identity, eventId: input.event.eventId })) {
        entries.push(entry(identity, ProjectionLiveOutcome.AlreadyProcessed, "already_exists", false, projectionStartedAt, this.now(), null));
        this.log("projection.live.skipped", input, identity, { outcome: ProjectionLiveOutcome.AlreadyProcessed });
        continue;
      }

      try {
        const result = await this.dependencies.transactionManager.transaction(async (tx) => {
          const reserved = await this.dependencies.receiptRepository.insertReceipt({
            identity,
            eventId: input.event.eventId,
            descriptor: {
              eventName: input.event.eventName,
              eventVersion: input.event.eventVersion
            },
            eventCreatedAt: new Date(input.event.createdAt),
            processedAt: input.processingStartedAt
          }, tx);
          if (!reserved.ok) throw reserved.error;
          if (!reserved.value.inserted) {
            return entry(identity, ProjectionLiveOutcome.AlreadyProcessed, "already_exists", false, projectionStartedAt, this.now(), null);
          }

          const ports = await binding.resolvePorts({ tx, identity });
          try {
            await binding.definition.handle(input.event, {
              projectionIdentity: identity,
              mode: ProjectionMode.Live,
              workerId: input.workerId,
              correlationId: input.correlationId,
              attempt: input.attempt,
              processingStartedAt: input.processingStartedAt,
              rebuildId: null,
              logger: this.dependencies.logger
            }, ports);
          } catch (error) {
            throw new ProjectionHandlerFailed("Projection handler failed.", error);
          }

          const checkpoint = createProjectionCheckpoint({
            eventId: input.event.eventId,
            eventCreatedAt: new Date(input.event.createdAt),
            processedAt: this.now()
          });
          if (!checkpoint.ok) throw checkpoint.error;
          const checkpointResult = await this.dependencies.stateRepository.updateCheckpoint({
            identity,
            checkpoint: checkpoint.value,
            expectedVersion: state.version,
            updatedAt: checkpoint.value.processedAt
          }, tx);
          if (!checkpointResult.ok) throw checkpointResult.error;

          return entry(identity, ProjectionLiveOutcome.Processed, "inserted", true, projectionStartedAt, this.now(), null);
        });
        entries.push(result);
        this.log(
          result.outcome === ProjectionLiveOutcome.Processed ? "projection.live.processed" : "projection.live.skipped",
          input,
          identity,
          { outcome: result.outcome }
        );
      } catch (error) {
        const normalized = normalizeLiveError(error);
        await this.recordFailureSafely(identity, state.version, normalized);
        entries.push(entry(identity, ProjectionLiveOutcome.Failed, "not_created", false, projectionStartedAt, this.now(), normalized.code));
        this.log("projection.live.failed", input, identity, { outcome: ProjectionLiveOutcome.Failed, errorCode: normalized.code });
        return this.finish({ input, startedAt, entries, stoppedAtProjection: identity, error: normalized });
      }
    }

    this.log("projection.live.completed", input, null, { outcome: "completed" });
    return this.finish({ input, startedAt, entries, stoppedAtProjection: null, error: null });
  }

  private async recordFailureSafely(identity: ProjectionIdentity, expectedVersion: number, error: ProjectionLiveProcessingFailed): Promise<void> {
    try {
      await this.dependencies.stateRepository.recordFailure({
        identity,
        lastError: error.code,
        expectedVersion,
        updatedAt: this.now()
      });
    } catch (failureError) {
      this.dependencies.logger.log(LogLevel.Warn, "projection.live.record_failure_failed", {
        errorCode: failureError instanceof Error ? failureError.name : "unknown_error",
        details: { projection: projectionIdentityKey(identity) }
      });
    }
  }

  private finish(input: {
    readonly input: LiveProjectionRunnerInput;
    readonly startedAt: Date;
    readonly entries: readonly ProjectionLiveRunEntry[];
    readonly stoppedAtProjection: ProjectionIdentity | null;
    readonly error: ProjectionLiveRunResult["error"];
  }): ProjectionLiveRunResult {
    const completedAt = this.now();
    return {
      eventId: input.input.event.eventId,
      eventName: input.input.event.eventName,
      eventVersion: input.input.event.eventVersion,
      success: input.error === null,
      entries: input.entries,
      stoppedAtProjection: input.stoppedAtProjection,
      error: input.error,
      startedAt: input.startedAt,
      completedAt,
      durationMs: durationMs(input.startedAt, completedAt)
    };
  }

  private now(): Date {
    return this.dependencies.clock?.now() ?? new Date();
  }

  private log(
    message: string,
    input: LiveProjectionRunnerInput,
    identity: ProjectionIdentity | null,
    details: Readonly<Record<string, unknown>>
  ): void {
    this.dependencies.logger.log(LogLevel.Info, message, {
      correlationId: input.correlationId as never,
      operation: "projection.live",
      success: typeof details.errorCode !== "string" || details.errorCode.length === 0,
      entityType: input.event.aggregateType,
      entityId: input.event.aggregateId,
      details: {
        projectionName: identity?.projectionName,
        projectionVersion: identity?.projectionVersion,
        mode: "live",
        eventId: input.event.eventId,
        eventName: input.event.eventName,
        eventVersion: input.event.eventVersion,
        aggregateType: input.event.aggregateType,
        aggregateId: input.event.aggregateId,
        workerId: input.workerId,
        attempt: input.attempt,
        ...details
      }
    });
  }
}

function validateProjectionEvent(event: ProjectionEvent): InvalidProjectionEvent | null {
  if (event.eventId.trim().length === 0) return new InvalidProjectionEvent("Projection eventId cannot be empty.");
  if (event.eventName.trim().length === 0) return new InvalidProjectionEvent("Projection eventName cannot be empty.");
  if (!createProjectionVersion(event.eventVersion).ok) return new InvalidProjectionEvent("Projection eventVersion is invalid.");
  if (event.aggregateType.trim().length === 0) return new InvalidProjectionEvent("Projection aggregateType cannot be empty.");
  if (event.aggregateId.trim().length === 0) return new InvalidProjectionEvent("Projection aggregateId cannot be empty.");
  if (Number.isNaN(new Date(event.createdAt).getTime())) return new InvalidProjectionEvent("Projection createdAt is invalid.");
  if (!isRecord(event.payload)) return new InvalidProjectionEvent("Projection payload must be an object.");
  if (!isRecord(event.metadata)) return new InvalidProjectionEvent("Projection metadata must be an object.");
  const descriptor = createProjectionEventDescriptor({ eventName: event.eventName, eventVersion: event.eventVersion });
  return descriptor.ok ? null : new InvalidProjectionEvent(descriptor.error.message);
}

function blockedOutcomeForStatus(status: ProjectionStatus): {
  readonly outcome: ProjectionLiveOutcome;
  readonly error: ProjectionProcessingBlocked | null;
} | null {
  if (status === ProjectionStatus.Paused) {
    return {
      outcome: ProjectionLiveOutcome.BlockedPaused,
      error: new ProjectionProcessingBlocked({
        code: "projection_processing_paused",
        message: "Projection live processing is paused.",
        retryable: true
      })
    };
  }
  if (status === ProjectionStatus.Failed) {
    return {
      outcome: ProjectionLiveOutcome.BlockedFailed,
      error: new ProjectionProcessingBlocked({
        code: "projection_processing_failed_state",
        message: "Projection live processing is blocked by failed state.",
        retryable: false
      })
    };
  }
  if (status === ProjectionStatus.Rebuilding) {
    return {
      outcome: ProjectionLiveOutcome.BlockedRebuilding,
      error: new ProjectionProcessingBlocked({
        code: "projection_processing_rebuilding",
        message: "Projection live processing is blocked while rebuilding.",
        retryable: true
      })
    };
  }
  if (status === ProjectionStatus.Deprecated) {
    return { outcome: ProjectionLiveOutcome.SkippedDeprecated, error: null };
  }
  return null;
}

function normalizeLiveError(error: unknown): ProjectionLiveProcessingFailed {
  if (error instanceof ProjectionLiveProcessingFailed) return error;
  if (error instanceof ProjectionHandlerFailed) {
    return new ProjectionLiveProcessingFailed({
      code: error.code,
      message: error.message,
      retryable: true,
      failureKind: "handler",
      cause: error
    });
  }
  if (error instanceof Error && error.name === "ProjectionStateConcurrencyConflict") {
    return new ProjectionLiveProcessingFailed({
      code: "projection_state_concurrency_conflict",
      message: "Projection state concurrency conflict.",
      retryable: true,
      failureKind: "concurrency",
      cause: error
    });
  }
  return new ProjectionLiveProcessingFailed({
    code: error instanceof Error ? error.name : "projection_transaction_failed",
    message: "Projection live processing transaction failed.",
    retryable: true,
    failureKind: "persistence",
    cause: error
  });
}

function entry(
  projectionIdentity: ProjectionIdentity,
  outcome: ProjectionLiveOutcome,
  receiptStatus: ProjectionLiveRunEntry["receiptStatus"],
  checkpointUpdated: boolean,
  startedAt: Date,
  completedAt: Date,
  errorCode: string | null
): ProjectionLiveRunEntry {
  return {
    projectionIdentity,
    outcome,
    receiptStatus,
    checkpointUpdated,
    durationMs: durationMs(startedAt, completedAt),
    errorCode
  };
}

function durationMs(startedAt: Date, completedAt: Date): number {
  return Math.max(0, completedAt.getTime() - startedAt.getTime());
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
