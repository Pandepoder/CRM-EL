import type { CSSProperties } from "react";
import { ArrowUpRight, Mic, Newspaper, PlayCircle, Radio, Tv } from "lucide-react";

import { ACCION_POR_TIPO, NOMBRE_DEL_TIPO, aparicionesParaMostrar, fechaLegible, type Aparicion, type TipoDeAparicion } from "@/lib/en-los-medios";

const ICONO: Record<TipoDeAparicion, typeof Newspaper> = { nota: Newspaper, entrevista: Mic, radio: Radio, television: Tv, video: PlayCircle };

/** Notas y entrevistas en otros medios. Sin ninguna con enlace válido, la sección no sale. */
export default function EnLosMedios({ lista }: { lista: readonly Aparicion[] }) {
  const apariciones = aparicionesParaMostrar(lista);
  if (apariciones.length === 0) return null;

  return (
    <section className="medios-seccion">
      <div className="medios-interior">
        <div className="pub-revela">
          <h2 className="pub-titulo">
            Lo que dicen<br /><span className="pub-acento pub-acento--claro">los medios.</span>
          </h2>
          <p className="pub-lead">Notas, entrevistas y apariciones en prensa, radio y televisión.</p>
        </div>
        <ul className="medios-rejilla" data-al-llegar="">
          {apariciones.map((a, i) => {
            const Icono = ICONO[a.tipo];
            return (
              <li key={a.enlace} className="medios-elemento" style={{ "--i": i } as CSSProperties}>
                <a href={a.enlace} target="_blank" rel="noopener noreferrer" className="medio-tarjeta">
                  <span className="medio-cabeza">
                    <span className="medio-inicial" aria-hidden="true">{a.medio.trim().charAt(0).toUpperCase()}</span>
                    <span className="medio-nombre">{a.medio}</span>
                    <span className="medio-tipo"><Icono size={14} aria-hidden="true" />{NOMBRE_DEL_TIPO[a.tipo]}</span>
                  </span>
                  <span className="medio-titular">{a.titular}</span>
                  <span className="medio-pie">
                    <time dateTime={a.fecha}>{fechaLegible(a.fecha)}</time>
                    <span className="medio-abrir">
                      {ACCION_POR_TIPO[a.tipo]} <ArrowUpRight size={16} aria-hidden="true" />
                    </span>
                  </span>
                  <span className="sr-only"> (se abre en otra pestaña)</span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
