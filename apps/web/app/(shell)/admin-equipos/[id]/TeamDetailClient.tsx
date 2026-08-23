"use client";

import { useState } from "react";
// @ts-ignore
import { Users, Plus, Shield, ArrowLeft, Trash, User } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Team = {
  id: string;
  name: string;
  zone: string | null;
  leaderName: string | null;
  leaderId: string;
};

type Member = {
  userId: string;
  displayName: string;
  roleName: string | null;
  joinedAt: Date;
};

type UserProfile = {
  id: string;
  displayName: string;
};

type Props = {
  team: Team;
  members: Member[];
  availableUsers: UserProfile[];
};

export default function TeamDetailClient({ team, members, availableUsers }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserId) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/teams/${team.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId })
      });
      if (res.ok) {
        setShowModal(false);
        setSelectedUserId("");
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Error al agregar integrante");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm("¿Seguro que quieres remover a este usuario de la brigada?")) return;
    setRemovingId(userId);
    try {
      const res = await fetch(`/api/admin/teams/${team.id}/members?userId=${userId}`, { 
        method: "DELETE" 
      });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Error al remover integrante");
      }
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin-equipos" className="w-10 h-10 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl flex items-center justify-center transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
            <Shield size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-blue-950 tracking-tight">{team.name}</h1>
            <p className="text-gray-500 mt-1">
              Líder: <strong>{team.leaderName}</strong> &bull; Zona: {team.zone || "Global"}
            </p>
          </div>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-all"
        >
          <Plus size={20} /> Agregar Integrante
        </button>
      </div>

      {/* MEMBERS TABLE */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {members.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-20 h-20 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users size={40} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No hay integrantes</h2>
            <p className="text-gray-500 mb-6">Esta brigada solo tiene a su líder. Agrega promotores u operadores.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider font-bold text-gray-500">
                <th className="p-4 pl-6">Nombre del Usuario</th>
                <th className="p-4">Rol en Sistema</th>
                <th className="p-4">Fecha de Ingreso</th>
                <th className="p-4 text-right pr-6">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((m) => (
                <tr key={m.userId} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 pl-6 font-bold text-gray-900 flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center">
                      <User size={16} />
                    </div>
                    {m.displayName}
                    {m.userId === team.leaderId && (
                      <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Líder</span>
                    )}
                  </td>
                  <td className="p-4 text-gray-700 font-medium capitalize">
                    {m.roleName || "Sin rol"}
                  </td>
                  <td className="p-4 text-gray-600">
                    {new Date(m.joinedAt).toLocaleDateString("es-MX")}
                  </td>
                  <td className="p-4 pr-6 text-right">
                    {m.userId !== team.leaderId && (
                      <button 
                        onClick={() => handleRemoveMember(m.userId)}
                        disabled={removingId === m.userId}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Remover"
                      >
                        {removingId === m.userId ? "..." : <Trash size={18} />}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-blue-950">Agregar Integrante</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
            </div>
            
            <form onSubmit={handleAddMember} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Usuario *</label>
                <select 
                  required
                  value={selectedUserId}
                  onChange={e => setSelectedUserId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
                >
                  <option value="" disabled>Selecciona un usuario...</option>
                  {availableUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.displayName}</option>
                  ))}
                </select>
                {availableUsers.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">No hay usuarios disponibles para agregar.</p>
                )}
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
                  disabled={saving || !selectedUserId}
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Agregando..." : "Agregar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
