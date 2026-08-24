"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RoleSelector({ 
  userId, 
  currentRoleId, 
  roles 
}: { 
  userId: string; 
  currentRoleId: string; 
  roles: { id: string, name: string }[] 
}) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [role, setRole] = useState(currentRoleId);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRoleId = e.target.value;
    setRole(newRoleId);
    setIsUpdating(true);

    try {
      const res = await fetch("/api/users/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, roleId: newRoleId })
      });

      if (!res.ok) {
        throw new Error("Error al cambiar rol");
      }
      
      // Refresh the page data
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("No se pudo cambiar el rol.");
      setRole(currentRoleId); // Revert
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <select
        value={role}
        onChange={handleChange}
        disabled={isUpdating}
        className={`text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 bg-white transition-colors appearance-none pr-8 ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {roles.map((r) => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>
      <div className="absolute right-2 pointer-events-none text-gray-400">
        {isUpdating ? (
          <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        )}
      </div>
    </div>
  );
}
