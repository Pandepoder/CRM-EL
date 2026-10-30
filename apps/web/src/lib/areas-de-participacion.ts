/**
 * Las áreas en que un ciudadano quiere participar (`contacts.interests`), con su nombre para la pantalla.
 *
 * Los dos formularios de alta guardan una clave corta («Vecinal», «Deporte»), y el Directorio y Análisis la
 * enseñaban tal cual. Lo importado, en cambio, trae listas con comas («Programas sociales, Cultura»), que
 * Análisis contaba como un área aparte: la gráfica no decía qué área interesa más (auditoría del
 * 2026-10-15, A2). Aquí está la lista una sola vez; lo guardado no cambia.
 */

export const AREAS_DE_PARTICIPACION = [
  { clave: "General", nombre: "Participación general" },
  { clave: "Vecinal", nombre: "Comité vecinal y mejoras" },
  { clave: "Deporte", nombre: "Deporte y juventud" },
  { clave: "Cultura", nombre: "Cultura y tradiciones" },
  { clave: "Comercio", nombre: "Comercio y emprendimiento" },
  { clave: "Social", nombre: "Apoyo social y familias" }
] as const;

export type ClaveDeArea = (typeof AREAS_DE_PARTICIPACION)[number]["clave"];

const normal = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const POR_CLAVE = new Map<string, string>(AREAS_DE_PARTICIPACION.map((a) => [normal(a.clave), a.nombre]));

/** El nombre de una sola área; lo que no está en el catálogo se enseña como se capturó. */
export function etiquetaDeArea(texto: string | null | undefined): string {
  const limpio = (texto ?? "").replace(/\s+/g, " ").trim();
  if (!limpio) return "";
  return POR_CLAVE.get(normal(limpio)) ?? limpio;
}

/** Cada área de un texto, una sola vez y con su nombre: «Vecinal, cultura , Vecinal» → dos áreas. */
export function areasDe(texto: string | null | undefined): string[] {
  const vistas = new Set<string>();
  const salida: string[] = [];
  for (const parte of (texto ?? "").split(/[,;]/)) {
    const etiqueta = etiquetaDeArea(parte);
    if (!etiqueta) continue;
    const clave = normal(etiqueta);
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    salida.push(etiqueta);
  }
  return salida;
}
