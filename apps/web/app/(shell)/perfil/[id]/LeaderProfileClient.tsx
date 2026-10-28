"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  User, Shield, Mail, Calendar, MapPin, Phone, Home,
  CheckCircle, Clock, Plus, Search, Users, ChevronRight,
  Building2, Hash, Key, Flag, ListChecks
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { puedeAbrir } from "@tonala/ui";
import { AccionesDeContacto } from "@/components/AccionesDeContacto";
import { AvatarPersona } from "@/components/AvatarPersona";
import { FotoDePerfilEditable } from "@/components/FotoDePerfilEditable";
import { DomicilioDeLaCuenta, type Domicilio } from "@/components/DomicilioDeLaCuenta";
import { avisar } from "@/lib/avisos";
import type { EquipoDePersona } from "@/lib/equipos-de-persona";
import type { ActividadDelPerfil, CiudadanoDelPerfil, ResumenDeActividades } from "@/lib/perfil";
import type { PestanaDelPerfil } from "@/lib/perfil-pestanas";

export type LeaderUser = {
  id: string;
  displayName: string;
  email: string;
  status: string;
  createdAt: string;
  roleKey: string;
  roleName: string;
  /** Foto de perfil (3.6); sin ella, iniciales. */
  photoUrl: string | null;
};


export default function LeaderProfileClient({
  user,
  equipos,
  contacts,
  totalContactos,
  activities,
  resumenActividades,
  topColonies,
  topSections,
  domicilio = null,
  isCurrentUser,
  pestanaInicial = "contactos",
  currentUserRole
}: {
  user: LeaderUser;
  equipos: EquipoDePersona[];
  /** Los últimos 20 que quien mira puede ver (plan de auditoría de menús, fase 6); el resto, en el Directorio. */
  contacts: CiudadanoDelPerfil[];
  totalContactos: number;
  /** Las últimas 30, con el tipo real de la Agenda; el resto, en la Agenda. */
  activities: ActividadDelPerfil[];
  resumenActividades: ResumenDeActividades;
  topColonies: { name: string; count: number }[];
  topSections: { name: string; count: number }[];
  /** `null`: quien mira no puede ver dónde vive esta persona. */
  domicilio?: Domicilio | null;
  isCurrentUser: boolean;
  /** La que pide `?pestana=` (`lib/perfil-pestanas.ts`); `/settings` lleva a «seguridad». */
  pestanaInicial?: PestanaDelPerfil;
  currentUserRole: string;
}) {
  const router = useRouter();
  // La misma lista con la que la pantalla de alta deja entrar (`capacidades.ts`).
  const puedeRegistrar = puedeAbrir("/crm/nuevo", currentUserRole);

  // Active Tab
  const [activeTab, setActiveTab] = useState<PestanaDelPerfil>(pestanaInicial);
  // Quien llega a una pestaña concreta (desde lo que fue Ajustes, por ejemplo) la ve sin buscarla: en el
  // teléfono, las pestañas quedan debajo de la cabecera y de las cifras.
  const refPestanas = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Sin animación: con el desplazamiento suave de toda la página, al cargar se quedaba a medio camino.
    if (pestanaInicial !== "contactos") refPestanas.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [pestanaInicial]);

  // Activity filter: por el tipo real de la Agenda (antes se adivinaba por el título).
  const [activityCategoryFilter, setActivityCategoryFilter] = useState("todas");
  const [activitySearch, setActivitySearch] = useState("");

  // Password change state (for current user)
  const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" });
  const [passwordStatus, setPasswordStatus] = useState<{ error?: string; success?: string }>({});
  const [savingPassword, setSavingPassword] = useState(false);

  // Name edit state (for current user)
  const [displayName, setDisplayName] = useState(user.displayName);
  const [savingName, setSavingName] = useState(false);

  const filteredContacts = contacts;
  const enDirectorio = `/crm/contacts?registro=${user.id}`;

  // Los tipos de las actividades que se ven, para los filtros.
  const tiposEnLista = useMemo(() => [...new Set(activities.map((a) => a.tipo))].sort((a, b) => a.localeCompare(b, "es")), [activities]);

  // Filtered activities
  const filteredActivities = useMemo(() => {
    return activities.filter(a => {
      if (activityCategoryFilter !== "todas" && a.tipo !== activityCategoryFilter) return false;
      if (!activitySearch.trim()) return true;
      const q = activitySearch.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q)
      );
    });
  }, [activities, activityCategoryFilter, activitySearch]);

  // KPIs: contados en la base sobre todas sus actividades, no sobre las 30 de la lista.
  const totalActividades = resumenActividades.total;
  const completedCount = resumenActividades.hechas;
  const completionRate = totalActividades > 0 ? Math.round((completedCount / totalActividades) * 100) : 0;
  const tiposPrincipales = resumenActividades.porTipo.slice(0, 3);

  async function handleSaveName() {
    if (!displayName.trim() || displayName.trim() === user.displayName) return;
    setSavingName(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        avisar("No se pudo cambiar el nombre. Revisa tu señal y vuelve a intentarlo.");
      }
    } finally {
      setSavingName(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordStatus({ error: "Las contraseñas nuevas no coinciden." });
      return;
    }
    if (passwordForm.new.length < 6) {
      setPasswordStatus({ error: "La contraseña debe tener al menos 6 caracteres." });
      return;
    }

    setSavingPassword(true);
    setPasswordStatus({});
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: passwordForm.current, newPassword: passwordForm.new }),
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordStatus({ success: "Contraseña actualizada exitosamente." });
        setPasswordForm({ current: "", new: "", confirm: "" });
      } else {
        setPasswordStatus({ error: data.error || "Error al cambiar la contraseña." });
      }
    } catch {
      setPasswordStatus({ error: "Error de red al actualizar la contraseña." });
    } finally {
      setSavingPassword(false);
    }
  }

  // El tipo real (el de la Agenda, «Visita» o «Incidencia»), con su color.
  const getCategoryBadge = (tipo: string) => {
    if (tipo === "Visita") {
      return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1"><Home size={12} /> Visita</span>;
    }
    if (tipo === "Incidencia") {
      return <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1"><Flag size={12} /> Incidencia</span>;
    }
    return <span className="bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1"><ListChecks size={12} /> {tipo}</span>;
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-7">
      {/* 1. HERO HEADER 360° */}
      <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            {/* Foto de perfil: la propia se cambia desde aquí; la de los demás solo se ve. */}
            {isCurrentUser ? (
              <FotoDePerfilEditable nombre={user.displayName} fotoUrl={user.photoUrl} tamano={80} />
            ) : (
              <AvatarPersona nombre={user.displayName} fotoUrl={user.photoUrl} tamano={80} className="border-2 border-white/20 shadow-lg" />
            )}

            {/* User Info */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase font-black tracking-wider bg-blue-500/30 text-blue-200 px-3 py-0.5 rounded-full border border-blue-400/30 flex items-center gap-1">
                  <Shield size={12} /> {user.roleName}
                </span>
                {isCurrentUser && (
                  <span className="text-xs font-black bg-cyan-400/30 text-cyan-200 px-2.5 py-0.5 rounded-full border border-cyan-300/30">
                    Tu Cuenta
                  </span>
                )}
              </div>

              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                <span>{user.displayName}</span>
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-xs text-blue-200/90 font-medium pt-0.5">
                <span className="flex items-center gap-1">
                  <Mail size={13} className="text-blue-400" /> {user.email}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Building2 size={13} className="text-blue-400" />{" "}
                  {equipos.length === 0 ? "Sin equipo todavía" : equipos.map((e) => (e.lidera ? `Dirige ${e.nombre}` : e.nombre)).join(" · ")}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar size={13} className="text-blue-400" /> Miembro desde {new Date(user.createdAt).toLocaleDateString("es-MX", { month: "short", year: "numeric" })}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              href={`/equipo?scope=equipo&leaderId=${user.id}`}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs backdrop-blur-sm border border-white/15 transition-all flex items-center gap-1.5"
            >
              <Calendar size={14} /> Ver en Agenda
            </Link>

            {/* Solo equipos que existen y que quien mira puede abrir en «Equipos». */}
            {equipos.filter((e) => e.enlazable).map((e, i, lista) => (
              <Link
                key={e.id}
                href={`/admin-equipos/${e.id}`}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs backdrop-blur-sm border border-white/15 transition-all flex items-center gap-1.5"
              >
                <Users size={14} /> {lista.length === 1 ? "Ver su equipo" : `Ver ${e.nombre}`}
              </Link>
            ))}

            {/* Solo a quien la pantalla de alta deja entrar: al brigadista lo rebotaba a su inicio (L4). */}
            {puedeRegistrar && (
              <Link
                href="/crm/nuevo"
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5"
              >
                <Plus size={14} /> Registrar ciudadano
              </Link>
            )}
          </div>
        </div>
      </div>

      {domicilio && <DomicilioDeLaCuenta domicilio={domicilio} editable={isCurrentUser} />}

      {/* 2. KPI METRICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-4 rounded-2xl text-white shadow-sm">
          <div className="flex items-center justify-between opacity-80 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Personas en Red</span>
            <Users size={15} />
          </div>
          <div className="text-2xl font-black">{totalContactos.toLocaleString("es-MX")}</div>
          <div className="text-[10px] opacity-75 font-semibold mt-1">Ciudadanos registrados</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Actividades</span>
            <Calendar size={15} className="text-blue-600" />
          </div>
          <div className="text-2xl font-black text-gray-900">{totalActividades.toLocaleString("es-MX")}</div>
          <div className="text-[10px] text-gray-400 font-semibold mt-1">En agenda territorial</div>
        </div>

        {/* Los tres tipos que más hace, con el nombre real de la Agenda. Antes «Pláticas», «Visitas» y «Eventos»
            se adivinaban por el título de cada actividad. */}
        {tiposPrincipales.map((t) => (
          <div key={t.tipo} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider line-clamp-2" title={t.tipo}>{t.tipo}</span>
              <ListChecks size={15} className="text-blue-500 shrink-0" />
            </div>
            <div className="text-2xl font-black text-gray-900">{t.cantidad.toLocaleString("es-MX")}</div>
          </div>
        ))}

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">% Cumplimiento</span>
            <CheckCircle size={15} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{completionRate}%</div>
          <div className="text-[10px] text-gray-400 font-semibold mt-1">{completedCount} de {totalActividades}</div>
        </div>
      </div>

      {/* 3. PESTAÑAS 360° */}
      <div ref={refPestanas} className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-1 scroll-mt-20">
        <button
          type="button"
          onClick={() => setActiveTab("contactos")}
          className={`min-h-[44px] px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "contactos"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <Users size={14} />
          <span>Personas que ha Subido</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeTab === "contactos" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"}`}>
            {totalContactos.toLocaleString("es-MX")}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("agenda")}
          className={`min-h-[44px] px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "agenda"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <Calendar size={14} />
          <span>Agenda y Actividades Realizadas</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeTab === "agenda" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"}`}>
            {totalActividades.toLocaleString("es-MX")}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("territorio")}
          className={`min-h-[44px] px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "territorio"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <MapPin size={14} />
          <span>Cobertura y Colonias</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeTab === "territorio" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"}`}>
            {topColonies.length}
          </span>
        </button>

        {isCurrentUser && (
          <button
            type="button"
            onClick={() => setActiveTab("seguridad")}
            className={`min-h-[44px] px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "seguridad"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Key size={14} />
            <span>Seguridad y Contraseña</span>
          </button>
        )}
      </div>

      {/* 4. CONTENIDO: TAB 1 - PERSONAS QUE HA SUBIDO AL CRM */}
      {activeTab === "contactos" && (
        <div className="space-y-4">
          {/* Buscar entre todos sus ciudadanos es del Directorio, que ya busca por nombre, teléfono, colonia o
              sección: el perfil enseña los últimos 20 y lleva allá con el filtro puesto. */}
          {totalContactos > 0 && (
            <Link
              href={enDirectorio}
              className="flex items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-blue-200 shadow-sm text-sm font-extrabold text-blue-800 hover:bg-blue-50"
            >
              <span className="flex items-center gap-2">
                <Search size={16} aria-hidden="true" /> Buscar entre sus {totalContactos.toLocaleString("es-MX")} en el Directorio
              </span>
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          )}

          {/* Listado de Contactos */}
          {filteredContacts.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center shadow-sm">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Users size={28} />
              </div>
              <h3 className="font-extrabold text-base text-gray-900 mb-1">Todavía no hay ciudadanos</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
                {isCurrentUser ? "Cuando registres a alguien, saldrá aquí." : "Esta persona aún no registra ciudadanos que tú puedas ver."}
              </p>
              {puedeRegistrar && (
                <Link
                  href="/crm/nuevo"
                  className="inline-flex items-center gap-1.5 min-h-[44px] px-4 bg-blue-600 text-white font-bold rounded-xl text-sm"
                >
                  <Plus size={14} /> Registrar ciudadano
                </Link>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between text-xs font-bold text-gray-500">
                <span>
                  {totalContactos > filteredContacts.length
                    ? `Los últimos ${filteredContacts.length} de ${totalContactos.toLocaleString("es-MX")}`
                    : `${filteredContacts.length} ${filteredContacts.length === 1 ? "persona registrada" : "personas registradas"}`}
                </span>
              </div>

              {/* En el teléfono cada fila es una tarjeta (mismas celdas, sin columnas): la tabla de siete
                  columnas obligaba a deslizar de lado para llegar a la ficha. */}
              <div className="md:overflow-x-auto">
                <table className="block md:table w-full text-left text-xs">
                  <thead className="hidden md:table-header-group bg-gray-50 text-gray-500 uppercase font-black text-[10px] tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="py-3.5 px-4">Ciudadano</th>
                      <th className="py-3.5 px-3">Teléfono</th>
                      <th className="py-3.5 px-3">Colonia</th>
                      <th className="py-3.5 px-3 text-center">Sección</th>
                      <th className="py-3.5 px-3">Fecha de Registro</th>
                      <th className="py-3.5 px-4 text-right">Ficha</th>
                    </tr>
                  </thead>
                  <tbody className="block md:table-row-group divide-y divide-gray-100">
                    {filteredContacts.map(c => (
                      <tr key={c.id} className="block md:table-row px-4 py-3.5 md:p-0 hover:bg-blue-50/30 transition-colors">
                        <td className="block md:table-cell md:py-3.5 md:px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 md:w-7 md:h-7 rounded-full bg-slate-100 text-blue-900 font-black text-[11px] flex items-center justify-center shrink-0 border border-slate-200">
                              {c.displayName.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-extrabold text-gray-900 text-sm md:text-xs">{c.displayName}</div>
                            </div>
                          </div>
                        </td>

                        <td className="inline-block md:table-cell mt-2 md:mt-0 mr-3 md:mr-0 md:py-3.5 md:px-3">
                          {c.phone ? (
                            <div className="flex items-center gap-1 font-bold text-gray-700">
                              <Phone size={11} className="text-emerald-500" />
                              <span>{c.phone}</span>
                            </div>
                          ) : (
                            <span className="text-gray-500 text-[11px]">Sin teléfono</span>
                          )}
                        </td>

                        <td className="inline-block md:table-cell mr-3 md:mr-0 md:py-3.5 md:px-3 font-semibold text-gray-700">
                          {c.colony || "—"}
                        </td>

                        <td className="inline-block md:table-cell mr-3 md:mr-0 md:py-3.5 md:px-3 md:text-center">
                          {c.sectionNum ? (
                            <span className="bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-black px-2 py-0.5 rounded-md">
                              #{c.sectionNum}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>

                        <td className="inline-block md:table-cell md:py-3.5 md:px-3 text-gray-500 text-[11px]">
                          <span className="md:hidden">Reg. </span>
                          {new Date(c.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
                        </td>

                        <td className="block md:table-cell mt-2.5 md:mt-0 md:py-3.5 md:px-4 md:text-right">
                          <div className="flex md:inline-flex gap-2 md:justify-end">
                            {/* En el teléfono, Llamar y WhatsApp a un toque junto a la ficha (C1). */}
                            <AccionesDeContacto telefono={c.phone} tamano="compacta" className="flex-[2] md:hidden" />
                            <Link
                              href={`/crm/contacts/${c.id}`}
                              className="flex-1 md:flex-none min-h-[44px] md:min-h-0 justify-center whitespace-nowrap px-2.5 py-1 bg-gray-100 hover:bg-blue-50 text-blue-700 hover:text-blue-800 font-bold rounded-xl md:rounded-lg text-[13px] md:text-[11px] inline-flex items-center gap-1 transition-colors"
                            >
                              <span>Ver ficha</span>
                              <ChevronRight size={12} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalContactos > filteredContacts.length && (
                <Link href={enDirectorio} className="block p-4 border-t border-gray-100 text-center text-sm font-extrabold text-blue-700 hover:bg-blue-50">
                  Ver los {totalContactos.toLocaleString("es-MX")} en el Directorio →
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {/* 5. CONTENIDO: TAB 2 - AGENDA Y ACTIVIDADES */}
      {activeTab === "agenda" && (
        <div className="space-y-4">
          {/* Filtros de Actividades */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar actividad, sede o notas..."
                value={activitySearch}
                onChange={e => setActivitySearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {["todas", ...tiposEnLista].map(tipo => (
                <button
                  key={tipo}
                  type="button"
                  aria-pressed={activityCategoryFilter === tipo}
                  onClick={() => setActivityCategoryFilter(tipo)}
                  className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                    activityCategoryFilter === tipo
                      ? "bg-blue-900 text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {tipo === "todas" ? "Todas" : tipo}
                </button>
              ))}
            </div>
          </div>

          {/* Listado de Actividades */}
          {filteredActivities.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center shadow-sm">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Calendar size={28} />
              </div>
              <h3 className="font-extrabold text-base text-gray-900 mb-1">No hay actividades con estos filtros</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
                No hay actividades de este tipo entre las últimas {activities.length}. En la Agenda están todas.
              </p>
              {/* Decía «+ Programar Nueva Actividad» y llevaba a una agenda sin formulario: no todos pueden
                  crear actividades. Ir a la Agenda sirve a todos. */}
              <Link
                href={`/equipo?vista=todas&scope=equipo&responsable=${user.id}`}
                className="inline-flex items-center gap-1.5 min-h-[44px] px-4 bg-blue-600 text-white font-bold rounded-xl text-sm"
              >
                <Calendar size={14} /> Ir a la Agenda
              </Link>
            </div>
          ) : (
            <div className="grid gap-3.5">
              {filteredActivities.map(act => {
                const isCompleted = act.hecha;

                return (
                  <div
                    key={act.id}
                    className={`bg-white p-5 rounded-2xl border transition-all hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isCompleted ? "border-emerald-200 bg-emerald-50/15" : "border-gray-200 shadow-sm"
                    }`}
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getCategoryBadge(act.tipo)}

                        <span className="text-gray-400 text-xs font-semibold flex items-center gap-1 ml-auto">
                          <Clock size={12} />
                          {new Date(act.scheduledAt).toLocaleString("es-MX", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-sm text-gray-900">{act.title}</h4>

                      {act.description && (
                        <p className="text-xs text-gray-600 line-clamp-2 whitespace-pre-line font-medium">
                          {act.description}
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 pt-0.5">
                        <MapPin size={12} className="text-rose-500 shrink-0" />
                        <span>{act.location}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isCompleted ? (
                        <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-3 py-1.5 rounded-xl">
                          <CheckCircle size={14} />
                          <span>Completada</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100/70 border border-amber-200 px-3 py-1.5 rounded-xl">
                          <Clock size={14} />
                          <span>Programada</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {totalActividades > activities.length && (
            <Link
              href={`/equipo?vista=todas&scope=equipo&responsable=${user.id}`}
              className="block p-4 bg-white rounded-2xl border border-blue-200 text-center text-sm font-extrabold text-blue-700 hover:bg-blue-50"
            >
              Las últimas {activities.length} de {totalActividades.toLocaleString("es-MX")}: ver todas en la Agenda →
            </Link>
          )}
        </div>
      )}

      {/* 6. CONTENIDO: TAB 3 - TERRITORIO Y COBERTURA */}
      {activeTab === "territorio" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Colonias */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-black text-base text-gray-900 flex items-center gap-2">
              <Building2 size={18} className="text-blue-600" />
              <span>Colonias con Mayor Presencia ({topColonies.length})</span>
            </h3>

            {topColonies.length === 0 ? (
              <p className="text-xs text-gray-400 font-medium">Sin colonias registradas aún.</p>
            ) : (
              <div className="space-y-2.5">
                {topColonies.map((col, idx) => (
                  <div key={col.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-black text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-xs text-gray-800">{col.name}</span>
                    </div>
                    <span className="font-black text-xs text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                      {col.count} {col.count === 1 ? "persona" : "personas"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Secciones Electorales */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-black text-base text-gray-900 flex items-center gap-2">
              <Hash size={18} className="text-purple-600" />
              <span>Secciones Electorales Cubiertas ({topSections.length})</span>
            </h3>

            {topSections.length === 0 ? (
              <p className="text-xs text-gray-400 font-medium">Sin secciones electorales asignadas aún.</p>
            ) : (
              <div className="space-y-2.5">
                {topSections.map((sec, idx) => (
                  <div key={sec.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 font-black text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-xs text-gray-800">{sec.name}</span>
                    </div>
                    <span className="font-black text-xs text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-200">
                      {sec.count} {sec.count === 1 ? "registro" : "registros"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. CONTENIDO: TAB 4 - SEGURIDAD Y CUENTA (SI ES CURRENT USER) */}
      {isCurrentUser && activeTab === "seguridad" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Modificar Nombre */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-black text-base text-gray-900 flex items-center gap-2">
              <User size={18} className="text-blue-600" />
              <span>Nombre y Visualización</span>
            </h3>
            <p className="text-xs text-gray-500 font-medium">
              Este es el nombre visible en tus reportes, equipo y bitácoras operativas.
            </p>

            <div className="space-y-3">
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleSaveName}
                disabled={savingName}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {savingName ? "Guardando..." : "Actualizar Nombre"}
              </button>
            </div>
          </div>

          {/* Cambiar Contraseña */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-black text-base text-gray-900 flex items-center gap-2">
              <Key size={18} className="text-indigo-600" />
              <span>Cambiar Contraseña</span>
            </h3>

            {passwordStatus.error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200">
                {passwordStatus.error}
              </div>
            )}
            {passwordStatus.success && (
              <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200">
                {passwordStatus.success}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Contraseña Actual</label>
                <input
                  type="password"
                  required
                  value={passwordForm.current}
                  onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Nueva Contraseña</label>
                <input
                  type="password"
                  required
                  value={passwordForm.new}
                  onChange={e => setPasswordForm({ ...passwordForm, new: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Confirmar Nueva Contraseña</label>
                <input
                  type="password"
                  required
                  value={passwordForm.confirm}
                  onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={savingPassword}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {savingPassword ? "Actualizando..." : "Cambiar Contraseña"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
