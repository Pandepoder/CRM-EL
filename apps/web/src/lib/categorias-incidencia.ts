/**
 * Catálogo único de categorías de incidencia.
 *
 * Antes había cuatro listas distintas que no coincidían entre sí: la de la base
 * de datos (14 categorías), la que el mapa sabía dibujar (7), la del formulario
 * de Alta de Reportes (8) y la del formulario del propio mapa (8). El resultado,
 * medido creando una incidencia de cada tipo:
 *
 *   - `bacheo` y `otro` daban error 500 al guardar, porque la base solo acepta
 *     `bache` y no conoce `otro`. El reporte se perdía.
 *   - `alumbrado`, `fuga_agua`, `basura` y `seguridad` se guardaban bien pero el
 *     mapa no sabía pintarlas, así que desaparecían: el filtro por categoría las
 *     descartaba en silencio.
 *   - Solo `brigada` y `emergencia` funcionaban de principio a fin.
 *
 * Seis de cada ocho reportes se perdían o se volvían invisibles. Este archivo es
 * ahora el único sitio donde se define una categoría: la base, los formularios y
 * el mapa parten de aquí, de modo que no puedan volver a separarse.
 *
 * Las claves coinciden exactamente con la restricción `event_reports_category_check`.
 */

const svg = (contenido: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${contenido}</svg>`;

export const ICONOS_CATEGORIA = {
  TriangleAlert: svg(`<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>`),
  AlertCircle: svg(`<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>`),
  Users: svg(`<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`),
  Megaphone: svg(`<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>`),
  Wrench: svg(`<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>`),
  Eye: svg(`<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>`),
  MapPin: svg(`<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>`),
  Trash: svg(`<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>`),
  // Iconos nuevos, para las categorías que existían en la base y no se podían dibujar.
  Cono: svg(`<path d="M12 2 4 20h16L12 2z"/><path d="M8.5 12h7"/><path d="M6.5 16h11"/>`),
  Foco: svg(`<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>`),
  Gota: svg(`<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>`),
  Ola: svg(`<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 1.3 0 1.9-.5 2.5-1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 1.3 0 1.9-.5 2.5-1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 1.3 0 1.9-.5 2.5-1"/>`),
  Escudo: svg(`<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>`),
  Bandera: svg(`<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>`)
} as const;

export type CategoriaIncidencia = {
  label: string;
  svg: string;
  color: string;
  bg: string;
  border: string;
  /** Si aparece en los formularios de alta. Todas lo hacen salvo las heredadas. */
  enFormulario: boolean;
};

export const CATEGORIAS_INCIDENCIA: Record<string, CategoriaIncidencia> = {
  emergencia:   { label: "Emergencia Crítica",     svg: ICONOS_CATEGORIA.TriangleAlert, color: "#ef4444", bg: "#fef2f2", border: "#fecaca", enFormulario: true },
  seguridad:    { label: "Seguridad Ciudadana",    svg: ICONOS_CATEGORIA.Escudo,        color: "#b91c1c", bg: "#fef2f2", border: "#fecaca", enFormulario: true },
  bache:        { label: "Bacheo y Pavimento",     svg: ICONOS_CATEGORIA.Cono,          color: "#a16207", bg: "#fefce8", border: "#fef08a", enFormulario: true },
  alumbrado:    { label: "Alumbrado Público",      svg: ICONOS_CATEGORIA.Foco,          color: "#ca8a04", bg: "#fefce8", border: "#fde68a", enFormulario: true },
  fuga_agua:    { label: "Fuga de Agua / Drenaje", svg: ICONOS_CATEGORIA.Gota,          color: "#0284c7", bg: "#f0f9ff", border: "#bae6fd", enFormulario: true },
  inundacion:   { label: "Inundación",             svg: ICONOS_CATEGORIA.Ola,           color: "#0369a1", bg: "#f0f9ff", border: "#bae6fd", enFormulario: true },
  basura:       { label: "Recolección de Basura",  svg: ICONOS_CATEGORIA.Trash,         color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", enFormulario: true },
  servicios:    { label: "Falla de Servicios",     svg: ICONOS_CATEGORIA.Wrench,        color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe", enFormulario: true },
  incidencia:   { label: "Incidencia Territorial", svg: ICONOS_CATEGORIA.AlertCircle,   color: "#f59e0b", bg: "#fffbeb", border: "#fde68a", enFormulario: true },
  brigada:      { label: "Solicitud de Brigada",   svg: ICONOS_CATEGORIA.MapPin,        color: "#ec4899", bg: "#fdf2f8", border: "#fbcfe8", enFormulario: true },
  propaganda:   { label: "Propaganda / Lona",      svg: ICONOS_CATEGORIA.Megaphone,     color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe", enFormulario: true },
  lona_danada:  { label: "Lona Dañada",            svg: ICONOS_CATEGORIA.Bandera,       color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe", enFormulario: true },
  mitin:        { label: "Mitin / Evento",         svg: ICONOS_CATEGORIA.Users,         color: "#10b981", bg: "#f0fdf4", border: "#bbf7d0", enFormulario: true },
  sospechoso:   { label: "Actividad Sospechosa",   svg: ICONOS_CATEGORIA.Eye,           color: "#1f2937", bg: "#f8fafc", border: "#e2e8f0", enFormulario: true },
  // En campo aparece lo que no encaja en ninguna de las catorce anteriores. El
  // formulario ya la ofrecía, pero la base no la admitía: elegirla daba error
  // 500 y el reporte se perdía. Quien reporta escribe el detalle en la
  // descripción.
  otro:         { label: "Otro (especificar)",     svg: ICONOS_CATEGORIA.AlertCircle,   color: "#475569", bg: "#f8fafc", border: "#cbd5e1", enFormulario: true }
};

/** Las mismas claves que admite `event_reports_category_check`. */
export const CLAVES_CATEGORIA = Object.keys(CATEGORIAS_INCIDENCIA);

export function esCategoriaValida(valor: unknown): valor is string {
  return typeof valor === "string" && Object.hasOwn(CATEGORIAS_INCIDENCIA, valor);
}

/** Opciones para los desplegables de los formularios de alta. */
export const OPCIONES_CATEGORIA = Object.entries(CATEGORIAS_INCIDENCIA)
  .filter(([, c]) => c.enFormulario)
  .map(([value, c]) => ({ value, label: c.label }));

/**
 * Categoría a mostrar cuando una incidencia guardada trae algo que no está en el
 * catálogo. No debería ocurrir —la base lo impide— pero si ocurriera, más vale
 * dibujarla de forma neutra que hacerla desaparecer del mapa sin avisar.
 */
export const CATEGORIA_DESCONOCIDA: CategoriaIncidencia = {
  label: "Sin clasificar",
  svg: ICONOS_CATEGORIA.AlertCircle,
  color: "#64748b",
  bg: "#f8fafc",
  border: "#e2e8f0",
  enFormulario: false
};
