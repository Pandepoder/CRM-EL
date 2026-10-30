"use client";

import { useCallback, useState } from "react";

import type { OpcionSelector } from "@/lib/bitacora-tipos";

import { SelectorBuscable, type ResultadoBusqueda } from "../../app/(shell)/equipo/componentes/SelectorBuscable";

/**
 * Elegir una sección electoral buscándola por número, por páginas (`/api/equipo/buscar/secciones`).
 *
 * «Levantar incidencia» mandaba al navegador las 3,791 secciones de Jalisco (341 KB), y ella y el asignador de
 * sección de Incidencias tenían «registrar nueva sección», que en realidad buscaba una del catálogo que no
 * estaba en su lista (auditoría de menús, C6). Las secciones son el catálogo del INE: se eligen, no se crean.
 * Primero se buscan en el municipio; si no aparece, «Buscar en todo Jalisco».
 */
export function SeccionBuscable({
  etiqueta = "Sección electoral",
  municipio,
  valor,
  onCambiar,
  ayuda
}: {
  etiqueta?: string;
  municipio?: string | null | undefined;
  valor: OpcionSelector | null;
  onCambiar: (seccion: OpcionSelector | null) => void;
  ayuda?: string | undefined;
}) {
  const [todoJalisco, setTodoJalisco] = useState(!municipio);
  const buscar = useCallback(
    async (termino: string, pagina: number, senal: AbortSignal): Promise<ResultadoBusqueda | null> => {
      const p = new URLSearchParams({ q: termino, pagina: String(pagina), limite: "15" });
      if (municipio && !todoJalisco) p.set("municipio", municipio);
      try {
        const res = await fetch(`/api/equipo/buscar/secciones?${p.toString()}`, { signal: senal });
        if (!res.ok) return null;
        const datos = (await res.json()) as { resultados: OpcionSelector[]; hayMas: boolean };
        return { resultados: datos.resultados, hayMas: datos.hayMas };
      } catch {
        return null;
      }
    },
    [municipio, todoJalisco]
  );

  return (
    <div className="space-y-1">
      <SelectorBuscable
        key={todoJalisco ? "jalisco" : "municipio"}
        etiqueta={etiqueta}
        valor={valor ? [valor] : []}
        onCambiar={(v) => onCambiar(v[0] ?? null)}
        buscar={buscar}
        placeholder="Escribe el número (viene en la credencial)…"
        ayuda={ayuda}
        vacio={todoJalisco ? "No hay una sección con ese número." : "No está en este municipio: busca en todo Jalisco."}
      />
      {municipio && (
        <button
          type="button"
          onClick={() => setTodoJalisco((t) => !t)}
          className="min-h-[36px] text-xs font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
        >
          {todoJalisco ? `Buscar solo en ${municipio}` : "Buscar en todo Jalisco"}
        </button>
      )}
    </div>
  );
}
