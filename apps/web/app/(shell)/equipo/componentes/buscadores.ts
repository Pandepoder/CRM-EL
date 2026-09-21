import type { OpcionSelector } from "@/lib/bitacora-tipos";

import { llamar } from "./api";
import type { AccionCrear, ResultadoBusqueda } from "./SelectorBuscable";

/** Forma en que la API de opciones devuelve una opción del catálogo. */
type OpcionApi = { id: string; name: string; description: string | null; scope: string; createsVisit: boolean };

const aSelector = (o: OpcionApi): OpcionSelector => ({
  id: o.id,
  nombre: o.name,
  detalle: o.scope === "network" ? "Solo tu red" : o.description,
  creaVisita: o.createsVisit
});

/** Busca en el catálogo (tipos de actividad o etiquetas). */
export function buscarCatalogo(kind: "type" | "tag" | "profile") {
  return async (termino: string, _pagina: number, senal: AbortSignal): Promise<ResultadoBusqueda | null> => {
    const r = await llamar<{ opciones: OpcionApi[] }>(
      `/api/equipo/opciones?kind=${kind}&q=${encodeURIComponent(termino)}&limite=50`,
      { signal: senal }
    );
    if (!r.ok) return null;
    return { resultados: r.datos.opciones.map(aSelector), hayMas: false };
  };
}

/**
 * Crea una opción desde el propio selector. El servidor devuelve la existente si el nombre ya
 * estaba (ignorando mayúsculas, acentos y espacios), así que crear dos veces "lo mismo" no duplica.
 */
export function crearEnCatalogo(kind: "type" | "tag" | "profile", nombreDeLaOpcion: string, esAdmin: boolean): AccionCrear {
  return {
    etiqueta: (t) => `Crear ${nombreDeLaOpcion} «${t}»${esAdmin ? "" : " (solo para tu red)"}`,
    ejecutar: async (termino) => {
      const r = await llamar<{ estado: "creada" | "existente"; opcion: OpcionApi }>("/api/equipo/opciones", {
        cuerpo: { kind, name: termino }
      });
      if (!r.ok) return { error: r.error };
      return { opcion: aSelector(r.datos.opcion), existente: r.datos.estado === "existente" };
    }
  };
}

function buscadorPaginado(ruta: string, extra = "") {
  return async (termino: string, pagina: number, senal: AbortSignal): Promise<ResultadoBusqueda | null> => {
    const r = await llamar<{ resultados: Array<{ id: string; nombre: string; detalle: string | null }>; hayMas: boolean }>(
      `${ruta}?q=${encodeURIComponent(termino)}&pagina=${pagina}&limite=15${extra}`,
      { signal: senal }
    );
    if (!r.ok) return null;
    return { resultados: r.datos.resultados, hayMas: r.datos.hayMas };
  };
}

/** Todos los contactos que la persona puede ver, no solo los primeros 100. */
export const buscarContactos = buscadorPaginado("/api/equipo/buscar/contactos");

/** Secciones electorales: catálogo oficial, se eligen, no se crean. */
export const buscarSecciones = buscadorPaginado("/api/equipo/buscar/secciones");
