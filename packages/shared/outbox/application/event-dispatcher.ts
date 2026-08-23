import { createCorrelationId } from "@tonala/shared/kernel";
import { LogLevel } from "@tonala/shared/observability";

import { type OutboxEvent } from "../contracts/index.js";
import { sanitizeOutboxError } from "./retry-policy.js";
import { type DispatchResult, type EventDispatcherDependencies, type WorkerDispatchContext } from "./ports.js";

export class EventDispatcher {
  public constructor(private readonly dependencies: EventDispatcherDependencies) {}

  public async dispatch(event: OutboxEvent, context: WorkerDispatchContext): Promise<DispatchResult> {
    const consumers = this.dependencies.registry.consumersFor(event);
    let skippedByReceipt = 0;

    if (consumers.length === 0) {
      await this.dependencies.outboxRepository.markProcessed({
        eventId: event.eventId,
        processedAt: this.dependencies.clock.now()
      });
      return { status: "processed", skippedByReceipt: 0, failed: false };
    }

    try {
      for (const consumer of consumers) {
        if (await this.dependencies.receiptRepository.hasReceipt(event.eventId, consumer.consumerName)) {
          skippedByReceipt += 1;
          continue;
        }

        await this.dependencies.receiptRepository.transaction(async (tx) => {
          const result = await consumer.handle(event, {
            correlationId: safeCorrelationId(event),
            workerId: context.workerId,
            attempt: event.attempt,
            processingStartedAt: context.processingStartedAt,
            logger: this.dependencies.logger,
            transaction: tx
          });
          const receiptInput: {
            eventId: string;
            consumerName: string;
            processedAt: Date;
            resultMetadata?: Readonly<Record<string, unknown>>;
          } = {
            eventId: event.eventId,
            consumerName: consumer.consumerName,
            processedAt: this.dependencies.clock.now()
          };
          if (result?.resultMetadata) {
            receiptInput.resultMetadata = result.resultMetadata;
          }
          await this.dependencies.receiptRepository.recordReceipt(receiptInput, tx);
        });
      }

      await this.dependencies.outboxRepository.markProcessed({
        eventId: event.eventId,
        processedAt: this.dependencies.clock.now()
      });
      return { status: "processed", skippedByReceipt, failed: false };
    } catch (error) {
      const safeError = sanitizeOutboxError(error);
      if (this.dependencies.retryPolicy.shouldDeadLetter(event.attempt, error)) {
        await this.dependencies.outboxRepository.markDeadLetter({
          eventId: event.eventId,
          lastError: safeError
        });
        return { status: "dead_letter", skippedByReceipt, failed: true };
      }

      const nextAttemptAt = new Date(
        this.dependencies.clock.now().getTime()
        + this.dependencies.retryPolicy.nextDelaySeconds(event.attempt) * 1000
      );
      await this.dependencies.outboxRepository.markPendingForRetry({
        eventId: event.eventId,
        nextAttemptAt,
        lastError: safeError
      });
      this.dependencies.logger.log(LogLevel.Warn, "Outbox event scheduled for retry", {
        correlationId: safeCorrelationId(event),
        errorCode: error instanceof Error ? error.name : "unknown_error",
        entityId: event.eventId,
        entityType: "outbox_event",
        details: { eventName: event.eventName, nextAttemptAt: nextAttemptAt.toISOString() }
      });
      return { status: "retried", skippedByReceipt, failed: true };
    }
  }
}

function safeCorrelationId(event: OutboxEvent) {
  const value = event.metadata["correlation_id"];
  if (typeof value === "string" && value.length > 0) {
    return createCorrelationId(value);
  }
  return createCorrelationId(`outbox-${event.eventId}`);
}
