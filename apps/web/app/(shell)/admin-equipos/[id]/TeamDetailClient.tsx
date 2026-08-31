"use client";

import { useState } from "react";
// @ts-ignore
import { Users, Plus, Shield, ArrowLeft, Trash, User, Search, MapPin, ArrowRight, UserPlus, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PredictiveCombobox } from "@/components/PredictiveCombobox";

type Team = {
  id: string;
  name: string;
  zone: string | null;
  leaderName: string | null;
  leaderId: string;
  municipality?: string | null;
  section?: string | null;
};

type Member = {
  userId: string;
  displayName: string;
  roleName: string | null;
  joinedAt: string | Date;
};

type ContactItem = {
  id: string;
  displayName: string;
  phone?: string | null;
  colony?: string | null;
  municipality?: string | null;
  sectionNum?: number | null;
  status: string;
  createdAt: string | Date;
  createdByName: string;
  createdByUserId?: string | null;
};

type UserProfile = {
  id: string;
  displayName: string;
};

type Props = {
  team: Team;
  members: Member[];
  contacts: ContactItem[];
  availableUsers: UserProfile[];
  canManage?: boolean;
  currentUserId?: string;
};

export default function TeamDetailClient({
  team,
  members,
  contacts,
  availableUsers,
  canManage = true,
  currentUserId
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"contacts" | "members">("contacts");
  const [showModal, setShowModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [contactSearch, setContactSearch] = useState("");

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
    if (!confirm("¿Seguro que quieres remover a este usuario del equipo?")) return;
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

  // Filter contacts by search
  const filteredContacts = contacts.filter((c) => {
    if (!contactSearch.trim()) return true;
    const term = contactSearch.toLowerCase();
    return (
      c.displayName.toLowerCase().includes(term) ||
      (c.phone && c.phone.toLowerCase().includes(term)) ||
      (c.colony && c.colony.toLowerCase().includes(term)) ||
      (c.createdByName && c.createdByName.toLowerCase().includes(term)) ||
      (c.sectionNum && String(c.sectionNum).includes(term))
    );
  });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin-equipos"
            className="w-10 h-10 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl flex items-center justify-center transition-colors shrink-0"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="w-14 h-14 bg-indigo-50 text-indigo-700 rounded-2xl flex items-center justify-center shadow-sm shrink-0 font-black text-xl">
            {team.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-extrabold text-blue-950 tracking-tight">{team.name}</h1>
              {team.leaderId === currentUserId && (
                <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Mi Equipo
                </span>
              )}
            </div>
            <p className="text-gray-500 text-xs md:text-sm mt-0.5 flex items-center gap-2 flex-wrap">
              <span>
                👤 Líder:{" "}
                {team.leaderId ? (
                  <Link
                    href={`/perfil/${team.leaderId}`}
                    className="text-blue-700 hover:text-blue-900 font-bold hover:underline"
                    title="Ver perfil 360°, contactos y agenda de este líder"
                  >
                    {team.leaderName || "Sin líder"}
                  </Link>
                ) : (
                  <strong className="text-gray-800">{team.leaderName || "Sin líder"}</strong>
                )}
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1"><MapPin size={12} className="text-rose-500" /> {team.municipality || "Tonalá"} {team.section ? `· Secc #${team.section}` : ""}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/crm/nuevo"
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-all text-xs"
          >
            <Plus size={15} /> Registrar Ciudadano
          </Link>
          {canManage && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-all text-xs"
            >
              <UserPlus size={15} /> Agregar Operador
            </button>
          )}
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Users size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">{contacts.length}</div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ciudadanos en su Red</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Shield size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">{members.length}</div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Integrantes del Equipo</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <MapPin size={24} />
          </div>
          <div>
            <div className="text-base font-black text-gray-900">{team.municipality || "Tonalá"}</div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">{team.section ? `Sección #${team.section}` : "Cobertura Municipal"}</div>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-gray-200 gap-6">
        <button
          onClick={() => setActiveTab("contacts")}
          className={`pb-3 font-bold text-sm transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "contacts"
              ? "border-blue-600 text-blue-900"
              : "border-transparent text-gray-400 hover:text-gray-700"
          }`}
        >
          <Users size={16} />
          Ciudadanos Registrados por el Equipo ({contacts.length})
        </button>
        <button
          onClick={() => setActiveTab("members")}
          className={`pb-3 font-bold text-sm transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "members"
              ? "border-blue-600 text-blue-900"
              : "border-transparent text-gray-400 hover:text-gray-700"
          }`}
        >
          <Shield size={16} />
          Integrantes y Operadores ({members.length})
        </button>
      </div>

      {/* TAB 1: CONTACTS REGISTERED BY THIS TEAM */}
      {activeTab === "contacts" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar ciudadano, colonia, teléfono o sección..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="text-xs font-bold text-gray-500">
              {filteredContacts.length} {filteredContacts.length === 1 ? "registro" : "registros"}
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            {filteredContacts.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {contactSearch ? "No hay coincidencias con tu búsqueda" : "No hay ciudadanos registrados en esta red"}
                </h3>
                <p className="text-gray-500 text-xs max-w-md mx-auto mb-6">
                  Todos los ciudadanos que tú o los miembros de este equipo den de alta en el sistema se concentrarán aquí automáticamente.
                </p>
                <Link
                  href="/crm/nuevo"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all inline-flex items-center gap-1.5"
                >
                  <Plus size={14} /> Dar de Alta Primer Ciudadano
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-[11px] uppercase tracking-wider font-bold text-gray-500">
                      <th className="p-4 pl-6">Ciudadano</th>
                      <th className="p-4">Teléfono</th>
                      <th className="p-4">Colonia / Sección</th>
                      <th className="p-4">Registrado Por</th>
                      <th className="p-4">Fecha de Alta</th>
                      <th className="p-4 text-right pr-6">Ficha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {filteredContacts.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="p-4 pl-6 font-bold text-gray-900 flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                            {c.displayName.charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate max-w-[200px]">{c.displayName}</span>
                        </td>
                        <td className="p-4 text-gray-600 font-medium">
                          {c.phone || "—"}
                        </td>
                        <td className="p-4 text-gray-700">
                          <div className="font-semibold">{c.colony || "Tonalá"}</div>
                          {c.sectionNum && (
                            <div className="text-[10px] text-gray-400 font-bold">Secc #{c.sectionNum}</div>
                          )}
                        </td>
                        <td className="p-4 text-indigo-900 font-semibold">
                          {c.createdByUserId ? (
                            <Link
                              href={`/perfil/${c.createdByUserId}`}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-900 hover:text-indigo-950 px-2 py-0.5 rounded-md border border-indigo-100/60 text-[11px] inline-flex items-center gap-1 transition-colors"
                              title="Ver perfil 360° del capturista"
                            >
                              <User size={10} className="text-indigo-600" />
                              <span>{c.createdByName}</span>
                            </Link>
                          ) : (
                            <span className="bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100/60 text-[11px]">
                              {c.createdByName}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-gray-500">
                          {new Date(c.createdAt).toLocaleDateString("es-MX", { dateStyle: "medium" })}
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <Link
                            href={`/crm/contacts/${c.id}`}
                            className="px-3 py-1 bg-gray-50 hover:bg-blue-50 text-blue-700 font-bold rounded-lg border border-gray-200 hover:border-blue-200 transition-all text-[11px] inline-flex items-center gap-1"
                          >
                            Ver <ArrowRight size={11} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TEAM MEMBERS */}
      {activeTab === "members" && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          {members.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users size={32} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">No hay integrantes adicionales</h2>
              <p className="text-gray-500 text-xs mb-6">Este equipo solo cuenta con su líder. Agrega operadores o brigadistas.</p>
              {canManage && (
                <button
                  onClick={() => setShowModal(true)}
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700"
                >
                  Agregar Integrante
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-[11px] uppercase tracking-wider font-bold text-gray-500">
                    <th className="p-4 pl-6">Nombre del Usuario</th>
                    <th className="p-4">Rol en Sistema</th>
                    <th className="p-4">Fecha de Ingreso</th>
                    <th className="p-4 text-right pr-6">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {members.map((m) => (
                    <tr key={m.userId} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 pl-6 font-bold text-gray-900 flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center">
                          <User size={15} />
                        </div>
                        <Link
                          href={`/perfil/${m.userId}`}
                          className="hover:text-blue-600 hover:underline transition-colors flex items-center gap-1.5"
                          title="Ver perfil 360° de este integrante"
                        >
                          <span>{m.displayName}</span>
                        </Link>
                        {m.userId === team.leaderId && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                            Líder
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-gray-700 font-medium capitalize">
                        {m.roleName || "Operador"}
                      </td>
                      <td className="p-4 text-gray-600">
                        {new Date(m.joinedAt).toLocaleDateString("es-MX")}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        {canManage && m.userId !== team.leaderId && (
                          <button
                            onClick={() => handleRemoveMember(m.userId)}
                            disabled={removingId === m.userId}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                            title="Remover"
                          >
                            {removingId === m.userId ? "..." : <Trash size={16} />}
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
      )}

      {/* MODAL AGREGAR INTEGRANTE */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh] animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-900 to-blue-900 text-white flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold">Agregar Integrante al Equipo</h2>
                <p className="text-xs text-indigo-200 mt-0.5">{team.name}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMember} className="p-6 space-y-5">
              <div>
                <PredictiveCombobox
                  label="Usuario Integrante *"
                  required
                  allowCustom={false}
                  placeholder="Buscar usuario por nombre..."
                  value={selectedUserId}
                  onChange={(val) => setSelectedUserId(val)}
                  options={availableUsers.map((u) => ({
                    value: u.id,
                    label: u.displayName,
                    badge: "Disponible"
                  }))}
                  icon={<User size={13} className="text-blue-600" />}
                  helperText="Selecciona al usuario que formará parte de esta red de trabajo"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !selectedUserId}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Agregando..." : "Confirmar Integrante"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
