"use client";

import { useState } from "react";
import { MoreVertical, Ban, Edit2, Check } from "lucide-react";
import { deactivateUserAction, updateUserAction } from "./actions";

export function UserActions({ user }: { user: { userId: string; displayName: string; status: string } }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(user.displayName);
  const [loading, setLoading] = useState(false);

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

  if (user.status === "inactive") return <span className="text-xs text-gray-400">Inactivo</span>;

  if (isEditing) {
    return (
      <div className="flex items-center justify-end gap-2">
        <input 
          type="text" 
          value={newName} 
          onChange={(e) => setNewName(e.target.value)}
          className="border border-gray-200 rounded-md px-2 py-1 text-sm w-32"
          disabled={loading}
        />
        <button onClick={handleSaveName} disabled={loading} className="text-emerald-600 p-1 hover:bg-emerald-50 rounded">
          <Check size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative inline-block text-left">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
      >
        <MoreVertical size={18} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-20 overflow-hidden border border-gray-100">
            <div className="py-1">
              <button
                onClick={() => { setIsEditing(true); setIsOpen(false); }}
                className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                <Edit2 size={14} className="mr-3 text-gray-400" /> Editar Nombre
              </button>
              <button
                onClick={handleDeactivate}
                disabled={loading}
                className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
              >
                <Ban size={14} className="mr-3 text-red-500" /> Desactivar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
