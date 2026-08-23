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

export default function MyVisitsPage() {
  const [visits, setVisits] = useState<UserVisitRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/crm/my-visits?onlyToday=false")
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data)) {
          setVisits(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="crm-container">
      <h1 className="page-title">Mi Campo (Visitas Asignadas)</h1>
      <p className="page-lead mb-6">Listado de visitas que debes realizar.</p>

      {loading ? (
        <p>Cargando visitas...</p>
      ) : visits.length === 0 ? (
        <EmptyState
          title="Día Libre"
          description="No tienes visitas programadas para hoy."
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
                  <button className="btn-primary text-sm" onClick={() => alert("Reportar resultado de la visita")}>
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
