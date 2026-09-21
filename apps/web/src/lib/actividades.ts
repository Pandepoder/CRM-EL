/**
 * Definiciones compartidas de la bitácora: resultado, estado visible y reglas de conteo.
 *
 * El formulario ofrecía resultados que las visitas no aceptaban, y para el resto de actividades
 * enviaba siempre "resuelta" sin importar lo elegido. Ahora cliente, servidor y base parten de
 * esta lista, que coincide con las restricciones `visit_results_outcome_check` y
 * `event_reports_outcome_check`.
 *
 * Reprogramar y cancelar NO son resultados: son acciones sobre una actividad pendiente, y cada
 * una tiene su propio efecto (nueva fecha, motivo). Un resultado describe cómo salió lo que sí
 * ocurrió.
 */

export type ResultadoActividad = {
  label: string;
  ayuda: string;
  /** Si además de cerrar la actividad hay que dejar un pendiente de seguimiento. */
  requiereSeguimiento: boolean;
};

export const RESULTADOS_ACTIVIDAD: Record<string, ResultadoActividad> = {
  successful: { label: "Realizada con éxito", ayuda: "Se cumplió lo planeado.", requiereSeguimiento: false },
  positive_commitment: { label: "Acuerdo alcanzado", ayuda: "Hubo un compromiso concreto.", requiereSeguimiento: false },
  follow_up_required: { label: "Requiere seguimiento", ayuda: "Queda un siguiente paso por dar.", requiereSeguimiento: true },
  no_contact: { label: "Sin contacto", ayuda: "No se pudo hablar con nadie.", requiereSeguimiento: false },
  rejected: { label: "Rechazada / sin interés", ayuda: "La persona o el grupo declinó.", requiereSeguimiento: false }
};

export const CLAVES_RESULTADO = Object.keys(RESULTADOS_ACTIVIDAD);

export function esResultadoValido(valor: unknown): valor is string {
  return typeof valor === "string" && Object.hasOwn(RESULTADOS_ACTIVIDAD, valor);
}

/** Estados de actividad que impiden cambios: ya no está pendiente. */
export const ESTADOS_ACTIVIDAD_CERRADOS = ["resolved", "cancelada", "archived", "rechazada"] as const;

/**
 * Estado que ve la persona en la bitácora. Se calcula a partir del estado guardado y de la
 * fecha, no se guarda: "vencida" cambia sola con el paso del tiempo.
 */
export type EstadoVisible =
  | "programada"
  | "en_curso"
  | "vencida"
  | "completada"
  | "cancelada"
  | "archivada";

export function estadoVisible(
  estado: string,
  fechaProgramada: Date | string | null,
  ahora: Date = new Date()
): EstadoVisible {
  if (estado === "cancelada" || estado === "rechazada") return "cancelada";
  if (estado === "archived") return "archivada";
  if (estado === "resolved" || estado === "completed") return "completada";
  if (estado === "in_progress") return "en_curso";
  const fecha = fechaProgramada ? new Date(fechaProgramada) : null;
  if (fecha && fecha.getTime() < ahora.getTime()) return "vencida";
  return "programada";
}

/** Una actividad cuenta como pendiente mientras no esté cerrada, cancelada ni archivada. */
export function estaPendiente(estado: string): boolean {
  return !["resolved", "completed", "cancelada", "rechazada", "archived"].includes(estado);
}

export function estaCompletada(estado: string): boolean {
  return estado === "resolved" || estado === "completed";
}

/**
 * Nombre comparable de una opción: minúsculas, sin acentos y con los espacios colapsados.
 * "Llamada  de Seguimiento" y "llamada de seguimiento" son la misma opción.
 */
export function normalizarNombre(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Clave estable para una opción nueva: minúsculas con guiones bajos. */
export function claveDesdeNombre(texto: string): string {
  return normalizarNombre(texto).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48) || "opcion";
}

/**
 * Convierte el valor de un <input type="datetime-local"> —hora local, sin zona— en un instante.
 * Y al revés: `aValorLocal` da lo que ese input espera. Antes se inicializaba con
 * `toISOString().slice(0,16)`, que es UTC: la hora inicial salía desplazada tantas horas como
 * la zona, y cerca de medianoche caía en otro día.
 */
export function aValorLocal(fecha: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}T${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`;
}

/** Hora local de dentro de `minutos` minutos, redondeada al siguiente cuarto de hora. */
export function proximaHoraLocal(minutos = 60, ahora: Date = new Date()): string {
  const t = new Date(ahora.getTime() + minutos * 60_000);
  t.setSeconds(0, 0);
  t.setMinutes(Math.ceil(t.getMinutes() / 15) * 15);
  return aValorLocal(t);
}

/**
 * Zona en la que se cuentan los días de la bitácora. El servidor suele correr en UTC: con la hora
 * del servidor, "hoy" cambiaba de día a las 18:00 en Jalisco y una actividad de las 19:00
 * aparecía en "mañana".
 */
export const ZONA_HORARIA = "America/Mexico_City";

/** Minutos que la zona se adelanta a UTC en ese instante (negativo al oeste de Greenwich). */
function desfaseZona(instante: Date, zona: string): number {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: zona,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).formatToParts(instante);
  const v = (t: string) => Number(partes.find((p) => p.type === t)?.value);
  const comoUtc = Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"), v("second"));
  return Math.round((comoUtc - Math.floor(instante.getTime() / 1000) * 1000) / 60_000);
}

/** Inicio (00:00 en la zona) del día que contiene `instante`, desplazado `dias` días. */
export function inicioDeDia(instante: Date, dias = 0, zona: string = ZONA_HORARIA): Date {
  const desfase = desfaseZona(instante, zona);
  const local = new Date(instante.getTime() + desfase * 60_000);
  const inicioLocalUtc = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + dias);
  // Se vuelve a calcular el desfase en el instante resultante por si el día cruza un cambio de horario.
  const aproximado = new Date(inicioLocalUtc - desfase * 60_000);
  return new Date(inicioLocalUtc - desfaseZona(aproximado, zona) * 60_000);
}

/** Lunes 00:00 de la semana que contiene `instante`, en la zona. */
export function inicioDeSemana(instante: Date, zona: string = ZONA_HORARIA): Date {
  const inicioDia = inicioDeDia(instante, 0, zona);
  const local = new Date(inicioDia.getTime() + desfaseZona(inicioDia, zona) * 60_000);
  const diaSemana = (local.getUTCDay() + 6) % 7; // lunes = 0
  return inicioDeDia(instante, -diaSemana, zona);
}

/** Primer día del mes 00:00 (mes siguiente si `meses` = 1), en la zona. */
export function inicioDeMes(instante: Date, meses = 0, zona: string = ZONA_HORARIA): Date {
  const inicioDia = inicioDeDia(instante, 0, zona);
  const local = new Date(inicioDia.getTime() + desfaseZona(inicioDia, zona) * 60_000);
  const primero = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + meses, 1));
  const dias = Math.round((primero.getTime() - Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate())) / 86_400_000);
  return inicioDeDia(instante, dias, zona);
}

/**
 * Las actividades creadas por la versión anterior llevan un prefijo en el título
 * ("[Plática Vecinal] …") que hoy es redundante con el tipo. Se quita solo al mostrar; el
 * título guardado no se toca.
 */
const PREFIJOS_HEREDADOS = [
  "[Plática Vecinal] ",
  "[Visita Domiciliaria] ",
  "[Evento / Asamblea] ",
  "[Estructura Electoral] ",
  "[Perifoneo / Activación] ",
  "[Logística / Apoyos] ",
  "[Brigada de Campo] "
];

export function tituloVisible(titulo: string, tieneTipo: boolean): string {
  if (!tieneTipo) return titulo;
  const prefijo = PREFIJOS_HEREDADOS.find((p) => titulo.startsWith(p));
  return prefijo ? titulo.slice(prefijo.length) : titulo;
}
