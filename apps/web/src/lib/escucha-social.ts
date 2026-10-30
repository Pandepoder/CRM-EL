/**
 * Catálogos de Escucha Social, en un solo sitio para la pantalla y la API.
 *
 * La API guardaba cualquier categoría (en la copia del simulacro hay una «queja») y la pantalla pintaba lo
 * desconocido como «Idea / Propuesta». «Gestión de Servicio Público» no tenía pestaña: «Gestiones
 * Formales» era otra cosa, las aprobadas por administración (auditoría del 2026-10-15, A4).
 */

import { ZONA_HORARIA } from "./actividades";

export const CATEGORIAS_ESCUCHA = [
  { clave: "propuesta", nombre: "Idea o propuesta", plural: "Ideas y propuestas", ayuda: "Algo que proponen los vecinos" },
  { clave: "problematica", nombre: "Problemática de colonia", plural: "Problemáticas", ayuda: "Algo que les afecta y piden atender" },
  { clave: "compromiso", nombre: "Compromiso", plural: "Compromisos", ayuda: "Algo que nos comprometimos a hacer" },
  { clave: "seguimiento", nombre: "Seguimiento", plural: "Seguimientos", ayuda: "Una petición que ya se había anotado" },
  { clave: "gestion", nombre: "Gestión de servicio", plural: "Gestiones", ayuda: "Un trámite ante una dependencia" }
] as const;

export type ClaveDeCategoriaEscucha = (typeof CATEGORIAS_ESCUCHA)[number]["clave"];

export function esCategoriaEscucha(valor: unknown): valor is ClaveDeCategoriaEscucha {
  return typeof valor === "string" && CATEGORIAS_ESCUCHA.some((c) => c.clave === valor);
}

/** El nombre de una categoría; la que no está en el catálogo (registros viejos) se enseña como «Otra: …». */
export function nombreDeCategoriaEscucha(clave: string | null | undefined): string {
  const c = CATEGORIAS_ESCUCHA.find((x) => x.clave === clave);
  if (c) return c.nombre;
  const limpio = (clave ?? "").trim();
  return limpio ? `Otra: ${limpio}` : "Sin categoría";
}

export const ESTADOS_ESCUCHA = [
  { clave: "pendiente", nombre: "Pendiente" },
  { clave: "en_seguimiento", nombre: "En seguimiento" },
  { clave: "cerrado", nombre: "Cerrada" }
] as const;

export type ClaveDeEstadoEscucha = (typeof ESTADOS_ESCUCHA)[number]["clave"];

export function esEstadoEscucha(valor: unknown): valor is ClaveDeEstadoEscucha {
  return typeof valor === "string" && ESTADOS_ESCUCHA.some((e) => e.clave === valor);
}

export function nombreDeEstadoEscucha(clave: string | null | undefined): string {
  return ESTADOS_ESCUCHA.find((e) => e.clave === clave)?.nombre ?? (clave ?? "").replace(/_/g, " ");
}

/** Lo que cabe en las notas de seguimiento (la API ya lo limitaba; la pantalla no lo decía). */
export const LARGO_MAXIMO_NOTAS_ESCUCHA = 4000;

/**
 * Qué decirle a cada quien cuando lo que le cuentan es un problema en la calle (bache, fuga, luminaria):
 * eso es una incidencia, y no todos pueden levantarlas (`requireLiderParaIncidencias`). La pantalla decía
 * «es una incidencia» a todos, también a quien no tiene por dónde levantarla (auditoría, A6).
 *
 * `puedeAvisar`: ya existe «Avisar de una incidencia» para quien no coordina (fase 2 del plan).
 */
export function textoDeProblemaEnLaCalle(puedeCoordinar: boolean, puedeAvisar: boolean): string {
  if (puedeCoordinar) return "Si es un problema en la calle (bache, fuga, luminaria), levántalo como incidencia.";
  if (puedeAvisar) return "Si es un problema en la calle (bache, fuga, luminaria), usa «Avisar de una incidencia» en el botón +.";
  return "Si es un problema en la calle (bache, fuga, luminaria), avísale a tu líder para que lo levante como incidencia.";
}

/** Largos máximos de una petición: los del formulario y los de la API. */
export const LARGO_MAXIMO_TITULO_ESCUCHA = 150;
export const LARGO_MAXIMO_DESCRIPCION_ESCUCHA = 4000;
export const MAXIMO_DE_FOTOS_ESCUCHA = 4;

/** El día de Jalisco de un instante, AAAA-MM-DD (la fecha que el turno propone por omisión es la de hoy). */
export function diaDeJalisco(instante: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA, year: "numeric", month: "2-digit", day: "2-digit" }).format(instante);
}

/**
 * La fecha de un turno, AAAA-MM-DD, como el mediodía de ese día en Jalisco. Guardada como medianoche UTC, en
 * Jalisco se leía el día anterior (se elegía el 17 y la petición decía «16 oct»). `null` si no es una fecha.
 */
export function fechaDeTurno(valor: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  const fecha = new Date(`${valor}T12:00:00-06:00`);
  return Number.isNaN(fecha.getTime()) || diaDeJalisco(fecha) !== valor ? null : fecha;
}

/** Lo que mide como mucho la frase que se toma del texto cuando no se escribe una. */
export const LARGO_DE_TITULO_AUTOMATICO = 80;

/**
 * La frase de una petición cuando no se escribe una (plan de auditoría de menús, §7.2): la primera oración del
 * texto, sin cortar palabras. Escribir dos campos en la calle pasaba el límite de toques; la frase sigue en el
 * formulario, ahora opcional.
 */
export function tituloDesdeTexto(texto: string): string {
  const limpio = texto.replace(/\s+/g, " ").trim();
  const oracion = (limpio.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? limpio).replace(/[.!?]+$/, "").trim() || limpio;
  if (oracion.length <= LARGO_DE_TITULO_AUTOMATICO) return oracion;
  const corte = oracion.slice(0, LARGO_DE_TITULO_AUTOMATICO - 1);
  const espacio = corte.lastIndexOf(" ");
  return `${(espacio > 30 ? corte.slice(0, espacio) : corte).trim()}…`;
}

/**
 * Dependencias que se sugieren al turnar una gestión (D6). Se puede escribir otra: son sugerencias, no una
 * lista cerrada, porque cada municipio llama distinto a sus áreas.
 */
export const DEPENDENCIAS_SUGERIDAS = [
  "SIAPA",
  "Obras Públicas",
  "Alumbrado Público",
  "Aseo Público",
  "Parques y Jardines",
  "Seguridad Pública",
  "Protección Civil",
  "Movilidad",
  "Desarrollo Social",
  "Salud"
] as const;

/**
 * ¿Parece un teléfono? El texto de una petición no va cifrado (los datos del vecino sí, en su ficha): antes de
 * guardar se pregunta si es un teléfono, para ligar al vecino en lugar de escribirlo (§5.2 del plan).
 */
export function pareceTelefono(texto: string): boolean {
  return /(?:\d[\s.-]?){10}/.test(texto);
}

export type VistaDeEscucha = "todas" | "turnadas" | (typeof CATEGORIAS_ESCUCHA)[number]["clave"];

export type FiltrosDePeticiones = {
  /** Una categoría del catálogo, las turnadas a una dependencia, o todas. */
  vista: VistaDeEscucha;
  estado: ClaveDeEstadoEscucha | null;
  /** Solo las que anotó quien mira. */
  mias: boolean;
  pagina: number;
  /** Texto del buscador: viaja en el cuerpo de la consulta, nunca en la dirección. */
  q: string;
};

export const POR_PAGINA_PETICIONES = 30;

const unoDe = (v: unknown): string => {
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === "string" ? s.trim() : typeof s === "number" ? String(s) : "";
};

export function leerFiltrosDePeticiones(fuente: Record<string, unknown>): FiltrosDePeticiones {
  const vista = unoDe(fuente.vista);
  const estado = unoDe(fuente.estado);
  return {
    vista: vista === "turnadas" || esCategoriaEscucha(vista) ? vista : "todas",
    estado: esEstadoEscucha(estado) ? estado : null,
    mias: ["1", "true"].includes(unoDe(fuente.mias)),
    pagina: Math.max(1, Math.min(1000, Math.floor(Number(unoDe(fuente.pagina) || unoDe(fuente.page)) || 1))),
    q: unoDe(fuente.q).slice(0, 80)
  };
}

/** La parte de los filtros que va en la dirección web: nunca el texto del buscador. */
export function direccionDePeticiones(f: FiltrosDePeticiones): string {
  const p = new URLSearchParams();
  if (f.vista !== "todas") p.set("vista", f.vista);
  if (f.estado) p.set("estado", f.estado);
  if (f.mias) p.set("mias", "1");
  if (f.pagina > 1) p.set("page", String(f.pagina));
  const texto = p.toString();
  return texto ? `?${texto}` : "";
}

/**
 * A dónde se turnó una gestión (D6). Las que la versión anterior marcó «Gestión formal aprobada» no tienen
 * dependencia ni fecha: llegan en `null` y la pantalla lo dice así, sin inventar (se leía «31 dic 1969»).
 */
export type TurnoDeGestion = { dependencia: string | null; folio: string | null; fecha: string | null };

/** El turno en una línea: «Turnada a SIAPA · folio F-12». */
export function textoDelTurno(t: TurnoDeGestion): string {
  const destino = t.dependencia ? `Turnada a ${t.dependencia}` : "Turnada (sin dependencia anotada)";
  return t.folio ? `${destino} · folio ${t.folio}` : destino;
}

/** Una petición como la ve la pantalla. Los nombres ya vienen recortados al alcance de quien mira. */
export type FilaDePeticion = {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  estado: string;
  creada: string;
  /** `null`: quien la anotó no está en el alcance de quien mira. */
  autor: string | null;
  esMia: boolean;
  /** El vecino, solo si quien mira puede ver su ficha. */
  vecino: { id: string; nombre: string } | null;
  /** Está ligada a un vecino que quien mira no puede ver: se dice «un vecino». */
  vecinoOculto: boolean;
  lugar: string | null;
  latitud: number | null;
  longitud: number | null;
  fotos: string[];
  notas: string | null;
  turno: TurnoDeGestion | null;
  puedeTrabajar: boolean;
};

export type ResultadoDePeticiones = {
  filas: FilaDePeticion[];
  total: number;
  pagina: number;
  totalPaginas: number;
  pendientes: number;
};

/** Una petición en la ficha del vecino (D10). Las notas, solo si quien mira la ve también en Escucha Social. */
export type PeticionDelVecino = {
  id: string;
  titulo: string;
  categoria: string;
  estado: string;
  creada: string;
  turno: TurnoDeGestion | null;
  notas: string | null;
  /** Quien mira la ve en Escucha Social (puede abrirla ahí). */
  enEscucha: boolean;
};

/** Un punto de la capa «Peticiones» del mapa: sin nombres ni teléfonos (§5.2). */
export type PuntoDePeticion = { id: string; categoria: string; estado: string; latitud: number; longitud: number };
