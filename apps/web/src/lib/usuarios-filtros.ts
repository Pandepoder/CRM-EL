/**
 * Los filtros de «Usuarios y permisos», sin base: la pantalla, la dirección web y
 * `POST /api/admin/usuarios/consulta` los leen igual. El texto del buscador (un nombre, un correo) viaja en el
 * cuerpo del `POST` y **nunca** en la dirección (observación O2 del plan de auditoría de menús); rol, estado,
 * municipio y página sí, para que «atrás» y recargar los conserven.
 */

export const POR_PAGINA_USUARIOS = 25;
export const LARGO_MAXIMO_BUSQUEDA_USUARIOS = 120;

export const ESTADOS_DE_USUARIOS = {
  todos: "Todos",
  active: "Activos",
  inactive: "Dados de baja",
  rejected: "Rechazados"
} as const;
export type EstadoDeUsuarios = keyof typeof ESTADOS_DE_USUARIOS;

export type FiltrosDeUsuarios = {
  q: string;
  /** Clave del rol; si existe lo decide el servidor. */
  rol: string;
  estado: EstadoDeUsuarios;
  /** Nombre del municipio o `general`; solo lo usa el maestro y lo valida el servidor. */
  municipio: string;
  pagina: number;
};

export const FILTROS_DE_USUARIOS_VACIOS: FiltrosDeUsuarios = { q: "", rol: "", estado: "todos", municipio: "", pagina: 1 };

const uno = (v: unknown): string => {
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === "string" ? s.trim() : typeof s === "number" ? String(s) : "";
};

/** De la dirección (con `page=` y el `q=` de los enlaces viejos) o del cuerpo de la consulta. Lo raro se ignora. */
export function leerFiltrosDeUsuarios(fuente: Record<string, unknown>): FiltrosDeUsuarios {
  const rol = uno(fuente.rol);
  const estado = uno(fuente.estado);
  const pagina = Math.floor(Number(uno(fuente.pagina ?? fuente.page)) || 1);
  return {
    q: uno(fuente.q).slice(0, LARGO_MAXIMO_BUSQUEDA_USUARIOS),
    rol: /^[a-z_]{2,40}$/.test(rol) ? rol : "",
    estado: estado in ESTADOS_DE_USUARIOS ? (estado as EstadoDeUsuarios) : "todos",
    municipio: uno(fuente.municipio).slice(0, 80),
    pagina: Math.max(1, Math.min(10_000, pagina))
  };
}

/** La parte de los filtros que va en la dirección web: nunca el texto del buscador. */
export function direccionDeUsuarios(f: FiltrosDeUsuarios): string {
  const p = new URLSearchParams();
  if (f.rol) p.set("rol", f.rol);
  if (f.estado !== "todos") p.set("estado", f.estado);
  if (f.municipio) p.set("municipio", f.municipio);
  if (f.pagina > 1) p.set("page", String(f.pagina));
  const s = p.toString();
  return s ? `?${s}` : "";
}
