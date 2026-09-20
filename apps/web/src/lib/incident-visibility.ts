import { inArray, or, sql, type SQL } from "drizzle-orm";
import { schema } from "@tonala/shared/database";

import type { UserNetworkScope } from "./network-hierarchy";

/**
 * Qué incidencias ve quien no es administración: las que levantó o tiene asignadas alguien de
 * su alcance (la persona, sus compañeros y, en cascada, quienes están bajo su mando) y las
 * asignadas a uno de sus equipos o de los equipos bajo su mando.
 *
 * Antes también veía todas las incidencias sin nadie asignado del sistema, así que una
 * dirección veía lo que levantaban las brigadas de otra. Levantar una incidencia solo lo puede
 * hacer un líder, dirección o administración (requireLiderParaIncidencias), así que la que
 * espera aceptación la sigue viendo toda la cadena de mando de quien la levantó.
 */
export function incidentScopeCondition(scope: UserNetworkScope): SQL | undefined {
  if (scope.isGlobal) return undefined;
  const personas = scope.allowedUserIds ?? [];
  // Sin alcance (sesión de alguien dado de baja): nada.
  if (personas.length === 0) return sql`false`;

  return or(
    inArray(schema.eventReports.createdByUserId, personas),
    inArray(schema.eventReports.assignedToUserId, personas),
    scope.teamIds.length > 0 ? inArray(schema.eventReports.assignedTeamId, scope.teamIds) : undefined
  );
}

/** La misma regla para SQL escrito a mano sobre `event_reports` con el alias dado. */
export function sqlCondicionIncidencias(scope: UserNetworkScope, alias: string): SQL {
  if (scope.isGlobal) return sql`true`;
  const personas = scope.allowedUserIds ?? [];
  if (personas.length === 0) return sql`false`;

  if (!/^[a-z_][a-z0-9_]*$/i.test(alias)) throw new Error(`Alias de tabla inválido: ${alias}`);
  const lista = (ids: string[]) => sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `);
  const t = sql.raw(alias);
  const porEquipo = scope.teamIds.length > 0 ? sql` OR ${t}.assigned_team_id IN (${lista(scope.teamIds)})` : sql``;
  return sql`(${t}.created_by_user_id IN (${lista(personas)}) OR ${t}.assigned_to_user_id IN (${lista(personas)})${porEquipo})`;
}
