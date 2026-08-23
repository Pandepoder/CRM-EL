import { ApplicationError, ErrorCategory } from "@tonala/shared/errors";

import { type EventConsumer, type OutboxEvent } from "../contracts/index.js";

export class ConsumerRegistry {
  private readonly consumers = new Map<string, EventConsumer>();

  public register(consumer: EventConsumer): void {
    if (this.consumers.has(consumer.consumerName)) {
      throw new ApplicationError({
        code: "outbox_consumer_duplicate",
        category: ErrorCategory.Conflict,
        message: `Outbox consumer ${consumer.consumerName} is already registered.`,
        publicMessage: "Outbox consumer is duplicated."
      });
    }
    this.consumers.set(consumer.consumerName, consumer);
  }

  public consumersFor(event: OutboxEvent): readonly EventConsumer[] {
    return [...this.consumers.values()].filter((consumer) =>
      consumer.supportedEvents.includes(event.eventName)
    );
  }
}
