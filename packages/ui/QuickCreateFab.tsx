"use client";

import { useEffect, useRef, useState } from "react";

import { AlertTriangle, CalendarPlus, Plus, X } from "lucide-react";

/**
 * Botón de creación rápida, fijo en todas las pantallas del panel.
 *
 * Antes solo se podía levantar una incidencia desde el mapa, con un botón
 * discreto en su cabecera, y el panel de incidencias no tenía ninguno: había
 * que navegar al mapa aunque estuvieras justo en la lista de incidencias.
 *
 * No duplica los formularios. Lleva a los que ya existen —el del mapa, que
 * resuelve GPS, sección y colonia, y el de la agenda de equipo— con un
 * parámetro que los abre solos. Un tercer formulario acabaría desincronizado
 * del catálogo de categorías, que es como empezaron los problemas anteriores.
 */

type Opcion = Readonly<{
  href: string;
  etiqueta: string;
  ayuda: string;
  icono: typeof AlertTriangle;
  color: string;
}>;

const OPCIONES: readonly Opcion[] = [
  {
    href: "/mapa?crear=incidencia",
    etiqueta: "Incidencia",
    ayuda: "Bache, fuga, alumbrado, emergencia…",
    icono: AlertTriangle,
    color: "#dc2626"
  },
  {
    href: "/equipo?crear=evento",
    etiqueta: "Evento o actividad",
    ayuda: "Mitin, plática, brigada, visita…",
    icono: CalendarPlus,
    color: "#2563eb"
  }
];

export function QuickCreateFab() {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!abierto) return;

    const alPulsarFuera = (evento: MouseEvent) => {
      if (contenedor.current && !contenedor.current.contains(evento.target as Node)) {
        setAbierto(false);
      }
    };
    const alPulsarEscape = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAbierto(false);
    };

    document.addEventListener("mousedown", alPulsarFuera);
    document.addEventListener("keydown", alPulsarEscape);
    return () => {
      document.removeEventListener("mousedown", alPulsarFuera);
      document.removeEventListener("keydown", alPulsarEscape);
    };
  }, [abierto]);

  return (
    <div className="fab-creacion" ref={contenedor}>
      {abierto ? (
        <div className="fab-menu" role="menu" aria-label="Qué quieres crear">
          {OPCIONES.map((opcion) => {
            const Icono = opcion.icono;
            return (
              <a
                key={opcion.href}
                className="fab-opcion"
                href={opcion.href}
                role="menuitem"
                onClick={() => setAbierto(false)}
              >
                <span className="fab-opcion-icono" style={{ background: opcion.color }}>
                  <Icono size={17} />
                </span>
                <span className="fab-opcion-texto">
                  <strong>{opcion.etiqueta}</strong>
                  <small>{opcion.ayuda}</small>
                </span>
              </a>
            );
          })}
        </div>
      ) : null}

      <button
        type="button"
        className={`fab-boton ${abierto ? "is-abierto" : ""}`}
        onClick={() => setAbierto((previo) => !previo)}
        aria-expanded={abierto}
        aria-haspopup="menu"
        aria-label={abierto ? "Cerrar menú de creación" : "Crear incidencia o evento"}
        title="Crear incidencia o evento"
      >
        {abierto ? <X size={24} /> : <Plus size={26} />}
      </button>
    </div>
  );
}
