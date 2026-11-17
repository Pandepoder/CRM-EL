import type { CSSProperties } from "react";

import { sinAcentos } from "@/lib/municipios-jalisco";
import { ALTO_JALISCO as ALTO, ANCHO_JALISCO as ANCHO, MARGEN_JALISCO as MARGEN, PUNTOS_JALISCO } from "@/lib/proyeccion-jalisco";

/**
 * Jalisco como constelación: un punto por municipio, encendidos los que tienen trabajo.
 *
 * Es un componente de servidor: sale como SVG ya dibujado, sin una línea de JavaScript para
 * quien lo ve. Los 125 puntos salen del catálogo que ya viaja en la aplicación
 * (public/geo/jalisco-municipalities.json), así que no se descarga ninguna cartografía: pesa
 * unos pocos kilobytes de marcado y se ve nítido en cualquier pantalla.
 *
 * No lleva el nombre de cada municipio encima. La operación se concentra en el área
 * metropolitana y los cuatro nombres se montaban unos sobre otros hasta volverse ilegibles;
 * ahora va una sola etiqueta al grupo y los nombres, uno por uno, en las fichas de al lado.
 *
 * No es un mapa a escala ni pretende serlo —son los centros de cada municipio proyectados—,
 * por eso el pie lo dice. Y el detalle máximo es el municipio: encender secciones sería señalar
 * dónde vive quien reporta.
 */

export default function MapaJalisco({ activos }: { activos: Array<{ municipio: string; total: number }> }) {
  const porClave = new Map(activos.map((a) => [sinAcentos(a.municipio), a.total]));
  const puntos = PUNTOS_JALISCO.map((p) => ({ ...p, total: porClave.get(sinAcentos(p.nombre)) ?? 0 }));
  const encendidos = puntos.filter((p) => p.total > 0).sort((a, b) => b.total - a.total);

  const total = encendidos.reduce((n, p) => n + p.total, 0);
  const centro = encendidos.length
    ? {
        x: encendidos.reduce((n, p) => n + p.x, 0) / encendidos.length,
        y: encendidos.reduce((n, p) => n + p.y, 0) / encendidos.length
      }
    : null;
  // Si son varios municipios pegados se rotula el grupo; si es uno solo, ese.
  const etiqueta =
    encendidos.length === 1 ? `${encendidos[0]!.nombre} · ${total}` : `${encendidos.length} municipios · ${total} reportes`;

  return (
    <svg
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      className="mapa-jalisco"
      role="img"
      aria-label={`Municipios de Jalisco con trabajo registrado: ${encendidos.map((e) => e.nombre).join(", ") || "ninguno todavía"}`}
    >
      {puntos.map((p) => (
        <circle
          key={p.nombre}
          cx={p.x}
          cy={p.y}
          r={p.total > 0 ? 11 : 6}
          className={p.total > 0 ? "mapa-punto vivo" : "mapa-punto"}
          // Al llegar a esta parte de la página los puntos se encienden de poniente a oriente.
          style={{ "--d": p.x } as CSSProperties}
        >
          {p.total > 0 ? <title>{`${p.nombre}: ${p.total} reportes`}</title> : null}
        </circle>
      ))}
      {encendidos.map((p, i) => (
        <circle
          key={`halo-${p.nombre}`}
          cx={p.x}
          cy={p.y}
          r={26}
          className="mapa-halo"
          // Escalonado para que laten como un pulso y no todos a la vez.
          style={{ animationDelay: `${(i % 6) * 0.42}s` }}
        />
      ))}
      {centro ? (
        // La etiqueta se va al lado donde quepa: con el grupo a la derecha del lienzo, ponerla
        // siempre a la derecha la dejaba cortada fuera del recuadro.
        (() => {
          // El ancho del texto se estima por el número de letras (unos 15 px cada una a 30 px de
          // tipo): si no cabe a la derecha del grupo, la etiqueta se va al otro lado.
          const anchoTexto = etiqueta.length * 15;
          const aLaDerecha = centro.x + 106 + anchoTexto <= ANCHO - MARGEN;
          const salto = aLaDerecha ? 1 : -1;
          return (
            <g className="mapa-rotulo">
              <line
                x1={centro.x + 30 * salto}
                y1={centro.y}
                x2={centro.x + 96 * salto}
                y2={centro.y - 62}
                className="mapa-guia"
              />
              <text
                x={centro.x + 106 * salto}
                y={centro.y - 58}
                textAnchor={aLaDerecha ? "start" : "end"}
                className="mapa-nombre"
              >
                {etiqueta}
              </text>
            </g>
          );
        })()
      ) : null}
    </svg>
  );
}
