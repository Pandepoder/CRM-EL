"use client";

import { useMemo, useState } from "react";
import { Bug, ChevronDown, ImageIcon, Loader2 } from "lucide-react";

import { avisar } from "@/lib/avisos";
import { ESTADOS_DE_PROBLEMA, LARGO_MAXIMO_RESPUESTA, TIPOS_DE_PROBLEMA, type EstadoDeProblema } from "@/lib/problemas";
import type { ReporteParaRevisar, ResumenDeProblemas } from "@/lib/problemas-servicio";

/**
 * Lo que reporta la gente, para quien administra: cuántos hay por estado, en qué pantallas se reporta más y
 * cada reporte con su contexto técnico (pantalla, error, teléfono, señal) y la captura. Se le cambia el
 * estado y se le contesta a quien lo hizo, que lo ve en su «Reportar un problema».
 */

type Filtro = "abiertos" | EstadoDeProblema | "todos";
const FILTROS: Array<{ clave: Filtro; etiqueta: string }> = [
  { clave: "abiertos", etiqueta: "Por atender" },
  { clave: "nuevo", etiqueta: "Nuevos" },
  { clave: "en_revision", etiqueta: "En revisión" },
  { clave: "resuelto", etiqueta: "Resueltos" },
  { clave: "descartado", etiqueta: "Cerrados" },
  { clave: "todos", etiqueta: "Todos" }
];
const ACCIONES: Array<{ estado: EstadoDeProblema; etiqueta: string }> = [
  { estado: "en_revision", etiqueta: "En revisión" },
  { estado: "resuelto", etiqueta: "Resuelto" },
  { estado: "descartado", etiqueta: "Cerrar sin cambios" }
];

function fecha(iso: string) {
  return new Date(iso).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City" });
}

function Reporte({ r, alCambiar }: { r: ReporteParaRevisar; alCambiar: (nuevo: ReporteParaRevisar) => void }) {
  const [respuesta, setRespuesta] = useState(r.respuesta ?? "");
  const [guardando, setGuardando] = useState<EstadoDeProblema | null>(null);
  const tipo = TIPOS_DE_PROBLEMA.find((t) => t.clave === r.tipo);
  const estado = ESTADOS_DE_PROBLEMA[r.estado];

  async function cambiar(nuevo: EstadoDeProblema) {
    setGuardando(nuevo);
    try {
      const res = await fetch(`/api/problemas/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevo, respuesta })
      });
      const datos = (await res.json().catch(() => ({}))) as { error?: string; estado?: EstadoDeProblema; respuesta?: string | null };
      if (!res.ok) {
        avisar(datos.error || "No se pudo guardar. Revisa tu señal y vuelve a intentarlo.");
        return;
      }
      alCambiar({ ...r, estado: datos.estado ?? nuevo, respuesta: datos.respuesta ?? null, actualizado: new Date().toISOString() });
      avisar(`Listo: quedó como «${ESTADOS_DE_PROBLEMA[nuevo].etiqueta}». ${r.quien.nombre} lo verá en sus reportes.`, "exito");
    } catch {
      avisar("No se pudo guardar. Revisa tu señal y vuelve a intentarlo.");
    } finally {
      setGuardando(null);
    }
  }

  return (
    <li className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-base font-extrabold text-gray-900">
            <span aria-hidden="true">{tipo?.emoji}</span> {r.lugar}
          </p>
          <p className="text-xs font-semibold text-gray-600">
            {tipo?.etiqueta} · {r.quien.nombre}
            {r.quien.rol ? ` (${r.quien.rol})` : ""} · {fecha(r.creado)}
          </p>
        </div>
        <span className={`shrink-0 text-xs font-extrabold px-2 py-0.5 rounded-full border ${estado.estilo}`}>{estado.etiqueta}</span>
      </div>

      <p className="text-sm text-gray-800 whitespace-pre-line">{r.descripcion}</p>
      {r.error && (
        <p className="text-sm rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-amber-950">
          <strong>Le salió:</strong> «{r.error}»
        </p>
      )}
      {r.foto && (
        <a href={r.foto} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl border border-gray-200 text-sm font-bold text-blue-700 hover:bg-blue-50">
          <ImageIcon size={16} aria-hidden="true" /> Ver la captura
        </a>
      )}

      <details className="text-xs text-gray-600">
        <summary className="cursor-pointer font-bold text-gray-700 min-h-[32px] inline-flex items-center gap-1">
          <ChevronDown size={14} aria-hidden="true" /> Datos técnicos
        </summary>
        <dl className="mt-1 grid grid-cols-[auto,1fr] gap-x-3 gap-y-1">
          <dt className="font-bold">Pantalla</dt>
          <dd className="break-all">{r.ruta ?? "—"}</dd>
          <dt className="font-bold">Lugar elegido</dt>
          <dd className="break-all">{r.lugarClave}</dd>
          <dt className="font-bold">Teléfono</dt>
          <dd className="break-all">{r.dispositivo?.navegador ?? "—"}</dd>
          <dt className="font-bold">Tamaño</dt>
          <dd>{r.dispositivo?.pantalla ?? "—"}</dd>
          <dt className="font-bold">Señal</dt>
          <dd>{r.dispositivo?.enLinea === undefined ? "—" : r.dispositivo.enLinea ? "Con señal" : "Sin señal"}</dd>
        </dl>
      </details>

      <div className="space-y-2 border-t border-gray-100 pt-3">
        <label htmlFor={`respuesta-${r.id}`} className="block text-xs font-bold text-gray-700">
          Respuesta para {r.quien.nombre} (opcional)
        </label>
        <textarea
          id={`respuesta-${r.id}`}
          rows={2}
          maxLength={LARGO_MAXIMO_RESPUESTA}
          value={respuesta}
          onChange={(e) => setRespuesta(e.target.value)}
          placeholder="Por ejemplo: ya quedó, vuelve a intentarlo."
          className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 resize-none"
        />
        <div className="flex flex-wrap gap-2">
          {ACCIONES.map((a) => (
            <button
              key={a.estado}
              type="button"
              disabled={guardando !== null}
              onClick={() => cambiar(a.estado)}
              aria-pressed={r.estado === a.estado}
              className={`min-h-[40px] px-3 rounded-xl text-sm font-extrabold border cursor-pointer disabled:opacity-60 inline-flex items-center gap-1.5 ${
                r.estado === a.estado ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-200 text-gray-800 hover:bg-gray-50"
              }`}
            >
              {guardando === a.estado && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              {a.etiqueta}
            </button>
          ))}
        </div>
      </div>
    </li>
  );
}

export default function ProblemasReportadosClient({
  reportes: iniciales,
  resumen,
  esMaestro
}: Readonly<{ reportes: ReporteParaRevisar[]; resumen: ResumenDeProblemas; esMaestro: boolean }>) {
  const [reportes, setReportes] = useState(iniciales);
  const [filtro, setFiltro] = useState<Filtro>("abiertos");

  const visibles = useMemo(
    () =>
      reportes.filter((r) =>
        filtro === "todos" ? true : filtro === "abiertos" ? r.estado === "nuevo" || r.estado === "en_revision" : r.estado === filtro
      ),
    [reportes, filtro]
  );
  // El resumen se recalcula con los cambios de esta sesión para que no contradiga la lista: los números por
  // estado y los lugares con reportes por atender.
  const { porEstado, lugaresConMas } = useMemo(() => {
    const cuenta = { ...resumen.porEstado };
    const abiertos = new Map(resumen.lugaresConMas.map((l) => [l.lugar, l.abiertos]));
    const abierto = (e: EstadoDeProblema) => e === "nuevo" || e === "en_revision";
    for (const r of iniciales) {
      const ahora = reportes.find((x) => x.id === r.id)?.estado;
      if (!ahora || ahora === r.estado) continue;
      cuenta[r.estado]--;
      cuenta[ahora]++;
      if (abierto(r.estado) !== abierto(ahora)) abiertos.set(r.lugar, (abiertos.get(r.lugar) ?? 0) + (abierto(ahora) ? 1 : -1));
    }
    return {
      porEstado: cuenta,
      lugaresConMas: [...abiertos].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([lugar, n]) => ({ lugar, abiertos: n }))
    };
  }, [resumen, iniciales, reportes]);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Bug className="text-rose-600 shrink-0" size={28} aria-hidden="true" /> Problemas reportados
        </h1>
        <p className="text-sm text-slate-600">
          Lo que reporta {esMaestro ? "la gente de todos los municipios" : "la gente de tu municipio"} desde «Reportar un problema». Cámbiale el estado
          y contéstale: lo ve en sus reportes.
        </p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(Object.keys(ESTADOS_DE_PROBLEMA) as EstadoDeProblema[]).map((e) => (
          <div key={e} className={`rounded-2xl border px-3 py-2.5 ${ESTADOS_DE_PROBLEMA[e].estilo}`}>
            <p className="text-2xl font-black tabular-nums">{porEstado[e]}</p>
            <p className="text-xs font-bold">{ESTADOS_DE_PROBLEMA[e].etiqueta}</p>
          </div>
        ))}
      </div>

      {lugaresConMas.length > 0 && (
        <section className="rounded-2xl border border-gray-200 bg-white p-4" aria-labelledby="donde-mas">
          <h2 id="donde-mas" className="text-sm font-black text-gray-900 mb-2">Dónde se reporta más (por atender)</h2>
          <ul className="space-y-1.5">
            {lugaresConMas.map((l) => (
              <li key={l.lugar} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-gray-800 min-w-0 truncate">{l.lugar}</span>
                <span className="shrink-0 font-black tabular-nums text-rose-700">{l.abiertos}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Filtrar reportes">
        {FILTROS.map((f) => (
          <button
            key={f.clave}
            type="button"
            role="tab"
            aria-selected={filtro === f.clave}
            onClick={() => setFiltro(f.clave)}
            className={`shrink-0 min-h-[40px] px-3 rounded-xl text-sm font-extrabold border cursor-pointer ${
              filtro === f.clave ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-gray-200 text-gray-700"
            }`}
          >
            {f.etiqueta}
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="font-bold text-gray-800">{filtro === "abiertos" ? "No hay nada por atender." : "No hay reportes con ese estado."}</p>
          <p className="text-sm text-gray-600 mt-1">Cuando alguien reporte un problema desde su menú, aparecerá aquí.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visibles.map((r) => (
            <Reporte key={r.id} r={r} alCambiar={(nuevo) => setReportes((lista) => lista.map((x) => (x.id === nuevo.id ? nuevo : x)))} />
          ))}
        </ul>
      )}
    </div>
  );
}
