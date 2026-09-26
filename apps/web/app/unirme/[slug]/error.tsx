"use client";

import { PantallaDeError } from "@/components/PantallaDeError";

/**
 * Alta de brigadista por QR. Mismo caso que el registro de ciudadanos: quien la abre todavía
 * no tiene cuenta, así que ni se le habla de "tu cuenta" ni se le saca de la página.
 */
export default function Error({
  error,
  reset
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <PantallaDeError
      error={error}
      reset={reset}
      ambito="unirme-publico"
      titulo="No pudimos abrir tu solicitud"
      ayuda="Es un problema momentáneo del sistema, no de tu teléfono. Espera unos segundos y vuelve a intentarlo."
      enlaceInicio={null}
    />
  );
}
