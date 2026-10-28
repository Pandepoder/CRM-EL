/**
 * Estructura Electoral, sin base: los roles, la casilla, los filtros de la cobertura y lo que viaja a la
 * pantalla (plan de auditoría de menús, fase 4). La consulta y los cambios viven en
 * `estructura-electoral-servicio.ts`.
 *
 * Antes convivían tres vocabularios de roles (la etiqueta de la pantalla, la de los scripts de carga y la
 * clave); la migración 0029 los dejó en uno. Lo que no corresponde a ninguno se enseña como «Otro: …» y no
 * cuenta en la cobertura.
 */

export const ROLES_ELECTORALES = [
  { clave: "coordinador", nombre: "Coordinación de sección", corto: "Coordinación", ayuda: "Organiza a la gente de la sección y avisa qué falta" },
  { clave: "representante_general", nombre: "Representante general", corto: "RG", ayuda: "Recorre las casillas de la sección el día de la elección" },
  { clave: "representante_casilla", nombre: "Representante de casilla", corto: "RC", ayuda: "Cuida una casilla todo el día y firma el acta" }
] as const;

export type RolElectoral = (typeof ROLES_ELECTORALES)[number]["clave"];

export function esRolElectoral(valor: unknown): valor is RolElectoral {
  return typeof valor === "string" && ROLES_ELECTORALES.some((r) => r.clave === valor);
}

/** El nombre de un rol; uno que no está en el catálogo (dato viejo) se enseña como «Otro: …». */
export function nombreDeRol(clave: string | null | undefined): string {
  const r = ROLES_ELECTORALES.find((x) => x.clave === clave);
  if (r) return r.nombre;
  const limpio = (clave ?? "").trim();
  return limpio ? `Otro: ${limpio}` : "Sin rol";
}

/**
 * Casillas que se esperan por sección mientras no haya catálogo de casillas del INE (D5): la barra de RC
 * se mide contra esto, y la pantalla lo dice.
 */
export const CASILLAS_ESTIMADAS_POR_SECCION = 2;

/**
 * Una casilla como la escribe el INE: B, C1, E1, E1C2, S1… Se guarda en mayúsculas y sin espacios; vacía es
 * «sin casilla». `ok: false` si no tiene esa forma.
 */
export function normalizarCasilla(valor: unknown): { ok: true; casilla: string | null } | { ok: false } {
  if (valor === undefined || valor === null) return { ok: true, casilla: null };
  if (typeof valor !== "string") return { ok: false };
  const limpio = valor.replace(/\s+/g, "").toUpperCase();
  if (!limpio) return { ok: true, casilla: null };
  return /^[A-Z0-9]{1,8}$/.test(limpio) ? { ok: true, casilla: limpio } : { ok: false };
}

/** Cuántas filas de cobertura por página. Guadalajara tiene 980 secciones. */
export const SECCIONES_POR_PAGINA = 30;

export type FiltroDeCobertura = "todas" | "sin_coordinador" | "sin_rg" | "sin_rc" | "completas";

export const FILTROS_DE_COBERTURA: ReadonlyArray<{ clave: FiltroDeCobertura; nombre: string }> = [
  { clave: "todas", nombre: "Todas" },
  { clave: "sin_coordinador", nombre: "Sin coordinación" },
  { clave: "sin_rg", nombre: "Sin RG" },
  { clave: "sin_rc", nombre: "Sin RC" },
  { clave: "completas", nombre: "Completas" }
];

export type FiltrosDeCobertura = {
  filtro: FiltroDeCobertura;
  /** Número de sección, colonia o nombre de quien cubre. Viaja en el cuerpo, nunca en la dirección. */
  q: string;
  pagina: number;
};

const unoDe = (v: unknown): string => (Array.isArray(v) ? String(v[0] ?? "") : typeof v === "string" ? v : typeof v === "number" ? String(v) : "");

export function leerFiltrosDeCobertura(fuente: Record<string, unknown>): FiltrosDeCobertura {
  const filtro = unoDe(fuente.filtro);
  return {
    filtro: FILTROS_DE_COBERTURA.some((f) => f.clave === filtro) ? (filtro as FiltroDeCobertura) : "todas",
    q: unoDe(fuente.q).trim().slice(0, 80),
    pagina: Math.max(1, Math.min(1000, Math.floor(Number(unoDe(fuente.pagina) || unoDe(fuente.page)) || 1)))
  };
}

/** Lo que va en la dirección: el chip y la página. El texto del buscador no. */
export function direccionDeCobertura(f: FiltrosDeCobertura, municipio: string | null): string {
  const p = new URLSearchParams();
  if (municipio) p.set("municipio", municipio);
  if (f.filtro !== "todas") p.set("filtro", f.filtro);
  if (f.pagina > 1) p.set("page", String(f.pagina));
  const texto = p.toString();
  return texto ? `?${texto}` : "";
}

/** ¿Está completa una sección? Coordinación, RG y las casillas estimadas cubiertas. */
export function seccionCompleta(conteo: { coordinador: number; representante_general: number; representante_casilla: number }): boolean {
  return conteo.coordinador > 0 && conteo.representante_general > 0 && conteo.representante_casilla >= CASILLAS_ESTIMADAS_POR_SECCION;
}

/** Una persona nombrada, como la ve la pantalla. El nombre ya viene recortado al alcance en el servidor. */
export type Nombrado = {
  id: string;
  rol: string;
  nombre: string;
  tipo: "cuenta" | "ciudadano";
  /** Id de la cuenta o del ciudadano: la ficha del ciudadano se abre desde aquí. */
  personaId: string;
  casilla: string | null;
  puedeCambiar: boolean;
};

export type FilaDeCobertura = {
  seccionId: string;
  numero: number;
  colonias: string[];
  nombrados: Nombrado[];
  conteo: { coordinador: number; representante_general: number; representante_casilla: number };
};

export type TotalesDeCobertura = {
  secciones: number;
  conCoordinador: number;
  conRg: number;
  rc: number;
  rcEsperados: number;
  sinCoordinador: number;
  sinRg: number;
  sinRc: number;
  completas: number;
};

export type ResultadoDeCobertura = {
  municipio: { id: string; nombre: string } | null;
  /** Para dirección y líder: los números cuentan solo su estructura (D11). */
  soloSuEstructura: boolean;
  totales: TotalesDeCobertura;
  filas: FilaDeCobertura[];
  total: number;
  pagina: number;
  totalPaginas: number;
};

/** Alguien a quien se puede nombrar. */
export type Candidato = { tipo: "cuenta" | "ciudadano"; id: string; nombre: string; detalle: string | null };

export type CandidatosParaNombrar = {
  /** Ciudadanos visibles que dijeron en la encuesta que quieren ser representantes de casilla (D4). */
  sugeridos: Candidato[];
  /** Cuentas de su mando. */
  gente: Candidato[];
  /** Ciudadanos visibles que coinciden con lo que se escribió. */
  ciudadanos: Candidato[];
};

/** ¿Dijo en la encuesta que quiere ser representante de casilla? (los formularios y los datos importados lo escriben distinto) */
export const PATRON_QUIERE_SER_RC = "%casilla%";
