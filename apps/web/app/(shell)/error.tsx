"use client";

import { PantallaDeError } from "@/components/PantallaDeError";

/**
 * Frontera de error de todo el panel. El menú sigue en pie porque vive en el layout: quien se
 * topa con esto puede irse a otra pantalla sin cerrar sesión ni recargar a mano.
 */
export default function Error({
  error,
  reset
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <PantallaDeError
      error={error}
      reset={reset}
      ambito="panel"
      titulo="No pudimos cargar esta pantalla"
      ayuda="El resto del panel sigue funcionando: puedes moverte por el menú. Vuelve a intentarlo y, si sigue igual, avisa a quien te dio el acceso."
    />
  );
}
