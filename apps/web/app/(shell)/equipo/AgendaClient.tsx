"use client";

import { useState, useMemo } from "react";
import {
  Calendar, MapPin, CheckCircle, Clock, X, Plus, Users, User, Flag, Home, Check,
  Loader2, Coffee, Mic, Search, BarChart3, Award, Activity, Eye, Sparkles,
  Footprints, Vote, Megaphone, Package, Star
} from "lucide-react";
import type { ComponentType } from "react";

type CategoryIcon = ComponentType<{ size?: number | string; className?: string }>;
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PredictiveCombobox } from "@/components/PredictiveCombobox";
import { LocationPicker } from "@/components/LocationPicker";
import { MediaUploader, type MediaFile } from "@/components/MediaUploader";
import { MediaGallery } from "@/components/MediaGallery";
import type { LeaderStat } from "./page";

type AgendaItem = {
  id: string;
  type: "visit" | "event";
  status: string;
  scheduledAt: string | Date;
  title: string;
  description?: string | undefined;
  location: string;
  contactId?: string | undefined;
  category?: string | undefined;
  sectionId?: string | undefined;
  sectionNum?: number | undefined;
  assignedUserId?: string | undefined;
  assignedUserName?: string | undefined;
  mediaUrls?: MediaFile[] | undefined;
};

type UserOption = {
  id: string;
  displayName: string;
  email: string;
  roleKey?: string | null;
  roleName?: string | null;
};

type SectionOption = {
  id: string;
  sectionNum: number;
};

type ContactOption = {
  id: string;
  displayName: string;
  phone?: string | null;
  colony?: string | null;
};

const TASK_CATEGORIES: Array<{ value: string; label: string; icon: CategoryIcon; badge: string; defaultTitle: string }> = [
  { value: "platica", label: "Plática / Reunión Vecinal", icon: Coffee, badge: "Plática", defaultTitle: "Plática vecinal y diálogo comunitario" },
  { value: "visita", label: "Visita Domiciliaria a Contacto", icon: Home, badge: "Visita", defaultTitle: "Visita de vinculación domiciliaria" },
  { value: "evento", label: "Evento / Asamblea / Mitin", icon: Mic, badge: "Evento", defaultTitle: "Asamblea vecinal y evento comunitario" },
  { value: "brigada", label: "Brigada Territorial / Volanteo", icon: Footprints, badge: "Brigada", defaultTitle: "Brigada de campo y entrega mano a mano" },
  { value: "estructura", label: "Estructura Electoral / Casilla", icon: Vote, badge: "Electoral", defaultTitle: "Coordinación de casilla / RG / RC" },
  { value: "perifoneo", label: "Perifoneo / Activación de Calle", icon: Megaphone, badge: "Activación", defaultTitle: "Recorrido de perifoneo y megafonía" },
  { value: "incidencia", label: "Verificación Territorial / Reportes", icon: Eye, badge: "Supervisión", defaultTitle: "Inspección de incidencia y reporte vecinal" },
  { value: "apoyos", label: "Logística / Entrega de Apoyos", icon: Package, badge: "Logística", defaultTitle: "Entrega y recepción de insumos" }
];

const OPERATIONAL_ROLES = [
  { value: "territorial_coordinator", label: "Líder de Equipo / Brigada", badge: "Líder" },
  { value: "capturist", label: "Coordinador Territorial", badge: "Coordinador Territorial" },
  { value: "visit_responsible", label: "Brigadista / Operador de Campo", badge: "Brigadista" },
  { value: "direction", label: "Dirección General", badge: "Dirección" },
  { value: "admin", label: "Administrador", badge: "Admin" }
];

export default function AgendaClient({
  items,
  filter,
  scope,
  selectedLeaderId = "",
  canAssign,
  currentUserId,
  currentUserRole,
  systemUsers = [],
  leaderStats = [],
  sections = [],
  contacts = [],
  initialProspects = []
}: {
  items: AgendaItem[];
  filter: string;
  scope: string;
  selectedLeaderId?: string;
  canAssign: boolean;
  currentUserId: string;
  currentUserRole: string;
  systemUsers: UserOption[];
  leaderStats: LeaderStat[];
  sections: SectionOption[];
  contacts: ContactOption[];
  initialProspects?: any[];
}) {
  const router = useRouter();

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<"agenda" | "rendimiento" | "prospectos">("agenda");
  const [prospectsList, setProspectsList] = useState<any[]>(initialProspects);
  const [showProspectModal, setShowProspectModal] = useState(false);
  const [prospectForm, setProspectForm] = useState({
    prospectName: "",
    organizationOrReference: "",
    profileType: "vecinal",
    disposition: "interesado",
    dispositionNotes: "",
    locationText: "",
    commitments: "",
    privateNotes: ""
  });
  const [savingProspect, setSavingProspect] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  // Filter states
  const [categoryFilter, setCategoryFilter] = useState<string>("todas");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [leaderSearch, setLeaderSearch] = useState<string>("");

  // Modal states for reporting outcome
  const [modalVisit, setModalVisit] = useState<AgendaItem | null>(null);
  const [outcome, setOutcome] = useState("successful");
  const [outcomeSummary, setOutcomeSummary] = useState("");
  const [savingOutcome, setSavingOutcome] = useState(false);

  // New Activity / Task Modal state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMapPickerInModal, setShowMapPickerInModal] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "Plática vecinal y diálogo comunitario",
    description: "",
    assignedToUserId: currentUserId || (systemUsers[0]?.id ?? ""),
    scheduledAt: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    category: "platica",
    roleAssignment: "",
    municipality: "Tonalá",
    sectionId: "",
    contactId: "",
    locationText: "",
    estimatedAttendees: "",
    latitude: 20.6248,
    longitude: -103.2422,
    mediaUrls: [] as MediaFile[]
  });
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskSuccessMessage, setTaskSuccessMessage] = useState<string | null>(null);

  // Handle reporting outcome for visits / tasks
  async function handleCompleteVisit(e: React.FormEvent) {
    e.preventDefault();
    if (!modalVisit || !outcomeSummary) return;

    setSavingOutcome(true);
    try {
      if (modalVisit.type === "visit" && modalVisit.contactId) {
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
      } else {
        // Event report task
        const res = await fetch(`/api/equipo/tareas/${modalVisit.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "resolved", summary: outcomeSummary })
        });
        if (res.ok) {
          setModalVisit(null);
          setOutcomeSummary("");
          router.refresh();
        } else {
          alert("Error al completar la actividad");
        }
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al guardar resultado");
    } finally {
      setSavingOutcome(false);
    }
  }

  // Handle creating new operational activity / task
  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskForm.title || !taskForm.scheduledAt) {
      alert("Por favor completa el título y la fecha programada.");
      return;
    }

    setCreatingTask(true);
    try {
      const res = await fetch("/api/equipo/tareas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...taskForm,
          assignedToUserId: taskForm.assignedToUserId || currentUserId,
          scheduledAt: new Date(taskForm.scheduledAt).toISOString(),
          mediaUrls: taskForm.mediaUrls || []
        })
      });

      if (res.ok) {
        setTaskSuccessMessage("Actividad registrada y sumada a la bitácora con éxito.");
        setTimeout(() => {
          setShowTaskModal(false);
          setTaskSuccessMessage(null);
          setTaskForm({
            title: "Plática vecinal y diálogo comunitario",
            description: "",
            assignedToUserId: currentUserId || (systemUsers[0]?.id ?? ""),
            scheduledAt: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
            category: "platica",
            roleAssignment: "",
            municipality: "Tonalá",
            sectionId: "",
            contactId: "",
            locationText: "",
            estimatedAttendees: "",
            latitude: 20.6248,
            longitude: -103.2422,
            mediaUrls: []
          });
          router.refresh();
        }, 1100);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Error al registrar la actividad.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al registrar la actividad.");
    } finally {
      setCreatingTask(false);
    }
  }

  // Handle creating rapid prospect
  async function handleCreateProspect(e: React.FormEvent) {
    e.preventDefault();
    if (!prospectForm.prospectName.trim()) return;
    setSavingProspect(true);
    try {
      const res = await fetch("/api/prospectos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prospectForm)
      });
      if (res.ok) {
        const data = await res.json();
        setProspectsList([data.item, ...prospectsList]);
        setShowProspectModal(false);
        setProspectForm({
          prospectName: "",
          organizationOrReference: "",
          profileType: "vecinal",
          disposition: "interesado",
          dispositionNotes: "",
          locationText: "",
          commitments: "",
          privateNotes: ""
        });
      }
    } finally {
      setSavingProspect(false);
    }
  }

  // 1-click convert prospect to contact
  async function handleConvertProspect(prospectId: string) {
    setConvertingId(prospectId);
    try {
      const res = await fetch(`/api/prospectos/${prospectId}/convertir`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setProspectsList(prospectsList.map(p => p.id === prospectId ? { ...p, convertedToContactId: data.contactId } : p));
        alert("¡Convertido exitosamente a Registro Social!");
      }
    } finally {
      setConvertingId(null);
    }
  }

  // Filtered agenda items based on category and search query
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Category filter
      if (categoryFilter !== "todas") {
        if (categoryFilter === "platica" && item.category !== "platica") return false;
        if (categoryFilter === "visita" && item.category !== "visita" && item.type !== "visit") return false;
        if (categoryFilter === "evento" && item.category !== "evento" && item.category !== "mitin") return false;
        if (categoryFilter === "brigada" && item.category !== "brigada" && item.category !== "propaganda" && item.category !== "perifoneo") return false;
      }

      // Text search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (item.title || "").toLowerCase().includes(q);
        const matchesDesc = (item.description || "").toLowerCase().includes(q);
        const matchesLoc = (item.location || "").toLowerCase().includes(q);
        const matchesUser = (item.assignedUserName || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesLoc && !matchesUser) return false;
      }

      return true;
    });
  }, [items, categoryFilter, searchQuery]);

  // Global KPIs summary from leaderStats
  const totalActividadesGlobal = useMemo(() => {
    return leaderStats.reduce((sum, l) => sum + l.totalActivities, 0);
  }, [leaderStats]);

  const totalVisitasGlobal = useMemo(() => {
    return leaderStats.reduce((sum, l) => sum + l.visitasCount, 0);
  }, [leaderStats]);

  const totalPlaticasGlobal = useMemo(() => {
    return leaderStats.reduce((sum, l) => sum + l.platicasCount, 0);
  }, [leaderStats]);

  const totalEventosGlobal = useMemo(() => {
    return leaderStats.reduce((sum, l) => sum + l.eventosCount, 0);
  }, [leaderStats]);

  const totalBrigadasGlobal = useMemo(() => {
    return leaderStats.reduce((sum, l) => sum + l.brigadasCount, 0);
  }, [leaderStats]);

  const totalContactosGlobal = useMemo(() => {
    return leaderStats.reduce((sum, l) => sum + l.contactsCount, 0);
  }, [leaderStats]);

  // Filtered leader stats for leaderboard search
  const filteredLeaderStats = useMemo(() => {
    if (!leaderSearch.trim()) return leaderStats;
    const q = leaderSearch.toLowerCase();
    return leaderStats.filter(l => 
      l.displayName.toLowerCase().includes(q) || 
      l.email.toLowerCase().includes(q) || 
      l.teamName.toLowerCase().includes(q) || 
      l.roleName.toLowerCase().includes(q)
    );
  }, [leaderStats, leaderSearch]);

  // Find my personal stat
  const myStat = useMemo(() => {
    return leaderStats.find(l => l.userId === currentUserId) || null;
  }, [leaderStats, currentUserId]);

  const getCategoryBadge = (cat?: string, type?: string) => {
    if (type === "visit" || cat === "visita") {
      return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1"><Home size={12} /> Visita</span>;
    }
    if (cat === "platica") {
      return <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1"><Coffee size={12} /> Plática</span>;
    }
    if (cat === "evento" || cat === "mitin") {
      return <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1"><Mic size={12} /> Evento</span>;
    }
    if (cat === "brigada") {
      return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1"><Footprints size={12} /> Brigada</span>;
    }
    if (cat === "perifoneo" || cat === "propaganda") {
      return <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1"><Megaphone size={12} /> Activación</span>;
    }
    return <span className="bg-gray-50 text-gray-700 border border-gray-200 text-[11px] font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1"><Flag size={12} /> Actividad</span>;
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-7">
      {/* 1. HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black uppercase tracking-wider bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-md flex items-center gap-1.5">
              <Activity size={13} /> Agenda Operativa y Monitoreo de Líderes
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-blue-950 tracking-tight">Actividades y Desempeño Territorial</h1>
          <p className="text-gray-500 mt-1">Registra visitas, pláticas y eventos, y monitorea el avance operativo de cada líder en campo.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Botón de Registro de Actividades para Cada Líder */}
          <button
            type="button"
            onClick={() => {
              setTaskForm(prev => ({ ...prev, assignedToUserId: currentUserId }));
              setShowTaskModal(true);
            }}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-sm active:scale-95 cursor-pointer"
          >
            <Plus size={16} /> + Registrar Mi Actividad / Tarea
          </button>
        </div>
      </div>

      {/* 2. PESTAÑAS DE NAVEGACIÓN (AGENDA vs REPORTE POR LÍDER) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("agenda")}
            className={`px-5 py-2.5 rounded-xl font-extrabold text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "agenda"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Calendar size={16} />
            <span>Bitácora y Agenda Operativa</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === "agenda" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"}`}>
              {filteredItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("rendimiento")}
            className={`px-5 py-2.5 rounded-xl font-extrabold text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "rendimiento"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <BarChart3 size={16} />
            <span>Reporte por Líder</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === "rendimiento" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"}`}>
              {leaderStats.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("prospectos")}
            className={`px-5 py-2.5 rounded-xl font-extrabold text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "prospectos"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Sparkles size={16} />
            <span>Registros Rápidos (Prospectos)</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === "prospectos" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"}`}>
              {prospectsList.length}
            </span>
          </button>
        </div>

        {/* Indicador de Líder Seleccionado si viene por query param */}
        {selectedLeaderId && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-900">
            <span>Filtrando líder: {leaderStats.find(l => l.userId === selectedLeaderId)?.displayName || "Líder"}</span>
            <Link href="/equipo?scope=equipo" className="text-blue-500 hover:text-blue-800 ml-1 font-extrabold inline-flex items-center gap-1"><X size={12} /> Limpiar</Link>
          </div>
        )}
      </div>

      {/* 3. VISTA 1: BITÁCORA Y AGENDA OPERATIVA */}
      {activeTab === "agenda" && (
        <div className="space-y-6">
          {/* BARRA DE FILTROS Y BÚSQUEDA */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Buscador de texto */}
            <div className="relative flex-1 min-w-[280px]">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por actividad, sede, líder o ciudadano..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"><X size={14} /></button>
              )}
            </div>

            {/* Filtros por Categoría */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { key: "todas", label: "Todas", icon: null },
                { key: "platica", label: "Pláticas", icon: Coffee },
                { key: "visita", label: "Visitas", icon: Home },
                { key: "evento", label: "Eventos", icon: Mic },
                { key: "brigada", label: "Brigadas", icon: Footprints },
              ].map(cat => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setCategoryFilter(cat.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                    categoryFilter === cat.key
                      ? "bg-blue-900 text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {cat.icon && <cat.icon size={13} />} {cat.label}
                </button>
              ))}
            </div>

            {/* Filtro de Alcance (Mis vs Equipo) */}
            <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
              <Link
                href={`/equipo?filter=${filter}&scope=mis`}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors flex items-center gap-1.5 ${
                  scope === "mis" && !selectedLeaderId ? "bg-white shadow-sm text-blue-950" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <User size={13} /> Mis Actividades
              </Link>
              <Link
                href={`/equipo?filter=${filter}&scope=equipo`}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors flex items-center gap-1.5 ${
                  scope === "equipo" || selectedLeaderId ? "bg-white shadow-sm text-blue-950" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Users size={13} /> Todo el Equipo
              </Link>
            </div>

            {/* Filtro de Fecha */}
            <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
              <Link href={`/equipo?filter=hoy&scope=${scope}${selectedLeaderId ? `&leaderId=${selectedLeaderId}` : ''}`} className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${filter === 'hoy' ? 'bg-white shadow-sm text-blue-900' : 'text-gray-500 hover:text-gray-700'}`}>Hoy</Link>
              <Link href={`/equipo?filter=semana&scope=${scope}${selectedLeaderId ? `&leaderId=${selectedLeaderId}` : ''}`} className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${filter === 'semana' ? 'bg-white shadow-sm text-blue-900' : 'text-gray-500 hover:text-gray-700'}`}>Semana</Link>
              <Link href={`/equipo?filter=mes&scope=${scope}${selectedLeaderId ? `&leaderId=${selectedLeaderId}` : ''}`} className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${filter === 'mes' ? 'bg-white shadow-sm text-blue-900' : 'text-gray-500 hover:text-gray-700'}`}>Mes</Link>
              <Link href={`/equipo?filter=todas&scope=${scope}${selectedLeaderId ? `&leaderId=${selectedLeaderId}` : ''}`} className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${filter === 'todas' ? 'bg-white shadow-sm text-blue-900' : 'text-gray-500 hover:text-gray-700'}`}>Todas</Link>
            </div>
          </div>

          {/* LISTADO DE ACTIVIDADES */}
          {filteredItems.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center shadow-sm flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                <CheckCircle size={32} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">No hay actividades en este periodo</h2>
              <p className="text-gray-500 max-w-md mx-auto mb-5 text-xs font-medium">
                {scope === "equipo"
                  ? "No se encontraron visitas, pláticas o eventos programados con estos filtros."
                  : "No tienes actividades programadas para este periodo. ¡Registra tu primera visita o plática!"}
              </p>
              <button
                type="button"
                onClick={() => {
                  setTaskForm(prev => ({ ...prev, assignedToUserId: currentUserId }));
                  setShowTaskModal(true);
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-all text-xs flex items-center gap-2 cursor-pointer"
              >
                <Plus size={15} /> + Registrar Actividad Ahora
              </button>
            </div>
          ) : (
            <div className="grid gap-3.5">
              <div className="flex items-center justify-between text-xs text-gray-500 font-bold px-1">
                <span>Mostrando {filteredItems.length} {filteredItems.length === 1 ? "actividad" : "actividades"}</span>
                <span>Periodo: {filter.toUpperCase()}</span>
              </div>

              {filteredItems.map(item => {
                const isCompleted = item.status === "completed" || item.status === "resolved" || item.status === "successful";
                const isMyItem = item.assignedUserId === currentUserId;

                return (
                  <div
                    key={item.id}
                    className={`bg-white p-5 rounded-2xl border transition-all hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isCompleted ? "border-emerald-200 bg-emerald-50/20" : "border-gray-200 shadow-sm"
                    }`}
                  >
                    {/* Contenido Principal */}
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getCategoryBadge(item.category, item.type)}

                        {/* Badge de Líder Asignado con Enlace a Perfil 360° */}
                        <Link
                          href={item.assignedUserId ? `/perfil/${item.assignedUserId}` : "#"}
                          className="bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-800 text-[11px] font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                          title="Ver perfil 360°, contactos y agenda de este líder"
                        >
                          <User size={12} className="text-slate-500" />
                          <span>{item.assignedUserName || "Sin Asignar"}</span>
                          {isMyItem && <span className="text-[10px] text-blue-600 font-extrabold">(Tú)</span>}
                        </Link>

                        {/* Fecha y Hora */}
                        <span className="text-gray-400 text-xs font-semibold flex items-center gap-1 ml-auto">
                          <Clock size={12} />
                          {new Date(item.scheduledAt).toLocaleString("es-MX", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>

                      {/* Título */}
                      <h3 className="font-extrabold text-base text-gray-900">{item.title}</h3>

                      {/* Descripción y Sede */}
                      {item.description && (
                        <p className="text-xs text-gray-600 line-clamp-2 whitespace-pre-line font-medium">
                          {item.description}
                        </p>
                      )}

                      {/* Ubicación / Sede */}
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 pt-1">
                        <MapPin size={13} className="text-rose-500 shrink-0" />
                        <span>{item.location || "Sede por confirmar"}</span>
                      </div>

                      {/* Evidencias Adjuntas */}
                      {item.mediaUrls && item.mediaUrls.length > 0 && (
                        <div className="pt-2">
                          <MediaGallery media={item.mediaUrls} title="Evidencia de la Actividad" />
                        </div>
                      )}
                    </div>

                    {/* Estado y Acciones */}
                    <div className="flex items-center gap-2.5 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-gray-100">
                      {isCompleted ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-3.5 py-2 rounded-xl">
                          <CheckCircle size={15} />
                          <span>Completada</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setModalVisit(item)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                        >
                          <Check size={14} /> Reportar Resultado / Completar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. VISTA 2: REPORTE DE PRODUCTIVIDAD Y MONITOREO POR LÍDER */}
      {activeTab === "rendimiento" && (
        <div className="space-y-7">
          {/* KPI CARDS GLOBALES */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-4 rounded-2xl text-white shadow-sm">
              <div className="flex items-center justify-between opacity-80 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Actividades</span>
                <Activity size={15} />
              </div>
              <div className="text-2xl font-black">{totalActividadesGlobal}</div>
              <div className="text-[10px] opacity-75 font-semibold mt-1">Registros en total</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Pláticas</span>
                <Coffee size={15} className="text-amber-500" />
              </div>
              <div className="text-2xl font-black text-gray-900">{totalPlaticasGlobal}</div>
              <div className="text-[10px] text-gray-400 font-semibold mt-1">Reuniones vecinales</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Visitas</span>
                <Home size={15} className="text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-gray-900">{totalVisitasGlobal}</div>
              <div className="text-[10px] text-gray-400 font-semibold mt-1">Domiciliarias</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Eventos</span>
                <Mic size={15} className="text-purple-500" />
              </div>
              <div className="text-2xl font-black text-gray-900">{totalEventosGlobal}</div>
              <div className="text-[10px] text-gray-400 font-semibold mt-1">Asambleas / Mítines</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Brigadas</span>
                <Flag size={15} className="text-blue-500" />
              </div>
              <div className="text-2xl font-black text-gray-900">{totalBrigadasGlobal}</div>
              <div className="text-[10px] text-gray-400 font-semibold mt-1">Campo y volanteo</div>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-blue-950 p-4 rounded-2xl text-white shadow-sm">
              <div className="flex items-center justify-between opacity-80 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">Contactos</span>
                <Users size={15} className="text-cyan-400" />
              </div>
              <div className="text-2xl font-black text-cyan-400">{totalContactosGlobal}</div>
              <div className="text-[10px] opacity-75 font-semibold mt-1">En padrón territorial</div>
            </div>
          </div>

          {/* WIDGET PERSONAL MI RENDIMIENTO */}
          {myStat && (
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 rounded-3xl text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center md:text-left">
                <span className="text-xs uppercase font-black tracking-wider bg-blue-500/30 text-blue-200 px-3 py-1 rounded-full border border-blue-400/30 inline-flex items-center gap-1.5">
                  <Star size={12} /> Mi Resumen de Desempeño
                </span>
                <h2 className="text-2xl font-black text-white">{myStat.displayName}</h2>
                <p className="text-xs text-blue-200">{myStat.teamName} · {myStat.roleName}</p>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 w-full md:w-auto">
                <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl text-center">
                  <div className="text-xs text-blue-200 font-bold">Actividades</div>
                  <div className="text-xl font-black text-white">{myStat.totalActivities}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl text-center">
                  <div className="text-xs text-amber-200 font-bold">Pláticas</div>
                  <div className="text-xl font-black text-amber-300">{myStat.platicasCount}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl text-center">
                  <div className="text-xs text-emerald-200 font-bold">Visitas</div>
                  <div className="text-xl font-black text-emerald-300">{myStat.visitasCount}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl text-center">
                  <div className="text-xs text-purple-200 font-bold">Eventos</div>
                  <div className="text-xl font-black text-purple-300">{myStat.eventosCount}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl text-center">
                  <div className="text-xs text-cyan-200 font-bold">Contactos</div>
                  <div className="text-xl font-black text-cyan-300">{myStat.contactsCount}</div>
                </div>
              </div>
            </div>
          )}

          {/* TABLA Y TARJETAS DE MONITOREO POR LÍDER */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <Award size={20} className="text-amber-500" />
                  <span>Monitoreo de Actividades por Líder</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Ranking y reporte de actividades, pláticas, visitas y contactos por operador.</p>
              </div>

              {/* Buscador de Líderes */}
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar líder o equipo..."
                  value={leaderSearch}
                  onChange={e => setLeaderSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase font-black text-[10px] tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="py-3.5 px-4">Líder / Usuario</th>
                    <th className="py-3.5 px-3 text-center">Total Actividades</th>
                    <th className="py-3.5 px-3 text-center"><span className="inline-flex items-center gap-1"><Coffee size={12} /> Pláticas</span></th>
                    <th className="py-3.5 px-3 text-center"><span className="inline-flex items-center gap-1"><Home size={12} /> Visitas</span></th>
                    <th className="py-3.5 px-3 text-center"><span className="inline-flex items-center gap-1"><Mic size={12} /> Eventos</span></th>
                    <th className="py-3.5 px-3 text-center"><span className="inline-flex items-center gap-1"><Footprints size={12} /> Brigadas</span></th>
                    <th className="py-3.5 px-3 text-center"><span className="inline-flex items-center gap-1"><Users size={12} /> Contactos</span></th>
                    <th className="py-3.5 px-3 text-center">% Cumplimiento</th>
                    <th className="py-3.5 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLeaderStats.map((l, idx) => (
                    <tr key={l.userId} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link href={`/perfil/${l.userId}`} className="flex items-center gap-3 group cursor-pointer" title="Ver perfil 360°, contactos subidos y agenda">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 group-hover:scale-110 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm transition-transform">
                            {l.displayName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-extrabold text-gray-900 text-xs flex items-center gap-1.5 group-hover:text-blue-600 transition-colors">
                              <span>{l.displayName}</span>
                              {l.userId === currentUserId && (
                                <span className="bg-blue-100 text-blue-800 text-[9px] font-black px-1.5 py-0.2 rounded">Tú</span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-400 font-semibold">{l.teamName} · {l.roleName}</div>
                          </div>
                        </Link>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span className="font-black text-gray-900 text-sm bg-gray-100 px-2.5 py-1 rounded-lg">
                          {l.totalActivities}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center font-bold text-amber-800">
                        {l.platicasCount}
                      </td>

                      <td className="py-3.5 px-3 text-center font-bold text-emerald-700">
                        {l.visitasCount}
                      </td>

                      <td className="py-3.5 px-3 text-center font-bold text-purple-700">
                        {l.eventosCount}
                      </td>

                      <td className="py-3.5 px-3 text-center font-bold text-blue-700">
                        {l.brigadasCount}
                      </td>

                      <td className="py-3.5 px-3 text-center font-black text-cyan-800">
                        {l.contactsCount}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-extrabold text-[11px] text-gray-800">{l.completionRate}%</span>
                          <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-1.5 rounded-full"
                              style={{ width: `${Math.min(100, l.completionRate)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/perfil/${l.userId}`}
                            className="px-2.5 py-1.5 bg-gray-100 hover:bg-blue-50 text-blue-700 font-bold rounded-xl text-[11px] transition-all flex items-center gap-1"
                            title="Ver perfil 360° completo: personas que ha subido y agenda"
                          >
                            <User size={12} /> Perfil
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab("agenda");
                              router.push(`/equipo?scope=equipo&leaderId=${l.userId}`);
                            }}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-[11px] transition-all cursor-pointer flex items-center gap-1"
                            title="Ver bitácora de agenda de este líder"
                          >
                            <Eye size={12} /> Bitácora
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. VISTA 3: REGISTROS RÁPIDOS DE CONVERSACIÓN (PROSPECTOS) */}
      {activeTab === "prospectos" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div>
              <h2 className="text-lg font-black text-gray-950">Registros Rápidos de Conversación</h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Captura prospectos de líderes vecinales, comerciantes y aliados con acuerdos y 1 clic de conversión a Registro Social.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowProspectModal(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all shrink-0"
            >
              <Plus size={15} /> + Nuevo Registro Rápido
            </button>
          </div>

          {prospectsList.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center shadow-sm space-y-4">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                <Sparkles size={26} />
              </div>
              <h3 className="text-base font-bold text-gray-900">No hay registros rápidos de conversación</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Utiliza esta herramienta en campo para registrar contactos clave antes de que llenen el registro completo.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {prospectsList.map(p => (
                <div
                  key={p.id}
                  className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-800 uppercase">
                        {p.profileType}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                        p.disposition === "interesado" ? "bg-emerald-100 text-emerald-800" :
                        p.disposition === "por_conocer" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {p.disposition?.replace("_", " ")}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-sm text-gray-950">{p.prospectName}</h3>
                    {p.organizationOrReference && (
                      <p className="text-xs text-gray-500 font-semibold">{p.organizationOrReference}</p>
                    )}

                    {p.commitments && (
                      <div className="p-2.5 bg-gray-50 rounded-xl text-xs space-y-0.5">
                        <span className="font-extrabold text-[10px] uppercase text-gray-400 block">Acuerdos:</span>
                        <p className="font-medium text-gray-700">{p.commitments}</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-100 space-y-2">
                    {p.locationText && (
                      <div className="flex items-center gap-1 text-[11px] text-gray-500 font-medium truncate">
                        <MapPin size={12} className="text-blue-600 shrink-0" />
                        <span>{p.locationText}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-gray-400">
                      <span>Por: <strong className="text-gray-700">{p.createdByName || "Líder"}</strong></span>
                      <span>{new Date(p.activityDate).toLocaleDateString("es-MX")}</span>
                    </div>

                    {p.convertedToContactId ? (
                      <div className="inline-flex items-center justify-center w-full py-2 bg-emerald-50 text-emerald-800 font-extrabold text-xs rounded-xl gap-1">
                        <CheckCircle size={14} /> Convertido a Registro Social
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleConvertProspect(p.id)}
                        disabled={convertingId === p.id}
                        className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <Sparkles size={13} />
                        <span>{convertingId === p.id ? "Convirtiendo..." : "Convertir a Registro Social"}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL REGISTRO RÁPIDO */}
      {showProspectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowProspectModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[88dvh] flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 bg-slate-900 text-white shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles size={18} />
                <h3 className="font-extrabold text-sm">Nuevo Registro Rápido de Conversación</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowProspectModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProspect} className="p-5 sm:p-6 space-y-3.5 overflow-y-auto overscroll-contain flex-1 pb-16">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Nombre del Prospecto *</label>
                <input
                  type="text"
                  required
                  placeholder="Nombre y apellidos de la persona..."
                  value={prospectForm.prospectName}
                  onChange={e => setProspectForm({ ...prospectForm, prospectName: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Tipo de Perfil</label>
                  <select
                    value={prospectForm.profileType}
                    onChange={e => setProspectForm({ ...prospectForm, profileType: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none"
                  >
                    <option value="vecinal">Vecinal / Ciudadano</option>
                    <option value="empresarial">Empresarial / Comerciante</option>
                    <option value="social">Líder Social</option>
                    <option value="religioso">Comunidad Religiosa</option>
                    <option value="educativo">Sector Educativo</option>
                    <option value="deportivo">Sector Deportivo</option>
                    <option value="politico">Actor Político</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Disposición</label>
                  <select
                    value={prospectForm.disposition}
                    onChange={e => setProspectForm({ ...prospectForm, disposition: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none"
                  >
                    <option value="interesado">Interesado</option>
                    <option value="por_conocer">Por conocer propuesta</option>
                    <option value="sin_definicion">Sin definición</option>
                    <option value="simpatiza_otro">Simpatiza con otro</option>
                    <option value="no_interesado">No interesado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Organización / Gremio / Referencia</label>
                <input
                  type="text"
                  placeholder="Ej. Tienda de abarrotes Don Pepe / Comité Vecinal"
                  value={prospectForm.organizationOrReference}
                  onChange={e => setProspectForm({ ...prospectForm, organizationOrReference: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Ubicación / Colonia</label>
                <input
                  type="text"
                  placeholder="Colonia, calle o cruce..."
                  value={prospectForm.locationText}
                  onChange={e => setProspectForm({ ...prospectForm, locationText: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Acuerdos / Compromisos</label>
                <input
                  type="text"
                  placeholder="Ej. Se le visitará el martes para plática vecinal"
                  value={prospectForm.commitments}
                  onChange={e => setProspectForm({ ...prospectForm, commitments: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Notas Privadas</label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre lo conversado, intereses particulares..."
                  value={prospectForm.privateNotes}
                  onChange={e => setProspectForm({ ...prospectForm, privateNotes: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowProspectModal(false)}
                  className="px-4 py-2 bg-gray-100 rounded-xl text-xs font-bold text-gray-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingProspect}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  {savingProspect ? "Guardando..." : "Guardar Prospecto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL DE REGISTRO DE ACTIVIDADES (PARA CADA LÍDER) */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowTaskModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[88dvh] flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 bg-gradient-to-r from-blue-900 to-indigo-900 text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Activity size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">Registrar Actividad Operativa</h3>
                  <p className="text-[11px] text-blue-200">Suma visitas, pláticas o eventos a tu bitácora de líder.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTaskModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={20} />
              </button>
            </div>

            {taskSuccessMessage ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle size={36} />
                </div>
                <h4 className="text-lg font-bold text-gray-900">{taskSuccessMessage}</h4>
                <p className="text-xs text-gray-500 font-medium">Actualizando agenda y reporte de actividades...</p>
              </div>
            ) : (
              <form onSubmit={handleCreateTask} className="p-5 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-1 pb-16">
                {/* 1. Categoría / Tipo de Actividad */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Tipo de Actividad *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {TASK_CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => {
                          setTaskForm(prev => ({
                            ...prev,
                            category: cat.value,
                            title: cat.defaultTitle
                          }));
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                          taskForm.category === cat.value
                            ? "bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20 shadow-sm"
                            : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <div className="mb-1"><cat.icon size={16} /></div>
                        <div className="text-[11px] leading-tight line-clamp-1">{cat.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Título de la Actividad */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Título de la Actividad *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Plática vecinal sobre alumbrado en Col. Jalisco..."
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>

                {/* 3. Asignado a & Fecha */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Líder Responsable *
                    </label>
                    <select
                      value={taskForm.assignedToUserId}
                      onChange={(e) => setTaskForm({ ...taskForm, assignedToUserId: e.target.value })}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer shadow-sm"
                    >
                      {systemUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.displayName} {u.id === currentUserId ? "(Tú)" : `(${u.roleName || "Operador"})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Fecha y Hora Programada *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={taskForm.scheduledAt}
                      onChange={(e) => setTaskForm({ ...taskForm, scheduledAt: e.target.value })}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* 4. Sede / Domicilio y Selector de Ubicación */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Sede o Domicilio de la Actividad
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowMapPickerInModal(!showMapPickerInModal)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <MapPin size={12} /> {showMapPickerInModal ? "Ocultar Mapa" : "Abrir Mapa / Buscar Domicilio"}
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Ej. Comité Directivo Municipal del PAN, Calle Juárez #123, Tonalá Centro..."
                    value={taskForm.locationText}
                    onChange={(e) => setTaskForm({ ...taskForm, locationText: e.target.value })}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                  />
                </div>

                {showMapPickerInModal && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl animate-in fade-in">
                    <LocationPicker
                      label="Fijar Punto en el Mapa"
                      helperText="Escribe el domicilio o marca el punto exacto en el mapa"
                      defaultMunicipality={taskForm.municipality || "Tonalá"}
                      value={{
                        latitude: taskForm.latitude,
                        longitude: taskForm.longitude,
                        address: taskForm.locationText,
                        locationText: taskForm.locationText,
                        municipality: taskForm.municipality,
                        sectionId: taskForm.sectionId
                      }}
                      onChange={(loc) => {
                        let matchedSec = taskForm.sectionId;
                        if (loc.sectionNum && !matchedSec) {
                          const found = sections.find(s => s.sectionNum === loc.sectionNum);
                          if (found) matchedSec = found.id;
                        }
                        setTaskForm({
                          ...taskForm,
                          latitude: (loc.latitude ?? taskForm.latitude) || 20.6248,
                          longitude: (loc.longitude ?? taskForm.longitude) || -103.2422,
                          locationText: loc.address || loc.locationText || taskForm.locationText,
                          municipality: loc.municipality || taskForm.municipality,
                          sectionId: loc.sectionId || matchedSec || taskForm.sectionId
                        });
                      }}
                    />
                  </div>
                )}

                {/* 5. Asistentes Estimados y Contacto Vinculado */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Asistentes / Participantes Estimados
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Ej. 15 vecinos"
                      value={taskForm.estimatedAttendees}
                      onChange={(e) => setTaskForm({ ...taskForm, estimatedAttendees: e.target.value })}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                    />
                  </div>

                  <div>
                    <PredictiveCombobox
                      label="Vincular Ciudadano del Padrón (Opcional)"
                      placeholder="Buscar si es visita a un contacto..."
                      value={taskForm.contactId}
                      onChange={(val, opt) => setTaskForm({ ...taskForm, contactId: val, locationText: opt?.sublabel || taskForm.locationText })}
                      options={contacts.map((c) => ({
                        value: c.id,
                        label: c.displayName,
                        sublabel: `${c.colony || "Tonalá"} ${c.phone ? `· Tel: ${c.phone}` : ""}`,
                        badge: "Ciudadano"
                      }))}
                      icon={<Home size={13} className="text-emerald-600" />}
                    />
                  </div>
                </div>

                {/* 6. Notas y Objetivos */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Objetivo / Notas de la Actividad
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Escribe temas a tratar, acuerdos previos o material requerido..."
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                  />
                </div>

                {/* 7. Evidencias Multimedia */}
                <div>
                  <MediaUploader
                    value={taskForm.mediaUrls}
                    onChange={(files) => setTaskForm({ ...taskForm, mediaUrls: files })}
                    label="Evidencias Fotográficas / Video de la Actividad"
                    helperText="Adjunta fotos de reunión, volantes, mitin o video (hasta 60 MB)"
                  />
                </div>

                {/* Botones de acción */}
                <div className="pt-3 border-t border-gray-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowTaskModal(false)}
                    className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creatingTask}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {creatingTask ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>Registrar Actividad</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 6. MODAL DE COMPLETAR / REPORTAR RESULTADO DE ACTIVIDAD */}
      {modalVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setModalVisit(null)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[88dvh] flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 bg-emerald-600 text-white shrink-0">
              <div className="flex items-center gap-2">
                <CheckCircle size={20} />
                <h3 className="font-extrabold text-base">Completar Actividad / Reporte</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalVisit(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCompleteVisit} className="p-5 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-1 pb-16">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400">Actividad:</span>
                <div className="text-sm font-black text-gray-900">{modalVisit.title}</div>
                <div className="text-xs text-gray-500 font-semibold">{modalVisit.location}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Resultado / Conclusión de la Actividad *
                </label>
                <select
                  value={outcome}
                  onChange={e => setOutcome(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none"
                >
                  <option value="successful">Exitosa / Realizada con éxito</option>
                  <option value="positive_commitment">Compromiso vecinal acordado</option>
                  <option value="needs_followup">Requiere seguimiento / Segunda plática</option>
                  <option value="rescheduled">Reprogramada</option>
                  <option value="cancelled">Cancelada / No se pudo realizar</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Resumen de Resultados, Asistentes y Acuerdos *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Escribe cuántas personas asistieron, qué temas se trataron y qué compromisos se generaron..."
                  value={outcomeSummary}
                  onChange={e => setOutcomeSummary(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalVisit(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingOutcome}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
                >
                  {savingOutcome ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>Guardar Resultado</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
