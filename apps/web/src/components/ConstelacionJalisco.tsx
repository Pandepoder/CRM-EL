import type { CSSProperties } from "react";

import { ALTO_JALISCO, ANCHO_JALISCO, PUNTOS_JALISCO, RED_JALISCO } from "@/lib/proyeccion-jalisco";

/**
 * Jalisco de fondo: un punto por municipio, unidos con sus dos vecinos más cercanos.
 *
 * Es el sello de las páginas públicas y no un adorno cualquiera: lo que se dibuja es el territorio
 * real en el que trabajan las brigadas. Sale del servidor como SVG, sin JavaScript. Solo usa el catálogo
 * de municipios, nunca un dato de la operación.
 */
const CADA_CUANTOS_BRILLA = 9;

export function ConstelacionJalisco({ className = "" }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${ANCHO_JALISCO} ${ALTO_JALISCO}`} className={`constelacion ${className}`} aria-hidden="true" focusable="false">
      <path d={RED_JALISCO} className="constelacion-red" />
      {PUNTOS_JALISCO.map((p, i) => {
        const brilla = i % CADA_CUANTOS_BRILLA === 0;
        return (
          <circle
            key={p.nombre}
            cx={p.x}
            cy={p.y}
            r={brilla ? 7 : 4.5}
            className={brilla ? "constelacion-punto brilla" : "constelacion-punto"}
            // Se encienden de poniente a oriente, como una ola que cruza el estado.
            style={{ "--d": p.x, "--t": i % 5 } as CSSProperties}
          />
        );
      })}
    </svg>
  );
}
