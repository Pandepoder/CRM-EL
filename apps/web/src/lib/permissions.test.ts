import { describe, expect, it } from "vitest";

import { Permission } from "@tonala/shared/auth";

import { permissionsForRole, roleHasAny } from "@/lib/permissions";

describe("permissionsForRole", () => {
  it("grants full access to admin", () => {
    const perms = permissionsForRole("admin");
    expect(perms).toContain(Permission.DashboardRead);
    expect(perms).toContain(Permission.ContactsCreate);
  });

  // El brigadista consulta el padrón y trabaja sus visitas, pero no da de alta
  // ciudadanos ni asigna trabajo: el registro es del capturista y del líder.
  it("restricts visit_responsible from creating contacts", () => {
    const perms = permissionsForRole("visit_responsible");
    expect(perms).not.toContain(Permission.ContactsCreate);
    expect(perms).not.toContain(Permission.AssignmentsCreate);
    expect(perms).toContain(Permission.VisitsComplete);
  });

  // El líder cierra las visitas que agenda, sin depender de administración.
  it("lets territorial_coordinator both schedule and complete visits", () => {
    const perms = permissionsForRole("territorial_coordinator");
    expect(perms).toContain(Permission.VisitsSchedule);
    expect(perms).toContain(Permission.VisitsComplete);
    expect(perms).toContain(Permission.AssignmentsCreate);
  });

  // Solo administración conserva el tablero global.
  it("keeps the global dashboard out of every role but admin and direction", () => {
    expect(permissionsForRole("territorial_coordinator")).not.toContain(Permission.DashboardRead);
    expect(permissionsForRole("capturist")).not.toContain(Permission.DashboardRead);
    expect(permissionsForRole("visit_responsible")).not.toContain(Permission.DashboardRead);
  });
});

describe("roleHasAny", () => {
  it("matches allowed roles", () => {
    expect(roleHasAny("admin", ["admin", "direction"])).toBe(true);
    expect(roleHasAny("capturist", ["admin"])).toBe(false);
  });
});
