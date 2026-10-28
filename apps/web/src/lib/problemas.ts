import { getNavSection, puedeAbrir, rolesDeAcceso, SECCIONES_DEL_MENU, type PantallaDelPanel } from "@tonala/ui";

import type { UserNetworkScope } from "@/lib/network-hierarchy";

/**
 * «Reportar un problema» (plan de experiencia sencilla, §9): reglas que comparten la pantalla, la API y las
 * pruebas. Sin base de datos: la parte que guarda y lee está en `problemas-servicio.ts`.
 *
 * Quien reporta elige DÓNDE pasó entre las pantallas que su rol abre (las de su menú) y unas cuantas
 * funciones que no son una pantalla (lo que se guarda sin señal, «Mi día»…). Así no puede señalar —ni
 * enterarse de que existe— algo que no le toca, y quien revisa sabe exactamente qué menú falló.
 */

export type TipoDeProblema = "falla" | "no_entiendo" | "se_ve_mal" | "idea";

export const TIPOS_DE_PROBLEMA: ReadonlyArray<{
  clave: TipoDeProblema;
  etiqueta: string;
  emoji: string;
  /** La pregunta sobre el cuadro de texto. */
  pregunta: string;
  /** Para empezar a escribir con un toque. */
  frases: readonly string[];
}> = [
  {
    clave: "falla",
    etiqueta: "Algo falla",
    emoji: "🐞",
    pregunta: "¿Qué hiciste y qué pasó?",
    frases: ["No carga, se queda pensando.", "Toqué un botón y no hizo nada.", "Me salió un error.", "No se guardó lo que capturé.", "Me sacó de la pantalla."]
  },
  {
    clave: "no_entiendo",
    etiqueta: "No sé usarlo",
    emoji: "🤔",
    pregunta: "¿Qué querías hacer?",
    frases: ["No encuentro dónde se hace.", "No entiendo qué significa una palabra.", "No sé si se guardó."]
  },
  {
    clave: "se_ve_mal",
    etiqueta: "Se ve mal",
    emoji: "🎨",
    pregunta: "¿Qué se ve mal?",
    frases: ["La letra es muy chica.", "Algo se sale de la pantalla.", "Un botón tapa a otro."]
  },
  {
    clave: "idea",
    etiqueta: "Tengo una idea",
    emoji: "💡",
    pregunta: "¿Qué te ayudaría?",
    frases: ["Me gustaría poder…", "Sería más fácil si…"]
  }
];

export function esTipoDeProblema(valor: unknown): valor is TipoDeProblema {
  return TIPOS_DE_PROBLEMA.some((t) => t.clave === valor);
}

/**
 * ¿Puede este alcance ver (y, si es administración, contestar) un reporte de esta persona? Quien lo hizo,
 * siempre; administración, si la persona está en su alcance (el maestro, todas; un administrador municipal,
 * las de su municipio); nadie más: dirección y liderazgo no revisan reportes de la herramienta.
 */
export function puedeVerReporte(alcance: Pick<UserNetworkScope, "userId" | "isAdmin" | "isMaster" | "allowedUserIds">, creadoPor: string): boolean {
  if (creadoPor === alcance.userId) return true;
  if (!alcance.isAdmin) return false;
  if (alcance.isMaster) return true;
  return (alcance.allowedUserIds ?? []).includes(creadoPor);
}

export type EstadoDeProblema = "nuevo" | "en_revision" | "resuelto" | "descartado";

/** Cómo se llama cada estado para quien revisa y para quien reportó. */
export const ESTADOS_DE_PROBLEMA: Readonly<Record<EstadoDeProblema, { etiqueta: string; paraQuienReporta: string; estilo: string }>> = {
  nuevo: { etiqueta: "Nuevo", paraQuienReporta: "Recibido", estilo: "bg-blue-50 text-blue-800 border-blue-200" },
  en_revision: { etiqueta: "En revisión", paraQuienReporta: "Lo estamos revisando", estilo: "bg-amber-50 text-amber-900 border-amber-200" },
  resuelto: { etiqueta: "Resuelto", paraQuienReporta: "Resuelto", estilo: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  descartado: { etiqueta: "Cerrado sin cambios", paraQuienReporta: "Revisado, sin cambios", estilo: "bg-gray-100 text-gray-700 border-gray-200" }
};

export function esEstadoDeProblema(valor: unknown): valor is EstadoDeProblema {
  return typeof valor === "string" && Object.hasOwn(ESTADOS_DE_PROBLEMA, valor);
}

/**
 * Funciones que no son una pantalla del menú. Con `requiere`, solo se ofrecen a quien abre esa pantalla
 * (registrar resultados es de la Agenda; la ficha, del Directorio).
 */
export const FUNCIONES_PARA_REPORTAR: ReadonlyArray<{ clave: string; etiqueta: string; requiere?: PantallaDelPanel }> = [
  { clave: "funcion:ficha-ciudadano", etiqueta: "La ficha de un ciudadano", requiere: "/crm/contacts" },
  { clave: "funcion:resultado", etiqueta: "Registrar el resultado de una visita o actividad", requiere: "/equipo" },
  { clave: "funcion:sin-senal", etiqueta: "Lo que se guarda sin señal" },
  { clave: "funcion:mi-dia", etiqueta: "«Mi día», metas e insignias" },
  { clave: "funcion:qr", etiqueta: "Mi QR o enlace para registrar" },
  { clave: "funcion:recordatorios", etiqueta: "Recordatorios y avisos" },
  { clave: "funcion:avisar-incidencia", etiqueta: "Avisar de una incidencia", requiere: "/avisar-incidencia" },
  { clave: "funcion:entrar", etiqueta: "Entrar al sistema o mi contraseña" },
  { clave: "funcion:otro", etiqueta: "Otra cosa" }
];

export type LugarParaReportar = { clave: string; etiqueta: string; grupo: "pantalla" | "funcion" };

/** Lo que una persona puede señalar: las pantallas de su menú y las funciones que usa. */
export function lugaresParaReportar(rol: string, esMaestro = false): LugarParaReportar[] {
  const roles = rolesDeAcceso(rol, esMaestro);
  const pantallas: LugarParaReportar[] = SECCIONES_DEL_MENU.flatMap(({ clave }) => getNavSection(clave))
    .filter((i) => i.allowedRoles.some((r) => roles.includes(r)))
    .map((i) => ({ clave: i.href, etiqueta: i.label, grupo: "pantalla" }));
  const funciones: LugarParaReportar[] = FUNCIONES_PARA_REPORTAR.filter((f) => !f.requiere || roles.some((r) => puedeAbrir(f.requiere!, r))).map(
    (f) => ({ clave: f.clave, etiqueta: f.etiqueta, grupo: "funcion" })
  );
  return [...pantallas, ...funciones];
}

/** Rutas que no tienen entrada propia en el menú y marcan otra (se abren desde ella). */
const RUTAS_HIJAS: Readonly<Record<string, string>> = {
  "/reportes": "/admin-incidencias",
  "/historial-incidencias": "/admin-incidencias",
  "/admin-inbox": "/admin-incidencias",
  "/avisar-incidencia": "funcion:avisar-incidencia"
};

/**
 * El lugar que corresponde a la pantalla donde estaba la persona, para dejarlo elegido: la ficha de un
 * ciudadano (`/crm/contacts/<id>`) es su función; el resto, la entrada del menú que la gobierna. `null` si
 * no es ninguna de las que puede señalar.
 */
export function lugarDesdeRuta(ruta: string | null | undefined, lugares: readonly LugarParaReportar[]): string | null {
  if (!ruta || !ruta.startsWith("/")) return null;
  const camino = ruta.split(/[?#]/)[0]!.replace(/\/+$/, "") || "/";
  const claves = new Set(lugares.map((l) => l.clave));
  if (/^\/crm\/contacts\/[^/]+/.test(camino) && claves.has("funcion:ficha-ciudadano")) return "funcion:ficha-ciudadano";
  const hija = Object.entries(RUTAS_HIJAS).find(([r]) => camino === r || camino.startsWith(`${r}/`));
  if (hija && claves.has(hija[1])) return hija[1];
  const candidatas = lugares.filter((l) => l.grupo === "pantalla" && (camino === l.clave || camino.startsWith(`${l.clave}/`)));
  return candidatas.sort((a, b) => b.clave.length - a.clave.length)[0]?.clave ?? null;
}

export const LARGO_MAXIMO_DESCRIPCION = 2000;
export const LARGO_MAXIMO_RESPUESTA = 1000;

export type DatosDelDispositivo = { navegador?: string; pantalla?: string; enLinea?: boolean; idioma?: string };

export type EntradaDeReporte = {
  lugar: string;
  lugarEtiqueta: string;
  tipo: TipoDeProblema;
  descripcion: string;
  foto: string | null;
  ruta: string | null;
  error: string | null;
  dispositivo: DatosDelDispositivo | null;
  clientRequestId: string | null;
};

export type ValidacionDeReporte = { ok: true; entrada: EntradaDeReporte } | { ok: false; campo: string; mensaje: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const texto = (v: unknown, max: number): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/**
 * Valida lo que manda el formulario contra los lugares de quien reporta. El contexto técnico (ruta, error,
 * dispositivo) se recorta y se queda solo con lo esperado: nunca se guarda algo que no se pidió.
 */
export function validarReporte(cuerpo: unknown, lugares: readonly LugarParaReportar[]): ValidacionDeReporte {
  const c = (cuerpo && typeof cuerpo === "object" ? cuerpo : {}) as Record<string, unknown>;
  const lugar = lugares.find((l) => l.clave === c.lugar);
  if (!lugar) return { ok: false, campo: "lugar", mensaje: "Elige de la lista dónde pasó." };
  if (!esTipoDeProblema(c.tipo)) return { ok: false, campo: "tipo", mensaje: "Elige qué pasó: si algo falla, no se entiende, se ve mal o es una idea." };
  const descripcion = typeof c.descripcion === "string" ? c.descripcion.trim() : "";
  if (descripcion.length < 3) return { ok: false, campo: "descripcion", mensaje: "Cuéntanos en pocas palabras qué pasó." };
  if (descripcion.length > LARGO_MAXIMO_DESCRIPCION) {
    return { ok: false, campo: "descripcion", mensaje: `Es demasiado largo: resúmelo en ${LARGO_MAXIMO_DESCRIPCION} letras o menos.` };
  }
  const foto = c.foto === null || c.foto === undefined || c.foto === "" ? null : typeof c.foto === "string" ? c.foto : undefined;
  if (foto === undefined) return { ok: false, campo: "foto", mensaje: "La captura no es válida: vuelve a adjuntarla." };
  const clientRequestId = typeof c.clientRequestId === "string" && UUID.test(c.clientRequestId) ? c.clientRequestId : null;

  const ruta = texto(c.ruta, 300);
  const d = (c.dispositivo && typeof c.dispositivo === "object" ? c.dispositivo : null) as Record<string, unknown> | null;
  const dispositivo: DatosDelDispositivo | null = d
    ? {
        ...(texto(d.navegador, 300) ? { navegador: texto(d.navegador, 300)! } : {}),
        ...(typeof d.pantalla === "string" && /^\d{2,5}x\d{2,5}$/.test(d.pantalla) ? { pantalla: d.pantalla } : {}),
        ...(typeof d.enLinea === "boolean" ? { enLinea: d.enLinea } : {}),
        ...(texto(d.idioma, 20) ? { idioma: texto(d.idioma, 20)! } : {})
      }
    : null;

  return {
    ok: true,
    entrada: {
      lugar: lugar.clave,
      lugarEtiqueta: lugar.etiqueta,
      tipo: c.tipo,
      descripcion,
      foto,
      ruta: ruta && ruta.startsWith("/") ? ruta : null,
      error: texto(c.error, 500),
      dispositivo: dispositivo && Object.keys(dispositivo).length > 0 ? dispositivo : null,
      clientRequestId
    }
  };
}

// ── Del aviso de error al formulario ────────────────────────────────────────────────────────────────

const CLAVE_CONTEXTO = "reportar-problema:contexto";

export type ContextoDelReporte = { ruta: string; error: string | null };

/**
 * Lo que ve la persona cuando toca «Reportar» en un aviso de error o en «No pudimos cargar esta pantalla»:
 * dónde estaba y qué le dijo el sistema. Va por `sessionStorage` y no en la dirección de la página, para no
 * dejar el texto del error en el historial del navegador.
 */
export function guardarContextoDelReporte(contexto: ContextoDelReporte): void {
  try {
    window.sessionStorage.setItem(CLAVE_CONTEXTO, JSON.stringify({ ...contexto, cuando: Date.now() }));
  } catch {
    /* sin almacenamiento: el formulario igual elige la pantalla por la dirección */
  }
}

/** El contexto guardado hace menos de 10 minutos, y se borra al leerlo. */
export function leerContextoDelReporte(): ContextoDelReporte | null {
  try {
    const valor = window.sessionStorage.getItem(CLAVE_CONTEXTO);
    window.sessionStorage.removeItem(CLAVE_CONTEXTO);
    if (!valor) return null;
    const c = JSON.parse(valor) as { ruta?: unknown; error?: unknown; cuando?: unknown };
    if (typeof c.ruta !== "string" || typeof c.cuando !== "number" || Date.now() - c.cuando > 10 * 60_000) return null;
    return { ruta: c.ruta, error: typeof c.error === "string" ? c.error : null };
  } catch {
    return null;
  }
}

const CLAVE_ULTIMA_PANTALLA = "reportar-problema:ultima-pantalla";

/**
 * La última pantalla donde estuvo la persona antes de abrir «Reportar un problema» desde el menú: así el
 * formulario ya dice «¿Fue en Agenda?» y no hay que buscarla en la lista. La anota el armazón del panel en
 * cada cambio de pantalla; la del propio formulario no cuenta.
 */
export function anotarUltimaPantalla(ruta: string): void {
  if (!ruta.startsWith("/") || ruta.startsWith("/reportar-problema")) return;
  try {
    window.sessionStorage.setItem(CLAVE_ULTIMA_PANTALLA, ruta);
  } catch {
    /* sin almacenamiento: la lista llega sin elegir */
  }
}

export function leerUltimaPantalla(): string | null {
  try {
    return window.sessionStorage.getItem(CLAVE_ULTIMA_PANTALLA);
  } catch {
    return null;
  }
}

/**
 * ¿Tiene quien reportó una respuesta que no ha visto? Sí, si administración cambió el estado después de la
 * última vez que la persona abrió sus reportes. Lo que cambia la propia persona (administración que revisa
 * lo suyo) no cuenta: ya lo sabe.
 */
export function hayRespuestaNueva(r: {
  createdByUserId: string;
  statusChangedByUserId: string | null;
  statusChangedAt: Date | null;
  reporterSeenAt: Date | null;
}): boolean {
  if (!r.statusChangedAt || !r.statusChangedByUserId || r.statusChangedByUserId === r.createdByUserId) return false;
  return !r.reporterSeenAt || r.reporterSeenAt < r.statusChangedAt;
}

/** La dirección del formulario, con la pantalla de donde viene. */
export function rutaParaReportar(desde: string): string {
  return `/reportar-problema?desde=${encodeURIComponent(desde.split(/[?#]/)[0] ?? "/")}`;
}
