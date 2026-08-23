"use client";

import { useState } from "react";
// @ts-ignore
import { Landmark, Users, Search, Plus, Map, Shield, X, Check } from "lucide-react";
import { useRouter } from "next/navigation";

type Representative = {
  id: string;
  sectionNum: number;
  sectionId: string;
  displayName: string;
  role: string;
  assignedAt: Date;
};

type UserProfile = {
  id: string;
  displayName: string;
};

type Section = {
  id: string;
  sectionNum: number;
};

type Props = {
  representatives: Representative[];
  availableUsers: UserProfile[];
  sections: Section[];
};

export default function EstructuraClient({ representatives, availableUsers, sections }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ sectionId: "", userId: "", role: "coordinador" });

  const filtered = representatives.filter(r => 
    r.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.sectionNum.toString().includes(searchTerm)
  );

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!form.sectionId || !form.userId) return;

    setSaving(true);
    try {
      const res = await fetch("/api/electoral/representatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setShowModal(false);
        setForm({ sectionId: "", userId: "", role: "coordinador" });
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Error al asignar");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
            <Landmark size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-blue-950 tracking-tight">Estructura Electoral</h1>
            <p className="text-gray-500 mt-1">Gestión de coordinadores y representantes de casilla por sección.</p>
          </div>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-all"
        >
          <Plus size={20} /> Asignar Representante
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por sección o nombre..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-20 h-20 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users size={40} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No hay asignaciones</h2>
            <p className="text-gray-500 mb-6">Aún no hay representantes o coordinadores asignados a las secciones electorales.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider font-bold text-gray-500">
                  <th className="p-4 pl-6">Sección</th>
                  <th className="p-4">Representante</th>
                  <th className="p-4">Rol</th>
                  <th className="p-4">Fecha de Asignación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 pl-6 font-bold text-gray-900 flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center">
                        <Map size={16} />
                      </div>
                      Sección {r.sectionNum}
                    </td>
                    <td className="p-4 text-gray-700 font-medium">
                      {r.displayName}
                    </td>
                    <td className="p-4">
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold uppercase rounded-full tracking-wider border border-blue-100">
                        {r.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 text-sm">
                      {new Date(r.assignedAt).toLocaleDateString("es-MX")}
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
              <h2 className="text-xl font-bold text-blue-950">Asignar Representante</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAssign} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Sección Electoral *</label>
                <select 
                  required
                  value={form.sectionId}
                  onChange={e => setForm({...form, sectionId: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  <option value="" disabled>Selecciona una sección...</option>
                  {sections.map(s => (
                    <option key={s.id} value={s.id}>Sección {s.sectionNum}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Usuario *</label>
                <select 
                  required
                  value={form.userId}
                  onChange={e => setForm({...form, userId: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  <option value="" disabled>Selecciona un usuario...</option>
                  {availableUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.displayName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Rol *</label>
                <select 
                  required
                  value={form.role}
                  onChange={e => setForm({...form, role: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  <option value="coordinador">Coordinador de Sección</option>
                  <option value="representante_casilla">Representante de Casilla</option>
                  <option value="representante_general">Representante General</option>
                </select>
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
                  disabled={saving || !form.sectionId || !form.userId}
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Asignar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
