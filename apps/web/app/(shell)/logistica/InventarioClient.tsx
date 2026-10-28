"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronLeft, ChevronRight, Inbox, Loader2, LogOut, Package, Pencil, Search, Undo2, X } from "lucide-react";

import { QueEsEsto } from "@/components/QueEsEsto";
import { avisar } from "@/lib/avisos";
import {
  estaPorAgotarse,
  filtrarArticulos,
  nombreDeMovimiento,
  OTRAS_ESTRUCTURAS,
  type ArticuloDeLogistica,
  type EnManos as FilaEnManos,
  type MovimientoDeLogistica,
  type ResumenDeLogistica
} from "@/lib/logistica-tipos";

import { historyPageAction } from "./actions";
import { EnManos } from "./EnManos";
import type { Movimiento } from "./MovimientoHoja";

// Las hojas se cargan aparte: la lista sale antes en el teléfono.
const MovimientoHoja = dynamic(() => import("./MovimientoHoja").then((m) => m.MovimientoHoja), { ssr: false });
const EditarArticulo = dynamic(() => import("./EditarArticulo").then((m) => m.EditarArticulo), { ssr: false });

type Vista = "inventario" | "personas" | "historial";

const fecha = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City" });

/** Un nombre del historial; lo de otra estructura llega sin nombre (P1) y se dice en palabras. */
const quien = (nombre: string) => (nombre === OTRAS_ESTRUCTURAS ? "alguien de otra estructura" : nombre);

const ICONO_DE_MOVIMIENTO: Record<string, { icono: typeof Inbox; clase: string }> = {
  in: { icono: Inbox, clase: "bg-emerald-100 text-emerald-700" },
  out: { icono: LogOut, clase: "bg-orange-100 text-orange-700" },
  devolucion: { icono: Undo2, clase: "bg-sky-100 text-sky-700" }
};

/**
 * Logística (plan de auditoría de menús, fase 5): el inventario con un buscador que sí busca, chips de almacén,
 * categoría y «Por agotarse» (D7), «Entregar» en cada artículo; quién tiene qué con sus devoluciones; y el
 * historial completo por páginas. Los nombres de otras estructuras llegan del servidor ya sumados (P1).
 */
export function InventarioClient({
  articulos,
  almacenes,
  resumen,
  enManos,
  movimientosIniciales,
  personas,
  puedeArchivar
}: {
  articulos: ArticuloDeLogistica[];
  almacenes: Array<{ id: string; nombre: string }>;
  resumen: ResumenDeLogistica;
  enManos: FilaEnManos[];
  movimientosIniciales: { filas: MovimientoDeLogistica[]; hayMas: boolean };
  personas: Array<{ id: string; nombre: string }>;
  puedeArchivar: boolean;
}) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [vista, setVista] = useState<Vista>("inventario");
  const [texto, setTexto] = useState("");
  const [almacen, setAlmacen] = useState<string | null>(null);
  const [categoria, setCategoria] = useState<string | null>(null);
  const [porAgotarse, setPorAgotarse] = useState(false);
  const [archivados, setArchivados] = useState(false);
  const [movimiento, setMovimiento] = useState<Movimiento | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);
  const [movimientos, setMovimientos] = useState(movimientosIniciales);
  const [cargando, setCargando] = useState(false);
  const buscadorDePersonas = useRef<HTMLInputElement | null>(null);

  const categorias = useMemo(() => [...new Set(articulos.filter((a) => !a.archivado).map((a) => a.categoria))].sort((a, b) => a.localeCompare(b, "es")), [articulos]);
  const hayArchivados = articulos.some((a) => a.archivado);
  const lista = filtrarArticulos(articulos, { texto, almacen, categoria, porAgotarse, archivados });
  const hayFiltros = Boolean(texto || almacen || categoria || porAgotarse || archivados);
  const articuloEnEdicion = articulos.find((a) => a.id === editando) ?? null;

  const refrescar = () => {
    setMovimiento(null);
    setEditando(null);
    setPagina(1);
    iniciar(() => router.refresh());
  };

  async function irAPagina(p: number) {
    setCargando(true);
    try {
      const r = await historyPageAction(p);
      if (!r.ok) return avisar(r.error);
      setMovimientos({ filas: r.filas, hayMas: r.hayMas });
      setPagina(p);
    } catch {
      avisar("Sin conexión: no se pudo leer el historial.");
    } finally {
      setCargando(false);
    }
  }

  // Al volver de un cambio, la primera página llega nueva del servidor.
  const historialVisible = pagina === 1 ? movimientosIniciales : movimientos;

  const chip = (activo: boolean, alTocar: () => void, contenido: React.ReactNode, clave: string) => (
    <button
      key={clave}
      type="button"
      aria-pressed={activo}
      onClick={alTocar}
      className={`shrink-0 min-h-[40px] px-3.5 rounded-full border text-sm font-bold whitespace-nowrap cursor-pointer inline-flex items-center gap-1 ${activo ? "bg-slate-900 text-white border-slate-900" : "bg-white text-gray-700 border-gray-200"}`}
    >
      {activo && <X size={13} aria-hidden="true" />}
      {contenido}
    </button>
  );

  return (
    <div className="space-y-4">
      <section aria-label="Resumen" className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="bg-white rounded-2xl border border-gray-200 p-3">
          <p className="text-xs font-bold text-gray-600">Piezas en almacén</p>
          <p className="text-2xl font-black text-gray-900 tabular-nums">{resumen.piezas.toLocaleString("es-MX")}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-3">
          <p className="text-xs font-bold text-gray-600">Tipos de artículo</p>
          <p className="text-2xl font-black text-gray-900 tabular-nums">{resumen.tipos.toLocaleString("es-MX")}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setVista("inventario");
            setPorAgotarse(true);
            setArchivados(false);
          }}
          className={`text-left rounded-2xl border p-3 cursor-pointer ${resumen.porAgotarse > 0 ? "bg-amber-50 border-amber-300" : "bg-white border-gray-200"}`}
        >
          <p className="text-xs font-bold text-gray-600 inline-flex items-center gap-1">
            {resumen.porAgotarse > 0 && <AlertTriangle size={12} className="text-amber-600" aria-hidden="true" />} Por agotarse
          </p>
          <p className="text-2xl font-black text-gray-900 tabular-nums">{resumen.porAgotarse.toLocaleString("es-MX")}</p>
        </button>
        <div className="bg-white rounded-2xl border border-gray-200 p-3">
          <p className="text-xs font-bold text-gray-600">Entregadas en 30 días</p>
          <p className="text-2xl font-black text-gray-900 tabular-nums">{resumen.entregadas30.toLocaleString("es-MX")}</p>
        </div>
      </section>

      <nav aria-label="Vistas" className="grid grid-cols-3 gap-1 p-1 bg-gray-100 rounded-2xl">
        {(
          [
            ["inventario", "Inventario"],
            ["personas", "Entregado a personas"],
            ["historial", "Historial"]
          ] as const
        ).map(([clave, nombre]) => (
          <button
            key={clave}
            type="button"
            aria-pressed={vista === clave}
            onClick={() => {
              // Al abrir «Entregado a personas», el cursor queda en su buscador dentro del mismo toque: así el
              // teléfono abre el teclado y «¿quién tiene las lonas?» cabe en 3 toques (§7.2).
              flushSync(() => setVista(clave));
              if (clave === "personas") buscadorDePersonas.current?.focus();
            }}
            className={`min-h-[44px] px-1 rounded-xl text-xs sm:text-sm font-extrabold leading-tight cursor-pointer ${vista === clave ? "bg-white text-slate-900 shadow-sm" : "text-gray-600"}`}
          >
            {nombre}
          </button>
        ))}
      </nav>

      {vista === "inventario" && (
        <section className="space-y-3" aria-label="Inventario">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
            <input
              type="search"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Nombre, clave o categoría…"
              aria-label="Buscar artículo"
              className="w-full min-h-[48px] pl-10 pr-4 rounded-2xl border border-gray-200 bg-white text-base text-gray-900 [&::-webkit-search-cancel-button]:hidden"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0" aria-label="Filtros">
            {chip(porAgotarse, () => setPorAgotarse(!porAgotarse), <>Por agotarse {resumen.porAgotarse}</>, "agotarse")}
            {almacenes.length > 1 && almacenes.map((a) => chip(almacen === a.id, () => setAlmacen(almacen === a.id ? null : a.id), a.nombre, `a-${a.id}`))}
            {categorias.length > 1 && categorias.map((c) => chip(categoria === c, () => setCategoria(categoria === c ? null : c), c, `c-${c}`))}
            {hayArchivados && chip(archivados, () => setArchivados(!archivados), "Archivados", "archivados")}
          </div>

          {lista.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-200 p-8 text-center space-y-2">
              <Package size={28} className="mx-auto text-gray-400" aria-hidden="true" />
              <p className="text-base font-bold text-gray-900">{hayFiltros ? "Ningún artículo con esos filtros." : "Todavía no hay artículos."}</p>
              <p className="text-sm text-gray-600">{hayFiltros ? "Prueba con otra palabra o quita un filtro." : "Da de alta el primero con «Nuevo artículo»."}</p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {lista.map((a) => {
                const agotandose = estaPorAgotarse(a);
                return (
                  <li key={a.id} className={`bg-white rounded-3xl border p-4 space-y-3 shadow-sm ${agotandose && !a.archivado ? "border-amber-300" : "border-gray-200"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-base font-black text-gray-900">{a.nombre}</p>
                        <p className="text-xs text-gray-600">
                          <span className="font-mono">{a.clave}</span> · {a.categoria} · {a.almacen}
                        </p>
                        {agotandose && !a.archivado && (
                          <p className="mt-1 text-xs font-extrabold text-amber-800 inline-flex items-center gap-1">
                            <AlertTriangle size={12} aria-hidden="true" /> Por agotarse (mínimo {a.minimo})
                          </p>
                        )}
                        {a.archivado && <p className="mt-1 text-xs font-extrabold text-gray-500">Archivado</p>}
                      </div>
                      <p className="shrink-0 text-right">
                        <span className="block text-3xl font-black text-gray-900 tabular-nums leading-none">{a.existencias.toLocaleString("es-MX")}</span>
                        <span className="text-xs text-gray-500">piezas</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {!a.archivado && (
                        <>
                          <button
                            type="button"
                            onClick={() => setMovimiento({ tipo: "out", articuloId: a.id, articulo: a.nombre, existencias: a.existencias })}
                            disabled={a.existencias === 0}
                            aria-label={`Entregar ${a.nombre}`}
                            className="min-h-[44px] px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold inline-flex items-center gap-1 cursor-pointer disabled:opacity-40"
                          >
                            <LogOut size={15} aria-hidden="true" /> Entregar
                          </button>
                          <button
                            type="button"
                            onClick={() => setMovimiento({ tipo: "in", articuloId: a.id, articulo: a.nombre, existencias: a.existencias })}
                            aria-label={`Resurtir ${a.nombre}`}
                            className="min-h-[44px] px-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-800 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Inbox size={15} aria-hidden="true" /> Resurtir
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditando(a.id)}
                        aria-label={`Editar ${a.nombre}`}
                        title="Editar"
                        className="min-h-[44px] min-w-[44px] px-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-800 inline-flex items-center justify-center gap-1 cursor-pointer"
                      >
                        {/* Con el texto, los tres botones no cabían en una línea a 375 px. */}
                        <Pencil size={16} aria-hidden="true" />
                        {a.archivado && "Editar"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-xs text-gray-500">
            «Por agotarse» avisa cuando quedan las piezas que pusiste de mínimo en el artículo. <QueEsEsto termino="porAgotarse" />
          </p>
        </section>
      )}

      {vista === "personas" && (
        <EnManos
          refBuscador={buscadorDePersonas}
          filas={enManos}
          onDevolver={(f) => {
            const a = articulos.find((x) => x.id === f.articuloId);
            if (!a || a.archivado) return avisar("Ese artículo está archivado: devuélvelo a la lista para recibir la devolución.");
            setMovimiento({ tipo: "devolucion", articuloId: f.articuloId, articulo: f.articulo, existencias: a.existencias, persona: { id: f.personaId!, nombre: f.persona, tiene: f.cantidad } });
          }}
        />
      )}

      {vista === "historial" && (
        <section className="space-y-3" aria-label="Historial">
          {historialVisible.filas.length === 0 ? (
            <p className="text-sm text-gray-600">Todavía no hay movimientos.</p>
          ) : (
            <ul className={`bg-white rounded-3xl border border-gray-200 divide-y divide-gray-100 ${cargando ? "opacity-60" : ""}`}>
              {historialVisible.filas.map((m) => {
                const estilo = ICONO_DE_MOVIMIENTO[m.tipo] ?? ICONO_DE_MOVIMIENTO.in!;
                const Icono = estilo.icono;
                return (
                  <li key={m.id} className="p-3 flex gap-3">
                    <span className={`mt-0.5 w-8 h-8 rounded-full shrink-0 inline-flex items-center justify-center ${estilo.clase}`} aria-hidden="true">
                      <Icono size={15} />
                    </span>
                    <div className="min-w-0 text-sm">
                      <p className="font-bold text-gray-900">
                        {nombreDeMovimiento(m.tipo)}: {m.cantidad.toLocaleString("es-MX")} {m.articulo}
                      </p>
                      <p className="text-xs text-gray-600">
                        {m.responsable ? `${m.tipo === "devolucion" ? "Regresó" : "Para"} ${quien(m.responsable)} · ` : ""}
                        {fecha(m.fecha)} · registró {m.registro ? quien(m.registro) : "—"}
                      </p>
                      {m.notas && <p className="text-xs text-gray-500 mt-0.5">{m.notas}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {(pagina > 1 || historialVisible.hayMas) && (
            <nav aria-label="Páginas del historial" className="flex items-center justify-between gap-3">
              <button type="button" disabled={pagina <= 1 || cargando} onClick={() => void irAPagina(pagina - 1)} className="min-h-[44px] px-4 rounded-xl border border-gray-200 bg-white text-sm font-bold inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer">
                <ChevronLeft size={16} aria-hidden="true" /> Recientes
              </button>
              {cargando ? <Loader2 size={16} className="animate-spin text-gray-500" aria-hidden="true" /> : <span className="text-sm font-semibold text-gray-600">Página {pagina}</span>}
              <button type="button" disabled={!historialVisible.hayMas || cargando} onClick={() => void irAPagina(pagina + 1)} className="min-h-[44px] px-4 rounded-xl border border-gray-200 bg-white text-sm font-bold inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer">
                Anteriores <ChevronRight size={16} aria-hidden="true" />
              </button>
            </nav>
          )}
        </section>
      )}

      <MovimientoHoja movimiento={movimiento} personas={personas} onCerrar={() => setMovimiento(null)} onHecho={refrescar} />
      <EditarArticulo articulo={articuloEnEdicion} puedeArchivar={puedeArchivar} onCerrar={() => setEditando(null)} onHecho={refrescar} />
    </div>
  );
}
