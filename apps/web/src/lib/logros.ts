/**
 * Metas, rachas e insignias de «Mi día» (plan de experiencia sencilla, agente 5).
 *
 * Todo se calcula en vivo con los conteos de `mi-progreso.ts`: no hay tabla de insignias. Así, si se da de
 * baja un registro basura, la insignia que dependía de él se recalcula sola. Este archivo es lógica pura
 * —sin base ni navegador— para que se pueda probar y usar igual en el servidor y en la tarjeta.
 */

/** Lo que hizo una persona, contado sobre sus propios registros. */
export type Conteos = {
  /** Ciudadanos activos que registró ella misma (sin los que llegaron por su QR). */
  registros: number;
  /** De esos, con sección y contados por teléfono distinto: capturar dos veces el mismo número no suma. */
  registrosCompletos: number;
  /** Ciudadanos propios con su punto exacto en el mapa. */
  conUbicacion: number;
  /** Personas que se registraron solas con su QR o enlace personal. */
  porMiEnlace: number;
  /** Visitas y actividades que cerró. */
  cierres: number;
  /** Cierres con resultado exitoso o con acuerdo. */
  cierresBuenos: number;
  /** Prospectos que pasó al directorio. */
  convertidos: number;
  /** Peticiones de Escucha Social que levantó. */
  escucha: number;
  /** Días distintos (de Jalisco) con alguna actividad. */
  diasActivos: number;
};

/** Qué hace cada quien: define qué insignias le tocan y su meta. */
export type PerfilDeTrabajo = {
  /** Puede registrar ciudadanos (abre `/crm/nuevo`). */
  registra: boolean;
  /** Hace visitas o cierra actividades (todos menos capturista). */
  haceCampo: boolean;
};

export function perfilDeTrabajo(rol: string): PerfilDeTrabajo {
  return {
    registra: rol !== "visit_responsible",
    haceCampo: rol !== "capturist"
  };
}

// ── Meta del día ────────────────────────────────────────────────────────────────────────────────────

export type Ritmo = "tranquilo" | "normal" | "con_todo";

export const RITMOS: ReadonlyArray<{ clave: Ritmo; etiqueta: string; factor: number }> = [
  { clave: "tranquilo", etiqueta: "Tranquilo", factor: 0.5 },
  { clave: "normal", etiqueta: "Normal", factor: 1 },
  { clave: "con_todo", etiqueta: "Con todo", factor: 2 }
];

/** Acciones al día con ritmo normal: quien registra suma más rápido que quien camina a cada puerta. */
export function metaBase(perfil: PerfilDeTrabajo): number {
  return perfil.registra ? 10 : 5;
}

export function metaDelDia(perfil: PerfilDeTrabajo, ritmo: Ritmo = "normal"): number {
  const factor = RITMOS.find((r) => r.clave === ritmo)?.factor ?? 1;
  return Math.max(1, Math.round(metaBase(perfil) * factor));
}

export function esRitmo(valor: unknown): valor is Ritmo {
  return valor === "tranquilo" || valor === "normal" || valor === "con_todo";
}

// ── Meta que fija el líder (0026; §4, decisión 4) ───────────────────────────────────────────────────

export const META_MINIMA = 1;
export const META_MAXIMA = 200;

/** Una meta que se puede guardar: un entero de 1 a 200 acciones al día. */
export function esMetaValida(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isInteger(valor) && valor >= META_MINIMA && valor <= META_MAXIMA;
}

/**
 * La meta con la que se mide el día. Si quien manda sobre la persona le puso una, esa; si no, la de su
 * rol con el ritmo que ella eligió en su teléfono. La del líder no se ajusta con el ritmo: es un acuerdo
 * entre los dos, y la persona puede rebasarla cuando quiera.
 */
export function metaVigente(perfil: PerfilDeTrabajo, ritmo: Ritmo, metaDelLider: number | null | undefined): number {
  return esMetaValida(metaDelLider) ? metaDelLider : metaDelDia(perfil, ritmo);
}

/** Las tres opciones rápidas para quien fija la meta de alguien: los ritmos de su rol. */
export function opcionesDeMeta(perfil: PerfilDeTrabajo): Array<{ etiqueta: string; meta: number }> {
  return RITMOS.map((r) => ({ etiqueta: r.etiqueta, meta: metaDelDia(perfil, r.clave) }));
}

// ── Medallas de la semana (§4, decisión 2) ──────────────────────────────────────────────────────────

/**
 * Las medallas del Resumen miden a cada quien contra su propia meta, no contra los demás: antes eran
 * oro, plata y bronce para los tres primeros lugares, y dos personas que cumplían igual quedaban en
 * escalones distintos. Ahora cuentan los días de la semana (lunes a domingo) en que la persona llegó a su
 * meta del día; varias pueden tener oro a la vez.
 */
export type Medalla = "oro" | "plata" | "bronce";

export const MEDALLAS: Readonly<Record<Medalla, { emoji: string; nombre: string; dias: number }>> = {
  oro: { emoji: "🥇", nombre: "Oro", dias: 3 },
  plata: { emoji: "🥈", nombre: "Plata", dias: 2 },
  bronce: { emoji: "🥉", nombre: "Bronce", dias: 1 }
};

export function medallaDeLaSemana(diasCumplidos: number): Medalla | null {
  if (diasCumplidos >= MEDALLAS.oro.dias) return "oro";
  if (diasCumplidos >= MEDALLAS.plata.dias) return "plata";
  if (diasCumplidos >= MEDALLAS.bronce.dias) return "bronce";
  return null;
}

/** Los siete días (AAAA-MM-DD) de la semana de `hoy`, de lunes a domingo. */
export function diasDeLaSemana(hoy: string): string[] {
  const [a, m, d] = lunesDe(hoy).split("-").map(Number);
  return Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(a ?? 1970, (m ?? 1) - 1, (d ?? 1) + i)).toISOString().slice(0, 10));
}

/** En cuántos de esos días las acciones llegaron a la meta. */
export function diasConMeta(porDia: Readonly<Record<string, number>>, dias: readonly string[], meta: number): number {
  return dias.filter((dia) => (porDia[dia] ?? 0) >= meta).length;
}

// ── Total del equipo (§4, decisión 3) ───────────────────────────────────────────────────────────────

/**
 * Personas activas que necesita una brigada para que a sus integrantes se les enseñe el total de la
 * semana. Con menos, el total menos lo propio deja adivinar lo de cada compañero.
 */
export const MINIMO_PARA_TOTAL_DE_BRIGADA = 4;

// ── Racha semanal ───────────────────────────────────────────────────────────────────────────────────

/** Días activos que hacen falta para que una semana cuente en la racha. */
export const DIAS_POR_SEMANA_DE_RACHA = 2;

const DIA_MS = 86_400_000;

/** Lunes (AAAA-MM-DD) de la semana de un día AAAA-MM-DD. Aritmética de calendario, sin zona horaria. */
export function lunesDe(dia: string): string {
  const [a, m, d] = dia.split("-").map(Number);
  const t = Date.UTC(a ?? 1970, (m ?? 1) - 1, d ?? 1);
  const diaSemana = (new Date(t).getUTCDay() + 6) % 7; // lunes = 0
  return new Date(t - diaSemana * DIA_MS).toISOString().slice(0, 10);
}

function lunesAnterior(lunes: string): string {
  const [a, m, d] = lunes.split("-").map(Number);
  return new Date(Date.UTC(a ?? 1970, (m ?? 1) - 1, (d ?? 1) - 7)).toISOString().slice(0, 10);
}

/**
 * Semanas seguidas con al menos dos días activos. Semanal y no diaria a propósito: una racha diaria
 * castiga a quien ayuda solo los fines de semana.
 *
 * La semana en curso suma si ya llegó a dos días; si todavía no, no rompe la racha: se cuenta desde la
 * anterior (aún hay tiempo de cumplirla).
 */
export function rachaSemanal(dias: readonly string[], hoy: string): number {
  const porSemana = new Map<string, number>();
  for (const dia of new Set(dias)) {
    const lunes = lunesDe(dia);
    porSemana.set(lunes, (porSemana.get(lunes) ?? 0) + 1);
  }
  let semana = lunesDe(hoy);
  let racha = 0;
  if ((porSemana.get(semana) ?? 0) >= DIAS_POR_SEMANA_DE_RACHA) racha++;
  semana = lunesAnterior(semana);
  while ((porSemana.get(semana) ?? 0) >= DIAS_POR_SEMANA_DE_RACHA) {
    racha++;
    semana = lunesAnterior(semana);
  }
  return racha;
}

// ── Insignias ───────────────────────────────────────────────────────────────────────────────────────

export type Insignia = {
  clave: string;
  nombre: string;
  /** Qué hay que hacer, dicho a la persona. */
  como: string;
  /** Un emoji: se lee de un vistazo y no necesita imagen. */
  emoji: string;
  /** A quién le toca: se omite la insignia a quien no puede hacer lo que pide. */
  para: (perfil: PerfilDeTrabajo) => boolean;
  /** Cuánto lleva y cuánto pide. */
  avance: (c: Conteos, racha: number) => { lleva: number; meta: number };
};

const quienRegistra = (p: PerfilDeTrabajo) => p.registra;
const quienHaceCampo = (p: PerfilDeTrabajo) => p.haceCampo;
const todos = () => true;

export const INSIGNIAS: readonly Insignia[] = [
  { clave: "primer-paso", nombre: "Primer paso", emoji: "👣", como: "Registra a tu primer ciudadano.", para: quienRegistra, avance: (c) => ({ lleva: c.registros, meta: 1 }) },
  { clave: "toca-toca", nombre: "Toca-toca", emoji: "🚪", como: "Cierra tu primera visita o actividad.", para: quienHaceCampo, avance: (c) => ({ lleva: c.cierres, meta: 1 }) },
  { clave: "ya-agarre-la-onda", nombre: "Ya agarré la onda", emoji: "🙌", como: "Llega a 10 registros completos (con sección).", para: quienRegistra, avance: (c) => ({ lleva: c.registrosCompletos, meta: 10 }) },
  { clave: "tu-enlace-trabaja", nombre: "Tu enlace trabaja", emoji: "📲", como: "Que 5 personas se registren con tu QR o enlace.", para: todos, avance: (c) => ({ lleva: c.porMiEnlace, meta: 5 }) },
  { clave: "oidos-en-la-colonia", nombre: "Oídos en la colonia", emoji: "👂", como: "Anota 5 peticiones de vecinos en Escucha Social.", para: todos, avance: (c) => ({ lleva: c.escucha, meta: 5 }) },
  { clave: "de-prospecto-a-vecino", nombre: "De prospecto a vecino", emoji: "🤝", como: "Pasa 3 prospectos al directorio.", para: quienRegistra, avance: (c) => ({ lleva: c.convertidos, meta: 3 }) },
  { clave: "puerta-que-se-abre", nombre: "Puerta que se abre", emoji: "🔑", como: "Logra 10 cierres con resultado exitoso o con acuerdo.", para: quienHaceCampo, avance: (c) => ({ lleva: c.cierresBuenos, meta: 10 }) },
  { clave: "diez-dias", nombre: "Diez días en la calle", emoji: "📅", como: "Trabaja en 10 días distintos.", para: todos, avance: (c) => ({ lleva: c.diasActivos, meta: 10 }) },
  { clave: "mapa-al-dia", nombre: "Mapa al día", emoji: "📍", como: "Registra a 20 ciudadanos con su punto en el mapa.", para: quienRegistra, avance: (c) => ({ lleva: c.conUbicacion, meta: 20 }) },
  { clave: "suela-gastada", nombre: "Suela gastada", emoji: "👟", como: "Cierra 25 visitas o actividades.", para: quienHaceCampo, avance: (c) => ({ lleva: c.cierres, meta: 25 }) },
  { clave: "de-hueso-colorado", nombre: "De hueso colorado", emoji: "🔥", como: "Mantén 4 semanas seguidas con 2 o más días de trabajo.", para: todos, avance: (_c, racha) => ({ lleva: racha, meta: 4 }) },
  { clave: "medio-centenar", nombre: "Medio centenar", emoji: "🎯", como: "Llega a 50 registros completos.", para: quienRegistra, avance: (c) => ({ lleva: c.registrosCompletos, meta: 50 }) },
  { clave: "la-centena", nombre: "La Centena", emoji: "💯", como: "Llega a 100 registros completos.", para: quienRegistra, avance: (c) => ({ lleva: c.registrosCompletos, meta: 100 }) },
  { clave: "padron-de-barrio", nombre: "Padrón de barrio", emoji: "🏘️", como: "Llega a 250 registros completos.", para: quienRegistra, avance: (c) => ({ lleva: c.registrosCompletos, meta: 250 }) }
];

export type EstadoDeInsignia = {
  clave: string;
  nombre: string;
  emoji: string;
  como: string;
  lleva: number;
  meta: number;
  lograda: boolean;
};

/** Las insignias que le tocan a la persona, con su avance, en el orden en que se suelen ganar. */
export function insigniasDe(perfil: PerfilDeTrabajo, conteos: Conteos, racha: number): EstadoDeInsignia[] {
  return INSIGNIAS.filter((i) => i.para(perfil)).map((i) => {
    const { lleva, meta } = i.avance(conteos, racha);
    return { clave: i.clave, nombre: i.nombre, emoji: i.emoji, como: i.como, lleva: Math.min(lleva, meta), meta, lograda: lleva >= meta };
  });
}

/** La que está más cerca de ganarse (por proporción), o null si ya tiene todas. */
export function siguienteInsignia(estados: readonly EstadoDeInsignia[]): EstadoDeInsignia | null {
  const pendientes = estados.filter((e) => !e.lograda);
  if (pendientes.length === 0) return null;
  return pendientes.reduce((mejor, e) => (e.lleva / e.meta > mejor.lleva / mejor.meta ? e : mejor));
}

// ── Frases de ánimo ─────────────────────────────────────────────────────────────────────────────────

export type Situacion = "registro" | "cierre" | "otro" | "meta" | "sin_empezar" | "en_camino" | "pasada";

/**
 * Sin nombres de ciudadanos: la pantalla se ve en la calle. Tono cálido, de aquí, sin ser infantil.
 */
export const FRASES: Readonly<Record<Situacion, readonly string[]>> = {
  registro: [
    "¡Eso! Uno más a la red.",
    "Otro vecino que ya cuenta.",
    "Así se arma el barrio, uno por uno.",
    "Registro guardado. ¡Vas bien!",
    "Uno más. La colonia se va llenando.",
    "¡Bien hecho! Ya quedó en el directorio."
  ],
  cierre: [
    "Visita cerrada. ¡Cada puerta cuenta!",
    "Listo, una menos en la agenda.",
    "Cerrado y anotado. Así da gusto.",
    "Aunque no abran, cada puerta cuenta.",
    "Trabajo de campo del bueno."
  ],
  otro: ["Guardado. ¡Gracias por anotarlo!", "Quedó registrado.", "Anotado, ya lo ve tu equipo."],
  meta: ["¡Meta cumplida! Lo que sigue es ganancia.", "¡Lo lograste! Meta del día completa.", "Meta del día: ✔. ¡A ese ritmo!"],
  sin_empezar: ["Hoy es buen día para empezar.", "El primer registro del día es el que más cuesta. ¡Tú puedes!", "¿Arrancamos? Tu meta te espera."],
  en_camino: ["Vas que vuelas.", "Buen ritmo, sigue así.", "Ya vas a medio camino.", "Paso a pasito se llega."],
  pasada: ["Ya cumpliste: ahora, calidad.", "Meta rebasada. Revisa que cada registro tenga sección y domicilio.", "¡Imparable! Tómate un agua."]
};

/** Una frase de la situación, distinta de la anterior si se puede. `azar` va de 0 a 1. */
export function fraseDe(situacion: Situacion, azar: number, anterior?: string | null): string {
  const opciones = FRASES[situacion];
  const candidatas = opciones.length > 1 && anterior ? opciones.filter((f) => f !== anterior) : opciones;
  const i = Math.min(candidatas.length - 1, Math.max(0, Math.floor(azar * candidatas.length)));
  return candidatas[i] ?? opciones[0] ?? "";
}

/** En qué punto del día va la persona respecto a su meta. */
export function situacionDelDia(hoy: number, meta: number): Situacion {
  if (hoy <= 0) return "sin_empezar";
  if (hoy >= meta * 2) return "pasada";
  if (hoy >= meta) return "meta";
  return "en_camino";
}
