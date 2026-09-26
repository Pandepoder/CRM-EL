"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, ChevronRight, Layers, MapPin, PlusCircle, Search, Users, X } from "lucide-react";

import { AddressAutocomplete, type AutocompleteItem } from "@/components/AddressAutocomplete";
import { ESTADOS_INCIDENCIA, ESTADO_DESCONOCIDO } from "@/lib/estados-incidencia";
import { TODO_JALISCO } from "@/lib/municipios-jalisco";

import { BLOQUES, calcularResultado, categoriaDe } from "./constantes";
import type { BloqueElectoral, ReportFeature, SectionProperties } from "./tipos";

export type Panel = "none" | "search" | "section" | "incidents";

const PRIORIDADES: Record<string, { fondo: string; texto: string; leyenda: string }> = {
  A: { fondo: "#fee2e2", texto: "#991b1b", leyenda: "máxima" },
  B: { fondo: "#ffedd5", texto: "#9a3412", leyenda: "alta" },
  C: { fondo: "#fef9c3", texto: "#854d0e", leyenda: "media" },
  D: { fondo: "#f1f5f9", texto: "#475569", leyenda: "baja" }
};

function ResultadoElectoral({ seccion }: { seccion: SectionProperties }) {
  const atlas = seccion.atlas;
  if (!atlas) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl px-3 py-2.5 text-[11px] text-slate-500">
        Esta sección no tiene ficha en el atlas de campaña, así que no hay resultado electoral que mostrar. Las
        métricas de abajo sí son de esta sección.
      </div>
    );
  }
  const r = calcularResultado(atlas);
  const ganador = BLOQUES[r.ganador];
  const barras = (Object.keys(BLOQUES) as BloqueElectoral[])
    .map((clave) => ({ clave, votos: atlas.votes[clave], pct: r.total > 0 ? (atlas.votes[clave] / r.total) * 100 : 0 }))
    .sort((a, b) => b.votos - a.votos);
  const prio = PRIORIDADES[atlas.priority] ?? PRIORIDADES.D!;
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div style={{ background: ganador.color }} className="px-3 py-2.5 text-white">
        <div className="text-[9px] font-bold uppercase tracking-wider opacity-85">Última elección</div>
        <div className="text-[15px] font-black">{r.empate ? "Empate técnico" : `Ganó ${ganador.etiqueta}`}</div>
        <div className="text-[11px] font-semibold opacity-90">
          {r.empate ? `${r.votosGanador.toLocaleString("es-MX")} votos cada uno` : `Ventaja de ${r.margen.toFixed(1)} puntos sobre el segundo`}
        </div>
      </div>
      <div className="px-3 py-2.5 bg-white">
        {barras.map((b) => {
          const bloque = BLOQUES[b.clave];
          return (
            <div key={b.clave} className="mb-2">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="font-bold text-slate-900">{bloque.etiqueta}</span>
                <span className="font-extrabold" style={{ color: bloque.color }}>{b.votos.toLocaleString("es-MX")} · {b.pct.toFixed(1)}%</span>
              </div>
              <div className="h-[7px] bg-slate-100 rounded overflow-hidden">
                <div className="h-full rounded" style={{ width: `${b.pct}%`, background: bloque.color }} />
              </div>
            </div>
          );
        })}
        <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-slate-100 flex-wrap">
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md" style={{ background: prio.fondo, color: prio.texto }}>Prioridad {atlas.priority} ({prio.leyenda})</span>
          <span className="text-[11px] text-slate-600 font-semibold">{r.total.toLocaleString("es-MX")} votos totales</span>
        </div>
        {atlas.pollingPlace && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-100">
            <div className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Casilla de referencia</div>
            <div className="text-[11px] text-slate-700 mt-1 leading-snug">{atlas.pollingPlace}</div>
          </div>
        )}
        {atlas.source && <div className="text-[9px] text-slate-400 mt-2 italic">Fuente: {atlas.source}</div>}
      </div>
    </div>
  );
}

export function PanelDelMapa(p: {
  esMovil: boolean;
  panel: Panel;
  onCerrar: () => void;
  // Búsqueda
  municipio: string;
  busqueda: string;
  onBusqueda: (v: string) => void;
  onElegirResultado: (item: AutocompleteItem) => void;
  secciones: SectionProperties[];
  onElegirSeccion: (s: SectionProperties) => void;
  // Sección
  seccion: SectionProperties | null;
  incidenciasDeLaSeccion: number;
  puedeReportar: boolean;
  onReportarEnSeccion: (s: SectionProperties) => void;
  // Incidencias
  reportes: ReportFeature[];
  onCentrar: (r: ReportFeature) => void;
}) {
  if (p.panel === "none") return null;
  const titulo =
    p.panel === "search" ? <><Search size={15} className="text-blue-600" /> Buscar en el mapa</>
      : p.panel === "section" ? <><Layers size={15} className="text-indigo-600" /> Sección electoral</>
        : <><AlertCircle size={15} className="text-red-600" /> En el mapa ({p.reportes.length})</>;

  // En escritorio, panel a la derecha; en el teléfono, hoja inferior que no se sale de la pantalla
  // (C13: el panel iba de x = −4 a x = 347 en una pantalla de 375). Por encima de la barra inferior y
  // del botón flotante, como todo diálogo del repo (110).
  const marco = p.esMovil
    ? "absolute left-0 right-0 bottom-0 z-[110] max-h-[78%] rounded-t-3xl"
    : "absolute top-3 right-3 bottom-3 z-30 w-[370px] max-w-[calc(100%-24px)] rounded-2xl";

  return (
    <>
      {p.esMovil && <button type="button" aria-label="Cerrar panel" onClick={p.onCerrar} className="absolute inset-0 z-[109] bg-slate-900/25 cursor-default" />}
      <div role="dialog" aria-label="Panel del mapa" className={`${marco} bg-white/95 backdrop-blur border border-slate-200 shadow-2xl flex flex-col overflow-hidden`}>
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <h3 className="m-0 font-black text-[13px] text-slate-900 flex items-center gap-1.5">{titulo}</h3>
          <button type="button" onClick={p.onCerrar} className="p-1.5 rounded-lg bg-black/5 text-slate-600 cursor-pointer" aria-label="Cerrar panel" title="Cerrar panel">
            <X size={17} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-3.5 pb-10 flex flex-col gap-2.5">
          {p.panel === "search" && (
            <>
              <AddressAutocomplete
                value={p.busqueda}
                onChange={p.onBusqueda}
                onSelect={p.onElegirResultado}
                // "all" viaja tal cual: dice "todo Jalisco" a propósito. Con undefined el
                // autocompletado cae al municipio de la sesión y anulaba la elección.
                municipality={p.municipio || undefined}
                label="Calle, colonia o sección"
                placeholder="Escribe calle, colonia o sección..."
              />
              {p.municipio === TODO_JALISCO ? (
                <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  Elige un municipio en «Cómo lo veo» para ver y filtrar sus secciones aquí.
                </p>
              ) : (
                <div className="flex flex-col gap-1 mt-1">
                  <div className="text-[10px] font-extrabold text-slate-500 uppercase">Secciones ({p.secciones.length})</div>
                  {p.secciones.map((s) => (
                    <button
                      key={s.section_num}
                      type="button"
                      onClick={() => p.onElegirSeccion(s)}
                      className={`flex items-center justify-between px-2.5 py-2 rounded-lg border text-left w-full cursor-pointer ${p.seccion?.section_num === s.section_num ? "bg-blue-100 border-blue-200" : "bg-slate-50 border-slate-200"}`}
                    >
                      <span>
                        <span className="block text-[11px] font-extrabold text-slate-900">Sección {s.section_num} <span className="text-[10px] text-blue-600 font-semibold">({s.municipality || "Sin municipio"})</span></span>
                        <span className="block text-[10px] text-slate-500">{s.colonies.slice(0, 3).join(", ") || s.municipality}</span>
                      </span>
                      <ChevronRight size={13} className="text-slate-400" />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {p.panel === "section" && (p.seccion ? (
            <>
              <div>
                <span className="inline-block bg-blue-100 text-blue-800 font-extrabold text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded mb-1">{p.seccion.municipality || "Sin municipio"}</span>
                <h2 className="m-0 text-[18px] font-black text-slate-900">Sección {p.seccion.section_num}</h2>
                {p.seccion.atlas?.mainColony && <div className="text-[12px] text-slate-600 mt-0.5">{p.seccion.atlas.mainColony}</div>}
              </div>
              <ResultadoElectoral seccion={p.seccion} />
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  ["Simpatizantes", p.seccion.contactsCount, "#4f46e5"],
                  ["Visitas", p.seccion.visitsCompleted, "#059669"],
                  ["Por atender", p.incidenciasDeLaSeccion, "#d97706"]
                ].map(([texto, valor, color]) => (
                  <div key={String(texto)} className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-center">
                    <div className="text-[9px] font-bold text-slate-500 uppercase">{texto}</div>
                    <div className="text-[16px] font-black mt-0.5" style={{ color: String(color) }}>{valor}</div>
                  </div>
                ))}
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Colonias en esta sección</div>
                <div className="flex flex-wrap gap-1 max-h-[110px] overflow-y-auto">
                  {p.seccion.colonies.length > 0
                    ? p.seccion.colonies.map((c) => <span key={c} className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-md">{c}</span>)
                    : <span className="text-[11px] text-slate-400 italic">Sin colonias registradas</span>}
                </div>
              </div>
              <div className="flex gap-1.5 pt-2 border-t border-slate-100">
                {/* Antes llevaba a /crm?seccion=, que redirige al Directorio y pierde el filtro (M27). El
                    buscador del Directorio encuentra por número de sección. */}
                <Link href={`/crm/contacts?q=${p.seccion.section_num}`} className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 text-white no-underline font-extrabold py-2.5 rounded-lg text-[11px]">
                  <Users size={13} /> Ver sus ciudadanos
                </Link>
                {p.puedeReportar && (
                  <button type="button" onClick={() => p.onReportarEnSeccion(p.seccion!)} className="flex items-center gap-1 bg-red-600 text-white font-extrabold px-3 py-2.5 rounded-lg text-[11px] cursor-pointer">
                    <PlusCircle size={13} /> Reportar aquí
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8 px-2.5 text-slate-400">
              <Layers size={28} className="mx-auto mb-2" />
              <p className="text-[12px] m-0">Toca una sección en el mapa para ver sus números.</p>
            </div>
          ))}

          {p.panel === "incidents" && (p.reportes.length === 0 ? (
            <div className="text-center py-8 px-2.5 text-slate-400">
              <CheckCircle2 size={28} className="mx-auto mb-2 text-green-600" />
              <p className="text-[12px] m-0">No hay incidencias en el mapa.</p>
            </div>
          ) : p.reportes.map((r) => {
            const cat = categoriaDe(r.properties.category);
            const estado = ESTADOS_INCIDENCIA[r.properties.status] ?? ESTADO_DESCONOCIDO;
            return (
              <div key={r.properties.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded" style={{ color: cat.color, background: cat.bg }}>
                    {r.properties.esActividad ? "Actividad · " : ""}{cat.label}
                  </span>
                  <span className="text-[10px] font-bold" style={{ color: estado.color }}>{estado.label}</span>
                </div>
                <h4 className="m-0 mb-0.5 font-extrabold text-[12px] text-slate-900">{r.properties.title}</h4>
                <p className="m-0 mb-1.5 text-[11px] text-slate-600 leading-snug line-clamp-3">{r.properties.description}</p>
                <div className="flex items-center justify-between border-t border-slate-200 pt-1.5">
                  <span className="text-[10px] font-bold text-blue-700 inline-flex items-center gap-1"><MapPin size={10} /> {r.properties.municipality || "Sin municipio"}</span>
                  <button type="button" onClick={() => p.onCentrar(r)} className="flex items-center gap-1 bg-blue-600 text-white font-bold px-2 py-1 rounded-md text-[10px] cursor-pointer">
                    <MapPin size={10} /> Ver en el mapa
                  </button>
                </div>
              </div>
            );
          }))}
        </div>
      </div>
    </>
  );
}
