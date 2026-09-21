"use client";

import { useCallback, useEffect, useState } from "react";
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, GitMerge, Loader2, Pencil, Plus, Search, X } from "lucide-react";

import { CATEGORIAS_INCIDENCIA } from "@/lib/categorias-incidencia";

import { llamar } from "./api";

type Opcion = {
  id: string;
  kind: "type" | "tag" | "profile";
  name: string;
  description: string | null;
  sortOrder: number;
  incidentCategory: string;
  scope: "organization" | "network";
  isSystem: boolean;
  createdByUserId: string | null;
  archived: boolean;
  usos?: number;
};

const CATEGORIAS = Object.entries(CATEGORIAS_INCIDENCIA).map(([clave, c]) => ({ clave, etiqueta: c.label }));
const campo = "w-full p-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none";

/**
 * Mantenimiento del catálogo: buscar, crear, renombrar, ordenar, archivar/restaurar y fusionar
 * duplicados, con cuántas actividades usa cada opción. Archivar no borra nada: las actividades
 * anteriores siguen mostrando la opción que usaron.
 */
export function AdministrarOpciones({ onCerrar, esAdmin, usuarioActualId, onCambio }: {
  onCerrar: () => void; esAdmin: boolean; usuarioActualId: string; onCambio: () => void;
}) {
  const [kind, setKind] = useState<"type" | "tag" | "profile">("type");
  const [q, setQ] = useState("");
  const [opciones, setOpciones] = useState<Opcion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState("");
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [nombreEdit, setNombreEdit] = useState("");
  const [fusion, setFusion] = useState<{ origen: Opcion; destinoId: string; afectadas: number | null } | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const r = await llamar<{ opciones: Opcion[] }>(`/api/equipo/opciones?kind=${kind}&archivadas=1&usos=1&limite=200&q=${encodeURIComponent(q)}`);
    setCargando(false);
    if (!r.ok) { setError(r.error); return; }
    setError(null);
    setOpciones(r.datos.opciones);
  }, [kind, q]);

  useEffect(() => { const t = setTimeout(() => void cargar(), 250); return () => clearTimeout(t); }, [cargar]);
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => { if (e.key === "Escape") onCerrar(); };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [onCerrar]);

  const puedeEditar = (o: Opcion) => esAdmin || (!o.isSystem && o.scope === "network" && o.createdByUserId === usuarioActualId);

  async function parchar(o: Opcion, cuerpo: Record<string, unknown>, texto: string) {
    setError(null); setAviso(null);
    const r = await llamar(`/api/equipo/opciones/${o.id}`, { method: "PATCH", cuerpo });
    if (!r.ok) { setError(r.error); return false; }
    setAviso(texto);
    await cargar();
    onCambio();
    return true;
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevo.trim() || creando) return;
    setCreando(true); setError(null); setAviso(null);
    const r = await llamar<{ estado: "creada" | "existente" }>("/api/equipo/opciones", { cuerpo: { kind, name: nuevo.trim() } });
    setCreando(false);
    if (!r.ok) { setError(r.error); return; }
    setAviso(r.datos.estado === "creada" ? "Opción creada." : "Esa opción ya existía; no se duplicó.");
    setNuevo("");
    await cargar();
    onCambio();
  }

  async function mover(i: number, delta: -1 | 1) {
    const j = i + delta;
    const activas = opciones;
    if (j < 0 || j >= activas.length) return;
    const nuevoOrden = [...activas];
    [nuevoOrden[i], nuevoOrden[j]] = [nuevoOrden[j]!, nuevoOrden[i]!];
    setError(null);
    for (let k = 0; k < nuevoOrden.length; k++) {
      const o = nuevoOrden[k]!;
      if (o.sortOrder !== (k + 1) * 10 && puedeEditar(o)) {
        const r = await llamar(`/api/equipo/opciones/${o.id}`, { method: "PATCH", cuerpo: { sortOrder: (k + 1) * 10 } });
        if (!r.ok) { setError(r.error); break; }
      }
    }
    await cargar();
    onCambio();
  }

  async function simularFusion(origen: Opcion, destinoId: string) {
    if (!destinoId) { setFusion({ origen, destinoId: "", afectadas: null }); return; }
    const r = await llamar<{ afectadas: number }>(`/api/equipo/opciones/${origen.id}/fusionar`, { cuerpo: { destinoId, aplicar: false } });
    if (!r.ok) { setError(r.error); return; }
    setFusion({ origen, destinoId, afectadas: r.datos.afectadas });
  }

  async function confirmarFusion() {
    if (!fusion?.destinoId) return;
    const r = await llamar<{ afectadas: number }>(`/api/equipo/opciones/${fusion.origen.id}/fusionar`, { cuerpo: { destinoId: fusion.destinoId, aplicar: true } });
    if (!r.ok) { setError(r.error); return; }
    setAviso(`Fusionada: ${r.datos.afectadas} actividad(es) pasaron a la opción de destino y «${fusion.origen.name}» quedó archivada.`);
    setFusion(null);
    await cargar();
    onCambio();
  }

  return (
    <div className="fixed inset-0 z-[110] bg-black/50 flex items-end sm:items-center justify-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div role="dialog" aria-modal="true" aria-label="Administrar opciones" className="bg-white w-full sm:max-w-2xl max-h-[94dvh] flex flex-col rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white shrink-0">
          <div>
            <h2 className="text-base font-extrabold">Administrar opciones</h2>
            <p className="text-[11px] text-slate-300">Tipos de actividad, etiquetas y perfiles de prospecto. Archivar no borra el historial.</p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer"><X size={18} /></button>
        </div>

        <div className="px-5 pt-4 space-y-3 shrink-0">
          <div role="tablist" className="grid grid-cols-3 gap-2 bg-gray-100 p-1 rounded-xl">
            {([["type", "Tipos de actividad"], ["tag", "Etiquetas"], ["profile", "Perfiles de prospecto"]] as const).map(([k, t]) => (
              <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => { setKind(k); setQ(""); setFusion(null); }}
                className={`py-2 rounded-lg text-sm font-extrabold cursor-pointer ${kind === k ? "bg-white text-blue-900 shadow" : "text-gray-600"}`}>{t}</button>
            ))}
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input type="search" aria-label="Buscar opciones" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className={campo + " pl-9"} />
          </div>
          <form onSubmit={crear} className="flex gap-2">
            <input aria-label="Nombre de la nueva opción" value={nuevo} onChange={(e) => setNuevo(e.target.value)} maxLength={80} placeholder={kind === "type" ? "Nuevo tipo de actividad…" : kind === "tag" ? "Nueva etiqueta…" : "Nuevo perfil de prospecto…"} className={campo} />
            <button type="submit" disabled={creando || !nuevo.trim()} className="px-4 rounded-xl bg-emerald-600 text-white text-sm font-extrabold inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
              {creando ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Crear
            </button>
          </form>
          {!esAdmin && <p className="text-[11px] text-gray-500">Lo que crees será visible solo para tu red. La administración puede crear opciones para toda la organización.</p>}
          {error && <p role="alert" className="text-sm font-bold text-red-700">{error}</p>}
          {aviso && <p role="status" className="text-sm font-bold text-emerald-700">{aviso}</p>}
        </div>

        <div className="overflow-y-auto px-5 py-3 flex-1 min-h-0">
          {cargando && <p className="text-sm text-gray-500 flex items-center gap-2" role="status"><Loader2 size={14} className="animate-spin" /> Cargando…</p>}
          {!cargando && opciones.length === 0 && <p className="text-sm text-gray-500">No hay opciones con ese nombre.</p>}
          <ul className="space-y-2">
            {opciones.map((o, i) => (
              <li key={o.id} className={`rounded-2xl border p-3 ${o.archived ? "bg-gray-50 border-gray-200 opacity-80" : "bg-white border-gray-200"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {editando === o.id ? (
                      <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (await parchar(o, { name: nombreEdit }, "Nombre actualizado.")) setEditando(null); }}>
                        <input aria-label="Nuevo nombre" value={nombreEdit} onChange={(e) => setNombreEdit(e.target.value)} maxLength={80} className={campo} autoFocus />
                        <button type="submit" className="px-3 rounded-xl bg-blue-600 text-white text-xs font-extrabold cursor-pointer">Guardar</button>
                        <button type="button" onClick={() => setEditando(null)} className="px-3 rounded-xl bg-gray-100 text-xs font-bold cursor-pointer">Cancelar</button>
                      </form>
                    ) : (
                      <p className="text-sm font-extrabold text-gray-900 truncate">{o.name}{o.archived && <span className="ml-2 text-[10px] font-extrabold uppercase text-gray-500">Archivada</span>}</p>
                    )}
                    <p className="text-[11px] text-gray-500">
                      {o.scope === "organization" ? "Toda la organización" : "Solo una red"} · {o.usos ?? 0} actividad(es){o.isSystem ? " · del sistema" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {puedeEditar(o) && !o.archived && !q && (
                      <>
                        <button type="button" aria-label={`Subir ${o.name}`} disabled={i === 0} onClick={() => void mover(i, -1)} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 cursor-pointer"><ArrowUp size={14} /></button>
                        <button type="button" aria-label={`Bajar ${o.name}`} disabled={i === opciones.length - 1} onClick={() => void mover(i, 1)} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 cursor-pointer"><ArrowDown size={14} /></button>
                      </>
                    )}
                    {puedeEditar(o) && (
                      <button type="button" aria-label={`Renombrar ${o.name}`} onClick={() => { setEditando(o.id); setNombreEdit(o.name); }} className="p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer"><Pencil size={14} /></button>
                    )}
                    {puedeEditar(o) && (
                      <button type="button" aria-label={o.archived ? `Restaurar ${o.name}` : `Archivar ${o.name}`} onClick={() => void parchar(o, { archived: !o.archived }, o.archived ? "Opción restaurada." : "Opción archivada: ya no se ofrece en capturas nuevas.")} className="p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer">
                        {o.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                      </button>
                    )}
                    {esAdmin && !o.archived && (
                      <button type="button" aria-label={`Fusionar ${o.name} en otra`} onClick={() => setFusion({ origen: o, destinoId: "", afectadas: null })} className="p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer"><GitMerge size={14} /></button>
                    )}
                  </div>
                </div>

                {puedeEditar(o) && kind === "type" && !o.archived && (
                  <label className="mt-2 block">
                    <span className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">Cómo se ve en el mapa</span>
                    <select value={o.incidentCategory} onChange={(e) => void parchar(o, { incidentCategory: e.target.value }, "Categoría del mapa actualizada.")} className={campo}>
                      {CATEGORIAS.map((c) => <option key={c.clave} value={c.clave}>{c.etiqueta}</option>)}
                    </select>
                  </label>
                )}

                {fusion?.origen.id === o.id && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                    <p className="text-xs font-extrabold text-amber-900">Fusionar «{o.name}» en otra opción</p>
                    <select aria-label="Opción de destino" value={fusion.destinoId} onChange={(e) => void simularFusion(o, e.target.value)} className={campo}>
                      <option value="">Elige la opción que se conserva…</option>
                      {opciones.filter((x) => x.id !== o.id && !x.archived).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </select>
                    {fusion.afectadas !== null && (
                      <p className="text-xs font-bold text-amber-900">
                        Se moverán {fusion.afectadas} actividad(es) a la opción elegida y «{o.name}» quedará archivada. La operación queda en el registro de auditoría.
                      </p>
                    )}
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setFusion(null)} className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-bold cursor-pointer">Cancelar</button>
                      <button type="button" disabled={fusion.afectadas === null} onClick={() => void confirmarFusion()} className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-extrabold disabled:opacity-50 cursor-pointer">Confirmar fusión</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
