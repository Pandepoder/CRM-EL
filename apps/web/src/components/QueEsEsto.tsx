"use client";

import { useEffect, useRef, useState } from "react";
import { HelpCircle, X } from "lucide-react";

/**
 * «¿Qué es esto?» (L13): un «?» junto a una palabra que confunde a quien nunca usó un CRM. Al tocarlo,
 * la explicación sale abajo, a lo ancho de la pantalla: un globo junto a la palabra se salía del teléfono, y
 * un `title=` no se ve con el dedo.
 *
 * Los textos viven aquí, en un solo glosario: si dos pantallas explican lo mismo, dicen lo mismo.
 */
export const GLOSARIO = {
  militancia: {
    titulo: "Militancia PAN",
    texto:
      "«Declarada»: la persona dice que milita en el PAN, pero nadie lo ha comprobado. «Confirmada»: alguien del equipo ya la encontró en el padrón oficial del partido."
  },
  seccion: {
    titulo: "Sección electoral",
    texto:
      "La zona donde vota la persona. El número viene en su credencial del INE. Sirve para ubicarla en el mapa y saber qué casilla le toca."
  },
  prospecto: {
    titulo: "Prospecto",
    texto:
      "Alguien que conociste y todavía no registras como ciudadano: un líder de colonia, un comerciante, una vecina interesada. Anótalo para no perderle la pista; cuando acepte, lo pasas al directorio con un toque."
  },
  seguimiento: {
    titulo: "Con seguimiento",
    texto:
      "Quedó un siguiente paso (volver, llevar información, una gestión) con fecha y responsable. Aparece en la agenda de quien lo tiene asignado."
  },
  efectividad: {
    titulo: "Efectividad",
    texto:
      "De las incidencias que se ven en el mapa, qué parte ya se atendió: las resueltas entre la suma de abiertas y resueltas."
  },
  escucha: {
    titulo: "Escucha Social",
    texto:
      "Lo que te pide o propone un vecino: una idea, una necesidad, un compromiso. Queda en su ficha, en «Lo que ha pedido». Si es un problema en la calle (bache, fuga, luminaria), es una incidencia: levántala o, si no coordinas, usa «Avisar de una incidencia» en el botón +."
  },
  turnar: {
    titulo: "Turnar a una dependencia",
    texto:
      "Mandar la petición a quien la resuelve (SIAPA, Alumbrado, Obras Públicas…) con el folio que te dieron y la fecha. Lo hace administración. Queda a la vista en la petición y en la ficha del vecino, para que cualquiera le diga en qué va."
  },
  cobertura: {
    titulo: "Cobertura",
    texto:
      "Cuántas secciones ya tienen a alguien para el día de la elección: quien coordina la sección, un representante general (RG) y representantes de casilla (RC). Si diriges o lideras, los números cuentan solo lo que nombró tu estructura; la administración ve el municipio entero."
  },
  rgrc: {
    titulo: "RG y RC",
    texto:
      "RC (representante de casilla): cuida una casilla todo el día, de la instalación al conteo, y firma el acta. RG (representante general): recorre las casillas de la sección y ayuda a los RC si hay un problema. Puede ser alguien de tu gente o un ciudadano que quiera participar."
  },
  porAgotarse: {
    titulo: "Por agotarse",
    texto:
      "Cada artículo puede tener un mínimo: cuando las piezas en el almacén llegan a ese número, el artículo sale en «Por agotarse» para que lo pidas a tiempo. Lo pones al dar de alta o al editar el artículo; sin mínimo, no avisa."
  },
  devolucion: {
    titulo: "Devolución",
    texto:
      "Cuando alguien regresa material que se le entregó (lo que sobró de un evento, por ejemplo). Las piezas vuelven al almacén y dejan de contar como suyas. No se puede regresar más de lo que esa persona tiene."
  },
  aviso: {
    titulo: "Aviso por aceptar",
    texto:
      "Un bache, una fuga o una luminaria que alguien de tu brigada vio en la calle. Llega sin responsable: tú lo aceptas y se lo asignas a alguien, o lo rechazas con el motivo. Quien avisó ve en qué va, pero no puede aceptar su propio aviso."
  },
  enlace: {
    titulo: "Tu QR o enlace",
    texto:
      "Quien se registra con tu QR queda a tu nombre en el directorio y suma en tu «Mi día». Compártelo por WhatsApp o enséñalo en tu teléfono."
  },
  medallas: {
    titulo: "Medallas de la semana",
    texto:
      "Cada quien se mide contra su propia meta del día, no contra los demás. Oro: 3 días o más de esta semana con la meta cumplida; plata: 2; bronce: 1. Varias personas pueden tener oro. La meta es la que tú le pusiste o, si no tiene, la de su rol: 10 acciones al día para quien registra y 5 para quien hace visitas."
  },
  meta: {
    titulo: "Meta del día",
    texto:
      "Cuántas acciones al día (registros, visitas cerradas, prospectos, peticiones) se propone la persona. Si no le pones una, elige su ritmo en su teléfono. Si se la pones, la ve en su «Mi día» y puede rebasarla cuando quiera."
  }
} as const;

export type TerminoDelGlosario = keyof typeof GLOSARIO;

export function QueEsEsto({ termino, className = "" }: Readonly<{ termino: TerminoDelGlosario; className?: string }>) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const { titulo, texto } = GLOSARIO[termino];

  useEffect(() => {
    if (!abierto) return;
    const alTocarFuera = (e: MouseEvent | TouchEvent) => {
      const objetivo = e.target as Node;
      if (!caja.current?.contains(objetivo) && !boton.current?.contains(objetivo)) setAbierto(false);
    };
    const alTeclear = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierto(false); };
    document.addEventListener("mousedown", alTocarFuera);
    document.addEventListener("touchstart", alTocarFuera);
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("mousedown", alTocarFuera);
      document.removeEventListener("touchstart", alTocarFuera);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [abierto]);

  return (
    <>
      <button
        ref={boton}
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAbierto((v) => !v); }}
        aria-label={`¿Qué es «${titulo}»?`}
        aria-expanded={abierto}
        className={`que-es-esto-boton ${className}`}
      >
        <HelpCircle size={16} aria-hidden="true" />
      </button>
      {abierto && (
        <div ref={caja} role="note" aria-live="polite" className="que-es-esto-caja">
          <div className="flex items-start gap-3">
            <HelpCircle size={20} className="shrink-0 mt-0.5 text-blue-300" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <strong className="block text-[15px] font-black">{titulo}</strong>
              <p className="text-sm font-medium text-blue-50 leading-relaxed mt-0.5">{texto}</p>
            </div>
            <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar explicación" className="shrink-0 -mr-2 -mt-2 w-11 h-11 grid place-items-center rounded-xl text-blue-200 hover:bg-white/10 cursor-pointer">
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
