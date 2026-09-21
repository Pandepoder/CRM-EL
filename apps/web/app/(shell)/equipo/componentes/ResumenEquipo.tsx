"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Search } from "lucide-react";

import type { ResumenBitacora } from "@/lib/bitacora-tipos";

import { formatearFecha } from "./presentacion";

/**
 * Resumen por persona. Las cifras vienen ya calculadas del servidor con una regla única (cada
 * actividad cuenta una vez, para su responsable) y la descripción dice qué periodo y alcance
 * abarcan: aquí no se recalcula nada, para que los totales cuadren con los registros.
 */
export function ResumenEquipo({ resumen, usuarioActualId }: { resumen: ResumenBitacora; usuarioActualId: string }) {
  const [q, setQ] = useState("");
  const { lideres } = resumen;

  const totales = useMemo(
    () => lideres.reduce(
      (t, l) => ({
        total: t.total + l.totalActivities, completadas: t.completadas + l.completedActivities,
        pendientes: t.pendientes + l.pendingActivities, vencidas: t.vencidas + l.overdueActivities, contactos: t.contactos + l.contactsCount
      }),
      { total: 0, completadas: 0, pendientes: 0, vencidas: 0, contactos: 0 }
    ),
    [lideres]
  );
  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return lideres;
    return lideres.filter((l) => [l.displayName, l.email, l.teamName, l.roleName].some((x) => x.toLowerCase().includes(t)));
  }, [lideres, q]);
  const mia = lideres.find((l) => l.userId === usuarioActualId);

  return (
    <div className="space-y-5">
      <p className="text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">{resumen.descripcion}</p>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          ["Actividades", totales.total, "text-blue-900"], ["Completadas", totales.completadas, "text-emerald-700"],
          ["Pendientes", totales.pendientes, "text-amber-700"], ["Vencidas", totales.vencidas, totales.vencidas > 0 ? "text-red-700" : "text-gray-700"],
          ["Contactos registrados", totales.contactos, "text-indigo-800"]
        ].map(([t, n, c]) => (
          <div key={String(t)} className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">{t}</p>
            <p className={`text-2xl font-black ${c}`}>{n}</p>
          </div>
        ))}
      </div>

      {mia && (
        <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4">
          <p className="text-sm font-extrabold text-blue-950">Tu resumen</p>
          <p className="text-sm text-blue-900 mt-1">
            {mia.totalActivities} actividades · {mia.completedActivities} completadas · {mia.pendingActivities} pendientes
            {mia.overdueActivities > 0 && <span className="font-extrabold text-red-700"> · {mia.overdueActivities} vencidas</span>} · {mia.completionRate}% de avance
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-extrabold text-gray-900">Por persona</h2>
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input type="search" aria-label="Buscar persona o equipo" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar persona o equipo…"
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-wider">
              <tr>
                <th scope="col" className="text-left px-4 py-3">Persona</th>
                <th scope="col" className="text-right px-3 py-3">Total</th>
                <th scope="col" className="text-right px-3 py-3">Completadas</th>
                <th scope="col" className="text-right px-3 py-3">Pendientes</th>
                <th scope="col" className="text-right px-3 py-3">Vencidas</th>
                <th scope="col" className="text-left px-3 py-3">Por tipo</th>
                <th scope="col" className="text-left px-3 py-3">Última</th>
                <th scope="col" className="px-3 py-3"><span className="sr-only">Ver</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.map((l) => (
                <tr key={l.userId} className={l.userId === usuarioActualId ? "bg-blue-50/40" : ""}>
                  <td className="px-4 py-3">
                    <p className="font-extrabold text-gray-900">{l.displayName}{l.userId === usuarioActualId && <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-800 rounded px-1.5 py-0.5">Tú</span>}</p>
                    <p className="text-[11px] text-gray-500">{l.roleName} · {l.teamName}</p>
                  </td>
                  <td className="px-3 py-3 text-right font-extrabold">{l.totalActivities}</td>
                  <td className="px-3 py-3 text-right text-emerald-700 font-bold">{l.completedActivities}</td>
                  <td className="px-3 py-3 text-right text-amber-700 font-bold">{l.pendingActivities}</td>
                  <td className="px-3 py-3 text-right">{l.overdueActivities > 0 ? <span className="inline-flex items-center gap-1 text-red-700 font-extrabold"><AlertTriangle size={12} aria-hidden="true" />{l.overdueActivities}</span> : <span className="text-gray-400">0</span>}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {l.tipos.slice(0, 3).map((t) => <span key={t.nombre} className="text-[11px] font-bold bg-gray-100 text-gray-700 rounded-md px-1.5 py-0.5">{t.nombre}: {t.total}</span>)}
                      {l.tipos.length > 3 && <span className="text-[11px] text-gray-500">+{l.tipos.length - 3} más</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{l.latestActivityAt ? formatearFecha(l.latestActivityAt) : "—"}</td>
                  <td className="px-3 py-3 text-right">
                    <Link href={`/equipo?scope=equipo&leaderId=${l.userId}&vista=todas`} className="text-xs font-extrabold text-blue-700 hover:underline whitespace-nowrap">Ver bitácora</Link>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Nadie coincide con la búsqueda.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
