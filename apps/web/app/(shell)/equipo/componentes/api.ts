/**
 * Llamadas a la API de la bitácora. Devuelven un resultado en vez de lanzar: la interfaz decide
 * dónde mostrar el error (junto al campo, en la ficha…) y no recurre a `alert()`.
 */
export type RespuestaApi<T> =
  | { ok: true; datos: T }
  | { ok: false; error: string; campo?: string | undefined; codigo?: string | undefined; estado: number };

export async function llamar<T = Record<string, unknown>>(
  url: string,
  init?: { method?: string; cuerpo?: unknown; signal?: AbortSignal }
): Promise<RespuestaApi<T>> {
  try {
    const opciones: RequestInit = { method: init?.method ?? (init?.cuerpo === undefined ? "GET" : "POST") };
    if (init?.cuerpo !== undefined) {
      opciones.headers = { "Content-Type": "application/json" };
      opciones.body = JSON.stringify(init.cuerpo);
    }
    if (init?.signal) opciones.signal = init.signal;
    const res = await fetch(url, opciones);
    const datos = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return {
        ok: false,
        estado: res.status,
        error: typeof datos.error === "string" ? datos.error : typeof datos.message === "string" ? datos.message : "No se pudo completar la operación.",
        campo: typeof datos.campo === "string" ? datos.campo : undefined,
        codigo: typeof datos.code === "string" ? datos.code : undefined
      };
    }
    return { ok: true, datos: datos as T };
  } catch (error) {
    if ((error as { name?: string }).name === "AbortError") return { ok: false, estado: 0, error: "Cancelado" };
    return { ok: false, estado: 0, error: "Sin conexión con el servidor. Revisa tu red e inténtalo de nuevo." };
  }
}
