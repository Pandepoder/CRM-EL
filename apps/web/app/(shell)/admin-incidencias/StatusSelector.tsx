"use client";

import { useState } from "react";
import { updateReportStatusAction } from "./actions";

export function StatusSelector({ reportId, currentStatus }: { reportId: string; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    setLoading(true);
    try {
      const res = await updateReportStatusAction(reportId, newStatus);
      if (res && res.error) {
        alert("Error: " + res.error);
        setStatus(currentStatus);
      }
    } catch (_err: any) {
      alert("Error de red al actualizar el estado.");
      setStatus(currentStatus);
    } finally {
      setLoading(false);
    }
  };

  return (
    <select
      value={status}
      onChange={handleChange}
      disabled={loading}
      className={`text-xs font-bold uppercase tracking-wider rounded-md px-2 py-1 border-0 focus:ring-2 focus:ring-red-500 cursor-pointer ${
        status === "active" ? "bg-red-100 text-red-700" :
        status === "resolved" ? "bg-emerald-100 text-emerald-700" :
        "bg-gray-100 text-gray-700"
      }`}
    >
      <option value="active">Activo</option>
      <option value="in_progress">En Progreso</option>
      <option value="resolved">Resuelto</option>
      <option value="archived">Archivado</option>
    </select>
  );
}
