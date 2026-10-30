/**
 * Las palabras con que el sistema le habla a la gente (plan de experiencia sencilla, agente 2).
 *
 * La misma persona veía cuatro nombres para su nivel: «Brigada Territorial», `CONEXION`, «promovido a
 * ENLACE»… (L3). Los valores internos (`conexion`, `enlace`, `coordinacion`) se quedan en la base; a la
 * vista, siempre estas palabras.
 */
const NIVELES: Readonly<Record<string, string>> = {
  conexion: "Integrante",
  enlace: "Líder de equipo",
  coordinacion: "Coordinación"
};

export function nombreDelNivel(nivel: string | null | undefined): string {
  return NIVELES[nivel ?? "conexion"] ?? "Integrante";
}
