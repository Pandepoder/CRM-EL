"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { 
  MapPin, User, Calendar, CheckCircle, Clock,
  AlertCircle, X, Phone, Trash2, MessageSquare, Sparkles, Send, ImageIcon,
  Search, ClipboardList, CalendarDays, Plus
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ColonySelector } from "@/components/ColonySelector";

type ContactDetail = {
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
  visit_scheduled_at_in_past: "La fecha de la visita no puede estar en el pasado."
};

function motivoVisita(err: { code?: string; message?: string } | null): string | null {
  if (!err) return null;
  return (err.code && MOTIVOS_VISITA[err.code]) || err.message || null;
}

const OUTCOME_LABELS: Record<string, string> = {
  successful: "Exitosa",
  no_contact: "Sin Contacto",
  follow_up_required: "Requiere Seguimiento",
  rejected: "Rechazada",
};

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [detail, setDetail] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalType>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // New note form state
  const [newNoteText, setNewNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Modal-specific state
  const [users, setUsers] = useState<UserItem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedColonyId, setSelectedColonyId] = useState("");
  const [selectedColonyName, setSelectedColonyName] = useState("");
  const [selectedMunicipality, setSelectedMunicipality] = useState("Tonalá");
  const [selectedSectionNum, setSelectedSectionNum] = useState<number | undefined>(undefined);
  const [scheduledAt, setScheduledAt] = useState("");
  const [visitLocation, setVisitLocation] = useState("");
  const [outcomeVisitId, setOutcomeVisitId] = useState("");
  const [outcome, setOutcome] = useState("successful");
  const [outcomeSummary, setOutcomeSummary] = useState("");

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/crm/contacts/${id}`);
      const data = await res.json();
      setDetail(data as ContactDetail);
    } catch (err) {
      console.error(err);
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

  async function handleAssignTerritory() {
    setSaving(true);
    try {
      const res = await fetch(`/api/crm/contacts/${id}/territory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          colonyId: selectedColonyId,
          colonyName: selectedColonyName || selectedColonyId,
          municipality: selectedMunicipality,
          sectionNum: selectedSectionNum
        }),
      });
      if (!res.ok) throw new Error("Error al asignar territorio");
      await fetchDetail();
      setModal(null);
      setSelectedColonyId("");
      setSelectedColonyName("");
      showToast("success", "Territorio y sección actualizados correctamente.");
    } catch {
      showToast("error", "No se pudo asignar el territorio.");
    } finally {
      setSaving(false);
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
      if (!res.ok) throw new Error("Error al asignar responsable");
      await fetchDetail();
      setModal(null);
      setSelectedUserId("");
      showToast("success", "Responsable asignado correctamente.");
    } catch {
      showToast("error", "No se pudo asignar el responsable.");
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
    try {
      const res = await fetch(`/api/crm/contacts/${id}/visits/${outcomeVisitId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ structuredOutcome: outcome, summary: outcomeSummary }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(motivoVisita(err) || "No se pudo completar la visita.");
      }
      await fetchDetail();
      setModal(null);
      setOutcome("successful");
      setOutcomeSummary("");
      showToast("success", "Visita marcada como completada.");
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "No se pudo completar la visita.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteContact() {
    if (!confirm("¿Estás seguro de que deseas eliminar este contacto? Esta acción lo desactivará.")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/crm/contacts/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Error al eliminar contacto");
      showToast("success", "Contacto eliminado.");
      setTimeout(() => {
        router.push("/crm/contacts");
      }, 1000);
    } catch {
      showToast("error", "No se pudo eliminar el contacto.");
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh] flex-col gap-3">
      <div className="w-10 h-10 border-3 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
      <p className="text-gray-500 text-xs font-bold">Cargando ficha 360°...</p>
    </div>
  );

  if (!detail) return (
    <div className="text-center py-20 px-4">
      <Search size={48} className="mx-auto mb-4 text-gray-300" />
      <h2 className="text-xl font-bold text-gray-900 mb-2">Contacto no encontrado</h2>
      <p className="text-xs text-gray-500">El ID no es válido o fue eliminado.</p>
      <Link href="/crm/contacts" className="inline-block mt-5 text-blue-600 font-bold text-xs">
        ← Volver al directorio
      </Link>
    </div>
  );

  const isPan = detail.panMilitancy === "confirmada";
  const isPanDeclared = detail.panMilitancy === "declarada";

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
        ← Volver al Directorio General
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
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-400/20 text-blue-200 text-[10px] font-bold rounded-full border border-blue-400/30">
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
              <span className="px-2 py-0.5 bg-white/10 rounded-md text-[10px] uppercase font-bold text-cyan-200">
                Origen: {detail.origin ? detail.origin.replace("_", " ") : "Toca toca"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {detail.status !== "inactive" && (
            <button
              type="button"
              onClick={handleDeleteContact}
              disabled={saving}
              className="p-2.5 bg-white/10 hover:bg-rose-600 rounded-xl text-white transition-colors cursor-pointer"
              title="Eliminar contacto"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

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
              {detail.section?.sectionNum ? `Sección ${detail.section.sectionNum}` : "Sección no asignada"} · Tonalá
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
            <a
              href={detail.bardaPhotoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline font-bold block truncate"
            >
              <ImageIcon size={13} className="inline -mt-0.5 mr-1" /> Ver Fotografía de Barda / Espacio
            </a>
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
              <span className="font-extrabold text-gray-500 uppercase text-[10px] block mb-1">1. Prioridad en su colonia</span>
              <p className="font-bold text-gray-900">{detail.survey.colonyPriorityNeed || "No especificado"}</p>
            </div>

            <div className="p-3 bg-gray-50 rounded-2xl">
              <span className="font-extrabold text-gray-500 uppercase text-[10px] block mb-1">2. Lo que más valora de Tonalá</span>
              <p className="font-bold text-gray-900">{detail.survey.tonalaValues || "No especificado"}</p>
            </div>

            <div className="p-3 bg-gray-50 rounded-2xl">
              <span className="font-extrabold text-gray-500 uppercase text-[10px] block mb-1">3. Calificación de Servicios</span>
              <p className="font-bold text-gray-900">{detail.survey.servicesRating ? `${detail.survey.servicesRating} / 5` : "Sin calificar"} {detail.survey.servicesRatingWhy ? `· "${detail.survey.servicesRatingWhy}"` : ""}</p>
            </div>

            <div className="p-3 bg-gray-50 rounded-2xl">
              <span className="font-extrabold text-gray-500 uppercase text-[10px] block mb-1">4. Expectativa del Proyecto</span>
              <p className="font-bold text-gray-900">{detail.survey.projectExpectations || "No especificado"}</p>
            </div>

            <div className="p-3 bg-gray-50 rounded-2xl sm:col-span-2">
              <span className="font-extrabold text-gray-500 uppercase text-[10px] block mb-1">5. Forma de Participación</span>
              <p className="font-bold text-gray-900">{detail.survey.participationForm || "No especificado"}</p>
            </div>

            {detail.survey.openProposal && (
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl sm:col-span-2">
                <span className="font-extrabold text-indigo-800 uppercase text-[10px] block mb-1">6. Propuesta Libre</span>
                <p className="font-bold text-indigo-950 italic">"{detail.survey.openProposal}"</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TIMELINE DE NOTAS INMUTABLES CON AUTOR */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-5">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
          <MessageSquare size={18} className="text-blue-600" />
          <h3 className="font-extrabold text-sm text-gray-900 uppercase tracking-wider">
            Bitácora de Notas Fechadas ({detail.notes?.length || 0})
          </h3>
        </div>

        {/* ADD NOTE FORM */}
        <form onSubmit={handleAddNote} className="space-y-2">
          <textarea
            rows={2}
            value={newNoteText}
            onChange={e => setNewNoteText(e.target.value)}
            placeholder="Agregar una nueva nota fechada sobre este contacto..."
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
                <div className="flex items-center justify-between text-[10px]">
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
                      className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                        pendiente ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {pendiente ? "Pendiente" : OUTCOME_LABELS[v.outcome || ""] || "Completada"}
                    </span>
                  </div>

                  {v.summary ? (
                    <p className="text-xs text-gray-700 font-medium whitespace-pre-wrap">{v.summary}</p>
                  ) : null}

                  {pendiente ? (
                    <button
                      type="button"
                      onClick={() => {
                        setOutcomeVisitId(v.visitId);
                        setOutcome("successful");
                        setOutcomeSummary("");
                        setModal("complete");
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold cursor-pointer"
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
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in" onClick={() => setModal(null)}>
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl max-h-[88dvh] flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-5 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
              <h3 className="font-black text-sm text-gray-900">Editar Territorio y Colonia</h3>
              <button 
                type="button" 
                onClick={() => setModal(null)} 
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center cursor-pointer transition-colors"
                title="Cerrar ventana"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-1 pb-16">
              <ColonySelector
                municipality="Tonalá"
                defaultValue={detail.territory?.colonyName || ""}
                onChange={(c, s) => {
                  setSelectedColonyName(c);
                  setSelectedColonyId(c);
                  if (s) setSelectedSectionNum(typeof s === "number" ? s : parseInt(s, 10));
                }}
              />

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Sección Electoral</label>
                <input
                  type="number"
                  placeholder="Número de sección"
                  defaultValue={detail.section?.sectionNum || ""}
                  onChange={e => setSelectedSectionNum(parseInt(e.target.value, 10))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setModal(null)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-600 cursor-pointer">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAssignTerritory}
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Guardar Territorio"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal === "assignment" && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in" onClick={() => setModal(null)}>
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl max-h-[88dvh] flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-5 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
              <h3 className="font-black text-sm text-gray-900">Asignar Responsable de Enlace</h3>
              <button 
                type="button" 
                onClick={() => setModal(null)} 
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center cursor-pointer transition-colors"
                title="Cerrar ventana"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-1 pb-16">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Operador / Enlace Responsable</label>
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
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in" onClick={() => setModal(null)}>
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl max-h-[88dvh] flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-5 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
              <h3 className="font-black text-sm text-gray-900">Programar Visita Domiciliaria</h3>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center cursor-pointer transition-colors"
                title="Cerrar ventana"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-1 pb-16">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Fecha y hora *</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Punto de encuentro</label>
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
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in" onClick={() => setModal(null)}>
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl max-h-[88dvh] flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-5 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
              <h3 className="font-black text-sm text-gray-900">Reportar Resultado de la Visita</h3>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center cursor-pointer transition-colors"
                title="Cerrar ventana"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-1 pb-16">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Resultado</label>
                <select
                  value={outcome}
                  onChange={e => setOutcome(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:bg-white"
                >
                  {Object.entries(OUTCOME_LABELS).map(([valor, etiqueta]) => (
                    <option key={valor} value={valor}>{etiqueta}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Qué ocurrió *</label>
                <textarea
                  rows={4}
                  value={outcomeSummary}
                  onChange={e => setOutcomeSummary(e.target.value)}
                  placeholder="Acuerdos, compromisos o motivo por el que no se concretó."
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setModal(null)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-600 cursor-pointer">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCompleteVisit}
                  disabled={saving || !outcomeSummary.trim()}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
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
