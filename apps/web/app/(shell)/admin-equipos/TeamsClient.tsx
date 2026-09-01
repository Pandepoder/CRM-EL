"use client";

import { useState } from "react";
import { Users, Plus, MapPin, X, Edit, Trash, ArrowRight, User, Search, ChevronRight } from "lucide-react";
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
  membersCount?: number;
  contactsCount?: number;
  isMyTeam?: boolean;
};

type UserProfile = {
  id: string;
  displayName: string;
  roleKey?: string | null;
};

type Props = {
  teams: Team[];
  users: UserProfile[];
  isGlobalAdmin?: boolean;
  currentUserId?: string;
};

export default function TeamsClient({ teams, users, isGlobalAdmin = true, currentUserId }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState({ name: "", leaderId: "", zone: "Tonalá", municipality: "Tonalá", section: "" });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openCreateModal() {
    setEditingId(null);
    setForm({ name: "", leaderId: currentUserId || (users[0]?.id ?? ""), zone: "Tonalá", municipality: "Tonalá", section: "" });
    setShowModal(true);
  }

  function openEditModal(t: Team) {
    setEditingId(t.id);
    setForm({
      name: t.name,
      leaderId: t.leaderId,
      zone: t.zone || "Tonalá",
      municipality: t.municipality || "Tonalá",
      section: t.section || ""
    });
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
        setForm({ name: "", leaderId: "", zone: "Tonalá", municipality: "Tonalá", section: "" });
        router.refresh();
      } else {
        alert("Error al guardar equipo");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Seguro que quieres eliminar este equipo? Se conservarán los contactos registrados.")) return;
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

  // Filter teams by search term
  const filteredTeams = teams.filter(t => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      t.name.toLowerCase().includes(term) ||
      (t.leaderName && t.leaderName.toLowerCase().includes(term)) ||
      (t.municipality && t.municipality.toLowerCase().includes(term)) ||
      (t.section && t.section.toLowerCase().includes(term))
    );
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-md">
              Estructura & Redes de Trabajo
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-blue-950 tracking-tight">Gestión de Equipos y Redes</h1>
          <p className="text-gray-500 mt-1">
            Cada usuario cuenta con su propio equipo y concentra los ciudadanos que da de alta en campo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isGlobalAdmin && (
            <button
              onClick={openCreateModal}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all text-sm cursor-pointer active:scale-95"
            >
              <Plus size={16} /> Crear Nuevo Equipo
            </button>
          )}
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre de equipo, líder o sección..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
        </div>
        <div className="text-xs font-bold text-gray-500 self-end sm:self-center">
          Mostrando {filteredTeams.length} {filteredTeams.length === 1 ? "equipo" : "equipos"}
        </div>
      </div>

      {/* TEAMS GRID */}
      {filteredTeams.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No se encontraron equipos</h2>
          <p className="text-gray-500 max-w-sm mx-auto mb-6 text-sm">
            {searchTerm ? "No hay equipos que coincidan con tu búsqueda." : "No hay equipos configurados en este momento."}
          </p>
          {isGlobalAdmin && (
            <button
              onClick={openCreateModal}
              className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all text-sm"
            >
              Crear Primer Equipo
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((t) => (
            <div
              key={t.id}
              className={`bg-white rounded-3xl border shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden ${
                t.isMyTeam ? "border-blue-200 ring-2 ring-blue-500/10" : "border-gray-100"
              }`}
            >
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-700 rounded-2xl flex items-center justify-center shrink-0 shadow-sm font-bold text-lg">
                      {t.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 leading-snug flex items-center gap-1.5">
                        {t.name}
                        {t.isMyTeam && (
                          <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Mi Equipo
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={12} className="text-rose-500" />
                        {t.municipality || "Tonalá"} {t.section ? `· Secc #${t.section}` : ""}
                      </p>
                    </div>
                  </div>

                  {isGlobalAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(t)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={deletingId === t.id}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* LEADER INFO */}
                {t.leaderId ? (
                  <Link
                    href={`/perfil/${t.leaderId}`}
                    className="bg-gray-50/80 hover:bg-blue-50/80 rounded-2xl p-3 flex items-center gap-3 border border-gray-100 transition-colors group cursor-pointer"
                    title="Ver perfil 360°, personas subidas y agenda de este líder"
                  >
                    <div className="w-8 h-8 bg-blue-100 group-hover:bg-blue-600 text-blue-700 group-hover:text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors">
                      <User size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Líder Responsable</div>
                      <div className="text-xs font-bold text-gray-900 group-hover:text-blue-700 truncate transition-colors flex items-center gap-1">
                        <span>{t.leaderName || "Sin líder"}</span>
                        <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 text-blue-600 transition-opacity" />
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="bg-gray-50/80 rounded-2xl p-3 flex items-center gap-3 border border-gray-100">
                    <div className="w-8 h-8 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                      <User size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Líder Responsable</div>
                      <div className="text-xs font-bold text-gray-400 truncate">Sin líder asignado</div>
                    </div>
                  </div>
                )}

                {/* STATS BADGES */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-indigo-50/60 rounded-xl p-2.5 text-center border border-indigo-100/50">
                    <div className="text-lg font-black text-indigo-900">{t.membersCount ?? 1}</div>
                    <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Integrantes</div>
                  </div>

                  <div className="bg-emerald-50/60 rounded-xl p-2.5 text-center border border-emerald-100/50">
                    <div className="text-lg font-black text-emerald-900">{t.contactsCount ?? 0}</div>
                    <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Ciudadanos en Red</div>
                  </div>
                </div>
              </div>

              {/* FOOTER LINK */}
              <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-500">
                  {t.contactsCount ?? 0} registros capturados
                </span>
                <Link
                  href={`/admin-equipos/${t.id}`}
                  className="px-3.5 py-1.5 bg-white hover:bg-blue-50 text-blue-700 hover:text-blue-900 border border-gray-200 hover:border-blue-200 font-bold rounded-xl transition-all text-xs flex items-center gap-1 shadow-sm"
                >
                  Ver Equipo y Red <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl max-h-[88dvh] flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-base sm:text-lg font-bold">
                  {editingId ? "Editar Equipo / Brigada" : "Crear Nuevo Equipo"}
                </h2>
                <p className="text-xs text-blue-200 mt-0.5">
                  Organiza redes de trabajo y asigna a un líder responsable.
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setShowModal(false)} 
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-1 pb-16">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Nombre del Equipo / Red *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Brigada Loma Dorada o Red de Monse..."
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
                />
              </div>

              <div>
                <PredictiveCombobox
                  label="Líder del Equipo *"
                  required
                  allowCustom={false}
                  placeholder="Seleccionar usuario líder..."
                  value={form.leaderId}
                  onChange={(val) => setForm({ ...form, leaderId: val })}
                  options={users.map((u) => ({
                    value: u.id,
                    label: u.displayName,
                    badge: u.roleKey || "Usuario"
                  }))}
                  icon={<User size={13} className="text-blue-600" />}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <PredictiveCombobox
                    label="Municipio"
                    allowCustom={false}
                    value={form.municipality}
                    onChange={(val) => setForm({ ...form, municipality: val })}
                    options={[
                      { value: "Tonalá", label: "Tonalá", badge: "Principal" },
                      { value: "Guadalajara", label: "Guadalajara" },
                      { value: "San Pedro Tlaquepaque", label: "Tlaquepaque" },
                      { value: "Zapopan", label: "Zapopan" },
                      { value: "Tlajomulco de Zúñiga", label: "Tlajomulco" },
                      { value: "El Salto", label: "El Salto" },
                      { value: "Zapotlanejo", label: "Zapotlanejo" }
                    ]}
                    icon={<MapPin size={13} className="text-rose-500" />}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Sección Electoral (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 2704"
                    value={form.section}
                    onChange={(e) => setForm({ ...form, section: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Guardar Equipo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
