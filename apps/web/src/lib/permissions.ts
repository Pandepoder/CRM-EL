import { Permission } from "@tonala/shared/auth";

/**
 * Static role → permission map (V1). Centralized so session and tests share one source.
 */
export function permissionsForRole(roleKey: string): Permission[] {
  const all: Permission[] = [
    Permission.ContactsCreate,
    Permission.ContactsRead,
    Permission.TerritoryLink,
    Permission.AssignmentsCreate,
    Permission.VisitsRead,
    Permission.VisitsSchedule,
    Permission.VisitsComplete,
    Permission.DashboardRead
  ];

  switch (roleKey) {
    case "admin":
    case "direction":
      return all;
    case "territorial_coordinator":
      return [
        Permission.ContactsCreate,
        Permission.ContactsRead,
        Permission.TerritoryLink,
        Permission.AssignmentsCreate,
        Permission.VisitsRead,
        Permission.VisitsSchedule
      ];
    case "capturist":
      return [
        Permission.ContactsCreate,
        Permission.ContactsRead,
        Permission.TerritoryLink,
        Permission.VisitsRead
      ];
    case "visit_responsible":
      return [
        Permission.ContactsRead,
        Permission.VisitsRead,
        Permission.VisitsSchedule,
        Permission.VisitsComplete
      ];
    default:
      return [];
  }
}

export function roleHasAny(roleKey: string, allowed: readonly string[]): boolean {
  return allowed.includes(roleKey);
}
