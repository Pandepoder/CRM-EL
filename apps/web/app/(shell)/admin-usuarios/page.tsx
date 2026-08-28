import { createUsersReader } from "@tonala/modules/governance/application";
import { UserCog, ShieldAlert } from "lucide-react";

import { requirePageRole } from "@/lib/authorization";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { RoleSelector } from "./RoleSelector";
import { UserActions } from "./UserActions";

export default async function AdminUsuariosPage() {
  await requirePageRole("admin");

  const db = getDatabaseClient();
  const usersReader = createUsersReader(db);
  const [users, allRoles] = await Promise.all([
    usersReader.listUsers(),
    db.select().from(schema.roles)
  ]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-blue-950 tracking-tight flex items-center gap-3">
            <UserCog className="text-blue-600 h-8 w-8" /> Administración de Usuarios
          </h1>
          <p className="text-gray-500 mt-2">Control de acceso y privilegios operativos del sistema Tonalá OS.</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Usuario</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Rol Actual</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Estatus</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Modificar Privilegios</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u.userId} className={`hover:bg-gray-50/50 transition-colors ${u.status === "inactive" ? "opacity-50 grayscale" : ""}`}>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{u.displayName}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{u.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                      u.roleKey === "admin" ? "bg-red-100 text-red-700" :
                      u.roleKey === "direction" ? "bg-orange-100 text-orange-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>
                      {u.roleKey === "admin" && <ShieldAlert size={12} className="mr-1" />}
                      {u.roleName}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold uppercase tracking-wider ${u.status === "active" ? "text-emerald-600" : "text-gray-400"}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <RoleSelector 
                        userId={u.userId} 
                        currentRoleId={u.roleId} 
                        roles={allRoles.map(r => ({ id: r.id, name: r.name }))} 
                      />
                      <UserActions user={{ userId: u.userId, displayName: u.displayName, status: u.status }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
