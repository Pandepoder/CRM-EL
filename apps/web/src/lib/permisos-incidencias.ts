import { schema } from "@tonala/shared/database";
import { and, eq } from "drizzle-orm";

import { getDatabaseClient } from "@/lib/db-client";
import { esUuid } from "@/lib/ids";
import { resolveUserNetworkScope, type UserNetworkScope } from "@/lib/network-hierarchy";
import { incidentScopeCondition } from "@/lib/incident-visibility";

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
  /** Hace falta para la regla de los avisos «por aceptar» (`motivoSiAvisoPorAceptar`). */
  status?: string | null;
  assignedToUserId: string | null;
  assignedTeamId: string | null;
  description: string;
  /** Con valor, es una actividad de la bitácora que comparte tabla con las incidencias. */
  activityTypeId?: string | null;
};

/**
 * Las actividades de la bitácora también salen en el mapa, pero allí no se cierran ni se borran:
 * cerrarlas pide un resultado y deja historial, y borrarlas se llevaría su historial y sus
 * etiquetas (van en cascada). Desde el mapa se cerraban sin resultado y se borraban de verdad.
 */
export const MOTIVO_ES_ACTIVIDAD =
  "Es una actividad de la bitácora: se cierra, cancela o archiva desde la Agenda.";

export type ContextoIncidencia = {
  incidencia: Incidencia | null;
  esAdmin: boolean;
  equipos: string[];
  /**
   * Quien actúa y quienes están bajo su mando (`commandUserIds`). Sus compañeros de un equipo donde
   * solo es integrante no: el capturista los ve, pero no trabaja lo suyo.
   */
  personas: string[];
  /** Coordina: administración o quien lidera un equipo (`isLeader`; dirección siempre cuenta). */
  coordina: boolean;
};

/**
 * Administración pasa por encima de la propiedad y del equipo, pero solo en lo que ve (etapa 6): el
 * maestro, en todo; un administrador municipal, en las incidencias de su municipio y de su gente.
 * Antes bastaba el rol (`roles.includes("admin")`), y con administradores por municipio eso dejaba a
 * cualquiera cerrar o borrar las de otro municipio conociendo su identificador.
 *
 * Una incidencia que la persona no ve se trata como inexistente (404), igual que una ficha de
 * ciudadano: responder 403 confirmaba que el identificador existe.
 */
export async function cargarContextoIncidencia(id: string, actorId: string): Promise<ContextoIncidencia> {
  // Un id que no es UUID no existe; sin esto la base lo rechazaba y /api/map/reports/[id]
  // respondía 500. Ver `ids.ts`.
  if (!esUuid(id)) return { incidencia: null, esAdmin: false, equipos: [], personas: [], coordina: false };
  const db = getDatabaseClient();
  const filas = await db
    .select({
      createdByUserId: schema.eventReports.createdByUserId,
      assignedToUserId: schema.eventReports.assignedToUserId,
      assignedTeamId: schema.eventReports.assignedTeamId,
      description: schema.eventReports.description,
      activityTypeId: schema.eventReports.activityTypeId,
      status: schema.eventReports.status
    })
    .from(schema.eventReports)
    .where(eq(schema.eventReports.id, id))
    .limit(1);

  const incidencia = filas[0] ?? null;
  if (!incidencia) return { incidencia: null, esAdmin: false, equipos: [], personas: [], coordina: false };

  const alcance = await resolveUserNetworkScope(actorId);
  if (!(await laVe(alcance, id))) return { incidencia: null, esAdmin: false, equipos: [], personas: [], coordina: false };
  return {
    incidencia,
    esAdmin: alcance.isAdmin,
    equipos: alcance.teamIds,
    personas: alcance.commandUserIds ?? [],
    coordina: alcance.isAdmin || alcance.isLeader
  };
}

/** ¿Está esta incidencia en lo que ve el alcance? */
export async function laVe(alcance: UserNetworkScope, id: string): Promise<boolean> {
  if (alcance.isMaster) return true;
  const [fila] = await getDatabaseClient()
    .select({ id: schema.eventReports.id })
    .from(schema.eventReports)
    .where(and(eq(schema.eventReports.id, id), incidentScopeCondition(alcance)))
    .limit(1);
  return Boolean(fila);
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
  //
  // `personasDelActor` es su mando, no todo lo que ve: con la lista de lo que ve, un líder cerraba la
  // incidencia de otro líder de su coordinación, o la de su propia dirección, solo por ser compañeros
  // de equipo (encontrado en el simulacro de evento). La misma regla en SQL: `incidenciasQuePuedeTrabajar`.
  return personasDelActor.includes(incidencia.createdByUserId)
    || Boolean(incidencia.assignedToUserId && personasDelActor.includes(incidencia.assignedToUserId));
}

/**
 * Avisos de campo (plan de auditoría de menús, D9): capturistas y brigadistas avisan de un bache o una
 * fuga, y el aviso entra «por aceptar», sin equipo ni responsable: lo ven y lo aceptan quienes mandan sobre
 * quien avisó (su líder, su dirección, la administración de su municipio), porque está en su mando. Sus
 * compañeros no lo tocan: no está asignado a la brigada.
 *
 * Quien avisó y no coordina no le cambia el estado —sin esta regla se aceptaría a sí mismo, porque el autor
 * puede actualizar lo que levanta—: lo único que puede es retirarlo mientras esté «por aceptar», y queda como
 * rechazado. Tampoco lo reabre después. Si quien coordina se lo asigna, ya lo trabaja como cualquier
 * asignado. Solo toca a quien avisó: lo demás sigue con las reglas de siempre.
 *
 * Vale para todo camino que cambie el estado: el mapa (`PATCH /api/map/reports/[id]`) y la Agenda
 * (`actividades-servicio.ts`). Las actividades de la Agenda nunca están en `pendiente`.
 */
export const MOTIVO_AVISO_POR_ACEPTAR = "Este aviso espera a que quien coordina tu brigada lo acepte. Mientras tanto solo puedes retirarlo.";
export const MOTIVO_AVISO_REVISADO = "Tu aviso ya lo revisó quien coordina tu brigada: si hay que cambiarle algo, díselo.";

/**
 * ¿Es un aviso que quien avisó no puede mover? Lo levantó él, no coordina y no se lo asignaron para
 * trabajarlo (a él o a su equipo) ya aceptado.
 */
export function esAvisoDeQuienNoCoordina(
  incidencia: Pick<Incidencia, "status" | "createdByUserId" | "assignedToUserId" | "assignedTeamId">,
  actorId: string,
  coordina: boolean,
  equiposDelActor: readonly string[] = []
): boolean {
  if (coordina || incidencia.createdByUserId !== actorId) return false;
  const asignadaAEl = incidencia.assignedToUserId === actorId || Boolean(incidencia.assignedTeamId && equiposDelActor.includes(incidencia.assignedTeamId));
  return !(asignadaAEl && incidencia.status !== "pendiente");
}
export { MOTIVO_RETIRADO } from "@/lib/avisos-de-campo";

export function motivoSiAvisoPorAceptar(
  incidencia: Pick<Incidencia, "status" | "createdByUserId" | "assignedToUserId" | "assignedTeamId">,
  actorId: string,
  coordina: boolean,
  nuevoEstado: string | undefined,
  equiposDelActor: readonly string[] = []
): string | null {
  if (nuevoEstado === undefined || nuevoEstado === incidencia.status) return null;
  if (!esAvisoDeQuienNoCoordina(incidencia, actorId, coordina, equiposDelActor)) return null;
  // Retirarlo mientras nadie lo acepta: queda rechazado.
  if (incidencia.status === "pendiente" && nuevoEstado === "rechazada") return null;
  return incidencia.status === "pendiente" ? MOTIVO_AVISO_POR_ACEPTAR : MOTIVO_AVISO_REVISADO;
}

/**
 * Un aviso no se borra: se retira y queda como rechazado. Antes de los avisos, quien no coordina no era
 * autor de ninguna incidencia, así que esto no le quita nada que pudiera hacer.
 */
export const MOTIVO_BORRAR_AVISO = "Un aviso no se borra: retíralo y queda como rechazado.";

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
  // El maestro asigna a quien sea; un administrador municipal, a su gente y sus equipos, que son su
  // alcance (etapa 6).
  if (alcance.isMaster) return null;

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
