import { describe, expect, it } from "vitest";

import {
  Permission,
  PermissionChecker,
  createAuthenticatedActor,
  createSystemActor,
  requirePermission
} from "./index.js";

const actor = createAuthenticatedActor({
  actorId: "user-1",
  roles: ["territorial_coordinator"],
  permissions: [Permission.ContactsCreate],
  correlationId: "corr-1",
  authenticationMethod: "password",
  requestStartedAt: new Date("2026-07-28T00:00:00.000Z")
});

describe("actor context and authorization", () => {
  it("creates provider-independent authenticated and system actors", () => {
    expect(actor.isSystem).toBe(false);
    expect(createSystemActor({
      actorId: "worker-1",
      permissions: [Permission.DashboardRead],
      correlationId: "corr-worker",
      requestStartedAt: new Date("2026-07-28T00:00:00.000Z")
    }).authenticationMethod).toBe("system");
  });

  it("allows actors with the required permission", () => {
    expect(requirePermission(actor, Permission.ContactsCreate).ok).toBe(true);
  });

  it("denies actors without the required permission", () => {
    const result = requirePermission(actor, Permission.VisitsComplete);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("permission_denied");
    }
  });

  it("rejects anonymous context for protected actions", () => {
    const decision = new PermissionChecker().can(undefined, Permission.DashboardRead);

    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.error.code).toBe("auth_context_required");
    }
  });
});
