"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle, AlertTriangle, Archive, CheckCircle2, Construction, Droplets, Landmark, Lightbulb, Loader2, MapPin, ShieldAlert, ShieldCheck, Trash2, Users, X
} from "lucide-react";
import type { ComponentType } from "react";

import { AddressAutocomplete, type AutocompleteItem } from "@/components/AddressAutocomplete";
import { MediaUploader, type MediaFile } from "@/components/MediaUploader";
import { PredictiveCombobox } from "@/components/PredictiveCombobox";
import { enviarOEncolar, nuevaClave, TEXTO_DE_ESPERA } from "@/lib/cola-de-envios";
import { ESTADOS_INCIDENCIA } from "@/lib/estados-incidencia";
import { MUNICIPIOS_JALISCO, TODO_JALISCO } from "@/lib/municipios-jalisco";

import { CATEGORIES } from "./constantes";
import type { ReportFeature, UserOption } from "./tipos";

type Icono = ComponentType<{ size?: number | string; className?: string }>;

/** Diálogos del repo: 110, por encima de la barra inferior (50) y del botón flotante (60). Antes, 5000. */
const FONDO = "fixed inset-0 z-[110] flex items-center justify-center p-3 bg-black/65 backdrop-blur-sm";
const CAJA = "bg-white rounded-2xl w-full max-w-[480px] max-h-[88dvh] flex flex-col overflow-hidden shadow-2xl";
const ETIQUETA = "block text-[10px] font-extrabold text-slate-600 uppercase mb-1";
const CAMPO = "w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-[12px] font-semibold outline-none";

const opcionesMunicipio = MUNICIPIOS_JALISCO.map((m) => ({ value: m.name, label: m.name, badge: `${m.count} secc.` }));
const opcionesCategoria = Object.entries(CATEGORIES).map(([key, cat]) => ({ value: key, label: cat.label, badge: "Categoría" }));

export type PuntoDeReporte = {
  lat: number;
  lng: number;
  municipio?: string | undefined;
  seccionId?: string | undefined;
  precisionGps?: number | undefined;
  /**
   * De dónde salió el punto. Uno marcado —clic o doble clic en el mapa, o el GPS— es el lugar de la
   * incidencia y nada lo mueve. El centro del mapa (el botón «Reportar» sin GPS) o el de una sección
   * («Reportar en esta sección») no marcan nada: ahí sí se ubica buscando la dirección.
   */
  origen?: "clic" | "gps" | "centro" | undefined;
};

type Deteccion = {
  address?: string | undefined;
  sectionNum?: number | undefined;
  sectionId?: string | undefined;
  municipality?: string | undefined;
  colony?: string | undefined;
  postcode?: string | undefined;
  /** Radio de error que reporta el GPS, en metros. Sin GPS de por medio va vacío. */
  gpsAccuracy?: number | undefined;
};

/** Punto dentro de un polígono (anillo exterior): la detección inmediata, sin esperar al servidor. */
function seccionDelPunto(secciones: any, lat: number, lng: number) {
  for (const feat of secciones?.features ?? []) {
    const anillo = feat.geometry?.type === "Polygon" ? feat.geometry.coordinates[0] : feat.geometry?.coordinates?.[0]?.[0];
    if (!anillo || anillo.length < 3) continue;
    let dentro = false;
    for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
      const [xi, yi] = anillo[i];
      const [xj, yj] = anillo[j];
      if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) dentro = !dentro;
    }
    if (dentro) return feat.properties;
  }
  return null;
}

const vacio = { title: "", address: "", description: "", category: "servicios", municipality: "", sectionId: "", assignedToUserId: "", mediaUrls: [] as MediaFile[] };

/**
 * Levantar una incidencia en un punto. Detecta dirección, municipio y sección del punto (al instante
 * con los polígonos cargados, y después con el servidor), y se envía con clave (R16) y, sin señal, a
 * la cola del teléfono (3.4).
 */
export function ModalNuevaIncidencia(p: {
  punto: PuntoDeReporte | null;
  secciones: any;
  usuarios: UserOption[];
  usuarioActualId: string | null;
  onCerrar: () => void;
  onGuardada: (mensaje: string) => void;
  onMoverMapa: (lat: number, lng: number) => void;
}) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [deteccion, setDeteccion] = useState<Deteccion | null>(null);
  const [ubicando, setUbicando] = useState(false);
  const [form, setForm] = useState(vacio);
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clave, setClave] = useState(() => nuevaClave());

  useEffect(() => {
    const punto = p.punto;
    if (!punto) return;
    let vigente = true;
    setCoords({ lat: punto.lat, lng: punto.lng });
    setListo(null);
    setError(null);
    // El municipio sale del punto, nunca del filtro del mapa: vacío es correcto, el servidor lo deduce
    // del polígono del INE que contiene el punto.
    const inmediata = seccionDelPunto(p.secciones, punto.lat, punto.lng);
    const muni = punto.municipio || inmediata?.municipality || "";
    const colonia = inmediata?.colonies?.[0];
    const seccionId = punto.seccionId ?? inmediata?.id;
    setDeteccion({ address: muni ? `Ubicación en ${muni}` : "Ubicando el punto…", sectionNum: inmediata?.section_num, sectionId: seccionId, municipality: muni, colony: colonia, postcode: "", gpsAccuracy: punto.precisionGps });
    setForm({
      ...vacio,
      title: colonia ? `Reporte en ${colonia}` : muni ? `Reporte en ${muni}` : "Nuevo reporte",
      address: `Coordenadas: ${punto.lat.toFixed(5)}, ${punto.lng.toFixed(5)}`,
      municipality: muni,
      sectionId: seccionId || ""
    });
    setUbicando(true);
    void (async () => {
      try {
        const res = await fetch(`/api/map/reverse-geocode?lat=${punto.lat}&lng=${punto.lng}`);
        if (!res.ok || !vigente) return;
        const data = await res.json();
        const m = punto.municipio || data.municipality || muni;
        const direccion = data.formattedAddress || data.address || (m ? `Ubicación en ${m}, Jalisco` : "Ubicación en Jalisco");
        setDeteccion({ address: direccion, sectionNum: data.sectionNum || inmediata?.section_num, sectionId: data.sectionId || seccionId, municipality: m, colony: data.colony || colonia, postcode: data.postalCode || data.postcode || "", gpsAccuracy: punto.precisionGps });
        setForm((prev) => ({ ...prev, address: direccion, municipality: m, sectionId: data.sectionId || seccionId || prev.sectionId }));
      } catch {
        // Sin geocodificación inversa se guarda igual: el servidor ubica el punto en su sección.
      } finally {
        if (vigente) setUbicando(false);
      }
    })();
    return () => {
      vigente = false;
    };
    // Solo al abrir con un punto nuevo: los polígonos pueden llegar después sin reiniciar el formulario.
  }, [p.punto]);

  if (!p.punto || !coords) return null;

  const cerrar = () => {
    if (!guardando) p.onCerrar();
  };

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!coords || guardando) return;
    setGuardando(true);
    setError(null);
    const cuerpo = {
      title: form.title.trim(),
      description: form.description.trim() ? `${form.description.trim()}\n\nDirección: ${form.address}` : form.address,
      latitude: coords.lat,
      longitude: coords.lng,
      category: form.category,
      municipality: form.municipality,
      sectionId: form.sectionId || deteccion?.sectionId || null,
      assignedToUserId: form.assignedToUserId || null,
      mediaUrls: form.mediaUrls,
      clientRequestId: clave
    };
    const r = await enviarOEncolar({ clave, tipo: "incidencia", url: "/api/map/reports", cuerpo, descripcion: `Incidencia: ${cuerpo.title || "sin título"}`, usuarioId: p.usuarioActualId });
    setGuardando(false);
    if (r.estado === "enviado" || r.estado === "encolado") {
      const texto = r.estado === "enviado" ? "Incidencia registrada." : TEXTO_DE_ESPERA[r.motivo];
      setClave(nuevaClave());
      setListo(texto);
      p.onGuardada(texto);
      setTimeout(() => p.onCerrar(), 1500);
      return;
    }
    // El motivo del servidor, junto al formulario: lo capturado se queda.
    setError(r.error);
  }

  const plantillas: Array<{ cat: string; icon: Icono; label: string; title: string }> = [
    { cat: "emergencia", icon: ShieldAlert, label: "Emergencia", title: "Emergencia en territorio" },
    { cat: "alumbrado", icon: Lightbulb, label: "Alumbrado", title: "Falla de luminaria / alumbrado público" },
    { cat: "bache", icon: Construction, label: "Bacheo", title: "Bacheo necesario en pavimento" },
    { cat: "fuga_agua", icon: Droplets, label: "Fuga de agua", title: "Fuga de agua potable" },
    { cat: "basura", icon: Trash2, label: "Basura", title: "Acumulación de basura o escombros" },
    { cat: "seguridad", icon: ShieldCheck, label: "Seguridad", title: "Solicitud de patrullaje / vigilancia" },
    { cat: "brigada", icon: Users, label: "Brigada", title: "Solicitud de apoyo con brigada" }
  ];

  const seccionesCargadas: any[] = p.secciones?.features ?? [];
  const opcionesSeccion = [
    // La sección del punto va primero aunque no esté cargada en el mapa: con GPS en otro municipio sus
    // secciones no se han descargado y el selector mostraba el identificador crudo.
    ...(deteccion?.sectionId && !seccionesCargadas.some((f) => f.properties?.id === deteccion.sectionId)
      ? [{ value: deteccion.sectionId, label: `Sección ${deteccion.sectionNum ?? "?"}`, sublabel: `${deteccion.municipality || "Sin municipio"} · detectada en el punto`, badge: "GPS" }]
      : []),
    ...seccionesCargadas.map((f) => ({ value: f.properties.id, label: `Sección ${f.properties.section_num}`, sublabel: f.properties.municipality || "Sin municipio", badge: `Sección ${f.properties.section_num}` }))
  ];

  return (
    <div className={FONDO} onClick={cerrar}>
      <div className={CAJA} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Registrar incidencia">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center"><AlertCircle size={18} /></div>
            <div>
              <h3 className="m-0 font-black text-[15px] text-slate-900">Registrar incidencia</h3>
              <div className="text-[10px] font-bold text-slate-500">Coordenadas: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</div>
            </div>
          </div>
          <button type="button" onClick={cerrar} className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer" aria-label="Cerrar">
            <X size={17} />
          </button>
        </div>

        {listo ? (
          <div className="text-center py-9 px-5 text-green-600">
            <CheckCircle2 size={42} className="mx-auto mb-2.5" />
            <div className="font-black text-[16px] text-slate-900">{listo}</div>
          </div>
        ) : (
          <form onSubmit={guardar} className="p-4 pb-10 flex flex-col gap-3 overflow-y-auto overscroll-contain flex-1">
            <div className={`rounded-xl p-2.5 border ${ubicando ? "bg-blue-50 border-blue-200" : "bg-green-50 border-green-200"}`}>
              {ubicando ? (
                <div className="flex items-center gap-2 text-blue-600 text-[11px] font-bold"><Loader2 size={15} className="animate-spin" /> Detectando dirección y sección electoral…</div>
              ) : (
                <div>
                  <div className="flex items-start gap-1.5">
                    <MapPin size={15} className="text-green-600 mt-0.5 shrink-0" />
                    <div className="text-[11px] font-extrabold text-slate-900 leading-snug">{form.address || "Ubicación en territorio"}</div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded inline-flex items-center gap-1"><Landmark size={10} /> {form.municipality || "Municipio por confirmar"}</span>
                    {/* Un GPS con 300 m de error no ubica una banqueta: se dice. */}
                    {typeof deteccion?.gpsAccuracy === "number" && deteccion.gpsAccuracy > 50 && (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded inline-flex items-center gap-1"><AlertTriangle size={10} /> GPS ±{Math.round(deteccion.gpsAccuracy)} m: confirma el punto</span>
                    )}
                    {/* Sin clic ni GPS, el punto es un centro (del mapa o de la sección): no es un lugar, y se dice. */}
                    {p.punto?.origen === "centro" && (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded inline-flex items-center gap-1"><AlertTriangle size={10} /> Punto aproximado: busca la dirección, o cierra y toca el lugar exacto</span>
                    )}
                    {deteccion?.sectionNum ? (
                      <span className="bg-green-100 text-green-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded border border-green-300">Sección {deteccion.sectionNum}</span>
                    ) : (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded inline-flex items-center gap-1"><AlertTriangle size={10} /> Elige la sección abajo</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <span className={ETIQUETA}>Plantillas rápidas</span>
              <div className="flex gap-1.5 flex-wrap">
                {plantillas.map((pl) => (
                  <button
                    key={pl.cat}
                    type="button"
                    onClick={() => {
                      const donde = deteccion?.colony ? ` en Col. ${deteccion.colony}` : form.municipality ? ` en ${form.municipality}` : "";
                      setForm((prev) => ({ ...prev, category: pl.cat, title: `${pl.title}${donde}` }));
                    }}
                    className={`px-2 py-1 rounded-md border text-[10px] font-bold flex items-center gap-1 cursor-pointer ${form.category === pl.cat ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}
                  >
                    <pl.icon size={12} /> {pl.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_0.8fr] gap-2">
              <AddressAutocomplete
                value={form.address}
                onChange={(val) => setForm((prev) => ({ ...prev, address: val }))}
                onSelect={(item: AutocompleteItem) => {
                  // Con un punto marcado (clic o GPS), la sugerencia solo escribe la dirección: la incidencia
                  // se queda donde se marcó, con la sección y el municipio de ese punto. Antes la movía a las
                  // coordenadas de la sugerencia —si era una colonia o una sección, a su centro—.
                  if (p.punto?.origen !== "centro") {
                    setForm((prev) => ({ ...prev, address: item.address || item.title }));
                    setDeteccion((d) => ({ ...d, address: item.address || item.title }));
                    return;
                  }
                  const m = item.municipality || form.municipality;
                  setForm((prev) => ({ ...prev, address: item.address || item.title, municipality: m, sectionId: item.sectionId || deteccion?.sectionId || prev.sectionId }));
                  setDeteccion((d) => ({ ...d, address: item.address || item.title, sectionNum: item.sectionNum || d?.sectionNum, sectionId: item.sectionId || d?.sectionId, municipality: m, colony: item.colony || d?.colony || "", postcode: item.postcode || "" }));
                  if (item.lat && item.lng) {
                    setCoords({ lat: item.lat, lng: item.lng });
                    p.onMoverMapa(item.lat, item.lng);
                  }
                }}
                municipality={form.municipality || TODO_JALISCO}
                label="Dirección / calle y número *"
                placeholder="Escribe calle o lugar..."
                required
              />
              <div>
                <label className={ETIQUETA} htmlFor="incidencia-colonia">Colonia / barrio</label>
                <input
                  id="incidencia-colonia"
                  placeholder="Ej. Loma Dorada, Centro..."
                  value={deteccion?.colony || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDeteccion((d) => ({ ...d, colony: val }));
                    // La colonia corregida tiene que quedar en el domicilio, que es lo que se guarda.
                    setForm((prev) => {
                      const dir = prev.address || "";
                      if (!dir) return prev;
                      if (/Col\.\s*[^,]+/i.test(dir)) return { ...prev, address: val ? dir.replace(/Col\.\s*[^,]+/i, `Col. ${val}`) : dir.replace(/,?\s*Col\.\s*[^,]+/i, "") };
                      if (!val) return prev;
                      const partes = dir.split(", ");
                      const corte = partes.findIndex((x) => /^CP \d/.test(x));
                      partes.splice(corte >= 0 ? corte : Math.max(partes.length - 1, 1), 0, `Col. ${val}`);
                      return { ...prev, address: partes.join(", ") };
                    });
                  }}
                  className={CAMPO}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <PredictiveCombobox label="Municipio" allowCustom={false} value={form.municipality} onChange={(val) => setForm({ ...form, municipality: val })} options={opcionesMunicipio} />
              <PredictiveCombobox
                label="Sección electoral"
                placeholder="Buscar sección…"
                allowCustom={false}
                value={form.sectionId || deteccion?.sectionId || ""}
                onChange={(val) => {
                  const f = seccionesCargadas.find((x) => x.properties?.id === val);
                  setForm((prev) => ({ ...prev, sectionId: val, municipality: f?.properties?.municipality || prev.municipality }));
                }}
                options={opcionesSeccion}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <PredictiveCombobox label="Categoría" required allowCustom={false} value={form.category} onChange={(val) => setForm({ ...form, category: val })} options={opcionesCategoria} />
              <PredictiveCombobox
                label="Asignar responsable"
                allowCustom={false}
                placeholder="Buscar persona…"
                value={form.assignedToUserId}
                onChange={(val) => setForm({ ...form, assignedToUserId: val })}
                options={p.usuarios.map((u) => ({ value: u.id, label: u.displayName, badge: "Persona" }))}
              />
            </div>

            <div>
              <label className={ETIQUETA} htmlFor="incidencia-titulo">Título del reporte *</label>
              <input id="incidencia-titulo" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej. Falla de alumbrado / bache en esquina" className={CAMPO} />
            </div>
            <div>
              <label className={ETIQUETA} htmlFor="incidencia-descripcion">Descripción de campo *</label>
              <textarea id="incidencia-descripcion" required rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Qué se observó, referencias físicas…" className={`${CAMPO} resize-none`} />
            </div>
            <MediaUploader value={form.mediaUrls} onChange={(files) => setForm((prev) => ({ ...prev, mediaUrls: files }))} label="Evidencia (foto o video)" helperText="Hasta 60 MB" />

            {error && <p role="alert" className="m-0 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-[12px] font-bold rounded-lg">{error} Tus datos siguen aquí.</p>}

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={cerrar} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-[12px] font-bold cursor-pointer">Cancelar</button>
              <button type="submit" disabled={guardando || ubicando} className="flex-[1.5] py-2.5 bg-red-600 text-white rounded-lg text-[12px] font-extrabold cursor-pointer disabled:opacity-60">
                {guardando ? "Guardando…" : "Registrar incidencia"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/** Editar o reasignar una incidencia. Los estados salen del catálogo, no de una lista escrita aquí. */
export function ModalEditarIncidencia(p: { reporte: ReportFeature | null; usuarios: UserOption[]; onCerrar: () => void; onGuardada: () => void }) {
  const [form, setForm] = useState({ title: "", description: "", category: "servicios", municipality: "", status: "active", assignedToUserId: "" });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const r = p.reporte;
    if (!r) return;
    setForm({ title: r.properties.title, description: r.properties.description, category: r.properties.category, municipality: r.properties.municipality || "", status: r.properties.status, assignedToUserId: r.properties.assignedToUserId || "" });
    setError(null);
  }, [p.reporte]);

  if (!p.reporte) return null;
  const id = p.reporte.properties.id;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch(`/api/map/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, assignedToUserId: form.assignedToUserId || null })
      });
      const datos = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(datos.error || "No se pudo guardar.");
        return;
      }
      p.onGuardada();
    } catch {
      setError("Sin conexión. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  const opcionesEstado = Object.entries(ESTADOS_INCIDENCIA)
    .filter(([clave]) => clave !== "cancelada")
    .map(([clave, e]) => ({ value: clave, label: e.label, badge: e.cerrada ? "Cerrada" : "Abierta" }));

  return (
    <div className={FONDO} onClick={() => !guardando && p.onCerrar()}>
      <div className={CAJA} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Editar incidencia">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 bg-slate-50 shrink-0">
          <h3 className="m-0 font-black text-[15px] text-slate-900">Editar incidencia</h3>
          <button type="button" onClick={p.onCerrar} className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer" aria-label="Cerrar"><X size={18} /></button>
        </div>
        <form onSubmit={guardar} className="p-4 pb-10 flex flex-col gap-3 overflow-y-auto overscroll-contain flex-1">
          <div>
            <label className={ETIQUETA} htmlFor="editar-titulo">Título *</label>
            <input id="editar-titulo" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={CAMPO} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <PredictiveCombobox label="Municipio" required allowCustom={false} value={form.municipality} onChange={(val) => setForm({ ...form, municipality: val })} options={opcionesMunicipio} />
            <PredictiveCombobox label="Categoría" required allowCustom={false} value={form.category} onChange={(val) => setForm({ ...form, category: val })} options={opcionesCategoria} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <PredictiveCombobox label="Estado" required allowCustom={false} value={form.status} onChange={(val) => setForm({ ...form, status: val })} options={opcionesEstado} />
            <PredictiveCombobox label="Responsable" allowCustom={false} placeholder="Buscar persona…" value={form.assignedToUserId} onChange={(val) => setForm({ ...form, assignedToUserId: val })} options={p.usuarios.map((u) => ({ value: u.id, label: u.displayName, badge: "Persona" }))} />
          </div>
          <div>
            <label className={ETIQUETA} htmlFor="editar-descripcion">Descripción / seguimiento *</label>
            <textarea id="editar-descripcion" required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${CAMPO} resize-none`} />
          </div>
          {error && <p role="alert" className="m-0 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-[12px] font-bold rounded-lg">{error}</p>}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={p.onCerrar} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-[12px] font-bold cursor-pointer">Cancelar</button>
            <button type="submit" disabled={guardando} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-[12px] font-extrabold cursor-pointer disabled:opacity-60">{guardando ? "Guardando…" : "Guardar cambios"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Archivar lo resuelto. Antes «Purgar» lo BORRABA, actividades de la bitácora incluidas (D16). */
export function ModalArchivarResueltas(p: { abierto: boolean; ocupado: boolean; onCerrar: () => void; onConfirmar: () => void }) {
  if (!p.abierto) return null;
  return (
    <div className={FONDO} onClick={p.onCerrar}>
      <div className="bg-white rounded-2xl w-full max-w-[380px] p-5 text-center shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Archivar incidencias resueltas">
        <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center mx-auto mb-2.5"><Archive size={22} /></div>
        <h3 className="m-0 mb-1 text-[16px] font-black text-slate-900">¿Archivar las incidencias resueltas?</h3>
        <p className="m-0 mb-3.5 text-[12px] text-slate-500 leading-snug">
          Salen del mapa y de la bandeja, y quedan en Incidencias → Historial como archivadas. No se borra nada. Las
          actividades de la bitácora no se tocan.
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={p.onCerrar} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg text-[12px] font-bold cursor-pointer">Cancelar</button>
          <button type="button" onClick={p.onConfirmar} disabled={p.ocupado} className="flex-1 py-2 bg-slate-900 text-white rounded-lg text-[12px] font-extrabold cursor-pointer disabled:opacity-60">{p.ocupado ? "Archivando…" : "Sí, archivar"}</button>
        </div>
      </div>
    </div>
  );
}
