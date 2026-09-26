"use client";

import { PantallaDeError } from "@/components/PantallaDeError";

/**
 * Frontera de raíz: cubre lo que queda por encima del panel, sobre todo los fallos del
 * propio `(shell)/layout.tsx`.
 *
 * El detalle importa: Next atrapa el error de un layout en la frontera del segmento PADRE,
 * no en la suya. El layout del panel consulta la base —municipio, rol y alcance de quien
 * entra—, así que si la base no responde, su error salta por encima de `(shell)/error.tsx`.
 * Sin esta pantalla acababa en `global-error.tsx`, que reemplaza el documento entero y se
 * queda sin estilos ni navegación. Comprobado apagando la base.
 */
export default function Error({
  error,
  reset
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <PantallaDeError
      error={error}
      reset={reset}
      ambito="raiz"
      titulo="El sistema no está respondiendo"
      ayuda="No es tu teléfono ni tu cuenta. Suele durar poco: reintenta en un momento y, si sigue igual, avisa a quien te dio el acceso."
    />
  );
}
