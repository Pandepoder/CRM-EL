import type { CSSProperties, ReactNode } from "react";

import { MARCA } from "@/lib/marca";

/**
 * El eslogan, palabra por palabra: cada una entra un instante después de la anterior. El lector de
 * pantalla lee la frase completa de `ESLOGAN_EN_TEXTO` en quien lo use; esto es solo lo que se ve.
 */
export function EsloganAnimado() {
  let orden = 0;
  const palabras = (texto: string, clase: string): ReactNode[] =>
    texto.split(" ").filter(Boolean).flatMap((palabra) => {
      const i = orden++;
      return [
        <span key={i} className={`pub-palabra ${clase}`} style={{ "--i": i } as CSSProperties}>
          {palabra}
        </span>,
        " "
      ];
    });

  const { inicio, suave, acento, comillas } = MARCA.eslogan;
  return (
    <span aria-hidden="true">
      {inicio ? <>{palabras(`${comillas ? "“" : ""}${inicio}`, "")}<br /></> : null}
      {palabras(suave, "pub-palabra--suave")}
      {palabras(`${acento}${comillas ? "”" : ""}`, "pub-acento")}
    </span>
  );
}
