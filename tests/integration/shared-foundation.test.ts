import { describe, expect, it } from "vitest";

import { Permission, createAuthenticatedActor, requirePermission } from "@tonala/shared/auth";
import { toSafeHttpError } from "@tonala/shared/errors";
import { type Result, err, ok } from "@tonala/shared/kernel";
import { InMemoryLogger, measureOperation } from "@tonala/shared/observability";

describe("shared foundation technical integration", () => {
  it("propagates actor, correlation id, permission, Result, logs and safe HTTP errors", async () => {
    const logger = new InMemoryLogger();
    const actor = createAuthenticatedActor({
      actorId: "user-technical-1",
      roles: ["capturist"],
      permissions: [Permission.ContactsCreate],
      correlationId: "corr-technical-1",
      authenticationMethod: "password",
      requestStartedAt: new Date("2026-07-28T00:00:00.000Z")
    });

    const result = await measureOperation({
      actor,
      logger,
      operation: "technical.simulatedUseCase",
      run: (): Promise<Result<{ readonly created: true }, unknown>> => {
        const auth = requirePermission(actor, Permission.ContactsCreate);
        return Promise.resolve(auth.ok ? ok({ created: true }) : err(auth.error));
      }
    });

    expect(result).toEqual({ ok: true, value: { created: true } });
    expect(logger.entries[0]?.correlationId).toBe(actor.correlationId);
  });

  it("translates denied permission to safe HTTP response", () => {
    const actor = createAuthenticatedActor({
      actorId: "user-technical-2",
      roles: ["capturist"],
      permissions: [],
      correlationId: "corr-technical-2",
      authenticationMethod: "password",
      requestStartedAt: new Date("2026-07-28T00:00:00.000Z")
    });

    const result = requirePermission(actor, Permission.DashboardRead);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(toSafeHttpError(result.error)).toEqual({
        status: 403,
        code: "permission_denied",
        message: "You do not have permission to perform this action.",
        diagnostic: { permission: "dashboard:read" }
      });
    }
  });
});
