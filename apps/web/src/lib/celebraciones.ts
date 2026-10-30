"use client";

import { esRitmo, type Ritmo } from "@/lib/logros";
import type { MiProgreso } from "@/lib/mi-progreso";

/**
 * Lado del navegador de «Mi día»: avisar que algo salió bien y compartir el progreso entre la tarjeta y la
 * capa de celebración, sin pedirlo dos veces.
 *
 * Quien guarda algo llama a `celebrar(...)`. La capa (`CapaDeCelebracion`, montada una vez en el panel)
 * enseña el aviso, vibra, tira confeti y después pide el progreso para ver si con eso se cumplió la meta o
 * se ganó una insignia. Como la capa vive en el armazón del panel, el aviso sobrevive a la navegación que
 * suele seguir a un alta.
 */

export type TipoDeLogro = "registro" | "cierre" | "otro";

export type Celebracion = {
  tipo: TipoDeLogro;
  /** Lo que pasó, corto: «Ciudadano registrado». Nunca el nombre de un ciudadano: la pantalla se ve en la calle. */
  titulo: string;
};

export const EVENTO_CELEBRAR = "mi-dia:celebrar";
export const EVENTO_PROGRESO = "mi-dia:progreso";

export function celebrar(celebracion: Celebracion): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<Celebracion>(EVENTO_CELEBRAR, { detail: celebracion }));
}

// ── Progreso compartido ─────────────────────────────────────────────────────────────────────────────

let enCurso: Promise<MiProgreso | null> | null = null;

/** Pide el progreso; si ya hay una petición en vuelo, se suma a ella. Avisa a quien escuche. */
export function pedirProgreso(): Promise<MiProgreso | null> {
  if (enCurso) return enCurso;
  enCurso = fetch("/api/yo/progreso", { cache: "no-store" })
    .then(async (r) => (r.ok ? ((await r.json()) as MiProgreso) : null))
    .catch(() => null)
    .then((datos) => {
      if (datos) window.dispatchEvent(new CustomEvent<MiProgreso>(EVENTO_PROGRESO, { detail: datos }));
      return datos;
    })
    .finally(() => {
      enCurso = null;
    });
  return enCurso;
}

// ── Lo que se guarda en el teléfono ─────────────────────────────────────────────────────────────────
// Todo con try/catch: en una ventana privada o con el almacenamiento bloqueado, la tarjeta funciona igual
// y solo se pierde la preferencia.

function leer(clave: string): string | null {
  try {
    return window.localStorage.getItem(clave);
  } catch {
    return null;
  }
}

function escribir(clave: string, valor: string): void {
  try {
    window.localStorage.setItem(clave, valor);
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}

export function leerRitmo(usuarioId: string): Ritmo {
  const valor = leer(`mi-dia:ritmo:${usuarioId}`);
  return esRitmo(valor) ? valor : "normal";
}

export function guardarRitmo(usuarioId: string, ritmo: Ritmo): void {
  escribir(`mi-dia:ritmo:${usuarioId}`, ritmo);
}

/** Insignias que la persona ya vio celebrar en este teléfono; null si nunca se guardó. */
export function insigniasVistas(usuarioId: string): Set<string> | null {
  const valor = leer(`mi-dia:insignias:${usuarioId}`);
  if (valor === null) return null;
  try {
    const lista = JSON.parse(valor);
    return new Set(Array.isArray(lista) ? lista.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

export function guardarInsigniasVistas(usuarioId: string, claves: Iterable<string>): void {
  escribir(`mi-dia:insignias:${usuarioId}`, JSON.stringify([...claves]));
}

/** La tarjeta «Primeros pasos» se cierra una vez por persona y teléfono. */
export function primerosPasosCerrados(usuarioId: string): boolean {
  return leer(`primeros-pasos:${usuarioId}`) === "cerrado";
}

export function cerrarPrimerosPasos(usuarioId: string): void {
  escribir(`primeros-pasos:${usuarioId}`, "cerrado");
}

/** Vibración corta al guardar y doble al fallar, donde el teléfono la tiene. */
export function vibrar(patron: number | number[]): void {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(patron);
  } catch {
    /* algunos navegadores la bloquean sin gesto: no importa */
  }
}
