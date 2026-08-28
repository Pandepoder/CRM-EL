"use client";

import { useState } from "react";
// @ts-ignore
import { Users, Plus, ShieldAlert, MapPin, Shield, X, Edit, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Team = {
  id: string;
  name: string;
  zone: string | null;
  leaderName: string | null;
  leaderId: string;
  municipality?: string | null;
  section?: string | null;
};

type UserProfile = {
  id: string;
  displayName: string;
};

type Props = {
  teams: Team[];
  users: UserProfile[];
};

export default function TeamsClient({ teams, users }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", leaderId: "", zone: "", municipality: "Guadalajara", section: "" });

  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openCreateModal() {
    setEditingId(null);
    setForm({ name: "", leaderId: "", zone: "", municipality: "Guadalajara", section: "" });
    setShowModal(true);
  }

  function openEditModal(t: Team) {
    setEditingId(t.id);
    setForm({ name: t.name, leaderId: t.leaderId, zone: t.zone || "", municipality: t.municipality || "Guadalajara", section: t.section || "" });
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.leaderId) return;

    setSaving(true);
    try {
      const url = editingId ? `/api/admin/teams/${editingId}` : "/api/admin/teams";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setShowModal(false);
        setForm({ name: "", leaderId: "", zone: "", municipality: "Guadalajara", section: "" });
        router.refresh();
      } else {
        alert("Error al guardar equipo");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Seguro que quieres eliminar esta brigada? Se eliminarán también las asignaciones de sus miembros.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/teams/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Error al eliminar");
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
            <Users size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-blue-950 tracking-tight">Gestión de Equipos</h1>
            <p className="text-gray-500 mt-1">Administra brigadas operativas y asigna líderes territoriales.</p>
          </div>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-all"
        >
          <Plus size={20} /> Nueva Brigada
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {teams.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-20 h-20 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert size={40} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No hay brigadas creadas</h2>
            <p className="text-gray-500 mb-6">Aún no tienes equipos operativos configurados en el sistema.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider font-bold text-gray-500">
                  <th className="p-4 pl-6">Nombre de la Brigada</th>
                  <th className="p-4">Líder Asignado</th>
                  <th className="p-4">Zona de Operación</th>
                  <th className="p-4 text-right pr-6">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {teams.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 pl-6 font-bold text-gray-900 flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center">
                        <Shield size={16} />
                      </div>
                      {t.name}
                    </td>
                    <td className="p-4 text-gray-700 font-medium">
                      {t.leaderName || <span className="text-gray-400 italic">Sin Líder</span>}
                    </td>
                    <td className="p-4 text-gray-600">
                      <span className="flex items-center gap-1"><MapPin size={16} className="text-gray-400"/> {t.zone || "Global"}</span>
                      <div className="text-xs text-gray-400 mt-1">{t.municipality || ""} {t.section ? `- Sec. ${t.section}` : ""}</div>
                    </td>
                    <td className="p-4 pr-6 text-right space-x-2">
                      <Link 
                        href={`/admin-equipos/${t.id}`}
                        className="inline-block px-4 py-2 bg-white border border-gray-200 text-indigo-700 font-bold rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        Ver Integrantes
                      </Link>
                      <button 
                        onClick={() => openEditModal(t)}
                        className="inline-block px-3 py-2 bg-white border border-gray-200 text-gray-600 font-bold rounded-lg hover:bg-gray-50 transition-colors text-sm"
                        title="Editar Brigada"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(t.id)}
                        disabled={deletingId === t.id}
                        className="inline-block px-3 py-2 bg-white border border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-50 transition-colors text-sm disabled:opacity-50"
                        title="Eliminar Brigada"
                      >
                        {deletingId === t.id ? "..." : <Trash size={16} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-blue-950">{editingId ? "Editar Brigada" : "Nueva Brigada"}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Nombre del Equipo *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej. Brigada Centro"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Líder *</label>
                <select 
                  required
                  value={form.leaderId}
                  onChange={e => setForm({...form, leaderId: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
                >
                  <option value="" disabled>Selecciona un líder...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.displayName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Zona (Opcional)</label>
                <input 
                  type="text" 
                  placeholder="Ej. Sector 1"
                  value={form.zone}
                  onChange={e => setForm({...form, zone: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Municipio</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Guadalajara"
                    value={form.municipality}
                    onChange={e => setForm({...form, municipality: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Sección</label>
                  <input 
                    type="text" 
                    placeholder="Ej. 1234"
                    value={form.section}
                    onChange={e => setForm({...form, section: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={saving || !form.name || !form.leaderId}
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Guardando..." : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
