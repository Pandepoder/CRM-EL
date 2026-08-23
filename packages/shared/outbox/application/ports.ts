import { type Clock } from "@tonala/shared/kernel";
import { type Logger } from "@tonala/shared/observability";

import {
  type EventConsumer,
  type OutboxEvent,
  type OutboxProcessingSummary,
  type OutboxTransactionContext
} from "../contracts/index.js";

export interface OutboxRepository {
  claimPending(input: {
    readonly batchSize: number;
    readonly workerId: string;
    readonly now: Date;
  }): Promise<readonly OutboxEvent[]>;
  markProcessed(input: {
    readonly eventId: string;
    readonly processedAt: Date;
  }): Promise<void>;
  markPendingForRetry(input: {
    readonly eventId: string;
    readonly nextAttemptAt: Date;
    readonly lastError: string;
  }): Promise<void>;
  markDeadLetter(input: {
    readonly eventId: string;
    readonly lastError: string;
  }): Promise<void>;
  recoverAbandoned(input: {
    readonly abandonedBefore: Date;
    readonly nextAttemptAt: Date;
  }): Promise<number>;
  countDeadLetters(): Promise<number>;
}

export interface ConsumerReceiptRepository {
  hasReceipt(eventId: string, consumerName: string): Promise<boolean>;
  recordReceipt(input: {
    readonly eventId: string;
    readonly consumerName: string;
    readonly processedAt: Date;
    readonly resultMetadata?: Readonly<Record<string, unknown>>;
  }, tx: OutboxTransactionContext): Promise<void>;
  transaction<T>(run: (tx: OutboxTransactionContext) => Promise<T>): Promise<T>;
}

export type EventDispatcherDependencies = Readonly<{
  registry: { consumersFor(event: OutboxEvent): readonly EventConsumer[] };
  receiptRepository: ConsumerReceiptRepository;
  outboxRepository: OutboxRepository;
  retryPolicy: RetryPolicyLike;
  clock: Clock;
  logger: Logger;
}>;

export interface RetryPolicyLike {
  readonly maxAttempts: number;
  nextDelaySeconds(attempt: number): number;
  shouldDeadLetter(attempt: number, error: unknown): boolean;
}

export type OutboxWorkerDependencies = Readonly<{
  outboxRepository: OutboxRepository;
  dispatcher: { dispatch(event: OutboxEvent, context: WorkerDispatchContext): Promise<DispatchResult> };
  clock: Clock;
  logger: Logger;
}>;

export type WorkerDispatchContext = Readonly<{
  workerId: string;
  processingStartedAt: Date;
}>;

export type DispatchResult = Readonly<{
  status: "processed" | "retried" | "dead_letter";
  skippedByReceipt: number;
  failed: boolean;
}>;

export type RunOnceInput = Readonly<{
  workerId: string;
  batchSize: number;
  abandonedTimeoutSeconds: number;
}>;

export type RunOnceResult = OutboxProcessingSummary;
