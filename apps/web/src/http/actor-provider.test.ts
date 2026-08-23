import { describe, expect, it } from "vitest";

import { Permission, createAuthenticatedActor } from "@tonala/shared/auth";

import {
  actorFromRequest,
  createDevelopmentHttpActorProvider,
  type HttpActorProvider
} from "./actor-provider.js";

describe("HTTP actor provider", () => {
  it("uses the configured actor provider when one is present", () => {
    const provider: HttpActorProvider = {
      actorForRequest: () => createAuthenticatedActor({
        actorId: "user-provider",
        roles: ["admin"],
        permissions: [Permission.ContactsRead],
        correlationId: "corr-provider",
        authenticationMethod: "password",
        requestStartedAt: new Date("2026-08-07T00:00:00.000Z")
      })
    };

    const actor = actorFromRequest(new Request("http://test.local/api/contacts"), {
      actorProvider: provider
    });

    expect(actor.actorId).toBe("user-provider");
    expect(actor.authenticationMethod).toBe("password");
  });

  it("keeps the development header adapter behind an explicit provider", () => {
    const provider = createDevelopmentHttpActorProvider({ NEXT_PUBLIC_APP_ENV: "test" });
    const actor = actorFromRequest(new Request("http://test.local/api/contacts", {
      headers: {
        "x-tonala-actor-id": "user-dev",
        "x-tonala-permissions": "contacts:read",
        "x-correlation-id": "corr-dev"
      }
    }), { actorProvider: provider });

    expect(actor.actorId).toBe("user-dev");
    expect(actor.authenticationMethod).toBe("development");
    expect(actor.permissions.has(Permission.ContactsRead)).toBe(true);
  });

  it("rejects the development adapter outside local and test environments", () => {
    const provider = createDevelopmentHttpActorProvider({ NEXT_PUBLIC_APP_ENV: "production" });

    expect(() => provider.actorForRequest(new Request("http://test.local/api/contacts", {
      headers: { "x-tonala-actor-id": "user-dev" }
    }))).toThrow("Development actor adapter can only run");
  });
});
