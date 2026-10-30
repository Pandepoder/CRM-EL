"use client";

import { useMemo, useState } from "react";
import { Search, Undo2, Users } from "lucide-react";

import { QueEsEsto } from "@/components/QueEsEsto";
import { normalizar, OTRAS_ESTRUCTURAS, type EnManos as FilaEnManos } from "@/lib/logistica-tipos";

/**
 * «Entregado a personas» (plan de auditoría de menús, F5.3): quién tiene qué, entregas menos devoluciones, con
 * «Registrar devolución» en cada artículo. Lo de otras estructuras llega del servidor sumado y sin nombres (P1).
 */
export function EnManos({
  filas,
  onDevolver,
  refBuscador
}: {
  filas: FilaEnManos[];
  onDevolver: (fila: FilaEnManos) => void;
  /** Para dejar el cursor en el buscador al abrir la pestaña («¿quién tiene las lonas?» en 3 toques). */
  refBuscador?: React.Ref<HTMLInputElement>;
}) {
  const [buscar, setBuscar] = useState("");
  const grupos = useMemo(() => {
    const t = normalizar(buscar);
    const visibles = t ? filas.filter((f) => normalizar(`${f.persona} ${f.articulo} ${f.clave}`).includes(t)) : filas;
    const porPersona = new Map<string, { persona: string; personaId: string | null; filas: FilaEnManos[] }>();
    for (const f of visibles) {
      const clave = f.personaId ?? OTRAS_ESTRUCTURAS;
      const g = porPersona.get(clave) ?? { persona: f.persona, personaId: f.personaId, filas: [] };
      g.filas.push(f);
      porPersona.set(clave, g);
    }
    return [...porPersona.values()];
  }, [filas, buscar]);

  return (
    <section className="space-y-3" aria-label="Entregado a personas">
      <p className="text-sm text-gray-600">
        Lo que tiene cada persona: lo entregado menos lo que regresó. <QueEsEsto termino="devolucion" />
      </p>
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
        <input
          ref={refBuscador}
          type="search"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          placeholder="Persona o artículo…"
          aria-label="Buscar persona o artículo"
          className="w-full min-h-[48px] pl-10 pr-4 rounded-2xl border border-gray-200 bg-white text-base text-gray-900 [&::-webkit-search-cancel-button]:hidden"
        />
      </div>
      {grupos.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-200 p-8 text-center space-y-2">
          <Users size={28} className="mx-auto text-gray-400" aria-hidden="true" />
          <p className="text-base font-bold text-gray-900">{buscar ? "Nadie con ese nombre o artículo." : "Nadie tiene material entregado."}</p>
          {!buscar && <p className="text-sm text-gray-600">Cuando entregues algo a una persona, aquí verás cuánto tiene.</p>}
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {grupos.map((g) => (
            <li key={g.personaId ?? OTRAS_ESTRUCTURAS} className="bg-white rounded-3xl border border-gray-200 p-4 space-y-2 shadow-sm">
              <p className="text-base font-black text-gray-900">{g.persona}</p>
              {!g.personaId && <p className="text-xs text-gray-500">Material que tiene gente de otra estructura de tu municipio, sumado.</p>}
              <ul className="space-y-1.5">
                {g.filas.map((f) => (
                  <li key={`${f.articuloId}-${f.personaId ?? "otras"}`} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 text-sm">
                      <span className="font-bold text-gray-900">{f.cantidad.toLocaleString("es-MX")}</span> <span className="text-gray-700">{f.articulo}</span>
                    </span>
                    {f.personaId && (
                      <button
                        type="button"
                        onClick={() => onDevolver(f)}
                        aria-label={`Registrar devolución de ${f.articulo} de ${f.persona}`}
                        className="shrink-0 min-h-[40px] px-3 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 inline-flex items-center gap-1 cursor-pointer hover:bg-gray-50"
                      >
                        <Undo2 size={13} aria-hidden="true" /> Devolución
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
