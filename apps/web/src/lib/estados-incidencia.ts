/**
 * Catálogo único de estados de una incidencia.
 *
 * Mismo motivo que el de categorías: los estados estaban escritos a mano en
 * cada pantalla y en cada ruta, y ya se habían desincronizado una vez —el
 * selector ofrecía `in_progress` cuando la restricción de la base no lo
 * admitía—. Aquí se definen una sola vez.
 *
 * El recorrido de una incidencia levantada en campo es:
 *
 *   pendiente → active → in_progress → resolved → archived
 *       └──────────────→ rechazada
 *
 * `active` significa "aceptada, a la espera de que alguien la trabaje". Las
 * incidencias anteriores al flujo de admisión se quedaron ahí, que es su sitio.
 */
export type EstadoIncidencia = {
  label: string;
  /** Frase corta para explicar qué significa, en las pantallas de gestión. */
  ayuda: string;
  color: string;
  bg: string;
  border: string;
  /** Si cuenta como trabajo cerrado: va al historial, no a la bandeja activa. */
  cerrada: boolean;
};

export const ESTADOS_INCIDENCIA: Record<string, EstadoIncidencia> = {
  pendiente:   { label: "Pendiente",   ayuda: "Recién levantada, espera aceptación.", color: "#a16207", bg: "#fefce8", border: "#fde68a", cerrada: false },
  active:      { label: "Aceptada",    ayuda: "Aceptada, lista para trabajarse.",     color: "#b91c1c", bg: "#fef2f2", border: "#fecaca", cerrada: false },
  in_progress: { label: "En proceso",  ayuda: "Alguien la está atendiendo.",          color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe", cerrada: false },
  resolved:    { label: "Resuelta",    ayuda: "Atendida y cerrada.",                  color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", cerrada: true },
  archived:    { label: "Archivada",   ayuda: "Guardada en el historial.",            color: "#475569", bg: "#f8fafc", border: "#e2e8f0", cerrada: true },
  rechazada:   { label: "Rechazada",   ayuda: "Revisada y descartada.",               color: "#7c2d12", bg: "#fff7ed", border: "#fed7aa", cerrada: true }
};

export const CLAVES_ESTADO = Object.keys(ESTADOS_INCIDENCIA);

export function esEstadoValido(valor: unknown): valor is string {
  return typeof valor === "string" && Object.hasOwn(ESTADOS_INCIDENCIA, valor);
}

/** Estados que siguen requiriendo trabajo: los de la bandeja de gestión. */
export const ESTADOS_ABIERTOS = CLAVES_ESTADO.filter((k) => !ESTADOS_INCIDENCIA[k]!.cerrada);

/** Estados ya cerrados: los del historial. */
export const ESTADOS_CERRADOS = CLAVES_ESTADO.filter((k) => ESTADOS_INCIDENCIA[k]!.cerrada);

export const ESTADO_DESCONOCIDO: EstadoIncidencia = {
  label: "Sin estado",
  ayuda: "Estado no reconocido.",
  color: "#64748b",
  bg: "#f8fafc",
  border: "#e2e8f0",
  cerrada: false
};
