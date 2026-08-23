import { createUsersReader } from "@tonala/modules/governance/application";
import { UserCog, ShieldAlert } from "lucide-react";

import { requirePageRole } from "@/lib/authorization";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { changeUserRoleAction } from "./actions";

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
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <UserCog className="text-blue-600" /> Administración de Usuarios
          </h1>
          <p className="text-sm text-gray-500 mt-1">Control de acceso y privilegios operativos del sistema.</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Usuario</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Rol Actual</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Estatus</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Modificar Privilegios</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.userId} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-blue-900">{u.displayName}</div>
                    <div className="text-xs text-gray-500">{u.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      u.roleKey === "admin" ? "bg-red-100 text-red-800" :
                      u.roleKey === "direction" ? "bg-orange-100 text-orange-800" :
                      "bg-blue-100 text-blue-800"
                    }`}>
                      {u.roleKey === "admin" && <ShieldAlert size={12} className="mr-1" />}
                      {u.roleName}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-semibold uppercase ${u.status === "active" ? "text-green-600" : "text-gray-400"}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <form action={changeUserRoleAction} className="inline-flex items-center gap-2">
                      <input type="hidden" name="userId" value={u.userId} />
                      <select
                        name="roleId"
                        defaultValue={u.roleId}
                        className="text-sm border border-gray-200 rounded-lg px-2 py-1"
                      >
                        {allRoles.map((role) => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </select>
                      <button type="submit" className="text-sm bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700">
                        Guardar
                      </button>
                    </form>
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
