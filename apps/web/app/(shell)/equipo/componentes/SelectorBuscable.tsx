"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, Loader2, Plus, Search, X } from "lucide-react";

import { normalizarNombre } from "@/lib/actividades";
import type { OpcionSelector } from "@/lib/bitacora-tipos";

export type ResultadoBusqueda = { resultados: OpcionSelector[]; hayMas: boolean };

export type AccionCrear = {
  /** Texto del botón para el término escrito. */
  etiqueta: (termino: string) => string;
  /**
   * Crea la opción (o devuelve la que ya existía). Si falla devuelve `error` y el selector lo
   * muestra sin perder lo escrito ni lo capturado en el resto del formulario.
   */
  ejecutar: (termino: string) => Promise<{ opcion?: OpcionSelector; existente?: boolean; error?: string }>;
};

type Props = {
  etiqueta: string;
  valor: OpcionSelector[];
  onCambiar: (valor: OpcionSelector[]) => void;
  buscar: (termino: string, pagina: number, senal: AbortSignal) => Promise<ResultadoBusqueda | null>;
  crear?: AccionCrear | undefined;
  multiple?: boolean;
  placeholder?: string;
  ayuda?: string | undefined;
  error?: string | null | undefined;
  requerido?: boolean;
  deshabilitado?: boolean;
  /** Al elegir, permite sacar información extra de la opción (p. ej. su detalle). */
  vacio?: string;
};

/**
 * Selector con búsqueda en el servidor: consulta TODAS las opciones autorizadas, paginadas, en
 * lugar de recibir una lista cargada de antemano (que se cortaba en las primeras 100). Cuando lo
 * escrito no existe y se permite crear, ofrece «Crear …» sin salir del formulario.
 */
export function SelectorBuscable({
  etiqueta, valor, onCambiar, buscar, crear, multiple = false, placeholder = "Escribe para buscar…",
  ayuda, error, requerido = false, deshabilitado = false, vacio = "Sin resultados."
}: Props) {
  const id = useId();
  const contenedor = useRef<HTMLDivElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [termino, setTermino] = useState("");
  const [resultados, setResultados] = useState<OpcionSelector[]>([]);
  const [hayMas, setHayMas] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [activo, setActivo] = useState(0);

  const seleccionados = new Set(valor.map((v) => v.id));

  const consultar = useCallback(
    async (q: string, p: number, senal: AbortSignal) => {
      setCargando(true);
      const r = await buscar(q, p, senal);
      if (senal.aborted) return;
      setCargando(false);
      if (!r) return;
      setResultados((prev) => (p === 1 ? r.resultados : [...prev, ...r.resultados]));
      setHayMas(r.hayMas);
    },
    [buscar]
  );

  // Búsqueda con espera de 250 ms tras la última tecla; cancela la anterior si aún no llegó.
  useEffect(() => {
    if (!abierto) return;
    const control = new AbortController();
    const t = setTimeout(() => {
      setPagina(1);
      setActivo(0);
      void consultar(termino, 1, control.signal);
    }, 250);
    return () => {
      clearTimeout(t);
      control.abort();
    };
  }, [abierto, termino, consultar]);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);

  const normal = normalizarNombre(termino);
  const hayExacta = resultados.some((r) => normalizarNombre(r.nombre) === normal);
  const puedeCrear = Boolean(crear) && normal.length >= 2 && !hayExacta && !cargando;
  const filas = resultados.length + (puedeCrear ? 1 : 0);

  function elegir(o: OpcionSelector) {
    setAviso(null);
    if (multiple) {
      onCambiar(seleccionados.has(o.id) ? valor.filter((v) => v.id !== o.id) : [...valor, o]);
      setTermino("");
    } else {
      onCambiar([o]);
      setAbierto(false);
      setTermino("");
    }
  }

  async function ejecutarCrear() {
    if (!crear || creando) return;
    setCreando(true);
    setErrorCrear(null);
    const r = await crear.ejecutar(termino.trim());
    setCreando(false);
    if (r.error || !r.opcion) {
      setErrorCrear(r.error ?? "No se pudo crear la opción.");
      return;
    }
    if (r.existente) setAviso(`Ya existía «${r.opcion.nombre}»; se seleccionó esa.`);
    elegir(r.opcion);
    if (multiple) setAbierto(true);
  }

  function teclado(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setAbierto(true); setActivo((a) => Math.min(a + 1, Math.max(filas - 1, 0))); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActivo((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Escape") setAbierto(false);
    else if (e.key === "Enter" && abierto) {
      e.preventDefault();
      if (activo < resultados.length) elegir(resultados[activo]!);
      else if (puedeCrear) void ejecutarCrear();
    }
  }

  const idLista = `${id}-lista`;
  return (
    <div ref={contenedor} className="relative">
      <label htmlFor={id} className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
        {etiqueta}{requerido && <span aria-hidden="true"> *</span>}
      </label>

      {valor.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {valor.map((v) => (
            <span key={v.id} className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold rounded-lg pl-2.5 pr-1 py-1">
              {v.nombre}
              {!deshabilitado && (
                <button type="button" aria-label={`Quitar ${v.nombre}`} onClick={() => onCambiar(valor.filter((x) => x.id !== v.id))} className="p-0.5 rounded hover:bg-blue-100 cursor-pointer">
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {(multiple || valor.length === 0) && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
          <input
            id={id}
            type="text"
            role="combobox"
            aria-expanded={abierto}
            aria-controls={idLista}
            aria-autocomplete="list"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            autoComplete="off"
            disabled={deshabilitado}
            value={termino}
            placeholder={placeholder}
            onFocus={() => setAbierto(true)}
            onChange={(e) => { setTermino(e.target.value); setAbierto(true); setErrorCrear(null); }}
            onKeyDown={teclado}
            className={`w-full pl-9 pr-3 py-2.5 bg-white border rounded-xl text-sm font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 ${error ? "border-red-400" : "border-gray-200"}`}
          />
        </div>
      )}

      {abierto && (
        <ul id={idLista} role="listbox" aria-label={etiqueta} className="absolute z-30 mt-1 w-full max-h-64 overflow-auto bg-white border border-gray-200 rounded-xl shadow-xl py-1">
          {resultados.map((o, i) => (
            <li key={o.id} role="option" aria-selected={seleccionados.has(o.id)} onMouseEnter={() => setActivo(i)} onMouseDown={(e) => { e.preventDefault(); elegir(o); }}
              className={`px-3 py-2 cursor-pointer flex items-center justify-between gap-2 ${i === activo ? "bg-blue-50" : ""}`}>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-gray-900 truncate">{o.nombre}</span>
                {o.detalle && <span className="block text-[11px] text-gray-500 truncate">{o.detalle}</span>}
              </span>
              {seleccionados.has(o.id) && <Check size={14} className="text-blue-600 shrink-0" aria-hidden="true" />}
            </li>
          ))}

          {cargando && (
            <li className="px-3 py-2 text-xs text-gray-500 flex items-center gap-2" role="status"><Loader2 size={13} className="animate-spin" /> Buscando…</li>
          )}
          {!cargando && resultados.length === 0 && !puedeCrear && (
            <li className="px-3 py-2 text-xs text-gray-500">{vacio}</li>
          )}
          {hayMas && !cargando && (
            <li>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { const c = new AbortController(); const p = pagina + 1; setPagina(p); void consultar(termino, p, c.signal); }}
                className="w-full text-left px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 cursor-pointer">
                Cargar más resultados
              </button>
            </li>
          )}

          {puedeCrear && crear && (
            <li role="option" aria-selected={false} onMouseEnter={() => setActivo(resultados.length)} onMouseDown={(e) => { e.preventDefault(); void ejecutarCrear(); }}
              className={`px-3 py-2.5 cursor-pointer border-t border-gray-100 flex items-center gap-2 text-sm font-extrabold text-emerald-700 ${activo === resultados.length ? "bg-emerald-50" : ""}`}>
              {creando ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} aria-hidden="true" />}
              {crear.etiqueta(termino.trim())}
            </li>
          )}
          {errorCrear && <li role="alert" className="px-3 py-2 text-xs font-bold text-red-700 bg-red-50">{errorCrear}</li>}
        </ul>
      )}

      {aviso && <p role="status" className="mt-1 text-[11px] font-semibold text-emerald-700">{aviso}</p>}
      {error && <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-bold text-red-600">{error}</p>}
      {ayuda && !error && <p className="mt-1 text-[11px] text-gray-500">{ayuda}</p>}
    </div>
  );
}
