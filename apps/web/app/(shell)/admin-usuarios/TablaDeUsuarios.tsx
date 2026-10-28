"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ShieldAlert, Search, UserCog, Users } from "lucide-react";

import { MarcaMunicipio } from "@/components/MarcaMunicipio";
import { MUNICIPIOS_JALISCO } from "@/lib/municipios-jalisco";
import type { PaginaDeUsuarios } from "@/lib/usuarios-consulta";
import {
  direccionDeUsuarios,
  ESTADOS_DE_USUARIOS,
  FILTROS_DE_USUARIOS_VACIOS,
  LARGO_MAXIMO_BUSQUEDA_USUARIOS,
  type EstadoDeUsuarios,
  type FiltrosDeUsuarios
} from "@/lib/usuarios-filtros";

import { RoleSelector } from "./RoleSelector";
import { UserActions } from "./UserActions";

const ETIQUETA_DE_ESTADO: Record<string, string> = { active: "Activo", inactive: "Inactivo", rejected: "Rechazada" };

/**
 * La tabla de cuentas con su buscador y filtros. La primera página llega del servidor; lo demás, de
 * `POST /api/admin/usuarios/consulta`, para que el texto buscado no quede en la dirección web (O2). Rol, estado,
 * municipio y página sí van en la dirección.
 */
export function TablaDeUsuarios({
  inicial,
  filtrosIniciales,
  roles,
  roleOptions,
  esMaestro
}: {
  inicial: PaginaDeUsuarios;
  filtrosIniciales: FiltrosDeUsuarios;
  /** Todos los roles, para el filtro. */
  roles: Array<{ key: string; name: string }>;
  /** Los roles que esta sesión puede dar. */
  roleOptions: Array<{ id: string; name: string }>;
  esMaestro: boolean;
}) {
  const [filtros, setFiltros] = useState<FiltrosDeUsuarios>(filtrosIniciales);
  const [borrador, setBorrador] = useState<FiltrosDeUsuarios>(filtrosIniciales);
  const [datos, setDatos] = useState<PaginaDeUsuarios>(inicial);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pedido = useRef(0);
  const primeraVez = useRef(true);
  const filtrosActuales = useRef(filtros);
  const inicialPrevio = useRef(inicial);
  useEffect(() => {
    filtrosActuales.current = filtros;
  }, [filtros]);

  const consultar = useCallback(async (f: FiltrosDeUsuarios) => {
    const numero = ++pedido.current;
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/usuarios/consulta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f)
      });
      const d = await res.json().catch(() => null);
      if (numero !== pedido.current) return;
      if (!res.ok || !d) {
        setError(d?.error || "No se pudieron leer las cuentas. Vuelve a intentarlo.");
        return;
      }
      setDatos(d as PaginaDeUsuarios);
    } catch {
      if (numero === pedido.current) setError("Sin conexión: no se pudieron leer las cuentas.");
    } finally {
      if (numero === pedido.current) setCargando(false);
    }
  }, []);

  // Cada búsqueda, filtro o página: la dirección (sin el texto buscado) y una consulta. Un enlace viejo con
  // `?q=` ya se buscó en el servidor: aquí solo se quita el texto de la dirección.
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      if (filtros.q) window.history.replaceState(null, "", window.location.pathname + direccionDeUsuarios(filtros));
      return;
    }
    window.history.replaceState(null, "", window.location.pathname + direccionDeUsuarios(filtros));
    void consultar(filtros);
  }, [filtros, consultar]);

  // Las acciones de cada fila (rol, baja, alta, municipio) vuelven a dibujar la pantalla en el servidor, que no
  // conoce la búsqueda: la lista se vuelve a pedir con los filtros de la pantalla.
  useEffect(() => {
    if (inicialPrevio.current === inicial) return;
    inicialPrevio.current = inicial;
    void consultar(filtrosActuales.current);
  }, [inicial, consultar]);

  const hayFiltros = Boolean(filtros.q || filtros.rol || filtros.estado !== "todos" || filtros.municipio);
  const poner = (parcial: Partial<FiltrosDeUsuarios>) => setBorrador((b) => ({ ...b, ...parcial }));
  const { filas, total, totalPaginas, pagina } = datos;

  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden">
      <div className="px-4 md:px-6 py-4 border-b border-gray-100 bg-gray-50/50 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <Users size={16} className="text-gray-500" />
            Directorio Oficial de Usuarios
          </h3>
          <span className="text-xs text-gray-400">
            {total} {total === 1 ? "usuario" : "usuarios"}
          </span>
        </div>

        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setFiltros({ ...borrador, q: borrador.q.trim(), pagina: 1 });
          }}
          className="flex flex-col md:flex-row gap-2"
        >
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={borrador.q}
              onChange={(e) => poner({ q: e.target.value })}
              maxLength={LARGO_MAXIMO_BUSQUEDA_USUARIOS}
              enterKeyHint="search"
              autoComplete="off"
              placeholder="Nombre o correo…"
              aria-label="Buscar por nombre o correo"
              className="w-full min-h-[44px] pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-base md:text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={borrador.rol}
            onChange={(e) => poner({ rol: e.target.value })}
            aria-label="Filtrar por rol"
            className="min-h-[44px] py-2 px-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900"
          >
            <option value="">Todos los roles</option>
            {roles.map((r) => (
              <option key={r.key} value={r.key}>{r.name}</option>
            ))}
          </select>
          <select
            value={borrador.estado}
            onChange={(e) => poner({ estado: e.target.value as EstadoDeUsuarios })}
            aria-label="Filtrar por estado"
            className="min-h-[44px] py-2 px-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900"
          >
            {Object.entries(ESTADOS_DE_USUARIOS).map(([clave, etiqueta]) => (
              <option key={clave} value={clave}>{etiqueta}</option>
            ))}
          </select>
          {esMaestro && (
            <select
              value={borrador.municipio}
              onChange={(e) => poner({ municipio: e.target.value })}
              aria-label="Filtrar por municipio"
              className="min-h-[44px] py-2 px-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900"
            >
              <option value="">Todos los municipios</option>
              <option value="general">General (sin municipio)</option>
              {MUNICIPIOS_JALISCO.map((m) => (
                <option key={m.name} value={m.name}>{m.name}</option>
              ))}
            </select>
          )}
          <button type="submit" className="min-h-[44px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm cursor-pointer">
            Buscar
          </button>
          {hayFiltros && (
            <button
              type="button"
              onClick={() => {
                setBorrador(FILTROS_DE_USUARIOS_VACIOS);
                setFiltros(FILTROS_DE_USUARIOS_VACIOS);
              }}
              className="min-h-[44px] px-4 py-2 text-gray-600 hover:text-gray-900 font-semibold rounded-xl text-sm text-center cursor-pointer"
            >
              Limpiar
            </button>
          )}
        </form>

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
      </div>

      <div aria-busy={cargando} className={`overflow-x-auto transition-opacity ${cargando ? "opacity-60" : ""}`}>
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              <th className="px-4 py-3 md:px-6 md:py-3.5 text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Usuario / Correo</th>
              <th className="px-4 py-3 md:px-6 md:py-3.5 text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Rol y Nivel</th>
              <th className="px-4 py-3 md:px-6 md:py-3.5 text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Estatus</th>
              <th className="px-4 py-3 md:px-6 md:py-3.5 text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider text-right whitespace-nowrap">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filas.map((u) => (
              <tr key={u.userId} className={`hover:bg-blue-50/40 transition-colors ${u.status !== "active" ? "opacity-50 grayscale" : ""}`}>
                <td className="px-4 py-3 md:px-6 md:py-4">
                  <Link
                    href={`/perfil/${u.userId}`}
                    className="group block cursor-pointer"
                    title="Ver perfil 360°, personas que ha subido y agenda"
                  >
                    <div className="font-bold text-gray-900 text-sm group-hover:text-blue-600 transition-colors flex items-center gap-1.5 whitespace-nowrap">
                      <span>{u.displayName}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 whitespace-nowrap">{u.email}</div>
                    {/* La llave de municipio (0022): General se marca, no se disimula. */}
                    <div className="text-[11px] text-gray-500 mt-0.5 whitespace-nowrap">
                      <MarcaMunicipio nombre={u.municipio} esGeneral={u.municipioTipo === "general"} />
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                    u.roleKey === "admin" ? "bg-red-100 text-red-700" :
                    u.roleKey === "direction" ? "bg-orange-100 text-orange-700" :
                    u.roleKey === "territorial_coordinator" ? "bg-purple-100 text-purple-700" :
                    u.roleKey === "capturist" ? "bg-amber-100 text-amber-800" :
                    "bg-blue-100 text-blue-700"
                  }`}>
                    {u.roleKey === "admin" && <ShieldAlert size={12} className="mr-1" />}
                    {u.esMaestro ? "Administrador maestro" : u.roleName}
                  </span>
                </td>
                <td className="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    u.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${u.status === "active" ? "bg-emerald-500" : "bg-gray-400"}`} />
                    {ETIQUETA_DE_ESTADO[u.status] ?? u.status}
                  </span>
                </td>
                <td className="px-4 py-3 md:px-6 md:py-4 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/perfil/${u.userId}`}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-1"
                      title="Ver todo lo que este usuario ha subido o realizado"
                    >
                      <UserCog size={13} />
                      <span>Ver Perfil 360°</span>
                    </Link>
                    {u.gobernable ? (
                      <>
                        <RoleSelector
                          userId={u.userId}
                          currentRoleId={u.roleId}
                          roles={roleOptions.some((r) => r.id === u.roleId) ? roleOptions : [{ id: u.roleId, name: u.roleName }, ...roleOptions]}
                        />
                        <UserActions
                          user={{
                            userId: u.userId,
                            displayName: u.displayName,
                            status: u.status,
                            municipality: u.municipioTipo === "general" ? null : u.municipio
                          }}
                          puedeCambiarMunicipio={esMaestro}
                          puedeEliminar={esMaestro}
                        />
                      </>
                    ) : (
                      <span className="text-[11px] font-semibold text-gray-400" title="Los administradores los gobierna el administrador maestro; la cuenta del maestro, la consola del servidor.">
                        {u.esMaestro ? "Se gobierna desde el servidor" : "La gobierna el administrador maestro"}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {filas.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                  {hayFiltros ? "Ningún usuario coincide con la búsqueda." : "No hay usuarios registrados en el sistema."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <nav className="px-4 md:px-6 py-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-gray-600" aria-label="Páginas">
          {pagina > 1 ? (
            <button type="button" onClick={() => setFiltros((f) => ({ ...f, pagina: pagina - 1 }))} className="min-h-[44px] px-3 py-1.5 rounded-lg hover:bg-gray-100 cursor-pointer">
              ← Anterior
            </button>
          ) : <span />}
          <span>Página {pagina} de {totalPaginas}</span>
          {pagina < totalPaginas ? (
            <button type="button" onClick={() => setFiltros((f) => ({ ...f, pagina: pagina + 1 }))} className="min-h-[44px] px-3 py-1.5 rounded-lg hover:bg-gray-100 cursor-pointer">
              Siguiente →
            </button>
          ) : <span />}
        </nav>
      )}
    </div>
  );
}
