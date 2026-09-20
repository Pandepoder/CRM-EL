import { schema } from "@tonala/shared/database";
import { eq } from "drizzle-orm";

import { getDatabaseClient } from "@/lib/db-client";
import { resolveUserNetworkScope, type UserNetworkScope } from "@/lib/network-hierarchy";

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
 * Se puede *actualizar* si la incidencia es tuya, si te la asignaron, si está asignada a un
 * equipo del que formas parte, si la levantó o la atiende alguien de tu alcance —tu gente y la
 * de las brigadas bajo tu mando—, o si eres administración. Trabajar la incidencia es lo que se
 * espera de la brigada asignada y de quien la coordina.
 *
 * *Borrar* es más estrecho: solo quien la creó y administración. Resolver una
 * incidencia es trabajo de campo; eliminarla del historial no lo es.
 */

/**
 * El catálogo de estados vive en lib/estados-incidencia. Aquí había una copia escrita a mano
 * que se quedó en cuatro estados cuando la restricción de la base ya admitía seis: por las
 * rutas que leían esta copia no se podía ni admitir ni rechazar una incidencia. Se reexporta
 * con el nombre que ya usan para no volver a partirlo en dos.
 */
export { CLAVES_ESTADO as ESTADOS_INCIDENCIA, esEstadoValido } from "@/lib/estados-incidencia";

/**
 * Una clave del catálogo. Queda como texto porque el catálogo está tipado como
 * `Record<string, …>`; quien escribe el estado lo valida antes con `esEstadoValido`.
 */
export type EstadoIncidencia = string;

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
  /** Personas del alcance de quien actúa: él, sus compañeros y quienes están bajo su mando. */
  personas: string[];
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
  if (!incidencia) return { incidencia: null, esAdmin: false, equipos: [], personas: [] };

  const esAdmin = esAdministracion(roles);
  const alcance = esAdmin ? null : await resolveUserNetworkScope(actorId);
  return {
    incidencia,
    esAdmin,
    equipos: alcance?.teamIds ?? [],
    personas: alcance?.allowedUserIds ?? []
  };
}

export function puedeSobreIncidencia(
  accion: "actualizar" | "borrar",
  incidencia: Incidencia,
  actorId: string,
  esAdmin: boolean,
  equiposDelActor: readonly string[],
  personasDelActor: readonly string[] = []
): boolean {
  if (esAdmin) return true;
  if (incidencia.createdByUserId === actorId) return true;
  if (accion === "borrar") return false;
  if (incidencia.assignedToUserId === actorId) return true;
  if (incidencia.assignedTeamId && equiposDelActor.includes(incidencia.assignedTeamId)) return true;
  // Quien manda también trabaja lo de su gente: una dirección tenía que poder aceptar o cerrar
  // desde el mapa la incidencia que levantó uno de sus líderes, igual que desde el Centro de
  // Gestión. Antes solo valía ser el autor, el asignado o del equipo asignado, así que las dos
  // pantallas decían cosas distintas sobre la misma incidencia.
  return personasDelActor.includes(incidencia.createdByUserId)
    || Boolean(incidencia.assignedToUserId && personasDelActor.includes(incidencia.assignedToUserId));
}

export const MOTIVO_ACTUALIZAR =
  "No puedes modificar una incidencia que no es tuya ni está asignada a ti o a tu equipo.";
export const MOTIVO_BORRAR =
  "Solo quien creó la incidencia o la administración pueden eliminarla.";

/**
 * Hacia dónde se puede asignar una incidencia.
 *
 * Al levantarla y al reasignarla se comprobaba quién asigna, pero no a quién: bastaba conocer
 * un identificador para mandarle trabajo a una brigada de otra dirección, y encima la
 * incidencia desaparecía de la vista de quien la mandó, porque al asignarla fuera de su alcance
 * dejaba de verla. Administración no tiene ese límite.
 *
 * Quitar la asignación (mandar vacío o nulo) siempre se puede: solo se mira el destino.
 * Devuelve el motivo en claro si el destino no vale, o null si la asignación es legítima.
 */
export function motivoAsignacionFueraDeAlcance(
  alcance: UserNetworkScope,
  destino: { assignedToUserId?: unknown; assignedTeamId?: unknown }
): string | null {
  if (alcance.isGlobal) return null;

  const persona = typeof destino.assignedToUserId === "string" ? destino.assignedToUserId : "";
  const equipo = typeof destino.assignedTeamId === "string" ? destino.assignedTeamId : "";

  if (persona && !(alcance.allowedUserIds ?? []).includes(persona)) {
    return "Solo puedes asignar la incidencia a alguien de tu estructura.";
  }
  if (equipo && !alcance.teamIds.includes(equipo)) {
    return "Solo puedes asignar la incidencia a uno de tus equipos.";
  }
  return null;
}
