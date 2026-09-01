"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Users, Award, Activity, MessageSquare, Sparkles, AlertCircle, X, CheckCircle2,
  MapPin, Share2, Compass, Navigation, Search, Phone, ExternalLink,
  ChevronRight, Flame, ArrowUpRight, TrendingUp, Clock,
  Map, Vote, Megaphone
} from "lucide-react";

type MemberPerformance = {
  userId: string;
  displayName: string;
  email: string;
  phone?: string | null;
  accessType: string;
  parentEnlaceName?: string | null;
  personalSlug?: string | null;
  contactsCount: number;
  panContactsCount: number;
  activitiesCount: number;
  completionRate: number;
  isEligibleForPromotion: boolean;
};

type RecentContact = {
  id: string;
  firstName: string;
  lastName: string;
  colony: string | null;
  municipality: string | null;
  sectionNum: number | null;
  panMilitancy: string | null;
  createdAt: string;
};

export default function ResumenClient({
  currentUser,
  kpis,
  recentContacts = [],
  leaderboard
}: {
  currentUser: { id: string; displayName: string; accessType: string; personalSlug?: string | null };
  kpis: {
    totalContacts: number;
    todayContacts: number;
    panConfirmedContacts: number;
    totalActivities: number;
    todayActivities: number;
    totalSocialListening: number;
  };
  recentContacts?: RecentContact[];
  leaderboard: MemberPerformance[];
}) {
  const [activeTab, setActiveTab] = useState<"ranking" | "activity" | "quicklinks">("ranking");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [searchTerm, setSearchTerm] = useState("");
  const [members, setMembers] = useState<MemberPerformance[]>(leaderboard);
  const [promotingUser, setPromotingUser] = useState<MemberPerformance | null>(null);
  const [targetAccessType, setTargetAccessType] = useState<string>("enlace");
  const [promotionReason, setPromotionReason] = useState<string>("");
  const [savingPromotion, setSavingPromotion] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // GPS Territory Radar
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [currentTerritoryInfo, setCurrentTerritoryInfo] = useState<{
    colony?: string;
    sectionNum?: number;
    municipality?: string;
    formattedAddress?: string;
  } | null>(null);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const isCoordinacion = currentUser.accessType === "coordinacion";

  // Share or Copy Personal Registration Link
  const handleShareLink = async () => {
    const slug = currentUser.personalSlug || currentUser.id;
    const origin = typeof window !== "undefined" ? window.location.origin : "https://elapp.com.mx";
    const shareUrl = `${origin}/registro/${slug}`;

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast("success", "Enlace copiado. Listo para enviar por WhatsApp.");
      } catch {
        // Fallback
      }
    }

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`¡Hola! Te comparto mi enlace para registrarte en la red ciudadana de Tonalá:\n${shareUrl}`)}`;
    window.open(whatsappUrl, "_blank");
  };

  // Quick GPS Territory Detection
  const handleDetectCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast("error", "Tu dispositivo no cuenta con sensor GPS.");
      return;
    }

    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`/api/map/reverse-geocode?lat=${latitude}&lng=${longitude}`);
          if (res.ok) {
            const data = await res.json();
            setCurrentTerritoryInfo({
              colony: data.colony,
              sectionNum: data.sectionNum,
              municipality: data.municipality || "Tonalá",
              formattedAddress: data.formattedAddress
            });
            showToast("success", `Ubicado en Col. ${data.colony || "Centro"} · Secc. #${data.sectionNum || "S/N"}`);
          } else {
            showToast("error", "No se pudo identificar la sección electoral.");
          }
        } catch {
          showToast("error", "Error de conexión al identificar territorio.");
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (err) => {
        console.warn("GPS error:", err);
        showToast("error", "Permite el acceso al GPS en tu navegador.");
        setIsDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  async function handlePromote(e: React.FormEvent) {
    e.preventDefault();
    if (!promotingUser) return;
    setSavingPromotion(true);

    try {
      const res = await fetch("/api/admin/promover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: promotingUser.userId,
          newAccessType: targetAccessType,
          reason: promotionReason
        })
      });

      if (res.ok) {
        setMembers(members.map(m => m.userId === promotingUser.userId ? { ...m, accessType: targetAccessType, isEligibleForPromotion: false } : m));
        setPromotingUser(null);
        setPromotionReason("");
        showToast("success", `¡${promotingUser.displayName} promovido a ${targetAccessType.toUpperCase()} exitosamente!`);
      } else {
        const err = await res.json();
        showToast("error", err.error || "No se pudo realizar el ascenso.");
      }
    } catch {
      showToast("error", "Error de conexión al promover.");
    } finally {
      setSavingPromotion(false);
    }
  }

  const eligibleForPromotion = members.filter(m => m.accessType === "conexion" && m.isEligibleForPromotion);

  const filteredMembers = members.filter(m => 
    m.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.parentEnlaceName && m.parentEnlaceName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Progress bar helper
  const maxContacts = Math.max(...members.map(m => m.contactsCount), 1);

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 lg:p-8 space-y-5">
      {/* FLOATING TOAST */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-4 w-[90vw] md:w-auto z-[1200] flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm max-w-sm border backdrop-blur-md ${
            toast.type === "success"
              ? "bg-emerald-50/95 border-emerald-200 text-emerald-800"
              : "bg-rose-50/95 border-rose-200 text-rose-800"
          }`}
          style={{ animation: "slideDown .25s ease-out" }}
        >
          {toast.type === "success"
            ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
            : <AlertCircle size={18} className="text-rose-500 shrink-0" />
          }
          <span className="font-semibold text-[13px] leading-snug">{toast.msg}</span>
        </div>
      )}

      {/* ─── 1. HEADER ─── */}
      <header
        className="rounded-2xl p-5 sm:p-7 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0b1f3a 0%, #122b50 50%, #183d6e 100%)",
        }}
      >
        {/* Subtle decorative circle */}
        <div
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)" }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-300/70">
              Centro de Mando · Tonalá
            </p>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-tight">
              Bienvenido, {currentUser.displayName}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/10 border border-white/15 rounded-lg text-[11px] font-bold text-blue-200 uppercase tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {currentUser.accessType}
              </span>
            </div>
          </div>

          {/* GPS Radar */}
          <div className="shrink-0">
            {currentTerritoryInfo ? (
              <div className="bg-white/10 backdrop-blur border border-white/15 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/90 text-white flex items-center justify-center shrink-0">
                  <MapPin size={16} />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-white">Col. {currentTerritoryInfo.colony || "Zona Centro"}</p>
                  <p className="text-blue-200/80 font-medium">
                    Sección #{currentTerritoryInfo.sectionNum || "—"} · {currentTerritoryInfo.municipality || "Tonalá"}
                  </p>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleDetectCurrentLocation}
                disabled={isDetectingLocation}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/15 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-[.97] disabled:opacity-50"
              >
                {isDetectingLocation ? (
                  <>
                    <Navigation size={14} className="animate-spin text-blue-300" />
                    <span>Detectando...</span>
                  </>
                ) : (
                  <>
                    <Compass size={14} className="text-blue-300" />
                    <span>¿Dónde estoy parado?</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ─── 2. QUICK ACTIONS ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          href="/crm/nuevo"
          className="group flex items-center gap-3 px-4 py-3.5 rounded-xl border border-blue-100 bg-blue-50/60 hover:bg-blue-100/70 transition-all active:scale-[.97]"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Users size={17} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-blue-900 truncate leading-tight">+ Contacto</p>
            <p className="text-[10px] text-blue-600/70 font-medium truncate">Registro con GPS</p>
          </div>
        </Link>

        <Link
          href="/reportes"
          className="group flex items-center gap-3 px-4 py-3.5 rounded-xl border border-amber-100 bg-amber-50/60 hover:bg-amber-100/70 transition-all active:scale-[.97]"
        >
          <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <MapPin size={17} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-amber-900 truncate leading-tight">Incidencia</p>
            <p className="text-[10px] text-amber-600/70 font-medium truncate">Lona, bache, gestión</p>
          </div>
        </Link>

        <Link
          href="/equipo"
          className="group flex items-center gap-3 px-4 py-3.5 rounded-xl border border-emerald-100 bg-emerald-50/60 hover:bg-emerald-100/70 transition-all active:scale-[.97]"
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Activity size={17} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-emerald-900 truncate leading-tight">Bitácora</p>
            <p className="text-[10px] text-emerald-600/70 font-medium truncate">Visitas y recorridos</p>
          </div>
        </Link>

        <button
          type="button"
          onClick={handleShareLink}
          className="group flex items-center gap-3 px-4 py-3.5 rounded-xl border border-green-100 bg-green-50/60 hover:bg-green-100/70 transition-all active:scale-[.97] text-left cursor-pointer"
        >
          <div className="w-9 h-9 rounded-lg bg-green-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Share2 size={17} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-green-900 truncate leading-tight">WhatsApp</p>
            <p className="text-[10px] text-green-600/70 font-medium truncate">Copiar enlace</p>
          </div>
        </button>
      </div>

      {/* ─── 3. KPI METRICS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Registros */}
        <div className="bg-white rounded-xl border border-gray-200/80 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
              <Users size={16} />
            </div>
            {kpis.todayContacts > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-md">
                <Flame size={10} className="text-orange-500" />
                +{kpis.todayContacts}
              </span>
            )}
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-900 leading-none">{kpis.totalContacts.toLocaleString()}</p>
            <p className="text-[11px] font-medium text-gray-400 mt-1">Registros Sociales</p>
          </div>
        </div>

        {/* PAN */}
        <div className="bg-white rounded-xl border border-gray-200/80 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center text-sm font-black">
              M
            </div>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md">
              {kpis.totalContacts > 0 ? Math.round((kpis.panConfirmedContacts / kpis.totalContacts) * 100) : 0}%
            </span>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-900 leading-none">{kpis.panConfirmedContacts.toLocaleString()}</p>
            <p className="text-[11px] font-medium text-gray-400 mt-1">Militancia PAN</p>
          </div>
          {/* mini progress bar */}
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-700"
              style={{ width: `${kpis.totalContacts > 0 ? Math.min((kpis.panConfirmedContacts / kpis.totalContacts) * 100, 100) : 0}%` }}
            />
          </div>
        </div>

        {/* Bitácora */}
        <div className="bg-white rounded-xl border border-gray-200/80 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
              <Activity size={16} />
            </div>
            {kpis.todayActivities > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md">
                <TrendingUp size={10} />
                +{kpis.todayActivities}
              </span>
            )}
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-900 leading-none">{kpis.totalActivities.toLocaleString()}</p>
            <p className="text-[11px] font-medium text-gray-400 mt-1">Bitácora / Visitas</p>
          </div>
        </div>

        {/* Escucha Social */}
        <div className="bg-white rounded-xl border border-gray-200/80 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
              <MessageSquare size={16} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-900 leading-none">{kpis.totalSocialListening.toLocaleString()}</p>
            <p className="text-[11px] font-medium text-gray-400 mt-1">Escucha Social</p>
          </div>
        </div>
      </div>

      {/* ─── 4. PROMOTION SUGGESTIONS ─── */}
      {isCoordinacion && eligibleForPromotion.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200/70 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-500 shrink-0" />
            <h2 className="text-sm font-bold text-indigo-900">
              Sugerencias de Ascenso ({eligibleForPromotion.length})
            </h2>
          </div>
          <p className="text-xs text-indigo-800/70 font-medium">
            Integrantes con alta productividad listos para liderar su propio equipo.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {eligibleForPromotion.map(m => (
              <div key={m.userId} className="bg-white p-3.5 rounded-lg border border-indigo-100/80 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="font-bold text-xs text-gray-900 truncate">{m.displayName}</h4>
                  <p className="text-[10px] text-gray-500 font-medium truncate">
                    {m.contactsCount} personas · {m.activitiesCount} actividades
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPromotingUser(m);
                    setTargetAccessType("enlace");
                    setPromotionReason(`Excelente desempeño territorial con ${m.contactsCount} registros.`);
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-lg cursor-pointer whitespace-nowrap shrink-0 transition-colors"
                >
                  Promover
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── 5. TABBED DASHBOARD ─── */}
      <div className="bg-white rounded-xl border border-gray-200/80 overflow-hidden">
        {/* Tab Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-0.5 bg-gray-50 p-0.5 rounded-lg">
            {([
              { key: "ranking" as const, icon: <Award size={13} />, label: `Rendimiento (${members.length})` },
              { key: "activity" as const, icon: <Clock size={13} />, label: "Reciente" },
              { key: "quicklinks" as const, icon: <ExternalLink size={13} />, label: "Accesos" }
            ]).map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeTab === tab.key
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Search + View toggle (ranking tab) */}
          {activeTab === "ranking" && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-48 pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-800 outline-none focus:border-blue-300 focus:bg-white transition-colors"
                />
                <Search size={13} className="absolute left-2.5 top-[7px] text-gray-400" />
              </div>

              <div className="flex items-center bg-gray-50 p-0.5 rounded-lg border border-gray-200">
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    viewMode === "cards" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"
                  }`}
                >
                  Tarjetas
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    viewMode === "table" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"
                  }`}
                >
                  Tabla
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tab Content */}
        <div className="p-5">
          {/* TAB: RANKING */}
          {activeTab === "ranking" && (
            <div>
              {viewMode === "cards" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredMembers.map((m, idx) => (
                    <div
                      key={m.userId}
                      className="p-4 bg-white border border-gray-100 hover:border-gray-200 rounded-xl transition-all space-y-3"
                    >
                      {/* Name Row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-[11px] shrink-0 ${
                            idx === 0 ? "bg-amber-100 text-amber-800" :
                            idx === 1 ? "bg-gray-100 text-gray-600" :
                            idx === 2 ? "bg-orange-50 text-orange-700" : "bg-gray-50 text-gray-400"
                          }`}>
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <Link href={`/perfil/${m.userId}`} className="font-bold text-[13px] text-gray-900 hover:text-blue-600 truncate block leading-tight">
                              {m.displayName}
                            </Link>
                            <p className="text-[10px] text-gray-400 truncate">{m.email}</p>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                          m.accessType === "coordinacion" ? "bg-purple-50 text-purple-700" :
                          m.accessType === "enlace" ? "bg-blue-50 text-blue-700" : "bg-gray-50 text-gray-500"
                        }`}>
                          {m.accessType}
                        </span>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="py-2 bg-gray-50/80 rounded-lg">
                          <p className="text-sm font-extrabold text-gray-900">{m.contactsCount}</p>
                          <p className="text-[9px] font-medium text-gray-400 uppercase mt-0.5">Personas</p>
                        </div>
                        <div className="py-2 bg-blue-50/60 rounded-lg">
                          <p className="text-sm font-extrabold text-blue-700">{m.panContactsCount}</p>
                          <p className="text-[9px] font-medium text-gray-400 uppercase mt-0.5">PAN</p>
                        </div>
                        <div className="py-2 bg-emerald-50/60 rounded-lg">
                          <p className="text-sm font-extrabold text-emerald-700">{m.activitiesCount}</p>
                          <p className="text-[9px] font-medium text-gray-400 uppercase mt-0.5">Bitácora</p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${(m.contactsCount / maxContacts) * 100}%`,
                              background: idx === 0 ? "#f59e0b" : idx === 1 ? "#6b7280" : "#3b82f6",
                            }}
                          />
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-50 gap-2">
                        <span className="text-[10px] text-gray-400 truncate font-medium">
                          {m.parentEnlaceName ? `↳ ${m.parentEnlaceName}` : "Coordinación"}
                        </span>

                        <div className="flex items-center gap-1 shrink-0">
                          {m.phone && (
                            <a
                              href={`tel:${m.phone}`}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-md transition-colors"
                              title="Llamar"
                            >
                              <Phone size={12} />
                            </a>
                          )}
                          <Link
                            href={`/perfil/${m.userId}`}
                            className="px-2.5 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold rounded-md text-[11px] flex items-center gap-1 transition-colors"
                          >
                            Perfil
                            <ChevronRight size={11} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* TABLE VIEW */
                <div className="overflow-x-auto -mx-5">
                  <table className="w-full text-left text-xs min-w-[640px]">
                    <thead>
                      <tr className="border-b border-gray-100 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-5 w-8">#</th>
                        <th className="py-2.5 px-3">Integrante</th>
                        <th className="py-2.5 px-3">Nivel</th>
                        <th className="py-2.5 px-3">Enlace</th>
                        <th className="py-2.5 px-3 text-center">Personas</th>
                        <th className="py-2.5 px-3 text-center">PAN</th>
                        <th className="py-2.5 px-3 text-center">Bitácora</th>
                        <th className="py-2.5 px-5 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredMembers.map((m, idx) => (
                        <tr key={m.userId} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-5 font-bold text-gray-400 text-[11px]">{idx + 1}</td>
                          <td className="py-3 px-3">
                            <Link href={`/perfil/${m.userId}`} className="font-bold text-gray-900 hover:text-blue-600 block text-[13px]">
                              {m.displayName}
                            </Link>
                            <span className="text-[10px] text-gray-400">{m.email}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              m.accessType === "coordinacion" ? "bg-purple-50 text-purple-700" :
                              m.accessType === "enlace" ? "bg-blue-50 text-blue-700" : "bg-gray-50 text-gray-500"
                            }`}>
                              {m.accessType}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-gray-500 font-medium text-xs">
                            {m.parentEnlaceName || "Coordinación"}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-gray-900">{m.contactsCount}</td>
                          <td className="py-3 px-3 text-center font-bold text-blue-700">{m.panContactsCount > 0 ? m.panContactsCount : "—"}</td>
                          <td className="py-3 px-3 text-center font-bold text-emerald-700">{m.activitiesCount}</td>
                          <td className="py-3 px-5 text-right">
                            <Link
                              href={`/perfil/${m.userId}`}
                              className="px-2.5 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold rounded-md text-[11px] inline-flex items-center gap-1 transition-colors"
                            >
                              Ver <ArrowUpRight size={11} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: RECENT ACTIVITY */}
          {activeTab === "activity" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Últimos registros</span>
                <Link href="/crm/contacts" className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                  Ver todos <ChevronRight size={12} />
                </Link>
              </div>

              {recentContacts.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-400 font-medium">
                  No hay actividad registrada aún.
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {recentContacts.map(c => (
                    <div key={c.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                          <Users size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[13px] text-gray-900 truncate">
                            {c.firstName} {c.lastName}
                          </p>
                          <p className="text-[11px] text-gray-400 font-medium flex items-center gap-1 truncate">
                            <MapPin size={10} className="shrink-0" />
                            {c.colony ? `Col. ${c.colony}` : "Sin colonia"}
                            {c.sectionNum ? ` · Secc. #${c.sectionNum}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        {c.panMilitancy === "confirmada" && (
                          <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded">PAN</span>
                        )}
                        <span className="text-[11px] text-gray-400 font-medium tabular-nums">
                          {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <Link href={`/crm/contacts/${c.id}`} className="text-blue-600 hover:text-blue-700">
                          <ChevronRight size={14} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: QUICK LINKS */}
          {activeTab === "quicklinks" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { href: "/mapa", icon: Map, label: "Mapa Territorial", sub: "Capas y colonias", color: "blue" },
                { href: "/estructura-electoral", icon: Vote, label: "Secciones INE", sub: "Avance electoral", color: "indigo" },
                { href: "/escucha-social", icon: Megaphone, label: "Escucha Social", sub: "Gestiones ciudadanas", color: "amber" },
                { href: "/admin-equipos", icon: Users, label: "Equipos", sub: "Estructura humana", color: "emerald" },
              ].map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`group p-4 rounded-xl border border-gray-100 hover:border-${link.color}-200 bg-gray-50/50 hover:bg-${link.color}-50/50 text-center space-y-2 transition-all`}
                >
                  <div className={`w-9 h-9 mx-auto bg-${link.color}-100 text-${link.color}-600 rounded-lg flex items-center justify-center text-base group-hover:scale-110 transition-transform`}>
                    <link.icon size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">{link.label}</p>
                    <p className="text-[10px] text-gray-400 font-medium">{link.sub}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── 6. PROMOTION MODAL ─── */}
      {promotingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in" onClick={() => setPromotingUser(null)}>
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl max-h-[88dvh] flex flex-col overflow-hidden border border-gray-200 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div
              className="px-5 py-4 flex justify-between items-center shrink-0"
              style={{ background: "linear-gradient(135deg, #0b1f3a, #183d6e)" }}
            >
              <div>
                <p className="text-[10px] font-bold uppercase text-blue-300/70 tracking-wider">Auditoría de Ascenso</p>
                <h3 className="text-sm font-bold text-white mt-0.5">Promover a {promotingUser.displayName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPromotingUser(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
                title="Cerrar ventana"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handlePromote} className="p-5 space-y-4 overflow-y-auto overscroll-contain flex-1 pb-16">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5">Nuevo Nivel</label>
                <select
                  value={targetAccessType}
                  onChange={e => setTargetAccessType(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-blue-300 transition-colors"
                >
                  <option value="enlace">Enlace (Líder con equipo propio)</option>
                  <option value="coordinacion">Coordinación (Acceso global)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5">Motivo *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Escribe el motivo del ascenso..."
                  value={promotionReason}
                  onChange={e => setPromotionReason(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-blue-300 resize-none transition-colors"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setPromotingUser(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-600 cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPromotion}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50 transition-colors shadow-md"
                >
                  {savingPromotion ? "Promoviendo..." : "Confirmar Ascenso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
