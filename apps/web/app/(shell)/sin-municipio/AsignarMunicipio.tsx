"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { MUNICIPIOS_JALISCO } from "@/lib/municipios-jalisco";

import { asignarMunicipioAction, type EstadoDeAsignacion } from "./actions";

export type FilaSinMunicipio = {
  id: string;
  titulo: string;
  detalle: string;
  fecha: string | null;
  enlace?: string;
};

/** Marcar filas en General y asignarles un municipio de una vez. */
export function AsignarMunicipio({
  tabla,
  etiqueta,
  filas,
  total
}: {
  tabla: string;
  etiqueta: string;
  filas: FilaSinMunicipio[];
  total: number;
}) {
  const [estado, accion, enviando] = useActionState<EstadoDeAsignacion, FormData>(asignarMunicipioAction, null);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  // Tras asignar, la lista se recarga sin las filas asignadas: solo cuentan las que siguen a la vista.
  const vigentes = filas.filter((f) => marcadas.has(f.id)).length;
  const todas = filas.length > 0 && vigentes === filas.length;

  const alternar = (id: string) =>
    setMarcadas((previas) => {
      const siguientes = new Set(previas);
      if (siguientes.has(id)) siguientes.delete(id);
      else siguientes.add(id);
      return siguientes;
    });

  if (filas.length === 0) {
    return <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">No hay {etiqueta.toLowerCase()} en General.</p>;
  }

  return (
    <form action={accion} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <input type="hidden" name="tabla" value={tabla} />

      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50">
        <label className="flex items-center gap-2 text-[12px] font-bold text-slate-700 cursor-pointer">
          <input type="checkbox" checked={todas} onChange={() => setMarcadas(todas ? new Set() : new Set(filas.map((f) => f.id)))} />
          Marcar todas las de la vista
        </label>
        <span className="text-[12px] font-semibold text-slate-500">
          {total > filas.length ? `Se ven ${filas.length} de ${total.toLocaleString("es-MX")}: al asignarlas aparecen las siguientes.` : `${total} en General`}
        </span>
      </div>

      <ul className="divide-y divide-slate-100 max-h-[55vh] overflow-y-auto">
        {filas.map((f) => (
          <li key={f.id} className="flex items-start gap-3 px-4 py-2.5">
            <input
              type="checkbox"
              name="ids"
              value={f.id}
              checked={marcadas.has(f.id)}
              onChange={() => alternar(f.id)}
              aria-label={`Marcar ${f.titulo}`}
              className="mt-1"
            />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-extrabold text-slate-900 truncate">
                {f.enlace ? <Link href={f.enlace} className="text-slate-900 hover:underline">{f.titulo}</Link> : f.titulo}
              </div>
              <div className="text-[11px] text-slate-500">{f.detalle}</div>
            </div>
            {f.fecha && <time dateTime={f.fecha} className="text-[11px] text-slate-400 whitespace-nowrap">{new Date(f.fecha).toLocaleDateString("es-MX")}</time>}
          </li>
        ))}
      </ul>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50">
        <label className="sr-only" htmlFor="asignar-municipio">Municipio</label>
        <select id="asignar-municipio" name="municipio" required defaultValue="" className="flex-1 p-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900">
          <option value="" disabled>Elige el municipio…</option>
          {MUNICIPIOS_JALISCO.map((m) => (
            <option key={m.name} value={m.name}>{m.name}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={enviando || vigentes === 0}
          className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-extrabold disabled:opacity-50 cursor-pointer"
        >
          {enviando ? "Asignando…" : `Asignar a ${vigentes} ${vigentes === 1 ? "fila" : "filas"}`}
        </button>
      </div>

      {estado && (
        <p role="status" className={`m-0 px-4 py-2.5 text-[12px] font-bold border-t ${estado.ok ? "bg-green-50 text-green-900 border-green-200" : "bg-rose-50 text-rose-900 border-rose-200"}`}>
          {estado.mensaje}
        </p>
      )}
    </form>
  );
}
