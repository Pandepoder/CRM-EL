import { describe, expect, it } from "vitest";

import {
  SystemClock,
  createCorrelationId,
  createEntityId,
  err,
  ok,
  type DomainEvent
} from "./index.js";

describe("shared kernel", () => {
  it("creates success and failure results", () => {
    expect(ok("ready")).toEqual({ ok: true, value: "ready" });
    expect(err("nope")).toEqual({ ok: false, error: "nope" });
  });

  it("rejects empty identifiers", () => {
    expect(() => createEntityId("")).toThrow(/EntityId/);
    expect(() => createCorrelationId(" ")).toThrow(/CorrelationId/);
  });

  it("supports domain event metadata without framework base classes", () => {
    const event: DomainEvent<"TechnicalEvent", { readonly ok: true }> = {
      name: "TechnicalEvent",
      version: 1,
      payload: { ok: true },
      metadata: {
        eventId: createEntityId("event-1"),
        correlationId: createCorrelationId("corr-1"),
        occurredAt: new SystemClock().now(),
        source: "kernel.test"
      }
    };

    expect(event.name).toBe("TechnicalEvent");
  });
});
