"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { 
  MapPin, User, Calendar, CheckCircle, Clock,
  AlertCircle, X, Phone, Trash2, MessageSquare, Sparkles, Send, ImageIcon,
  Search, ClipboardList, CalendarDays, Plus
} from "lucide-react";
import { useRouter } from "next/navigation";
import { MediaGallery } from "@/components/MediaGallery";
import { AccionesDeContacto } from "@/components/AccionesDeContacto";
import { agregarFrase, ElegirResultado, FrasesRapidas } from "@/components/ElegirResultado";
import { LoQueHaPedido } from "@/components/LoQueHaPedido";
import { MarcaMunicipio } from "@/components/MarcaMunicipio";
import { LARGO_MAXIMO_RESUMEN_VISITA, RESULTADOS_ACTIVIDAD } from "@/lib/actividades";
import { celebrar } from "@/lib/celebraciones";
import { enviarOEncolar, TEXTO_DE_ESPERA } from "@/lib/cola-de-envios";
import { useUsuarioActualId } from "@/lib/usuario-contexto";
import { DatosPersonales, type DatosDelCiudadano } from "./DatosPersonales";
import { EditarDomicilio } from "./EditarDomicilio";

type ContactDetail = DatosDelCiudadano & {
  canManageSensitive?: boolean;
  /** Puede corregir sección y colonia (misma regla que POST /territory). */
  canEditTerritory?: boolean;
  /** Puede asignar un enlace responsable (misma regla que POST /assignment). */
  canAssign?: boolean;
  /** Su llave de municipio (0022). */
  municipio?: { nombre: string; esGeneral: boolean } | null;
  contactId: string;
  displayName: string;
  phoneNumber: string | null;
  status: string;
  createdAt: string;
  section: { sectionId: string; sectionNum: number } | null;
  territory: { colonyId: string; colonyName: string; territoryStatus: string } | null;
  assignment: { assignedUserId: string; assignedUserName: string; assignedAt: string } | null;
  visits: Array<{
    visitId: string;
    scheduledAt: string;
    status: string;
    outcome: string | null;
    summary: string | null;
    assignedUserName: string | null;
  }>;
  origin?: string;
  actualContactUserId?: string;
  firstContactDate?: string;
  preferredContactMethod?: string;
  preferredContactTime?: string;
  panMilitancy?: string;
  panMilitancyVerifiedAt?: string;
  knowMeBetter?: string;
  bardaPhotoUrl?: string;
  exactLatitude?: number;
  exactLongitude?: number;
  creator?: { name: string; accessType: string };
  notes?: Array<{
    id: string;
    noteText: string;
    createdAt: string;
    authorId: string;
    authorName: string;
    authorAccessType: string;
  }>;
  survey?: any;
};

type UserItem = { userId: string; displayName: string; roleKey?: string };
type ModalType = "territory" | "assignment" | "schedule" | "complete" | null;

// El dominio devuelve sus mensajes en inglés y la aplicación está en español.
// Se traducen por código, que es estable, y se cae al mensaje del servidor si
// aparece uno que no esté contemplado aquí.
const MOTIVOS_VISITA: Record<string, string> = {
  contact_assignment_not_found:
    "Primero asigna un enlace responsable a este ciudadano; sin responsable no se puede programar la visita.",
  contact_territory_not_found:
    "Primero asigna colonia y sección a este ciudadano desde Territorio.",
  contact_territory_not_confirmed:
    "El territorio de este ciudadano aún no está confirmado.",
  contact_not_found: "El ciudadano no fue encontrado o está inactivo.",
  visit_scheduled_at_in_past: "La fecha de la visita no puede estar en el pasado.",
  responsible_user_inactive: "Esa persona está dada de baja: elige a alguien activo.",
  responsible_user_not_operational: "Esa persona no hace visitas (por ejemplo, capturista): elige a un brigadista o líder.",
  contact_assignment_version_conflict: "Alguien más cambió la asignación al mismo tiempo. Vuelve a intentarlo."
};

// También para asignar responsable y territorio: antes esos dos solo decían «no se pudo», y quien
// asignaba a un ciudadano sin territorio no sabía que primero tenía que confirmar su colonia.
function motivoVisita(err: { code?: string; message?: string; error?: string } | null): string | null {
  if (!err) return null;
  return (err.code && MOTIVOS_VISITA[err.code]) || err.message || err.error || null;
}


export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  // De quién es lo que se guarda en la cola del teléfono (en un teléfono compartido no se envía con otra sesión).
  const usuarioId = useUsuarioActualId();

  const [detail, setDetail] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(true);
  /** La ficha no llegó por falta de señal o un fallo del servidor: no es lo mismo que «no existe» (C4). */
  const [sinConexion, setSinConexion] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // New note form state
  const [newNoteText, setNewNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Modal-specific state
  const [users, setUsers] = useState<UserItem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [visitLocation, setVisitLocation] = useState("");
  const [outcomeVisitId, setOutcomeVisitId] = useState("");
  const [outcome, setOutcome] = useState("successful");
  const [outcomeSummary, setOutcomeSummary] = useState("");

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    // Los errores se quedan más tiempo: a los 3.5 s se borraban antes de que alguien los leyera al sol (C8).
    setTimeout(() => setToast(null), type === "error" ? 8000 : 3500);
  };

  function abrirResultado(visitId: string) {
    setOutcomeVisitId(visitId);
    setOutcome("successful");
    setOutcomeSummary("");
    setModal("complete");
  }

  function cerrarResultado() {
    if (saving) return;
    if (outcomeSummary.trim() && !window.confirm("¿Cerrar sin guardar? Lo que escribiste se perderá.")) return;
    setModal(null);
  }

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/crm/contacts/${id}`);
      // Una respuesta de error traía `{ error }`, y se guardaba como si fuera la ficha: con un 404
      // —ficha inexistente o de otra brigada— nunca se veía «Contacto no encontrado», sino una ficha
      // vacía. Otro fallo al recargar (tras guardar una nota, por ejemplo) conserva lo que ya se veía.
      if (!res.ok) {
        if (res.status === 404) { setDetail(null); setSinConexion(false); }
        // Sin la ficha a la vista, un fallo del servidor se decía «Contacto no encontrado» (C4).
        else setSinConexion(true);
        return;
      }
      const data = await res.json();
      setDetail(data as ContactDetail);
      setSinConexion(false);
    } catch (err) {
      console.error(err);
      // Sin señal: `fetch` ni siquiera llega al servidor.
      setSinConexion(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  useEffect(() => {
    if ((modal === "assignment" || modal === "schedule") && users.length === 0) {
      fetch("/api/crm/users")
        .then(r => r.json())
        .then((data: UserItem[]) => setUsers(data));
    }
  }, [modal, users.length]);

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    setAddingNote(true);
    try {
      const res = await fetch(`/api/crm/contacts/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteText: newNoteText })
      });
      if (res.ok) {
        setNewNoteText("");
        showToast("success", "Nota fechada registrada exitosamente.");
        fetchDetail();
      } else {
        showToast("error", "No se pudo guardar la nota.");
      }
    } catch {
      showToast("error", "Error de conexión al guardar nota.");
    } finally {
      setAddingNote(false);
    }
  }

  async function handleAssignResponsible() {
    if (!selectedUserId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/crm/contacts/${id}/assignment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedUserId: selectedUserId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(motivoVisita(err) || "No se pudo asignar el responsable.");
      }
      await fetchDetail();
      setModal(null);
      setSelectedUserId("");
      showToast("success", "Responsable asignado correctamente.");
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "No se pudo asignar el responsable.");
    } finally {
      setSaving(false);
    }
  }

  async function handleScheduleVisit() {
    if (!scheduledAt) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/crm/contacts/${id}/visits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: new Date(scheduledAt).toISOString(),
          visitLocationText: visitLocation.trim() || "Por definir",
        }),
      });
      // El servidor explica por qué no se pudo (por ejemplo, que el contacto
      // aún no tiene responsable asignado). Descartarlo dejaba al usuario con un
      // "no se pudo" sin decirle qué arreglar.
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(motivoVisita(err) || "No se pudo programar la visita.");
      }
      await fetchDetail();
      setModal(null);
      setScheduledAt("");
      setVisitLocation("");
      showToast("success", "Visita programada exitosamente.");
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "No se pudo programar la visita.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCompleteVisit() {
    if (!outcomeVisitId || !outcomeSummary.trim()) return;
    setSaving(true);
    // Por la cola del teléfono (C3): sin señal, el resultado queda guardado y se envía solo cuando vuelve.
    // Reenviarlo no cierra dos veces: el servidor reconoce el mismo cierre.
    const r = await enviarOEncolar({
      clave: `resultado-${outcomeVisitId}`,
      tipo: "resultado",
      url: `/api/crm/contacts/${id}/visits/${outcomeVisitId}/complete`,
      cuerpo: { structuredOutcome: outcome, summary: outcomeSummary },
      descripcion: `Resultado de visita: ${detail?.displayName ?? "ciudadano"}`,
      usuarioId
    });
    setSaving(false);
    if (r.estado === "rechazado") {
      showToast("error", motivoVisita({ ...(r.codigo ? { code: r.codigo } : {}), message: r.error }) || "No se pudo completar la visita.");
      return;
    }
    if (r.estado === "sin-cola") {
      showToast("error", r.error);
      return;
    }
    setModal(null);
    setOutcome("successful");
    setOutcomeSummary("");
    if (r.estado === "encolado") {
      showToast("success", TEXTO_DE_ESPERA[r.motivo]);
      return;
    }
    await fetchDetail();
    // El aviso de abajo, con vibración: suma a «Mi día» y puede ganar una insignia.
    if (!r.datos.repetido) celebrar({ tipo: "cierre", titulo: "Visita completada" });
  }

  async function handleDeleteContact() {
    if (!confirm("¿Dar de baja a este ciudadano? Deja de aparecer en el directorio, el mapa y los conteos. Su historial de visitas y notas se conserva.")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/crm/contacts/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Error al dar de baja");
      showToast("success", "Ciudadano dado de baja.");
      setTimeout(() => {
        router.push("/crm/contacts");
      }, 1000);
    } catch {
      showToast("error", "No se pudo dar de baja al ciudadano.");
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh] flex-col gap-3">
      <div className="w-10 h-10 border-3 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
      <p className="text-gray-600 text-sm font-bold">Cargando datos del ciudadano…</p>
    </div>
  );

  if (!detail && sinConexion) return (
    <div className="text-center py-20 px-4" role="alert">
      <AlertCircle size={48} className="mx-auto mb-4 text-amber-400" />
      <h2 className="text-xl font-bold text-gray-900 mb-2">No pudimos abrir la ficha</h2>
      <p className="text-sm text-gray-600 max-w-sm mx-auto">Parece que no hay señal o el servidor tardó demasiado. No se perdió nada: vuelve a intentarlo en un momento.</p>
      <div className="flex flex-wrap justify-center gap-2 mt-5">
        <button
          type="button"
          onClick={() => { setLoading(true); setSinConexion(false); void fetchDetail(); }}
          className="min-h-[48px] px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm cursor-pointer"
        >
          Reintentar
        </button>
        <Link href="/crm/contacts" className="min-h-[48px] px-6 rounded-2xl border border-gray-200 bg-white text-gray-800 font-bold text-sm inline-flex items-center">
          Volver al directorio
        </Link>
      </div>
    </div>
  );

  if (!detail) return (
    <div className="text-center py-20 px-4">
      <Search size={48} className="mx-auto mb-4 text-gray-300" />
      <h2 className="text-xl font-bold text-gray-900 mb-2">No encontramos a esta persona</h2>
      <p className="text-sm text-gray-600 max-w-sm mx-auto">Puede que la hayan dado de baja o que no esté en tu equipo.</p>
      <Link href="/crm/contacts" className="inline-flex items-center min-h-[48px] mt-5 px-6 rounded-2xl bg-blue-600 text-white font-bold text-sm">
        Volver al directorio
      </Link>
    </div>
  );

  const isPan = detail.panMilitancy === "confirmada";
  const isPanDeclared = detail.panMilitancy === "declarada";
  // La más próxima de las pendientes: es la que se va a hacer.
  const visitaPendiente = [...(detail.visits ?? [])]
    .filter((v) => v.status === "scheduled")
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0] ?? null;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-6 w-[90vw] md:w-auto z-[1200] flex items-center justify-center gap-3 p-4 rounded-2xl shadow-xl font-bold text-xs max-w-sm border backdrop-blur-md ${
          toast.type === "success" ? "bg-emerald-50/95 border-emerald-200 text-emerald-900" : "bg-rose-50/95 border-rose-200 text-rose-900"
        }`}>
          {toast.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Back link */}
      <Link
        href="/crm/contacts"
        className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-900 text-xs font-extrabold transition-colors"
      >
        ← Volver al directorio
      </Link>

      {/* HEADER HERO */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 border border-white/15">
            <User size={32} className="text-white" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                {detail.displayName}
              </h1>
              {isPan && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-[11px] font-black rounded-full shadow-sm">
                  <span className="font-black">M</span> PAN Confirmado
                </span>
              )}
              {isPanDeclared && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-400/20 text-blue-200 text-[11px] font-bold rounded-full border border-blue-400/30">
                  PAN Declarada
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-blue-200/80 font-medium flex-wrap">
              {detail.phoneNumber && (
                <span className="flex items-center gap-1">
                  <Phone size={13} /> {detail.phoneNumber}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar size={13} /> Reg: {new Date(detail.createdAt).toLocaleDateString("es-MX")}
              </span>
              <span className="px-2 py-0.5 bg-white/10 rounded-md text-[11px] uppercase font-bold text-cyan-200">
                Origen: {detail.origin ? detail.origin.replace("_", " ") : "Toca toca"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {detail.canManageSensitive && detail.status !== "inactive" && (
            <button
              type="button"
              onClick={handleDeleteContact}
              disabled={saving}
              className="p-2.5 bg-white/10 hover:bg-rose-600 rounded-xl text-white transition-colors cursor-pointer"
              title="Dar de baja del padrón"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Llamar, WhatsApp y Cómo llegar a un toque, con lo que la ficha ya enseña (C1). */}
      <AccionesDeContacto
        telefono={detail.phoneNumber}
        lat={detail.exactLatitude ?? null}
        lng={detail.exactLongitude ?? null}
        // Sin calle ni colonia no se ofrece: una ruta «a Tonalá» no lleva a ninguna puerta.
        direccion={detail.address || detail.territory?.colonyName ? [
          [detail.address, detail.addressNumber].filter(Boolean).join(" "),
          detail.territory?.colonyName,
          detail.municipio && !detail.municipio.esGeneral ? `${detail.municipio.nombre}, Jalisco` : null
        ].filter(Boolean).join(", ") : null}
      />

      {/* La visita pendiente, arriba (C15): antes quedaba al final, después de notas y encuesta, y en la
          puerta había que bajar toda la ficha para reportarla. */}
      {visitaPendiente && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wider text-amber-800">Visita pendiente</p>
            <p className="text-base font-extrabold text-amber-950">
              {new Date(visitaPendiente.scheduledAt).toLocaleString("es-MX", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="text-sm font-semibold text-amber-900">{visitaPendiente.assignedUserName || "Sin responsable asignado"}</p>
          </div>
          <button
            type="button"
            onClick={() => abrirResultado(visitaPendiente.visitId)}
            className="min-h-[52px] px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-base font-extrabold inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle size={20} aria-hidden="true" /> Reportar resultado
          </button>
        </div>
      )}

      <DatosPersonales detail={detail} onGuardado={fetchDetail} avisar={showToast} />

      {/* GRID: TERRITORIO, RESPONSABLE, MILITANCIA */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* TERRITORIO */}
        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-blue-600" />
              <h3 className="font-extrabold text-xs text-gray-900 uppercase">Territorio</h3>
            </div>
            <button
              type="button"
              hidden={!detail.canEditTerritory}
              onClick={() => setModal("territory")}
              className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
            >
              Editar
            </button>
          </div>

          <div>
            <div className="text-lg font-black text-gray-900">
              {detail.territory?.colonyName || "Por identificar"}
            </div>
            <div className="text-xs text-gray-500 font-medium">
              {detail.section?.sectionNum ? `Sección ${detail.section.sectionNum}` : "Sección no asignada"}
            </div>
            <div className="text-xs text-gray-500 font-medium mt-1 flex items-center gap-1.5">
              Municipio: <MarcaMunicipio nombre={detail.municipio?.nombre} esGeneral={detail.municipio?.esGeneral ?? true} />
            </div>
          </div>
        </div>

        {/* RESPONSABLE / RED */}
        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User size={16} className="text-indigo-600" />
              <h3 className="font-extrabold text-xs text-gray-900 uppercase">Enlace Responsable</h3>
            </div>
            <button
              type="button"
              hidden={!detail.canAssign}
              onClick={() => setModal("assignment")}
              className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
            >
              Asignar
            </button>
          </div>

          <div>
            <div className="text-lg font-black text-gray-900">
              {detail.assignment?.assignedUserName || detail.creator?.name || "Sin asignar"}
            </div>
            <div className="text-xs text-gray-500 font-medium">
              Red: {detail.creator?.accessType?.toUpperCase() || "CONEXIÓN"}
            </div>
          </div>
        </div>

        {/* PREFERENCIAS DE CONTACTO */}
        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-emerald-600" />
            <h3 className="font-extrabold text-xs text-gray-900 uppercase">Contacto Óptimo</h3>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-bold text-gray-800">
              Medio: <span className="capitalize font-semibold text-gray-600">{detail.preferredContactMethod || "WhatsApp"}</span>
            </div>
            <div className="text-xs font-bold text-gray-800">
              Horario: <span className="capitalize font-semibold text-gray-600">{detail.preferredContactTime || "Indiferente"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CONÓCEME MEJOR & FOTO DE BARDA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {detail.knowMeBetter && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-3xl border border-blue-100 space-y-2">
            <div className="flex items-center gap-2 text-blue-900 font-extrabold text-xs uppercase">
              <Sparkles size={14} className="text-blue-600" />
              <span>Conóceme Mejor (Gustos e Intereses)</span>
            </div>
            <p className="text-xs text-blue-950 font-medium leading-relaxed">
              "{detail.knowMeBetter}"
            </p>
          </div>
        )}

        {detail.bardaPhotoUrl && (
          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-gray-900 font-extrabold text-xs uppercase">
              <ImageIcon size={14} className="text-blue-600" />
              <span>Espacio Ofrecido / Barda</span>
            </div>
            {/* Las nuevas son fotos subidas desde el teléfono (C17) y se ven aquí mismo; las de antes
                eran una URL escrita a mano y se siguen abriendo como enlace. */}
            {detail.bardaPhotoUrl.startsWith("/api/uploads/") ? (
              <MediaGallery media={[{ url: detail.bardaPhotoUrl, type: "image", name: "Barda" }]} title="Foto" />
            ) : (
              <a
                href={detail.bardaPhotoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline font-bold block truncate"
              >
                <ImageIcon size={13} className="inline -mt-0.5 mr-1" /> Ver Fotografía de Barda / Espacio
              </a>
            )}
          </div>
        )}
      </div>

      {/* RESULTADOS DE LA ENCUESTA (SI CONTESTÓ) */}
      {detail.survey && (
        <div className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <ClipboardList size={18} className="text-indigo-600" />
            <h3 className="font-extrabold text-sm text-gray-900 uppercase">Respuestas de Encuesta Ciudadana</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-gray-50 rounded-2xl">
              <span className="font-extrabold text-gray-500 uppercase text-[11px] block mb-1">1. Prioridad en su colonia</span>
              <p className="font-bold text-gray-900">{detail.survey.colonyPriorityNeed || "No especificado"}</p>
            </div>

            <div className="p-3 bg-gray-50 rounded-2xl">
              <span className="font-extrabold text-gray-500 uppercase text-[11px] block mb-1">2. Lo que más valora de su municipio</span>
              <p className="font-bold text-gray-900">{detail.survey.tonalaValues || "No especificado"}</p>
            </div>

            <div className="p-3 bg-gray-50 rounded-2xl">
              <span className="font-extrabold text-gray-500 uppercase text-[11px] block mb-1">3. Calificación de Servicios</span>
              <p className="font-bold text-gray-900">{detail.survey.servicesRating ? `${detail.survey.servicesRating} / 5` : "Sin calificar"} {detail.survey.servicesRatingWhy ? `· "${detail.survey.servicesRatingWhy}"` : ""}</p>
            </div>

            <div className="p-3 bg-gray-50 rounded-2xl">
              <span className="font-extrabold text-gray-500 uppercase text-[11px] block mb-1">4. Expectativa del Proyecto</span>
              <p className="font-bold text-gray-900">{detail.survey.projectExpectations || "No especificado"}</p>
            </div>

            <div className="p-3 bg-gray-50 rounded-2xl sm:col-span-2">
              <span className="font-extrabold text-gray-500 uppercase text-[11px] block mb-1">5. Forma de Participación</span>
              <p className="font-bold text-gray-900">{detail.survey.participationForm || "No especificado"}</p>
            </div>

            {detail.survey.openProposal && (
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl sm:col-span-2">
                <span className="font-extrabold text-indigo-800 uppercase text-[11px] block mb-1">6. Propuesta Libre</span>
                <p className="font-bold text-indigo-950 italic">"{detail.survey.openProposal}"</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lo que este vecino ha pedido en Escucha Social, con su estado (plan de auditoría de menús, D10). */}
      <LoQueHaPedido contactoId={id} />

      {/* NOTAS CON FECHA Y AUTOR (no se editan ni se borran) */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-5">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
          <MessageSquare size={18} className="text-blue-600" />
          <h3 className="font-extrabold text-sm text-gray-900 uppercase tracking-wider">
            Notas ({detail.notes?.length || 0})
          </h3>
        </div>

        {/* ADD NOTE FORM */}
        <form onSubmit={handleAddNote} className="space-y-2">
          <textarea
            rows={2}
            value={newNoteText}
            onChange={e => setNewNoteText(e.target.value)}
            placeholder="Escribe una nota sobre esta persona (queda con fecha y tu nombre)…"
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={addingNote || !newNoteText.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Send size={13} />
              <span>{addingNote ? "Guardando..." : "Agregar Nota"}</span>
            </button>
          </div>
        </form>

        {/* NOTES LIST */}
        {detail.notes && detail.notes.length > 0 ? (
          <div className="space-y-3 pt-2">
            {detail.notes.map(n => (
              <div key={n.id} className="p-4 bg-gray-50/80 rounded-2xl border border-gray-100 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-black text-gray-900">{n.authorName || "Integrante"}</span>
                  <span className="text-gray-400 font-semibold">{new Date(n.createdAt).toLocaleString("es-MX")}</span>
                </div>
                <p className="text-xs text-gray-700 font-medium whitespace-pre-wrap">{n.noteText}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-4">No hay notas registradas para este contacto.</p>
        )}
      </div>

      {/* VISITAS. El backend y los manejadores existían desde hace tiempo, pero
          ningún control los invocaba: desde la ficha no se podía ni programar
          ni cerrar una visita. */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-blue-600" />
            <h2 className="text-sm font-black text-gray-900">
              Visitas Programadas ({detail.visits?.length || 0})
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setModal("schedule")}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-bold shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <Plus size={13} /> Programar visita
          </button>
        </div>

        {detail.visits && detail.visits.length > 0 ? (
          <div className="space-y-3">
            {detail.visits.map(v => {
              const pendiente = v.status === "scheduled";
              return (
                <div key={v.visitId} className="p-4 bg-gray-50/80 rounded-2xl border border-gray-100 space-y-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-0.5">
                      <p className="text-xs font-black text-gray-900">
                        {new Date(v.scheduledAt).toLocaleString("es-MX")}
                      </p>
                      <p className="text-[11px] text-gray-500 font-semibold">
                        {v.assignedUserName || "Sin responsable asignado"}
                      </p>
                    </div>
                    <span
                      className={`text-[11px] font-black uppercase px-2.5 py-1 rounded-full ${
                        pendiente ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {pendiente ? "Pendiente" : RESULTADOS_ACTIVIDAD[v.outcome || ""]?.label || "Completada"}
                    </span>
                  </div>

                  {v.summary ? (
                    <p className="text-xs text-gray-700 font-medium whitespace-pre-wrap">{v.summary}</p>
                  ) : null}

                  {pendiente ? (
                    <button
                      type="button"
                      onClick={() => abrirResultado(v.visitId)}
                      className="min-h-[44px] px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold cursor-pointer"
                    >
                      Reportar resultado
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-4">
            Este ciudadano no tiene visitas programadas.
          </p>
        )}
      </div>

      {/* MODALS */}
      {modal === "territory" && (
        <EditarDomicilio
          contactId={id}
          actual={{
            colonia: detail.territory?.colonyName ?? null,
            seccion: detail.section?.sectionNum ?? null,
            municipio: detail.municipio && !detail.municipio.esGeneral ? detail.municipio.nombre : null,
            calle: detail.address ?? null,
            lat: typeof detail.exactLatitude === "number" ? detail.exactLatitude : null,
            lng: typeof detail.exactLongitude === "number" ? detail.exactLongitude : null
          }}
          onCerrar={() => setModal(null)}
          onGuardado={fetchDetail}
          avisar={showToast}
          motivo={motivoVisita}
        />
      )}

      {modal === "assignment" && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[110] flex items-center justify-center p-3 sm:p-4 animate-in fade-in" onClick={() => setModal(null)}>
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl max-h-[88dvh] flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-5 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
              <h3 className="font-black text-sm text-gray-900">Asignar Responsable de Enlace</h3>
              <button 
                type="button" 
                onClick={() => setModal(null)} 
                className="w-11 h-11 shrink-0 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center cursor-pointer transition-colors"
                title="Cerrar ventana"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-1 pb-16">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Operador / Enlace Responsable</label>
                <select
                  value={selectedUserId}
                  onChange={e => setSelectedUserId(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:bg-white"
                >
                  <option value="">Selecciona un integrante...</option>
                  {users.map(u => (
                    <option key={u.userId} value={u.userId}>{u.displayName}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setModal(null)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-600 cursor-pointer">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAssignResponsible}
                  disabled={saving || !selectedUserId}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Asignando..." : "Asignar Responsable"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal === "schedule" && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[110] flex items-center justify-center p-3 sm:p-4 animate-in fade-in" onClick={() => setModal(null)}>
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl max-h-[88dvh] flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-5 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
              <h3 className="font-black text-sm text-gray-900">Programar Visita Domiciliaria</h3>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="w-11 h-11 shrink-0 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center cursor-pointer transition-colors"
                title="Cerrar ventana"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-1 pb-16">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Fecha y hora *</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Punto de encuentro</label>
                <input
                  type="text"
                  value={visitLocation}
                  onChange={e => setVisitLocation(e.target.value)}
                  placeholder="Ej. Domicilio del ciudadano, Calle Juárez #145"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setModal(null)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-600 cursor-pointer">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleScheduleVisit}
                  disabled={saving || !scheduledAt}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Programando..." : "Programar visita"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal === "complete" && (
        // Hoja que sale desde abajo en el teléfono, como en la Agenda; un toque fuera con algo escrito pregunta antes (F10).
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[110] flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in" onClick={cerrarResultado}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Reportar resultado de la visita">
            <div className="flex justify-between items-center px-5 sm:px-6 py-3 border-b border-gray-100 bg-gray-50/50 shrink-0">
              <h3 className="font-black text-base text-gray-900">Reportar resultado de la visita</h3>
              <button
                type="button"
                onClick={cerrarResultado}
                className="w-11 h-11 -mr-2 rounded-xl hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center cursor-pointer transition-colors"
                aria-label="Cerrar ventana"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-1">
              <ElegirResultado valor={outcome} onElegir={setOutcome} />

              <div>
                <label htmlFor="resultado-visita" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Qué ocurrió *</label>
                <textarea
                  id="resultado-visita"
                  rows={3}
                  maxLength={LARGO_MAXIMO_RESUMEN_VISITA}
                  value={outcomeSummary}
                  onChange={e => setOutcomeSummary(e.target.value)}
                  placeholder="Acuerdos, compromisos o motivo por el que no se concretó."
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-base sm:text-sm font-medium text-gray-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <FrasesRapidas resultado={outcome} onFrase={(frase) => setOutcomeSummary((t) => agregarFrase(t, frase))} />

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={cerrarResultado} className="min-h-[48px] px-4 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-bold text-gray-600 cursor-pointer">
                  Ahora no
                </button>
                <button
                  type="button"
                  onClick={handleCompleteVisit}
                  disabled={saving || !outcomeSummary.trim()}
                  className="flex-1 sm:flex-none min-h-[48px] px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-extrabold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Guardar resultado"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
