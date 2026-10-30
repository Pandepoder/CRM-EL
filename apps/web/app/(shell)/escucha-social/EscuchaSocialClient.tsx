"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronLeft, ChevronRight, Handshake, Landmark, Lightbulb, Loader2, MapPin, MessageSquare, Plus, RefreshCw, Search, X } from "lucide-react";
import type { ComponentType } from "react";

import { QueEsEsto } from "@/components/QueEsEsto";
import { avisar } from "@/lib/avisos";
import {
  CATEGORIAS_ESCUCHA,
  direccionDePeticiones,
  nombreDeCategoriaEscucha,
  nombreDeEstadoEscucha,
  textoDeProblemaEnLaCalle,
  textoDelTurno,
  type FilaDePeticion,
  type FiltrosDePeticiones,
  type ResultadoDePeticiones,
  type VistaDeEscucha
} from "@/lib/escucha-social";
import { useMunicipioUsuario } from "@/lib/municipio-contexto";

// El formulario trae el selector de ubicación y el de fotos, y el detalle la galería: se cargan aparte, después de
// la lista, para que en el teléfono la lista salga antes (pasaba de 132 a 148 kB la primera carga).
const FormularioPeticion = dynamic(() => import("./FormularioPeticion").then((m) => m.FormularioPeticion), { ssr: false });
const DetallePeticion = dynamic(() => import("./DetallePeticion").then((m) => m.DetallePeticion), { ssr: false });

type Icono = ComponentType<{ size?: number | string; className?: string }>;

const ESTILO: Record<string, { icono: Icono; bg: string; texto: string }> = {
  propuesta: { icono: Lightbulb, bg: "bg-amber-100", texto: "text-amber-900" },
  problematica: { icono: AlertTriangle, bg: "bg-rose-100", texto: "text-rose-900" },
  compromiso: { icono: Handshake, bg: "bg-blue-100", texto: "text-blue-900" },
  seguimiento: { icono: RefreshCw, bg: "bg-purple-100", texto: "text-purple-900" },
  gestion: { icono: Landmark, bg: "bg-emerald-100", texto: "text-emerald-900" }
};
const SIN_ESTILO = { icono: MessageSquare, bg: "bg-gray-100", texto: "text-gray-700" };

const ESTADO_ESTILO: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-900",
  en_seguimiento: "bg-blue-100 text-blue-900",
  cerrado: "bg-emerald-100 text-emerald-900"
};

const VISTAS: Array<{ clave: VistaDeEscucha; nombre: string }> = [
  { clave: "todas", nombre: "Todas" },
  ...CATEGORIAS_ESCUCHA.map((c) => ({ clave: c.clave, nombre: c.plural })),
  // Las que administración ya turnó a una dependencia (D6). Antes se llamaba «Gestiones Formales» y se
  // confundía con la categoría «Gestión».
  { clave: "turnadas", nombre: "Turnadas a dependencia" }
];

const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "America/Mexico_City" });

/**
 * Escucha Social (plan de auditoría de menús, fase 3): lo que pide o propone un vecino, ligado a él. La lista
 * llega por páginas y los filtros se resuelven en la base (`POST /api/escucha-social/consulta`); el texto del
 * buscador no va en la dirección.
 */
export default function EscuchaSocialClient({
  inicial,
  filtrosIniciales,
  abrirNueva,
  vecinoInicial,
  peticionInicial,
  peticionNoEncontrada,
  esAdministracion,
  coordina,
  usuarioId
}: {
  inicial: ResultadoDePeticiones;
  filtrosIniciales: FiltrosDePeticiones;
  abrirNueva: boolean;
  vecinoInicial: { id: string; nombre: string } | null;
  peticionInicial: FilaDePeticion | null;
  peticionNoEncontrada: boolean;
  esAdministracion: boolean;
  coordina: boolean;
  usuarioId: string;
}) {
  const router = useRouter();
  const municipio = useMunicipioUsuario();
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [datos, setDatos] = useState(inicial);
  const [cargando, setCargando] = useState(false);
  const [formulario, setFormulario] = useState(abrirNueva);
  const [abierta, setAbierta] = useState<FilaDePeticion | null>(peticionInicial);
  const primeraVez = useRef(true);
  const pedido = useRef(0);

  // Lo que llega por la dirección (?nueva=1, ?peticion=, ?contacto=) se usa una vez y se retira.
  useEffect(() => {
    if (peticionNoEncontrada) avisar("No encontramos esa petición o no es de tu equipo.");
    if (abrirNueva || peticionInicial || peticionNoEncontrada || vecinoInicial) {
      window.history.replaceState(null, "", window.location.pathname + direccionDePeticiones(filtrosIniciales));
    }
  }, [abrirNueva, peticionInicial, peticionNoEncontrada, vecinoInicial, filtrosIniciales]);

  const consultar = useCallback(async (f: FiltrosDePeticiones) => {
    const numero = ++pedido.current;
    setCargando(true);
    try {
      const res = await fetch("/api/escucha-social/consulta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const d = await res.json().catch(() => null);
      if (numero !== pedido.current) return;
      if (!res.ok || !d) avisar(d?.error || "No se pudieron leer las peticiones.");
      else setDatos(d as ResultadoDePeticiones);
    } catch {
      if (numero === pedido.current) avisar("Sin conexión: no se pudieron leer las peticiones.");
    } finally {
      if (numero === pedido.current) setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    window.history.replaceState(null, "", window.location.pathname + direccionDePeticiones(filtros));
    const t = setTimeout(() => void consultar(filtros), filtros.q ? 300 : 0);
    return () => clearTimeout(t);
  }, [filtros, consultar]);

  const cambiar = (parcial: Partial<FiltrosDePeticiones>) => setFiltros((f) => ({ ...f, pagina: 1, ...parcial }));
  const recargar = async () => {
    await consultar(filtros);
    router.refresh();
  };
  const hayFiltros = Boolean(filtros.q || filtros.estado || filtros.mias || filtros.vista !== "todas");

  return (
    <div className="max-w-6xl mx-auto px-4 pt-3 pb-6 md:p-6 space-y-4">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div className="space-y-1">
          <h1 className="hidden md:block text-3xl font-black text-slate-900 tracking-tight">Escucha Social y Gestiones</h1>
          {/* Se confundía con Incidencias (L7): aquí va lo que pide o propone un vecino, no los baches. */}
          <p className="text-sm text-slate-600 max-w-2xl">
            Anota lo que te pide o propone un vecino{municipio ? ` de ${municipio}` : ""}: una idea, una necesidad o un compromiso. {textoDeProblemaEnLaCalle(coordina, !coordina)} <QueEsEsto termino="escucha" />
          </p>
        </div>
        <button type="button" onClick={() => setFormulario(true)} className="min-h-[48px] px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 cursor-pointer self-start">
          <Plus size={18} aria-hidden="true" /> Anotar una petición
        </button>
      </header>

      <nav aria-label="Categorías" className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0">
        {VISTAS.map((v) => (
          <button
            key={v.clave}
            type="button"
            aria-pressed={filtros.vista === v.clave}
            onClick={() => cambiar({ vista: v.clave })}
            className={`shrink-0 min-h-[40px] px-3.5 rounded-full text-sm font-bold whitespace-nowrap cursor-pointer ${filtros.vista === v.clave ? "bg-slate-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
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
          placeholder="Buscar por tema, propuesta o colonia…"
          aria-label="Buscar peticiones"
          className="w-full min-h-[48px] pl-10 pr-4 rounded-2xl border border-gray-200 bg-white text-base text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0" aria-label="Filtros">
        {/* Primero: quien no coordina abre con este filtro puesto, y tiene que verse sin deslizar. */}
        <button
          type="button"
          aria-pressed={filtros.mias}
          onClick={() => cambiar({ mias: !filtros.mias })}
          className={`shrink-0 min-h-[40px] px-3.5 rounded-full border text-sm font-bold whitespace-nowrap cursor-pointer ${filtros.mias ? "bg-slate-900 text-white border-slate-900" : "bg-white text-gray-700 border-gray-200"}`}
        >
          {filtros.mias && <X size={13} className="inline mr-1 -mt-0.5" aria-hidden="true" />}
          Las que anoté
        </button>
        {(["pendiente", "en_seguimiento", "cerrado"] as const).map((e) => (
          <button
            key={e}
            type="button"
            aria-pressed={filtros.estado === e}
            onClick={() => cambiar({ estado: filtros.estado === e ? null : e })}
            className={`shrink-0 min-h-[40px] px-3.5 rounded-full border text-sm font-bold whitespace-nowrap cursor-pointer ${filtros.estado === e ? "bg-slate-900 text-white border-slate-900" : "bg-white text-gray-700 border-gray-200"}`}
          >
            {filtros.estado === e && <X size={13} className="inline mr-1 -mt-0.5" aria-hidden="true" />}
            {e === "pendiente" ? `Pendientes ${datos.pendientes}` : nombreDeEstadoEscucha(e)}
          </button>
        ))}
      </div>

      {hayFiltros && (
        <button type="button" onClick={() => setFiltros({ ...filtros, vista: "todas", estado: null, mias: false, q: "", pagina: 1 })} className="min-h-[40px] text-sm font-bold text-blue-700 hover:text-blue-900 cursor-pointer">
          Quitar filtros
        </button>
      )}

      <div aria-live="polite" className="text-sm font-semibold text-gray-600 flex items-center gap-2">
        {cargando && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
        {datos.total > 0 && `${datos.total.toLocaleString("es-MX")} ${datos.total === 1 ? "petición" : "peticiones"}`}
      </div>

      {datos.filas.length === 0 && !cargando ? (
        <div className="bg-white rounded-3xl border border-gray-200 p-10 text-center shadow-sm space-y-3">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto">
            <MessageSquare size={26} aria-hidden="true" />
          </div>
          <p className="text-base font-bold text-gray-900">{hayFiltros ? "Nada con esos filtros." : "Todavía no hay peticiones."}</p>
          <p className="text-sm text-gray-600 max-w-sm mx-auto">
            {hayFiltros ? "Prueba con otra palabra o quita algún filtro." : "Cuando un vecino te pida algo o te proponga una idea, anótalo aquí para que no se pierda y tu equipo le dé seguimiento."}
          </p>
          {!hayFiltros && (
            <button type="button" onClick={() => setFormulario(true)} className="min-h-[44px] px-5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl inline-flex items-center gap-2 cursor-pointer">
              <Plus size={16} aria-hidden="true" /> Anotar la primera
            </button>
          )}
        </div>
      ) : (
        <ul className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 transition-opacity ${cargando ? "opacity-60" : ""}`}>
          {datos.filas.map((p) => {
            const estilo = ESTILO[p.categoria] ?? SIN_ESTILO;
            const IconoCategoria = estilo.icono;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setAbierta(p)}
                  className="w-full h-full text-left bg-white rounded-3xl p-4 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black inline-flex items-center gap-1 ${estilo.bg} ${estilo.texto}`}>
                      <IconoCategoria size={11} /> {nombreDeCategoriaEscucha(p.categoria)}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold ${ESTADO_ESTILO[p.estado] ?? "bg-gray-100 text-gray-700"}`}>{nombreDeEstadoEscucha(p.estado)}</span>
                  </div>
                  <p className="font-extrabold text-sm text-gray-900 line-clamp-2">{p.titulo}</p>
                  <p className="text-xs text-gray-600 line-clamp-2">{p.descripcion}</p>
                  <p className="text-xs text-gray-700">
                    De: <strong>{p.vecino ? p.vecino.nombre : p.vecinoOculto ? "un vecino" : "el barrio"}</strong>
                  </p>
                  {p.lugar && (
                    <p className="text-[11px] text-gray-500 flex items-center gap-1 truncate">
                      <MapPin size={11} className="text-blue-600 shrink-0" aria-hidden="true" /> <span className="truncate">{p.lugar}</span>
                    </p>
                  )}
                  {p.turno && (
                    <p className="text-[11px] font-black text-emerald-800 bg-emerald-50 rounded-md px-2 py-0.5 inline-flex items-center gap-1">
                      <Landmark size={11} aria-hidden="true" /> {textoDelTurno({ ...p.turno, folio: null })}
                    </p>
                  )}
                  <p className="text-[11px] text-gray-500 flex justify-between gap-2 pt-1 border-t border-gray-100">
                    <span>Anotó: {p.autor ?? "otra estructura"}</span>
                    <span>{fecha(p.creada)}</span>
                  </p>
                </button>
              </li>
            );
          })}
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

      <FormularioPeticion
        abierto={formulario}
        vecinoInicial={vecinoInicial}
        usuarioId={usuarioId}
        onCerrar={() => setFormulario(false)}
        onGuardada={() => {
          setFormulario(false);
          void recargar();
        }}
      />
      <DetallePeticion
        peticion={abierta}
        esAdministracion={esAdministracion}
        onCerrar={() => setAbierta(null)}
        onCambio={async () => {
          const id = abierta?.id;
          await consultar(filtros);
          // La petición abierta se vuelve a leer: el estado, las notas y el turno cambiaron.
          if (id) {
            const r = await fetch(`/api/escucha-social/${id}`).then((x) => (x.ok ? x.json() : null)).catch(() => null);
            setAbierta(r?.peticion ?? null);
          }
        }}
      />
    </div>
  );
}
