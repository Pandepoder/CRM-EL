import { describe, expect, it } from "vitest";

import { createProjectionVersion, type ProjectionEvent, type ProjectionLiveRunResult } from "@tonala/shared/projections";
import { ProjectionEventConsumer, normalizeOutboxEvent } from "../../scripts/composition/projection-engine.js";

function outboxEvent(input: Partial<Parameters<typeof normalizeOutboxEvent>[0]> = {}) {
  return {
    eventId: "event-1",
    eventName: "ContactRegistered.v1",
    eventVersion: 1,
    aggregateType: "contact",
    aggregateId: "contact-1",
    payload: { phone: "do-not-log" },
    metadata: { correlation_id: "correlation-1", secret: "drop-me" },
    status: "processing" as const,
    attempt: 1,
    createdAt: "2026-07-30T00:00:00.000Z",
    ...input
  };
}

function result(input: Partial<ProjectionLiveRunResult> = {}): ProjectionLiveRunResult {
  const version = createProjectionVersion("v1");
  if (!version.ok) throw version.error;
  return {
    eventId: "event-1",
    eventName: "ContactRegistered",
    eventVersion: version.value,
    success: true,
    entries: [],
    stoppedAtProjection: null,
    error: null,
    startedAt: new Date("2026-07-30T00:00:00.000Z"),
    completedAt: new Date("2026-07-30T00:00:01.000Z"),
    durationMs: 1000,
    ...input
  };
}

const context = {
  correlationId: "correlation-1",
  workerId: "worker-1",
  attempt: 2,
  processingStartedAt: new Date("2026-07-30T00:00:01.000Z"),
  logger: { log: () => undefined },
  transaction: { id: "tx-1" }
};

describe("ProjectionEventConsumer", () => {
  it("normalizes outbox event name and version", () => {
    expect(normalizeOutboxEvent(outboxEvent())).toMatchObject({
      eventId: "event-1",
      eventName: "ContactRegistered",
      eventVersion: "v1",
      aggregateType: "contact",
      aggregateId: "contact-1"
    });
  });

  it("normalizes numeric eventVersion when the event name has no suffix", () => {
    expect(normalizeOutboxEvent(outboxEvent({ eventName: "ContactRegistered", eventVersion: 1 }))).toMatchObject({
      eventName: "ContactRegistered",
      eventVersion: "v1"
    });
  });

  it("filters metadata while preserving correlation_id", () => {
    const normalized = normalizeOutboxEvent(outboxEvent());
    expect(normalized.metadata["correlation_id"]).toBe("correlation-1");
    expect(normalized.metadata["secret"]).toBeUndefined();
  });

  it("preserves payload for the projection runner but does not expose it in consumer result metadata", async () => {
    let seenPayload: ProjectionEvent["payload"] | null = null;
    const consumer = new ProjectionEventConsumer({
      run: (input) => {
        seenPayload = input.event.payload;
        return Promise.resolve(result());
      }
    });

    const output = await consumer.handle(outboxEvent(), context);

    expect(seenPayload).toEqual({ phone: "do-not-log" });
    expect(output?.resultMetadata).toEqual({ projection_engine: "ok", entries: 0 });
  });

  it("invokes runner and returns success metadata", async () => {
    let seenCorrelationId = "";
    let seenWorkerId = "";
    let seenAttempt = 0;
    const consumer = new ProjectionEventConsumer({
      run: (input) => {
        seenCorrelationId = input.correlationId;
        seenWorkerId = input.workerId;
        seenAttempt = input.attempt;
        return Promise.resolve(result());
      }
    });
    await expect(consumer.handle(outboxEvent(), context)).resolves.toEqual({
      resultMetadata: { projection_engine: "ok", entries: 0 }
    });
    expect(seenCorrelationId).toBe("correlation-1");
    expect(seenWorkerId).toBe("worker-1");
    expect(seenAttempt).toBe(2);
  });

  it("treats empty entries as success", async () => {
    const consumer = new ProjectionEventConsumer({ run: () => Promise.resolve(result({ entries: [] })) });
    await expect(consumer.handle(outboxEvent(), context)).resolves.toBeDefined();
  });

  it("throws retryable error for blocked retryable runner failure", async () => {
    const consumer = new ProjectionEventConsumer({
      run: () => Promise.resolve(result({
        success: false,
        error: { code: "projection_processing_paused", retryable: true } as ProjectionLiveRunResult["error"]
      }))
    });
    await expect(consumer.handle(outboxEvent(), context)).rejects.toThrow("projection_processing_paused");
  });

  it("throws permanent outbox error for permanent runner failure", async () => {
    const consumer = new ProjectionEventConsumer({
      run: () => Promise.resolve(result({
        success: false,
        error: { code: "projection_runtime_binding_not_found", retryable: false } as ProjectionLiveRunResult["error"]
      }))
    });
    await expect(consumer.handle(outboxEvent(), context)).rejects.toThrow("projection_runtime_binding_not_found");
  });

  it("throws permanent outbox error when normalization creates an invalid projection event", async () => {
    const consumer = new ProjectionEventConsumer({ run: () => Promise.resolve(result()) });
    await expect(consumer.handle(outboxEvent({ eventName: "ContactRegistered", eventVersion: 0 }), context))
      .rejects.toThrow("Projection version must use v followed by a positive integer.");
  });
});
