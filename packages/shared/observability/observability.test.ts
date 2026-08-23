import { describe, expect, it } from "vitest";

import { Permission, createAuthenticatedActor } from "@tonala/shared/auth";

import { InMemoryLogger, LogLevel, measureOperation, redactLogFields } from "./index.js";

describe("structured observability", () => {
  it("redacts sensitive details", () => {
    expect(redactLogFields({
      details: {
        email: "person@example.test",
        password: "secret",
        safe: "visible"
      }
    }).details).toEqual({
      email: "[REDACTED]",
      password: "[REDACTED]",
      safe: "visible"
    });
  });

  it("logs successful measured operations with actor and correlation id", async () => {
    const logger = new InMemoryLogger();
    const actor = createAuthenticatedActor({
      actorId: "user-1",
      roles: ["capturist"],
      permissions: [Permission.ContactsCreate],
      correlationId: "corr-1",
      authenticationMethod: "password",
      requestStartedAt: new Date("2026-07-28T00:00:00.000Z")
    });

    await measureOperation({
      actor,
      logger,
      operation: "technical.operation",
      run: () => Promise.resolve("ok")
    });

    expect(logger.entries[0]).toMatchObject({
      level: LogLevel.Info,
      actorId: "user-1",
      correlationId: "corr-1",
      operation: "technical.operation",
      success: true
    });
  });
});
