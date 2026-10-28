import { esUuid } from "./ids";

/**
 * Los filtros del Directorio, sin base: la pantalla, la dirección web y `POST /api/directorio/consulta` los leen
 * igual. El texto del buscador viaja en el cuerpo del `POST` y **nunca** en la dirección (observación O2 del plan
 * de auditoría de menús): un nombre o un teléfono buscado quedaba en el historial del navegador y en los
 * registros del servidor. Los demás filtros son claves e ids y sí van en la dirección, para que «atrás» y
 * recargar los conserven.
 */

export const POR_PAGINA_DIRECTORIO = 25;
export const LARGO_MAXIMO_BUSQUEDA_DIRECTORIO = 80;

export type MilitanciaDelDirectorio = "" | "confirmada" | "declarada";

export type FiltrosDelDirectorio = {
  q: string;
  /** Solo los ciudadanos asignados a quien consulta. */
  soloAsignados: boolean;
  militancia: MilitanciaDelDirectorio;
  /** Solo los que el mapa no puede dibujar: sin GPS y sin sección con cartografía. */
  sinUbicacion: boolean;
  /** «Registrados por…»: el id pedido. Si vale (y de quién es) lo decide el servidor. */
  registro: string | null;
  pagina: number;
};

const uno = (v: unknown): string => {
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === "string" ? s.trim() : typeof s === "number" ? String(s) : "";
};
const verdad = (v: unknown, enLaDireccion: string): boolean => v === true || uno(v) === enLaDireccion || uno(v) === "true";

/**
 * De la dirección (`asignados=mios`, `pan=`, `ubicacion=sin`, `registro=`, `page=`; y `q=` de los enlaces viejos)
 * o del cuerpo de la consulta (los mismos nombres que `FiltrosDelDirectorio`). Lo que no se entiende se ignora.
 */
export function leerFiltrosDelDirectorio(fuente: Record<string, unknown>): FiltrosDelDirectorio {
  const militancia = uno(fuente.militancia ?? fuente.pan);
  const registro = uno(fuente.registro);
  const pagina = Math.floor(Number(uno(fuente.pagina ?? fuente.page)) || 1);
  return {
    q: uno(fuente.q).slice(0, LARGO_MAXIMO_BUSQUEDA_DIRECTORIO),
    soloAsignados: verdad(fuente.soloAsignados ?? fuente.asignados, "mios"),
    militancia: militancia === "confirmada" || militancia === "declarada" ? militancia : "",
    sinUbicacion: verdad(fuente.sinUbicacion ?? fuente.ubicacion, "sin"),
    registro: esUuid(registro) ? registro : null,
    pagina: Math.max(1, Math.min(10_000, pagina))
  };
}

/** La parte de los filtros que va en la dirección web: nunca el texto del buscador. */
export function direccionDelDirectorio(f: FiltrosDelDirectorio): string {
  const p = new URLSearchParams();
  if (f.registro) p.set("registro", f.registro);
  if (f.soloAsignados) p.set("asignados", "mios");
  if (f.militancia) p.set("pan", f.militancia);
  if (f.sinUbicacion) p.set("ubicacion", "sin");
  if (f.pagina > 1) p.set("page", String(f.pagina));
  const s = p.toString();
  return s ? `?${s}` : "";
}
