/**
 * «En los medios»: notas de prensa, entrevistas y apariciones de la persona de `marca.ts`.
 *
 * Cada renglón lo pasa el equipo con su enlace real: aquí no se inventa ni se copia nada. Mientras la lista
 * esté vacía la sección no se dibuja. Es material de la persona: si cambia la de `marca.ts`, esta lista se
 * vacía o se cambia con ella, como los videos de respaldo.
 */
export type TipoDeAparicion = "nota" | "entrevista" | "radio" | "television" | "video";

export type Aparicion = Readonly<{
  /** El medio, como se escribe: «Milenio Jalisco», «Canal 44». */
  medio: string;
  /** El titular tal cual lo publicó el medio. */
  titular: string;
  /** Fecha de publicación, AAAA-MM-DD. */
  fecha: string;
  enlace: string;
  tipo: TipoDeAparicion;
}>;

export const EN_LOS_MEDIOS: readonly Aparicion[] = [];

/** Lo que dice el botón de cada tarjeta, según qué es. */
export const ACCION_POR_TIPO: Record<TipoDeAparicion, string> = {
  nota: "Leer nota",
  entrevista: "Leer entrevista",
  radio: "Escuchar",
  television: "Ver en video",
  video: "Ver video"
};

export const NOMBRE_DEL_TIPO: Record<TipoDeAparicion, string> = {
  nota: "Nota",
  entrevista: "Entrevista",
  radio: "Radio",
  television: "Televisión",
  video: "Video"
};

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Las que se pueden enseñar, de la más reciente a la más vieja. Se descarta un renglón con enlace que no sea
 * http(s) —un `javascript:` pegado por error sería un enlace que ejecuta código— o con la fecha mal escrita.
 */
export function aparicionesParaMostrar(lista: readonly Aparicion[]): Aparicion[] {
  return lista
    .filter((a) => {
      if (!FECHA.test(a.fecha) || Number.isNaN(Date.parse(`${a.fecha}T00:00:00Z`))) return false;
      try {
        const url = new URL(a.enlace);
        return url.protocol === "https:" || url.protocol === "http:";
      } catch {
        return false;
      }
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

/** «12 de octubre de 2026». En UTC para que la fecha no se corra un día según la zona del servidor. */
export function fechaLegible(fecha: string): string {
  return new Date(`${fecha}T00:00:00Z`).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
