import { and, asc, count, eq, sql } from "drizzle-orm";
import { UserCog, Users, UserCheck, Clock, UserX } from "lucide-react";

import { requirePageAccess } from "@/lib/authorization";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { condicionDeCuentasGobernadas, nombreDeMunicipio } from "@/lib/alcance-municipal";
import { rolesQuePuedeDar } from "@/lib/gobierno-de-cuentas";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { getServerSession } from "@/lib/session-server";
import { consultarUsuarios, cuentasVisibles } from "@/lib/usuarios-consulta";
import { leerFiltrosDeUsuarios } from "@/lib/usuarios-filtros";
import { CreateUserModal } from "./CreateUserModal";
import { PendingUsersCard } from "./PendingUsersCard";
import { TablaDeUsuarios } from "./TablaDeUsuarios";

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
 *
 * La tabla (`TablaDeUsuarios.tsx`) busca con `POST /api/admin/usuarios/consulta`: el texto buscado ya no va en
 * la dirección web (observación O2 del plan de auditoría de menús). La primera página sale de aquí. Ver
 * `lib/usuarios-consulta.ts`.
 */
export default async function AdminUsuariosPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePageAccess("/admin-usuarios");
  const session = await getServerSession();
  const alcance = await resolveUserNetworkScope(session.userId);

  const pedidos = leerFiltrosDeUsuarios(await searchParams);
  const { visibles, filtroMunicipio } = cuentasVisibles(alcance, pedidos.municipio);
  const filtros = { ...pedidos, municipio: filtroMunicipio };

  const db = getDatabaseClient();
  const { userProfiles, roles } = schema;
  const municipioPropio = alcance.isMaster ? null : alcance.adminMunicipalityId;
  const gobernable = sql<boolean>`(${condicionDeCuentasGobernadas(alcance)})`;

  const [allRoles, opciones, nombreDelMunicipioPropio, porEstado, pendientes, inicial] = await Promise.all([
    db.select({ id: roles.id, key: roles.key, name: roles.name }).from(roles).orderBy(asc(roles.name)),
    // Los roles que esta sesión puede dar: administración, solo el maestro.
    rolesQuePuedeDar(alcance),
    municipioPropio ? nombreDeMunicipio(municipioPropio) : Promise.resolve(null),
    db.select({ status: userProfiles.status, total: count() }).from(userProfiles).where(visibles).groupBy(userProfiles.status),
    // Las solicitudes pendientes se ven siempre completas, fuera de la lista paginada.
    db
      .select({
        userId: userProfiles.id,
        displayName: userProfiles.displayName,
        email: userProfiles.email,
        createdAt: userProfiles.createdAt,
        // Dónde vive (0025): quien decide la solicitud lo ve; la lista general de cuentas no lo lleva.
        homeAddress: userProfiles.homeAddress,
        homeColony: userProfiles.homeColony,
        homeMunicipality: userProfiles.homeMunicipality,
        // Opcional desde 2026-09-30: si lo dejó, quien decide la solicitud puede llamarle.
        phone: userProfiles.phone
      })
      .from(userProfiles)
      .where(and(eq(userProfiles.status, "pending"), visibles, gobernable))
      .orderBy(asc(userProfiles.createdAt)),
    consultarUsuarios(alcance, filtros)
  ]);
  const roleOptions = opciones.map((r) => ({ id: r.id, name: r.name }));

  const conteo = (s: string) => Number(porEstado.find((e) => e.status === s)?.total ?? 0);
  const totalRegistrados = porEstado.reduce((suma, e) => suma + Number(e.total), 0);
  const pendingUsers = pendientes.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-blue-950 tracking-tight flex items-center gap-3">
            <UserCog className="text-blue-600 h-8 w-8" /> Usuarios y permisos
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
      <TablaDeUsuarios
        inicial={inicial}
        filtrosIniciales={filtros}
        roles={allRoles.map((r) => ({ key: r.key, name: r.name }))}
        roleOptions={roleOptions}
        esMaestro={alcance.isMaster}
      />
    </div>
  );
}
