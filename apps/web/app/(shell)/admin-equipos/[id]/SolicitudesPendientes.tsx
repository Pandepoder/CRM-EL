"use client";

import { useState } from "react";
import { Check, UserPlus, X } from "lucide-react";

import { aceptarSolicitudAction, rechazarSolicitudAction } from "../actions";

/**
 * Solicitudes de quien llegó por el QR de la brigada.
 *
 * Se muestran arriba y aparte de los integrantes: son las únicas que piden una
 * decisión, y enterradas entre el resto pasaban desapercibidas. Cada tarjeta
 * dice quién la trajo, porque es lo que el líder necesita para decidir.
 */
export type Solicitud = {
  userId: string;
  displayName: string;
  invitadoPor: string | null;
  joinedAt: string | null;
};

export function SolicitudesPendientes({
  teamId,
  solicitudes
}: {
  teamId: string;
  solicitudes: Solicitud[];
}) {
  const [lista, setLista] = useState(solicitudes);
  const [ocupado, setOcupado] = useState<string | null>(null);

  if (lista.length === 0) return null;

  async function decidir(userId: string, accion: "aceptar" | "rechazar") {
    setOcupado(userId);
    try {
      const res =
        accion === "aceptar"
          ? await aceptarSolicitudAction(teamId, userId)
          : await rechazarSolicitudAction(teamId, userId);
      if (res?.error) {
        alert(res.error);
      } else {
        setLista((prev) => prev.filter((s) => s.userId !== userId));
      }
    } catch {
      alert("No se pudo guardar. Revisa tu conexión.");
    } finally {
      setOcupado(null);
    }
  }

  return (
    <section
      className="rounded-2xl p-5 mb-5"
      style={{ background: "#fefce8", border: "1px solid #fde68a" }}
    >
      <div className="flex items-center gap-2 mb-4">
        <UserPlus size={18} style={{ color: "#a16207" }} />
        <h2 className="font-bold" style={{ color: "#713f12" }}>
          {lista.length === 1
            ? "1 persona quiere unirse a esta brigada"
            : `${lista.length} personas quieren unirse a esta brigada`}
        </h2>
      </div>

      <ul className="flex flex-col gap-2.5">
        {lista.map((s) => (
          <li
            key={s.userId}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3"
            style={{ background: "#fff", border: "1px solid #fde68a" }}
          >
            <div className="min-w-0">
              <p className="font-bold truncate" style={{ color: "#0b1f3a" }}>
                {s.displayName}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#8b7355" }}>
                {s.invitadoPor ? `Invitada por ${s.invitadoPor}` : "Se registró por el enlace de la brigada"}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => decidir(s.userId, "aceptar")}
                disabled={ocupado === s.userId}
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider rounded-lg px-3 py-2 text-white disabled:opacity-50 cursor-pointer"
                style={{ background: "#15803d" }}
              >
                <Check size={14} /> Aceptar
              </button>
              <button
                type="button"
                onClick={() => decidir(s.userId, "rechazar")}
                disabled={ocupado === s.userId}
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider rounded-lg px-3 py-2 disabled:opacity-50 cursor-pointer"
                style={{ background: "#fff", color: "#7c2d12", border: "1px solid #fed7aa" }}
              >
                <X size={14} /> Rechazar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * El QR para sumar gente en la calle.
 *
 * Un líder abre esto en su teléfono y la otra persona lo escanea con el suyo:
 * queda registrada, con su invitador y ya apuntada a esta brigada, sin que nadie
 * tenga que teclear nada ni pasarse datos por WhatsApp.
 */
export function EnlaceBrigada({
  slug,
  equipo,
  origen
}: {
  slug: string;
  equipo: string;
  /** Se recibe del servidor: construirlo con `window.location.origin` dejaba el
   *  QR sin pintar hasta que hidrataba, y sin JavaScript no aparecía nunca. */
  origen: string;
}) {
  const [copiado, setCopiado] = useState(false);
  const enlace = `${origen}/unirme/${slug}`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(enlace)}&color=0b1f3a&bgcolor=ffffff`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(
    `Te invito a sumarte a ${equipo}. Regístrate aquí: ${enlace}`
  )}`;

  return (
    <section
      className="rounded-2xl p-5 mb-5 flex flex-col sm:flex-row items-center gap-5"
      style={{ background: "#fff", border: "1px solid #e6eaf2" }}
    >
      {origen ? (
        <img
          src={qr}
          alt={`Código QR para unirse a ${equipo}`}
          width={132}
          height={132}
          style={{ width: 132, height: 132, borderRadius: 12, border: "1px solid #e6eaf2", flexShrink: 0 }}
        />
      ) : null}

      <div className="min-w-0 flex-1 text-center sm:text-left">
        <h2 className="font-bold text-lg mb-1" style={{ color: "#0b1f3a" }}>
          Suma gente a {equipo}
        </h2>
        <p className="text-sm mb-3" style={{ color: "#5b6780", lineHeight: 1.55 }}>
          Enseña este código para que lo escaneen. Quien se registre queda a tu nombre y
          en esta brigada, esperando que la aceptes.
        </p>

        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(enlace);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 2500);
            }}
            className="text-xs font-bold uppercase tracking-wider rounded-lg px-3 py-2 cursor-pointer"
            style={{ background: "#eef2f8", color: "#0b1f3a" }}
          >
            {copiado ? "Copiado" : "Copiar enlace"}
          </button>
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold uppercase tracking-wider rounded-lg px-3 py-2"
            style={{ background: "#128c7e", color: "#fff" }}
          >
            Enviar por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
