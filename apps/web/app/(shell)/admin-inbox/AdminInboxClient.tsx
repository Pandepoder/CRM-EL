"use client";

import { MessageSquare, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { markAsProcessedAction } from "./actions";

type Message = {
  id: string;
  content: string;
  status: string;
  createdAt: Date;
  direction: string;
  externalId: string;
};

export function AdminInboxClient({ initialMessages }: { initialMessages: Message[] }) {
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  async function handleMarkProcessed(id: string) {
    setLoadingIds(prev => new Set(prev).add(id));
    try {
      const res = await markAsProcessedAction(id);
      if (res?.error) {
        alert("Error: " + res.error);
      }
    } catch (e) {
      console.error(e);
      alert("Error al marcar como procesado");
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <div className="list-stack">
      {initialMessages.map((msg) => {
        const isRead = msg.status === "read";
        const isLoading = loadingIds.has(msg.id);
        
        return (
          <div 
            key={msg.id} 
            className="contact-card" 
            style={{ 
              borderLeft: !isRead ? "4px solid var(--blue-600)" : "1px solid var(--line)",
              background: !isRead ? "var(--blue-50)" : "var(--panel)",
              transition: "all 0.3s ease"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <MessageSquare size={14} color="var(--muted)" />
                <strong style={{ fontSize: "13px", color: "var(--blue-950)" }}>{msg.externalId}</strong>
              </div>
              <span suppressHydrationWarning style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--ink)", lineHeight: 1.5 }}>
              "{msg.content}"
            </p>
            <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end" }}>
              {!isRead ? (
                <button 
                  className="tiny-action primary" 
                  onClick={() => handleMarkProcessed(msg.id)}
                  disabled={isLoading}
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  {isLoading ? <Loader2 size={12} className="animate-spin" /> : null}
                  Marcar como procesado
                </button>
              ) : (
                <span style={{ fontSize: "11px", color: "var(--green-700)", display: "flex", alignItems: "center", gap: "4px", fontWeight: 700 }}>
                  <Check size={12} /> Procesado por IA
                </span>
              )}
            </div>
          </div>
        );
      })}
      {initialMessages.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--muted)", fontSize: "14px", background: "white", borderRadius: "12px", border: "1px solid var(--line)" }}>
          No hay mensajes en la bandeja
        </div>
      )}
    </div>
  );
}
