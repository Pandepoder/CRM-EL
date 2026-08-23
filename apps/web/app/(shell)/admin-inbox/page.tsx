"use client";

import { Inbox, MessageSquare, Check } from "lucide-react";

export default function AdminInboxPage() {
  const dummyMessages = [
    {
      id: 1,
      sender: "+52 33 1234 5678",
      time: "14:23",
      text: "Acabamos de terminar la visita en la seccion 2. Todo en orden.",
      status: "read"
    },
    {
      id: 2,
      sender: "+52 33 9876 5432",
      time: "13:45",
      text: "Hay problemas con la lona en la calle Morelos, la quitaron anoche.",
      status: "unread"
    },
    {
      id: 3,
      sender: "+52 33 4444 5555",
      time: "10:12",
      text: "El evento empieza en 30 minutos, ya esta el equipo instalado.",
      status: "read"
    }
  ];

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "16px 0" }}>
      <div className="eyebrow">
        <Inbox size={14} /> Administracion
      </div>
      <h3 style={{ fontSize: "20px", fontWeight: 800, color: "var(--blue-950)", marginBottom: "8px" }}>
        Bandeja de IA (Webhooks)
      </h3>
      <p style={{ color: "var(--muted)", fontSize: "14px", marginBottom: "20px" }}>
        Mensajes crudos recibidos desde WhatsApp antes de ser procesados por la IA.
      </p>

      <div className="list-stack">
        {dummyMessages.map((msg) => (
          <div 
            key={msg.id} 
            className="contact-card" 
            style={{ 
              borderLeft: msg.status === "unread" ? "4px solid var(--blue-600)" : "1px solid var(--line)",
              background: msg.status === "unread" ? "var(--blue-50)" : "var(--panel)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <MessageSquare size={14} color="var(--muted)" />
                <strong style={{ fontSize: "13px", color: "var(--blue-950)" }}>{msg.sender}</strong>
              </div>
              <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>{msg.time}</span>
            </div>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--ink)", lineHeight: 1.5 }}>
              "{msg.text}"
            </p>
            <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end" }}>
              {msg.status === "unread" ? (
                <button className="tiny-action primary">Marcar como procesado</button>
              ) : (
                <span style={{ fontSize: "11px", color: "var(--green-700)", display: "flex", alignItems: "center", gap: "4px", fontWeight: 700 }}>
                  <Check size={12} /> Procesado por IA
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


