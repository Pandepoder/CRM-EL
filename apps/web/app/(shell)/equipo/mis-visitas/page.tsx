"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@tonala/ui";

type UserVisitRow = {
  visitId: string;
  contactId: string;
  contactName: string;
  colonyName: string | null;
  scheduledAt: string;
  status: string;
  visitLocationText: string;
  outcome: string | null;
};

export default function EquipoMisVisitasPage() {
  const [visits, setVisits] = useState<UserVisitRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/crm/my-visits?onlyToday=false")
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data)) setVisits(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="crm-container">
      <div className="flex gap-4 mb-6 border-b border-gray-200 pb-2">
        <Link href="/equipo" className="text-gray hover:text-primary">Mi Día</Link>
        <span className="font-semibold text-primary border-b-2 border-primary pb-2 -mb-[10px]">Todas mis visitas</span>
        <Link href="/equipo/mis-contactos" className="text-gray hover:text-primary">Mis contactos</Link>
      </div>

      <h1 className="page-title">Todas mis Visitas</h1>
      <p className="page-lead mb-6">Listado histórico de todas las visitas que tienes asignadas.</p>

      {loading ? (
        <p>Cargando visitas...</p>
      ) : visits.length === 0 ? (
        <EmptyState
          title="Sin Visitas"
          description="Aún no tienes visitas programadas."
        />
      ) : (
        <div className="grid gap-4">
          {visits.map(v => (
            <div key={v.visitId} className="card">
              <div className="flex-between mb-2">
                <h3 className="font-semibold text-lg">{v.contactName}</h3>
                <span className={`badge ${v.status === "completed" ? "badge-success" : "badge-outline"}`}>
                  {v.status === "completed" ? "Completada" : "Pendiente"}
                </span>
              </div>
              <p className="text-gray text-sm mb-1">
                <strong>Fecha:</strong> {new Date(v.scheduledAt).toLocaleString()}
              </p>
              <p className="text-gray text-sm mb-3">
                <strong>Dirección:</strong> {v.colonyName ? `${v.colonyName} - ` : ""}{v.visitLocationText}
              </p>
              
              <div className="flex gap-3">
                <Link href={`/crm/contacts/${v.contactId}`} className="btn-secondary text-sm">
                  Ver Ficha
                </Link>
                {v.status === "scheduled" && (
                  <button className="btn-primary text-sm" onClick={() => alert("Reportar resultado")}>
                    Reportar Resultado
                  </button>
                )}
              </div>
              
              {v.outcome && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md text-sm border border-gray-200">
                  <strong>Resultado:</strong> {v.outcome}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
