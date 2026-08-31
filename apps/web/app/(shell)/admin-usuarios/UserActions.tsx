"use client";

import { useState } from "react";
import { MoreVertical, Ban, Edit2, Check, KeyRound, UserCheck, X, Loader2 } from "lucide-react";
import { deactivateUserAction, activateUserAction, updateUserAction, resetUserPasswordAction } from "./actions";

export function UserActions({ user }: { user: { userId: string; displayName: string; status: string } }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [newName, setNewName] = useState(user.displayName);
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleDeactivate = async () => {
    if (!confirm(`¿Estás seguro de que deseas desactivar al usuario ${user.displayName}?`)) return;
    setLoading(true);
    try {
      await deactivateUserAction(user.userId);
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
      setIsOpen(false);
    }
  };

  const handleActivate = async () => {
    setLoading(true);
    try {
      await activateUserAction(user.userId);
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
      setIsOpen(false);
    }
  };

  const handleSaveName = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("userId", user.userId);
      formData.append("displayName", newName);
      await updateUserAction(formData);
      setIsEditing(false);
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const formData = new FormData();
    formData.append("userId", user.userId);
    formData.append("newPassword", newPassword);

    try {
      await resetUserPasswordAction(formData);
      setSuccess("Contraseña actualizada con éxito.");
      setTimeout(() => {
        setIsResettingPassword(false);
        setSuccess("");
        setNewPassword("");
      }, 1500);
    } catch (e: any) {
      setError(e.message || "Error al actualizar contraseña.");
    } finally {
      setLoading(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center justify-end gap-2">
        <input 
          type="text" 
          value={newName} 
          onChange={(e) => setNewName(e.target.value)}
          className="border border-gray-200 rounded-md px-2 py-1 text-xs w-36 focus:ring-1 focus:ring-blue-500 outline-none"
          disabled={loading}
          autoFocus
        />
        <button onClick={handleSaveName} disabled={loading} className="text-emerald-600 p-1 hover:bg-emerald-50 rounded">
          <Check size={16} />
        </button>
        <button onClick={() => setIsEditing(false)} disabled={loading} className="text-gray-400 p-1 hover:bg-gray-100 rounded">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="relative inline-block text-left">
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
          title="Acciones"
        >
          <MoreVertical size={18} />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
            <div className="origin-top-right absolute right-0 mt-1 w-52 rounded-xl shadow-lg bg-white ring-1 ring-black/5 focus:outline-none z-20 overflow-hidden border border-gray-100 divide-y divide-gray-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="py-1">
                <button
                  onClick={() => { setIsEditing(true); setIsOpen(false); }}
                  className="w-full flex items-center px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  <Edit2 size={14} className="mr-2.5 text-gray-400" /> Editar Nombre
                </button>
                <button
                  onClick={() => { setIsResettingPassword(true); setIsOpen(false); }}
                  className="w-full flex items-center px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  <KeyRound size={14} className="mr-2.5 text-blue-500" /> Cambiar Contraseña
                </button>
              </div>

              <div className="py-1">
                {user.status === "active" ? (
                  <button
                    onClick={handleDeactivate}
                    disabled={loading}
                    className="w-full flex items-center px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors font-medium"
                  >
                    <Ban size={14} className="mr-2.5 text-red-500" /> Desactivar Cuenta
                  </button>
                ) : (
                  <button
                    onClick={handleActivate}
                    disabled={loading}
                    className="w-full flex items-center px-4 py-2 text-xs text-emerald-600 hover:bg-emerald-50 transition-colors font-medium"
                  >
                    <UserCheck size={14} className="mr-2.5 text-emerald-500" /> Reactivar Cuenta
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal para restablecer contraseña */}
      {isResettingPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsResettingPassword(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-y-auto max-h-[90vh] border border-gray-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
                <KeyRound size={18} className="text-blue-600" />
                Cambiar Contraseña
              </div>
              <button onClick={() => setIsResettingPassword(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={(e) => { void handleResetPassword(e); }} className="p-5 space-y-3.5">
              <p className="text-xs text-gray-500">
                Define una nueva contraseña para <strong>{user.displayName}</strong>:
              </p>

              {error && (
                <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg font-medium">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-2.5 bg-emerald-50 text-emerald-700 text-xs rounded-lg font-medium">
                  {success}
                </div>
              )}

              <div>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nueva contraseña (mínimo 6 car.)"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:border-blue-500 outline-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsResettingPassword(false)}
                  disabled={loading}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-4 py-1.5 rounded-lg text-xs transition-all shadow-sm"
                >
                  {loading && <Loader2 size={12} className="animate-spin" />}
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
