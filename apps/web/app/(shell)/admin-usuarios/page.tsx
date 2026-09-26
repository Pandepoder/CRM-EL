import Link from "next/link";
import { and, asc, count, eq, ne, or, sql, type SQL } from "drizzle-orm";
import { UserCog, ShieldAlert, Users, UserCheck, Clock, UserX, Search } from "lucide-react";

import { requirePageAccess } from "@/lib/authorization";
import { getDatabaseClient } from "@/lib/db-client";
import { patronDeBusqueda, schema, sinAcentosSql } from "@tonala/shared/database";
import { condicionDeCuentasGobernadas, nombreDeMunicipio } from "@/lib/alcance-municipal";
import { rolesQuePuedeDar } from "@/lib/gobierno-de-cuentas";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { getServerSession } from "@/lib/session-server";
import { buscarMunicipio, MUNICIPIOS_JALISCO } from "@/lib/municipios-jalisco";
import { RoleSelector } from "./RoleSelector";
import { UserActions } from "./UserActions";
import { CreateUserModal } from "./CreateUserModal";
import { PendingUsersCard } from "./PendingUsersCard";
import { MarcaMunicipio } from "@/components/MarcaMunicipio";

/**
 * Control de Usuarios.
 *
 * Antes cargaba a todas las cuentas de una vez, cada fila con su selector de roles y su menú de
 * acciones: 2 MB de HTML y 5,3 s con 177 usuarios (C11). Es la pantalla desde la que el
 * administrador maestro gobernará todos los municipios, así que ahora se busca y se pagina en la
 * base: 25 filas por página, con búsqueda por nombre o correo y filtros de rol y estado. Las
 * solicitudes pendientes van aparte y completas: son pocas y hay que atenderlas todas.
 *
 * Etapa 6: el administrador maestro ve todas las cuentas y puede filtrar por municipio; un
 * administrador municipal, las de su municipio. Las acciones solo salen en las cuentas que esa sesión
 * gobierna (`gobierno-de-cuentas.ts`): ningún administrador toca a otro, y la cuenta del maestro se
 * gobierna desde el servidor.
 */

const POR_PAGINA = 25;

const ESTADOS = {
  todos: { etiqueta: "Todos", condicion: null },
  active: { etiqueta: "Activos", condicion: "active" },
  inactive: { etiqueta: "Dados de baja", condicion: "inactive" },
  rejected: { etiqueta: "Rechazados", condicion: "rejected" }
} as const;
type Estado = keyof typeof ESTADOS;

const ETIQUETA_DE_ESTADO: Record<string, string> = { active: "Activo", inactive: "Inactivo", rejected: "Rechazada" };

export default async function AdminUsuariosPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; rol?: string; estado?: string; page?: string; municipio?: string }>;
}) {
  await requirePageAccess("/admin-usuarios");
  const session = await getServerSession();
  const alcance = await resolveUserNetworkScope(session.userId);

  const parametros = await searchParams;
  const q = (parametros.q ?? "").trim().slice(0, 120);
  const estado: Estado = parametros.estado && parametros.estado in ESTADOS ? (parametros.estado as Estado) : "todos";
  const rol = (parametros.rol ?? "").trim();
  const paginaPedida = Math.max(1, Number.parseInt(parametros.page ?? "1", 10) || 1);

  const db = getDatabaseClient();
  const { userProfiles, roles } = schema;

  const allRoles = await db.select({ id: roles.id, key: roles.key, name: roles.name }).from(roles).orderBy(asc(roles.name));
  // Los roles que esta sesión puede dar: administración, solo el maestro.
  const roleOptions = (await rolesQuePuedeDar(alcance)).map((r) => ({ id: r.id, name: r.name }));
  const rolValido = allRoles.some((r) => r.key === rol) ? rol : "";

  // Qué cuentas se ven: el maestro, todas (con filtro de municipio si lo pide); un administrador
  // municipal, las de su municipio; uno que sigue sin municipio, ninguna.
  const municipioPropio = alcance.isMaster ? null : alcance.adminMunicipalityId;
  const nombreDelMunicipioPropio = municipioPropio ? await nombreDeMunicipio(municipioPropio) : null;
  const filtroMunicipio = alcance.isMaster ? (parametros.municipio === "general" ? "general" : (buscarMunicipio(parametros.municipio ?? "")?.name ?? "")) : "";
  const visibles: SQL = alcance.isMaster
    ? filtroMunicipio === "general"
      ? sql`${userProfiles.municipalityId} = (SELECT id FROM municipalities WHERE kind = 'general')`
      : filtroMunicipio
        ? sql`${userProfiles.municipalityId} = (SELECT id FROM municipalities WHERE name = ${filtroMunicipio} AND kind = 'municipio')`
        : sql`true`
    : municipioPropio
      ? eq(userProfiles.municipalityId, municipioPropio)
      : sql`false`;
  // La misma regla con la que actúan las acciones, para enseñar los botones solo donde valen.
  const gobernable = sql<boolean>`(${condicionDeCuentasGobernadas(alcance)})`;

  // Las solicitudes pendientes se ven siempre completas, fuera de la lista paginada.
  const filtros: SQL[] = [ne(userProfiles.status, "pending"), visibles];
  const condicionDeEstado = ESTADOS[estado].condicion;
  if (condicionDeEstado) filtros.push(eq(userProfiles.status, condicionDeEstado));
  if (rolValido) filtros.push(eq(roles.key, rolValido));
  if (q) {
    const patron = patronDeBusqueda(q);
    filtros.push(or(sql`${sinAcentosSql(userProfiles.displayName)} LIKE ${patron}`, sql`lower(${userProfiles.email}) LIKE ${patron}`)!);
  }
  const filtro = and(...filtros);

  const [porEstado, [encontrados], pendientes] = await Promise.all([
    db.select({ status: userProfiles.status, total: count() }).from(userProfiles).where(visibles).groupBy(userProfiles.status),
    db.select({ total: count() }).from(userProfiles).innerJoin(roles, eq(roles.id, userProfiles.roleId)).where(filtro),
    db
      .select({
        userId: userProfiles.id,
        displayName: userProfiles.displayName,
        email: userProfiles.email,
        createdAt: userProfiles.createdAt,
        // Dónde vive (0025): quien decide la solicitud lo ve; la lista general de cuentas no lo lleva.
        homeAddress: userProfiles.homeAddress,
        homeColony: userProfiles.homeColony,
        homeMunicipality: userProfiles.homeMunicipality
      })
      .from(userProfiles)
      .where(and(eq(userProfiles.status, "pending"), visibles, gobernable))
      .orderBy(asc(userProfiles.createdAt))
  ]);

  const totalEncontrados = Number(encontrados?.total ?? 0);
  const totalPaginas = Math.max(1, Math.ceil(totalEncontrados / POR_PAGINA));
  const pagina = Math.min(paginaPedida, totalPaginas);

  const filas = await db
    .select({
      userId: userProfiles.id,
      displayName: userProfiles.displayName,
      email: userProfiles.email,
      municipio: schema.municipalities.name,
      municipioTipo: schema.municipalities.kind,
      status: userProfiles.status,
      roleId: userProfiles.roleId,
      roleKey: roles.key,
      roleName: roles.name,
      esMaestro: userProfiles.isMasterAdmin,
      gobernable
    })
    .from(userProfiles)
    .innerJoin(roles, eq(roles.id, userProfiles.roleId))
    .innerJoin(schema.municipalities, eq(schema.municipalities.id, userProfiles.municipalityId))
    .where(filtro)
    .orderBy(asc(userProfiles.displayName), asc(userProfiles.id))
    .limit(POR_PAGINA)
    .offset((pagina - 1) * POR_PAGINA);

  const conteo = (s: string) => Number(porEstado.find((e) => e.status === s)?.total ?? 0);
  const totalRegistrados = porEstado.reduce((suma, e) => suma + Number(e.total), 0);
  const pendingUsers = pendientes.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }));

  // Enlace a otra página conservando la búsqueda y los filtros.
  const enlace = (paginaDestino: number) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (rolValido) u.set("rol", rolValido);
    if (estado !== "todos") u.set("estado", estado);
    if (filtroMunicipio) u.set("municipio", filtroMunicipio);
    if (paginaDestino > 1) u.set("page", String(paginaDestino));
    const s = u.toString();
    return `/admin-usuarios${s ? `?${s}` : ""}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-blue-950 tracking-tight flex items-center gap-3">
            <UserCog className="text-blue-600 h-8 w-8" /> Control de Usuarios y Privilegios
          </h1>
          <p className="text-gray-500 mt-1.5 text-sm">
            {alcance.isMaster
              ? "Administrador maestro: todas las cuentas de los 125 municipios."
              : nombreDelMunicipioPropio
                ? `Las cuentas de ${nombreDelMunicipioPropio}. Los administradores los gobierna el administrador maestro.`
                : "Gestión de operadores territoriales, brigadistas, analistas y directivos de la estructura."}
          </p>
        </div>

        {(alcance.isMaster || municipioPropio) && (
          <div>
            <CreateUserModal roles={roleOptions} municipioFijo={nombreDelMunicipioPropio} />
          </div>
        )}
      </div>

      {!alcance.isMaster && !municipioPropio && (
        <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">
          Tu cuenta de administración todavía no tiene municipio, así que no gobierna ninguna cuenta. El administrador maestro te lo asigna.
        </p>
      )}

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Users size={20} />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">{totalRegistrados}</div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Registrados</div>
          </div>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck size={20} />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-700">{conteo("active")}</div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuarios Activos</div>
          </div>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-700">{conteo("pending")}</div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Solicitudes Pendientes</div>
          </div>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-gray-100 text-gray-600 rounded-xl">
            <UserX size={20} />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-700">{conteo("inactive") + conteo("rejected")}</div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">De baja o rechazados</div>
          </div>
        </div>
      </div>

      {/* Pending Requests Section */}
      <PendingUsersCard pendingUsers={pendingUsers} roles={roleOptions} />

      {/* Main Users Table */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-100 bg-gray-50/50 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <Users size={16} className="text-gray-500" />
              Directorio Oficial de Usuarios
            </h3>
            <span className="text-xs text-gray-400">
              {totalEncontrados} {totalEncontrados === 1 ? "usuario" : "usuarios"}
            </span>
          </div>

          {/* Filtros: un formulario GET, así la búsqueda queda en la URL y se puede compartir. */}
          <form method="GET" action="/admin-usuarios" className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Nombre o correo…"
                aria-label="Buscar por nombre o correo"
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              name="rol"
              defaultValue={rolValido}
              aria-label="Filtrar por rol"
              className="py-2 px-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900"
            >
              <option value="">Todos los roles</option>
              {allRoles.map((r) => (
                <option key={r.key} value={r.key}>{r.name}</option>
              ))}
            </select>
            <select
              name="estado"
              defaultValue={estado === "todos" ? "" : estado}
              aria-label="Filtrar por estado"
              className="py-2 px-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900"
            >
              {Object.entries(ESTADOS).map(([clave, { etiqueta }]) => (
                <option key={clave} value={clave === "todos" ? "" : clave}>{etiqueta}</option>
              ))}
            </select>
            {alcance.isMaster && (
              <select
                name="municipio"
                defaultValue={filtroMunicipio}
                aria-label="Filtrar por municipio"
                className="py-2 px-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900"
              >
                <option value="">Todos los municipios</option>
                <option value="general">General (sin municipio)</option>
                {MUNICIPIOS_JALISCO.map((m) => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                ))}
              </select>
            )}
            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm">
              Buscar
            </button>
            {(q || rolValido || estado !== "todos" || filtroMunicipio) && (
              <Link href="/admin-usuarios" className="px-4 py-2 text-gray-600 hover:text-gray-900 font-semibold rounded-xl text-sm text-center">
                Limpiar
              </Link>
            )}
          </form>
        </div>

        <div className="overflow-x-auto">
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
                            puedeCambiarMunicipio={alcance.isMaster}
                            puedeEliminar={alcance.isMaster}
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
                    {q || rolValido || estado !== "todos" || filtroMunicipio
                      ? "Ningún usuario coincide con la búsqueda."
                      : "No hay usuarios registrados en el sistema."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPaginas > 1 && (
          <nav className="px-4 md:px-6 py-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-gray-600" aria-label="Páginas">
            {pagina > 1 ? <Link href={enlace(pagina - 1)} className="px-3 py-1.5 rounded-lg hover:bg-gray-100">← Anterior</Link> : <span />}
            <span>Página {pagina} de {totalPaginas}</span>
            {pagina < totalPaginas ? <Link href={enlace(pagina + 1)} className="px-3 py-1.5 rounded-lg hover:bg-gray-100">Siguiente →</Link> : <span />}
          </nav>
        )}
      </div>
    </div>
  );
}
