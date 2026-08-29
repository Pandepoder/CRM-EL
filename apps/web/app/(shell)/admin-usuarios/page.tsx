import { createUsersReader } from "@tonala/modules/governance/application";
import { UserCog, ShieldAlert, Users, UserCheck, Clock, UserX } from "lucide-react";

import { requirePageRole } from "@/lib/authorization";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { RoleSelector } from "./RoleSelector";
import { UserActions } from "./UserActions";
import { CreateUserModal } from "./CreateUserModal";
import { PendingUsersCard } from "./PendingUsersCard";

export default async function AdminUsuariosPage() {
  await requirePageRole("admin");

  const db = getDatabaseClient();
  const usersReader = createUsersReader(db);
  const [users, allRoles] = await Promise.all([
    usersReader.listUsers(),
    db.select().from(schema.roles)
  ]);

  const roleOptions = allRoles.map(r => ({ id: r.id, name: r.name }));

  const pendingUsers = users.filter(u => u.status === "pending");
  const registeredUsers = users.filter(u => u.status !== "pending");
  const activeCount = registeredUsers.filter(u => u.status === "active").length;
  const inactiveCount = registeredUsers.filter(u => u.status === "inactive").length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-blue-950 tracking-tight flex items-center gap-3">
            <UserCog className="text-blue-600 h-8 w-8" /> Control de Usuarios y Privilegios
          </h1>
          <p className="text-gray-500 mt-1.5 text-sm">
            Gestión de operadores territoriales, brigadistas, analistas y directivos de Tonalá OS.
          </p>
        </div>

        <div>
          <CreateUserModal roles={roleOptions} />
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Users size={20} />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">{users.length}</div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Registrados</div>
          </div>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck size={20} />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-700">{activeCount}</div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuarios Activos</div>
          </div>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-700">{pendingUsers.length}</div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Solicitudes Pendientes</div>
          </div>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-gray-100 text-gray-600 rounded-xl">
            <UserX size={20} />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-700">{inactiveCount}</div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Inactivos</div>
          </div>
        </div>
      </div>

      {/* Pending Requests Section */}
      <PendingUsersCard pendingUsers={pendingUsers} roles={roleOptions} />

      {/* Main Users Table */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <Users size={16} className="text-gray-500" />
            Directorio Oficial de Usuarios Activos
          </h3>
          <span className="text-xs text-gray-400">
            {registeredUsers.length} {registeredUsers.length === 1 ? "usuario" : "usuarios"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="px-6 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Usuario / Correo</th>
                <th className="px-6 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Rol y Nivel</th>
                <th className="px-6 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Estatus</th>
                <th className="px-6 py-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {registeredUsers.map((u) => (
                <tr key={u.userId} className={`hover:bg-gray-50/50 transition-colors ${u.status === "inactive" ? "opacity-50 grayscale" : ""}`}>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900 text-sm">{u.displayName}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{u.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                      u.roleKey === "admin" ? "bg-red-100 text-red-700" :
                      u.roleKey === "direction" ? "bg-orange-100 text-orange-700" :
                      u.roleKey === "territorial_coordinator" ? "bg-purple-100 text-purple-700" :
                      u.roleKey === "capturist" ? "bg-amber-100 text-amber-800" :
                      "bg-blue-100 text-blue-700"
                    }`}>
                      {u.roleKey === "admin" && <ShieldAlert size={12} className="mr-1" />}
                      {u.roleName}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      u.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.status === "active" ? "bg-emerald-500" : "bg-gray-400"}`} />
                      {u.status === "active" ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2.5">
                      <RoleSelector 
                        userId={u.userId} 
                        currentRoleId={u.roleId} 
                        roles={roleOptions} 
                      />
                      <UserActions user={{ userId: u.userId, displayName: u.displayName, status: u.status }} />
                    </div>
                  </td>
                </tr>
              ))}

              {registeredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                    No hay usuarios registrados en el sistema.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
