"use client";

import { PantallaDeError } from "@/components/PantallaDeError";

/**
 * El mapa es la pantalla más usada en campo y la más pesada: carga cartografía, ciudadanos e
 * incidencias a la vez. Su propia frontera evita que un fallo suyo tape el panel entero.
 */
export default function Error({
  error,
  reset
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <PantallaDeError
      error={error}
      reset={reset}
      ambito="mapa"
      titulo="El mapa no pudo abrirse"
      ayuda="Puedes seguir trabajando desde la Agenda o el Directorio mientras tanto. Si estás con poca señal, espera a tener mejor cobertura y reintenta."
    />
  );
}
