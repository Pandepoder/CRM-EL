/**
 * Cola de reintento en el teléfono para las altas de campo (3.4 del plan).
 *
 * En la calle la señal se corta. Antes, un alta que no llegaba al servidor se perdía o había que
 * volver a capturarla, y si la señal volvía justo después de que el servidor la guardara, el
 * reintento creaba un duplicado. Ahora, si el envío no se confirma, el formulario queda guardado en
 * este teléfono y se reenvía solo cuando hay señal. Cada envío lleva su clave (`clientRequestId`) y
 * el servidor devuelve lo ya creado si la clave se repite (`lib/idempotencia.ts`): reenviar nunca
 * duplica.
 *
 * Qué se reintenta y qué no:
 *   - sin conexión, tiempo agotado, error del servidor (5xx), 408, 429 → a la cola;
 *   - 401 (la sesión caducó) → a la cola: se envía cuando la persona vuelva a entrar;
 *   - cualquier otro 4xx → no: el servidor dijo que algo está mal y hay que corregirlo. El
 *     formulario lo muestra junto al campo; si ya estaba en la cola, queda marcado como rechazado
 *     con su motivo, a la vista, hasta que alguien lo descarte.
 *
 * Cada envío guarda de quién es: en un teléfono compartido, lo que dejó una persona no se envía con
 * la sesión de otra (quedaría creado a nombre de quien no lo capturó). Los del registro público no
 * tienen dueño: no llevan sesión.
 *
 * Los datos esperan en `localStorage` de este navegador hasta que se envían, y entonces se borran.
 * Es un compromiso a sabiendas: perder el registro de alguien en un evento sin señal es peor que
 * tenerlo unos minutos en el teléfono de la brigada.
 */

export type TipoDeEnvio = "ciudadano" | "registro-publico" | "actividad" | "prospecto" | "incidencia";

export type EnvioEnCola = {
  /** El `clientRequestId` del envío: lo identifica en la cola y en el servidor. */
  clave: string;
  tipo: TipoDeEnvio;
  url: string;
  cuerpo: Record<string, unknown>;
  /** Lo que se enseña en el aviso: «Ciudadano: Ana López». Sin teléfonos ni domicilios. */
  descripcion: string;
  /** De quién es. `null`: registro público, sin sesión. */
  usuarioId: string | null;
  creadoEn: number;
  intentos: number;
  estado: "pendiente" | "rechazado";
  error?: string | undefined;
  /** El código con que el servidor lo rechazó: `telefono_repetido` se puede confirmar desde el aviso. */
  codigo?: string | undefined;
};

export type ResultadoEnvio =
  | { estado: "enviado"; http: number; datos: Record<string, unknown> }
  /** No se confirmó y quedó guardado en el teléfono: se enviará solo. */
  | { estado: "encolado"; motivo: MotivoDeEspera }
  /** El servidor lo rechazó: hay que corregir algo. No se guarda en la cola. */
  | { estado: "rechazado"; http: number; error: string; codigo?: string | undefined; campo?: string | undefined; datos: Record<string, unknown> }
  /** No se confirmó y este navegador no deja guardar (modo privado, sin espacio): los datos siguen en el formulario. */
  | { estado: "sin-cola"; error: string };

/** Por qué no se confirmó: el formulario lo dice con palabras distintas. */
export type MotivoDeEspera = "sin-senal" | "sesion" | "servidor";

export function motivoDeEspera(http: number): MotivoDeEspera {
  return http === 0 ? "sin-senal" : http === 401 ? "sesion" : "servidor";
}

export const TEXTO_DE_ESPERA: Record<MotivoDeEspera, string> = {
  "sin-senal": "No hay señal. Quedó guardado en este teléfono y se enviará solo en cuanto haya conexión.",
  sesion: "Tu sesión terminó. Quedó guardado en este teléfono y se enviará cuando vuelvas a entrar.",
  servidor: "El servidor no respondió bien. Quedó guardado en este teléfono y se volverá a intentar solo."
};

const LLAVE = "jalisco-os:cola-de-envios:v1";
export const EVENTO_COLA = "jalisco-os:cola-de-envios";
const ESPERA_MAXIMA_MS = 25_000;

/** Qué hacer con una respuesta HTTP. `0` es «no hubo respuesta». */
export function clasificarRespuesta(http: number): "enviado" | "reintentar" | "rechazado" {
  if (http >= 200 && http < 300) return "enviado";
  if (http === 0 || http === 401 || http === 408 || http === 429 || http >= 500) return "reintentar";
  return "rechazado";
}

function almacen(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function leerCola(): EnvioEnCola[] {
  try {
    const crudo = almacen()?.getItem(LLAVE);
    const lista = crudo ? (JSON.parse(crudo) as unknown) : [];
    return Array.isArray(lista) ? (lista as EnvioEnCola[]).filter((e) => e && typeof e.clave === "string" && typeof e.url === "string") : [];
  } catch {
    return [];
  }
}

function escribirCola(lista: EnvioEnCola[]): boolean {
  const a = almacen();
  if (!a) return false;
  try {
    if (lista.length === 0) a.removeItem(LLAVE);
    else a.setItem(LLAVE, JSON.stringify(lista));
  } catch {
    return false;
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO_COLA));
  return true;
}

/** Los envíos que le tocan a esta sesión: los suyos y los públicos. */
export function enviosDe(usuarioId: string | null, lista = leerCola()): EnvioEnCola[] {
  return lista.filter((e) => e.usuarioId === null || e.usuarioId === usuarioId);
}

export function descartarEnvio(clave: string): void {
  escribirCola(leerCola().filter((e) => e.clave !== clave));
}

/**
 * Un alta que se rechazó por teléfono repetido y que quien la capturó confirma que es otra persona
 * (una familia que comparte teléfono): vuelve a la cola con la confirmación, y se envía con lo demás.
 */
export function confirmarTelefonoRepetido(clave: string): void {
  escribirCola(leerCola().map((e) =>
    e.clave === clave && e.codigo === "telefono_repetido"
      ? { ...e, estado: "pendiente", error: undefined, codigo: undefined, cuerpo: { ...e.cuerpo, confirmarTelefonoRepetido: true } }
      : e
  ));
}

function guardarEnCola(envio: EnvioEnCola): boolean {
  const lista = leerCola().filter((e) => e.clave !== envio.clave);
  lista.push(envio);
  return escribirCola(lista);
}

type Intento = { http: number; datos: Record<string, unknown> };

async function intentar(url: string, cuerpo: Record<string, unknown>): Promise<Intento> {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), ESPERA_MAXIMA_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
      signal: control.signal
    });
    let datos: unknown = null;
    try {
      datos = await res.json();
    } catch {
      datos = null;
    }
    // Un «200» que no es la respuesta de la API —la página de acceso de la red WiFi de un salón,
    // por ejemplo— no confirma nada: se trata como si no hubiera habido respuesta.
    if (res.ok && (res.redirected || !datos || typeof datos !== "object")) return { http: 0, datos: {} };
    return { http: res.status, datos: (datos && typeof datos === "object" ? datos : {}) as Record<string, unknown> };
  } catch {
    return { http: 0, datos: {} };
  } finally {
    clearTimeout(reloj);
  }
}

function textoDeError(datos: Record<string, unknown>, porOmision: string): string {
  return typeof datos.error === "string" ? datos.error : typeof datos.message === "string" ? datos.message : porOmision;
}

/**
 * Envía un alta; si no se confirma, la deja en la cola del teléfono. El cuerpo debe llevar ya su
 * `clientRequestId`, el mismo que `clave`.
 */
export async function enviarOEncolar(envio: {
  clave: string;
  tipo: TipoDeEnvio;
  url: string;
  cuerpo: Record<string, unknown>;
  descripcion: string;
  usuarioId: string | null;
}): Promise<ResultadoEnvio> {
  const r = await intentar(envio.url, envio.cuerpo);
  const decision = clasificarRespuesta(r.http);
  if (decision === "enviado") {
    // Si ya estaba en la cola (un reintento desde el formulario), sale de ella.
    if (leerCola().some((e) => e.clave === envio.clave)) descartarEnvio(envio.clave);
    return { estado: "enviado", http: r.http, datos: r.datos };
  }
  if (decision === "rechazado") {
    return {
      estado: "rechazado",
      http: r.http,
      error: textoDeError(r.datos, "No se pudo guardar. Revisa los datos."),
      codigo: typeof r.datos.code === "string" ? r.datos.code : undefined,
      campo: typeof r.datos.campo === "string" ? r.datos.campo : undefined,
      datos: r.datos
    };
  }
  const guardado = guardarEnCola({ ...envio, creadoEn: Date.now(), intentos: 1, estado: "pendiente" });
  if (!guardado) {
    return { estado: "sin-cola", error: "No hay conexión y este navegador no permite guardar el registro para enviarlo después. Tus datos siguen aquí: vuelve a intentar cuando tengas señal." };
  }
  return { estado: "encolado", motivo: motivoDeEspera(r.http) };
}

export type ResumenCola = { enviados: number; pendientes: number; rechazados: number };

let enCurso: Promise<ResumenCola> | null = null;

/**
 * Reintenta los envíos pendientes de esta sesión, uno por uno. Se detiene en cuanto uno no obtiene
 * respuesta: sin señal, seguir probando solo gasta batería.
 */
export function procesarCola(usuarioId: string | null): Promise<ResumenCola> {
  if (enCurso) return enCurso;
  enCurso = (async () => {
    let enviados = 0;
    for (const envio of enviosDe(usuarioId).filter((e) => e.estado === "pendiente")) {
      const r = await intentar(envio.url, envio.cuerpo);
      const decision = clasificarRespuesta(r.http);
      const actual = leerCola();
      if (decision === "enviado") {
        escribirCola(actual.filter((e) => e.clave !== envio.clave));
        enviados++;
        continue;
      }
      escribirCola(actual.map((e) =>
        e.clave !== envio.clave
          ? e
          : decision === "rechazado"
            ? {
                ...e,
                estado: "rechazado",
                intentos: e.intentos + 1,
                error: textoDeError(r.datos, "El servidor no lo aceptó."),
                codigo: typeof r.datos.code === "string" ? r.datos.code : undefined
              }
            : { ...e, intentos: e.intentos + 1, error: r.http === 401 ? "Tu sesión terminó: vuelve a entrar para enviarlo." : undefined }
      ));
      if (r.http === 0 || r.http === 401) break;
    }
    const propios = enviosDe(usuarioId);
    return {
      enviados,
      pendientes: propios.filter((e) => e.estado === "pendiente").length,
      rechazados: propios.filter((e) => e.estado === "rechazado").length
    };
  })().finally(() => {
    enCurso = null;
  });
  return enCurso;
}

/** Una clave nueva para un formulario. `crypto.randomUUID` solo existe en contexto seguro. */
export function nuevaClave(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
