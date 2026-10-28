"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, Plus, Search, SlidersHorizontal, X } from "lucide-react";

import { QueEsEsto } from "@/components/QueEsEsto";
import { OPCIONES_CATEGORIA } from "@/lib/categorias-incidencia";
import type { FilaDeIncidencia, ResultadoDeIncidencias } from "@/lib/incidencias-consulta";
import { direccionDeFiltros, type FiltrosDeIncidencias, type VistaDeIncidencias } from "@/lib/incidencias-filtros";

import { HojaAsignar, HojaMas } from "./HojasDeIncidencia";
import { TarjetaIncidencia } from "./TarjetaIncidencia";

type Opcion = { id: string; nombre: string };

const VISTAS: Array<{ clave: VistaDeIncidencias; nombre: string }> = [
  { clave: "atender", nombre: "Por atender" },
  { clave: "cerradas", nombre: "Cerradas" },
  { clave: "todas", nombre: "Todas" }
];

/**
 * La pantalla única de Incidencias (plan de auditoría de menús, fase 2): tres vistas, un buscador, chips que
 * filtran y una tarjeta por incidencia con lo que hay que saber y hacer. Los filtros van en la dirección
 * (se comparten, «atrás» los respeta); el texto del buscador no (privacidad, §5.3).
 */
export default function IncidenciasClient({
  inicial,
  filtrosIniciales,
  personas,
  equipos,
  puedeAsignar
}: {
  inicial: ResultadoDeIncidencias;
  filtrosIniciales: FiltrosDeIncidencias;
  personas: Opcion[];
  equipos: Opcion[];
  puedeAsignar: boolean;
}) {
  const [filtros, setFiltros] = useState<FiltrosDeIncidencias>(filtrosIniciales);
  const [datos, setDatos] = useState<ResultadoDeIncidencias>(inicial);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [masFiltros, setMasFiltros] = useState(Boolean(filtrosIniciales.categoria || filtrosIniciales.seccion));
  const [asignando, setAsignando] = useState<FilaDeIncidencia | null>(null);
  const [masDe, setMasDe] = useState<FilaDeIncidencia | null>(null);
  const primeraVez = useRef(true);
  const pedido = useRef(0);

  const consultar = useCallback(async (f: FiltrosDeIncidencias) => {
    const numero = ++pedido.current;
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/incidencias/consulta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f)
      });
      const d = await res.json().catch(() => null);
      if (numero !== pedido.current) return;
      if (!res.ok || !d) {
        setError(d?.error || "No se pudieron leer las incidencias. Vuelve a intentarlo.");
        return;
      }
      setDatos(d as ResultadoDeIncidencias);
    } catch {
      if (numero === pedido.current) setError("Sin conexión: no se pudieron leer las incidencias.");
    } finally {
      if (numero === pedido.current) setCargando(false);
    }
  }, []);

  // Cada cambio de filtro: la dirección (sin el texto del buscador) y una consulta. El texto espera a que se
  // deje de escribir.
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    window.history.replaceState(null, "", window.location.pathname + direccionDeFiltros(filtros));
    const t = setTimeout(() => void consultar(filtros), filtros.q ? 300 : 0);
    return () => clearTimeout(t);
  }, [filtros, consultar]);

  const cambiar = (parcial: Partial<FiltrosDeIncidencias>) => setFiltros((f) => ({ ...f, pagina: 1, ...parcial }));
  const recargar = () => void consultar(filtros);

  const i = datos.indicadores;
  const chips: Array<{ clave: string; texto: string; activo: boolean; alternar: () => void; tono: string }> = [
    { clave: "por_aceptar", texto: `Por aceptar ${i.porAceptar}`, activo: filtros.porAceptar, alternar: () => cambiar({ porAceptar: !filtros.porAceptar, vista: "atender" }), tono: "amber" },
    { clave: "sin", texto: `Sin asignar ${i.sinAsignar}`, activo: filtros.responsable === "sin", alternar: () => cambiar({ responsable: filtros.responsable === "sin" ? null : "sin", vista: "atender" }), tono: "amber" },
    { clave: "siete", texto: `Más de 7 días ${i.masDeSieteDias}`, activo: filtros.antiguedad === 7, alternar: () => cambiar({ antiguedad: filtros.antiguedad === 7 ? null : 7, vista: "atender" }), tono: "rose" },
    { clave: "sin_seccion", texto: `Sin sección ${i.sinSeccion}`, activo: filtros.sinSeccion, alternar: () => cambiar({ sinSeccion: !filtros.sinSeccion }), tono: "amber" },
    { clave: "mias", texto: `Asignadas a mí ${i.mias}`, activo: filtros.responsable === "mias", alternar: () => cambiar({ responsable: filtros.responsable === "mias" ? null : "mias" }), tono: "blue" }
  ];
  const hayFiltros = Boolean(filtros.q || filtros.categoria || filtros.seccion || filtros.responsable || filtros.antiguedad || filtros.porAceptar || filtros.sinSeccion);

  return (
    <div className="max-w-6xl mx-auto px-4 pt-3 pb-6 md:p-6 space-y-4">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="hidden md:flex text-3xl font-extrabold text-blue-950 tracking-tight items-center gap-3">
            <AlertTriangle className="text-red-600 h-8 w-8" aria-hidden="true" /> Incidencias
          </h1>
          <p className="text-sm text-gray-600 mt-1">Acepta lo que llega de campo, asígnalo y sigue su avance. {i.abiertas.toLocaleString("es-MX")} abiertas a tu cargo. <QueEsEsto termino="aviso" /></p>
        </div>
        <Link href="/reportes" className="min-h-[44px] px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-extrabold inline-flex items-center justify-center gap-1.5 self-start">
          <Plus size={16} aria-hidden="true" /> Levantar incidencia
        </Link>
      </header>

      <nav aria-label="Vistas" className="grid grid-cols-3 gap-1 p-1 bg-gray-100 rounded-2xl">
        {VISTAS.map((v) => (
          <button
            key={v.clave}
            type="button"
            aria-pressed={filtros.vista === v.clave}
            onClick={() => cambiar({ vista: v.clave, porAceptar: v.clave === "atender" ? filtros.porAceptar : false, antiguedad: v.clave === "atender" ? filtros.antiguedad : null })}
            className={`min-h-[44px] rounded-xl text-sm font-extrabold cursor-pointer transition-colors ${filtros.vista === v.clave ? "bg-white text-slate-900 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
          >
            {v.nombre}
          </button>
        ))}
      </nav>

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
        <input
          type="search"
          value={filtros.q}
          onChange={(e) => cambiar({ q: e.target.value })}
          placeholder="Buscar bache, calle, colonia…"
          aria-label="Buscar incidencias"
          className="w-full min-h-[48px] pl-10 pr-4 rounded-2xl border border-gray-200 bg-white text-base text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap" aria-label="Filtros rápidos">
        {chips.map((c) => (
          <button
            key={c.clave}
            type="button"
            aria-pressed={c.activo}
            onClick={c.alternar}
            className={`shrink-0 min-h-[40px] px-3.5 rounded-full border text-sm font-bold whitespace-nowrap cursor-pointer ${
              c.activo ? "bg-slate-900 text-white border-slate-900" : c.tono === "rose" ? "bg-rose-50 text-rose-800 border-rose-200" : c.tono === "blue" ? "bg-blue-50 text-blue-800 border-blue-200" : "bg-amber-50 text-amber-900 border-amber-200"
            }`}
          >
            {c.activo && <X size={13} className="inline mr-1 -mt-0.5" aria-hidden="true" />}
            {c.texto}
          </button>
        ))}
        <button
          type="button"
          aria-expanded={masFiltros}
          onClick={() => setMasFiltros((m) => !m)}
          className="shrink-0 min-h-[40px] px-3.5 rounded-full border border-gray-200 bg-white text-sm font-bold text-gray-700 whitespace-nowrap cursor-pointer inline-flex items-center gap-1.5"
        >
          <SlidersHorizontal size={14} aria-hidden="true" /> Más filtros
        </button>
      </div>

      {masFiltros && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl border border-gray-200 bg-white p-3">
          <label className="text-xs font-bold text-gray-700 space-y-1">
            <span className="block">Categoría</span>
            <select
              value={filtros.categoria ?? ""}
              onChange={(e) => cambiar({ categoria: e.target.value || null })}
              className="w-full min-h-[44px] px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-900"
            >
              <option value="">Todas</option>
              {OPCIONES_CATEGORIA.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-gray-700 space-y-1">
            <span className="block">Sección electoral</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={filtros.seccion ?? ""}
              onChange={(e) => cambiar({ seccion: Number(e.target.value) > 0 ? Number(e.target.value) : null })}
              placeholder="Ej. 2695"
              className="w-full min-h-[44px] px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-900"
            />
          </label>
        </div>
      )}

      {hayFiltros && (
        <button
          type="button"
          onClick={() => setFiltros({ ...filtros, q: "", categoria: null, seccion: null, responsable: null, antiguedad: null, porAceptar: false, sinSeccion: false, pagina: 1 })}
          className="min-h-[40px] text-sm font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
        >
          Quitar filtros
        </button>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-sm font-bold text-rose-800">
          {error}
        </p>
      )}

      <div aria-live="polite" className="text-sm font-semibold text-gray-600 flex items-center gap-2">
        {cargando && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
        {datos.total === 0 ? null : `${datos.total.toLocaleString("es-MX")} ${datos.total === 1 ? "incidencia" : "incidencias"}`}
      </div>

      {datos.filas.length === 0 && !cargando ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center space-y-3">
          <AlertTriangle size={32} className="mx-auto text-gray-300" aria-hidden="true" />
          <p className="font-bold text-gray-800">
            {hayFiltros ? "Nada con esos filtros." : filtros.vista === "cerradas" ? "Todavía no hay incidencias cerradas a tu cargo." : "No hay incidencias abiertas a tu cargo."}
          </p>
          <p className="text-sm text-gray-600">
            {hayFiltros ? "Prueba con otra palabra o quita algún filtro." : "Cuando alguien de tu equipo reporte un bache, una fuga o una luminaria, llegará aquí para que la aceptes."}
          </p>
        </div>
      ) : (
        <ul className={`space-y-3 transition-opacity ${cargando ? "opacity-60" : ""}`}>
          {datos.filas.map((fila) => (
            <TarjetaIncidencia
              key={fila.id}
              fila={fila}
              puedeAsignar={puedeAsignar}
              onAsignar={() => setAsignando(fila)}
              onMas={() => setMasDe(fila)}
              onCambio={recargar}
            />
          ))}
        </ul>
      )}

      {datos.totalPaginas > 1 && (
        <nav aria-label="Páginas" className="flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={datos.pagina <= 1}
            onClick={() => setFiltros((f) => ({ ...f, pagina: datos.pagina - 1 }))}
            className="min-h-[44px] px-4 rounded-xl border border-gray-200 bg-white text-sm font-bold inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft size={16} aria-hidden="true" /> Anteriores
          </button>
          <span className="text-sm font-semibold text-gray-600">Página {datos.pagina} de {datos.totalPaginas}</span>
          <button
            type="button"
            disabled={datos.pagina >= datos.totalPaginas}
            onClick={() => setFiltros((f) => ({ ...f, pagina: datos.pagina + 1 }))}
            className="min-h-[44px] px-4 rounded-xl border border-gray-200 bg-white text-sm font-bold inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer"
          >
            Siguientes <ChevronRight size={16} aria-hidden="true" />
          </button>
        </nav>
      )}

      <HojaAsignar fila={asignando} personas={personas} equipos={equipos} onCerrar={() => setAsignando(null)} onGuardado={() => { setAsignando(null); recargar(); }} />
      <HojaMas fila={masDe} onCerrar={() => setMasDe(null)} onGuardado={() => { setMasDe(null); recargar(); }} />
    </div>
  );
}
