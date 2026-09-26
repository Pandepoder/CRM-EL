"use client";

import { PantallaDeError } from "@/components/PantallaDeError";

/**
 * Registro de ciudadanos por QR. Es la página pública que más carga recibe —un mitin es mucha
 * gente escaneando a la vez— y la única donde quien la ve no tiene cuenta.
 *
 * Sin esta frontera caía en la de raíz, que habla de "tu cuenta" y ofrece ir al inicio: para
 * alguien sin sesión, el inicio es Conóceme, así que salía del formulario a medio registrar.
 * Aquí solo se ofrece reintentar, que lo deja en la misma página.
 */
export default function Error({
  error,
  reset
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <PantallaDeError
      error={error}
      reset={reset}
      ambito="registro-publico"
      titulo="No pudimos abrir el registro"
      ayuda="Es un problema momentáneo del sistema, no de tu teléfono. Espera unos segundos y vuelve a intentarlo."
      enlaceInicio={null}
    />
  );
}
