/**
 * Altas que se crean una sola vez aunque lleguen dos veces (R16).
 *
 * En campo, el mismo formulario llega dos veces al servidor: un doble toque, o un reintento
 * después de un corte de señal cuando el servidor sí alcanzó a guardar pero la respuesta no llegó
 * al teléfono. Sin esto cada vez se creaba otro ciudadano, otro prospecto u otra incidencia.
 *
 * El teléfono genera una clave (`clientRequestId`, un UUID) al abrir el formulario y la manda con
 * cada intento; solo cambia cuando el alta se confirmó. La tabla la guarda con un índice único
 * parcial. Si la clave ya existe se devuelve lo creado; si dos intentos llegan a la vez, el índice
 * deja pasar a uno y el otro recibe lo que creó el primero.
 *
 * La clave de otra persona no se acepta: devolvería el registro ajeno a quien no lo creó.
 */

const ERROR_UNICO = "23505";

/** ¿Es una violación de índice único? Con `indice`, solo si es la de ese índice. */
export function esViolacionUnica(error: unknown, indice?: string): boolean {
  const candidatos = [error, (error as { cause?: unknown } | null)?.cause];
  return candidatos.some((e) => {
    const pg = e as { code?: unknown; constraint?: unknown } | null | undefined;
    return pg?.code === ERROR_UNICO && (indice === undefined || pg.constraint === indice);
  });
}

export type ResultadoUnaSolaVez<T> =
  | { ok: true; fila: T; repetida: boolean }
  | { ok: false; motivo: "clave_ajena" };

export async function crearUnaSolaVez<T>(opciones: {
  /** La clave del formulario. Sin clave, se crea sin más (clientes que todavía no la mandan). */
  clave: string | null | undefined;
  /** Nombre del índice único de la clave: otra violación única no se confunde con un reintento. */
  indice: string;
  buscar: (clave: string) => Promise<T | undefined>;
  crear: () => Promise<T>;
  /** Quién creó la fila encontrada, para no entregar lo ajeno. */
  creadaPor: (fila: T) => string;
  /** Quién está creando ahora. */
  quien: string;
}): Promise<ResultadoUnaSolaVez<T>> {
  const { clave } = opciones;
  const yaCreada = async (): Promise<ResultadoUnaSolaVez<T> | null> => {
    if (!clave) return null;
    const previa = await opciones.buscar(clave);
    if (!previa) return null;
    return opciones.creadaPor(previa) === opciones.quien ? { ok: true, fila: previa, repetida: true } : { ok: false, motivo: "clave_ajena" };
  };

  const previa = await yaCreada();
  if (previa) return previa;
  try {
    return { ok: true, fila: await opciones.crear(), repetida: false };
  } catch (error) {
    // Dos intentos simultáneos con la misma clave: el índice dejó pasar al otro.
    if (clave && esViolacionUnica(error, opciones.indice)) {
      const ganadora = await yaCreada();
      if (ganadora) return ganadora;
    }
    throw error;
  }
}
