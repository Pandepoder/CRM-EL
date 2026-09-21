"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, CheckCircle2, ExternalLink, History, Loader2, MapPin, X } from "lucide-react";

import { aValorLocal, CLAVES_RESULTADO, proximaHoraLocal, RESULTADOS_ACTIVIDAD } from "@/lib/actividades";
import type { ActividadItem, OpcionSelector } from "@/lib/bitacora-tipos";
import { LocationPicker } from "@/components/LocationPicker";
import { MediaUploader, type MediaFile } from "@/components/MediaUploader";
import { useMunicipioUsuario } from "@/lib/municipio-contexto";

import { llamar } from "./api";
import { buscarCatalogo, buscarContactos, buscarSecciones, crearEnCatalogo } from "./buscadores";
import { SelectorBuscable } from "./SelectorBuscable";

export type UsuarioOpcion = { id: string; displayName: string };

type Campo = "tipo" | "title" | "fecha" | "responsable" | "ubicacion" | "contacto" | "asistentes" | "etiquetas" | "resultado" | "conclusion" | "general";

/** A qué campo pertenece cada código de error del servidor. */
const CAMPO_DE_CODIGO: Record<string, Campo> = {
  tipo_invalido: "tipo", titulo_requerido: "title", titulo_largo: "title", fecha_invalida: "fecha",
  fecha_futura: "fecha", ubicacion_requerida: "ubicacion", asistentes_invalidos: "asistentes",
  contacto_no_encontrado: "contacto", fuera_de_alcance: "responsable", etiqueta_invalida: "etiquetas",
  demasiadas_etiquetas: "etiquetas", resultado_requerido: "resultado", conclusion_requerida: "conclusion"
};

type Estado = {
  modo: "programar" | "registrar";
  tipo: OpcionSelector[];
  titulo: string;
  tituloEditado: boolean;
  fecha: string;
  responsableId: string;
  latitude: number | null;
  longitude: number | null;
  locationText: string;
  municipality: string;
  sectionId: string;
  seccion: OpcionSelector[];
  contacto: OpcionSelector[];
  asistentes: string;
  etiquetas: OpcionSelector[];
  descripcion: string;
  media: MediaFile[];
  outcome: string;
  conclusion: string;
};

function estadoInicial(responsableId: string, modo: "programar" | "registrar" = "programar"): Estado {
  return {
    modo,
    tipo: [],
    titulo: "",
    tituloEditado: false,
    fecha: modo === "registrar" ? aValorLocal(new Date()) : proximaHoraLocal(60),
    responsableId,
    latitude: null,
    longitude: null,
    locationText: "",
    municipality: "",
    sectionId: "",
    seccion: [],
    contacto: [],
    asistentes: "",
    etiquetas: [],
    descripcion: "",
    media: [],
    outcome: "successful",
    conclusion: ""
  };
}

const clase = (invalido: boolean) =>
  `w-full p-2.5 bg-white border rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none ${invalido ? "border-red-400" : "border-gray-200"}`;
const etiquetaClase = "block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1";

export function FormularioActividad({
  abierto, onCerrar, onGuardada, usuarios, usuarioActualId, puedeAsignar, esAdmin, plantilla = null
}: {
  abierto: boolean;
  /** Actividad de la que se parte al «duplicar como nueva». No se copia su resultado ni su fecha. */
  plantilla?: ActividadItem | null;
  onCerrar: () => void;
  /** Se llama tras guardar; recibe si hay que volver a abrir un formulario en blanco. */
  onGuardada: (mensaje: string) => void;
  usuarios: UsuarioOpcion[];
  usuarioActualId: string;
  puedeAsignar: boolean;
  esAdmin: boolean;
}) {
  const municipioUsuario = useMunicipioUsuario();
  const [f, setF] = useState<Estado>(() => estadoInicial(usuarioActualId));
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({});
  const [guardando, setGuardando] = useState(false);
  const [mostrarMapa, setMostrarMapa] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  // Se genera al abrir el formulario y solo cambia tras un guardado: un doble clic o un reintento
  // tras un corte de red llega con la misma clave y el servidor devuelve la actividad ya creada.
  const claveSolicitud = useRef(crypto.randomUUID());
  const primerError = useRef<HTMLDivElement>(null);
  const formulario = useRef<HTMLFormElement>(null);
  const [agregarOtra, setAgregarOtra] = useState(false);

  useEffect(() => {
    if (abierto) {
      const base = estadoInicial(usuarioActualId);
      if (plantilla) {
        base.tipo = plantilla.tipo ? [{ id: plantilla.tipo.id, nombre: plantilla.tipo.nombre, creaVisita: plantilla.tipo.clave === "visita" }] : [];
        base.titulo = plantilla.title;
        base.tituloEditado = true;
        base.responsableId = plantilla.assignedUserId ?? usuarioActualId;
        base.latitude = plantilla.latitude;
        base.longitude = plantilla.longitude;
        base.locationText = plantilla.locationText ?? "";
        base.municipality = plantilla.municipality ?? "";
        base.sectionId = plantilla.sectionId ?? "";
        base.contacto = plantilla.contactId && plantilla.contactName ? [{ id: plantilla.contactId, nombre: plantilla.contactName }] : [];
        base.etiquetas = plantilla.etiquetas.map((t) => ({ id: t.id, nombre: t.name }));
        base.asistentes = plantilla.estimatedAttendees?.toString() ?? "";
      }
      setF(base);
      setErrores({});
      setMensaje(null);
      setMostrarMapa(false);
      claveSolicitud.current = crypto.randomUUID();
    }
  }, [abierto, usuarioActualId, plantilla]);

  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => { if (e.key === "Escape" && !guardando) onCerrar(); };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [abierto, guardando, onCerrar]);

  useEffect(() => {
    if (Object.keys(errores).length === 0) return;
    // El foco va al primer campo inválido; si el error es general, a su aviso.
    const campo = formulario.current?.querySelector<HTMLElement>("[aria-invalid=\"true\"]");
    (campo ?? primerError.current)?.focus();
  }, [errores]);

  const tipo = f.tipo[0];
  const creaVisita = Boolean(tipo?.creaVisita && f.contacto[0] && f.modo === "programar");
  // El título sugerido sigue al tipo (y al contacto) mientras la persona no haya escrito el suyo.
  const tituloSugerido = useMemo(() => {
    if (!tipo) return "";
    const c = f.contacto[0];
    return c && tipo.creaVisita ? `${tipo.nombre}: ${c.nombre}` : tipo.nombre;
  }, [tipo, f.contacto]);
  const titulo = f.tituloEditado ? f.titulo : tituloSugerido;

  function poner<K extends keyof Estado>(k: K, v: Estado[K], campo?: Campo) {
    setF((prev) => ({ ...prev, [k]: v }));
    if (campo) setErrores((e) => { const { [campo]: _quitado, ...resto } = e; return resto; });
  }

  function validar(): Partial<Record<Campo, string>> {
    const e: Partial<Record<Campo, string>> = {};
    if (!tipo) e.tipo = "Elige un tipo de actividad, o crea uno escribiendo su nombre.";
    if (!titulo.trim()) e.title = "Escribe un título.";
    if (!f.fecha) e.fecha = "Indica la fecha y hora.";
    else if (f.modo === "registrar" && new Date(f.fecha).getTime() > Date.now() + 5 * 60_000) {
      e.fecha = "Lo que ya ocurrió no puede tener fecha futura. Cambia a «Programar».";
    }
    if (f.latitude === null || f.longitude === null) e.ubicacion = "Marca el punto en el mapa o usa el GPS: sin él la actividad no se puede ubicar.";
    if (f.asistentes && (!/^\d+$/.test(f.asistentes))) e.asistentes = "Usa un número entero, cero o más.";
    if (f.modo === "registrar") {
      if (!f.conclusion.trim()) e.conclusion = "Cuenta qué pasó: es obligatorio al registrar algo que ya ocurrió.";
    }
    return e;
  }

  async function guardar(otra: boolean) {
    if (guardando) return;
    const e = validar();
    setErrores(e);
    if (Object.keys(e).length > 0) return;

    setGuardando(true);
    setAgregarOtra(otra);
    const r = await llamar<{ task: { id: string }; duplicada: boolean; avisos: string[] }>("/api/equipo/tareas", {
      cuerpo: {
        title: titulo.trim(),
        description: f.descripcion.trim() || undefined,
        assignedToUserId: f.responsableId || undefined,
        scheduledAt: new Date(f.fecha).toISOString(),
        activityTypeId: tipo!.id,
        tagIds: f.etiquetas.map((t) => t.id),
        sectionId: f.seccion[0]?.id || f.sectionId || undefined,
        contactId: f.contacto[0]?.id || undefined,
        locationText: f.locationText.trim() || undefined,
        estimatedAttendees: f.asistentes ? Number(f.asistentes) : null,
        latitude: f.latitude,
        longitude: f.longitude,
        municipality: f.municipality || undefined,
        mediaUrls: f.media,
        clientRequestId: claveSolicitud.current,
        modo: f.modo,
        resultado: f.modo === "registrar" ? { outcome: f.outcome, summary: f.conclusion.trim() } : undefined
      }
    });
    setGuardando(false);

    if (!r.ok) {
      // Todo lo capturado se conserva: solo se marca el campo que falló.
      const campo = (r.codigo && CAMPO_DE_CODIGO[r.codigo]) || "general";
      setErrores({ [campo]: r.error });
      return;
    }

    const avisos = r.datos.avisos ?? [];
    const texto = avisos.length ? avisos.join(" ") : r.datos.duplicada ? "Esa actividad ya estaba guardada." : "Actividad guardada.";
    if (otra) {
      // Se conserva el contexto útil para la siguiente (responsable, día, mapa) y se limpia lo demás.
      claveSolicitud.current = crypto.randomUUID();
      setF((prev) => ({
        ...estadoInicial(prev.responsableId, prev.modo),
        latitude: prev.latitude, longitude: prev.longitude, municipality: prev.municipality,
        locationText: prev.locationText, sectionId: prev.sectionId, seccion: prev.seccion,
        fecha: prev.fecha
      }));
      setMensaje(texto);
      setErrores({});
      onGuardada(texto);
    } else {
      onGuardada(texto);
      onCerrar();
    }
  }

  if (!abierto) return null;

  const err = (c: Campo) => errores[c];

  return (
    <div className="fixed inset-0 z-[110] bg-black/50 flex items-end sm:items-center justify-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !guardando) onCerrar(); }}>
      <form
        ref={formulario}
        role="dialog" aria-modal="true" aria-labelledby="titulo-formulario"
        noValidate
        onSubmit={(e) => { e.preventDefault(); void guardar(false); }}
        className="bg-white w-full sm:max-w-2xl max-h-[94dvh] flex flex-col rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white shrink-0">
          <div>
            <h2 id="titulo-formulario" className="text-base font-extrabold">{f.modo === "programar" ? "Programar actividad" : "Registrar lo que ya ocurrió"}</h2>
            <p className="text-[11px] text-blue-100">Lo esencial arriba; el resto, en «Más detalles».</p>
          </div>
          <button type="button" onClick={onCerrar} disabled={guardando} aria-label="Cerrar" className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
          {/* Modo */}
          <div role="radiogroup" aria-label="Qué vas a hacer" className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
            {([["programar", "Programar", CalendarClock], ["registrar", "Ya ocurrió", History]] as const).map(([valor, texto, Icono]) => (
              <button key={valor} type="button" role="radio" aria-checked={f.modo === valor}
                onClick={() => setF((prev) => ({ ...prev, modo: valor, fecha: valor === "registrar" ? aValorLocal(new Date()) : proximaHoraLocal(60) }))}
                className={`py-2 rounded-lg text-sm font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer ${f.modo === valor ? "bg-white text-blue-900 shadow" : "text-gray-600"}`}>
                <Icono size={14} aria-hidden="true" /> {texto}
              </button>
            ))}
          </div>

          {err("general") && <div ref={primerError} tabIndex={-1} role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm font-bold text-red-700">{err("general")}</div>}
          {mensaje && <div role="status" className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm font-bold text-emerald-800 flex items-center gap-2"><CheckCircle2 size={16} /> {mensaje} Puedes capturar otra.</div>}

          {/* Principal */}
          <SelectorBuscable
            etiqueta="Tipo de actividad" requerido
            valor={f.tipo}
            onCambiar={(v) => poner("tipo", v, "tipo")}
            buscar={buscarCatalogo("type")}
            crear={crearEnCatalogo("type", "tipo", esAdmin)}
            placeholder="Busca un tipo o escribe uno nuevo…"
            error={err("tipo")}
            ayuda={tipo?.creaVisita ? "Este tipo, con un contacto, agenda también su visita." : undefined}
          />

          <div>
            <label htmlFor="af-titulo" className={etiquetaClase}>Título <span aria-hidden="true">*</span></label>
            <input id="af-titulo" value={titulo} placeholder={tituloSugerido || "Ej. Plática con vecinos de la colonia…"} maxLength={200}
              aria-invalid={err("title") ? true : undefined} aria-describedby={err("title") ? "af-titulo-error" : undefined}
              onChange={(e) => { setF((prev) => ({ ...prev, titulo: e.target.value, tituloEditado: e.target.value !== "" })); setErrores((x) => { const { title: _t, ...r } = x; return r; }); }}
              className={clase(Boolean(err("title")))} />
            {err("title") && <p id="af-titulo-error" role="alert" className="mt-1 text-xs font-bold text-red-600">{err("title")}</p>}
            {!f.tituloEditado && tituloSugerido && <p className="mt-1 text-[11px] text-gray-500">Título sugerido; escribe el tuyo para cambiarlo.</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="af-fecha" className={etiquetaClase}>{f.modo === "programar" ? "Fecha y hora" : "Cuándo ocurrió"} <span aria-hidden="true">*</span></label>
              <input id="af-fecha" type="datetime-local" value={f.fecha} max={f.modo === "registrar" ? aValorLocal(new Date()) : undefined}
                aria-invalid={err("fecha") ? true : undefined} aria-describedby={err("fecha") ? "af-fecha-error" : undefined}
                onChange={(e) => poner("fecha", e.target.value, "fecha")} className={clase(Boolean(err("fecha")))} />
              {err("fecha") && <p id="af-fecha-error" role="alert" className="mt-1 text-xs font-bold text-red-600">{err("fecha")}</p>}
            </div>
            {puedeAsignar && (
              <div>
                <label htmlFor="af-resp" className={etiquetaClase}>Responsable</label>
                <select id="af-resp" value={f.responsableId} onChange={(e) => poner("responsableId", e.target.value, "responsable")} className={clase(Boolean(err("responsable")))}>
                  {usuarios.map((u) => <option key={u.id} value={u.id}>{u.id === usuarioActualId ? `${u.displayName} (tú)` : u.displayName}</option>)}
                </select>
                {err("responsable") && <p role="alert" className="mt-1 text-xs font-bold text-red-600">{err("responsable")}</p>}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="af-lugar" className={etiquetaClase + " mb-0"}>Ubicación <span aria-hidden="true">*</span></label>
              <button type="button" onClick={() => setMostrarMapa((v) => !v)} className="text-xs font-extrabold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 cursor-pointer">
                <MapPin size={12} aria-hidden="true" /> {mostrarMapa ? "Ocultar mapa" : f.latitude !== null ? "Cambiar en el mapa" : "Fijar en el mapa"}
              </button>
            </div>
            <input id="af-lugar" aria-invalid={err("ubicacion") ? true : undefined} value={f.locationText} placeholder="Domicilio o lugar (opcional): calle, comité, plaza…" maxLength={240}
              onChange={(e) => poner("locationText", e.target.value)} className={clase(false)} />
            {f.latitude !== null && !mostrarMapa && <p className="mt-1 text-[11px] font-semibold text-emerald-700">Punto marcado en el mapa{f.municipality ? ` · ${f.municipality}` : ""}.</p>}
            {err("ubicacion") && <p role="alert" className="mt-1 text-xs font-bold text-red-600">{err("ubicacion")}</p>}
            {mostrarMapa && (
              <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-2xl">
                <LocationPicker
                  label="Punto en el mapa"
                  helperText="Escribe el domicilio, toca el mapa o usa tu GPS."
                  defaultMunicipality={f.municipality || municipioUsuario || undefined}
                  value={{ latitude: f.latitude, longitude: f.longitude, address: f.locationText, locationText: f.locationText, municipality: f.municipality, sectionId: f.sectionId }}
                  onChange={(loc) => {
                    setF((prev) => ({
                      ...prev,
                      latitude: loc.latitude ?? prev.latitude,
                      longitude: loc.longitude ?? prev.longitude,
                      locationText: loc.address || loc.locationText || prev.locationText,
                      municipality: loc.municipality || prev.municipality,
                      sectionId: loc.sectionId || prev.sectionId
                    }));
                    setErrores((x) => { const { ubicacion: _u, ...r } = x; return r; });
                  }}
                />
              </div>
            )}
          </div>

          {/* Resultado, solo si ya ocurrió */}
          {f.modo === "registrar" && (
            <fieldset className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
              <legend className="px-1 text-xs font-extrabold uppercase tracking-wider text-emerald-800">Cómo salió</legend>
              <div>
                <label htmlFor="af-resultado" className={etiquetaClase}>Resultado <span aria-hidden="true">*</span></label>
                <select id="af-resultado" value={f.outcome} onChange={(e) => poner("outcome", e.target.value, "resultado")} className={clase(Boolean(err("resultado")))}>
                  {CLAVES_RESULTADO.map((k) => <option key={k} value={k}>{RESULTADOS_ACTIVIDAD[k]!.label}</option>)}
                </select>
                <p className="mt-1 text-[11px] text-gray-600">{RESULTADOS_ACTIVIDAD[f.outcome]?.ayuda}</p>
                {err("resultado") && <p role="alert" className="mt-1 text-xs font-bold text-red-600">{err("resultado")}</p>}
              </div>
              <div>
                <label htmlFor="af-conclusion" className={etiquetaClase}>Conclusión <span aria-hidden="true">*</span></label>
                <textarea id="af-conclusion" rows={3} value={f.conclusion} maxLength={4000} placeholder="Qué pasó, cuántas personas asistieron, qué se acordó…"
                  aria-invalid={err("conclusion") ? true : undefined}
                  onChange={(e) => poner("conclusion", e.target.value, "conclusion")} className={clase(Boolean(err("conclusion"))) + " resize-none"} />
                {err("conclusion") && <p role="alert" className="mt-1 text-xs font-bold text-red-600">{err("conclusion")}</p>}
              </div>
              {RESULTADOS_ACTIVIDAD[f.outcome]?.requiereSeguimiento && (
                <p className="text-[11px] font-semibold text-amber-800">Al guardar podrás dejar el seguimiento desde la ficha de la actividad.</p>
              )}
            </fieldset>
          )}

          {/* Detalles */}
          <details className="group rounded-2xl border border-gray-200">
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-extrabold text-gray-800 list-none flex items-center justify-between">
              Más detalles <span className="text-xs font-semibold text-gray-500">contacto, sección, asistentes, etiquetas, notas y evidencias</span>
            </summary>
            <div className="px-4 pb-4 pt-1 space-y-4">
              <div>
                <SelectorBuscable
                  etiqueta="Contacto vinculado" valor={f.contacto} onCambiar={(v) => poner("contacto", v, "contacto")}
                  buscar={buscarContactos} placeholder="Busca entre todos tus contactos…" error={err("contacto")}
                  vacio="No hay contactos con ese nombre."
                  ayuda={creaVisita ? "Se agendará también su visita, que aparecerá en su ficha." : tipo?.creaVisita ? undefined : "Vincula a la persona con la que trabajaste."}
                />
                <a href="/crm/nuevo" target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] font-extrabold text-blue-700 hover:underline">
                  ¿No está? Registrar contacto nuevo <ExternalLink size={11} aria-hidden="true" />
                </a>
                <span className="text-[11px] text-gray-500"> (se abre aparte; tu captura se conserva).</span>
              </div>
              <SelectorBuscable
                etiqueta="Sección electoral" valor={f.seccion} onCambiar={(v) => poner("seccion", v)}
                buscar={buscarSecciones} placeholder="Número de sección…" vacio="No hay secciones con ese número."
                ayuda="Es un catálogo oficial: se elige, no se crea."
              />
              <div>
                <label htmlFor="af-asist" className={etiquetaClase}>Asistentes estimados</label>
                <input id="af-asist" inputMode="numeric" value={f.asistentes} placeholder="Ej. 15"
                  aria-invalid={err("asistentes") ? true : undefined}
                  onChange={(e) => poner("asistentes", e.target.value, "asistentes")} className={clase(Boolean(err("asistentes")))} />
                {err("asistentes") && <p role="alert" className="mt-1 text-xs font-bold text-red-600">{err("asistentes")}</p>}
              </div>
              <SelectorBuscable
                etiqueta="Etiquetas" multiple valor={f.etiquetas} onCambiar={(v) => poner("etiquetas", v, "etiquetas")}
                buscar={buscarCatalogo("tag")} crear={crearEnCatalogo("tag", "etiqueta", esAdmin)}
                placeholder="Busca o crea una etiqueta…" error={err("etiquetas")}
              />
              <div>
                <label htmlFor="af-notas" className={etiquetaClase}>Notas</label>
                <textarea id="af-notas" rows={2} value={f.descripcion} onChange={(e) => poner("descripcion", e.target.value)} placeholder="Temas a tratar, material requerido, acuerdos previos…" className={clase(false) + " resize-none"} />
              </div>
              <MediaUploader value={f.media} onChange={(files) => poner("media", files)} label="Evidencias" helperText="Fotos o video de la actividad (hasta 60 MB)" />
            </div>
          </details>
        </div>

        {/* Acciones siempre visibles, también en móvil */}
        <div className="shrink-0 border-t border-gray-100 bg-white px-5 py-3 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button type="button" onClick={onCerrar} disabled={guardando} className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold cursor-pointer">Cancelar</button>
          <button type="button" onClick={() => void guardar(true)} disabled={guardando} className="px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-sm font-extrabold cursor-pointer inline-flex items-center justify-center gap-2">
            {guardando && agregarOtra && <Loader2 size={14} className="animate-spin" />} Guardar y agregar otra
          </button>
          <button type="submit" disabled={guardando} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-extrabold shadow-md cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-70">
            {guardando && !agregarOtra && <Loader2 size={14} className="animate-spin" />} {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
