/**
 * Registro estructurado: una línea JSON por evento, con el identificador de la petición.
 *
 * Antes cada ruta escribía `console.error("Algo falló:", error)` con su propio texto y sin nada que
 * uniera esa línea con la petición que la produjo. Cuando alguien en campo reportaba un error, no
 * había forma de encontrar SU línea entre las de todos los demás.
 *
 * El identificador lo pone el middleware en la cabecera `x-request-id` de cada petición y lo
 * devuelve en la respuesta. `actorFromSession` usa el mismo como `correlationId`, así que llega
 * también a `audit_logs` y a los eventos del outbox: una petición se sigue de punta a punta.
 */

export const CABECERA_ID_DE_PETICION = "x-request-id";

/** El identificador de la petición en curso, o null fuera de una petición (arranque, scripts). */
export async function idDePeticion(): Promise<string | null> {
  try {
    const { headers } = await import("next/headers");
    return (await headers()).get(CABECERA_ID_DE_PETICION);
  } catch {
    return null;
  }
}

type Nivel = "error" | "warn" | "info";

/** El `code` de un error de Postgres o de Node, si lo trae. */
function codigoDe(valor: unknown): string | undefined {
  const codigo = (valor as { code?: unknown } | null | undefined)?.code;
  return typeof codigo === "string" ? codigo : undefined;
}

/**
 * Drizzle arma el mensaje de todo error de consulta como `Failed query: <sql>\nparams: <valores>`,
 * y la traza lo repite. Los valores son los datos que se estaban escribiendo: el nombre del
 * ciudadano va en claro (comprobado con un alta que choca con una clave foránea), y esta línea
 * termina en los registros del servidor, que se guardan y se comparten para depurar. Se conserva la
 * consulta —dice qué falló— y se quitan los valores. En la traza los valores llegan hasta la primera
 * línea `    at …`; en el mensaje, hasta el final.
 */
export function sinValoresDeConsulta(texto: string): string {
  return texto.replace(/\nparams: [\s\S]*?(?=\n {4}at |$)/g, "\nparams: [omitidos]");
}

/**
 * Postgres repite en su propio mensaje el valor que no pudo convertir, al final y entre comillas:
 * `invalid input syntax for type uuid: "…"`, `date/time field value out of range: "…"`,
 * `invalid input value for enum …: "…"`. Visto con `next start`. Los nombres de tabla, columna o
 * restricción van entre comillas pero nunca tras «: », así que se conservan.
 */
export function sinValoresDePostgres(texto: string): string {
  return texto.replace(/: "(?:[^"\\\n]|\\.)*"(?=\n|$)/g, ": [omitido]");
}

const limpiar = (texto: string) => sinValoresDePostgres(sinValoresDeConsulta(texto));

/**
 * Campos de un error de `pg` que no llevan datos. Se deja fuera a propósito `detail`, que en un
 * duplicado es `Key (email)=(…) already exists.`: el valor en claro.
 */
const CAMPOS_SIN_DATOS = ["digest", "code", "severity", "constraint", "table", "column", "schema", "dataType", "routine", "where"];

function llevaValores(error: Error): boolean {
  for (let e: unknown = error, n = 0; e instanceof Error && n < 5; e = e.cause, n++) {
    if (e.message.includes("\nparams: ") || "severity" in e) return true;
  }
  return false;
}

/** Copia del error, y de su cadena de causas, sin valores. El original no se toca. */
function errorSinValores(error: Error, profundidad = 0): Error {
  const copia = new Error(limpiar(error.message));
  copia.name = error.name;
  // Sin traza en el original, la copia tampoco lleva una: la suya apuntaría aquí y confundiría.
  if (error.stack) copia.stack = limpiar(error.stack);
  else delete copia.stack;
  const origen = error as unknown as Record<string, unknown>;
  const destino = copia as unknown as Record<string, unknown>;
  for (const campo of CAMPOS_SIN_DATOS) if (origen[campo] !== undefined) destino[campo] = origen[campo];
  if (error.cause instanceof Error && profundidad < 5) copia.cause = errorSinValores(error.cause, profundidad + 1);
  return copia;
}

type ConsolaDeErrores = Pick<Console, "error" | "warn">;
const consolasProtegidas = new WeakSet<object>();

/**
 * Los errores que nadie atrapa —en una pantalla o en una acción de servidor— no pasan por
 * `registrarError`: los escribe Next con su propio `console.error`. Comprobado con `next start`:
 * `/perfil/no-es-uuid` dejó en el registro `Failed query: select … params: no-es-uuid,1`. Si lo que
 * falla es un alta, ahí va el nombre del ciudadano. Se envuelven `console.error` y `console.warn`
 * una sola vez, al arrancar (`instrumentation.ts`), para que ningún texto ni ningún error salga con
 * los valores de una consulta. El resto de la línea —la consulta, la traza, el `digest` que el
 * usuario ve en la pantalla de error— se conserva.
 */
export function protegerConsola(consola: ConsolaDeErrores = console): void {
  if (consolasProtegidas.has(consola)) return;
  consolasProtegidas.add(consola);
  for (const nivel of ["error", "warn"] as const) {
    const original = consola[nivel].bind(consola);
    consola[nivel] = (...args: unknown[]) => original(...args.map(sinValoresEnArgumento));
  }
}

function sinValoresEnArgumento(valor: unknown): unknown {
  if (typeof valor === "string") return valor.includes("\nparams: ") ? sinValoresDeConsulta(valor) : valor;
  // Una copia y no el original: el error sigue su camino (Next lo necesita intacto) y lo que se
  // imprime es otro objeto, sin la propiedad `params` que Drizzle le cuelga ni el `detail` de pg.
  if (valor instanceof Error && llevaValores(valor)) return errorSinValores(valor);
  return valor;
}

function describirError(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) return { mensaje: String(error) };
  // Drizzle envuelve el error de `pg` en `cause`: ahí vienen el código de Postgres y el detalle.
  const causa: unknown = error.cause;
  const codigo = codigoDe(error) ?? codigoDe(causa);
  return {
    mensaje: limpiar(error.message),
    tipo: error.name,
    ...(causa instanceof Error ? { causa: limpiar(causa.message) } : {}),
    ...(codigo ? { codigo } : {}),
    // La traza se conserva: es lo que más sirve para depurar, y el `console.error` de antes la
    // imprimía. Va dentro del JSON, escapada, así que no rompe la línea.
    ...(error.stack ? { traza: limpiar(error.stack) } : {})
  };
}

/**
 * Escribe un evento. Nunca lanza ni hay que esperarlo: es un sustituto directo de `console.*`, y un
 * fallo al registrar no puede convertirse en un segundo fallo de la petición.
 */
export function registrar(nivel: Nivel, evento: string, datos: Record<string, unknown> = {}): void {
  void (async () => {
    try {
      const peticion = await idDePeticion();
      const linea = JSON.stringify({ t: new Date().toISOString(), nivel, evento, ...(peticion ? { peticion } : {}), ...datos });
      console[nivel](linea);
    } catch {
      console[nivel](`[registro] ${evento}`);
    }
  })();
}

/** Atajo para el caso más común: un error atrapado en una ruta o una acción. */
export function registrarError(evento: string, error: unknown, datos: Record<string, unknown> = {}): void {
  registrar("error", evento, { ...datos, error: describirError(error) });
}
