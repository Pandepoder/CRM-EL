"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Archive, ArchiveRestore, CalendarClock, CheckCircle2, Copy, GitBranchPlus, Loader2, MapPin, MessageSquarePlus,
  Pencil, Play, Trash2, User, Users, X, XCircle
} from "lucide-react";

import { CLAVES_RESULTADO, proximaHoraLocal, RESULTADOS_ACTIVIDAD } from "@/lib/actividades";
import type { ActividadItem, OpcionSelector } from "@/lib/bitacora-tipos";
import { MediaGallery } from "@/components/MediaGallery";
import { MediaUploader, type MediaFile } from "@/components/MediaUploader";

import { llamar } from "./api";
import { buscarCatalogo, crearEnCatalogo } from "./buscadores";
import type { UsuarioOpcion } from "./FormularioActividad";
import { EtiquetaEstado, formatearFechaHora, InsigniaTipo } from "./presentacion";
import { SelectorBuscable } from "./SelectorBuscable";

type Evento = {
  id: string;
  kind: string;
  note: string | null;
  data: Record<string, unknown> | null;
  createdAt: string;
  actorName: string | null;
};

type Detalle = {
  actividad: ActividadItem;
  historial: Evento[];
  etiquetas: Array<{ id: string; name: string }>;
  seguimientos: Array<{ id: string; title: string; status: string; scheduledAt: string | null }>;
};

const TEXTO_EVENTO: Record<string, string> = {
  created: "Creó la actividad", edited: "Editó la actividad", note: "Agregó una nota", rescheduled: "Reprogramó",
  reassigned: "Reasignó", completed: "Completó la actividad", cancelled: "Canceló la actividad",
  follow_up_created: "Creó un seguimiento", archived: "Archivó la actividad", restored: "Restauró la actividad"
};

type Accion = "completar" | "reprogramar" | "cancelar" | "seguimiento" | "editar" | "nota" | "borrar" | null;

const campoClase = "w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none";
const etiquetaClase = "block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1";

function describirEvento(e: Evento): string {
  const d = e.data ?? {};
  if (e.kind === "rescheduled" && typeof d.a === "string") {
    return `${e.note ? `${e.note} · ` : ""}${typeof d.de === "string" ? `de ${formatearFechaHora(d.de)} ` : ""}a ${formatearFechaHora(d.a)}`;
  }
  if (e.kind === "completed" && typeof d.outcome === "string") {
    return `${RESULTADOS_ACTIVIDAD[d.outcome]?.label ?? d.outcome}${e.note ? ` — ${e.note}` : ""}`;
  }
  return e.note ?? "";
}

export function FichaActividad({
  id, onCerrar, onCambio, onDuplicar, usuarios, usuarioActualId, esAdmin
}: {
  id: string;
  onCerrar: () => void;
  /** Avisa que algo cambió, para refrescar el listado detrás de la ficha. */
  onCambio: () => void;
  onDuplicar: (a: ActividadItem) => void;
  usuarios: UsuarioOpcion[];
  usuarioActualId: string;
  esAdmin: boolean;
}) {
  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [accion, setAccion] = useState<Accion>(null);
  const [ocupado, setOcupado] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const contenedor = useRef<HTMLDivElement>(null);

  // Campos de los paneles de acción
  const [outcome, setOutcome] = useState("successful");
  const [texto, setTexto] = useState("");
  const [fecha, setFecha] = useState(proximaHoraLocal(60));
  const [responsable, setResponsable] = useState(usuarioActualId);
  const [tituloSeg, setTituloSeg] = useState("");
  const [edit, setEdit] = useState({ title: "", description: "", locationText: "", asistentes: "" });
  const [editTipo, setEditTipo] = useState<OpcionSelector[]>([]);
  const [editTags, setEditTags] = useState<OpcionSelector[]>([]);
  const [editMedia, setEditMedia] = useState<MediaFile[]>([]);

  const cargar = useCallback(async () => {
    const r = await llamar<Detalle>(`/api/equipo/tareas/${id}`);
    if (!r.ok) { setErrorCarga(r.error); return; }
    setErrorCarga(null);
    setDetalle(r.datos);
  }, [id]);

  useEffect(() => { setDetalle(null); setAccion(null); setMensaje(null); void cargar(); }, [cargar]);
  useEffect(() => { contenedor.current?.focus(); }, []);
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => { if (e.key === "Escape" && !ocupado) onCerrar(); };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [ocupado, onCerrar]);

  // Un error de validación deja de mostrarse en cuanto la persona corrige algo.
  useEffect(() => { setErrorAccion(null); }, [texto, outcome, fecha, tituloSeg]);

  const a = detalle?.actividad;
  const abierta = a ? a.estado === "programada" || a.estado === "en_curso" || a.estado === "vencida" : false;
  const cerrada = a ? a.estado === "completada" || a.estado === "cancelada" : false;
  const esVisitaSuelta = a?.origen === "visita";

  function abrirAccion(x: Exclude<Accion, null>) {
    setErrorAccion(null);
    setMensaje(null);
    setTexto("");
    setOutcome("successful");
    setFecha(proximaHoraLocal(x === "seguimiento" ? 60 * 24 * 3 : 60));
    setTituloSeg("");
    setResponsable(a?.assignedUserId ?? usuarioActualId);
    if (x === "editar" && a && detalle) {
      setEdit({ title: a.title, description: a.description, locationText: a.locationText ?? "", asistentes: a.estimatedAttendees?.toString() ?? "" });
      setEditTipo(a.tipo ? [{ id: a.tipo.id, nombre: a.tipo.nombre }] : []);
      setEditTags(detalle.etiquetas.map((t) => ({ id: t.id, nombre: t.name })));
      setEditMedia(a.mediaUrls as unknown as MediaFile[]);
    }
    setAccion(x);
  }

  async function ejecutar(cuerpo: Record<string, unknown>, textoExito: string, cerrarAlTerminar = true) {
    setOcupado(true);
    setErrorAccion(null);
    const r = await llamar<{ avisos?: string[] }>(`/api/equipo/tareas/${id}`, { method: "PATCH", cuerpo });
    setOcupado(false);
    if (!r.ok) { setErrorAccion(r.error); return false; }
    const avisos = r.datos.avisos?.length ? ` ${r.datos.avisos.join(" ")}` : "";
    setMensaje(`${textoExito}${avisos}`);
    if (cerrarAlTerminar) setAccion(null);
    await cargar();
    onCambio();
    return true;
  }

  async function completar() {
    if (!a) return;
    if (!texto.trim()) { setErrorAccion("Escribe la conclusión: es obligatoria."); return; }
    const requiere = RESULTADOS_ACTIVIDAD[outcome]?.requiereSeguimiento;

    if (esVisitaSuelta) {
      setOcupado(true); setErrorAccion(null);
      const r = await llamar(`/api/crm/contacts/${a.contactId}/visits/${a.id}/complete`, { cuerpo: { structuredOutcome: outcome, summary: texto.trim() } });
      setOcupado(false);
      if (!r.ok) { setErrorAccion(r.error); return; }
      setMensaje("Visita completada."); setAccion(null); await cargar(); onCambio();
      return;
    }
    if (requiere && !fecha) { setErrorAccion("Este resultado requiere seguimiento: indica cuándo."); return; }
    await ejecutar(
      {
        accion: "completar", outcome, summary: texto.trim(),
        ...(requiere ? { seguimiento: { scheduledAt: new Date(fecha).toISOString(), assignedToUserId: responsable || null, title: tituloSeg.trim() || undefined } } : {})
      },
      requiere ? "Actividad completada y seguimiento creado." : "Actividad completada."
    );
  }

  if (errorCarga) {
    return (
      <Envoltorio onCerrar={onCerrar} contenedor={contenedor}>
        <div className="p-6 text-sm font-bold text-red-700" role="alert">{errorCarga}</div>
      </Envoltorio>
    );
  }
  if (!a || !detalle) {
    return (
      <Envoltorio onCerrar={onCerrar} contenedor={contenedor}>
        <div className="p-10 flex items-center justify-center text-gray-500 gap-2" role="status"><Loader2 className="animate-spin" size={16} /> Cargando actividad…</div>
      </Envoltorio>
    );
  }

  const puedeActuar = a.puedeActuar;
  const requiereSeg = RESULTADOS_ACTIVIDAD[outcome]?.requiereSeguimiento;

  return (
    <Envoltorio onCerrar={onCerrar} contenedor={contenedor} titulo={a.title}>
      <div className="px-5 pt-4 pb-3 border-b border-gray-100 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <EtiquetaEstado estado={a.estado} />
          {a.tipo ? <InsigniaTipo nombre={a.tipo.nombre} color={a.tipo.color} /> : <span className="text-[11px] font-bold text-gray-500 border border-gray-200 rounded-lg px-2.5 py-0.5">Sin tipo (registro anterior)</span>}
          {a.tieneSeguimiento && <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-0.5">Con seguimiento</span>}
          {a.etiquetas.map((t) => <span key={t.id} className="text-[11px] font-bold text-gray-700 bg-gray-100 rounded-lg px-2 py-0.5">#{t.name}</span>)}
        </div>
      </div>

      <div className="px-5 py-4 space-y-5 overflow-y-auto">
        {mensaje && <div role="status" className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm font-bold text-emerald-800 flex items-start gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0" /> {mensaje}</div>}

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Dato icono={<CalendarClock size={14} />} etiqueta="Fecha programada" valor={formatearFechaHora(a.scheduledAt)} />
          <Dato icono={<User size={14} />} etiqueta="Responsable" valor={a.assignedUserName} />
          <Dato icono={<MapPin size={14} />} etiqueta="Ubicación" valor={[a.locationText, a.location].filter(Boolean).join(" · ") || "Sin ubicación"} />
          {a.estimatedAttendees !== null && <Dato icono={<Users size={14} />} etiqueta="Asistentes estimados" valor={String(a.estimatedAttendees)} />}
          {a.contactId && a.contactName && (
            <div>
              <dt className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">Contacto</dt>
              <dd><Link href={`/crm/contacts/${a.contactId}`} className="font-bold text-blue-700 hover:underline">{a.contactName}</Link></dd>
            </div>
          )}
          {a.createdByName && <Dato icono={<User size={14} />} etiqueta="Creada por" valor={a.createdByName} />}
        </dl>

        {a.description && <Bloque titulo="Notas"><p className="text-sm text-gray-800 whitespace-pre-wrap">{a.description}</p></Bloque>}

        {(a.outcome || a.cancelReason) && (
          <Bloque titulo={a.cancelReason ? "Cancelación" : "Resultado"}>
            {a.outcome && <p className="text-sm font-extrabold text-emerald-800">{RESULTADOS_ACTIVIDAD[a.outcome]?.label ?? a.outcome}</p>}
            {(a.outcomeSummary || a.cancelReason) && <p className="text-sm text-gray-800 whitespace-pre-wrap mt-1">{a.outcomeSummary ?? a.cancelReason}</p>}
            {a.closedAt && <p className="text-[11px] text-gray-500 mt-1">Cerrada el {formatearFechaHora(a.closedAt)}{a.closedByName ? ` por ${a.closedByName}` : ""}.</p>}
          </Bloque>
        )}

        {a.mediaUrls.length > 0 && <MediaGallery media={a.mediaUrls as never} title="Evidencias" />}

        {detalle.seguimientos.length > 0 && (
          <Bloque titulo="Seguimientos derivados">
            <ul className="space-y-1">
              {detalle.seguimientos.map((s) => (
                <li key={s.id} className="text-sm font-semibold text-gray-800">{s.title}{s.scheduledAt ? ` · ${formatearFechaHora(s.scheduledAt)}` : ""}</li>
              ))}
            </ul>
          </Bloque>
        )}
        {a.followUpOfId && <p className="text-xs font-semibold text-gray-600">Esta actividad es un seguimiento de otra.</p>}

        {/* Acciones */}
        {puedeActuar && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Acciones de la actividad">
            {abierta && !esVisitaSuelta && a.estado !== "en_curso" && <BotonAccion icono={<Play size={14} />} onClick={() => void ejecutar({ accion: "iniciar" }, "Actividad en curso.")} deshabilitado={ocupado}>Iniciar</BotonAccion>}
            {abierta && <BotonAccion principal icono={<CheckCircle2 size={14} />} onClick={() => abrirAccion("completar")}>{esVisitaSuelta ? "Reportar resultado" : "Completar"}</BotonAccion>}
            {abierta && !esVisitaSuelta && <BotonAccion icono={<CalendarClock size={14} />} onClick={() => abrirAccion("reprogramar")}>Reprogramar</BotonAccion>}
            {abierta && !esVisitaSuelta && <BotonAccion peligro icono={<XCircle size={14} />} onClick={() => abrirAccion("cancelar")}>Cancelar</BotonAccion>}
            {!esVisitaSuelta && <BotonAccion icono={<GitBranchPlus size={14} />} onClick={() => abrirAccion("seguimiento")}>Crear seguimiento</BotonAccion>}
            {!esVisitaSuelta && <BotonAccion icono={<MessageSquarePlus size={14} />} onClick={() => abrirAccion("nota")}>Agregar nota</BotonAccion>}
            {!esVisitaSuelta && a.estado !== "archivada" && <BotonAccion icono={<Pencil size={14} />} onClick={() => abrirAccion("editar")}>Editar</BotonAccion>}
            {!esVisitaSuelta && <BotonAccion icono={<Copy size={14} />} onClick={() => onDuplicar(a)}>Duplicar como nueva</BotonAccion>}
            {!esVisitaSuelta && cerrada && <BotonAccion icono={<Archive size={14} />} onClick={() => void ejecutar({ accion: "archivar" }, "Actividad archivada. Sigue en el historial.")} deshabilitado={ocupado}>Archivar</BotonAccion>}
            {!esVisitaSuelta && a.estado === "archivada" && <BotonAccion icono={<ArchiveRestore size={14} />} onClick={() => void ejecutar({ accion: "restaurar" }, "Actividad restaurada.")} deshabilitado={ocupado}>Restaurar</BotonAccion>}
            {!esVisitaSuelta && a.puedeBorrar && <BotonAccion peligro icono={<Trash2 size={14} />} onClick={() => abrirAccion("borrar")}>Eliminar</BotonAccion>}
          </div>
        )}

        {accion && (
          <form className="p-4 rounded-2xl border border-blue-200 bg-blue-50/40 space-y-3" onSubmit={(e) => {
            e.preventDefault();
            if (accion === "completar") void completar();
            else if (accion === "reprogramar") { if (!fecha) setErrorAccion("Indica la nueva fecha."); else void ejecutar({ accion: "reprogramar", scheduledAt: new Date(fecha).toISOString(), reason: texto.trim() || undefined }, "Actividad reprogramada."); }
            else if (accion === "cancelar") { if (!texto.trim()) setErrorAccion("Indica el motivo de la cancelación."); else void ejecutar({ accion: "cancelar", reason: texto.trim() }, "Actividad cancelada. Ya no aparece como pendiente."); }
            else if (accion === "seguimiento") { if (!fecha) setErrorAccion("Indica la fecha del seguimiento."); else void ejecutar({ accion: "seguimiento", scheduledAt: new Date(fecha).toISOString(), assignedToUserId: responsable || null, title: tituloSeg.trim() || undefined }, "Seguimiento creado."); }
            else if (accion === "nota") { if (!texto.trim()) setErrorAccion("La nota no puede estar vacía."); else void ejecutar({ accion: "nota", note: texto.trim() }, "Nota agregada."); }
            else if (accion === "editar") {
              if (!edit.title.trim()) { setErrorAccion("El título es obligatorio."); return; }
              if (edit.asistentes && !/^\d+$/.test(edit.asistentes)) { setErrorAccion("Los asistentes deben ser un número entero."); return; }
              void ejecutar({
                accion: "editar", title: edit.title.trim(), description: edit.description, locationText: edit.locationText,
                estimatedAttendees: edit.asistentes ? Number(edit.asistentes) : null,
                ...(editTipo[0] && editTipo[0].id !== a.tipo?.id ? { activityTypeId: editTipo[0].id } : {}),
                tagIds: editTags.map((t) => t.id), mediaUrls: editMedia
              }, "Cambios guardados.");
            } else if (accion === "borrar") void eliminar();
          }}>
            {accion === "completar" && (<>
              <div>
                <label htmlFor="fa-resultado" className={etiquetaClase}>Resultado</label>
                <select id="fa-resultado" value={outcome} className={campoClase} onChange={(e) => {
                  setOutcome(e.target.value);
                  // El seguimiento se propone en unos días, no en una hora.
                  if (RESULTADOS_ACTIVIDAD[e.target.value]?.requiereSeguimiento) setFecha(proximaHoraLocal(60 * 24 * 3));
                }}>
                  {CLAVES_RESULTADO.map((k) => <option key={k} value={k}>{RESULTADOS_ACTIVIDAD[k]!.label}</option>)}
                </select>
                <p className="mt-1 text-[11px] text-gray-600">{RESULTADOS_ACTIVIDAD[outcome]?.ayuda}</p>
              </div>
              <Texto etiqueta="Conclusión *" valor={texto} onCambio={setTexto} placeholder="Qué pasó, asistentes, acuerdos…" />
              {requiereSeg && !esVisitaSuelta && (
                <div className="grid sm:grid-cols-2 gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="sm:col-span-2 text-xs font-extrabold text-amber-900">Este resultado requiere seguimiento: quedará asignado y con fecha.</p>
                  <FechaResponsable fecha={fecha} setFecha={setFecha} responsable={responsable} setResponsable={setResponsable} usuarios={usuarios} usuarioActualId={usuarioActualId} />
                  <div className="sm:col-span-2"><label htmlFor="fa-tseg" className={etiquetaClase}>Título del seguimiento (opcional)</label><input id="fa-tseg" value={tituloSeg} onChange={(e) => setTituloSeg(e.target.value)} className={campoClase} placeholder={`Seguimiento: ${a.title}`.slice(0, 80)} /></div>
                </div>
              )}
            </>)}
            {accion === "reprogramar" && (<>
              <div><label htmlFor="fa-fecha" className={etiquetaClase}>Nueva fecha y hora *</label><input id="fa-fecha" type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} className={campoClase} /></div>
              <Texto etiqueta="Motivo (opcional)" valor={texto} onCambio={setTexto} rows={2} placeholder="Por qué se mueve…" />
            </>)}
            {accion === "cancelar" && <Texto etiqueta="Motivo de la cancelación *" valor={texto} onCambio={setTexto} rows={2} placeholder="Por qué no se realizará…" />}
            {accion === "nota" && <Texto etiqueta="Nota" valor={texto} onCambio={setTexto} rows={3} placeholder="Queda en el historial con tu nombre y la fecha." />}
            {accion === "seguimiento" && (
              <div className="grid sm:grid-cols-2 gap-3">
                <FechaResponsable fecha={fecha} setFecha={setFecha} responsable={responsable} setResponsable={setResponsable} usuarios={usuarios} usuarioActualId={usuarioActualId} />
                <div className="sm:col-span-2"><label htmlFor="fa-tseg2" className={etiquetaClase}>Título (opcional)</label><input id="fa-tseg2" value={tituloSeg} onChange={(e) => setTituloSeg(e.target.value)} className={campoClase} placeholder={`Seguimiento: ${a.title}`.slice(0, 80)} /></div>
              </div>
            )}
            {accion === "editar" && (<>
              <div><label htmlFor="fa-e-t" className={etiquetaClase}>Título *</label><input id="fa-e-t" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} maxLength={200} className={campoClase} /></div>
              {a.estado !== "completada" && a.estado !== "cancelada" && (
                <SelectorBuscable etiqueta="Tipo de actividad" valor={editTipo} onCambiar={setEditTipo} buscar={buscarCatalogo("type")} crear={crearEnCatalogo("type", "tipo", esAdmin)} />
              )}
              <div className="grid sm:grid-cols-2 gap-3">
                <div><label htmlFor="fa-e-l" className={etiquetaClase}>Lugar</label><input id="fa-e-l" value={edit.locationText} onChange={(e) => setEdit({ ...edit, locationText: e.target.value })} maxLength={240} className={campoClase} /></div>
                <div><label htmlFor="fa-e-a" className={etiquetaClase}>Asistentes estimados</label><input id="fa-e-a" inputMode="numeric" value={edit.asistentes} onChange={(e) => setEdit({ ...edit, asistentes: e.target.value })} className={campoClase} /></div>
              </div>
              <SelectorBuscable etiqueta="Etiquetas" multiple valor={editTags} onCambiar={setEditTags} buscar={buscarCatalogo("tag")} crear={crearEnCatalogo("tag", "etiqueta", esAdmin)} />
              <Texto etiqueta="Notas" valor={edit.description} onCambio={(v) => setEdit({ ...edit, description: v })} rows={3} />
              <MediaUploader value={editMedia} onChange={setEditMedia} label="Evidencias" />
            </>)}
            {accion === "borrar" && <p className="text-sm font-bold text-red-800">Se eliminará la actividad, su historial y la visita pendiente que agendó. No se puede deshacer. ¿Confirmas?</p>}

            {errorAccion && <p role="alert" className="text-sm font-bold text-red-700">{errorAccion}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAccion(null)} disabled={ocupado} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold cursor-pointer">Cancelar</button>
              <button type="submit" disabled={ocupado} className={`px-5 py-2 rounded-xl text-white text-sm font-extrabold cursor-pointer inline-flex items-center gap-2 ${accion === "borrar" || accion === "cancelar" ? "bg-red-600" : "bg-blue-600"}`}>
                {ocupado && <Loader2 size={14} className="animate-spin" />}
                {accion === "completar" ? "Guardar resultado" : accion === "reprogramar" ? "Reprogramar" : accion === "cancelar" ? "Cancelar la actividad" : accion === "seguimiento" ? "Crear seguimiento" : accion === "nota" ? "Guardar nota" : accion === "borrar" ? "Sí, eliminar" : "Guardar cambios"}
              </button>
            </div>
          </form>
        )}
        {errorAccion && !accion && <p role="alert" className="text-sm font-bold text-red-700">{errorAccion}</p>}

        {/* Historial */}
        {!esVisitaSuelta && (
          <Bloque titulo="Historial">
            {detalle.historial.length === 0 ? <p className="text-sm text-gray-500">Sin movimientos registrados (actividad anterior al historial).</p> : (
              <ol className="space-y-3 border-l-2 border-gray-100 pl-4">
                {[...detalle.historial].reverse().map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-400 ring-2 ring-white" aria-hidden="true" />
                    <p className="text-sm font-extrabold text-gray-900">{TEXTO_EVENTO[e.kind] ?? e.kind}</p>
                    {describirEvento(e) && <p className="text-sm text-gray-700 whitespace-pre-wrap">{describirEvento(e)}</p>}
                    <p className="text-[11px] text-gray-500">{e.actorName ?? "Alguien"} · {formatearFechaHora(e.createdAt)}</p>
                  </li>
                ))}
              </ol>
            )}
          </Bloque>
        )}
      </div>
    </Envoltorio>
  );

  async function eliminar() {
    setOcupado(true); setErrorAccion(null);
    const r = await llamar(`/api/equipo/tareas/${id}`, { method: "DELETE" });
    setOcupado(false);
    if (!r.ok) { setErrorAccion(r.error); return; }
    onCambio();
    onCerrar();
  }
}

function Envoltorio({ children, onCerrar, contenedor, titulo }: { children: React.ReactNode; onCerrar: () => void; contenedor: React.RefObject<HTMLDivElement | null>; titulo?: string }) {
  return (
    <div className="fixed inset-0 z-[110] bg-black/50 flex items-end sm:items-center justify-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div ref={contenedor} tabIndex={-1} role="dialog" aria-modal="true" aria-label={titulo ?? "Actividad"} className="bg-white w-full sm:max-w-2xl max-h-[94dvh] flex flex-col rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden outline-none">
        <div className="flex items-start justify-between gap-3 px-5 py-4 bg-slate-900 text-white shrink-0">
          <h2 className="text-base font-extrabold leading-snug">{titulo ?? "Actividad"}</h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer shrink-0"><X size={18} /></button>
        </div>
        <div className="flex flex-col overflow-hidden flex-1 min-h-0">{children}</div>
      </div>
    </div>
  );
}

function Dato({ icono, etiqueta, valor }: { icono: React.ReactNode; etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 flex items-center gap-1">{icono}{etiqueta}</dt>
      <dd className="font-bold text-gray-900">{valor}</dd>
    </div>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 mb-1.5">{titulo}</h3>
      {children}
    </section>
  );
}

function BotonAccion({ children, icono, onClick, principal, peligro, deshabilitado }: { children: React.ReactNode; icono: React.ReactNode; onClick: () => void; principal?: boolean; peligro?: boolean; deshabilitado?: boolean }) {
  const color = principal ? "bg-emerald-600 text-white hover:bg-emerald-700" : peligro ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-gray-100 text-gray-800 hover:bg-gray-200";
  return (
    <button type="button" onClick={onClick} disabled={deshabilitado} className={`px-3 py-2 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 ${color}`}>
      {icono}{children}
    </button>
  );
}

function Texto({ etiqueta, valor, onCambio, rows = 3, placeholder }: { etiqueta: string; valor: string; onCambio: (v: string) => void; rows?: number; placeholder?: string }) {
  const id = `t-${etiqueta.replace(/\W+/g, "")}`;
  return (
    <div>
      <label htmlFor={id} className={etiquetaClase}>{etiqueta}</label>
      <textarea id={id} rows={rows} maxLength={4000} value={valor} placeholder={placeholder} onChange={(e) => onCambio(e.target.value)} className={campoClase + " resize-none"} />
    </div>
  );
}

function FechaResponsable({ fecha, setFecha, responsable, setResponsable, usuarios, usuarioActualId }: { fecha: string; setFecha: (v: string) => void; responsable: string; setResponsable: (v: string) => void; usuarios: UsuarioOpcion[]; usuarioActualId: string }) {
  return (
    <>
      <div><label htmlFor="fa-seg-f" className={etiquetaClase}>Fecha y hora *</label><input id="fa-seg-f" type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} className={campoClase} /></div>
      <div>
        <label htmlFor="fa-seg-r" className={etiquetaClase}>Responsable</label>
        <select id="fa-seg-r" value={responsable} onChange={(e) => setResponsable(e.target.value)} className={campoClase}>
          {usuarios.map((u) => <option key={u.id} value={u.id}>{u.id === usuarioActualId ? `${u.displayName} (tú)` : u.displayName}</option>)}
        </select>
      </div>
    </>
  );
}
