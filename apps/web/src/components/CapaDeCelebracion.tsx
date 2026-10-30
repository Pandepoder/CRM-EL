"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

import {
  EVENTO_CELEBRAR,
  EVENTO_PROGRESO,
  guardarInsigniasVistas,
  insigniasVistas,
  leerRitmo,
  pedirProgreso,
  vibrar,
  type Celebracion
} from "@/lib/celebraciones";
import { fraseDe, metaVigente, type EstadoDeInsignia, type Situacion } from "@/lib/logros";
import type { MiProgreso } from "@/lib/mi-progreso";

/**
 * La capa de celebración del panel: un aviso abajo, una vibración corta y confeti. Si con lo que se acaba
 * de guardar se cumplió la meta del día o se ganó una insignia, lo anuncia en grande.
 *
 * El confeti es solo CSS (unos cuantos `<span>`), sin librerías, y con «reducir movimiento» no sale: queda
 * el aviso. Nada de esto lleva datos de ciudadanos.
 */

type Aviso = { id: number; titulo: string; frase: string };
type Grande = { emoji: string; titulo: string; detalle: string };

const COLORES = ["#2563eb", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4"];
const AVISO_MS = 4200;
const GRANDE_MS = 7000;

function piezasDeConfeti(cantidad: number) {
  return Array.from({ length: cantidad }, (_, i) => ({
    id: i,
    x: `${Math.round(Math.random() * 100)}vw`,
    deriva: `${Math.round((Math.random() - 0.5) * 160)}px`,
    giro: `${Math.round(Math.random() * 720 - 360)}deg`,
    retraso: `${Math.round(Math.random() * 350)}ms`,
    duracion: `${1100 + Math.round(Math.random() * 900)}ms`,
    color: COLORES[i % COLORES.length] ?? "#2563eb",
    ancho: 6 + Math.round(Math.random() * 5)
  }));
}

const SITUACION_POR_TIPO: Record<Celebracion["tipo"], Situacion> = { registro: "registro", cierre: "cierre", otro: "otro" };

export function CapaDeCelebracion({ usuarioId }: Readonly<{ usuarioId: string }>) {
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [grande, setGrande] = useState<Grande | null>(null);
  const [confeti, setConfeti] = useState<ReturnType<typeof piezasDeConfeti>>([]);
  const ultimaFrase = useRef<string | null>(null);
  /** Lo último que se supo del día: para anunciar la meta al cruzarla y no en cada registro de después. */
  const ultimoDia = useRef<{ dia: string; total: number } | null>(null);
  const relojes = useRef<number[]>([]);

  const programar = (fn: () => void, ms: number) => {
    relojes.current.push(window.setTimeout(fn, ms));
  };

  const lanzarConfeti = useCallback((cantidad: number) => {
    setConfeti(piezasDeConfeti(cantidad));
    programar(() => setConfeti([]), 2600);
  }, []);

  // La primera vez en este teléfono se guardan las insignias que ya tenía, para no anunciar de golpe todo
  // lo ganado antes de que existiera la tarjeta.
  useEffect(() => {
    if (insigniasVistas(usuarioId) !== null) return;
    void pedirProgreso().then((p) => {
      if (p) guardarInsigniasVistas(usuarioId, p.insignias.filter((i) => i.lograda).map((i) => i.clave));
    });
  }, [usuarioId]);

  useEffect(() => {
    const alProgreso = (evento: Event) => {
      const p = (evento as CustomEvent<MiProgreso>).detail;
      if (p) ultimoDia.current = { dia: p.dia, total: p.hoy.total };
    };
    window.addEventListener(EVENTO_PROGRESO, alProgreso);
    return () => window.removeEventListener(EVENTO_PROGRESO, alProgreso);
  }, []);

  useEffect(() => {
    const alCelebrar = async (evento: Event) => {
      const datos = (evento as CustomEvent<Celebracion>).detail;
      if (!datos) return;
      vibrar(30);
      const frase = fraseDe(SITUACION_POR_TIPO[datos.tipo], Math.random(), ultimaFrase.current);
      ultimaFrase.current = frase;
      setAviso({ id: Date.now(), titulo: datos.titulo, frase });
      lanzarConfeti(14);

      const antes = ultimoDia.current;
      const progreso = await pedirProgreso();
      if (!progreso) return;

      const vistas = insigniasVistas(usuarioId) ?? new Set<string>();
      const nuevas: EstadoDeInsignia[] = progreso.insignias.filter((i) => i.lograda && !vistas.has(i.clave));
      if (nuevas.length > 0) {
        guardarInsigniasVistas(usuarioId, [...vistas, ...nuevas.map((i) => i.clave)]);
        const primera = nuevas[0]!;
        setGrande({
          emoji: primera.emoji,
          titulo: `¡Nueva insignia: ${primera.nombre}!`,
          detalle: nuevas.length > 1 ? `Y ${nuevas.length - 1} más. Míralas en «Mi día».` : primera.como.replace(/\.$/, "") + ": ¡hecho!"
        });
        lanzarConfeti(40);
        vibrar([40, 60, 40]);
        return;
      }

      // La meta se anuncia solo al cruzarla, no en cada registro de después. Sin dato previo del mismo
      // día, se supone que lo recién guardado fue lo único que cambió.
      const meta = metaVigente(progreso.perfil, leerRitmo(usuarioId), progreso.metaDelLider);
      const previo = antes && antes.dia === progreso.dia ? antes.total : progreso.hoy.total - 1;
      if (previo < meta && progreso.hoy.total >= meta) {
        setGrande({ emoji: "🎉", titulo: "¡Meta del día cumplida!", detalle: `${meta} de ${meta}. Lo que sigue es ganancia.` });
        lanzarConfeti(40);
        vibrar([40, 60, 40]);
      }
    };
    window.addEventListener(EVENTO_CELEBRAR, alCelebrar);
    return () => window.removeEventListener(EVENTO_CELEBRAR, alCelebrar);
  }, [usuarioId, lanzarConfeti]);

  useEffect(() => {
    if (!aviso) return;
    const t = window.setTimeout(() => setAviso(null), AVISO_MS);
    return () => window.clearTimeout(t);
  }, [aviso]);

  useEffect(() => {
    if (!grande) return;
    const t = window.setTimeout(() => setGrande(null), GRANDE_MS);
    return () => window.clearTimeout(t);
  }, [grande]);

  useEffect(() => () => relojes.current.forEach((t) => window.clearTimeout(t)), []);

  return (
    <>
      {confeti.length > 0 && (
        <div className="confeti-capa" aria-hidden="true">
          {confeti.map((p) => (
            <span
              key={p.id}
              className="confeti-pieza"
              style={{
                left: p.x,
                width: p.ancho,
                background: p.color,
                animationDelay: p.retraso,
                animationDuration: p.duracion,
                ["--deriva" as string]: p.deriva,
                ["--giro" as string]: p.giro
              }}
            />
          ))}
        </div>
      )}

      {grande && (
        <div className="celebracion-grande" role="status" aria-live="polite">
          <div className="celebracion-grande__tarjeta">
            <span className="celebracion-grande__emoji" aria-hidden="true">{grande.emoji}</span>
            <strong className="celebracion-grande__titulo">{grande.titulo}</strong>
            <span className="celebracion-grande__detalle">{grande.detalle}</span>
            <button type="button" className="celebracion-grande__boton" onClick={() => setGrande(null)}>
              ¡Seguimos!
            </button>
          </div>
        </div>
      )}

      {aviso && !grande && (
        <div key={aviso.id} className="aviso-celebracion" role="status" aria-live="polite">
          <CheckCircle2 size={22} className="aviso-celebracion__icono" aria-hidden="true" />
          <span className="aviso-celebracion__texto">
            <strong>{aviso.titulo}</strong>
            <span>{aviso.frase}</span>
          </span>
          <button type="button" className="aviso-celebracion__cerrar" onClick={() => setAviso(null)} aria-label="Cerrar aviso">
            <X size={18} />
          </button>
        </div>
      )}
    </>
  );
}
