import { MUNICIPIOS_JALISCO, RECUADRO_JALISCO } from "@/lib/municipios-jalisco";

/**
 * Los centros de los 125 municipios pasados a un lienzo de 1000 de ancho: lo comparten el mapa de
 * Conóceme y la constelación de fondo. No es un mapa a escala, son puntos proyectados.
 */
export const ANCHO_JALISCO = 1000;
export const MARGEN_JALISCO = 26;

const [OESTE, SUR, ESTE, NORTE] = RECUADRO_JALISCO;
/** Se corrige la proporción por la latitud: sin esto Jalisco sale estirado a lo ancho. */
const FACTOR_LATITUD = Math.cos((((SUR + NORTE) / 2) * Math.PI) / 180);
export const ALTO_JALISCO = Math.round((ANCHO_JALISCO * (NORTE - SUR)) / ((ESTE - OESTE) * FACTOR_LATITUD));

const enX = (lng: number) => MARGEN_JALISCO + ((lng - OESTE) / (ESTE - OESTE)) * (ANCHO_JALISCO - MARGEN_JALISCO * 2);
const enY = (lat: number) => MARGEN_JALISCO + ((NORTE - lat) / (NORTE - SUR)) * (ALTO_JALISCO - MARGEN_JALISCO * 2);

export const PUNTOS_JALISCO = MUNICIPIOS_JALISCO.map((m) => ({
  nombre: m.name,
  x: Math.round(enX(m.center[1])),
  y: Math.round(enY(m.center[0]))
}));

/** Cada municipio unido con sus dos vecinos más cercanos, como un solo trazo SVG: la red de la constelación. */
export const RED_JALISCO = (() => {
  const vistos = new Set<string>();
  const tramos: string[] = [];
  PUNTOS_JALISCO.forEach((p, i) => {
    PUNTOS_JALISCO.map((q, j) => ({ j, q, distancia: (p.x - q.x) ** 2 + (p.y - q.y) ** 2 }))
      .filter((o) => o.j !== i)
      .sort((a, b) => a.distancia - b.distancia)
      .slice(0, 2)
      .forEach(({ j, q }) => {
        const clave = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (vistos.has(clave)) return;
        vistos.add(clave);
        tramos.push(`M${p.x} ${p.y}L${q.x} ${q.y}`);
      });
  });
  return tramos.join("");
})();
