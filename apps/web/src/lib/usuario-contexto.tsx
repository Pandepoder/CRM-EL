"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Quién tiene la sesión abierta, para las pantallas de cliente que no lo reciben por props (el
 * mapa). Lo necesitan la cola de reintento del teléfono —cada envío guardado lleva de quién es, para
 * que en un teléfono compartido no se envíe con la sesión de otra persona (`lib/cola-de-envios.ts`)—
 * y el mapa, para no ofrecer acciones que la API va a rechazar.
 *
 * Solo sirve para decidir qué se enseña: la autorización la sigue haciendo cada ruta del servidor.
 */
export type UsuarioActual = {
  id: string;
  rol: string;
  /** Puede levantar incidencias y registrar actividades (la misma condición que la API). */
  puedeCoordinar: boolean;
};

const UsuarioActualContext = createContext<UsuarioActual | null>(null);

export function UsuarioActualProvider({ usuario, children }: Readonly<{ usuario: UsuarioActual; children: ReactNode }>) {
  return <UsuarioActualContext.Provider value={usuario}>{children}</UsuarioActualContext.Provider>;
}

export function useUsuarioActual(): UsuarioActual | null {
  return useContext(UsuarioActualContext);
}

export function useUsuarioActualId(): string | null {
  return useContext(UsuarioActualContext)?.id ?? null;
}
