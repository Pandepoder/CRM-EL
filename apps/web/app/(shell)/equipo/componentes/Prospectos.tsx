"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, ChevronLeft, ChevronRight, Loader2, Pencil, Plus, Search, UserCheck, X } from "lucide-react";

import { aValorLocal } from "@/lib/actividades";
import type { OpcionSelector } from "@/lib/bitacora-tipos";
import { CLAVES_DISPOSICION, DISPOSICIONES, ETIQUETA_NOTAS_INTERNAS, type PosibleContacto, type ProspectoItem } from "@/lib/prospectos";

import { llamar } from "./api";
import { buscarCatalogo, crearEnCatalogo } from "./buscadores";
import { formatearFecha, formatearFechaHora } from "./presentacion";
import { SelectorBuscable } from "./SelectorBuscable";

type Pagina = { items: ProspectoItem[]; total: number; pagina: number; tamano: number };

type Borrador = {
  prospectName: string; organizationOrReference: string; perfil: OpcionSelector[]; disposition: string; dispositionNotes: string;
  activityDate: string; locationText: string; commitments: string; privateNotes: string; nextStep: string; nextStepAt: string;
};

const vacio = (): Borrador => ({
  prospectName: "", organizationOrReference: "", perfil: [], disposition: "interesado", dispositionNotes: "",
  activityDate: aValorLocal(new Date()), locationText: "", commitments: "", privateNotes: "", nextStep: "", nextStepAt: ""
});

const campo = "w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none";
const etiqueta = "block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1";

export function Prospectos({ esAdmin, puedeConvertir }: { esAdmin: boolean; puedeConvertir: boolean }) {
  const [datos, setDatos] = useState<Pagina | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [consulta, setConsulta] = useState("");
  const [disposicion, setDisposicion] = useState("");
  const [estado, setEstado] = useState<"" | "pendientes" | "convertidos">("");
  const [pagina, setPagina] = useState(1);
  const [aviso, setAviso] = useState<string | null>(null);
  const [formulario, setFormulario] = useState<{ id: string | null; borrador: Borrador } | null>(null);
  const [conversion, setConversion] = useState<{ prospecto: ProspectoItem; posibles: PosibleContacto[] | null } | null>(null);

  useEffect(() => { const t = setTimeout(() => { setConsulta(q.trim()); setPagina(1); }, 350); return () => clearTimeout(t); }, [q]);

  const cargar = useCallback(async () => {
    setCargando(true);
    const p = new URLSearchParams({ pagina: String(pagina) });
    if (consulta) p.set("q", consulta);
    if (disposicion) p.set("disposicion", disposicion);
    if (estado) p.set("estado", estado);
    const r = await llamar<Pagina>(`/api/prospectos?${p.toString()}`);
    setCargando(false);
    if (!r.ok) { setError(r.error); return; }
    setError(null);
    setDatos(r.datos);
  }, [consulta, disposicion, estado, pagina]);
  useEffect(() => { void cargar(); }, [cargar]);

  function abrirEdicion(p: ProspectoItem) {
    setFormulario({
      id: p.id,
      borrador: {
        prospectName: p.prospectName, organizationOrReference: p.organizationOrReference ?? "",
        perfil: p.profileOptionId ? [{ id: p.profileOptionId, nombre: p.profileName }] : [], disposition: p.disposition,
        dispositionNotes: p.dispositionNotes ?? "", activityDate: aValorLocal(new Date(p.activityDate)), locationText: p.locationText ?? "",
        commitments: p.commitments ?? "", privateNotes: p.privateNotes ?? "", nextStep: p.nextStep ?? "",
        nextStepAt: p.nextStepAt ? aValorLocal(new Date(p.nextStepAt)) : ""
      }
    });
  }

  async function iniciarConversion(p: ProspectoItem) {
    setAviso(null);
    setConversion({ prospecto: p, posibles: null });
    const r = await llamar<{ yaConvertido: boolean; contactId: string | null; posibles: PosibleContacto[] }>(`/api/prospectos/${p.id}/convertir`, { cuerpo: { accion: "revisar" } });
    if (!r.ok) { setConversion(null); setError(r.error); return; }
    if (r.datos.yaConvertido) { setConversion(null); setAviso("Este prospecto ya había sido convertido."); void cargar(); return; }
    setConversion({ prospecto: p, posibles: r.datos.posibles });
  }

  const ultima = datos ? Math.max(1, Math.ceil(datos.total / datos.tamano)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <p className="text-sm text-gray-600 max-w-xl">Personas que conociste en una actividad y aún no son contacto. Da seguimiento y conviértelas cuando estén listas.</p>
        <button type="button" onClick={() => setFormulario({ id: null, borrador: vacio() })} className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 cursor-pointer">
          <Plus size={15} /> Nuevo prospecto
        </button>
      </div>

      <div className="bg-white p-3 rounded-2xl border border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input type="search" aria-label="Buscar prospectos" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, organización o lugar…" className={campo + " pl-9"} />
        </div>
        <select aria-label="Disposición" value={disposicion} onChange={(e) => { setDisposicion(e.target.value); setPagina(1); }} className={campo}>
          <option value="">Toda disposición</option>
          {CLAVES_DISPOSICION.map((k) => <option key={k} value={k}>{DISPOSICIONES[k]!.label}</option>)}
        </select>
        <select aria-label="Estado" value={estado} onChange={(e) => { setEstado(e.target.value as typeof estado); setPagina(1); }} className={campo}>
          <option value="">Pendientes y convertidos</option><option value="pendientes">Pendientes de convertir</option><option value="convertidos">Ya convertidos</option>
        </select>
      </div>

      {aviso && <p role="status" className="text-sm font-bold text-emerald-700">{aviso}</p>}
      {error && <p role="alert" className="text-sm font-bold text-red-700">{error}</p>}
      {cargando && !datos && <p className="text-sm text-gray-500 flex items-center gap-2" role="status"><Loader2 size={14} className="animate-spin" /> Cargando…</p>}

      <ul className="space-y-3">
        {datos?.items.map((p) => (
          <li key={p.id} className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg ${DISPOSICIONES[p.disposition]?.clase ?? "bg-gray-100 text-gray-700"}`}>{DISPOSICIONES[p.disposition]?.label ?? p.disposition}</span>
                  <span className="text-[11px] font-bold text-gray-600 bg-gray-100 rounded-lg px-2.5 py-0.5">{p.profileName}</span>
                  {p.convertedToContactId && <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-0.5">Convertido</span>}
                </div>
                <h3 className="font-extrabold text-gray-900">{p.prospectName}</h3>
                <p className="text-xs text-gray-600">{[p.organizationOrReference, p.locationText].filter(Boolean).join(" · ") || "Sin organización ni lugar"}</p>
                <p className="text-[11px] text-gray-500 mt-1">Conversación: {formatearFecha(p.activityDate)}{p.createdByName ? ` · registró ${p.createdByName}` : ""}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {p.convertedToContactId ? (
                  <Link href={`/crm/contacts/${p.convertedToContactId}`} className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-extrabold inline-flex items-center gap-1.5 hover:bg-emerald-100">
                    <UserCheck size={13} /> Ver contacto
                  </Link>
                ) : (
                  <>
                    <button type="button" onClick={() => abrirEdicion(p)} className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"><Pencil size={13} /> Editar</button>
                    {puedeConvertir && <button type="button" onClick={() => void iniciarConversion(p)} className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"><UserCheck size={13} /> Convertir a contacto</button>}
                  </>
                )}
              </div>
            </div>
            {(p.commitments || p.nextStep || p.privateNotes || p.dispositionNotes) && (
              <dl className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {p.nextStep && <div className="sm:col-span-2"><dt className="text-[11px] font-extrabold uppercase text-gray-500 flex items-center gap-1"><CalendarClock size={11} /> Próximo paso</dt><dd className="font-bold text-gray-900">{p.nextStep}{p.nextStepAt ? ` · ${formatearFechaHora(p.nextStepAt)}` : ""}</dd></div>}
                {p.commitments && <div><dt className="text-[11px] font-extrabold uppercase text-gray-500">Acuerdos</dt><dd className="text-gray-800">{p.commitments}</dd></div>}
                {p.dispositionNotes && <div><dt className="text-[11px] font-extrabold uppercase text-gray-500">Sobre su disposición</dt><dd className="text-gray-800">{p.dispositionNotes}</dd></div>}
                {p.privateNotes && <div className="sm:col-span-2"><dt className="text-[11px] font-extrabold uppercase text-gray-500">Notas internas</dt><dd className="text-gray-800 whitespace-pre-wrap">{p.privateNotes}</dd></div>}
              </dl>
            )}
          </li>
        ))}
      </ul>
      {datos && datos.items.length === 0 && (
        <div className="text-center bg-white rounded-2xl border border-dashed border-gray-300 p-10">
          <p className="font-extrabold text-gray-800">{consulta || disposicion || estado ? "Ningún prospecto coincide." : "Aún no hay prospectos."}</p>
        </div>
      )}
      {ultima > 1 && (
        <nav className="flex items-center justify-between" aria-label="Paginación de prospectos">
          <button type="button" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)} className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-xs font-extrabold inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer"><ChevronLeft size={14} /> Anterior</button>
          <span className="text-xs font-bold text-gray-600">Página {pagina} de {ultima} · {datos?.total} prospectos</span>
          <button type="button" disabled={pagina >= ultima} onClick={() => setPagina((p) => p + 1)} className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-xs font-extrabold inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer">Siguiente <ChevronRight size={14} /></button>
        </nav>
      )}

      {formulario && <FormularioProspecto id={formulario.id} inicial={formulario.borrador} esAdmin={esAdmin} onCerrar={() => setFormulario(null)} onGuardado={(m) => { setFormulario(null); setAviso(m); void cargar(); }} />}
      {conversion && <DialogoConversion p={conversion.prospecto} posibles={conversion.posibles} onCerrar={() => setConversion(null)} onListo={(m) => { setConversion(null); setAviso(m); void cargar(); }} />}
    </div>
  );
}

function FormularioProspecto({ id, inicial, esAdmin, onCerrar, onGuardado }: { id: string | null; inicial: Borrador; esAdmin: boolean; onCerrar: () => void; onGuardado: (mensaje: string) => void }) {
  const [f, setF] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const poner = <K extends keyof Borrador>(k: K, v: Borrador[K]) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    const t = (e: KeyboardEvent) => { if (e.key === "Escape" && !guardando) onCerrar(); };
    document.addEventListener("keydown", t);
    return () => document.removeEventListener("keydown", t);
  }, [guardando, onCerrar]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (guardando) return;
    if (f.prospectName.trim().length < 2) { setError("Escribe el nombre del prospecto."); return; }
    setGuardando(true); setError(null);
    const cuerpo = {
      prospectName: f.prospectName, organizationOrReference: f.organizationOrReference || null, profileOptionId: f.perfil[0]?.id ?? null,
      disposition: f.disposition, dispositionNotes: f.dispositionNotes || null, activityDate: new Date(f.activityDate).toISOString(),
      locationText: f.locationText || null, commitments: f.commitments || null, privateNotes: f.privateNotes || null,
      nextStep: f.nextStep || null, nextStepAt: f.nextStepAt ? new Date(f.nextStepAt).toISOString() : null
    };
    const r = await llamar(id ? `/api/prospectos/${id}` : "/api/prospectos", { method: id ? "PATCH" : "POST", cuerpo });
    setGuardando(false);
    if (!r.ok) { setError(r.error); return; }
    onGuardado(id ? "Prospecto actualizado." : "Prospecto registrado.");
  }

  return (
    <div className="fixed inset-0 z-[110] bg-black/50 flex items-end sm:items-center justify-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !guardando) onCerrar(); }}>
      <form onSubmit={guardar} noValidate role="dialog" aria-modal="true" aria-label={id ? "Editar prospecto" : "Nuevo prospecto"} className="bg-white w-full sm:max-w-xl max-h-[94dvh] flex flex-col rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white shrink-0">
          <h2 className="text-base font-extrabold">{id ? "Editar prospecto" : "Nuevo prospecto"}</h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
          <div>
            <label htmlFor="pr-nombre" className={etiqueta}>Nombre *</label>
            <input id="pr-nombre" value={f.prospectName} onChange={(e) => poner("prospectName", e.target.value)} maxLength={160} aria-invalid={error && f.prospectName.trim().length < 2 ? true : undefined} className={campo} autoFocus />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <SelectorBuscable etiqueta="Perfil" valor={f.perfil} onCambiar={(v) => poner("perfil", v)} buscar={buscarCatalogo("profile")} crear={crearEnCatalogo("profile", "perfil", esAdmin)} placeholder="Busca o crea un perfil…" />
            <div>
              <label htmlFor="pr-disp" className={etiqueta}>Disposición</label>
              <select id="pr-disp" value={f.disposition} onChange={(e) => poner("disposition", e.target.value)} className={campo}>
                {CLAVES_DISPOSICION.map((k) => <option key={k} value={k}>{DISPOSICIONES[k]!.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label htmlFor="pr-org" className={etiqueta}>Organización o referencia</label><input id="pr-org" value={f.organizationOrReference} onChange={(e) => poner("organizationOrReference", e.target.value)} maxLength={200} className={campo} /></div>
            <div><label htmlFor="pr-lugar" className={etiqueta}>Lugar</label><input id="pr-lugar" value={f.locationText} onChange={(e) => poner("locationText", e.target.value)} maxLength={240} placeholder="Colonia, calle o cruce" className={campo} /></div>
          </div>
          <div>
            <label htmlFor="pr-fecha" className={etiqueta}>Cuándo conversaron</label>
            <input id="pr-fecha" type="datetime-local" value={f.activityDate} max={aValorLocal(new Date())} onChange={(e) => poner("activityDate", e.target.value)} className={campo} />
          </div>
          <div><label htmlFor="pr-acuerdos" className={etiqueta}>Acuerdos</label><textarea id="pr-acuerdos" rows={2} value={f.commitments} onChange={(e) => poner("commitments", e.target.value)} className={campo + " resize-none"} /></div>
          <fieldset className="p-3 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-3">
            <legend className="px-1 text-xs font-extrabold uppercase tracking-wider text-blue-900">Próximo paso</legend>
            <div><label htmlFor="pr-paso" className="sr-only">Qué sigue</label><input id="pr-paso" value={f.nextStep} onChange={(e) => poner("nextStep", e.target.value)} maxLength={500} placeholder="Qué sigue con esta persona…" className={campo} /></div>
            <div><label htmlFor="pr-paso-f" className={etiqueta}>Cuándo</label><input id="pr-paso-f" type="datetime-local" value={f.nextStepAt} onChange={(e) => poner("nextStepAt", e.target.value)} className={campo} /></div>
          </fieldset>
          <div><label htmlFor="pr-dnotas" className={etiqueta}>Sobre su disposición</label><textarea id="pr-dnotas" rows={2} value={f.dispositionNotes} onChange={(e) => poner("dispositionNotes", e.target.value)} className={campo + " resize-none"} /></div>
          <div>
            <label htmlFor="pr-notas" className={etiqueta}>{ETIQUETA_NOTAS_INTERNAS}</label>
            <textarea id="pr-notas" rows={3} value={f.privateNotes} onChange={(e) => poner("privateNotes", e.target.value)} className={campo + " resize-none"} />
          </div>
          {error && <p role="alert" className="text-sm font-bold text-red-700">{error}</p>}
        </div>
        <div className="shrink-0 border-t border-gray-100 px-5 py-3 flex justify-end gap-2">
          <button type="button" onClick={onCerrar} disabled={guardando} className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold cursor-pointer">Cancelar</button>
          <button type="submit" disabled={guardando} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-extrabold inline-flex items-center gap-2 cursor-pointer disabled:opacity-70">
            {guardando && <Loader2 size={14} className="animate-spin" />} {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function DialogoConversion({ p, posibles, onCerrar, onListo }: { p: ProspectoItem; posibles: PosibleContacto[] | null; onCerrar: () => void; onListo: (mensaje: string) => void }) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = (e: KeyboardEvent) => { if (e.key === "Escape" && !ocupado) onCerrar(); };
    document.addEventListener("keydown", t);
    return () => document.removeEventListener("keydown", t);
  }, [ocupado, onCerrar]);

  async function convertir(cuerpo: Record<string, unknown>) {
    if (ocupado) return;
    setOcupado(true); setError(null);
    const r = await llamar<{ message: string }>(`/api/prospectos/${p.id}/convertir`, { cuerpo: { accion: "convertir", ...cuerpo } });
    setOcupado(false);
    if (!r.ok) { setError(r.error); return; }
    onListo(r.datos.message);
  }

  return (
    <div className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !ocupado) onCerrar(); }}>
      <div role="dialog" aria-modal="true" aria-label="Convertir a contacto" className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <h2 className="text-base font-extrabold">Convertir «{p.prospectName}» en contacto</h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {posibles === null ? (
            <p className="text-sm text-gray-600 flex items-center gap-2" role="status"><Loader2 size={14} className="animate-spin" /> Buscando contactos parecidos…</p>
          ) : posibles.length === 0 ? (
            <p className="text-sm text-gray-700">No hay contactos parecidos. Se creará un contacto nuevo con lo capturado, una nota con los acuerdos y la procedencia del registro.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-bold text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-3">Ya hay contactos que se parecen. Si es la misma persona, vincúlala en vez de crear otra ficha.</p>
              <ul className="space-y-2">
                {posibles.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 border border-gray-200 rounded-xl p-3">
                    <div className="min-w-0"><p className="text-sm font-extrabold text-gray-900 truncate">{c.nombre}</p>{c.detalle && <p className="text-[11px] text-gray-500 truncate">{c.detalle}</p>}</div>
                    <div className="flex gap-2 shrink-0">
                      <Link href={`/crm/contacts/${c.id}`} target="_blank" className="text-xs font-bold text-blue-700 hover:underline self-center">Ver</Link>
                      <button type="button" disabled={ocupado} onClick={() => void convertir({ contactoExistenteId: c.id })} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-extrabold cursor-pointer disabled:opacity-60">Es esta persona</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {error && <p role="alert" className="text-sm font-bold text-red-700">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onCerrar} disabled={ocupado} className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold cursor-pointer">Cancelar</button>
            {posibles !== null && (
              <button type="button" disabled={ocupado} onClick={() => void convertir({ confirmarNuevo: true })} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-extrabold inline-flex items-center gap-2 cursor-pointer disabled:opacity-60">
                {ocupado && <Loader2 size={14} className="animate-spin" />} {posibles.length > 0 ? "Es una persona nueva" : "Crear contacto"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
