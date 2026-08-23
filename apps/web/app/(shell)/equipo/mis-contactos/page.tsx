"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@tonala/ui";

type ContactRow = {
  contactId: string;
  fullName: string;
  phoneNumber: string | null;
  status: string;
  registeredAt: string;
  colonyName: string | null;
  territoryStatus: string | null;
  assignedUserName: string | null;
  visitsScheduled: number;
  visitsCompleted: number;
};

export default function EquipoMisContactosPage() {
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/equipo/mis-contactos")
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data)) setContacts(data);
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
        <Link href="/equipo/mis-visitas" className="text-gray hover:text-primary">Todas mis visitas</Link>
        <span className="font-semibold text-primary border-b-2 border-primary pb-2 -mb-[10px]">Mis contactos</span>
      </div>

      <h1 className="page-title">Mis Contactos</h1>
      <p className="page-lead mb-6">Lista de todos los contactos que tienes asignados.</p>

      {loading ? (
        <p>Cargando contactos...</p>
      ) : contacts.length === 0 ? (
        <EmptyState
          title="Sin contactos asignados"
          description="Aún no tienes ningún contacto asignado a tu nombre."
        />
      ) : (
        <div className="grid gap-4">
          {contacts.map(c => (
            <div key={c.contactId} className="card">
              <div className="flex-between mb-2">
                <h3 className="font-semibold text-lg">{c.fullName}</h3>
                <span className={`badge ${c.status === "active" ? "badge-success" : "badge-gray"}`}>
                  {c.status}
                </span>
              </div>
              <p className="text-gray text-sm mb-1">
                <strong>Teléfono:</strong> {c.phoneNumber || "No registrado"}
              </p>
              <p className="text-gray text-sm mb-3">
                <strong>Colonia:</strong> {c.colonyName || "No registrada"}
              </p>
              
              <div className="flex gap-3">
                <Link href={`/crm/contacts/${c.contactId}`} className="btn-secondary text-sm">
                  Ver Ficha Completa
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
