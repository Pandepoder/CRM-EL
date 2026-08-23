import { describe, expect, it } from "vitest";

import { InMemoryLogger } from "@tonala/shared/observability";

import { type EventConsumer, type OutboxEvent } from "../contracts/index.js";
import { ConsumerRegistry } from "./consumer-registry.js";
import { EventDispatcher } from "./event-dispatcher.js";
import { PermanentOutboxError, RetryPolicy, sanitizeOutboxError } from "./retry-policy.js";
import {
  type ConsumerReceiptRepository,
  type OutboxRepository,
  type RetryPolicyLike
} from "./ports.js";

const event: OutboxEvent = {
  eventId: "00000000-0000-0000-0000-000000000001",
  eventName: "ContactRegistered.v1",
  eventVersion: 1,
  aggregateType: "contact",
  aggregateId: "00000000-0000-0000-0000-000000000002",
  payload: {},
  metadata: {},
  status: "processing",
  attempt: 1,
  createdAt: "2026-07-30T00:00:00.000Z"
};

describe("outbox application", () => {
  it("registers consumers, rejects duplicates and selects applicable consumers", () => {
    const registry = new ConsumerRegistry();
    const consumer = fakeConsumer("consumer_a", ["ContactRegistered.v1"]);
    registry.register(consumer);

    expect(registry.consumersFor(event)).toEqual([consumer]);
    expect(() => registry.register(consumer)).toThrowError("already registered");
    expect(registry.consumersFor({ ...event, eventName: "Unknown.v1" })).toEqual([]);
  });

  it("calculates retry policy and sanitizes errors", () => {
    const policy = new RetryPolicy(5, 5, 40);
    expect(policy.nextDelaySeconds(1)).toBe(5);
    expect(policy.nextDelaySeconds(4)).toBe(40);
    expect(policy.shouldDeadLetter(5, new Error("temporary"))).toBe(true);
    expect(policy.shouldDeadLetter(1, new PermanentOutboxError("bad data"))).toBe(true);
    expect(sanitizeOutboxError(new Error("token abc sql select"))).toBe("[REDACTED] abc [REDACTED] select");
  });

  it("skips a consumer with receipt and processes events without consumers", async () => {
    const registry = new ConsumerRegistry();
    let handled = 0;
    registry.register({
      ...fakeConsumer("consumer_a", ["ContactRegistered.v1"]),
      handle: () => {
        handled += 1;
        return Promise.resolve();
      }
    });
    const outbox = fakeOutboxRepository();
    const receipts = fakeReceiptRepository(true);
    const dispatcher = new EventDispatcher({
      registry,
      receiptRepository: receipts,
      outboxRepository: outbox,
      retryPolicy: new RetryPolicy(),
      clock: { now: () => new Date("2026-07-30T00:00:00.000Z") },
      logger: new InMemoryLogger()
    });

    const result = await dispatcher.dispatch(event, {
      workerId: "worker-test",
      processingStartedAt: new Date("2026-07-30T00:00:00.000Z")
    });
    expect(result.skippedByReceipt).toBe(1);
    expect(handled).toBe(0);
    expect(outbox.processed).toBe(1);
  });

  it("returns retry for transient errors and dead_letter for permanent errors", async () => {
    const transient = await dispatchFailing(new Error("temporary"), new RetryPolicy(5, 1, 1));
    expect(transient.retried).toBe(1);

    const permanent = await dispatchFailing(new PermanentOutboxError("bad payload"), new RetryPolicy(5, 1, 1));
    expect(permanent.deadLettered).toBe(1);
  });
});

function fakeConsumer(name: string, supportedEvents: readonly string[]): EventConsumer {
  return {
    consumerName: name,
    supportedEvents,
    handle: () => Promise.resolve()
  };
}

function fakeOutboxRepository(): OutboxRepository & { processed: number; retried: number; deadLettered: number } {
  return {
    processed: 0,
    retried: 0,
    deadLettered: 0,
    claimPending: () => Promise.resolve([]),
    markProcessed() {
      this.processed += 1;
      return Promise.resolve();
    },
    markPendingForRetry() {
      this.retried += 1;
      return Promise.resolve();
    },
    markDeadLetter() {
      this.deadLettered += 1;
      return Promise.resolve();
    },
    recoverAbandoned: () => Promise.resolve(0),
    countDeadLetters: () => Promise.resolve(0)
  };
}

function fakeReceiptRepository(hasReceipt: boolean): ConsumerReceiptRepository {
  return {
    hasReceipt: () => Promise.resolve(hasReceipt),
    recordReceipt: () => Promise.resolve(),
    transaction: (run) => run({ id: "tx-test" })
  };
}

async function dispatchFailing(error: Error, retryPolicy: RetryPolicyLike) {
  const registry = new ConsumerRegistry();
  registry.register({
    ...fakeConsumer("consumer_a", ["ContactRegistered.v1"]),
    handle: () => Promise.reject(error)
  });
  const outbox = fakeOutboxRepository();
  const dispatcher = new EventDispatcher({
    registry,
    receiptRepository: fakeReceiptRepository(false),
    outboxRepository: outbox,
    retryPolicy,
    clock: { now: () => new Date("2026-07-30T00:00:00.000Z") },
    logger: new InMemoryLogger()
  });
  await dispatcher.dispatch(event, { workerId: "worker-test", processingStartedAt: new Date() });
  return outbox;
}
