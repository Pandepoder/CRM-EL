"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Search, Plus, Users, ChevronLeft, ChevronRight,
  Download, QrCode, Phone, Filter, Trash2, Loader2
} from "lucide-react";
import { AccionesDeContacto } from "@/components/AccionesDeContacto";
import { MiDia } from "@/components/MiDia";
import { PersonalLinkModal } from "@/components/PersonalLinkModal";
import { QueEsEsto } from "@/components/QueEsEsto";
import { MarcaMunicipio } from "@/components/MarcaMunicipio";
import { darDeBajaCiudadanoAction } from "../actions";
import { avisar } from "@/lib/avisos";
import { etiquetaDeArea } from "@/lib/areas-de-participacion";
import type { PaginaDelDirectorio } from "@/lib/directorio-consulta";
import { direccionDelDirectorio, LARGO_MAXIMO_BUSQUEDA_DIRECTORIO, type FiltrosDelDirectorio, type MilitanciaDelDirectorio } from "@/lib/directorio-filtros";

export default function DirectorioClient({
  inicial,
  filtrosIniciales,
  userSlug,
  userName,
  userAccessType,
  puedeRegistrar
}: {
  /** La primera página, hecha en el servidor con los filtros de la dirección. */
  inicial: PaginaDelDirectorio;
  filtrosIniciales: FiltrosDelDirectorio;
  userSlug: string;
  userName: string;
  userAccessType: string;
  /** Abre «Registrar ciudadano» (la misma lista que la guarda de /crm/nuevo). El brigadista no: comparte su QR. */
  puedeRegistrar: boolean;
}) {
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosDelDirectorio>(filtrosIniciales);
  const [datos, setDatos] = useState<PaginaDelDirectorio>(inicial);
  const [texto, setTexto] = useState(filtrosIniciales.q);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const primeraVez = useRef(true);
  const pedido = useRef(0);

  const consultar = useCallback(async (f: FiltrosDelDirectorio) => {
    const numero = ++pedido.current;
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/directorio/consulta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f)
      });
      const d = await res.json().catch(() => null);
      if (numero !== pedido.current) return;
      if (!res.ok || !d) {
        setError(d?.error || "No se pudo leer el Directorio. Vuelve a intentarlo.");
        return;
      }
      setDatos(d as PaginaDelDirectorio);
    } catch {
      if (numero === pedido.current) setError("Sin conexión: no se pudo leer el Directorio.");
    } finally {
      if (numero === pedido.current) setCargando(false);
    }
  }, []);

  // Cada cambio de filtro, de búsqueda o de página: la dirección (sin el texto buscado) y una consulta por POST.
  // Un enlace viejo con `?q=` ya se buscó en el servidor: aquí solo se quita el texto de la dirección.
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      if (filtrosIniciales.q) window.history.replaceState(null, "", window.location.pathname + direccionDelDirectorio(filtrosIniciales));
      return;
    }
    window.history.replaceState(null, "", window.location.pathname + direccionDelDirectorio(filtros));
    void consultar(filtros);
  }, [filtros, filtrosIniciales, consultar]);

  const cambiar = (parcial: Partial<FiltrosDelDirectorio>) => setFiltros((f) => ({ ...f, pagina: 1, ...parcial }));
  const irAPagina = (pagina: number) => setFiltros((f) => ({ ...f, pagina }));

  async function handleDelete(contactId: string, displayName: string) {
    if (!confirm(`¿Dar de baja a "${displayName}"? Deja de aparecer en el directorio, el mapa y los conteos. Su historial de visitas y notas se conserva.`)) {
      return;
    }
    setDeletingId(contactId);
    try {
      const resultado = await darDeBajaCiudadanoAction(contactId);
      if (!resultado.ok) {
        avisar(resultado.error);
        return;
      }
      await consultar(filtros);
    } catch {
      avisar("No se pudo dar de baja. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setDeletingId(null);
    }
  }

  // Los filtros los aplica el servidor: así el total y las páginas cuentan lo mismo que se ve.
  const filteredContacts = datos.filas;
  const { total: totalCount, totalPaginas: totalPages, pagina: currentPage, registro } = datos;
  const q = filtros.q;
  const { soloAsignados, militancia, sinUbicacion } = filtros;
  const hayFiltros = soloAsignados || militancia !== "" || sinUbicacion || registro !== null;
  const claseChip = (activo: boolean, color: "amber" | "blue") =>
    `min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border shadow-sm transition-colors whitespace-nowrap cursor-pointer ${
      activo
        ? color === "amber" ? "bg-amber-500 border-amber-500 text-white" : "bg-blue-600 border-blue-600 text-white"
        : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
    }`;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {/* Sin la insignia del nivel («Brigada Territorial», «Líder de Brigada»): eran otros nombres para el
              rol que ya dice la barra lateral, y la misma persona veía cuatro nombres distintos para sí (L3). */}
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Directorio</h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">
            {totalCount} persona{totalCount !== 1 ? "s" : ""} registrada{totalCount !== 1 ? "s" : ""} {registro ? `por ${registro.nombre}` : "en tu brigada"}
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

          {/* Exportar es un formulario `POST`: el texto buscado va en el cuerpo, no en la dirección. La respuesta se
              descarga sola (Content-Disposition); si pasa del tope, el navegador enseña el motivo. */}
          <form method="POST" action="/api/crm/contacts/export">
            <input type="hidden" name="q" value={q} readOnly />
            <button
              type="submit"
              className="px-4 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download size={15} />
              <span>Exportar</span>
            </button>
          </form>

          {/* Solo a quien la pantalla de alta deja entrar: al brigadista lo rebotaba a su inicio sin decir nada (L4). */}
          {puedeRegistrar && (
            <Link
              href="/crm/nuevo"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>Registrar ciudadano</span>
            </Link>
          )}
        </div>
      </div>

      <MiDia />

      {/* FILTROS Y BÚSQUEDA */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            cambiar({ q: texto.trim() });
          }}
          className="w-full sm:max-w-md relative"
        >
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          {/* `search` + `enterKeyHint`: el teclado del teléfono enseña «Buscar» en vez de «Intro» (C7). */}
          <input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={LARGO_MAXIMO_BUSQUEDA_DIRECTORIO}
            enterKeyHint="search"
            autoComplete="off"
            aria-label="Buscar ciudadano"
            placeholder="Nombre, teléfono, colonia o sección…"
            className="w-full pl-9 pr-12 py-3 bg-white border border-gray-200 rounded-xl text-base md:text-sm font-medium text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm [&::-webkit-search-cancel-button]:hidden"
          />
          {(texto || q) && (
            <button
              type="button"
              onClick={() => {
                setTexto("");
                cambiar({ q: "" });
              }}
              aria-label="Borrar la búsqueda"
              className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 grid place-items-center text-gray-500 hover:text-gray-800 text-xl leading-none cursor-pointer"
            >
              ×
            </button>
          )}
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <button
            type="button"
            onClick={() => cambiar({ sinUbicacion: !sinUbicacion })}
            aria-pressed={sinUbicacion}
            title="Sin GPS ni sección con cartografía: no aparecen en el mapa"
            className={claseChip(sinUbicacion, "amber")}
          >
            Sin ubicación
          </button>
          <button
            type="button"
            onClick={() => cambiar({ soloAsignados: !soloAsignados })}
            aria-pressed={soloAsignados}
            className={claseChip(soloAsignados, "blue")}
          >
            Asignados a mí
          </button>
          <div className="flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-xl shadow-sm text-xs font-bold text-gray-700">
            <Filter size={13} className="text-gray-500 ml-1.5" />
            <select
              value={militancia}
              onChange={e => cambiar({ militancia: e.target.value as MilitanciaDelDirectorio })}
              aria-label="Filtrar por militancia"
              className="bg-transparent border-none outline-none text-xs font-bold py-1 pr-2 cursor-pointer"
            >
              <option value="">Todas las personas</option>
              <option value="confirmada">PAN Confirmado</option>
              <option value="declarada">PAN Declarada</option>
            </select>
            <QueEsEsto termino="militancia" className="mr-1" />
          </div>
        </div>
      </div>

      {registro && (
        <p className="m-0 px-4 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 text-sm font-bold flex items-center justify-between gap-3">
          <span>
            Registrados por <Link href={`/perfil/${registro.id}`} className="underline">{registro.nombre}</Link>
          </span>
          <button
            type="button"
            onClick={() => cambiar({ registro: null })}
            aria-label="Quitar el filtro «Registrados por»"
            className="shrink-0 min-h-[40px] px-3 rounded-lg border border-blue-200 bg-white inline-flex items-center text-xs font-extrabold cursor-pointer"
          >
            Ver a todos ×
          </button>
        </p>
      )}

      {sinUbicacion && (
        <p className="m-0 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
          No aparecen en el mapa: no tienen GPS ni una sección con cartografía. Abre la ficha y, en Territorio, pulsa «Editar» para elegir su sección o colonia.
        </p>
      )}

      {error && (
        <p role="alert" className="m-0 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-semibold flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void consultar(filtros)}
            className="shrink-0 min-h-[44px] px-3 rounded-lg border border-red-200 bg-white text-xs font-extrabold cursor-pointer"
          >
            Reintentar
          </button>
        </p>
      )}

      {/* TABLE */}
      <div aria-busy={cargando} className={cargando ? "opacity-60 transition-opacity" : "transition-opacity"}>
      {filteredContacts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center shadow-sm space-y-4">
          <div className="w-14 h-14 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center mx-auto">
            <Users size={26} />
          </div>
          <h3 className="text-base font-bold text-gray-900">
            {q ? `Sin resultados para "${q}"` : hayFiltros ? "Ningún ciudadano con esos filtros" : "No hay registros disponibles en tu red"}
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {q || hayFiltros
              ? "Intenta con otro término o quita algún filtro."
              : puedeRegistrar
              ? "Aquí aparecen las personas que registras tú o tu equipo. Empieza con la primera, o comparte tu QR para que se registren solas."
              : "Aquí aparecen las personas que te asignan y las que se registran con tu QR. Compártelo con tus vecinos."}
          </p>
          {!q && !hayFiltros && puedeRegistrar && (
            <Link
              href="/crm/nuevo"
              className="inline-flex items-center gap-1.5 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-sm transition-all"
            >
              <Plus size={16} /> Registrar ciudadano
            </Link>
          )}
          {!q && !hayFiltros && !puedeRegistrar && userSlug && (
            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <QrCode size={16} /> Compartir mi QR
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
          {/* En el teléfono, tarjetas: la tabla medía 800 px y para llegar a «Ver ficha» había que deslizar
              de lado (C6). Cada tarjeta trae Llamar y WhatsApp a un toque (C1). */}
          <ul className="md:hidden divide-y divide-gray-100">
            {filteredContacts.map((c) => {
              const id = c.contactId || c.id;
              return (
                <li key={id} className="p-4 space-y-3">
                  <Link href={`/crm/contacts/${id}`} className="block">
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-extrabold text-base text-gray-900 leading-tight">{c.displayName}</span>
                      {c.panMilitancy === "confirmada" ? (
                        <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-black bg-blue-600 text-white">PAN confirmado</span>
                      ) : c.panMilitancy === "declarada" ? (
                        <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">PAN declarada</span>
                      ) : null}
                    </span>
                    <span className="block text-sm font-semibold text-gray-700 mt-1">
                      {c.colony || "Colonia por identificar"}
                      <span className="text-gray-600 font-medium"> · {c.sectionNum ? `Secc. ${c.sectionNum}` : "sin sección"}</span>
                    </span>
                    <span className="flex items-center gap-1.5 flex-wrap text-xs text-gray-600 mt-0.5">
                      <MarcaMunicipio nombre={c.municipio} esGeneral={c.municipioTipo === "general"} />
                      {c.phone ? <span className="font-semibold">· {c.phone}</span> : null}
                    </span>
                  </Link>
                  <div className="flex gap-2">
                    <AccionesDeContacto telefono={c.phone} tamano="compacta" className="flex-[2]" />
                    <Link
                      href={`/crm/contacts/${id}`}
                      className="flex-1 min-h-[44px] px-2 rounded-xl text-[13px] font-extrabold inline-flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-800"
                    >
                      Ver ficha
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black uppercase tracking-wider text-gray-500">
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
                        <span className="text-[11px] text-gray-500 font-medium whitespace-nowrap">
                          Reg: {c.createdAt ? new Date(c.createdAt).toLocaleDateString("es-MX") : "—"}
                        </span>
                      </td>

                      <td className="py-2 px-3 md:py-3.5 md:px-4 whitespace-nowrap">
                        {isPan ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-600 text-white shadow-xs">
                            <span className="font-black">M</span> PAN Confirmado
                          </span>
                        ) : isPanDeclared ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                            PAN Declarada
                          </span>
                        ) : (
                          <span className="text-gray-500 text-[11px] font-medium">—</span>
                        )}
                      </td>

                      <td className="py-2 px-3 md:py-3.5 md:px-4 font-semibold text-gray-700 whitespace-nowrap">
                        {c.phone ? (
                          <div className="flex items-center gap-1">
                            <Phone size={12} className="text-gray-500" />
                            <span>{c.phone}</span>
                          </div>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>

                      <td className="py-2 px-3 md:py-3.5 md:px-4">
                        <div className="font-bold text-gray-800 whitespace-nowrap">{c.colony || "Por identificar"}</div>
                        <div className="text-[11px] text-gray-500 whitespace-nowrap">
                          {c.sectionNum ? `Secc. ${c.sectionNum}` : "Sección por definir"}
                          {" · "}
                          <MarcaMunicipio nombre={c.municipio} esGeneral={c.municipioTipo === "general"} />
                        </div>
                      </td>

                      <td className="py-2 px-3 md:py-3.5 md:px-4">
                        <div className="font-semibold text-gray-800 whitespace-nowrap">{c.profession || "Ciudadano"}</div>
                        <div className="text-[11px] text-blue-600 font-bold whitespace-nowrap">{etiquetaDeArea(c.interests) || "Participación general"}</div>
                      </td>

                      <td className="py-2 px-3 md:py-3.5 md:px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-gray-100 rounded-md text-[11px] font-bold text-gray-600 uppercase">
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
                              className="p-1.5 bg-gray-100 hover:bg-rose-50 text-gray-500 hover:text-rose-600 rounded-xl transition-all cursor-pointer disabled:opacity-50"
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
                  <button
                    type="button"
                    onClick={() => irAPagina(currentPage - 1)}
                    aria-label="Página anterior"
                    className="w-11 h-11 grid place-items-center bg-white border border-gray-200 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors shadow-xs cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                )}
                {currentPage < totalPages && (
                  <button
                    type="button"
                    onClick={() => irAPagina(currentPage + 1)}
                    aria-label="Página siguiente"
                    className="w-11 h-11 grid place-items-center bg-white border border-gray-200 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors shadow-xs cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      </div>

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
