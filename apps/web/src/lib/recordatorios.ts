import type { UserNetworkScope } from "@/lib/network-hierarchy";
import { consultarBitacora, crearContexto, leerFiltros } from "@/lib/bitacora-consulta";
import type { ActividadItem } from "@/lib/bitacora-tipos";

/**
 * Recordatorios de la bitácora: lo que ya se venció y lo que toca en las próximas horas, de la
 * agenda propia.
 *
 * La agenda ya sabía cuántas actividades estaban vencidas o por venir, pero solo lo decía en dos
 * contadores pequeños de sus pestañas, y abría en «Hoy»: quien tenía una reunión vencida y otra
 * para mañana entraba y leía «No hay actividades aquí». Nada lo avisaba fuera de esa pantalla.
 *
 * Se arma con la misma consulta que la agenda (`consultarBitacora`, vista propia), así que cuenta
 * exactamente lo mismo que sus pestañas y respeta el mismo alcance.
 */

/** Cuánto hacia adelante se avisa de lo próximo. */
export const HORAS_DE_AVISO = 24;
/** Cuántas actividades de cada grupo se enseñan; el resto se cuenta. */
const MAXIMO_POR_GRUPO = 5;

export type Recordatorio = Readonly<{
  id: string;
  title: string;
  /** ISO. */
  scheduledAt: string;
  tipo: string | null;
  lugar: string;
  contacto: string | null;
}>;

export type Recordatorios = Readonly<{
  vencidas: Recordatorio[];
  totalVencidas: number;
  /** Las que empiezan dentro de las próximas `HORAS_DE_AVISO` horas. */
  proximas: Recordatorio[];
  totalProximas: number;
  horasDeAviso: number;
}>;

function aRecordatorio(a: ActividadItem): Recordatorio {
  return {
    id: a.id,
    title: a.title,
    scheduledAt: a.scheduledAt,
    tipo: a.tipo?.nombre ?? null,
    lugar: a.locationText || a.location || "",
    contacto: a.contactName
  };
}

export async function recordatoriosDe(alcance: UserNetworkScope, ahora: Date = new Date()): Promise<Recordatorios> {
  const ctx = crearContexto(alcance);
  const base = { ...leerFiltros({}), scope: "mis" as const };
  const [vencidas, proximas] = await Promise.all([
    consultarBitacora(ctx, { ...base, vista: "vencidas" }),
    consultarBitacora(ctx, { ...base, vista: "proximas" })
  ]);

  const limite = ahora.getTime() + HORAS_DE_AVISO * 60 * 60 * 1000;
  // Las próximas vienen de la más cercana a la más lejana; solo cuentan las que caen en la ventana.
  const enVentana = proximas.items.filter((a) => {
    const t = new Date(a.scheduledAt).getTime();
    return Number.isFinite(t) && t >= ahora.getTime() && t <= limite;
  });

  return {
    vencidas: vencidas.items.slice(0, MAXIMO_POR_GRUPO).map(aRecordatorio),
    totalVencidas: vencidas.conteos.vencidas ?? vencidas.total,
    proximas: enVentana.slice(0, MAXIMO_POR_GRUPO).map(aRecordatorio),
    totalProximas: enVentana.length,
    horasDeAviso: HORAS_DE_AVISO
  };
}
