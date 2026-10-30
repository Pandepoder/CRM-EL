"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Landmark, Loader2, Plus, Search, X } from "lucide-react";

import { QueEsEsto } from "@/components/QueEsEsto";
import { avisar } from "@/lib/avisos";
import {
  CASILLAS_ESTIMADAS_POR_SECCION,
  direccionDeCobertura,
  FILTROS_DE_COBERTURA,
  ROLES_ELECTORALES,
  type FilaDeCobertura,
  type FiltrosDeCobertura,
  type ResultadoDeCobertura
} from "@/lib/estructura-electoral";
import { MUNICIPIOS_JALISCO } from "@/lib/municipios-jalisco";

// Las dos hojas se cargan aparte, después de la cobertura: en el teléfono la lista sale antes.
const Nombrar = dynamic(() => import("./Nombrar").then((m) => m.Nombrar), { ssr: false });
const DetalleSeccion = dynamic(() => import("./DetalleSeccion").then((m) => m.DetalleSeccion), { ssr: false });

function Barra({ etiqueta, hechas, de, nota }: { etiqueta: string; hechas: number; de: number; nota?: string }) {
  const parte = de > 0 ? Math.min(1, hechas / de) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="min-w-0 font-extrabold text-gray-900">{etiqueta}</span>
        <span className="shrink-0 whitespace-nowrap font-bold text-gray-700 tabular-nums">
          {hechas.toLocaleString("es-MX")} de {de.toLocaleString("es-MX")}
          {nota ? <span className="font-semibold text-gray-500"> {nota}</span> : null}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden" role="progressbar" aria-label={etiqueta} aria-valuenow={Math.round(parte * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-indigo-600" style={{ width: `${parte * 100}%` }} />
      </div>
    </div>
  );
}

/** Una línea por rol: verde con nombre(s) o gris «Falta». */
function LineaDeRol({ fila, clave, corto }: { fila: FilaDeCobertura; clave: string; corto: string }) {
  const nombrados = fila.nombrados.filter((n) => n.rol === clave);
  const esRc = clave === "representante_casilla";
  const lleno = esRc ? nombrados.length >= CASILLAS_ESTIMADAS_POR_SECCION : nombrados.length > 0;
  return (
    <p className="text-sm flex items-start gap-1.5">
      <span className={`mt-0.5 w-4 h-4 rounded shrink-0 inline-flex items-center justify-center ${lleno ? "bg-emerald-600 text-white" : nombrados.length ? "bg-amber-400 text-white" : "bg-gray-200"}`} aria-hidden="true">
        {nombrados.length > 0 && <Check size={12} />}
      </span>
      <span className="min-w-0">
        <span className="font-bold text-gray-700">{corto}{esRc ? ` (${nombrados.length} de ${CASILLAS_ESTIMADAS_POR_SECCION})` : ""}: </span>
        {nombrados.length ? (
          <span className="text-gray-900 font-semibold">
            {nombrados.map((n) => `${n.nombre}${n.casilla ? ` (${n.casilla})` : ""}`).join(", ")}
          </span>
        ) : (
          <span className="text-gray-500">falta</span>
        )}
      </span>
    </p>
  );
}

/**
 * Estructura Electoral por cobertura (plan de auditoría de menús, F4.1): arriba, cuánto falta; abajo, una tarjeta
 * por sección con sus tres roles y «Nombrar». Los números de dirección y líder cuentan solo su estructura (D11).
 */
export default function EstructuraClient({
  inicial,
  filtrosIniciales,
  esMaestro
}: {
  inicial: ResultadoDeCobertura;
  filtrosIniciales: FiltrosDeCobertura;
  esMaestro: boolean;
}) {
  const router = useRouter();
  const [datos, setDatos] = useState(inicial);
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [cargando, setCargando] = useState(false);
  const [nombrarEn, setNombrarEn] = useState<FilaDeCobertura | null>(null);
  const [detalleDe, setDetalleDe] = useState<string | null>(null);
  const primeraVez = useRef(true);
  const pedido = useRef(0);
  const municipio = datos.municipio?.nombre ?? null;

  const consultar = useCallback(
    async (f: FiltrosDeCobertura) => {
      const numero = ++pedido.current;
      setCargando(true);
      try {
        const res = await fetch("/api/electoral/cobertura", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...f, ...(esMaestro && municipio ? { municipio } : {}) })
        });
        const d = await res.json().catch(() => null);
        if (numero !== pedido.current) return;
        if (!res.ok || !d) avisar(d?.error || d?.message || "No se pudo leer la cobertura.");
        else setDatos(d as ResultadoDeCobertura);
      } catch {
        if (numero === pedido.current) avisar("Sin conexión: no se pudo leer la cobertura.");
      } finally {
        if (numero === pedido.current) setCargando(false);
      }
    },
    [esMaestro, municipio]
  );

  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    window.history.replaceState(null, "", window.location.pathname + direccionDeCobertura(filtros, esMaestro ? municipio : null));
    const t = setTimeout(() => void consultar(filtros), filtros.q ? 300 : 0);
    return () => clearTimeout(t);
  }, [filtros, consultar, esMaestro, municipio]);

  const cambiar = (parcial: Partial<FiltrosDeCobertura>) => setFiltros((f) => ({ ...f, pagina: 1, ...parcial }));
  const recargar = () => void consultar(filtros);
  const t = datos.totales;
  const conteoDeChip: Record<string, number | null> = { todas: null, sin_coordinador: t.sinCoordinador, sin_rg: t.sinRg, sin_rc: t.sinRc, completas: t.completas };
  const detalle = datos.filas.find((f) => f.seccionId === detalleDe) ?? null;

  if (!datos.municipio) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center space-y-3">
        <Landmark size={36} className="mx-auto text-gray-400" aria-hidden="true" />
        <p className="text-base font-bold text-gray-900">Tu cuenta aún no tiene municipio.</p>
        <p className="text-sm text-gray-600">La cobertura es por municipio: pídele a la administración que te lo asigne.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pt-3 pb-6 md:p-6 space-y-4">
      <header className="space-y-1">
        <h1 className="hidden md:flex text-3xl font-black text-slate-900 tracking-tight items-center gap-3">
          <Landmark className="text-indigo-600 h-8 w-8" aria-hidden="true" /> Estructura Electoral
        </h1>
        {esMaestro ? (
          <label className="block">
            <span className="sr-only">Municipio</span>
            <select
              value={municipio ?? ""}
              onChange={(e) => router.push(`/estructura-electoral?municipio=${encodeURIComponent(e.target.value)}`)}
              className="w-full md:w-auto min-h-[44px] px-3 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-900"
            >
              {MUNICIPIOS_JALISCO.map((m) => (
                <option key={m.name} value={m.name}>{m.name}</option>
              ))}
            </select>
          </label>
        ) : (
          <p className="text-sm font-bold text-gray-700">
            {municipio} · {datos.soloSuEstructura ? "tu estructura" : "todo el municipio"}
          </p>
        )}
        <p className="text-sm text-gray-600">
          Quién cubre cada sección el día de la elección.
          {datos.soloSuEstructura ? " Los números cuentan solo lo que nombró tu estructura." : ""} <QueEsEsto termino="cobertura" />
        </p>
      </header>

      <section aria-label="Avance" className="bg-white rounded-3xl border border-gray-200 p-4 space-y-3 shadow-sm">
        <Barra etiqueta="Coordinación" hechas={t.conCoordinador} de={t.secciones} nota="secciones" />
        <Barra etiqueta="Rep. general (RG)" hechas={t.conRg} de={t.secciones} nota="secciones" />
        <Barra etiqueta="Rep. de casilla (RC)" hechas={t.rc} de={t.rcEsperados} nota="casillas" />
        <p className="text-xs text-gray-500">
          Las casillas se estiman en {CASILLAS_ESTIMADAS_POR_SECCION} por sección mientras no tengamos el catálogo de casillas del INE. <QueEsEsto termino="rgrc" />
        </p>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0" aria-label="Filtros">
        {FILTROS_DE_COBERTURA.map((c) => (
          <button
            key={c.clave}
            type="button"
            aria-pressed={filtros.filtro === c.clave}
            onClick={() => cambiar({ filtro: c.clave })}
            className={`shrink-0 min-h-[40px] px-3.5 rounded-full border text-sm font-bold whitespace-nowrap cursor-pointer ${filtros.filtro === c.clave ? "bg-slate-900 text-white border-slate-900" : "bg-white text-gray-700 border-gray-200"}`}
          >
            {c.nombre}
            {conteoDeChip[c.clave] !== null ? ` ${conteoDeChip[c.clave]!.toLocaleString("es-MX")}` : ""}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
        <input
          type="search"
          value={filtros.q}
          onChange={(e) => cambiar({ q: e.target.value })}
          placeholder="Sección, colonia o nombre…"
          aria-label="Buscar sección, colonia o persona"
          className="w-full min-h-[48px] pl-10 pr-10 rounded-2xl border border-gray-200 bg-white text-base text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 [&::-webkit-search-cancel-button]:hidden"
        />
        {filtros.q && (
          <button type="button" onClick={() => cambiar({ q: "" })} aria-label="Borrar búsqueda" className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full inline-flex items-center justify-center text-gray-500 cursor-pointer">
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      <div aria-live="polite" className="text-sm font-semibold text-gray-600 flex items-center gap-2">
        {cargando && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
        {datos.total.toLocaleString("es-MX")} {datos.total === 1 ? "sección" : "secciones"}
      </div>

      {datos.filas.length === 0 && !cargando ? (
        <div className="bg-white rounded-3xl border border-gray-200 p-8 text-center space-y-2">
          <p className="text-base font-bold text-gray-900">{filtros.q || filtros.filtro !== "todas" ? "Ninguna sección con esos filtros." : "Este municipio no tiene secciones cargadas."}</p>
          {(filtros.q || filtros.filtro !== "todas") && (
            <button type="button" onClick={() => cambiar({ q: "", filtro: "todas" })} className="min-h-[40px] text-sm font-bold text-indigo-700 cursor-pointer">
              Quitar filtros
            </button>
          )}
        </div>
      ) : (
        <ul className={`grid grid-cols-1 md:grid-cols-2 gap-3 transition-opacity ${cargando ? "opacity-60" : ""}`}>
          {datos.filas.map((fila) => (
            <li key={fila.seccionId} className="bg-white rounded-3xl border border-gray-200 shadow-sm">
              <button type="button" onClick={() => setDetalleDe(fila.seccionId)} className="w-full text-left p-4 pb-2 space-y-1.5 cursor-pointer rounded-t-3xl hover:bg-gray-50">
                <p className="text-base font-black text-gray-900">
                  Sección {fila.numero}
                  {fila.colonias.length ? (
                    <span className="font-semibold text-gray-600 text-sm">
                      {" "}· {fila.colonias.slice(0, 2).join(", ")}
                      {fila.colonias.length > 2 ? ` y ${fila.colonias.length - 2} más` : ""}
                    </span>
                  ) : null}
                </p>
                {ROLES_ELECTORALES.map((r) => (
                  <LineaDeRol key={r.clave} fila={fila} clave={r.clave} corto={r.corto} />
                ))}
                {fila.nombrados.some((n) => !ROLES_ELECTORALES.some((r) => r.clave === n.rol)) && (
                  <p className="text-xs text-gray-500">Y {fila.nombrados.filter((n) => !ROLES_ELECTORALES.some((r) => r.clave === n.rol)).length} con un rol viejo: tócala para cambiarlo.</p>
                )}
              </button>
              {/* A la izquierda: a la derecha lo tapaba el botón «+» flotante en el teléfono. */}
              <div className="px-4 pb-4 pt-1 flex justify-start">
                <button
                  type="button"
                  onClick={() => setNombrarEn(fila)}
                  aria-label={`Nombrar en la sección ${fila.numero}`}
                  className="min-h-[44px] px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={16} aria-hidden="true" /> Nombrar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {datos.totalPaginas > 1 && (
        <nav aria-label="Páginas" className="flex items-center justify-between gap-3">
          <button type="button" disabled={datos.pagina <= 1} onClick={() => setFiltros((f) => ({ ...f, pagina: datos.pagina - 1 }))} className="min-h-[44px] px-4 rounded-xl border border-gray-200 bg-white text-sm font-bold inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer">
            <ChevronLeft size={16} aria-hidden="true" /> Anteriores
          </button>
          <span className="text-sm font-semibold text-gray-600">Página {datos.pagina} de {datos.totalPaginas}</span>
          <button type="button" disabled={datos.pagina >= datos.totalPaginas} onClick={() => setFiltros((f) => ({ ...f, pagina: datos.pagina + 1 }))} className="min-h-[44px] px-4 rounded-xl border border-gray-200 bg-white text-sm font-bold inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer">
            Siguientes <ChevronRight size={16} aria-hidden="true" />
          </button>
        </nav>
      )}

      <Nombrar
        fila={nombrarEn}
        onCerrar={() => setNombrarEn(null)}
        onNombrado={() => {
          setNombrarEn(null);
          recargar();
        }}
      />
      <DetalleSeccion
        fila={nombrarEn ? null : detalle}
        municipio={municipio}
        onCerrar={() => setDetalleDe(null)}
        onCambio={recargar}
        onNombrar={(f) => setNombrarEn(f)}
      />
    </div>
  );
}
