"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Search, Plus, Users, ChevronLeft, ChevronRight, 
  Download, QrCode, Phone, Filter, Trash2, Loader2 
} from "lucide-react";
import { PersonalLinkModal } from "@/components/PersonalLinkModal";
import { MarcaMunicipio } from "@/components/MarcaMunicipio";
import { darDeBajaCiudadanoAction } from "../actions";
import { useRouter } from "next/navigation";

export default function DirectorioClient({
  contactsList,
  totalCount,
  totalPages,
  currentPage,
  q,
  soloAsignados,
  militancia,
  sinUbicacion,
  userSlug,
  userName,
  userAccessType
}: {
  contactsList: any[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  q: string;
  /** Solo los ciudadanos asignados a quien consulta. */
  soloAsignados: boolean;
  /** "" = todas; "confirmada" o "declarada". */
  militancia: string;
  /** Solo los que el mapa no puede dibujar: sin GPS y sin sección con cartografía. */
  sinUbicacion: boolean;
  userSlug: string;
  userName: string;
  userAccessType: string;
}) {
  const router = useRouter();
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(contactId: string, displayName: string) {
    if (!confirm(`¿Dar de baja a "${displayName}"? Deja de aparecer en el directorio, el mapa y los conteos. Su historial de visitas y notas se conserva.`)) {
      return;
    }
    setDeletingId(contactId);
    try {
      const resultado = await darDeBajaCiudadanoAction(contactId);
      if (!resultado.ok) {
        alert(resultado.error);
        return;
      }
      router.refresh();
    } catch {
      alert("No se pudo dar de baja. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setDeletingId(null);
    }
  }

  const roleLabel =
    userAccessType === "coordinacion"
      ? "Coordinación General"
      : userAccessType === "enlace"
      ? "Líder de Brigada"
      : "Brigada Territorial";

  // Los filtros viven en la URL y los aplica el servidor: así el total y las páginas cuentan lo
  // mismo que se ve. Antes la militancia se filtraba aquí, solo sobre las filas de la página.
  const filteredContacts = contactsList;
  const hayFiltros = soloAsignados || militancia !== "" || sinUbicacion;

  const buildUrl = (p: number, cambios: { q?: string; asignados?: boolean; pan?: string; sinUbicacion?: boolean } = {}) => {
    const params = new URLSearchParams();
    const texto = cambios.q ?? q;
    const conAsignados = cambios.asignados ?? soloAsignados;
    const conPan = cambios.pan ?? militancia;
    const conSinUbicacion = cambios.sinUbicacion ?? sinUbicacion;
    if (texto) params.set("q", texto);
    if (conAsignados) params.set("asignados", "mios");
    if (conPan) params.set("pan", conPan);
    if (conSinUbicacion) params.set("ubicacion", "sin");
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
              Directorio Ciudadano
            </h1>
            <span className="text-xs font-black bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full uppercase">
              {roleLabel}
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">
            {totalCount} persona{totalCount !== 1 ? "s" : ""} registrada{totalCount !== 1 ? "s" : ""} en tu brigada
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

          {/* Sin `download`: la respuesta ya se descarga sola (Content-Disposition), y si la exportación
              pasa del tope el navegador enseña el motivo en vez de guardar un archivo con el error. */}
          <a
            href={`/api/crm/contacts/export${q ? "?q=" + encodeURIComponent(q) : ""}`}
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
            placeholder="Nombre, teléfono completo, colonia o sección…"
            className="w-full pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
          {/* Buscar no quita los filtros que ya están puestos. */}
          {soloAsignados && <input type="hidden" name="asignados" value="mios" />}
          {militancia && <input type="hidden" name="pan" value={militancia} />}
          {sinUbicacion && <input type="hidden" name="ubicacion" value="sin" />}
          {q && (
            <Link
              href={buildUrl(1, { q: "" })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-base leading-none"
            >
              ×
            </Link>
          )}
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <Link
            href={buildUrl(1, { sinUbicacion: !sinUbicacion })}
            aria-pressed={sinUbicacion}
            title="Sin GPS ni sección con cartografía: no aparecen en el mapa"
            className={`px-3 py-2 rounded-xl text-xs font-bold border shadow-sm transition-colors whitespace-nowrap ${
              sinUbicacion ? "bg-amber-500 border-amber-500 text-white" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            Sin ubicación
          </Link>
          <Link
            href={buildUrl(1, { asignados: !soloAsignados })}
            aria-pressed={soloAsignados}
            className={`px-3 py-2 rounded-xl text-xs font-bold border shadow-sm transition-colors whitespace-nowrap ${
              soloAsignados ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            Asignados a mí
          </Link>
          <div className="flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-xl shadow-sm text-xs font-bold text-gray-700">
            <Filter size={13} className="text-gray-400 ml-1.5" />
            <select
              value={militancia}
              onChange={e => router.push(buildUrl(1, { pan: e.target.value }))}
              aria-label="Filtrar por militancia"
              className="bg-transparent border-none outline-none text-xs font-bold py-1 pr-2 cursor-pointer"
            >
              <option value="">Todas las personas</option>
              <option value="confirmada">PAN Confirmado</option>
              <option value="declarada">PAN Declarada</option>
            </select>
          </div>
        </div>
      </div>

      {sinUbicacion && (
        <p className="m-0 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
          No aparecen en el mapa: no tienen GPS ni una sección con cartografía. Abre la ficha y, en Territorio, pulsa «Editar» para elegir su sección o colonia.
        </p>
      )}

      {/* TABLE */}
      {filteredContacts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center shadow-sm space-y-4">
          <div className="w-14 h-14 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto">
            <Users size={26} />
          </div>
          <h3 className="text-base font-bold text-gray-900">
            {q ? `Sin resultados para "${q}"` : hayFiltros ? "Ningún ciudadano con esos filtros" : "No hay registros disponibles en tu red"}
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {q || hayFiltros ? "Intenta con otro término o quita algún filtro." : "Comienza registrando a un ciudadano o compartiendo tu enlace QR."}
          </p>
          {!q && !hayFiltros && (
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
                  <th className="py-2 px-3 md:py-3 md:px-4 whitespace-nowrap">Colonia, sección y municipio</th>
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
                            <span className="font-black">M</span> PAN Confirmado
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
                          {" · "}
                          <MarcaMunicipio nombre={c.municipio} esGeneral={c.municipioTipo === "general"} />
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
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/crm/contacts/${c.contactId || c.id}`}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-blue-600 hover:text-white rounded-xl text-[11px] font-extrabold text-gray-700 transition-all inline-block"
                          >
                            Ver Ficha
                          </Link>
                          {/* Dar de baja es solo de administración; conserva el historial. */}
                          {userAccessType === "coordinacion" && (
                            <button
                              type="button"
                              onClick={() => handleDelete(c.contactId || c.id, c.displayName)}
                              disabled={deletingId === (c.contactId || c.id)}
                              title="Dar de baja del padrón"
                              className="p-1.5 bg-gray-100 hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                            >
                              {deletingId === (c.contactId || c.id) ? (
                                <Loader2 size={14} className="animate-spin text-rose-600" />
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </button>
                          )}
                        </div>
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
