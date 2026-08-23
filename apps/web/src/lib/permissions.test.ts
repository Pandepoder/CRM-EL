import { describe, expect, it } from "vitest";

import { Permission } from "@tonala/shared/auth";

import { permissionsForRole, roleHasAny } from "@/lib/permissions";

describe("permissionsForRole", () => {
  it("grants full access to admin", () => {
    const perms = permissionsForRole("admin");
    expect(perms).toContain(Permission.DashboardRead);
    expect(perms).toContain(Permission.ContactsCreate);
  });

  it("restricts visit_responsible from creating contacts", () => {
    const perms = permissionsForRole("visit_responsible");
    expect(perms).not.toContain(Permission.ContactsCreate);
    expect(perms).toContain(Permission.VisitsComplete);
  });
});

describe("roleHasAny", () => {
  it("matches allowed roles", () => {
    expect(roleHasAny("admin", ["admin", "direction"])).toBe(true);
    expect(roleHasAny("capturist", ["admin"])).toBe(false);
  });
});
