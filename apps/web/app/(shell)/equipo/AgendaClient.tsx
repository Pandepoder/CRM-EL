"use client";

import { useState } from "react";
// @ts-ignore
import { Calendar, MapPin, CheckCircle, Clock, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type AgendaItem = {
  id: string;
  type: "visit" | "event";
  status: string;
  scheduledAt: Date;
  title: string;
  location: string;
  contactId?: string;
  category?: string;
};

export default function AgendaClient({ items, filter }: { items: AgendaItem[], filter: string }) {
  const router = useRouter();
  const [modalVisit, setModalVisit] = useState<AgendaItem | null>(null);
  const [outcome, setOutcome] = useState("successful");
  const [outcomeSummary, setOutcomeSummary] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCompleteVisit(e: React.FormEvent) {
    e.preventDefault();
    if (!modalVisit || !outcomeSummary) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/crm/contacts/${modalVisit.contactId}/visits/${modalVisit.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ structuredOutcome: outcome, summary: outcomeSummary })
      });
      if (res.ok) {
        setModalVisit(null);
        setOutcomeSummary("");
        setOutcome("successful");
        router.refresh();
      } else {
        alert("Error al reportar resultado");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-blue-950 tracking-tight">Mi Agenda Operativa</h1>
          <p className="text-gray-500 mt-1">Visitas y tareas asignadas para tu gestión.</p>
        </div>
        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
          <Link href="/equipo?filter=hoy" className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${filter === 'hoy' ? 'bg-white shadow-sm text-blue-900' : 'text-gray-500 hover:text-gray-700'}`}>Hoy</Link>
          <Link href="/equipo?filter=semana" className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${filter === 'semana' ? 'bg-white shadow-sm text-blue-900' : 'text-gray-500 hover:text-gray-700'}`}>Esta Semana</Link>
          <Link href="/equipo?filter=todas" className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${filter === 'todas' ? 'bg-white shadow-sm text-blue-900' : 'text-gray-500 hover:text-gray-700'}`}>Todas</Link>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center shadow-sm flex flex-col items-center">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4">
            <CheckCircle size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Todo despejado!</h2>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            No tienes visitas asignadas para este periodo.
          </p>
          <Link href="/crm" className="px-6 py-3 bg-blue-950 text-white font-bold rounded-xl hover:bg-blue-900 shadow-sm transition-all">
            Ver mi Directorio
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map(v => (
            <div key={v.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${v.type === 'event' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                  <Calendar size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{v.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                    <span className="flex items-center gap-1"><Clock size={16} /> {new Date(v.scheduledAt).toLocaleString("es-MX", {dateStyle: 'medium', timeStyle: 'short'})}</span>
                    <span className="flex items-center gap-1"><MapPin size={16} /> {v.location}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full ${v.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {v.status === 'completed' ? 'Completada' : (v.type === 'event' ? 'Reporte' : 'Pendiente')}
                </span>
                
                {v.type === 'visit' && v.contactId && (
                  <Link href={`/crm/${v.contactId}`} className="px-4 py-2 bg-gray-50 text-gray-700 font-bold rounded-lg border border-gray-200 hover:bg-gray-100 transition-all text-sm">
                    Ver Ficha
                  </Link>
                )}
                
                {v.type === 'visit' && v.status !== 'completed' && (
                  <button 
                    onClick={() => setModalVisit(v)}
                    className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-sm transition-all text-sm"
                  >
                    Reportar Resultado
                  </button>
                )}
                {v.type === 'event' && v.status !== 'resolved' && (
                  <button className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-sm transition-all text-sm">
                    Atender
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Reportar Resultado */}
      {modalVisit && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-blue-950">Reportar Resultado</h2>
              <button onClick={() => setModalVisit(null)} className="text-gray-400 hover:text-gray-600 p-1"><X size={20}/></button>
            </div>
            <form onSubmit={handleCompleteVisit} className="p-6 space-y-5">
              <p className="text-sm text-gray-500 mb-2">
                Reporta la visita realizada a <strong>{modalVisit.title}</strong> el {new Date(modalVisit.scheduledAt).toLocaleDateString("es-MX")}.
              </p>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Resultado</label>
                <select 
                  value={outcome}
                  onChange={e => setOutcome(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="successful">✅ Visita Exitosa</option>
                  <option value="no_contact">❌ No se encontró a la persona</option>
                  <option value="follow_up_required">🔄 Requiere Seguimiento</option>
                  <option value="rejected">🛑 Rechazo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Resumen *</label>
                <textarea 
                  required
                  rows={3}
                  value={outcomeSummary}
                  onChange={e => setOutcomeSummary(e.target.value)}
                  placeholder="Detalles de la visita..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setModalVisit(null)} className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={saving || !outcomeSummary} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                  {saving ? "Guardando..." : "Completar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
