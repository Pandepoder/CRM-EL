"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Landmark, MessageSquare, Plus } from "lucide-react";

import { nombreDeCategoriaEscucha, nombreDeEstadoEscucha, textoDelTurno, type PeticionDelVecino } from "@/lib/escucha-social";

const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Mexico_City" });

/**
 * «Lo que ha pedido» en la ficha del ciudadano (plan de auditoría de menús, F3.2 y D10): sus peticiones de
 * Escucha Social, con su estado y si se turnaron, igual que la ficha ya enseña todas sus notas. Así quien toca
 * la puerta le contesta «¿en qué va lo mío?». Las notas de seguimiento salen solo de las que quien mira también
 * ve en Escucha Social; el servidor las recorta.
 */
export function LoQueHaPedido({ contactoId }: { contactoId: string }) {
  const [peticiones, setPeticiones] = useState<PeticionDelVecino[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vigente = true;
    fetch(`/api/escucha-social?contacto=${encodeURIComponent(contactoId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => vigente && setPeticiones(d.peticiones ?? []))
      .catch(() => vigente && setError(true));
    return () => {
      vigente = false;
    };
  }, [contactoId]);

  return (
    <section aria-labelledby="lo-que-ha-pedido" className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
        <h3 id="lo-que-ha-pedido" className="font-extrabold text-sm text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <MessageSquare size={18} className="text-indigo-600" aria-hidden="true" /> Lo que ha pedido {peticiones ? `(${peticiones.length})` : ""}
        </h3>
        <Link
          href={`/escucha-social?nueva=1&contacto=${encodeURIComponent(contactoId)}`}
          className="min-h-[40px] px-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs font-extrabold text-indigo-900 inline-flex items-center gap-1.5"
        >
          <Plus size={14} aria-hidden="true" /> Anotar una petición
        </Link>
      </div>

      {error ? (
        <p className="text-sm text-gray-600">No se pudo leer lo que ha pedido. Vuelve a abrir la ficha en un momento.</p>
      ) : peticiones === null ? (
        <p className="text-sm text-gray-500">Cargando…</p>
      ) : peticiones.length === 0 ? (
        <p className="text-sm text-gray-600">Todavía no ha pedido nada. Si te comenta algo, anótalo aquí.</p>
      ) : (
        <ul className="space-y-2">
          {peticiones.map((p) => {
            const contenido = (
              <>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-extrabold text-gray-900">{p.titulo}</p>
                  <span className="shrink-0 text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-gray-100 text-gray-800">{nombreDeEstadoEscucha(p.estado)}</span>
                </div>
                <p className="text-xs text-gray-600">
                  {nombreDeCategoriaEscucha(p.categoria)} · {fecha(p.creada)}
                </p>
                {p.turno && (
                  <p className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                    <Landmark size={12} aria-hidden="true" /> {textoDelTurno(p.turno)}
                  </p>
                )}
                {p.notas && <p className="text-xs text-gray-700 bg-gray-50 rounded-xl px-2.5 py-1.5 whitespace-pre-wrap">{p.notas}</p>}
              </>
            );
            return (
              <li key={p.id} className="rounded-2xl border border-gray-100 bg-gray-50/60">
                {p.enEscucha ? (
                  <Link href={`/escucha-social?peticion=${p.id}`} className="block p-3 space-y-1 hover:bg-gray-100 rounded-2xl">
                    {contenido}
                  </Link>
                ) : (
                  <div className="p-3 space-y-1">{contenido}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
