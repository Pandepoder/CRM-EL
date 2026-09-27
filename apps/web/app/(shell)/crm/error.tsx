"use client";

import { PantallaDeError } from "@/components/PantallaDeError";

/**
 * Directorio, alta de ciudadanos y ficha de cada persona.
 */
export default function Error({
  error,
  reset
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <PantallaDeError
      error={error}
      reset={reset}
      ambito="directorio"
      titulo="El directorio no pudo cargarse"
      ayuda="Los registros no se perdieron: es la consulta la que falló. Reintenta en un momento."
    />
  );
}
