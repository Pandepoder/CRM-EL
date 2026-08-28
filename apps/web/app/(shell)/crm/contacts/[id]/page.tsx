"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { 
  MapPin, User, Calendar, CheckCircle, Clock, 
  AlertCircle, X, ChevronRight, Phone, Shield, Trash2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ColonySelector } from "@/components/ColonySelector";

// ─── Types ──────────────────────────────────────────────────────────────────

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
};

type UserItem = { userId: string; displayName: string; roleKey?: string };

type ModalType = "territory" | "assignment" | "schedule" | "complete" | null;

const OUTCOME_LABELS: Record<string, string> = {
  successful: "✅ Exitosa",
  no_contact: "📵 Sin Contacto",
  follow_up_required: "🔄 Requiere Seguimiento",
  rejected: "❌ Rechazada",
};

// ─── Modal Component ─────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div 
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
      onClick={onClose}
    >
      <div 
        style={{ background: "white", borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "480px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", position: "relative" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "var(--blue-950)" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [detail, setDetail] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalType>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Modal-specific state
  const [users, setUsers] = useState<UserItem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedColonyId, setSelectedColonyId] = useState("");
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

  // Load catalog data when modal opens

  // Load users when assignment or schedule modal opens
  useEffect(() => {
    if ((modal === "assignment" || modal === "schedule") && users.length === 0) {
      fetch("/api/crm/users")
        .then(r => r.json())
        .then((data: UserItem[]) => setUsers(data));
    }
  }, [modal, users.length]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleAssignTerritory() {
    if (!selectedColonyId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/crm/contacts/${id}/territory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colonyId: selectedColonyId }),
      });
      if (!res.ok) throw new Error("Error al asignar territorio");
      await fetchDetail();
      setModal(null);
      setSelectedColonyId("");
      showToast("success", "Territorio asignado correctamente.");
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
      if (!res.ok) throw new Error("Error al programar visita");
      await fetchDetail();
      setModal(null);
      setScheduledAt("");
      setVisitLocation("");
      showToast("success", "Visita programada exitosamente.");
    } catch {
      showToast("error", "No se pudo programar la visita.");
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
      if (!res.ok) throw new Error("Error al completar visita");
      await fetchDetail();
      setModal(null);
      setOutcome("successful");
      setOutcomeSummary("");
      showToast("success", "Visita marcada como completada.");
    } catch {
      showToast("error", "No se pudo completar la visita.");
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

  // ── Loading / Error states ───────────────────────────────────────────────

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", flexDirection: "column", gap: "12px" }}>
      <div style={{ width: "40px", height: "40px", border: "3px solid #e2e8f0", borderTop: "3px solid var(--blue-600)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <p style={{ color: "var(--muted)", fontSize: "14px" }}>Cargando ficha...</p>
    </div>
  );

  if (!detail) return (
    <div style={{ textAlign: "center", padding: "80px 24px" }}>
      <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</div>
      <h2 style={{ color: "var(--blue-950)", marginBottom: "8px" }}>Contacto no encontrado</h2>
      <p style={{ color: "var(--muted)" }}>El ID no es válido o fue eliminado.</p>
      <Link href="/crm/contacts" style={{ display: "inline-block", marginTop: "20px", color: "var(--blue-600)", fontWeight: 700 }}>← Volver al directorio</Link>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "24px" }}>

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: "fixed", top: "24px", right: "24px", zIndex: 100,
          display: "flex", alignItems: "center", gap: "12px",
          background: toast.type === "success" ? "#f0fdf4" : "#fef2f2",
          border: `1px solid ${toast.type === "success" ? "#bbf7d0" : "#fecaca"}`,
          color: toast.type === "success" ? "#166534" : "#991b1b",
          padding: "14px 20px", borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          fontWeight: 600, fontSize: "14px", maxWidth: "380px"
        }}>
          {toast.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toast.msg}
        </div>
      )}

      {/* Back link */}
      <Link href="/crm/contacts" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--muted)", fontSize: "14px", fontWeight: 600, marginBottom: "24px", textDecoration: "none" }}>
        ← Volver al directorio
      </Link>

      {/* Alerta de Inactivo */}
      {detail.status === "inactive" && (
        <div style={{ marginBottom: "20px", padding: "16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", color: "#991b1b", display: "flex", alignItems: "center", gap: "10px" }}>
          <AlertCircle size={20} />
          <div>
            <strong style={{ display: "block", fontSize: "14px" }}>Contacto Eliminado</strong>
            <span style={{ fontSize: "13px", opacity: 0.9 }}>Este registro está desactivado. El perfil se encuentra en modo de solo lectura.</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)", borderRadius: "20px", padding: "32px", color: "white", marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", filter: detail.status === "inactive" ? "grayscale(100%) opacity(0.8)" : "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ width: "64px", height: "64px", background: "rgba(255,255,255,0.15)", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <User size={32} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 800, letterSpacing: "-0.5px" }}>{detail.displayName}</h1>
            <div style={{ display: "flex", gap: "16px", marginTop: "6px", opacity: 0.8, fontSize: "14px" }}>
              {detail.phoneNumber && (
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Phone size={14} /> {detail.phoneNumber}
                </span>
              )}
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Calendar size={14} /> Registrado: {new Date(detail.createdAt).toLocaleDateString("es-MX")}
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <span style={{ padding: "6px 16px", borderRadius: "999px", background: detail.status === "active" ? "#22c55e" : "#64748b", fontWeight: 700, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {detail.status === "active" ? "Activo" : detail.status}
          </span>
          {detail.status !== "inactive" && (
            <button onClick={handleDeleteContact} disabled={saving} style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "8px", borderRadius: "10px", cursor: saving ? "not-allowed" : "pointer" }} title="Eliminar Contacto">
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Cards: Territorio + Responsable */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        
        {/* Territorio */}
        <div style={{ background: "white", borderRadius: "16px", border: "1px solid #f1f5f9", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", opacity: detail.status === "inactive" ? 0.6 : 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <div style={{ width: "36px", height: "36px", background: "#eff6ff", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MapPin size={18} color="#2563eb" />
            </div>
            <h3 style={{ margin: 0, fontWeight: 700, color: "var(--blue-950)", fontSize: "15px" }}>Territorio Asignado</h3>
          </div>
          {detail.section && (
            <div style={{ marginBottom: "12px" }}>
              <p style={{ margin: "0 0 4px", fontSize: "13px", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Sección Electoral</p>
              <p style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--blue-900)" }}>{detail.section.sectionNum}</p>
            </div>
          )}
          {detail.territory ? (
            <div style={{ marginBottom: "16px" }}>
              <p style={{ margin: "0 0 6px", fontSize: "20px", fontWeight: 800, color: "var(--blue-950)" }}>{detail.territory.colonyName}</p>
              <span style={{ display: "inline-block", padding: "2px 10px", background: "#dcfce7", color: "#166534", borderRadius: "999px", fontSize: "12px", fontWeight: 700 }}>
                {detail.territory.territoryStatus}
              </span>
            </div>
          ) : (
            <p style={{ color: "var(--muted)", fontSize: "14px", marginBottom: "16px" }}>Sin colonia asignada aún.</p>
          )}
          {detail.status !== "inactive" && (
            <button
              onClick={() => setModal("territory")}
              style={{ display: "flex", alignItems: "center", gap: "6px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "8px 16px", cursor: "pointer", fontSize: "13px", fontWeight: 700, color: "#1e3a8a", width: "100%", justifyContent: "center" }}
            >
              {detail.territory ? "Cambiar Colonia" : "Asignar Colonia"} <ChevronRight size={14} />
            </button>
          )}
        </div>

        {/* Responsable */}
        <div style={{ background: "white", borderRadius: "16px", border: "1px solid #f1f5f9", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", opacity: detail.status === "inactive" ? 0.6 : 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <div style={{ width: "36px", height: "36px", background: "#f5f3ff", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield size={18} color="#7c3aed" />
            </div>
            <h3 style={{ margin: 0, fontWeight: 700, color: "var(--blue-950)", fontSize: "15px" }}>Responsable Operativo</h3>
          </div>
          {detail.assignment ? (
            <div style={{ marginBottom: "16px" }}>
              <p style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: 800, color: "var(--blue-950)" }}>{detail.assignment.assignedUserName}</p>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)" }}>
                Asignado el {new Date(detail.assignment.assignedAt).toLocaleDateString("es-MX")}
              </p>
            </div>
          ) : (
            <p style={{ color: "var(--muted)", fontSize: "14px", marginBottom: "16px" }}>Sin responsable asignado.</p>
          )}
          {detail.status !== "inactive" && (
            <button
              onClick={() => setModal("assignment")}
              style={{ display: "flex", alignItems: "center", gap: "6px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "8px 16px", cursor: "pointer", fontSize: "13px", fontWeight: 700, color: "#5b21b6", width: "100%", justifyContent: "center" }}
            >
              {detail.assignment ? "Reasignar Responsable" : "Asignar Responsable"} <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Historial de Visitas */}
      <div style={{ background: "white", borderRadius: "16px", border: "1px solid #f1f5f9", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", background: "#fff7ed", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Calendar size={18} color="#ea580c" />
            </div>
            <h3 style={{ margin: 0, fontWeight: 700, color: "var(--blue-950)", fontSize: "15px" }}>
              Historial de Visitas
              <span style={{ marginLeft: "8px", background: "#f1f5f9", color: "#64748b", fontSize: "12px", fontWeight: 700, padding: "2px 8px", borderRadius: "999px" }}>
                {detail.visits.length}
              </span>
            </h3>
          </div>
          {detail.status !== "inactive" && (
            <button
              onClick={() => setModal("schedule")}
              style={{ display: "flex", alignItems: "center", gap: "6px", background: "#0f172a", color: "white", border: "none", borderRadius: "10px", padding: "10px 18px", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}
            >
              + Programar Visita
            </button>
          )}
        </div>

        {detail.visits.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
            <Calendar size={40} style={{ opacity: 0.3, marginBottom: "12px" }} />
            <p style={{ fontWeight: 600 }}>Sin visitas registradas</p>
            <p style={{ fontSize: "13px" }}>{detail.status !== "inactive" ? "Programa la primera visita con el botón de arriba." : ""}</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                  {["Fecha Programada", "Responsable", "Estado", "Resultado", "Resumen", "Acciones"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detail.visits.map(v => (
                  <tr key={v.visitId} style={{ borderBottom: "1px solid #f8fafc" }}>
                    <td style={{ padding: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Clock size={14} color="#94a3b8" />
                        <span style={{ fontWeight: 600 }}>{new Date(v.scheduledAt).toLocaleDateString("es-MX")}</span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#94a3b8", paddingLeft: "20px" }}>
                        {new Date(v.scheduledAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </td>
                    <td style={{ padding: "12px", color: "#475569" }}>{v.assignedUserName || "—"}</td>
                    <td style={{ padding: "12px" }}>
                      <span style={{
                        padding: "3px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
                        background: v.status === "completed" ? "#dcfce7" : "#fef9c3",
                        color: v.status === "completed" ? "#166534" : "#854d0e"
                      }}>
                        {v.status === "completed" ? "Completada" : "Pendiente"}
                      </span>
                    </td>
                    <td style={{ padding: "12px", fontSize: "13px", color: "#475569" }}>
                      {v.outcome ? OUTCOME_LABELS[v.outcome] ?? v.outcome : "—"}
                    </td>
                    <td style={{ padding: "12px", fontSize: "13px", color: "#475569", maxWidth: "200px" }}>
                      <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {v.summary || "—"}
                      </span>
                    </td>
                    <td style={{ padding: "12px" }}>
                      {v.status === "scheduled" && detail.status !== "inactive" && (
                        <button
                          onClick={() => { setOutcomeVisitId(v.visitId); setModal("complete"); }}
                          style={{ display: "flex", alignItems: "center", gap: "4px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "12px", fontWeight: 700, color: "#1d4ed8", whiteSpace: "nowrap" }}
                        >
                          <CheckCircle size={13} /> Reportar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODALES ─────────────────────────────────────────────────────────── */}

      {/* Modal: Asignar Territorio */}
      {modal === "territory" && (
        <Modal title="🗺️ Asignar Colonia" onClose={() => setModal(null)}>
          <p style={{ color: "var(--muted)", fontSize: "13px", marginBottom: "16px" }}>
            Selecciona la colonia donde reside o trabaja este ciudadano.
          </p>
          <div className="mb-5">
            <ColonySelector onSelect={(colonyId) => setSelectedColonyId(colonyId)} />
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => setModal(null)} style={{ flex: 1, padding: "12px", border: "1px solid #e2e8f0", borderRadius: "10px", background: "white", cursor: "pointer", fontWeight: 600, fontSize: "14px" }}>
              Cancelar
            </button>
            <button onClick={handleAssignTerritory} disabled={!selectedColonyId || saving} style={{ flex: 1, padding: "12px", border: "none", borderRadius: "10px", background: selectedColonyId ? "#1e3a8a" : "#cbd5e1", color: "white", cursor: selectedColonyId ? "pointer" : "not-allowed", fontWeight: 700, fontSize: "14px" }}>
              {saving ? "Guardando..." : "Confirmar"}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: Asignar Responsable */}
      {modal === "assignment" && (
        <Modal title="👤 Asignar Responsable" onClose={() => setModal(null)}>
          <p style={{ color: "var(--muted)", fontSize: "13px", marginBottom: "16px" }}>
            Elige el operador que se hará cargo de este ciudadano.
          </p>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", marginBottom: "8px" }}>
            Operador
          </label>
          <select
            value={selectedUserId}
            onChange={e => setSelectedUserId(e.target.value)}
            style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "14px", marginBottom: "20px", background: "#f8fafc", outline: "none" }}
          >
            <option value="">Seleccionar operador...</option>
            {users.map(u => (
              <option key={u.userId} value={u.userId}>{u.displayName}</option>
            ))}
          </select>
          {users.length === 0 && <p style={{ color: "var(--muted)", fontSize: "13px", textAlign: "center", marginBottom: "16px" }}>Cargando usuarios...</p>}
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => setModal(null)} style={{ flex: 1, padding: "12px", border: "1px solid #e2e8f0", borderRadius: "10px", background: "white", cursor: "pointer", fontWeight: 600, fontSize: "14px" }}>
              Cancelar
            </button>
            <button onClick={handleAssignResponsible} disabled={!selectedUserId || saving} style={{ flex: 1, padding: "12px", border: "none", borderRadius: "10px", background: selectedUserId ? "#5b21b6" : "#cbd5e1", color: "white", cursor: selectedUserId ? "pointer" : "not-allowed", fontWeight: 700, fontSize: "14px" }}>
              {saving ? "Guardando..." : "Confirmar"}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: Programar Visita */}
      {modal === "schedule" && (
        <Modal title="📅 Programar Visita" onClose={() => setModal(null)}>
          <p style={{ color: "var(--muted)", fontSize: "13px", marginBottom: "16px" }}>
            Programa una visita a <strong>{detail.displayName}</strong>.
          </p>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", marginBottom: "8px" }}>
            Fecha y hora *
          </label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "14px", marginBottom: "16px", background: "#f8fafc", outline: "none", boxSizing: "border-box" }}
          />
          <label style={{ display: "block", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", marginBottom: "8px" }}>
            Lugar de la visita
          </label>
          <input
            type="text"
            value={visitLocation}
            onChange={e => setVisitLocation(e.target.value)}
            placeholder="Ej. Casa del ciudadano, Colonia Centro"
            style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "14px", marginBottom: "20px", background: "#f8fafc", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
          />
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => setModal(null)} style={{ flex: 1, padding: "12px", border: "1px solid #e2e8f0", borderRadius: "10px", background: "white", cursor: "pointer", fontWeight: 600, fontSize: "14px" }}>
              Cancelar
            </button>
            <button onClick={handleScheduleVisit} disabled={!scheduledAt || saving} style={{ flex: 1, padding: "12px", border: "none", borderRadius: "10px", background: scheduledAt ? "#ea580c" : "#cbd5e1", color: "white", cursor: scheduledAt ? "pointer" : "not-allowed", fontWeight: 700, fontSize: "14px" }}>
              {saving ? "Guardando..." : "Programar"}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: Reportar Resultado */}
      {modal === "complete" && (
        <Modal title="✅ Reportar Resultado de Visita" onClose={() => setModal(null)}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", marginBottom: "10px" }}>
            Resultado obtenido
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
            {Object.entries(OUTCOME_LABELS).map(([value, label]) => (
              <label key={value} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", border: `2px solid ${outcome === value ? "#1d4ed8" : "#e2e8f0"}`, borderRadius: "10px", cursor: "pointer", background: outcome === value ? "#eff6ff" : "white", transition: "all 0.15s" }}>
                <input type="radio" name="outcome" value={value} checked={outcome === value} onChange={() => setOutcome(value)} style={{ accentColor: "#1d4ed8" }} />
                <span style={{ fontWeight: outcome === value ? 700 : 500, color: outcome === value ? "#1d4ed8" : "#374151" }}>{label}</span>
              </label>
            ))}
          </div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", marginBottom: "8px" }}>
            Notas del campo *
          </label>
          <textarea
            rows={3}
            value={outcomeSummary}
            onChange={e => setOutcomeSummary(e.target.value)}
            placeholder="Describe brevemente lo que ocurrió durante la visita..."
            style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "14px", marginBottom: "20px", background: "#f8fafc", outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
          />
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => setModal(null)} style={{ flex: 1, padding: "12px", border: "1px solid #e2e8f0", borderRadius: "10px", background: "white", cursor: "pointer", fontWeight: 600, fontSize: "14px" }}>
              Cancelar
            </button>
            <button onClick={handleCompleteVisit} disabled={!outcomeSummary.trim() || saving} style={{ flex: 1, padding: "12px", border: "none", borderRadius: "10px", background: outcomeSummary.trim() ? "#059669" : "#cbd5e1", color: "white", cursor: outcomeSummary.trim() ? "pointer" : "not-allowed", fontWeight: 700, fontSize: "14px" }}>
              {saving ? "Guardando..." : "Completar Visita"}
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
}


