"use client";

import { useEffect, useState } from "react";

import type { Recordatorio, Recordatorios } from "@/lib/recordatorios";

/**
 * Lado del navegador de los recordatorios de la agenda: los consulta al abrir el panel, cada pocos
 * minutos y al volver a la pestaña, y avisa con una notificación del navegador lo que está por
 * empezar, si la persona lo activó en su dispositivo.
 */

/** Lo dispara la agenda cuando algo cambia, para que el contador del menú no espere la siguiente vuelta. */
export const EVENTO_ACTUALIZAR_RECORDATORIOS = "recordatorios:actualizar";

const CADA_MS = 5 * 60_000;
/**
 * Con cuánta anticipación se avisa. Mayor que el intervalo de consulta: así toda actividad entra
 * en alguna vuelta antes de empezar.
 */
export const MINUTOS_DE_ANTICIPACION = 30;
const SERVICE_WORKER = "/avisos-sw.js";

export function pedirActualizarRecordatorios(): void {
  window.dispatchEvent(new Event(EVENTO_ACTUALIZAR_RECORDATORIOS));
}

export function avisosDisponibles(): boolean {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
}

/** "granted" | "denied" | "default", o null donde el navegador no tiene notificaciones. */
export function permisoDeAvisos(): NotificationPermission | null {
  return avisosDisponibles() ? Notification.permission : null;
}

async function registroDeAvisos(): Promise<ServiceWorkerRegistration | null> {
  try {
    return await navigator.serviceWorker.register(SERVICE_WORKER);
  } catch {
    return null;
  }
}

/** Pide permiso; devuelve el resultado. Hay que llamarla desde un toque o clic de la persona. */
export async function activarAvisos(): Promise<NotificationPermission | null> {
  if (!avisosDisponibles()) return null;
  const permiso = await Notification.requestPermission();
  if (permiso === "granted") await registroDeAvisos();
  return permiso;
}

function claveDeAviso(a: Recordatorio): string {
  // Con la fecha: si la reprograman, se vuelve a avisar a la nueva hora.
  return `aviso-actividad:${a.id}:${a.scheduledAt}`;
}

async function avisarLoQueEmpieza(datos: Recordatorios): Promise<void> {
  if (permisoDeAvisos() !== "granted") return;
  const ahora = Date.now();
  const porEmpezar = datos.proximas.filter((a) => {
    const t = new Date(a.scheduledAt).getTime();
    return t > ahora && t - ahora <= MINUTOS_DE_ANTICIPACION * 60_000;
  });
  if (porEmpezar.length === 0) return;
  const registro = await registroDeAvisos();
  if (!registro) return;
  for (const a of porEmpezar) {
    const clave = claveDeAviso(a);
    try {
      if (localStorage.getItem(clave)) continue;
      localStorage.setItem(clave, "1");
    } catch {
      // Sin almacenamiento local se puede repetir el aviso; es mejor que no avisar.
    }
    const minutos = Math.max(1, Math.round((new Date(a.scheduledAt).getTime() - ahora) / 60_000));
    try {
      await registro.showNotification(`En ${minutos} min: ${a.title}`, {
        body: [a.tipo, a.lugar, a.contacto].filter(Boolean).join(" · ") || "Actividad de tu agenda",
        tag: `actividad-${a.id}`,
        data: { url: `/equipo?actividad=${encodeURIComponent(a.id)}` }
      });
    } catch {
      // El navegador rechazó el aviso (permiso retirado a medio camino): se sigue con el resto.
    }
  }
}

/** Recordatorios de quien tiene la sesión abierta; null hasta la primera respuesta. */
export function useRecordatorios(): Recordatorios | null {
  const [datos, setDatos] = useState<Recordatorios | null>(null);

  useEffect(() => {
    let vigente = true;
    let control: AbortController | null = null;

    const consultar = async () => {
      control?.abort();
      control = new AbortController();
      try {
        const res = await fetch("/api/equipo/recordatorios", { signal: control.signal, cache: "no-store" });
        if (!res.ok || !vigente) return;
        const cuerpo = (await res.json()) as Recordatorios;
        if (!vigente) return;
        setDatos(cuerpo);
        void avisarLoQueEmpieza(cuerpo);
      } catch {
        // Sin señal o petición cancelada: se reintenta en la siguiente vuelta.
      }
    };

    void consultar();
    // También en segundo plano: el aviso sirve justo cuando la pestaña no está a la vista.
    const intervalo = setInterval(() => void consultar(), CADA_MS);
    const alVolver = () => {
      if (document.visibilityState === "visible") void consultar();
    };
    const alPedir = () => void consultar();
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener(EVENTO_ACTUALIZAR_RECORDATORIOS, alPedir);
    return () => {
      vigente = false;
      control?.abort();
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener(EVENTO_ACTUALIZAR_RECORDATORIOS, alPedir);
    };
  }, []);

  return datos;
}
