"use client";

import { PantallaDeError } from "@/components/PantallaDeError";

/**
 * La bitácora es donde se registra el trabajo del día. Si falla, lo primero que necesita saber
 * quien está en la calle es que lo que ya registró no se perdió.
 */
export default function Error({
  error,
  reset
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <PantallaDeError
      error={error}
      reset={reset}
      ambito="bitacora"
      titulo="La agenda no pudo cargarse"
      ayuda="Lo que ya habías registrado está guardado. Reintenta en un momento; si sigue igual, avisa a quien coordina tu equipo."
    />
  );
}
