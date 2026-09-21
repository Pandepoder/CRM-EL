import type { EstadoVisible } from "@/lib/actividades";
import { ZONA_HORARIA } from "@/lib/actividades";

const ESTADOS: Record<EstadoVisible, { texto: string; clase: string }> = {
  programada: { texto: "Programada", clase: "bg-blue-50 text-blue-800 border-blue-200" },
  en_curso: { texto: "En curso", clase: "bg-indigo-50 text-indigo-800 border-indigo-200" },
  vencida: { texto: "Vencida", clase: "bg-red-50 text-red-700 border-red-200" },
  completada: { texto: "Completada", clase: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  cancelada: { texto: "Cancelada", clase: "bg-gray-100 text-gray-600 border-gray-200" },
  archivada: { texto: "Archivada", clase: "bg-slate-50 text-slate-500 border-slate-200" }
};

export function EtiquetaEstado({ estado }: { estado: EstadoVisible }) {
  const e = ESTADOS[estado];
  return <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg border ${e.clase}`}>{e.texto}</span>;
}

/** Color del tipo con un respaldo neutro: los tipos nuevos aún no tienen color asignado. */
export function InsigniaTipo({ nombre, color }: { nombre: string; color?: string | null | undefined }) {
  const c = color && /^#[0-9a-f]{6}$/i.test(color) ? color : "#475569";
  return (
    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg border" style={{ color: c, borderColor: `${c}55`, backgroundColor: `${c}12` }}>
      {nombre}
    </span>
  );
}

export function formatearFechaHora(iso: string | Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: ZONA_HORARIA, day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  }).format(new Date(iso));
}

export function formatearFecha(iso: string | Date): string {
  return new Intl.DateTimeFormat("es-MX", { timeZone: ZONA_HORARIA, day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));
}
