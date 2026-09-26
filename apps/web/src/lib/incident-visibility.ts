import { eq, inArray, or, sql, type SQL } from "drizzle-orm";
import { schema } from "@tonala/shared/database";

import { genteDelMunicipio, type UserNetworkScope } from "./network-hierarchy";

/**
 * Qué incidencias (y actividades de la bitácora) ve cada quien.
 *
 * - El administrador maestro, todas.
 * - Un administrador municipal, las que tienen la llave de su municipio, las que levantó o tiene
 *   asignadas su gente (las personas con esa llave) y las asignadas a un equipo de su municipio. Un
 *   administrador sin municipio, solo las suyas.
 * - Quien no es administración, las que levantó o tiene asignadas alguien de su alcance (la persona,
 *   en cascada quienes están bajo su mando y, si es capturista, sus compañeros de brigada) y las
 *   asignadas a uno de sus equipos o de los equipos bajo su mando.
 *
 * Antes también veía todas las incidencias sin nadie asignado del sistema, así que una
 * dirección veía lo que levantaban las brigadas de otra. Levantar una incidencia solo lo puede
 * hacer un líder, dirección o administración (requireLiderParaIncidencias), así que la que
 * espera aceptación la sigue viendo toda la cadena de mando de quien la levantó.
 */
export function incidentScopeCondition(scope: UserNetworkScope): SQL | undefined {
  if (scope.isMaster) return undefined;
  const t = schema.eventReports;

  if (scope.isAdmin) {
    const municipio = scope.adminMunicipalityId;
    if (!municipio) return or(eq(t.createdByUserId, scope.userId), eq(t.assignedToUserId, scope.userId));
    const gente = genteDelMunicipio(municipio);
    return or(
      eq(t.municipalityId, municipio),
      sql`${t.createdByUserId} IN (${gente})`,
      sql`${t.assignedToUserId} IN (${gente})`,
      sql`${t.assignedTeamId} IN (SELECT teq.id FROM teams teq WHERE teq.municipality_id = ${municipio})`
    );
  }

  const personas = scope.allowedUserIds ?? [];
  // Sin alcance (sesión de alguien dado de baja): nada.
  if (personas.length === 0) return sql`false`;

  return or(
    inArray(t.createdByUserId, personas),
    inArray(t.assignedToUserId, personas),
    scope.teamIds.length > 0 ? inArray(t.assignedTeamId, scope.teamIds) : undefined
  );
}

/**
 * Qué incidencias puede CAMBIAR un alcance (estado, datos, asignación, archivo): la misma regla que
 * `puedeSobreIncidencia` (permisos-incidencias), en SQL, para la Gestión y las acciones en bloque.
 *
 * Ver no basta: el capturista ve lo de sus compañeros de brigada, pero no lo trabaja. Con la condición
 * de visibilidad, además, un líder cambiaba el estado de lo que levantó otro líder de su coordinación,
 * o su propia dirección, cuando los compañeros de coordinación todavía se veían (encontrado en el
 * simulacro de evento; desde el 2026-09-25 ya no se ven).
 * - Administración: lo que ve (el maestro, todo).
 * - El resto: lo que levantó o tiene asignado él o alguien bajo su mando, y lo asignado a sus equipos.
 */
export function incidenciasQuePuedeTrabajar(scope: UserNetworkScope): SQL | undefined {
  if (scope.isAdmin) return incidentScopeCondition(scope);
  const t = schema.eventReports;
  const mando = scope.commandUserIds ?? [];
  if (mando.length === 0) return sql`false`;
  return or(
    inArray(t.createdByUserId, mando),
    inArray(t.assignedToUserId, mando),
    scope.teamIds.length > 0 ? inArray(t.assignedTeamId, scope.teamIds) : undefined
  );
}

/** La misma regla para SQL escrito a mano sobre `event_reports` con el alias dado. */
export function sqlCondicionIncidencias(scope: UserNetworkScope, alias: string): SQL {
  if (scope.isMaster) return sql`true`;
  if (!/^[a-z_][a-z0-9_]*$/i.test(alias)) throw new Error(`Alias de tabla inválido: ${alias}`);
  const t = sql.raw(alias);

  if (scope.isAdmin) {
    const municipio = scope.adminMunicipalityId;
    if (!municipio) {
      return sql`(${t}.created_by_user_id = ${scope.userId}::uuid OR ${t}.assigned_to_user_id = ${scope.userId}::uuid)`;
    }
    const gente = genteDelMunicipio(municipio);
    return sql`(${t}.municipality_id = ${municipio}::uuid OR ${t}.created_by_user_id IN (${gente})
      OR ${t}.assigned_to_user_id IN (${gente})
      OR ${t}.assigned_team_id IN (SELECT teq.id FROM teams teq WHERE teq.municipality_id = ${municipio}::uuid))`;
  }

  const personas = scope.allowedUserIds ?? [];
  if (personas.length === 0) return sql`false`;

  const lista = (ids: string[]) => sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `);
  const porEquipo = scope.teamIds.length > 0 ? sql` OR ${t}.assigned_team_id IN (${lista(scope.teamIds)})` : sql``;
  return sql`(${t}.created_by_user_id IN (${lista(personas)}) OR ${t}.assigned_to_user_id IN (${lista(personas)})${porEquipo})`;
}
