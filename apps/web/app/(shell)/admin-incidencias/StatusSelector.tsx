"use client";

import { useState, useTransition } from "react";

import { ESTADOS_INCIDENCIA, ESTADO_DESCONOCIDO } from "@/lib/estados-incidencia";
import { updateReportStatusAction } from "./actions";

/**
 * Estado de una incidencia, con la acción que toca en cada momento.
 *
 * Antes era solo un desplegable con cuatro estados en inglés interno. Quien
 * gestionaba tenía que saber de memoria qué significaba cada uno y no había
 * forma de aceptar ni rechazar un reporte recién levantado. Ahora el botón dice
 * lo que va a pasar: una incidencia pendiente se acepta o se rechaza, una
 * aceptada se empieza, y una empezada se resuelve. El desplegable sigue ahí para
 * cualquier otro cambio.
 */
const SIGUIENTE: Record<string, { estado: string; texto: string; tono: string }> = {
  pendiente:   { estado: "active",      texto: "Aceptar",  tono: "#15803d" },
  active:      { estado: "in_progress", texto: "Empezar",  tono: "#1d4ed8" },
  in_progress: { estado: "resolved",    texto: "Resolver", tono: "#15803d" }
};

export function StatusSelector({ reportId, currentStatus }: { reportId: string; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus);
  const [pendienteDeGuardar, startTransition] = useTransition();
  const [guardando, setGuardando] = useState(false);

  const info = ESTADOS_INCIDENCIA[status] ?? ESTADO_DESCONOCIDO;
  const siguiente = SIGUIENTE[status];
  const ocupado = guardando || pendienteDeGuardar;

  const cambiar = async (nuevo: string) => {
    const anterior = status;
    setStatus(nuevo);
    setGuardando(true);
    try {
      const res = await updateReportStatusAction(reportId, nuevo);
      if (res && res.error) {
        alert(res.error);
        setStatus(anterior);
      } else {
        startTransition(() => {});
      }
    } catch {
      alert("No se pudo guardar el cambio. Revisa tu conexión.");
      setStatus(anterior);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-2 flex-wrap">
      {siguiente ? (
        <button
          type="button"
          onClick={() => cambiar(siguiente.estado)}
          disabled={ocupado}
          title={ESTADOS_INCIDENCIA[siguiente.estado]?.ayuda}
          className="text-[11px] font-bold uppercase tracking-wider rounded-md px-2.5 py-1.5 text-white disabled:opacity-50 cursor-pointer"
          style={{ background: siguiente.tono, transition: "transform .2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity .2s ease" }}
        >
          {siguiente.texto}
        </button>
      ) : null}

      {status === "pendiente" ? (
        <button
          type="button"
          onClick={() => cambiar("rechazada")}
          disabled={ocupado}
          title="Revisada y descartada. Se guarda en el historial."
          className="text-[11px] font-bold uppercase tracking-wider rounded-md px-2.5 py-1.5 disabled:opacity-50 cursor-pointer"
          style={{ background: "#fff7ed", color: "#7c2d12", border: "1px solid #fed7aa" }}
        >
          Rechazar
        </button>
      ) : null}

      <select
        value={status}
        onChange={(e) => cambiar(e.target.value)}
        disabled={ocupado}
        aria-label="Estado de la incidencia"
        className="text-[11px] font-bold uppercase tracking-wider rounded-md px-2 py-1.5 cursor-pointer disabled:opacity-50"
        style={{ background: info.bg, color: info.color, border: `1px solid ${info.border}` }}
      >
        {Object.entries(ESTADOS_INCIDENCIA).map(([clave, e]) => (
          <option key={clave} value={clave}>
            {e.label}
          </option>
        ))}
      </select>
    </div>
  );
}
