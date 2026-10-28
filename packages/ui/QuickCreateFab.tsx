"use client";

import { useEffect, useRef, useState } from "react";

import { AlertTriangle, CalendarPlus, Megaphone, MessageSquarePlus, Plus, UserPlus, X } from "lucide-react";

import { opcionesDelBotonMas, type OpcionDelBotonMas } from "./boton-mas.js";

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

const ICONOS: Record<OpcionDelBotonMas["icono"], typeof AlertTriangle> = {
  ciudadano: UserPlus,
  incidencia: AlertTriangle,
  evento: CalendarPlus,
  aviso: Megaphone,
  peticion: MessageSquarePlus
};

export function QuickCreateFab({
  puedeCoordinar,
  puedeRegistrar = false,
  puedeAvisar = false,
  puedeAnotarPeticion = false
}: Readonly<{ puedeCoordinar: boolean; puedeRegistrar?: boolean; puedeAvisar?: boolean; puedeAnotarPeticion?: boolean }>) {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement | null>(null);

  const opciones = opcionesDelBotonMas(puedeCoordinar, puedeRegistrar, puedeAvisar, puedeAnotarPeticion).map((o) => ({ ...o, icono: ICONOS[o.icono] }));

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

  // Sin nada que ofrecer no se pinta el botón: vale más que no esté a que abra un menú vacío.
  if (opciones.length === 0) return null;

  // Con una sola opción (el brigadista: avisar), un menú de una línea es un toque de más.
  const unica = opciones.length === 1 ? opciones[0] : null;
  if (unica) {
    return (
      <div className="fab-creacion">
        <a className="fab-boton" href={unica.href} aria-label={`${unica.etiqueta}: ${unica.ayuda}`} title={unica.ayuda}>
          <Plus size={26} />
        </a>
      </div>
    );
  }

  return (
    <div className="fab-creacion" ref={contenedor}>
      {abierto ? (
        <div className="fab-menu" role="menu" aria-label="Qué quieres crear">
          {opciones.map((opcion) => {
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
        aria-label={abierto ? "Cerrar menú de creación" : `Crear: ${opciones.map((o) => o.etiqueta.toLowerCase()).join(", ")}`}
        title="Crear"
      >
        {abierto ? <X size={24} /> : <Plus size={26} />}
      </button>
    </div>
  );
}
