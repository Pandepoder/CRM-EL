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
      // Cierra visitas además de agendarlas: quien coordina la brigada tiene que
      // poder dar por atendida una visita sin depender de administración.
      return [
        Permission.ContactsCreate,
        Permission.ContactsRead,
        Permission.TerritoryLink,
        Permission.AssignmentsCreate,
        Permission.VisitsRead,
        Permission.VisitsSchedule,
        Permission.VisitsComplete
      ];
    case "capturist":
      return [
        Permission.ContactsCreate,
        Permission.ContactsRead,
        Permission.TerritoryLink,
        Permission.VisitsRead
      ];
    case "visit_responsible":
      // El brigadista no da de alta ciudadanos: consulta el padrón, agenda sus
      // visitas y las cierra. El registro queda en manos del capturista y del
      // líder, que responden de la calidad del dato.
      //
      // Es una decisión deliberada, no un permiso olvidado. Se probó lo
      // contrario y se descartó.
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
