import { type Logger } from "@tonala/shared/observability";

export type OutboxEventName = string;

export type OutboxEvent = Readonly<{
  eventId: string;
  eventName: OutboxEventName;
  eventVersion: number;
  aggregateType: string;
  aggregateId: string;
  payload: Readonly<Record<string, unknown>>;
  metadata: Readonly<Record<string, unknown>>;
  status: "pending" | "processing" | "processed" | "dead_letter";
  attempt: number;
  createdAt: string;
}>;

export type OutboxTransactionContext = Readonly<{ id: string }>;

export type ConsumerExecutionContext = Readonly<{
  correlationId: string;
  workerId: string;
  attempt: number;
  processingStartedAt: Date;
  logger: Logger;
  transaction: OutboxTransactionContext;
}>;

export type EventConsumerResult = Readonly<{
  resultMetadata?: Readonly<Record<string, unknown>>;
}>;

export interface EventConsumer {
  readonly consumerName: string;
  readonly supportedEvents: readonly OutboxEventName[];
  handle(event: OutboxEvent, context: ConsumerExecutionContext): Promise<EventConsumerResult | void>;
}

export type OutboxProcessingSummary = Readonly<{
  claimed: number;
  processed: number;
  retried: number;
  deadLettered: number;
  skippedByReceipt: number;
  failed: number;
}>;
