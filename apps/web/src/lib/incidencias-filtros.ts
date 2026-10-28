/**
 * Filtros de la pantalla de Incidencias (plan de auditoría de menús, fase 2), sin base de datos: los usan la
 * página, la pantalla y la ruta de consulta.
 *
 * Lo que va en la dirección web son claves e ids (vista, categoría, sección, responsable, antigüedad,
 * página): se pueden compartir y el botón «atrás» los respeta. El texto del buscador NO va en la dirección
 * (privacidad, §5.3 del plan): puede llevar el nombre de una persona, y la dirección queda en el historial del
 * navegador y en los registros del servidor. Viaja en el cuerpo de `POST /api/incidencias/consulta`.
 */

export type VistaDeIncidencias = "atender" | "cerradas" | "todas";

export type FiltrosDeIncidencias = {
  vista: VistaDeIncidencias;
  categoria: string | null;
  seccion: number | null;
  /** `mias`: asignadas a quien mira; `sin`: sin persona ni equipo; un uuid: esa persona (solo del alcance). */
  responsable: string | null;
  /** Abiertas hace más de N días. */
  antiguedad: 7 | 30 | null;
  /** Solo las que esperan que alguien las acepte. */
  porAceptar: boolean;
  /** Solo las que no tienen sección electoral. */
  sinSeccion: boolean;
  pagina: number;
  /** Texto del buscador: nunca en la dirección. */
  q: string;
};

export const POR_PAGINA_INCIDENCIAS = 30;
export const LARGO_MAXIMO_BUSQUEDA_INCIDENCIAS = 80;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const uno = (v: unknown): string => {
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === "string" ? s.trim() : typeof s === "number" ? String(s) : "";
};

/**
 * Los filtros a partir de la dirección (o del cuerpo de la consulta). Lo que no se entiende se ignora: una
 * dirección vieja o escrita a mano no rompe la pantalla.
 */
export function leerFiltrosDeIncidencias(fuente: Record<string, unknown>): FiltrosDeIncidencias {
  const vista = uno(fuente.vista);
  const seccion = Number(uno(fuente.seccion));
  const responsable = uno(fuente.responsable);
  const antiguedad = Number(uno(fuente.antiguedad));
  const categoria = uno(fuente.categoria);
  return {
    vista: vista === "cerradas" || vista === "todas" ? vista : "atender",
    categoria: /^[a-z_]{2,30}$/.test(categoria) ? categoria : null,
    seccion: Number.isInteger(seccion) && seccion > 0 && seccion < 100000 ? seccion : null,
    responsable: responsable === "mias" || responsable === "sin" || UUID.test(responsable) ? responsable : null,
    antiguedad: antiguedad === 7 || antiguedad === 30 ? antiguedad : null,
    porAceptar: ["1", "true"].includes(uno(fuente.por_aceptar ?? fuente.porAceptar)),
    sinSeccion: ["1", "true"].includes(uno(fuente.sin_seccion ?? fuente.sinSeccion)),
    pagina: Math.max(1, Math.min(1000, Math.floor(Number(uno(fuente.page) || uno(fuente.pagina)) || 1))),
    q: uno(fuente.q).slice(0, LARGO_MAXIMO_BUSQUEDA_INCIDENCIAS)
  };
}

/** La parte de los filtros que va en la dirección web: nunca el texto del buscador. */
export function direccionDeFiltros(f: FiltrosDeIncidencias): string {
  const p = new URLSearchParams();
  if (f.vista !== "atender") p.set("vista", f.vista);
  if (f.categoria) p.set("categoria", f.categoria);
  if (f.seccion) p.set("seccion", String(f.seccion));
  if (f.responsable) p.set("responsable", f.responsable);
  if (f.antiguedad) p.set("antiguedad", String(f.antiguedad));
  if (f.porAceptar) p.set("por_aceptar", "1");
  if (f.sinSeccion) p.set("sin_seccion", "1");
  if (f.pagina > 1) p.set("page", String(f.pagina));
  const texto = p.toString();
  return texto ? `?${texto}` : "";
}

/** Cuántos días de calendario (en hora de Jalisco) lleva abierta: 0 hoy, 1 ayer… */
export function diasEntre(desde: Date, hasta: Date): number {
  const dia = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const a = Date.parse(`${dia(desde)}T00:00:00Z`);
  const b = Date.parse(`${dia(hasta)}T00:00:00Z`);
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

/** «hoy», «ayer», «hace 9 días». */
export function haceCuanto(dias: number): string {
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  return `hace ${dias} días`;
}

/** Verde menos de 3 días, ámbar de 3 a 7, rojo más de 7. */
export function urgenciaPorDias(dias: number): "reciente" | "atencion" | "urgente" {
  if (dias < 3) return "reciente";
  if (dias <= 7) return "atencion";
  return "urgente";
}
