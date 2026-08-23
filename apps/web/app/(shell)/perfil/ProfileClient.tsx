"use client";

import { useState } from "react";
// @ts-ignore
import { User, Shield, Mail, Key, Edit3, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";

type ProfileProps = {
  user: { email: string; displayName: string };
  role: { key: string; name: string } | null;
};

export default function ProfileClient({ user, role }: ProfileProps) {
  const router = useRouter();

  // Name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [savingName, setSavingName] = useState(false);

  // Password state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" });
  const [passwordStatus, setPasswordStatus] = useState<{ error?: string; success?: string }>({});
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleSaveName() {
    if (!displayName.trim()) return;
    if (displayName.trim() === user.displayName) {
      setIsEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      if (res.ok) {
        setIsEditingName(false);
        router.refresh();
      } else {
        alert("Error al actualizar nombre");
      }
    } finally {
      setSavingName(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordStatus({ error: "Las contraseñas nuevas no coinciden." });
      return;
    }
    if (passwordForm.new.length < 6) {
      setPasswordStatus({ error: "La contraseña debe tener al menos 6 caracteres." });
      return;
    }

    setSavingPassword(true);
    setPasswordStatus({});
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.current,
          newPassword: passwordForm.new,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPasswordStatus({ error: data.error || "Error al cambiar contraseña" });
      } else {
        setPasswordStatus({ success: "Contraseña actualizada exitosamente." });
        setPasswordForm({ current: "", new: "", confirm: "" });
        setTimeout(() => {
          setIsChangingPassword(false);
          setPasswordStatus({});
        }, 2000);
      }
    } catch {
      setPasswordStatus({ error: "Error de conexión." });
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
      {/* Credencial Header */}
      <div className="bg-gradient-to-r from-blue-950 to-blue-900 p-8 text-white relative flex flex-col md:flex-row items-center gap-6">
        <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center text-blue-900 border-4 border-blue-800 shrink-0 shadow-lg">
          <User size={64} />
        </div>
        <div className="text-center md:text-left flex-1">
          <h2 className="text-3xl font-bold mb-1">{user.displayName}</h2>
          <p className="text-blue-200 text-lg flex items-center justify-center md:justify-start gap-2">
            <Shield size={18} /> {role?.name || "Sin Rol"}
          </p>
        </div>
        <button className="md:ml-auto px-4 py-2 bg-blue-800 hover:bg-blue-700 rounded-xl font-bold flex items-center gap-2 transition-colors border border-blue-700">
          <Edit3 size={16} /> Editar Foto
        </button>
      </div>

      {/* Detalles */}
      <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Información Personal</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1 mb-1">
                <User size={14} /> Nombre Completo
              </label>
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-lg font-medium text-gray-900 w-full outline-none focus:border-blue-500"
                    disabled={savingName}
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={savingName}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingName(false);
                      setDisplayName(user.displayName);
                    }}
                    disabled={savingName}
                    className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-lg font-medium text-gray-900">{user.displayName}</p>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-sm font-bold text-blue-600 hover:text-blue-800"
                  >
                    Editar
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1 mb-1">
                <Mail size={14} /> Correo Electrónico
              </label>
              <p className="text-lg font-medium text-gray-900">{user.email}</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Seguridad</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1 mb-1">
                <Shield size={14} /> Nivel de Acceso
              </label>
              <p className="text-lg font-medium text-gray-900 capitalize">{role?.name || role?.key}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1 mb-1">
                <Key size={14} /> Contraseña
              </label>
              {!isChangingPassword ? (
                <div className="flex items-center justify-between">
                  <p className="text-lg font-medium text-gray-900 tracking-widest">••••••••</p>
                  <button
                    onClick={() => setIsChangingPassword(true)}
                    className="text-sm font-bold text-blue-600 hover:text-blue-800"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <form onSubmit={handleChangePassword} className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 mt-2">
                  {passwordStatus.error && (
                    <div className="text-xs font-bold text-red-600 bg-red-50 p-2 rounded border border-red-100">
                      {passwordStatus.error}
                    </div>
                  )}
                  {passwordStatus.success && (
                    <div className="text-xs font-bold text-green-600 bg-green-50 p-2 rounded border border-green-100">
                      {passwordStatus.success}
                    </div>
                  )}
                  <div>
                    <input
                      type="password"
                      placeholder="Contraseña actual"
                      required
                      value={passwordForm.current}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      placeholder="Nueva contraseña"
                      required
                      value={passwordForm.new}
                      onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      placeholder="Confirmar nueva contraseña"
                      required
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsChangingPassword(false);
                        setPasswordStatus({});
                        setPasswordForm({ current: "", new: "", confirm: "" });
                      }}
                      className="flex-1 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={savingPassword}
                      className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
                    >
                      {savingPassword ? "Guardando..." : "Actualizar"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
