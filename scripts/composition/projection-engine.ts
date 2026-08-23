import { DrizzleWalkingSkeletonProjectionWriter } from "../../packages/modules/command-center/infrastructure/index.js";
import { walkingSkeletonProjection } from "../../packages/modules/command-center/projections/index.js";
import { type Database } from "../../packages/shared/database/index.js";
import { LogLevel, type Logger } from "../../packages/shared/observability/index.js";
import {
  LiveProjectionRunner,
  ProjectionRegistry,
  ProjectionRuntimeRegistry,
  createProjectionVersion,
  type ProjectionEvent,
  type ProjectionLiveRunResult
} from "../../packages/shared/projections/index.js";
import {
  DrizzleProjectionEventReceiptRepository,
  DrizzleProjectionStateRepository,
  DrizzleProjectionTransactionManager
} from "../../packages/shared/projections/infrastructure/index.js";
import {
  type ConsumerExecutionContext,
  type EventConsumer,
  type EventConsumerResult,
  type OutboxEvent
} from "../../packages/shared/outbox/contracts/index.js";
import { PermanentOutboxError } from "../../packages/shared/outbox/index.js";

export const projectionEngineConsumerName = "projection_engine.v1";

export class ProjectionEventConsumer implements EventConsumer {
  public readonly consumerName = projectionEngineConsumerName;
  public readonly supportedEvents = [
    "ContactRegistered.v1",
    "ContactLinkedToColony.v1",
    "ResponsibleAssigned.v1",
    "VisitScheduled.v1",
    "VisitCompleted.v1"
  ] as const;

  public constructor(private readonly runner: ProjectionLiveRunnerPort) {}

  public async handle(event: OutboxEvent, context: ConsumerExecutionContext): Promise<EventConsumerResult> {
    let projectionEvent: ProjectionEvent;
    try {
      projectionEvent = normalizeOutboxEvent(event);
    } catch (error) {
      throw new PermanentOutboxError(error instanceof Error ? error.message : "invalid_projection_event");
    }
    const result = await this.runner.run({
      event: projectionEvent,
      workerId: context.workerId,
      correlationId: context.correlationId,
      attempt: context.attempt,
      processingStartedAt: context.processingStartedAt
    });

    if (result.success) {
      return {
        resultMetadata: {
          projection_engine: "ok",
          entries: result.entries.length
        }
      };
    }

    const retryable = result.error && "retryable" in result.error ? result.error.retryable : true;
    if (!retryable) {
      throw new PermanentOutboxError(result.error?.code ?? "projection_engine_permanent_failure");
    }
    throw new Error(result.error?.code ?? "projection_engine_retryable_failure");
  }
}

export function registerProjectionEngineConsumer(input: {
  readonly db: Database;
  readonly logger: Logger;
  readonly registry: { register(consumer: EventConsumer): void };
}): ProjectionEventConsumer {
  const consumer = createProjectionEngineConsumer({ db: input.db, logger: input.logger });
  input.registry.register(consumer);
  return consumer;
}

export function createProjectionEngineConsumer(input: {
  readonly db: Database;
  readonly logger: Logger;
}): ProjectionEventConsumer {
  const projectionRegistry = new ProjectionRegistry();
  projectionRegistry.register(walkingSkeletonProjection);

  const runtimeRegistry = new ProjectionRuntimeRegistry();
  runtimeRegistry.register({
    definition: walkingSkeletonProjection,
    resolvePorts: ({ tx }) => new DrizzleWalkingSkeletonProjectionWriter(tx)
  });

  const runner = new LiveProjectionRunner({
    registry: projectionRegistry,
    runtimeRegistry,
    transactionManager: new DrizzleProjectionTransactionManager(input.db),
    stateRepository: new DrizzleProjectionStateRepository(input.db),
    receiptRepository: new DrizzleProjectionEventReceiptRepository(input.db),
    logger: input.logger
  });

  input.logger.log(LogLevel.Info, "projection.engine.consumer.composed", {
    operation: "projection.engine.compose",
    details: { consumerName: projectionEngineConsumerName }
  });

  return new ProjectionEventConsumer(runner);
}

export type ProjectionLiveRunnerPort = Readonly<{
  run(input: {
    readonly event: ProjectionEvent;
    readonly workerId: string;
    readonly correlationId: string;
    readonly attempt: number;
    readonly processingStartedAt: Date;
  }): Promise<ProjectionLiveRunResult>;
}>;

export function normalizeOutboxEvent(event: OutboxEvent): ProjectionEvent {
  const normalized = normalizeEventNameAndVersion(event.eventName, event.eventVersion);
  const eventVersion = createProjectionVersion(normalized.eventVersion);
  if (!eventVersion.ok) throw eventVersion.error;
  return {
    eventId: event.eventId,
    eventName: normalized.eventName,
    eventVersion: eventVersion.value,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    payload: event.payload,
    metadata: filterMetadata(event.metadata),
    createdAt: event.createdAt
  };
}

function normalizeEventNameAndVersion(eventName: string, eventVersion: number): {
  readonly eventName: string;
  readonly eventVersion: `v${number}`;
} {
  const match = eventName.match(/^(.*)\.v([1-9][0-9]*)$/);
  if (match?.[1] && match[2]) {
    return { eventName: match[1], eventVersion: `v${Number(match[2])}` };
  }
  return { eventName, eventVersion: `v${eventVersion}` };
}

function filterMetadata(metadata: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  const allowed: Record<string, unknown> = {};
  for (const key of ["event_id", "event_name", "event_version", "occurred_at", "correlation_id", "aggregate_type", "aggregate_id"]) {
    if (metadata[key] !== undefined) allowed[key] = metadata[key];
  }
  return allowed;
}
