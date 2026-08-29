"use client";

import { useState } from "react";
import { UserCheck, UserX, Loader2, Clock, ShieldAlert } from "lucide-react";
import { approveUserAction, rejectUserAction } from "./actions";

interface PendingUser {
  userId: string;
  displayName: string;
  email: string;
  createdAt: string;
}

interface RoleOption {
  id: string;
  name: string;
}

export function PendingUsersCard({
  pendingUsers,
  roles
}: {
  pendingUsers: PendingUser[];
  roles: RoleOption[];
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  if (pendingUsers.length === 0) return null;

  async function handleApprove(userId: string) {
    const defaultRoleId = roles.find(r => r.name.toLowerCase().includes("visita") || r.name.toLowerCase().includes("brigadista"))?.id || roles[0]?.id || "";
    const roleId = selectedRoles[userId] || defaultRoleId;

    setError("");
    setLoadingId(userId);

    const formData = new FormData();
    formData.append("userId", userId);
    formData.append("roleId", roleId);

    try {
      await approveUserAction(formData);
    } catch (err: any) {
      setError(err?.message || "Error al autorizar usuario.");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleReject(userId: string) {
    if (!confirm("¿Estás seguro de que deseas rechazar y descartar esta solicitud de registro?")) return;

    setError("");
    setLoadingId(userId);

    try {
      await rejectUserAction(userId);
    } catch (err: any) {
      setError(err?.message || "Error al rechazar usuario.");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="mb-8 bg-amber-50/70 border border-amber-200/80 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
            <ShieldAlert size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-amber-950 flex items-center gap-2">
              Solicitudes Pendientes de Aprobación
              <span className="px-2.5 py-0.5 bg-amber-200 text-amber-900 rounded-full text-xs font-extrabold">
                {pendingUsers.length}
              </span>
            </h2>
            <p className="text-xs text-amber-800/80 mt-0.5">
              Nuevos operadores que han solicitado acceso al sistema. Autoriza su entrada asignándoles su rol.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-800 text-xs font-semibold rounded-xl">
          {error}
        </div>
      )}

      <div className="divide-y divide-amber-200/50 bg-white border border-amber-200/80 rounded-xl overflow-hidden shadow-sm">
        {pendingUsers.map((u) => {
          const defaultRoleId = roles.find(r => r.name.toLowerCase().includes("visita") || r.name.toLowerCase().includes("brigadista"))?.id || roles[0]?.id || "";
          const currentRole = selectedRoles[u.userId] || defaultRoleId;

          return (
            <div key={u.userId} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-amber-50/20 transition-colors">
              <div>
                <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  {u.displayName}
                </div>
                <div className="text-xs text-gray-500">{u.email}</div>
                <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                  <Clock size={12} />
                  Solicitado: {new Date(u.createdAt).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                  <span>Asignar Rol:</span>
                  <select
                    value={currentRole}
                    onChange={(e) => setSelectedRoles(prev => ({ ...prev, [u.userId]: e.target.value }))}
                    disabled={loadingId === u.userId}
                    className="py-1.5 px-3 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 cursor-pointer"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => { void handleApprove(u.userId); }}
                  disabled={loadingId === u.userId}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3.5 rounded-lg text-xs transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {loadingId === u.userId ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
                  Aprobar y Activar
                </button>

                <button
                  onClick={() => { void handleReject(u.userId); }}
                  disabled={loadingId === u.userId}
                  className="flex items-center gap-1 text-gray-500 hover:text-red-600 hover:bg-red-50 font-semibold py-1.5 px-2.5 rounded-lg text-xs transition-colors disabled:opacity-50"
                >
                  <UserX size={14} />
                  Descartar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
