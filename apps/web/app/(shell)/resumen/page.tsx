import { getServerSession } from "@/lib/session-server";
import { getOperationalSummary } from "@tonala/modules/command-center/application";
import { createResumenDependencies } from "@/lib/resumen-deps";
import { DevelopmentLogger } from "@tonala/shared/observability";
import { Calendar, Users, MapPin, Target, ChevronRight } from "lucide-react";
import Link from "next/link";

import { requirePageRole } from "@/lib/authorization";
import { getDatabaseClient } from "@/lib/db-client";
import { actorFromSession, permissionChecker } from "@/lib/api-helpers";

export default async function ResumenPage() {
  await requirePageRole("admin", "direction");

  const session = await getServerSession();
  const db = getDatabaseClient();
  const actor = await actorFromSession();

  let totalContacts = 0;
  let totalUsers = 0;

  if (actor) {
    const deps = await createResumenDependencies(db);
    const result = await getOperationalSummary(actor, {
      summaryReader: deps.summaryReader,
      permissionChecker,
      logger: new DevelopmentLogger()
    });
    if (result.ok) {
      totalContacts = result.value.totalContacts;
      totalUsers = result.value.totalUsers;
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* HEADER */}
      <div 
        className="rounded-3xl p-10 shadow-xl relative overflow-hidden"
        style={{ 
          background: "linear-gradient(135deg, var(--blue-950) 0%, var(--blue-700) 100%)",
          color: "white",
          boxShadow: "0 20px 40px rgba(11, 31, 58, 0.15)"
        }}
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 opacity-20 rounded-full translate-y-1/3 -translate-x-1/4 blur-2xl" style={{ background: "var(--blue-900)" }}></div>
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 border rounded-full text-xs font-bold uppercase tracking-wider mb-4" style={{ background: "rgba(255,255,255,0.1)", borderColor: "rgba(255,255,255,0.2)" }}>
            <span className="w-2 h-2 rounded-full" style={{ background: "#4ade80" }}></span>
            Sistema en Línea
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3" style={{ color: "white" }}>Hola, {session.displayName} 👋</h1>
          <p className="text-lg md:text-xl max-w-2xl font-medium leading-relaxed" style={{ color: "#dcecff" }}>
            Bienvenido al centro de mando operativo. Aquí tienes un resumen rápido de tu actividad y accesos directos a tus herramientas clave.
          </p>
        </div>
      </div>

      {/* QUICK STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-white to-blue-50/50 p-6 rounded-3xl border border-blue-100 shadow-sm hover:shadow-md transition-all group">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
            <Users size={28} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-1">Padrón Global</p>
            <p className="text-3xl font-black text-gray-900">{totalContacts.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-white to-purple-50/50 p-6 rounded-3xl border border-purple-100 shadow-sm hover:shadow-md transition-all group">
          <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
            <Target size={28} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-bold text-purple-600 uppercase tracking-wider mb-1">Operadores</p>
            <p className="text-3xl font-black text-gray-900">{totalUsers.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* ACCESOS RÁPIDOS — rest of page unchanged */}
      <div className="pt-4">
        <h2 className="text-2xl font-black text-blue-950 mb-6 flex items-center gap-2">
          Accesos Rápidos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/crm/nuevo" className="group bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all block relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full translate-x-1/3 -translate-y-1/3 group-hover:scale-150 transition-transform duration-500 ease-out z-0"></div>
            <div className="relative z-10">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
                <Users size={26} strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Registrar Ciudadano</h3>
              <p className="text-gray-500 text-sm mb-4">Alta rápida con territorio y responsable.</p>
              <span className="inline-flex items-center text-blue-600 font-semibold text-sm group-hover:gap-2 transition-all">
                Ir al formulario <ChevronRight size={16} className="ml-1" />
              </span>
            </div>
          </Link>
          <Link href="/mapa" className="group bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all block relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full translate-x-1/3 -translate-y-1/3 group-hover:scale-150 transition-transform duration-500 ease-out z-0"></div>
            <div className="relative z-10">
              <div className="w-14 h-14 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-green-600 group-hover:text-white transition-colors shadow-sm">
                <MapPin size={26} strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Mapa Territorial</h3>
              <p className="text-gray-500 text-sm mb-4">Visualiza secciones y presencia operativa.</p>
              <span className="inline-flex items-center text-green-600 font-semibold text-sm group-hover:gap-2 transition-all">
                Abrir mapa <ChevronRight size={16} className="ml-1" />
              </span>
            </div>
          </Link>
          <Link href="/equipo" className="group bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all block relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full translate-x-1/3 -translate-y-1/3 group-hover:scale-150 transition-transform duration-500 ease-out z-0"></div>
            <div className="relative z-10">
              <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-orange-600 group-hover:text-white transition-colors shadow-sm">
                <Calendar size={26} strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Agenda del Equipo</h3>
              <p className="text-gray-500 text-sm mb-4">Visitas programadas y actividad de campo.</p>
              <span className="inline-flex items-center text-orange-600 font-semibold text-sm group-hover:gap-2 transition-all">
                Ver agenda <ChevronRight size={16} className="ml-1" />
              </span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
