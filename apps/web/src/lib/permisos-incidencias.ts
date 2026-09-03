import { schema } from "@tonala/shared/database";
import { eq } from "drizzle-orm";

import { getDatabaseClient } from "@/lib/db-client";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";

/**
 * Quién puede tocar una incidencia. Regla única para todas las rutas.
 *
 * Existían dos caminos para editarlas y borrarlas —`/api/equipo/tareas/[id]` y
 * `/api/map/reports/[id]`— con reglas distintas. El segundo solo pedía el
 * permiso de tablero, sin comprobar propiedad ni equipo, así que se saltaba por
 * completo lo que decidía el primero. Al acotar Dirección a sus equipos la
 * contradicción quedó a la vista: no veía las incidencias de otras brigadas en
 * el mapa, pero podía borrarlas conociendo su identificador.
 *
 * Se puede *actualizar* si la incidencia es tuya, si te la asignaron, si está
 * asignada a un equipo del que formas parte, o si eres administración. Trabajar
 * la incidencia es lo que se espera de la brigada asignada.
 *
 * *Borrar* es más estrecho: solo quien la creó y administración. Resolver una
 * incidencia es trabajo de campo; eliminarla del historial no lo es.
 */

/** Estados admitidos por la restricción `event_reports_status_check`. */
export const ESTADOS_INCIDENCIA = ["active", "in_progress", "resolved", "archived"] as const;
export type EstadoIncidencia = (typeof ESTADOS_INCIDENCIA)[number];

export function esEstadoValido(valor: unknown): valor is EstadoIncidencia {
  return typeof valor === "string" && (ESTADOS_INCIDENCIA as readonly string[]).includes(valor);
}

export type Incidencia = {
  createdByUserId: string;
  assignedToUserId: string | null;
  assignedTeamId: string | null;
  description: string;
};

export type ContextoIncidencia = {
  incidencia: Incidencia | null;
  esAdmin: boolean;
  equipos: string[];
};

/** Solo administración pasa por encima de la propiedad y del equipo. */
export function esAdministracion(roles: readonly string[]): boolean {
  return roles.includes("admin");
}

export async function cargarContextoIncidencia(
  id: string,
  actorId: string,
  roles: readonly string[]
): Promise<ContextoIncidencia> {
  const db = getDatabaseClient();
  const filas = await db
    .select({
      createdByUserId: schema.eventReports.createdByUserId,
      assignedToUserId: schema.eventReports.assignedToUserId,
      assignedTeamId: schema.eventReports.assignedTeamId,
      description: schema.eventReports.description
    })
    .from(schema.eventReports)
    .where(eq(schema.eventReports.id, id))
    .limit(1);

  const incidencia = filas[0] ?? null;
  if (!incidencia) return { incidencia: null, esAdmin: false, equipos: [] };

  const esAdmin = esAdministracion(roles);
  const equipos = esAdmin ? [] : (await resolveUserNetworkScope(actorId)).teamIds;
  return { incidencia, esAdmin, equipos };
}

export function puedeSobreIncidencia(
  accion: "actualizar" | "borrar",
  incidencia: Incidencia,
  actorId: string,
  esAdmin: boolean,
  equiposDelActor: readonly string[]
): boolean {
  if (esAdmin) return true;
  if (incidencia.createdByUserId === actorId) return true;
  if (accion === "borrar") return false;
  if (incidencia.assignedToUserId === actorId) return true;
  return Boolean(incidencia.assignedTeamId && equiposDelActor.includes(incidencia.assignedTeamId));
}

export const MOTIVO_ACTUALIZAR =
  "No puedes modificar una incidencia que no es tuya ni está asignada a ti o a tu equipo.";
export const MOTIVO_BORRAR =
  "Solo quien creó la incidencia o la administración pueden eliminarla.";
