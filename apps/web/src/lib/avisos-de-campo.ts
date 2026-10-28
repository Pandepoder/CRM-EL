/**
 * «Avisar de una incidencia» (plan de auditoría de menús, D9): capturistas y brigadistas avisan de un problema
 * en la calle. El aviso es una incidencia en `pendiente`, sin equipo ni responsable, que aceptan quienes
 * mandan sobre quien avisa. La regla del servidor está en `POST /api/map/reports` y `motivoSiAvisoPorAceptar`.
 * Sin base de datos: lo usa también la pantalla. La consulta está en `avisos-de-campo-servicio.ts`.
 */

/** El motivo con que queda un aviso que retira quien lo hizo: rechazado, nunca borrado. */
export const MOTIVO_RETIRADO = "Lo retiró quien avisó.";

export const TIPOS_DE_AVISO = [
  { categoria: "bache", nombre: "Bache", titulo: "Bache", emoji: "🕳️" },
  { categoria: "fuga_agua", nombre: "Fuga de agua", titulo: "Fuga de agua", emoji: "💧" },
  { categoria: "alumbrado", nombre: "Luminaria", titulo: "Luminaria apagada", emoji: "💡" },
  { categoria: "basura", nombre: "Basura", titulo: "Basura acumulada", emoji: "🗑️" },
  { categoria: "otro", nombre: "Otra cosa", titulo: "Problema en la calle", emoji: "📍" }
] as const;

export type CategoriaDeAviso = (typeof TIPOS_DE_AVISO)[number]["categoria"];

/** El título del aviso: el tipo y, si se sabe, la colonia. Quien avisa no tiene que escribirlo. */
export function tituloDeAviso(categoria: string, colonia?: string | null): string {
  const tipo = TIPOS_DE_AVISO.find((t) => t.categoria === categoria) ?? TIPOS_DE_AVISO[TIPOS_DE_AVISO.length - 1]!;
  const donde = (colonia ?? "").trim();
  return (donde ? `${tipo.titulo} en ${donde}` : tipo.titulo).slice(0, 150);
}

export type EstadoDeAviso = { texto: string; tono: "espera" | "bien" | "neutro" };

/** En qué va un aviso, dicho para quien avisó. */
export function estadoDeAviso(estado: string, motivo: string | null): EstadoDeAviso {
  switch (estado) {
    case "pendiente":
      return { texto: "Por aceptar", tono: "espera" };
    case "active":
      return { texto: "Aceptado", tono: "bien" };
    case "in_progress":
      return { texto: "En proceso", tono: "bien" };
    case "resolved":
    case "archived":
      return { texto: "Atendido", tono: "bien" };
    case "rechazada":
      return { texto: motivo === MOTIVO_RETIRADO ? "Lo retiraste" : "Revisado y descartado", tono: "neutro" };
    default:
      return { texto: estado, tono: "neutro" };
  }
}

export type MiAviso = {
  id: string;
  titulo: string;
  categoria: string;
  estado: string;
  motivo: string | null;
  creado: string;
};
