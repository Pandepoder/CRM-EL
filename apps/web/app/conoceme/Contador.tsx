"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Cifra que cuenta hacia arriba cuando entra en pantalla.
 *
 * El número final se pinta desde el servidor: quien tenga JavaScript apagado, o entre con una
 * conexión que lo corte, lee la cifra completa igual. La animación solo arranca cuando la
 * tarjeta se ve, así que no hay números corriendo en una parte de la página que nadie mira, y
 * se salta entera si el teléfono pide menos movimiento.
 */
export default function Contador({ valor, etiqueta, nota }: { valor: number; etiqueta: string; nota?: string }) {
  const [mostrado, setMostrado] = useState(valor);
  const caja = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const nodo = caja.current;
    if (!nodo) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cuadro = 0;
    const observador = new IntersectionObserver(
      (entradas) => {
        if (!entradas.some((e) => e.isIntersecting)) return;
        observador.disconnect();

        const inicio = performance.now();
        const duracion = 1100;
        const paso = (ahora: number) => {
          const avance = Math.min(1, (ahora - inicio) / duracion);
          // Desacelera al final: el número "aterriza" en vez de frenar de golpe.
          const suave = 1 - Math.pow(1 - avance, 3);
          setMostrado(Math.round(valor * suave));
          if (avance < 1) cuadro = requestAnimationFrame(paso);
        };
        setMostrado(0);
        cuadro = requestAnimationFrame(paso);
      },
      { threshold: 0.4 }
    );

    observador.observe(nodo);
    return () => {
      observador.disconnect();
      if (cuadro) cancelAnimationFrame(cuadro);
    };
  }, [valor]);

  return (
    <div ref={caja} className="pulso-tarjeta">
      <span className="pulso-numero">{mostrado.toLocaleString("es-MX")}</span>
      <span className="pulso-etiqueta">{etiqueta}</span>
      {nota ? <span className="pulso-nota">{nota}</span> : null}
    </div>
  );
}
