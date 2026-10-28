"use client";

import { useEffect, useId, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Hoja que sube desde abajo en el teléfono y se ve como ventana centrada en la computadora (plan de auditoría
 * de menús, §10). Para acciones cortas sobre algo que ya se está viendo: asignar, nombrar, turnar, devolver.
 *
 * - `z-[110]`: por encima de la barra de abajo (50) y del «+» (60), como los demás diálogos del repo.
 * - Cierra con la «✕» (44 px), tocando fuera o con Escape; mientras `ocupado`, no.
 * - `pie`: la acción principal, fija abajo para que no haya que deslizar para encontrarla.
 */
export function HojaInferior({
  abierta,
  titulo,
  subtitulo,
  onCerrar,
  ocupado = false,
  pie,
  children
}: {
  abierta: boolean;
  titulo: string;
  subtitulo?: string | undefined;
  onCerrar: () => void;
  ocupado?: boolean;
  pie?: ReactNode;
  children: ReactNode;
}) {
  const idTitulo = useId();

  useEffect(() => {
    if (!abierta) return;
    const alEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !ocupado) onCerrar();
    };
    document.addEventListener("keydown", alEscape);
    return () => document.removeEventListener("keydown", alEscape);
  }, [abierta, ocupado, onCerrar]);

  if (!abierta) return null;
  return (
    <div
      className="fixed inset-0 z-[110] flex items-end md:items-center justify-center bg-slate-950/60 backdrop-blur-sm md:p-4"
      onClick={() => !ocupado && onCerrar()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        onClick={(e) => e.stopPropagation()}
        className="w-full md:max-w-lg max-h-[90dvh] bg-white rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-gray-100 shrink-0">
          <div className="min-w-0">
            <h2 id={idTitulo} className="text-base font-black text-slate-900 leading-tight">{titulo}</h2>
            {subtitulo && <p className="text-xs font-semibold text-slate-500 mt-0.5 line-clamp-2">{subtitulo}</p>}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            disabled={ocupado}
            aria-label="Cerrar"
            className="w-11 h-11 shrink-0 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto overscroll-contain flex-1 space-y-4">{children}</div>
        {pie && <div className="px-5 py-3 border-t border-gray-100 bg-white shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">{pie}</div>}
      </div>
    </div>
  );
}
