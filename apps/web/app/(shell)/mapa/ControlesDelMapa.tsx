"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertCircle, ChevronDown, ChevronUp, Eye, ListFilter, LocateFixed, MapPin, PlusCircle, Search, SlidersHorizontal, Users, Vote, X
} from "lucide-react";

import { MUNICIPIOS_JALISCO, TODO_JALISCO, TOTAL_SECCIONES_JALISCO } from "@/lib/municipios-jalisco";

import { TILE_STYLES, type EstiloDeMapa } from "./constantes";
import type { CoberturaContactos, Coloreado } from "./tipos";

/**
 * El menú del mapa (4.1, C14).
 *
 * Eran doce botones en tres filas que mezclaban la capa base, las capas de datos, las acciones y dos
 * modos de vista, y en el teléfono se apilaban hasta tapar la mitad del mapa. Ahora son tres grupos,
 * cada uno con una pregunta: **qué veo** (capas de datos), **cómo lo veo** (municipio, coloreado,
 * mapa base) y **qué hago** (ubicarme, buscar, reportar, ver la lista).
 *
 * En escritorio es una tarjeta a la izquierda que se pliega. En el teléfono es una hoja inferior:
 * cerrada solo enseña lo que se usa en la calle —ubicarme, buscar, reportar— y deja el mapa entero a
 * la vista; abierta, los tres grupos.
 */
export type PropsControles = {
  esMovil: boolean;
  municipio: string;
  onMunicipio: (m: string) => void;
  estilo: EstiloDeMapa;
  onEstilo: (e: EstiloDeMapa) => void;
  verIncidencias: boolean;
  onVerIncidencias: (v: boolean) => void;
  incidenciasAbiertas: number;
  verContactos: boolean;
  onVerContactos: (v: boolean) => void;
  cobertura: CoberturaContactos | null;
  verSecciones: boolean;
  onVerSecciones: (v: boolean) => void;
  coloreado: Coloreado;
  onColoreado: (c: Coloreado) => void;
  ubicando: boolean;
  onUbicarme: () => void;
  onBuscar: () => void;
  puedeReportar: boolean;
  onReportar: () => void;
  onLista: () => void;
  /** Escritorio: lo que va al pie de la columna del menú (resumen, leyenda, avisos). */
  pie?: React.ReactNode;
};

function Interruptor({ activo, onCambio, etiqueta, detalle, icono }: { activo: boolean; onCambio: (v: boolean) => void; etiqueta: string; detalle?: React.ReactNode; icono: React.ReactNode }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      onClick={() => onCambio(!activo)}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-colors cursor-pointer ${activo ? "bg-blue-50 border-blue-200" : "bg-white border-slate-200"}`}
    >
      <span className={activo ? "text-blue-600" : "text-slate-400"}>{icono}</span>
      <span className="flex-1 min-w-0">
        <span className={`block text-[13px] font-extrabold ${activo ? "text-blue-900" : "text-slate-700"}`}>{etiqueta}</span>
        {detalle ? <span className="block text-[11px] font-semibold text-slate-500">{detalle}</span> : null}
      </span>
      <span aria-hidden="true" className={`w-9 h-5 rounded-full relative shrink-0 transition-colors ${activo ? "bg-blue-600" : "bg-slate-300"}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${activo ? "left-[18px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

function Titulo({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">{children}</h3>;
}

function QueVeo(p: PropsControles) {
  const sinUbicacion = p.cobertura?.sinUbicacion ?? 0;
  return (
    <section aria-label="Qué veo" className="space-y-1.5">
      <Titulo>Qué veo</Titulo>
      <Interruptor activo={p.verIncidencias} onCambio={p.onVerIncidencias} etiqueta="Incidencias" detalle={`${p.incidenciasAbiertas} abiertas`} icono={<AlertCircle size={17} />} />
      <Interruptor
        activo={p.verContactos}
        onCambio={p.onVerContactos}
        etiqueta="Contactos"
        detalle={p.cobertura ? `${p.cobertura.ubicables.toLocaleString("es-MX")} en el mapa` : "Contando…"}
        icono={<Users size={17} />}
      />
      {/* Antes desaparecían en silencio: el rótulo decía «Contactos (3075)» como si fueran todos (C21). */}
      {sinUbicacion > 0 && (
        <Link href="/crm/contacts?ubicacion=sin" className="block text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 hover:bg-amber-100">
          {sinUbicacion.toLocaleString("es-MX")} {sinUbicacion === 1 ? "ciudadano sin ubicación no aparece" : "ciudadanos sin ubicación no aparecen"} en el mapa · corregir →
        </Link>
      )}
      <Interruptor activo={p.verSecciones} onCambio={p.onVerSecciones} etiqueta={p.municipio === TODO_JALISCO ? "Municipios" : "Secciones electorales"} icono={<MapPin size={17} />} />
    </section>
  );
}

function ComoLoVeo(p: PropsControles) {
  return (
    <section aria-label="Cómo lo veo" className="space-y-2">
      <Titulo>Cómo lo veo</Titulo>
      <label className="block">
        <span className="sr-only">Municipio</span>
        <select
          value={p.municipio}
          onChange={(e) => p.onMunicipio(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-slate-900"
        >
          <option value={TODO_JALISCO}>Todo Jalisco ({TOTAL_SECCIONES_JALISCO.toLocaleString("es-MX")} secc.)</option>
          {MUNICIPIOS_JALISCO.map((m) => (
            <option key={m.name} value={m.name}>{m.name} ({m.count} secc.)</option>
          ))}
        </select>
      </label>
      {p.verSecciones && p.municipio !== TODO_JALISCO && (
        <div role="radiogroup" aria-label="Colorear secciones por" className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100">
          {([["municipio", "Territorio", Eye], ["electoral", "Resultado electoral", Vote]] as const).map(([clave, texto, Icono]) => (
            <button
              key={clave}
              type="button"
              role="radio"
              aria-checked={p.coloreado === clave}
              onClick={() => p.onColoreado(clave)}
              className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[12px] font-extrabold cursor-pointer ${p.coloreado === clave ? "bg-white text-blue-800 shadow-sm" : "text-slate-600"}`}
            >
              <Icono size={14} /> {texto}
            </button>
          ))}
        </div>
      )}
      <div role="radiogroup" aria-label="Mapa base" className="grid grid-cols-4 gap-1">
        {(Object.keys(TILE_STYLES) as EstiloDeMapa[]).map((clave) => {
          const s = TILE_STYLES[clave];
          const Icono = s.icon;
          return (
            <button
              key={clave}
              type="button"
              role="radio"
              aria-checked={p.estilo === clave}
              title={s.name}
              onClick={() => p.onEstilo(clave)}
              className={`flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-lg border text-[10px] font-extrabold cursor-pointer ${p.estilo === clave ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-600"}`}
            >
              <Icono size={15} /> {s.corto}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function QueHago(p: PropsControles & { compacto?: boolean }) {
  const boton = "flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-[12px] font-extrabold cursor-pointer";
  return (
    <section aria-label="Qué hago" className="space-y-1.5">
      {!p.compacto && <Titulo>Qué hago</Titulo>}
      <div className="grid grid-cols-2 gap-1.5">
        <button type="button" onClick={p.onUbicarme} disabled={p.ubicando} className={`${boton} bg-white border-slate-200 text-slate-800 disabled:opacity-60`}>
          <LocateFixed size={15} className={p.ubicando ? "animate-spin" : undefined} /> Mi ubicación
        </button>
        <button type="button" onClick={p.onBuscar} className={`${boton} bg-white border-slate-200 text-slate-800`}>
          <Search size={15} /> Buscar
        </button>
        {/* Solo a quien la API deja levantar incidencias: antes se ofrecía a todos y al guardar
            respondía que no (M26). */}
        {p.puedeReportar && (
          <button type="button" onClick={p.onReportar} className={`${boton} bg-red-600 border-red-600 text-white`}>
            <PlusCircle size={15} /> Reportar
          </button>
        )}
        <button type="button" onClick={p.onLista} className={`${boton} bg-white border-slate-200 text-slate-800 ${p.puedeReportar ? "" : "col-span-2"}`}>
          <ListFilter size={15} /> Lista ({p.incidenciasAbiertas})
        </button>
      </div>
      {p.puedeReportar && <p className="mt-2 text-[11px] text-slate-500">O doble clic en el mapa para reportar en ese punto.</p>}
    </section>
  );
}

export function ControlesDelMapa(p: PropsControles) {
  const [abierto, setAbierto] = useState(!p.esMovil);

  if (!p.esMovil) {
    // Una sola columna a la izquierda: el menú arriba y el resumen (`pie`) abajo. Antes el resumen, la
    // leyenda y el menú se posicionaban cada uno por su cuenta y en una pantalla baja se tapaban. El
    // hueco entre los dos deja pasar el ratón al mapa.
    return (
      <div className="absolute top-3 left-3 bottom-3 z-30 w-[292px] max-w-[calc(100%-24px)] flex flex-col gap-2 pointer-events-none">
        {abierto ? (
          <aside aria-label="Controles del mapa" className="pointer-events-auto min-h-0 overflow-y-auto rounded-2xl bg-white/95 border border-slate-200 shadow-xl p-3 space-y-4 backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-black text-slate-900">Mapa</span>
              <button type="button" onClick={() => setAbierto(false)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer" aria-label="Plegar controles" title="Plegar controles">
                <ChevronUp size={16} />
              </button>
            </div>
            <QueVeo {...p} />
            <ComoLoVeo {...p} />
            <QueHago {...p} />
          </aside>
        ) : (
          <button
            type="button"
            onClick={() => setAbierto(true)}
            className="pointer-events-auto self-start flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/95 border border-slate-200 shadow-lg text-[12px] font-extrabold text-slate-800 cursor-pointer"
          >
            <SlidersHorizontal size={15} /> Capas y acciones
          </button>
        )}
        {p.pie ? <div className="pointer-events-auto mt-auto shrink-0">{p.pie}</div> : null}
      </div>
    );
  }

  // Teléfono: hoja inferior. Cerrada deja el mapa entero a la vista; queda sitio a la derecha para
  // el botón flotante de crear, que vive fuera del mapa (58 px a 18 px del borde de la pantalla, que
  // es el borde del mapa más su margen de 16).
  if (!abierto) {
    return (
      <div className="absolute left-2 right-[68px] bottom-2 z-30 rounded-2xl bg-white/95 border border-slate-200 shadow-xl p-1.5 flex items-center gap-1.5 backdrop-blur">
        <button type="button" onClick={() => setAbierto(true)} className="flex-1 min-w-0 flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-100 text-left cursor-pointer" aria-label="Abrir capas y acciones">
          <ChevronUp size={16} className="text-slate-600 shrink-0" />
          <span className="min-w-0">
            <span className="block text-[12px] font-extrabold text-slate-900 truncate">{p.municipio === TODO_JALISCO ? "Todo Jalisco" : p.municipio}</span>
            <span className="block text-[10px] font-bold text-slate-500 truncate">{p.incidenciasAbiertas} abiertas</span>
          </span>
        </button>
        <button type="button" onClick={p.onUbicarme} disabled={p.ubicando} className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 cursor-pointer disabled:opacity-60" aria-label="Mi ubicación" title="Mi ubicación">
          <LocateFixed size={18} className={p.ubicando ? "animate-spin" : undefined} />
        </button>
        <button type="button" onClick={p.onBuscar} className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 cursor-pointer" aria-label="Buscar" title="Buscar">
          <Search size={18} />
        </button>
        {p.puedeReportar && (
          <button type="button" onClick={p.onReportar} className="p-2.5 rounded-xl bg-red-600 text-white cursor-pointer" aria-label="Reportar incidencia" title="Reportar incidencia (o doble toque en el mapa)">
            <PlusCircle size={18} />
          </button>
        )}
      </div>
    );
  }
  return (
    <>
      <button type="button" aria-label="Cerrar capas y acciones" onClick={() => setAbierto(false)} className="absolute inset-0 z-[109] bg-slate-900/25 cursor-default" />
      <div role="dialog" aria-label="Capas y acciones del mapa" className="absolute left-0 right-0 bottom-0 z-[110] max-h-[78%] overflow-y-auto overscroll-contain rounded-t-3xl bg-white shadow-2xl p-4 pt-2 space-y-4">
        <div className="sticky top-0 -mx-4 px-4 pt-1 pb-2 bg-white flex items-center justify-between">
          <span aria-hidden="true" className="absolute left-1/2 -translate-x-1/2 top-1 w-10 h-1.5 rounded-full bg-slate-300" />
          <span className="text-[14px] font-black text-slate-900 mt-2">Capas y acciones</span>
          <button type="button" onClick={() => setAbierto(false)} className="mt-2 p-2 rounded-full bg-slate-100 text-slate-600 cursor-pointer" aria-label="Cerrar">
            <ChevronDown size={18} />
          </button>
        </div>
        {/* Cada acción cierra la hoja: si no, el panel que abre (búsqueda, formulario) quedaría debajo. */}
        <QueHago
          {...p}
          compacto
          onUbicarme={() => { setAbierto(false); p.onUbicarme(); }}
          onBuscar={() => { setAbierto(false); p.onBuscar(); }}
          onReportar={() => { setAbierto(false); p.onReportar(); }}
          onLista={() => { setAbierto(false); p.onLista(); }}
        />
        <QueVeo {...p} />
        <ComoLoVeo {...p} />
        <button type="button" onClick={() => setAbierto(false)} className="w-full py-3 rounded-xl bg-slate-900 text-white text-[13px] font-extrabold cursor-pointer flex items-center justify-center gap-2">
          <X size={16} /> Ver el mapa
        </button>
      </div>
    </>
  );
}
