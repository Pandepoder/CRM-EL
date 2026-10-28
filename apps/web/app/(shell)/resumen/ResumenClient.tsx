"use client";

import { useState } from "react";
import Link from "next/link";
import { MiDia } from "@/components/MiDia";
import { QueEsEsto } from "@/components/QueEsEsto";
import { avisar } from "@/lib/avisos";
import { nombreDelNivel } from "@/lib/lenguaje";
import {
  diasConMeta,
  esMetaValida,
  medallaDeLaSemana,
  MEDALLAS,
  META_MAXIMA,
  META_MINIMA,
  metaBase,
  opcionesDeMeta,
  perfilDeTrabajo,
  type Medalla
} from "@/lib/logros";
import type { IntegranteDelTablero } from "@/lib/resumen-tablero";
import { 
  Users, Award, Activity, MessageSquare, Sparkles, AlertCircle, X, CheckCircle2,
  MapPin, Share2, Compass, Navigation, Search, Phone, ExternalLink,
  ChevronRight, Flame, ArrowUpRight, TrendingUp, Clock,
  Map, Vote, Megaphone
} from "lucide-react";

/** Lo arma el servidor (`tableroDelResumen`); el teléfono, si llega, es para el botón de llamar. */
type MemberPerformance = IntegranteDelTablero & { phone?: string | null };
type SemanaDeLaPersona = IntegranteDelTablero["semana"];

const DIAS_CORTOS = ["L", "M", "M", "J", "V", "S", "D"];
const DIAS_LARGOS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

const ESTILO_MEDALLA: Record<Medalla, string> = {
  oro: "bg-amber-100 border-amber-300",
  plata: "bg-slate-100 border-slate-300",
  bronce: "bg-orange-100 border-orange-300"
};

/** La medalla de la semana, o las iniciales en gris si todavía no tiene. */
function MedallaDeLaSemana({ m }: { m: MemberPerformance }) {
  const medalla = m.semana.medalla;
  if (!medalla) {
    const partes = m.displayName.trim().split(/\s+/);
    return (
      <span className="w-9 h-9 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 flex items-center justify-center font-extrabold text-xs shrink-0" aria-hidden="true">
        {((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase() || "?"}
      </span>
    );
  }
  const { emoji, nombre } = MEDALLAS[medalla];
  return (
    <span
      className={`w-9 h-9 rounded-xl border flex items-center justify-center text-xl shrink-0 ${ESTILO_MEDALLA[medalla]}`}
      role="img"
      aria-label={`Medalla de ${nombre.toLowerCase()} esta semana`}
      title={`${nombre}: ${m.semana.diasCumplidos} ${m.semana.diasCumplidos === 1 ? "día" : "días"} con su meta esta semana`}
    >
      {emoji}
    </span>
  );
}

/** Siete puntos, de lunes a domingo: verde el día que llegó a su meta; hoy, con contorno. */
function PuntosDeLaSemana({ semana }: { semana: SemanaDeLaPersona }) {
  return (
    <div
      className="flex items-center gap-1"
      role="img"
      aria-label={`Esta semana llegó a su meta ${semana.diasCumplidos} de ${semana.hoyIndice + 1} días`}
    >
      {semana.porDia.map((n, i) => {
        const cumplido = n >= semana.meta;
        const futuro = i > semana.hoyIndice;
        return (
          <span
            key={i}
            title={`${DIAS_LARGOS[i]}: ${n} de ${semana.meta}`}
            className={`w-6 h-6 rounded-full text-[11px] font-extrabold flex items-center justify-center ${
              cumplido ? "bg-emerald-500 text-white" : futuro ? "bg-gray-50 text-gray-300" : n > 0 ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
            } ${i === semana.hoyIndice ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
          >
            {DIAS_CORTOS[i]}
          </span>
        );
      })}
    </div>
  );
}

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
  canManageSensitive = false,
  currentUser,
  kpis,
  recentContacts = [],
  leaderboard
}: {
  canManageSensitive?: boolean;
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
  // Meta del día que fija quien coordina (§4, decisión 4).
  const [fijandoMeta, setFijandoMeta] = useState<MemberPerformance | null>(null);
  const [metaElegida, setMetaElegida] = useState<string>("");
  const [guardandoMeta, setGuardandoMeta] = useState(false);

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

  const isCoordinacion = canManageSensitive;

  // Share or Copy Personal Registration Link
  const handleShareLink = async () => {
    // Sin enlace no se comparte nada: `/registro/<id>` respondía 404 a quien lo abría.
    const slug = currentUser.personalSlug;
    if (!slug) {
      showToast("error", "Tu enlace personal no está listo. Recarga la página e inténtalo otra vez.");
      return;
    }
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

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`¡Hola! Te comparto mi enlace para registrarte en nuestra red ciudadana:\n${shareUrl}`)}`;
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
              municipality: data.municipality || "",
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
        showToast("success", `¡${promotingUser.displayName} ahora es ${nombreDelNivel(targetAccessType)}!`);
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

  const abrirMeta = (m: MemberPerformance) => {
    setFijandoMeta(m);
    setMetaElegida(String(m.semana.meta));
  };

  async function guardarMeta(meta: number | null) {
    if (!fijandoMeta) return;
    if (meta !== null && !esMetaValida(meta)) {
      avisar(`Escribe un número de ${META_MINIMA} a ${META_MAXIMA}.`);
      return;
    }
    setGuardandoMeta(true);
    try {
      const res = await fetch(`/api/equipo/personas/${fijandoMeta.userId}/meta`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meta })
      });
      const datos = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        avisar(datos.error || "No se pudo guardar la meta. Revisa tu señal y vuelve a intentarlo.");
        return;
      }
      const persona = fijandoMeta;
      setMembers((lista) =>
        lista.map((m) => {
          if (m.userId !== persona.userId) return m;
          // Sin meta del líder, se mide otra vez con la de su rol (la misma que usa el servidor).
          const nueva = meta ?? metaBase(perfilDeTrabajo(m.roleKey));
          const dias = m.semana.porDia.map((_, i) => String(i));
          const porDia = Object.fromEntries(m.semana.porDia.map((n, i) => [String(i), n]));
          const cumplidos = diasConMeta(porDia, dias, nueva);
          return { ...m, semana: { ...m.semana, meta: nueva, metaDelLider: meta, diasCumplidos: cumplidos, medalla: medallaDeLaSemana(cumplidos) } };
        })
      );
      setFijandoMeta(null);
      avisar(
        meta === null
          ? `${persona.displayName} vuelve a elegir su ritmo.`
          : `Listo: la meta de ${persona.displayName} es de ${meta} al día. La verá en su «Mi día».`,
        "exito"
      );
    } catch {
      avisar("No se pudo guardar la meta. Revisa tu señal y vuelve a intentarlo.");
    } finally {
      setGuardandoMeta(false);
    }
  }

  const eligibleForPromotion = members.filter(m => m.accessType === "conexion" && m.isEligibleForPromotion);

  const filteredMembers = members.filter(m => 
    m.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.parentEnlaceName && m.parentEnlaceName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="workspace-page summary-page max-w-7xl mx-auto p-3 sm:p-6 lg:p-8 space-y-5">
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
        className="workspace-hero rounded-2xl p-5 sm:p-7 relative overflow-hidden"
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
              TU TERRITORIO, EN UN SOLO LUGAR
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {/* «Hola» y no «Bienvenido»: no supone el género de nadie (L11). */}
              Hola, {currentUser.displayName.trim().split(/\s+/)[0] || currentUser.displayName}
            </h1>
            <p className="text-sm text-blue-100/90 pt-2 pb-3">Cada contacto cuenta. Cada acción acerca a tu equipo.</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/10 border border-white/15 rounded-lg text-[11px] font-bold text-blue-200 uppercase tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {nombreDelNivel(currentUser.accessType)}
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
                    Sección #{currentTerritoryInfo.sectionNum || "—"} · {currentTerritoryInfo.municipality || "Municipio no identificado"}
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

      {/* Meta del día, racha e insignias de quien abre el Resumen: solo lo suyo. */}
      <MiDia />

      {/* ─── 2. QUICK ACTIONS ─── */}
      <div className="summary-actions grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          href="/crm/nuevo"
          className="group flex items-center gap-3 px-4 py-3.5 rounded-xl border border-blue-100 bg-blue-50/60 hover:bg-blue-100/70 transition-all active:scale-[.97]"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Users size={17} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-blue-900 truncate leading-tight">Registrar</p>
            <p className="text-[11px] text-blue-600/70 font-medium truncate">Ciudadano, con GPS</p>
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
            <p className="text-[11px] text-amber-600/70 font-medium truncate">Lona, bache, gestión</p>
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
            <p className="text-[13px] font-bold text-emerald-900 truncate leading-tight">Agenda</p>
            <p className="text-[11px] text-emerald-600/70 font-medium truncate">Visitas y recorridos</p>
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
            <p className="text-[11px] text-green-600/70 font-medium truncate">Copiar enlace</p>
          </div>
        </button>
      </div>

      {/* ─── 3. KPI METRICS ─── */}
      <div className="summary-metrics grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Registros */}
        <div className="bg-white rounded-xl border border-gray-200/80 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
              <Users size={16} />
            </div>
            {kpis.todayContacts > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-md">
                <Flame size={10} className="text-orange-500" />
                +{kpis.todayContacts}
              </span>
            )}
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-900 leading-none">{kpis.totalContacts.toLocaleString()}</p>
            <p className="text-[11px] font-medium text-gray-500 mt-1">Ciudadanos registrados</p>
          </div>
        </div>

        {/* PAN */}
        <div className="bg-white rounded-xl border border-gray-200/80 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center text-sm font-black">
              M
            </div>
            <span className="text-[11px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md">
              {kpis.totalContacts > 0 ? Math.round((kpis.panConfirmedContacts / kpis.totalContacts) * 100) : 0}%
            </span>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-900 leading-none">{kpis.panConfirmedContacts.toLocaleString()}</p>
            <p className="text-[11px] font-medium text-gray-500 mt-1">Militancia PAN</p>
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
              <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md">
                <TrendingUp size={10} />
                +{kpis.todayActivities}
              </span>
            )}
          </div>
          <div>
            <p className="text-2xl font-extrabold text-gray-900 leading-none">{kpis.totalActivities.toLocaleString()}</p>
            <p className="text-[11px] font-medium text-gray-500 mt-1">Agenda y visitas</p>
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
            <p className="text-[11px] font-medium text-gray-500 mt-1">Escucha Social</p>
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
                  <p className="text-[11px] text-gray-500 font-medium truncate">
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 pt-4 pb-3 border-b border-gray-100">
          {/* En el teléfono las tres pestañas no cabían y «Accesos» quedaba cortada: se desliza de lado. */}
          <div className="flex items-center gap-0.5 bg-gray-50 p-0.5 rounded-lg max-w-full overflow-x-auto">
            {([
              { key: "ranking" as const, icon: <Award size={13} />, label: `Rendimiento (${members.length})` },
              { key: "activity" as const, icon: <Clock size={13} />, label: "Reciente" },
              { key: "quicklinks" as const, icon: <ExternalLink size={13} />, label: "Accesos" }
            ]).map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`min-h-[40px] px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
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
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <input
                  type="search"
                  placeholder="Buscar persona…"
                  aria-label="Buscar en tu equipo"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full sm:w-48 min-h-[40px] pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-800 outline-none focus:border-blue-300 focus:bg-white transition-colors"
                />
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              </div>

              <div className="flex items-center bg-gray-50 p-0.5 rounded-lg border border-gray-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`min-h-[36px] px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "cards" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                  }`}
                >
                  Tarjetas
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`min-h-[36px] px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "table" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
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
                <div className="space-y-3">
                <div className="flex items-start gap-2 rounded-xl bg-amber-50/70 border border-amber-100 px-3 py-2">
                  <span className="text-base leading-5 shrink-0" aria-hidden="true">🥇</span>
                  <p className="flex-1 text-xs font-semibold text-amber-950 leading-5">
                    Las medallas cuentan los días de esta semana en que cada quien llegó a su propia meta: no comparan a nadie.
                  </p>
                  <QueEsEsto termino="medallas" className="shrink-0" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredMembers.map((m) => (
                    <div
                      key={m.userId}
                      className="p-4 bg-white border border-gray-100 hover:border-gray-200 rounded-xl transition-all space-y-3"
                    >
                      {/* Name Row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <MedallaDeLaSemana m={m} />
                          <div className="min-w-0">
                            <Link href={`/perfil/${m.userId}`} className="font-bold text-[14px] text-gray-900 hover:text-blue-600 truncate block leading-tight">
                              {m.displayName}
                            </Link>
                            <p className="text-[11px] text-gray-500 truncate">{m.email}</p>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold shrink-0 ${
                          m.accessType === "coordinacion" ? "bg-purple-50 text-purple-700" :
                          m.accessType === "enlace" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"
                        }`}>
                          {nombreDelNivel(m.accessType)}
                        </span>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="py-2 bg-gray-50/80 rounded-lg">
                          <p className="text-sm font-extrabold text-gray-900">{m.contactsCount}</p>
                          <p className="text-[11px] font-semibold text-gray-500 mt-0.5">Personas</p>
                        </div>
                        <div className="py-2 bg-blue-50/60 rounded-lg">
                          <p className="text-sm font-extrabold text-blue-700">{m.panContactsCount}</p>
                          <p className="text-[11px] font-semibold text-gray-500 mt-0.5">PAN</p>
                        </div>
                        <div className="py-2 bg-emerald-50/60 rounded-lg">
                          <p className="text-sm font-extrabold text-emerald-700">{m.activitiesCount}</p>
                          <p className="text-[11px] font-semibold text-gray-500 mt-0.5">Agenda</p>
                        </div>
                      </div>

                      {/* La semana contra su propia meta */}
                      <div className="rounded-lg bg-gray-50/80 px-2.5 py-2 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <PuntosDeLaSemana semana={m.semana} />
                          <span className="text-xs font-bold text-gray-700 tabular-nums">
                            Hoy: {m.semana.porDia[m.semana.hoyIndice] ?? 0} de {m.semana.meta}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-gray-600 min-w-0 leading-tight">
                            <strong className="block text-gray-800">Meta: {m.semana.meta} al día</strong>
                            {m.semana.metaDelLider !== null ? "Puesta por coordinación" : "La de su rol"}
                          </span>
                          {m.puedeFijarMeta && (
                            <button
                              type="button"
                              onClick={() => abrirMeta(m)}
                              className="shrink-0 min-h-[36px] px-2.5 rounded-lg bg-white border border-gray-200 hover:bg-blue-50 hover:border-blue-200 text-blue-700 text-xs font-extrabold cursor-pointer"
                            >
                              Cambiar meta
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-50 gap-2">
                        <span className="text-[11px] text-gray-500 truncate font-medium">
                          {m.parentEnlaceName ? `↳ ${m.parentEnlaceName}` : "Coordinación"}
                        </span>

                        <div className="flex items-center gap-1 shrink-0">
                          {m.phone && (
                            <a
                              href={`tel:${m.phone}`}
                              className="w-9 h-9 flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors"
                              title="Llamar"
                              aria-label={`Llamar a ${m.displayName}`}
                            >
                              <Phone size={14} />
                            </a>
                          )}
                          <Link
                            href={`/perfil/${m.userId}`}
                            className="min-h-[36px] px-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors"
                          >
                            Perfil
                            <ChevronRight size={12} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                </div>
              ) : (
                /* TABLE VIEW */
                <div className="overflow-x-auto -mx-5">
                  <table className="w-full text-left text-xs min-w-[640px]">
                    <thead>
                      <tr className="border-b border-gray-100 text-[11px] text-gray-500 font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-5">Semana</th>
                        <th className="py-2.5 px-3">Integrante</th>
                        <th className="py-2.5 px-3">Nivel</th>
                        <th className="py-2.5 px-3">Enlace</th>
                        <th className="py-2.5 px-3 text-center">Personas</th>
                        <th className="py-2.5 px-3 text-center">PAN</th>
                        <th className="py-2.5 px-3 text-center">Agenda</th>
                        <th className="py-2.5 px-3 text-center">Meta al día</th>
                        <th className="py-2.5 px-5 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredMembers.map((m) => (
                        <tr key={m.userId} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-5">
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 whitespace-nowrap">
                              {m.semana.medalla ? MEDALLAS[m.semana.medalla].emoji : "—"} {m.semana.diasCumplidos} {m.semana.diasCumplidos === 1 ? "día" : "días"}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <Link href={`/perfil/${m.userId}`} className="font-bold text-gray-900 hover:text-blue-600 block text-[13px]">
                              {m.displayName}
                            </Link>
                            <span className="text-[11px] text-gray-500">{m.email}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                              m.accessType === "coordinacion" ? "bg-purple-50 text-purple-700" :
                              m.accessType === "enlace" ? "bg-blue-50 text-blue-700" : "bg-gray-50 text-gray-500"
                            }`}>
                              {nombreDelNivel(m.accessType)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-gray-500 font-medium text-xs">
                            {m.parentEnlaceName || "Coordinación"}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-gray-900">{m.contactsCount}</td>
                          <td className="py-3 px-3 text-center font-bold text-blue-700">{m.panContactsCount > 0 ? m.panContactsCount : "—"}</td>
                          <td className="py-3 px-3 text-center font-bold text-emerald-700">{m.activitiesCount}</td>
                          <td className="py-3 px-3 text-center">
                            {m.puedeFijarMeta ? (
                              <button
                                type="button"
                                onClick={() => abrirMeta(m)}
                                className="min-h-[32px] px-2.5 rounded-lg border border-gray-200 bg-white hover:bg-blue-50 text-blue-700 text-xs font-extrabold cursor-pointer tabular-nums"
                                title="Cambiar meta"
                              >
                                {m.semana.meta}{m.semana.metaDelLider !== null ? " ✎" : ""}
                              </button>
                            ) : (
                              <span className="font-bold text-gray-700 tabular-nums">{m.semana.meta}</span>
                            )}
                          </td>
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
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Últimos registros</span>
                <Link href="/crm/contacts" className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                  Ver todos <ChevronRight size={12} />
                </Link>
              </div>

              {recentContacts.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <p className="text-sm text-gray-600 font-semibold">Aún no hay ciudadanos registrados en tu equipo.</p>
                  <Link href="/crm/nuevo" className="inline-flex items-center min-h-[44px] px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold">
                    Registrar ciudadano
                  </Link>
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
                          <p className="text-[11px] text-gray-500 font-medium flex items-center gap-1 truncate">
                            <MapPin size={10} className="shrink-0" />
                            {c.colony ? `Col. ${c.colony}` : "Sin colonia"}
                            {c.sectionNum ? ` · Secc. #${c.sectionNum}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        {c.panMilitancy === "confirmada" && (
                          <span className="text-[11px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded">PAN</span>
                        )}
                        <span className="text-[11px] text-gray-500 font-medium tabular-nums">
                          {new Date(c.createdAt).toLocaleTimeString("es-MX", { hour: '2-digit', minute: '2-digit' })}
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
                    <p className="text-[11px] text-gray-500 font-medium">{link.sub}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── META DEL DÍA (la fija quien coordina) ─── */}
      {fijandoMeta && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => !guardandoMeta && setFijandoMeta(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-meta"
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4 max-h-[88dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 id="titulo-meta" className="text-lg font-black text-gray-900 leading-tight">Meta del día de {fijandoMeta.displayName}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Acciones al día: registros, visitas cerradas, prospectos y peticiones. La verá en su «Mi día».
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFijandoMeta(null)}
                className="w-11 h-11 shrink-0 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center cursor-pointer"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Metas sugeridas">
              {opcionesDeMeta(perfilDeTrabajo(fijandoMeta.roleKey)).map((o) => (
                <button
                  key={o.etiqueta}
                  type="button"
                  role="radio"
                  aria-checked={metaElegida === String(o.meta)}
                  onClick={() => setMetaElegida(String(o.meta))}
                  className={`min-h-[56px] rounded-xl border text-sm font-extrabold cursor-pointer transition-colors ${
                    metaElegida === String(o.meta) ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-200 text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  {o.etiqueta}
                  <span className={`block text-xs font-bold ${metaElegida === String(o.meta) ? "text-blue-100" : "text-gray-500"}`}>{o.meta} al día</span>
                </button>
              ))}
            </div>

            <label className="block">
              <span className="block text-sm font-bold text-gray-700 mb-1">Otra cantidad</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={3}
                value={metaElegida}
                onChange={(e) => setMetaElegida(e.target.value.replace(/\D/g, ""))}
                className="w-full min-h-[48px] px-3 rounded-xl border border-gray-200 bg-gray-50 text-base font-bold text-gray-900 outline-none focus:border-blue-400 focus:bg-white"
                aria-describedby="ayuda-meta"
              />
              <span id="ayuda-meta" className="block text-xs text-gray-500 mt-1">De {META_MINIMA} a {META_MAXIMA}.</span>
            </label>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-1">
              {fijandoMeta.semana.metaDelLider !== null ? (
                <button
                  type="button"
                  disabled={guardandoMeta}
                  onClick={() => guardarMeta(null)}
                  className="min-h-[44px] px-4 rounded-xl text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 cursor-pointer disabled:opacity-50"
                >
                  Quitar meta: que elija su ritmo
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                disabled={guardandoMeta || !metaElegida}
                onClick={() => guardarMeta(Number(metaElegida))}
                className="min-h-[44px] px-5 rounded-xl text-sm font-extrabold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer disabled:opacity-50"
              >
                {guardandoMeta ? "Guardando…" : "Guardar meta"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 6. PROMOTION MODAL ─── */}
      {promotingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-3 sm:p-4 animate-in fade-in" onClick={() => setPromotingUser(null)}>
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl max-h-[88dvh] flex flex-col overflow-hidden border border-gray-200 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div
              className="px-5 py-4 flex justify-between items-center shrink-0"
              style={{ background: "linear-gradient(135deg, #0b1f3a, #183d6e)" }}
            >
              <div>
                <p className="text-[11px] font-bold uppercase text-blue-300/70 tracking-wider">Auditoría de Ascenso</p>
                <h3 className="text-sm font-bold text-white mt-0.5">Promover a {promotingUser.displayName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPromotingUser(null)}
                className="w-11 h-11 shrink-0 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
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
                  <option value="coordinacion">Coordinación (categoría; el acceso lo da el equipo)</option>
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
