"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Search, Plus, Users, ChevronLeft, ChevronRight, 
  Download, QrCode, Phone, Filter 
} from "lucide-react";
import { PersonalLinkModal } from "@/components/PersonalLinkModal";

export default function DirectorioClient({
  contactsList,
  totalCount,
  totalPages,
  currentPage,
  q,
  userSlug,
  userName,
  userAccessType
}: {
  contactsList: any[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  q: string;
  userSlug: string;
  userName: string;
  userAccessType: string;
}) {
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [filterPan, setFilterPan] = useState<string>("all");

  const filteredContacts = contactsList.filter(c => {
    if (filterPan === "pan_confirmed") return c.panMilitancy === "confirmada";
    if (filterPan === "pan_declared") return c.panMilitancy === "declarada";
    return true;
  });

  const buildUrl = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/crm/contacts${s ? `?${s}` : ""}`;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              Directorio General
            </h1>
            <span className="text-xs font-black bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full uppercase">
              {userAccessType}
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">
            {totalCount} persona{totalCount !== 1 ? "s" : ""} registrada{totalCount !== 1 ? "s" : ""} en tu red
            {q && ` · Filtrado por: "${q}"`}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* BOTÓN MI ENLACE Y QR */}
          {userSlug && (
            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <QrCode size={16} />
              <span>Mi Enlace y QR</span>
            </button>
          )}

          <a
            href={`/api/crm/contacts/export${q ? "?q=" + encodeURIComponent(q) : ""}`}
            download
            className="px-4 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download size={15} />
            <span>Exportar</span>
          </a>

          <Link
            href="/crm/nuevo"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Registro Social</span>
          </Link>
        </div>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form method="GET" action="/crm/contacts" className="w-full sm:max-w-md relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre, teléfono o colonia..."
            className="w-full pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
          {q && (
            <Link
              href="/crm/contacts"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-base leading-none"
            >
              ×
            </Link>
          )}
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-xl shadow-sm text-xs font-bold text-gray-700">
            <Filter size={13} className="text-gray-400 ml-1.5" />
            <select
              value={filterPan}
              onChange={e => setFilterPan(e.target.value)}
              className="bg-transparent border-none outline-none text-xs font-bold py-1 pr-2 cursor-pointer"
            >
              <option value="all">Todas las personas</option>
              <option value="pan_confirmed">Ⓜ️ PAN Confirmado</option>
              <option value="pan_declared">PAN Declarada</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLE */}
      {filteredContacts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center shadow-sm space-y-4">
          <div className="w-14 h-14 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto">
            <Users size={26} />
          </div>
          <h3 className="text-base font-bold text-gray-900">
            {q ? `Sin resultados para "${q}"` : "No hay registros disponibles en tu red"}
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {q ? "Intenta con otro término de búsqueda." : "Comienza registrando a un ciudadano o compartiendo tu enlace QR."}
          </p>
          {!q && (
            <Link
              href="/crm/nuevo"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
            >
              <Plus size={14} /> Registrar Ciudadano
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-[10px] font-black uppercase tracking-wider text-gray-500">
                  <th className="py-2 px-3 md:py-3 md:px-4 whitespace-nowrap">Ciudadano</th>
                  <th className="py-2 px-3 md:py-3 md:px-4 whitespace-nowrap">Militancia PAN</th>
                  <th className="py-2 px-3 md:py-3 md:px-4 whitespace-nowrap">Contacto</th>
                  <th className="py-2 px-3 md:py-3 md:px-4 whitespace-nowrap">Colonia & Sección</th>
                  <th className="py-2 px-3 md:py-3 md:px-4 whitespace-nowrap">Ocupación / Área</th>
                  <th className="py-2 px-3 md:py-3 md:px-4 whitespace-nowrap">Origen</th>
                  <th className="py-2 px-3 md:py-3 md:px-4 text-right whitespace-nowrap">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredContacts.map(c => {
                  const isPan = c.panMilitancy === "confirmada";
                  const isPanDeclared = c.panMilitancy === "declarada";

                  return (
                    <tr key={c.contactId || c.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-2 px-3 md:py-3.5 md:px-4">
                        <Link
                          href={`/crm/contacts/${c.contactId || c.id}`}
                          className="font-extrabold text-sm text-gray-900 hover:text-blue-600 transition-colors block whitespace-nowrap"
                        >
                          {c.displayName}
                        </Link>
                        <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                          Reg: {c.createdAt ? new Date(c.createdAt).toLocaleDateString("es-MX") : "—"}
                        </span>
                      </td>

                      <td className="py-2 px-3 md:py-3.5 md:px-4 whitespace-nowrap">
                        {isPan ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white shadow-xs">
                            <span>Ⓜ️</span> PAN Confirmado
                          </span>
                        ) : isPanDeclared ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                            PAN Declarada
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[11px] font-medium">—</span>
                        )}
                      </td>

                      <td className="py-2 px-3 md:py-3.5 md:px-4 font-semibold text-gray-700 whitespace-nowrap">
                        {c.phone ? (
                          <div className="flex items-center gap-1">
                            <Phone size={12} className="text-gray-400" />
                            <span>{c.phone}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td className="py-2 px-3 md:py-3.5 md:px-4">
                        <div className="font-bold text-gray-800 whitespace-nowrap">{c.colony || "Por identificar"}</div>
                        <div className="text-[10px] text-gray-400 whitespace-nowrap">
                          {c.sectionNum ? `Secc. ${c.sectionNum}` : "Sección por definir"}
                        </div>
                      </td>

                      <td className="py-2 px-3 md:py-3.5 md:px-4">
                        <div className="font-semibold text-gray-800 whitespace-nowrap">{c.profession || "Ciudadano"}</div>
                        <div className="text-[10px] text-blue-600 font-bold whitespace-nowrap">{c.interests || "General"}</div>
                      </td>

                      <td className="py-2 px-3 md:py-3.5 md:px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-gray-100 rounded-md text-[10px] font-bold text-gray-600 uppercase">
                          {c.origin ? c.origin.replace("_", " ") : "Toca toca"}
                        </span>
                      </td>

                      <td className="py-2 px-3 md:py-3.5 md:px-4 text-right whitespace-nowrap">
                        <Link
                          href={`/crm/contacts/${c.contactId || c.id}`}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-blue-600 hover:text-white rounded-xl text-[11px] font-extrabold text-gray-700 transition-all inline-block"
                        >
                          Ver Ficha
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
              <span className="text-xs font-bold text-gray-500">
                Página {currentPage} de {totalPages}
              </span>
              <div className="flex items-center gap-2">
                {currentPage > 1 && (
                  <Link
                    href={buildUrl(currentPage - 1)}
                    className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors shadow-xs"
                  >
                    <ChevronLeft size={16} />
                  </Link>
                )}
                {currentPage < totalPages && (
                  <Link
                    href={buildUrl(currentPage + 1)}
                    className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors shadow-xs"
                  >
                    <ChevronRight size={16} />
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* QR MODAL */}
      <PersonalLinkModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        userName={userName}
        slug={userSlug}
      />
    </div>
  );
}
