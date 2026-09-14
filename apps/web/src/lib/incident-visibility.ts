import { and, eq, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { schema } from "@tonala/shared/database";

import type { UserNetworkScope } from "./network-hierarchy";

/**
 * Qué incidencias ve quien no es administración.
 *
 * Es la regla que ya aplicaba el mapa (/api/map/sections/geojson), ahora compartida: las que no
 * tienen a nadie asignado —cualquiera del territorio puede tomarlas—, las que creó la persona,
 * las asignadas a alguien de su equipo y las asignadas a uno de sus equipos.
 *
 * Antes cada pantalla decidía por su lado: la gestión y el historial leían todas las incidencias
 * del sistema sin filtro, y el resumen solo contaba las asignadas a un equipo, así que dejaba
 * fuera las que la propia persona había levantado.
 */
export function incidentScopeCondition(scope: UserNetworkScope): SQL | undefined {
  if (scope.isGlobal) return undefined;
  // Sin alcance (sesión de alguien dado de baja): nada.
  if ((scope.allowedUserIds ?? []).length === 0) return sql`false`;

  return or(
    and(isNull(schema.eventReports.assignedTeamId), isNull(schema.eventReports.assignedToUserId)),
    eq(schema.eventReports.createdByUserId, scope.userId),
    inArray(schema.eventReports.assignedToUserId, scope.teammateUserIds),
    inArray(schema.eventReports.assignedTeamId, scope.teamIds)
  );
}
