import { hostname } from "node:os";
import { sql, type SQL } from "drizzle-orm";

import { type Database } from "@tonala/shared/database";
import { SystemClock } from "@tonala/shared/kernel";
import { InMemoryLogger, type Logger } from "@tonala/shared/observability";

import {
  ConsumerRegistry,
  EventDispatcher,
  OutboxWorker,
  RetryPolicy
} from "../application/index.js";
import {
  type ConsumerReceiptRepository,
  type OutboxRepository,
  type RetryPolicyLike
} from "../application/ports.js";
import {
  type ConsumerExecutionContext,
  type EventConsumer,
  type OutboxEvent,
  type OutboxTransactionContext
} from "../contracts/index.js";

type QueryResult<TRow> = { readonly rows: TRow[] };
type DrizzleExecutor = {
  execute<TRow extends Record<string, unknown>>(query: SQL): Promise<QueryResult<TRow>>;
};
type DrizzleTransactionContext = OutboxTransactionContext & Readonly<{ client: DrizzleExecutor }>;

function executorFrom(tx: OutboxTransactionContext): DrizzleExecutor {
  const candidate = tx as Partial<DrizzleTransactionContext>;
  if (!candidate.client) throw new Error("Outbox transaction context does not contain an executor");
  return candidate.client;
}

export class DrizzleOutboxRepository implements OutboxRepository {
  public constructor(private readonly db: Database) {}

  public async claimPending(input: {
    readonly batchSize: number;
    readonly workerId: string;
    readonly now: Date;
  }): Promise<readonly OutboxEvent[]> {
    const result = await this.db.transaction(async (client) => {
      const executor = client as DrizzleExecutor;
      return executor.execute<OutboxEventRow>(sql`
        WITH claimed AS (
          SELECT event_id
          FROM transactional_outbox
          WHERE status = 'pending'
            AND (next_attempt_at IS NULL OR next_attempt_at <= ${input.now.toISOString()})
          ORDER BY created_at, event_id
          LIMIT ${input.batchSize}
          FOR UPDATE SKIP LOCKED
        )
        UPDATE transactional_outbox
        SET status = 'processing',
            attempts = attempts + 1,
            locked_at = ${input.now.toISOString()},
            locked_by = ${input.workerId},
            last_error = NULL
        FROM claimed
        WHERE transactional_outbox.event_id = claimed.event_id
        RETURNING
          transactional_outbox.event_id::text AS event_id,
          transactional_outbox.event_name,
          transactional_outbox.event_version,
          transactional_outbox.aggregate_type,
          transactional_outbox.aggregate_id::text AS aggregate_id,
          transactional_outbox.payload,
          transactional_outbox.metadata,
          transactional_outbox.status,
          transactional_outbox.attempts,
          transactional_outbox.created_at
      `);
    });
    return result.rows.map(rowToEvent);
  }

  public async markProcessed(input: { readonly eventId: string; readonly processedAt: Date }): Promise<void> {
    await this.db.execute(sql`
      UPDATE transactional_outbox
      SET status = 'processed',
          processed_at = ${input.processedAt.toISOString()},
          last_error = NULL,
          locked_at = NULL,
          locked_by = NULL
      WHERE event_id = ${input.eventId}
        AND status = 'processing'
    `);
  }

  public async markPendingForRetry(input: {
    readonly eventId: string;
    readonly nextAttemptAt: Date;
    readonly lastError: string;
  }): Promise<void> {
    await this.db.execute(sql`
      UPDATE transactional_outbox
      SET status = 'pending',
          next_attempt_at = ${input.nextAttemptAt.toISOString()},
          last_error = ${input.lastError},
          locked_at = NULL,
          locked_by = NULL
      WHERE event_id = ${input.eventId}
        AND status = 'processing'
    `);
  }

  public async markDeadLetter(input: { readonly eventId: string; readonly lastError: string }): Promise<void> {
    await this.db.execute(sql`
      UPDATE transactional_outbox
      SET status = 'dead_letter',
          last_error = ${input.lastError},
          locked_at = NULL,
          locked_by = NULL
      WHERE event_id = ${input.eventId}
        AND status = 'processing'
    `);
  }

  public async recoverAbandoned(input: {
    readonly abandonedBefore: Date;
    readonly nextAttemptAt: Date;
  }): Promise<number> {
    const result = await this.db.execute<{ event_id: string }>(sql`
      UPDATE transactional_outbox
      SET status = 'pending',
          locked_at = NULL,
          locked_by = NULL,
          next_attempt_at = ${input.nextAttemptAt.toISOString()}
      WHERE status = 'processing'
        AND locked_at < ${input.abandonedBefore.toISOString()}
      RETURNING event_id::text AS event_id
    `);
    return result.rows.length;
  }

  public async countDeadLetters(): Promise<number> {
    const result = await this.db.execute<{ count: string }>(sql`
      SELECT COUNT(*)::text AS count FROM transactional_outbox WHERE status = 'dead_letter'
    `);
    return Number(result.rows[0]?.count ?? 0);
  }
}

export class DrizzleConsumerReceiptRepository implements ConsumerReceiptRepository {
  public constructor(private readonly db: Database) {}

  public async hasReceipt(eventId: string, consumerName: string): Promise<boolean> {
    const result = await this.db.execute<{ exists: boolean }>(sql`
      SELECT EXISTS (
        SELECT 1 FROM outbox_consumer_receipts
        WHERE event_id = ${eventId}
          AND consumer_name = ${consumerName}
      ) AS exists
    `);
    return result.rows[0]?.exists ?? false;
  }

  public async recordReceipt(input: {
    readonly eventId: string;
    readonly consumerName: string;
    readonly processedAt: Date;
    readonly resultMetadata?: Readonly<Record<string, unknown>>;
  }, tx: OutboxTransactionContext): Promise<void> {
    await executorFrom(tx).execute(sql`
      INSERT INTO outbox_consumer_receipts (
        event_id,
        consumer_name,
        processed_at,
        result_metadata
      )
      VALUES (
        ${input.eventId},
        ${input.consumerName},
        ${input.processedAt.toISOString()},
        ${JSON.stringify(input.resultMetadata ?? null)}::jsonb
      )
      ON CONFLICT (event_id, consumer_name) DO NOTHING
    `);
  }

  public async transaction<T>(run: (tx: OutboxTransactionContext) => Promise<T>): Promise<T> {
    return this.db.transaction(async (client) => {
      const tx: DrizzleTransactionContext = {
        id: crypto.randomUUID(),
        client: client as DrizzleExecutor
      };
      return run(tx);
    });
  }
}

export class WalkingSkeletonEventRecorder implements EventConsumer {
  public readonly consumerName = "walking_skeleton_event_recorder";
  public readonly supportedEvents = [
    "ContactRegistered.v1",
    "ContactLinkedToColony.v1",
    "ResponsibleAssigned.v1",
    "VisitScheduled.v1",
    "VisitCompleted.v1"
  ] as const;

  public async handle(event: OutboxEvent, context: ConsumerExecutionContext) {
    await executorFrom(context.transaction).execute(sql`
      INSERT INTO processed_event_log (
        event_id,
        consumer_name,
        event_name,
        aggregate_type,
        aggregate_id,
        processed_at
      )
      VALUES (
        ${event.eventId},
        ${this.consumerName},
        ${event.eventName},
        ${event.aggregateType},
        ${event.aggregateId},
        ${context.processingStartedAt.toISOString()}
      )
      ON CONFLICT (event_id, consumer_name) DO NOTHING
    `);
    return { resultMetadata: { recorded: true } };
  }
}

export function createOutboxWorkerComposition(input: {
  readonly db: Database;
  readonly logger?: Logger;
  readonly retryPolicy?: RetryPolicyLike;
  readonly workerId?: string;
}) {
  const logger = input.logger ?? new InMemoryLogger();
  const outboxRepository = new DrizzleOutboxRepository(input.db);
  const receiptRepository = new DrizzleConsumerReceiptRepository(input.db);
  const registry = new ConsumerRegistry();
  registry.register(new WalkingSkeletonEventRecorder());
  const dispatcher = new EventDispatcher({
    registry,
    receiptRepository,
    outboxRepository,
    retryPolicy: input.retryPolicy ?? new RetryPolicy(),
    clock: new SystemClock(),
    logger
  });
  const worker = new OutboxWorker({
    outboxRepository,
    dispatcher,
    clock: new SystemClock(),
    logger
  });
  return {
    worker,
    workerId: input.workerId ?? createWorkerId(),
    registry,
    outboxRepository,
    receiptRepository,
    logger
  };
}

function createWorkerId(): string {
  return `${hostname()}-${crypto.randomUUID().slice(0, 8)}`;
}

type OutboxEventRow = {
  readonly event_id: string;
  readonly event_name: string;
  readonly event_version: number;
  readonly aggregate_type: string;
  readonly aggregate_id: string;
  readonly payload: Record<string, unknown>;
  readonly metadata: Record<string, unknown>;
  readonly status: "pending" | "processing" | "processed" | "dead_letter";
  readonly attempts: number;
  readonly created_at: Date;
};

function rowToEvent(row: OutboxEventRow): OutboxEvent {
  return {
    eventId: row.event_id,
    eventName: row.event_name,
    eventVersion: row.event_version,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    payload: row.payload,
    metadata: row.metadata,
    status: row.status,
    attempt: row.attempts,
    createdAt: new Date(row.created_at).toISOString()
  };
}
