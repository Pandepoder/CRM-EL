import { describe, expect, it } from "vitest";

import { InMemoryLogger } from "@tonala/shared/observability";
import { createProjectionVersion, ProjectionMode, type ProjectionEvent } from "@tonala/shared/projections";

import { walkingSkeletonProjection, walkingSkeletonProjectionIdentity, type WalkingSkeletonProjectionWriter } from "./index.js";

function event(eventName: string, createdAt = "2026-07-30T00:00:00.000Z"): ProjectionEvent {
  const version = createProjectionVersion("v1");
  if (!version.ok) throw version.error;
  return {
    eventId: `event-${eventName}`,
    eventName,
    eventVersion: version.value,
    aggregateType: "technical",
    aggregateId: "aggregate-1",
    payload: { name: "do-not-use", phone: "do-not-use" },
    metadata: {},
    createdAt
  };
}

function writer() {
  const calls: string[] = [];
  const lastEventAt: Date[] = [];
  const projectionWriter: WalkingSkeletonProjectionWriter = {
    incrementContactRegistered: (eventCreatedAt) => {
      calls.push("contact_registered");
      lastEventAt.push(eventCreatedAt);
      return Promise.resolve();
    },
    incrementContactLinked: (eventCreatedAt) => {
      calls.push("contact_linked");
      lastEventAt.push(eventCreatedAt);
      return Promise.resolve();
    },
    incrementResponsibleAssigned: (eventCreatedAt) => {
      calls.push("responsible_assigned");
      lastEventAt.push(eventCreatedAt);
      return Promise.resolve();
    },
    incrementVisitScheduled: (eventCreatedAt) => {
      calls.push("visit_scheduled");
      lastEventAt.push(eventCreatedAt);
      return Promise.resolve();
    },
    incrementVisitCompleted: (eventCreatedAt) => {
      calls.push("visit_completed");
      lastEventAt.push(eventCreatedAt);
      return Promise.resolve();
    }
  };
  return { calls, lastEventAt, writer: projectionWriter };
}

async function handle(projectionEvent: ProjectionEvent, projectionWriter: WalkingSkeletonProjectionWriter) {
  await walkingSkeletonProjection.handle(projectionEvent, {
    projectionIdentity: walkingSkeletonProjectionIdentity,
    mode: ProjectionMode.Live,
    workerId: "worker-test",
    correlationId: "correlation-test",
    attempt: 1,
    processingStartedAt: new Date("2026-07-30T00:00:01.000Z"),
    rebuildId: null,
    logger: new InMemoryLogger()
  }, projectionWriter);
}

describe("WalkingSkeletonProjection", () => {
  it("declares five supported event descriptors and identity walking_skeleton:v1", () => {
    expect(walkingSkeletonProjection.identity).toEqual(walkingSkeletonProjectionIdentity);
    expect(walkingSkeletonProjection.supportedEvents.map((item) => `${item.eventName}:${item.eventVersion}`)).toEqual([
      "ContactRegistered:v1",
      "ContactLinkedToColony:v1",
      "ResponsibleAssigned:v1",
      "VisitScheduled:v1",
      "VisitCompleted:v1"
    ]);
  });

  it.each([
    ["ContactRegistered", "contact_registered"],
    ["ContactLinkedToColony", "contact_linked"],
    ["ResponsibleAssigned", "responsible_assigned"],
    ["VisitScheduled", "visit_scheduled"],
    ["VisitCompleted", "visit_completed"]
  ])("%s increments the correct counter", async (eventName, expectedCall) => {
    const setup = writer();
    await handle(event(eventName), setup.writer);
    expect(setup.calls).toEqual([expectedCall]);
  });

  it("does not invoke writer for unsupported event", async () => {
    const setup = writer();
    await handle(event("UnsupportedEvent"), setup.writer);
    expect(setup.calls).toEqual([]);
  });

  it("does not read or require personal payload fields", async () => {
    const setup = writer();
    await handle(event("ContactRegistered"), setup.writer);
    expect(setup.calls).toEqual(["contact_registered"]);
  });

  it("passes event createdAt so writer can keep greatest lastEventAt", async () => {
    const setup = writer();
    await handle(event("VisitCompleted", "2026-07-29T00:00:00.000Z"), setup.writer);
    expect(setup.lastEventAt[0]?.toISOString()).toBe("2026-07-29T00:00:00.000Z");
  });
});
