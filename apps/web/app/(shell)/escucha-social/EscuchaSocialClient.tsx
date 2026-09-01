"use client";

import { useState } from "react";
import {
  Plus, Search, Filter, MapPin, MessageSquare, Check, X,
  Lightbulb, AlertTriangle, Handshake, RefreshCw, Landmark
} from "lucide-react";
import type { ComponentType } from "react";

type CategoryIcon = ComponentType<{ size?: number | string; className?: string }>;
import type { LocationValue } from "@/components/LocationPicker";
import { LocationPicker } from "@/components/LocationPicker";

type SocialListeningItem = {
  id: string;
  contactId: string | null;
  categories: string[];
  title: string;
  description: string;
  photoUrls: string[];
  latitude: number | null;
  longitude: number | null;
  locationText: string | null;
  status: string;
  isFormalGestion: number;
  approvedByUserId: string | null;
  resolutionNotes: string | null;
  createdByUserId: string;
  createdByName: string | null;
  createdAt: string;
};

export default function EscuchaSocialClient({
  initialItems,
  isCoordinacion,
  currentUserId
}: {
  initialItems: SocialListeningItem[];
  isCoordinacion: boolean;
  currentUserId: string;
}) {
  const [items, setItems] = useState<SocialListeningItem[]>(initialItems);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // New Report Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("propuesta");
  const [locationText, setLocationText] = useState("");
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  // Selected item for detail / resolution modal
  const [selectedItem, setSelectedItem] = useState<SocialListeningItem | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.locationText && item.locationText.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" || item.status === statusFilter;

    if (activeTab === "gestiones") {
      return matchesSearch && matchesStatus && item.isFormalGestion === 1;
    }
    if (activeTab !== "all") {
      return matchesSearch && matchesStatus && item.categories.includes(activeTab);
    }
    return matchesSearch && matchesStatus;
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/escucha-social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          categories: [category],
          locationText,
          latitude: lat,
          longitude: lng
        })
      });

      if (res.ok) {
        const data = await res.json();
        setItems([data.item, ...items]);
        setIsModalOpen(false);
        setTitle("");
        setDescription("");
        setLocationText("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateStatus(newStatus: string) {
    if (!selectedItem) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/escucha-social/${selectedItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          resolutionNotes: resolutionNotes || selectedItem.resolutionNotes
        })
      });

      if (res.ok) {
        const data = await res.json();
        setItems(items.map(i => i.id === selectedItem.id ? { ...i, ...data.item } : i));
        setSelectedItem(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleToggleApproveGestion(approve: boolean) {
    if (!selectedItem) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/escucha-social/${selectedItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approveGestion: approve
        })
      });

      if (res.ok) {
        const data = await res.json();
        setItems(items.map(i => i.id === selectedItem.id ? { ...i, ...data.item } : i));
        setSelectedItem({ ...selectedItem, isFormalGestion: approve ? 1 : 0 });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingStatus(false);
    }
  }

  const categoryBadges: Record<string, { label: string; icon: CategoryIcon; bg: string; text: string }> = {
    propuesta: { label: "Idea / Propuesta", icon: Lightbulb, bg: "bg-amber-100", text: "text-amber-900" },
    problematica: { label: "Problemática", icon: AlertTriangle, bg: "bg-rose-100", text: "text-rose-900" },
    compromiso: { label: "Compromiso", icon: Handshake, bg: "bg-blue-100", text: "text-blue-900" },
    seguimiento: { label: "Seguimiento", icon: RefreshCw, bg: "bg-purple-100", text: "text-purple-900" },
    gestion: { label: "Gestión", icon: Landmark, bg: "bg-emerald-100", text: "text-emerald-900" },
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              Escucha Social
            </h1>
            <span className="text-xs font-black bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full">
              Comunitaria
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">
            Registro y seguimiento de propuestas, necesidades y compromisos ciudadanos en Tonalá
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all cursor-pointer"
        >
          <Plus size={16} />
          <span>Registrar Escucha Social</span>
        </button>
      </div>

      {/* TABS DE CATEGORÍA */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-gray-200 text-xs font-bold">
        {[
          { id: "all", label: "Todas las Entradas", icon: null },
          { id: "propuesta", label: "Ideas / Propuestas", icon: Lightbulb },
          { id: "problematica", label: "Problemáticas", icon: AlertTriangle },
          { id: "compromiso", label: "Compromisos", icon: Handshake },
          { id: "seguimiento", label: "Seguimiento", icon: RefreshCw },
          { id: "gestiones", label: "Gestiones Formales", icon: Landmark },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 ${
              activeTab === tab.id
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-gray-100 hover:bg-gray-200 text-gray-600"
            }`}
          >
            {tab.icon && <tab.icon size={13} />} {tab.label}
          </button>
        ))}
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:max-w-md relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por propuesta, tema o colonia..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-xl shadow-sm text-xs font-bold text-gray-700">
            <Filter size={13} className="text-gray-400 ml-1.5" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-transparent border-none outline-none text-xs font-bold py-1 pr-2 cursor-pointer"
            >
              <option value="all">Todos los estados</option>
              <option value="pendiente">Pendientes</option>
              <option value="en_seguimiento">En seguimiento</option>
              <option value="cerrado">Cerrados</option>
            </select>
          </div>
        </div>
      </div>

      {/* ITEMS LIST */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center shadow-sm space-y-4">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto">
            <MessageSquare size={26} />
          </div>
          <h3 className="text-base font-bold text-gray-900">
            No hay registros de escucha social en esta vista
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Sé el primero en registrar una propuesta, problemática vecinal o compromiso.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => {
            const cat = item.categories[0] || "propuesta";
            const badge = categoryBadges[cat] ?? categoryBadges["propuesta"] ?? { label: "Idea / Propuesta", icon: Lightbulb, bg: "bg-amber-100", text: "text-amber-900" };

            return (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedItem(item);
                  setResolutionNotes(item.resolutionNotes || "");
                }}
                className="bg-white rounded-3xl p-5 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black inline-flex items-center gap-1 ${badge.bg} ${badge.text}`}>
                      <badge.icon size={10} /> {badge.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                      item.status === "cerrado" ? "bg-emerald-100 text-emerald-800" :
                      item.status === "en_seguimiento" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"
                    }`}>
                      {item.status.replace("_", " ")}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-sm text-gray-900 line-clamp-1">
                    {item.title}
                  </h3>

                  <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-gray-100 text-[10px] text-gray-400 space-y-1">
                  {item.locationText && (
                    <div className="flex items-center gap-1 font-semibold text-gray-600">
                      <MapPin size={11} className="text-blue-600 shrink-0" />
                      <span className="truncate">{item.locationText}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span>Por: <strong className="text-gray-700">{item.createdByName || "Integrante"}</strong></span>
                    <span>{new Date(item.createdAt).toLocaleDateString("es-MX")}</span>
                  </div>

                  {item.isFormalGestion === 1 && (
                    <div className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-1">
                      <Check size={11} /> Gestión Formal Aprobada
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl max-h-[88dvh] flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-base font-black">Registrar Escucha Social</h3>
                <p className="text-xs text-slate-300">Captura de demandas comunitarias e ideas</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-1 pb-16">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Categoría</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none"
                >
                  <option value="propuesta">Idea / Propuesta</option>
                  <option value="problematica">Problemática de Colonia</option>
                  <option value="compromiso">Compromiso Social</option>
                  <option value="seguimiento">Seguimiento de Petición</option>
                  <option value="gestion">Gestión de Servicio Público</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Título Resumido *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Reparación de luminarias en calle Morelos"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Descripción Detallada *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detalla lo conversado con el vecino o la necesidad identificada..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Ubicación / Colonia / Referencia</label>
                <input
                  type="text"
                  placeholder="Colonia, calle o referencia de Tonalá..."
                  value={locationText}
                  onChange={e => setLocationText(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 outline-none focus:bg-white"
                />
              </div>

              <div className="pt-2">
                <LocationPicker
                  value={{
                    latitude: lat || null,
                    longitude: lng || null,
                    address: locationText,
                    locationText: locationText
                  }}
                  onChange={(val: LocationValue) => {
                    if (val.latitude) setLat(val.latitude);
                    if (val.longitude) setLng(val.longitude);
                    if (val.address && !locationText) setLocationText(val.address);
                  }}
                  label="Ubicación de la Demanda / Propuesta (Opcional)"
                  helperText="Selecciona en el mapa o escribe la calle y colonia."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 rounded-xl text-xs font-bold text-gray-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  {saving ? "Guardando..." : "Guardar Registro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL / RESOLUTION MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in" onClick={() => setSelectedItem(null)}>
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl max-h-[88dvh] flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex justify-between items-center shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-300">Detalle de Escucha</span>
                <h3 className="text-base font-black line-clamp-1">{selectedItem.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto overscroll-contain flex-1 pb-16">
              <div className="space-y-1">
                <span className="font-extrabold text-gray-400 uppercase text-[10px]">Descripción</span>
                <p className="font-medium text-gray-800 leading-relaxed bg-gray-50 p-3 rounded-2xl">
                  {selectedItem.description}
                </p>
              </div>

              {selectedItem.locationText && (
                <div>
                  <span className="font-extrabold text-gray-400 uppercase text-[10px]">Ubicación</span>
                  <p className="font-bold text-gray-900">{selectedItem.locationText}</p>
                </div>
              )}

              {/* GESTIÓN FORMAL APPROVAL (EXCLUSIVE FOR COORDINATION) */}
              {isCoordinacion && (
                <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-indigo-950 text-xs">Bandeja de Aprobación de Gestión</span>
                    <button
                      type="button"
                      onClick={() => handleToggleApproveGestion(selectedItem.isFormalGestion !== 1)}
                      disabled={updatingStatus}
                      className={`px-3 py-1 rounded-xl font-bold text-[11px] cursor-pointer ${
                        selectedItem.isFormalGestion === 1
                          ? "bg-rose-100 text-rose-800 hover:bg-rose-200"
                          : "bg-emerald-600 text-white hover:bg-emerald-700"
                      }`}
                    >
                      {selectedItem.isFormalGestion === 1 ? "Revocar Gestión Formal" : "Aprobar como Gestión Formal"}
                    </button>
                  </div>
                  <p className="text-[10px] text-indigo-700">
                    Solo la Coordinación puede formalizar peticiones ante dependencias públicas municipales o estatales.
                  </p>
                </div>
              )}

              {/* RESOLUTION NOTES */}
              <div className="space-y-1.5">
                <label className="block font-extrabold text-gray-700 uppercase text-[10px]">Notas de Resolución / Seguimiento</label>
                <textarea
                  rows={2}
                  value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                  placeholder="Escribe el estatus o respuesta otorgada a los vecinos..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:bg-white"
                />
              </div>

              {/* STATUS CHANGE BUTTONS */}
              <div className="pt-2 flex items-center justify-between gap-2 border-t border-gray-100">
                <span className="text-[11px] font-bold text-gray-500">Cambiar estado:</span>
                <div className="flex gap-1.5">
                  {["pendiente", "en_seguimiento", "cerrado"].map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleUpdateStatus(st)}
                      disabled={updatingStatus || selectedItem.status === st}
                      className={`px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase cursor-pointer transition-all ${
                        selectedItem.status === st
                          ? "bg-slate-900 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {st.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
