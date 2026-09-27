/**
 * Agrupación de puntos del mapa en una rejilla, del lado del servidor (etapa 4, C10 / R6).
 *
 * Antes la API mandaba cada contacto del recuadro visible —con nombre, colonia y municipio
 * descifrados— y el teléfono los agrupaba: a nivel de municipio eran miles de fichas para acabar
 * dibujando unas decenas de círculos con un número. Ahora el servidor agrupa con la misma rejilla
 * y solo manda completos los que quedan sueltos.
 *
 * La rejilla es la que ya usaba el mapa, por tramos de zoom: a partir de 15 no se agrupa.
 */

export type Recuadro = readonly [minLng: number, minLat: number, maxLng: number, maxLat: number];

export type PuntoDelMapa = {
  id: string;
  lng: number;
  lat: number;
  /** Militancia PAN confirmada. */
  pan: boolean;
  /** Ubicación aproximada: el centro de su sección, no un GPS. */
  aprox: boolean;
};

export type GrupoDelMapa = {
  lat: number;
  lng: number;
  total: number;
  pan: number;
  /** Todos los del grupo son aproximados: el círculo se dibuja punteado. */
  aprox: boolean;
};

export const ZOOM_SIN_AGRUPAR = 15;

/**
 * Lado de la celda, en grados, según el zoom; `null` si a ese zoom ya no se agrupa.
 *
 * A zoom 11 una celda de 0,04° mide unos 60 px en pantalla. Por debajo, la celda crece al alejarse
 * para seguir midiendo lo mismo: con el lado fijo, en la vista de todo Jalisco (zoom 6 a 8) medía de
 * 2 a 8 px y los grupos se amontonaban en una sola pila ilegible.
 */
export function ladoDeRejilla(zoom: number): number | null {
  if (!Number.isFinite(zoom) || zoom >= ZOOM_SIN_AGRUPAR) return null;
  if (zoom <= 11) return 0.04 * 2 ** (11 - Math.max(Math.round(zoom), 0));
  return zoom <= 13 ? 0.015 : 0.006;
}

export function leerRecuadro(texto: string | null): Recuadro | null {
  if (!texto) return null;
  const p = texto.split(",").map(Number);
  if (p.length !== 4 || !p.every(Number.isFinite)) return null;
  const [minLng, minLat, maxLng, maxLat] = p as [number, number, number, number];
  if (minLng > maxLng || minLat > maxLat) return null;
  return [minLng, minLat, maxLng, maxLat];
}

export function dentroDe(recuadro: Recuadro, lng: number, lat: number): boolean {
  return lng >= recuadro[0] && lng <= recuadro[2] && lat >= recuadro[1] && lat <= recuadro[3];
}

/**
 * Reparte los puntos en celdas. Una celda con un solo punto no es un grupo: ese punto se devuelve
 * suelto, para dibujarlo con su ficha.
 */
export function agruparEnRejilla(puntos: readonly PuntoDelMapa[], lado: number): { grupos: GrupoDelMapa[]; sueltos: string[] } {
  const celdas = new Map<string, { puntos: PuntoDelMapa[]; lat: number; lng: number; pan: number }>();
  for (const p of puntos) {
    const clave = `${Math.floor(p.lat / lado)}_${Math.floor(p.lng / lado)}`;
    const celda = celdas.get(clave) ?? { puntos: [], lat: 0, lng: 0, pan: 0 };
    celda.puntos.push(p);
    celda.lat += p.lat;
    celda.lng += p.lng;
    if (p.pan) celda.pan++;
    celdas.set(clave, celda);
  }
  const grupos: GrupoDelMapa[] = [];
  const sueltos: string[] = [];
  for (const celda of celdas.values()) {
    if (celda.puntos.length === 1) {
      sueltos.push(celda.puntos[0]!.id);
      continue;
    }
    const total = celda.puntos.length;
    grupos.push({
      lat: celda.lat / total,
      lng: celda.lng / total,
      total,
      pan: celda.pan,
      aprox: celda.puntos.every((p) => p.aprox)
    });
  }
  return { grupos, sueltos };
}
