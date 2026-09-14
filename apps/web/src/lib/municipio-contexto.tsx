"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Municipio de quien tiene la sesión abierta, disponible para las pantallas de cliente.
 *
 * El mapa y los formularios son componentes de cliente: no pueden consultar la base. Antes
 * resolvían el municipio por su cuenta y todos terminaban en Tonalá. El shell lo lee una vez
 * en el servidor y lo baja por aquí, así que el mapa abre en el municipio de la persona y los
 * formularios lo proponen sin que nadie lo escriba.
 */
const MunicipioUsuarioContext = createContext<string | null>(null);

export function MunicipioUsuarioProvider({
  municipio,
  children
}: Readonly<{ municipio: string | null; children: ReactNode }>) {
  return <MunicipioUsuarioContext.Provider value={municipio}>{children}</MunicipioUsuarioContext.Provider>;
}

/** Municipio de la persona con sesión, o null si todavía no tiene uno asignado. */
export function useMunicipioUsuario(): string | null {
  return useContext(MunicipioUsuarioContext);
}
