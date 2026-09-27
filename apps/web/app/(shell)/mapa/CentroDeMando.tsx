"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertCircle, Archive, ArrowLeft, Check, CheckCircle2, Download, Edit3, Flame, ListFilter, MapPin, Search, ShieldAlert } from "lucide-react";

import { MediaGallery } from "@/components/MediaGallery";
import { ESTADOS_INCIDENCIA, ESTADO_DESCONOCIDO } from "@/lib/estados-incidencia";
import { MUNICIPIOS_JALISCO, TODO_JALISCO } from "@/lib/municipios-jalisco";

import { CATEGORIES, categoriaDe } from "./constantes";
import type { ReportFeature } from "./tipos";

type Pestana = "abiertas" | "emergencias" | "resueltas" | "todas";

const abierta = (r: ReportFeature) => !(ESTADOS_INCIDENCIA[r.properties.status]?.cerrada ?? false);

/**
 * La lista de lo que hay en el mapa. Las cifras cuentan incidencias, no actividades de la bitácora,
 * que también salen en el mapa pero se trabajan en la Agenda; y un estado se nombra como en el resto
 * del sistema (antes todo lo que no era «resuelta» decía «Pendiente», también lo archivado).
 */
export function CentroDeMando(p: {
  reportes: ReportFeature[];
  diasDeResueltas: number;
  esAdmin: boolean;
  onVolver: () => void;
  onCentrar: (r: ReportFeature) => void;
  onEditar: (r: ReportFeature) => void;
  onCambiarEstado: (id: string, estado: string) => void;
  onArchivarResueltas: () => void;
  onExportar: (lista: ReportFeature[]) => void;
}) {
  const [pestana, setPestana] = useState<Pestana>("abiertas");
  const [busqueda, setBusqueda] = useState("");
  const [municipio, setMunicipio] = useState<string>(TODO_JALISCO);
  const [categoria, setCategoria] = useState("all");

  const incidencias = p.reportes.filter((r) => !r.properties.esActividad);
  const abiertas = incidencias.filter(abierta);
  const emergencias = abiertas.filter((r) => r.properties.category === "emergencia");
  const resueltas = incidencias.filter((r) => r.properties.status === "resolved");
  const efectividad = abiertas.length + resueltas.length > 0 ? Math.round((resueltas.length / (abiertas.length + resueltas.length)) * 100) : 100;

  const lista = useMemo(() => {
    let base = p.reportes;
    const q = busqueda.toLowerCase().trim();
    if (q) {
      base = base.filter((r) =>
        r.properties.title.toLowerCase().includes(q) ||
        r.properties.description.toLowerCase().includes(q) ||
        String(r.properties.sectionNum || "").includes(q) ||
        (r.properties.municipality || "").toLowerCase().includes(q)
      );
    }
    if (municipio !== TODO_JALISCO) base = base.filter((r) => r.properties.municipality === municipio);
    if (categoria !== "all") base = base.filter((r) => r.properties.category === categoria);
    if (pestana === "abiertas") base = base.filter((r) => abierta(r) && !r.properties.esActividad);
    else if (pestana === "emergencias") base = base.filter((r) => abierta(r) && !r.properties.esActividad && r.properties.category === "emergencia");
    else if (pestana === "resueltas") base = base.filter((r) => r.properties.status === "resolved" && !r.properties.esActividad);
    return [...base].sort((a, b) => {
      const urgencia = (r: ReportFeature) => (r.properties.category === "emergencia" && abierta(r) ? 1 : 0);
      if (urgencia(a) !== urgencia(b)) return urgencia(b) - urgencia(a);
      return new Date(b.properties.createdAt).getTime() - new Date(a.properties.createdAt).getTime();
    });
  }, [p.reportes, busqueda, municipio, categoria, pestana]);

  const control = "w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-[11px] font-bold outline-none";

  return (
    <div className="absolute inset-0 bg-slate-50 z-20 p-4 md:p-5 overflow-y-auto">
      <div className="max-w-[1100px] mx-auto flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <button type="button" onClick={p.onVolver} className="mb-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-[12px] font-extrabold text-slate-700 cursor-pointer">
              <ArrowLeft size={14} /> Volver al mapa
            </button>
            <h1 className="m-0 text-[20px] font-black text-slate-900">Incidencias en el mapa</h1>
            <p className="mt-1 mb-0 text-slate-500 text-[12px]">
              Lo que sigue abierto y lo resuelto en los últimos {p.diasDeResueltas} días. El historial completo está en{" "}
              <Link href="/historial-incidencias" className="font-bold text-blue-700 underline">Incidencias → Historial</Link>.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => p.onExportar(lista)} className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-[11px] font-extrabold cursor-pointer">
              <Download size={14} /> Exportar CSV
            </button>
            {/* Solo administración: la API de acciones en bloque es suya. Antes el botón «Purgar» se
                ofrecía a todos y BORRABA lo resuelto, actividades de la bitácora incluidas (D16). */}
            {p.esAdmin && (
              <button type="button" onClick={p.onArchivarResueltas} className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-[11px] font-extrabold cursor-pointer">
                <Archive size={14} /> Archivar resueltas
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {[
            ["Abiertas", abiertas.length, "border-amber-200", "text-amber-900"],
            ["Emergencias", emergencias.length, "border-red-200", "text-red-700"],
            [`Resueltas (${p.diasDeResueltas} días)`, resueltas.length, "border-green-200", "text-green-700"],
            ["Efectividad", `${efectividad}%`, "border-slate-200", "text-blue-600"]
          ].map(([texto, valor, borde, color]) => (
            <div key={String(texto)} className={`bg-white border ${borde} rounded-xl p-3`}>
              <div className="text-[11px] font-extrabold text-slate-600 uppercase">{texto}</div>
              <div className={`text-[24px] font-black mt-0.5 ${color}`}>{valor}</div>
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-2">
            {([
              ["abiertas", `Abiertas (${abiertas.length})`, Flame],
              ["emergencias", `Emergencias (${emergencias.length})`, ShieldAlert],
              ["resueltas", `Resueltas (${resueltas.length})`, CheckCircle2],
              ["todas", `Todo el mapa (${p.reportes.length})`, ListFilter]
            ] as const).map(([clave, texto, Icono]) => (
              <button
                key={clave}
                type="button"
                onClick={() => setPestana(clave)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-extrabold cursor-pointer ${pestana === clave ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                <Icono size={13} /> {texto}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <label className="relative flex items-center">
              <Search size={14} className="absolute left-2.5 text-slate-400" />
              <span className="sr-only">Buscar</span>
              <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por texto, sección o municipio…" className={`${control} pl-8`} />
            </label>
            <select value={municipio} onChange={(e) => setMunicipio(e.target.value)} className={control} aria-label="Municipio">
              <option value={TODO_JALISCO}>Todos los municipios</option>
              {MUNICIPIOS_JALISCO.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
            </select>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={control} aria-label="Categoría">
              <option value="all">Todas las categorías</option>
              {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>

        {lista.length === 0 ? (
          <div className="bg-white py-10 px-5 rounded-2xl text-center border border-slate-200">
            <AlertCircle size={32} className="text-slate-400 mx-auto mb-2" />
            <h3 className="m-0 text-[13px] font-bold text-slate-900">Nada coincide con los filtros</h3>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {lista.map((r) => {
              const cat = categoriaDe(r.properties.category);
              const estado = ESTADOS_INCIDENCIA[r.properties.status] ?? ESTADO_DESCONOCIDO;
              const emergencia = r.properties.category === "emergencia" && !estado.cerrada;
              const fecha = new Date(r.properties.createdAt).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
              return (
                <div key={r.properties.id} className={`p-3.5 rounded-xl border ${emergencia ? "border-red-300 bg-white" : estado.cerrada ? "border-green-200 bg-green-50/30" : "border-slate-200 bg-white"}`}>
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded" style={{ color: cat.color, background: cat.bg }}>
                      {r.properties.esActividad ? "Actividad · " : ""}{cat.label}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400">{fecha}</span>
                      <span className="text-[11px] font-extrabold" style={{ color: emergencia ? "#dc2626" : estado.color }}>{emergencia ? "Emergencia" : estado.label}</span>
                    </span>
                  </div>
                  <h3 className="m-0 mb-0.5 text-[14px] font-extrabold text-slate-900">{r.properties.title}</h3>
                  <p className="m-0 mb-2 text-[12px] text-slate-600 leading-snug whitespace-pre-line">{r.properties.description}</p>
                  {r.properties.mediaUrls && r.properties.mediaUrls.length > 0 && (
                    <div className="mb-2.5"><MediaGallery media={r.properties.mediaUrls} title="Evidencias adjuntas" /></div>
                  )}
                  <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-2 gap-1.5">
                    <span className="text-[11px] font-bold text-blue-700 inline-flex items-center gap-1">
                      <MapPin size={10} /> {r.properties.municipality || "Sin municipio"} {r.properties.sectionNum ? `· Sección ${r.properties.sectionNum}` : ""}
                    </span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => p.onCentrar(r)} className="flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-300 font-bold px-2.5 py-1.5 rounded-lg text-[11px] cursor-pointer">
                        <MapPin size={12} /> Ver en el mapa
                      </button>
                      {r.properties.esActividad ? (
                        <Link href="/equipo" className="bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold px-2.5 py-1.5 rounded-lg text-[11px]">En la Agenda</Link>
                      ) : r.properties.puedeActualizar ? (
                        <>
                          <button type="button" onClick={() => p.onEditar(r)} className="bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg px-2 py-1.5 cursor-pointer" title="Editar o reasignar" aria-label="Editar o reasignar">
                            <Edit3 size={13} />
                          </button>
                          {estado.cerrada ? (
                            <button type="button" onClick={() => p.onCambiarEstado(r.properties.id, "active")} className="bg-slate-100 text-slate-600 border border-slate-300 font-bold px-2.5 py-1.5 rounded-lg text-[11px] cursor-pointer">Reabrir</button>
                          ) : (
                            <button type="button" onClick={() => p.onCambiarEstado(r.properties.id, "resolved")} className="flex items-center gap-1 bg-green-600 text-white font-bold px-3 py-1.5 rounded-lg text-[11px] cursor-pointer">
                              <Check size={13} /> Resolver
                            </button>
                          )}
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
