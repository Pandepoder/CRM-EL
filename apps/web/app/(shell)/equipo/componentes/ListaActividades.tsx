"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CalendarClock, ChevronLeft, ChevronRight, Filter, Loader2, MapPin, Search, User, X } from "lucide-react";

import { CLAVES_RESULTADO, RESULTADOS_ACTIVIDAD } from "@/lib/actividades";
import { ESTADOS_FILTRO, VISTAS_BITACORA, type ActividadItem, type FiltrosBitacora, type PaginaBitacora } from "@/lib/bitacora-tipos";

import { EtiquetaEstado, formatearFechaHora, InsigniaTipo } from "./presentacion";
import type { UsuarioOpcion } from "./FormularioActividad";

const TEXTO_ESTADO: Record<string, string> = {
  programada: "Programada", en_curso: "En curso", vencida: "Vencida", completada: "Completada", cancelada: "Cancelada", archivada: "Archivada"
};

export type OpcionFiltro = { id: string; nombre: string };

const claseCampo = "w-full p-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none";

/** Próximo paso de una actividad, dicho en una línea: lo que la persona necesita saber al mirar la lista. */
function proximoPaso(a: ActividadItem): { texto: string; alerta: boolean } | null {
  if (a.estado === "vencida") return { texto: `Venció el ${formatearFechaHora(a.scheduledAt)}: complétala, reprográmala o cancélala.`, alerta: true };
  if (a.estado === "programada" || a.estado === "en_curso") return { texto: `Programada para ${formatearFechaHora(a.scheduledAt)}.`, alerta: false };
  if (a.outcome === "follow_up_required" && !a.tieneSeguimiento) return { texto: "Requiere seguimiento y aún no tiene uno asignado.", alerta: true };
  if (a.tieneSeguimiento) return { texto: "Tiene un seguimiento derivado.", alerta: false };
  return null;
}

export function ListaActividades({
  pagina, filtros, usuarios, tipos, etiquetas, puedeAsignar, contactoNombre, onAbrir
}: {
  pagina: PaginaBitacora;
  filtros: FiltrosBitacora;
  usuarios: UsuarioOpcion[];
  tipos: OpcionFiltro[];
  etiquetas: OpcionFiltro[];
  puedeAsignar: boolean;
  contactoNombre: string | null;
  onAbrir: (a: ActividadItem) => void;
}) {
  const router = useRouter();
  const ruta = usePathname();
  const parametros = useSearchParams();
  const [pendiente, iniciar] = useTransition();
  const [texto, setTexto] = useState(filtros.q);
  const [avanzados, setAvanzados] = useState(
    Boolean(filtros.tipoId || filtros.estado || filtros.resultado || filtros.etiquetaId || filtros.contactoId || filtros.desde || filtros.hasta || filtros.responsableId)
  );
  const primera = useRef(true);

  /** Cambia filtros en la URL (que es donde viven) y reinicia la paginación. */
  function aplicar(cambios: Record<string, string | null>, conservarPagina = false) {
    const p = new URLSearchParams(parametros.toString());
    p.delete("filter"); // parámetro de la versión anterior
    for (const [k, v] of Object.entries(cambios)) {
      if (v === null || v === "") p.delete(k);
      else p.set(k, v);
    }
    if (!conservarPagina) p.delete("pagina");
    iniciar(() => router.replace(`${ruta}?${p.toString()}`, { scroll: false }));
  }

  // La búsqueda por texto espera a que se deje de teclear.
  useEffect(() => {
    if (primera.current) { primera.current = false; return; }
    if (texto === filtros.q) return;
    const t = setTimeout(() => aplicar({ q: texto.trim() || null }), 400);
    return () => clearTimeout(t);
  }, [texto]);

  const activos = useMemo(() => {
    const a: Array<{ clave: string; texto: string; quitar: Record<string, string | null> }> = [];
    if (filtros.q) a.push({ clave: "q", texto: `Texto: «${filtros.q}»`, quitar: { q: null } });
    if (filtros.tipoId) a.push({ clave: "tipo", texto: `Tipo: ${tipos.find((t) => t.id === filtros.tipoId)?.nombre ?? "—"}`, quitar: { tipo: null } });
    if (filtros.estado) a.push({ clave: "estado", texto: `Estado: ${TEXTO_ESTADO[filtros.estado]}`, quitar: { estado: null } });
    if (filtros.resultado) a.push({ clave: "resultado", texto: `Resultado: ${RESULTADOS_ACTIVIDAD[filtros.resultado]?.label ?? filtros.resultado}`, quitar: { resultado: null } });
    if (filtros.etiquetaId) a.push({ clave: "etiqueta", texto: `Etiqueta: ${etiquetas.find((t) => t.id === filtros.etiquetaId)?.nombre ?? "—"}`, quitar: { etiqueta: null } });
    if (filtros.contactoId) a.push({ clave: "contacto", texto: `Contacto: ${contactoNombre ?? "—"}`, quitar: { contacto: null } });
    if (filtros.responsableId) a.push({ clave: "responsable", texto: `Responsable: ${usuarios.find((u) => u.id === filtros.responsableId)?.displayName ?? "—"}`, quitar: { leaderId: null, responsable: null } });
    if (filtros.desde || filtros.hasta) a.push({ clave: "periodo", texto: `Periodo: ${filtros.desde ?? "…"} a ${filtros.hasta ?? "…"}`, quitar: { desde: null, hasta: null } });
    return a;
  }, [filtros, tipos, etiquetas, usuarios, contactoNombre]);

  const ultimaPagina = Math.max(1, Math.ceil(pagina.total / pagina.tamano));
  const desde = pagina.total === 0 ? 0 : (pagina.pagina - 1) * pagina.tamano + 1;
  const hasta = Math.min(pagina.total, pagina.pagina * pagina.tamano);

  return (
    <div className="space-y-4">
      {/* Vistas rápidas */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Vistas de la bitácora">
        {VISTAS_BITACORA.filter((v) => v.rapida).map((v) => {
          const activa = !(filtros.desde || filtros.hasta) && filtros.vista === v.clave;
          const n = pagina.conteos[v.clave];
          return (
            <button key={v.clave} type="button" role="tab" aria-selected={activa}
              onClick={() => aplicar({ vista: v.clave, desde: null, hasta: null })}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold inline-flex items-center gap-2 cursor-pointer transition-colors ${activa ? "bg-blue-900 text-white shadow" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
              {v.etiqueta}
              {n !== undefined && (
                <span className={`px-1.5 py-0.5 rounded-md text-[11px] ${activa ? "bg-white/20" : v.clave === "vencidas" && n > 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>{n}</span>
              )}
            </button>
          );
        })}
        <select aria-label="Otros periodos" value={["semana", "mes", "todas"].includes(filtros.vista) && !(filtros.desde || filtros.hasta) ? filtros.vista : ""}
          onChange={(e) => e.target.value && aplicar({ vista: e.target.value, desde: null, hasta: null })}
          className="px-3 py-2 rounded-xl text-xs font-extrabold border border-gray-200 bg-white text-gray-700 cursor-pointer">
          <option value="">Otro periodo…</option>
          {VISTAS_BITACORA.filter((v) => !v.rapida).map((v) => <option key={v.clave} value={v.clave}>{v.etiqueta}</option>)}
        </select>
      </div>

      {/* Búsqueda y filtros */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input type="search" aria-label="Buscar actividades" placeholder="Buscar por título, notas o lugar…" value={texto} onChange={(e) => setTexto(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <button type="button" onClick={() => setAvanzados((v) => !v)} aria-expanded={avanzados}
            className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-extrabold text-gray-700 inline-flex items-center justify-center gap-1.5 cursor-pointer">
            <Filter size={13} aria-hidden="true" /> Filtros {activos.length > 0 && <span className="bg-blue-600 text-white rounded-full px-1.5">{activos.length}</span>}
          </button>
        </div>

        {avanzados && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {puedeAsignar && (
              <Campo etiqueta="Alcance">
                <select value={filtros.scope} onChange={(e) => aplicar({ scope: e.target.value === "equipo" ? "equipo" : null })} className={claseCampo}>
                  <option value="mis">Mi agenda</option><option value="equipo">Todo mi equipo</option>
                </select>
              </Campo>
            )}
            {puedeAsignar && (
              <Campo etiqueta="Responsable">
                <select value={filtros.responsableId ?? ""} onChange={(e) => aplicar({ leaderId: e.target.value || null, responsable: null })} className={claseCampo}>
                  <option value="">Todos</option>
                  {usuarios.map((u) => <option key={u.id} value={u.id}>{u.displayName}</option>)}
                </select>
              </Campo>
            )}
            <Campo etiqueta="Tipo">
              <select value={filtros.tipoId ?? ""} onChange={(e) => aplicar({ tipo: e.target.value || null })} className={claseCampo}>
                <option value="">Todos</option>
                {tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </Campo>
            <Campo etiqueta="Estado">
              <select value={filtros.estado ?? ""} onChange={(e) => aplicar({ estado: e.target.value || null })} className={claseCampo}>
                <option value="">Todos</option>
                {ESTADOS_FILTRO.map((e) => <option key={e} value={e}>{TEXTO_ESTADO[e]}</option>)}
              </select>
            </Campo>
            <Campo etiqueta="Resultado">
              <select value={filtros.resultado ?? ""} onChange={(e) => aplicar({ resultado: e.target.value || null })} className={claseCampo}>
                <option value="">Todos</option>
                {CLAVES_RESULTADO.map((k) => <option key={k} value={k}>{RESULTADOS_ACTIVIDAD[k]!.label}</option>)}
              </select>
            </Campo>
            {etiquetas.length > 0 && (
              <Campo etiqueta="Etiqueta">
                <select value={filtros.etiquetaId ?? ""} onChange={(e) => aplicar({ etiqueta: e.target.value || null })} className={claseCampo}>
                  <option value="">Todas</option>
                  {etiquetas.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </Campo>
            )}
            <Campo etiqueta="Desde">
              <input type="date" value={filtros.desde ?? ""} onChange={(e) => aplicar({ desde: e.target.value || null })} className={claseCampo} />
            </Campo>
            <Campo etiqueta="Hasta">
              <input type="date" value={filtros.hasta ?? ""} min={filtros.desde ?? undefined} onChange={(e) => aplicar({ hasta: e.target.value || null })} className={claseCampo} />
            </Campo>
          </div>
        )}

        {activos.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" aria-label="Filtros activos">
            {activos.map((f) => (
              <span key={f.clave} className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-900 text-[11px] font-bold rounded-lg pl-2.5 pr-1 py-1">
                {f.texto}
                <button type="button" aria-label={`Quitar filtro ${f.texto}`} onClick={() => { if (f.clave === "q") setTexto(""); aplicar(f.quitar); }} className="p-0.5 rounded hover:bg-blue-100 cursor-pointer"><X size={11} /></button>
              </span>
            ))}
            <button type="button" onClick={() => { setTexto(""); aplicar({ q: null, tipo: null, estado: null, resultado: null, etiqueta: null, contacto: null, leaderId: null, responsable: null, desde: null, hasta: null }); }}
              className="text-[11px] font-extrabold text-gray-600 hover:text-gray-900 underline cursor-pointer">Limpiar filtros</button>
          </div>
        )}
      </div>

      {/* Resumen del periodo y alcance */}
      <p className="text-xs font-semibold text-gray-500 flex items-center gap-2" role="status" aria-live="polite">
        {pendiente && <Loader2 size={12} className="animate-spin" aria-hidden="true" />}
        {pagina.total === 0 ? "Sin actividades con estos filtros." : `Mostrando ${desde}–${hasta} de ${pagina.total}`}
        {" · "}{filtros.desde || filtros.hasta ? `del ${filtros.desde ?? "inicio"} al ${filtros.hasta ?? "hoy"}` : VISTAS_BITACORA.find((v) => v.clave === filtros.vista)?.etiqueta.toLowerCase()}
        {" · "}{filtros.responsableId ? "una persona" : filtros.scope === "equipo" ? "todo el equipo" : "tu agenda"}
      </p>

      {/* Tarjetas */}
      <ul className="space-y-3">
        {pagina.items.map((a) => {
          const paso = proximoPaso(a);
          return (
            <li key={`${a.origen}-${a.id}`}>
              <button type="button" onClick={() => onAbrir(a)} className="w-full text-left bg-white rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all p-4 cursor-pointer">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <EtiquetaEstado estado={a.estado} />
                  {a.tipo && <InsigniaTipo nombre={a.tipo.nombre} color={a.tipo.color} />}
                  {a.etiquetas.slice(0, 3).map((t) => <span key={t.id} className="text-[11px] font-bold text-gray-600 bg-gray-100 rounded-lg px-2 py-0.5">#{t.name}</span>)}
                </div>
                <h3 className="text-sm sm:text-base font-extrabold text-gray-900 leading-snug">{a.title}</h3>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-gray-600">
                  <span className="inline-flex items-center gap-1"><CalendarClock size={12} aria-hidden="true" />{formatearFechaHora(a.scheduledAt)}</span>
                  <span className="inline-flex items-center gap-1"><User size={12} aria-hidden="true" />{a.assignedUserName}</span>
                  {a.contactName && <span className="inline-flex items-center gap-1">Contacto: {a.contactName}</span>}
                  <span className="inline-flex items-center gap-1 min-w-0"><MapPin size={12} aria-hidden="true" /><span className="truncate">{a.locationText || a.location}</span></span>
                </div>
                {paso && (
                  <p className={`mt-2 text-xs font-bold inline-flex items-center gap-1.5 ${paso.alerta ? "text-red-700" : "text-gray-600"}`}>
                    {paso.alerta && <AlertTriangle size={12} aria-hidden="true" />}{paso.texto}
                  </p>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {pagina.total === 0 && (
        <div className="text-center bg-white rounded-2xl border border-dashed border-gray-300 p-10">
          <p className="font-extrabold text-gray-800">No hay actividades aquí.</p>
          <p className="text-sm text-gray-500 mt-1">Cambia de vista o limpia los filtros; también puedes registrar una nueva.</p>
        </div>
      )}

      {ultimaPagina > 1 && (
        <nav className="flex items-center justify-between" aria-label="Paginación">
          <button type="button" disabled={pagina.pagina <= 1} onClick={() => aplicar({ pagina: String(pagina.pagina - 1) }, true)}
            className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-xs font-extrabold inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer"><ChevronLeft size={14} /> Anterior</button>
          <span className="text-xs font-bold text-gray-600">Página {pagina.pagina} de {ultimaPagina}</span>
          <button type="button" disabled={pagina.pagina >= ultimaPagina} onClick={() => aplicar({ pagina: String(pagina.pagina + 1) }, true)}
            className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-xs font-extrabold inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer">Siguiente <ChevronRight size={14} /></button>
        </nav>
      )}
    </div>
  );
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">{etiqueta}</span>
      {children}
    </label>
  );
}
