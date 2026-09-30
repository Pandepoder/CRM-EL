"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Bell, BellOff, BellRing, CalendarClock } from "lucide-react";

import type { Recordatorio, Recordatorios } from "@/lib/recordatorios";
import { activarAvisos, MINUTOS_DE_ANTICIPACION, permisoDeAvisos } from "@/lib/recordatorios-cliente";

import { formatearFechaHora } from "./presentacion";

/**
 * Lo primero que se ve al abrir la agenda: lo vencido y lo que toca pronto. Antes la agenda abría
 * en «Hoy» y, con una reunión vencida y otra para mañana, decía «No hay actividades aquí».
 */
export function RecordatoriosAgenda({ datos, onAbrir }: { datos: Recordatorios; onAbrir: (id: string) => void }) {
  const hayAlgo = datos.totalVencidas > 0 || datos.totalProximas > 0;
  return (
    <section aria-labelledby="recordatorios-titulo" className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="recordatorios-titulo" className="text-sm font-extrabold text-amber-950 inline-flex items-center gap-2">
          <Bell size={16} aria-hidden="true" /> Recordatorios
        </h2>
        <ActivarAvisos />
      </div>

      {!hayAlgo && (
        <p className="text-sm text-amber-900">
          No tienes actividades vencidas ni programadas en las próximas {datos.horasDeAviso} horas.
        </p>
      )}

      {datos.totalVencidas > 0 && (
        <Grupo
          titulo={datos.totalVencidas === 1 ? "1 actividad vencida: complétala, reprográmala o cancélala" : `${datos.totalVencidas} actividades vencidas: complétalas, reprográmalas o cancélalas`}
          icono={<AlertTriangle size={14} aria-hidden="true" />}
          tono="text-red-800"
          items={datos.vencidas}
          resto={datos.totalVencidas - datos.vencidas.length}
          restoHref="/equipo?vista=vencidas"
          onAbrir={onAbrir}
        />
      )}

      {datos.totalProximas > 0 && (
        <Grupo
          titulo={`${datos.totalProximas === 1 ? "1 actividad" : `${datos.totalProximas} actividades`} en las próximas ${datos.horasDeAviso} horas`}
          icono={<CalendarClock size={14} aria-hidden="true" />}
          tono="text-blue-900"
          items={datos.proximas}
          resto={datos.totalProximas - datos.proximas.length}
          restoHref="/equipo?vista=proximas"
          onAbrir={onAbrir}
        />
      )}
    </section>
  );
}

function Grupo({ titulo, icono, tono, items, resto, restoHref, onAbrir }: {
  titulo: string;
  icono: React.ReactNode;
  tono: string;
  items: Recordatorio[];
  resto: number;
  restoHref: string;
  onAbrir: (id: string) => void;
}) {
  return (
    <div>
      <p className={`text-xs font-extrabold inline-flex items-center gap-1.5 ${tono}`}>{icono} {titulo}</p>
      <ul className="mt-1.5 space-y-1.5">
        {items.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => onAbrir(a.id)}
              className="w-full text-left rounded-xl bg-white border border-amber-100 hover:border-amber-300 px-3 py-2 cursor-pointer"
            >
              <span className="block text-sm font-bold text-gray-900">{a.title}</span>
              <span className="block text-xs text-gray-600">
                {formatearFechaHora(a.scheduledAt)}
                {a.tipo ? ` · ${a.tipo}` : ""}
                {a.lugar ? ` · ${a.lugar}` : ""}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {resto > 0 && (
        <a href={restoHref} className="mt-1.5 inline-block text-xs font-bold text-blue-700 hover:underline">
          Ver {resto === 1 ? "1 más" : `${resto} más`}
        </a>
      )}
    </div>
  );
}

/** Avisos del navegador en este dispositivo: se piden con un toque, nunca al cargar la página. */
function ActivarAvisos() {
  // null hasta montar: el permiso solo existe en el navegador y el primer render viene del servidor.
  const [permiso, setPermiso] = useState<NotificationPermission | "no-disponible" | null>(null);
  useEffect(() => { setPermiso(permisoDeAvisos() ?? "no-disponible"); }, []);

  if (permiso === null || permiso === "no-disponible") return null;
  if (permiso === "granted") {
    return (
      <span className="text-[11px] font-bold text-emerald-800 inline-flex items-center gap-1">
        <BellRing size={13} aria-hidden="true" /> Te avisaremos {MINUTOS_DE_ANTICIPACION} min antes en este dispositivo
      </span>
    );
  }
  if (permiso === "denied") {
    return (
      <span className="text-[11px] font-bold text-gray-600 inline-flex items-center gap-1" title="Actívalos desde los permisos del sitio en tu navegador.">
        <BellOff size={13} aria-hidden="true" /> Avisos bloqueados en este navegador
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={async () => setPermiso((await activarAvisos()) ?? "no-disponible")}
      className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-xs font-extrabold text-amber-900 hover:bg-amber-100 inline-flex items-center gap-1.5 cursor-pointer"
    >
      <BellRing size={13} aria-hidden="true" /> Avisarme {MINUTOS_DE_ANTICIPACION} min antes
    </button>
  );
}
