import { Building2, Map, Moon, Satellite } from "lucide-react";

import { CATEGORIAS_INCIDENCIA } from "@/lib/categorias-incidencia";

import type { AtlasSeccion, BloqueElectoral, Resultado } from "./tipos";

// Iconos de Lucide como SVG en texto: los marcadores de Leaflet son HTML, no componentes.
export const SVGS = {
  AlertCircle: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>`,
  MapPin: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>`,
  Trash: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
  User: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
};

/** Marca compacta de militancia PAN confirmada. */
export const PAN_BADGE_HTML = `<span style="display:inline-flex; align-items:center; justify-content:center; width:1.35em; height:1.35em; border-radius:50%; background:#2563eb; flex-shrink:0;"><span style="color:#fff; font-size:0.7em; font-weight:900; line-height:1;">M</span></span>`;

export const CATEGORIES = CATEGORIAS_INCIDENCIA;

/** La categoría del catálogo, o una neutra si llega una que el catálogo no conoce. */
export function categoriaDe(clave: string) {
  return CATEGORIES[clave] ?? { label: clave, svg: SVGS.AlertCircle, color: "#64748b", bg: "#f8fafc" };
}

export const MUNICIPALITY_COLORS: Record<string, { stroke: string; fill: string }> = {
  "Tonalá": { stroke: "#4f46e5", fill: "#6366f1" },
  "Guadalajara": { stroke: "#7e22ce", fill: "#a855f7" },
  "San Pedro Tlaquepaque": { stroke: "#d97706", fill: "#f59e0b" },
  "Zapopan": { stroke: "#059669", fill: "#10b981" },
  "Tlajomulco de Zúñiga": { stroke: "#0891b2", fill: "#06b6d4" },
  "El Salto": { stroke: "#e11d48", fill: "#f43f5e" },
  "Zapotlanejo": { stroke: "#475569", fill: "#64748b" },
  "Ixtlahuacán de los Membrillos": { stroke: "#0d9488", fill: "#14b8a6" },
  "Juanacatlán": { stroke: "#4338ca", fill: "#818cf8" },
};

export const TILE_STYLES = {
  osm: {
    name: "OpenStreetMap",
    corto: "Calles",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    icon: Building2
  },
  esriStreet: {
    name: "Calles HD (Color)",
    corto: "Calles HD",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors",
    icon: Map
  },
  satellite: {
    name: "Satélite HD",
    corto: "Satélite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri, Maxar, Earthstar Geographics",
    icon: Satellite
  },
  dark: {
    name: "Táctico Nocturno",
    corto: "Noche",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors",
    icon: Moon
  }
} as const;

export type EstiloDeMapa = keyof typeof TILE_STYLES;

/**
 * Bloques del atlas. Son los del documento impreso, no partidos sueltos: "PAN y socios" y
 * "Morena y socios" agrupan coaliciones. Los colores son los de identidad de cada fuerza,
 * que es como la campaña los lee de un vistazo.
 */
export const BLOQUES: Record<BloqueElectoral, { etiqueta: string; corto: string; color: string; borde: string }> = {
  pan: { etiqueta: "PAN y socios", corto: "PAN", color: "#2563eb", borde: "#1d4ed8" },
  morena: { etiqueta: "Morena y socios", corto: "Morena", color: "#9f1239", borde: "#881337" },
  mc: { etiqueta: "MC", corto: "MC", color: "#ea580c", borde: "#c2410c" }
};

/** Gris para las secciones sin ficha: "no hay dato" no es lo mismo que "empate". */
export const SIN_ATLAS = { color: "#94a3b8", borde: "#64748b" };

export function calcularResultado(atlas: AtlasSeccion): Resultado {
  const orden = (Object.keys(BLOQUES) as BloqueElectoral[])
    .map((clave) => ({ clave, votos: atlas.votes[clave] }))
    .sort((a, b) => b.votos - a.votos);

  const primero = orden[0]!;
  const segundo = orden[1]!;
  const total = orden.reduce((suma, x) => suma + x.votos, 0);

  return {
    ganador: primero.clave,
    votosGanador: primero.votos,
    total,
    margen: total > 0 ? ((primero.votos - segundo.votos) / total) * 100 : 0,
    empate: primero.votos === segundo.votos
  };
}

/**
 * Opacidad según el margen: cuanto más holgada la ventaja, más sólido el color.
 *
 * Sin esto, un bastión con 40 puntos de ventaja y una sección ganada por 20 votos se veían
 * idénticos, que es justo la distinción que la campaña necesita para decidir dónde empujar.
 */
export function opacidadPorMargen(margen: number): number {
  if (margen >= 30) return 0.62;
  if (margen >= 15) return 0.48;
  if (margen >= 5) return 0.34;
  return 0.22;
}
