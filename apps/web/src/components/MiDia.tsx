"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Flame, Trophy, Users } from "lucide-react";

import { EVENTO_PROGRESO, guardarRitmo, leerRitmo, pedirProgreso } from "@/lib/celebraciones";
import { fraseDe, metaDelDia, metaVigente, RITMOS, siguienteInsignia, situacionDelDia, type Ritmo } from "@/lib/logros";
import type { EquipoDeLaSemana, MiProgreso } from "@/lib/mi-progreso";
import { useUsuarioActualId } from "@/lib/usuario-contexto";

/**
 * «Mi día»: la meta del día en un anillo, la racha semanal y la insignia que está más cerca. Plegada ocupa
 * un renglón, para no empujar hacia abajo lo que la persona vino a hacer; desplegada enseña todas sus
 * insignias y deja elegir el ritmo.
 *
 * Solo cuenta lo propio (`/api/yo/progreso`), más el total de su equipo sin nombres. Si la consulta falla,
 * la tarjeta no aparece: es un extra y no debe estorbar la pantalla.
 */

function Anillo({ valor, meta }: { valor: number; meta: number }) {
  const r = 22;
  const largo = 2 * Math.PI * r;
  const proporcion = Math.min(1, meta > 0 ? valor / meta : 0);
  const cumplida = valor >= meta;
  return (
    <span className="relative inline-grid place-items-center shrink-0" style={{ width: 56, height: 56 }} aria-hidden="true">
      <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke={cumplida ? "#10b981" : "#2563eb"}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={largo}
          strokeDashoffset={largo * (1 - proporcion)}
          style={{ transition: "stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[15px] font-black text-blue-950 tabular-nums">{cumplida ? "✔" : valor}</span>
    </span>
  );
}

function desglose(p: MiProgreso): string {
  const partes: string[] = [];
  if (p.hoy.registros) partes.push(`${p.hoy.registros} ${p.hoy.registros === 1 ? "registro" : "registros"}`);
  if (p.hoy.porMiEnlace) partes.push(`${p.hoy.porMiEnlace} por tu QR`);
  if (p.hoy.cierres) partes.push(`${p.hoy.cierres} ${p.hoy.cierres === 1 ? "cierre" : "cierres"}`);
  if (p.hoy.otros) partes.push(`${p.hoy.otros} ${p.hoy.otros === 1 ? "prospecto o petición" : "prospectos o peticiones"}`);
  return partes.join(" · ");
}

/** «Tu brigada» o «Tu gente»: el total de la semana, sin nombres de nadie (ver `equipoDe`). */
function TuEquipo({ equipo }: { equipo: EquipoDeLaSemana }) {
  if (equipo.tipo === "brigada") {
    const parte = equipo.semana > 0 ? Math.round((equipo.tuyo / equipo.semana) * 100) : 0;
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3">
        <p className="text-sm font-extrabold text-emerald-950 flex items-center gap-1.5">
          <Users size={16} aria-hidden="true" /> Tu brigada esta semana: {equipo.semana}
        </p>
        <p className="text-[13px] font-semibold text-emerald-900 mt-0.5">
          {equipo.tuyo > 0 ? `Tú aportaste ${equipo.tuyo} (${parte}%). ¡Así se suma en equipo!` : "Tu primera acción de la semana también suma aquí."}
        </p>
        <span className="mt-2 block h-2 rounded-full bg-white overflow-hidden" aria-hidden="true">
          <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, parte)}%` }} />
        </span>
        <p className="text-xs font-semibold text-emerald-800 mt-1.5">Es la suma de las {equipo.personas} personas de tu equipo, sin nombres.</p>
      </div>
    );
  }
  const arriba = equipo.semana >= equipo.semanaPasada;
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3">
      <p className="text-sm font-extrabold text-emerald-950 flex items-center gap-1.5">
        <Users size={16} aria-hidden="true" /> Tu gente esta semana: {equipo.semana}
      </p>
      <p className="text-[13px] font-semibold text-emerald-900 mt-0.5">
        {arriba
          ? equipo.semanaPasada > 0
            ? `¡Ya rebasaron las ${equipo.semanaPasada} de la semana pasada!`
            : "¡Arrancaron la semana!"
          : `La semana pasada fueron ${equipo.semanaPasada}: aún hay días para alcanzarla.`}
      </p>
      <p className="text-xs font-semibold text-emerald-800 mt-1">
        {equipo.activas} de {equipo.personas} {equipo.personas === 1 ? "persona ya sumó" : "personas ya sumaron"} esta semana. El detalle de cada quien está en el Resumen.
      </p>
    </div>
  );
}

export function MiDia({ className = "" }: Readonly<{ className?: string }>) {
  const usuarioId = useUsuarioActualId();
  const [progreso, setProgreso] = useState<MiProgreso | null>(null);
  const [ritmo, setRitmo] = useState<Ritmo>("normal");
  const [abierta, setAbierta] = useState(false);
  // La frase se elige una vez por carga: cambiarla en cada render la haría parpadear.
  const [azar] = useState(() => Math.random());

  useEffect(() => {
    if (usuarioId) setRitmo(leerRitmo(usuarioId));
  }, [usuarioId]);

  useEffect(() => {
    const alProgreso = (e: Event) => {
      const datos = (e as CustomEvent<MiProgreso>).detail;
      if (datos) setProgreso(datos);
    };
    window.addEventListener(EVENTO_PROGRESO, alProgreso);
    void pedirProgreso();
    return () => window.removeEventListener(EVENTO_PROGRESO, alProgreso);
  }, []);

  const meta = progreso ? metaVigente(progreso.perfil, ritmo, progreso.metaDelLider) : 0;
  const siguiente = useMemo(() => (progreso ? siguienteInsignia(progreso.insignias) : null), [progreso]);
  if (!progreso) return null;

  const logradas = progreso.insignias.filter((i) => i.lograda).length;
  const frase = fraseDe(situacionDelDia(progreso.hoy.total, meta), azar);
  const detalle = desglose(progreso);

  const cambiarRitmo = (nuevo: Ritmo) => {
    setRitmo(nuevo);
    if (usuarioId) guardarRitmo(usuarioId, nuevo);
  };

  return (
    <section className={`mi-dia rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-white to-blue-50/70 shadow-sm ${className}`} aria-label="Mi día">
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        aria-expanded={abierta}
        className="w-full flex items-center gap-3 p-3 md:p-4 text-left cursor-pointer rounded-3xl"
      >
        <Anillo valor={progreso.hoy.total} meta={meta} />
        <span className="flex-1 min-w-0">
          <span className="flex items-baseline gap-2 flex-wrap">
            <strong className="text-[15px] font-black text-blue-950">
              Mi día: {progreso.hoy.total} de {meta}
            </strong>
            {progreso.racha > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5">
                <Flame size={12} aria-hidden="true" /> {progreso.racha} {progreso.racha === 1 ? "semana" : "semanas"}
              </span>
            )}
            {progreso.equipo && (
              <span
                className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5"
                aria-label={`${progreso.equipo.tipo === "brigada" ? "Tu brigada" : "Tu gente"} lleva ${progreso.equipo.semana} esta semana`}
              >
                <Users size={12} aria-hidden="true" /> {progreso.equipo.semana}
              </span>
            )}
          </span>
          <span className="block text-[13px] font-semibold text-slate-600 truncate">{frase}</span>
          {!abierta && siguiente && (
            <span className="block text-xs font-bold text-blue-700 truncate mt-0.5">
              Siguiente: {siguiente.emoji} {siguiente.nombre} · {siguiente.lleva}/{siguiente.meta}
            </span>
          )}
        </span>
        <ChevronDown size={20} className={`shrink-0 text-slate-400 transition-transform ${abierta ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {abierta && (
        <div className="px-3 pb-4 md:px-4 space-y-4">
          {detalle && <p className="text-xs font-bold text-slate-600">Hoy: {detalle}. Esta semana: {progreso.semana}.</p>}
          {!detalle && <p className="text-xs font-bold text-slate-600">Esta semana llevas {progreso.semana}. Lo que registres o cierres hoy suma aquí.</p>}

          {progreso.equipo && <TuEquipo equipo={progreso.equipo} />}

          {progreso.metaDelLider !== null ? (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-3">
              <p className="text-sm font-extrabold text-blue-950">Tu meta: {progreso.metaDelLider} al día</p>
              <p className="text-[13px] font-semibold text-blue-900 mt-0.5">
                Te la puso quien coordina tu equipo. Puedes rebasarla cuando quieras.
              </p>
            </div>
          ) : (
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Tu ritmo</p>
            <div className="flex gap-2" role="radiogroup" aria-label="Tu ritmo del día">
              {RITMOS.map((r) => (
                <button
                  key={r.clave}
                  type="button"
                  role="radio"
                  aria-checked={ritmo === r.clave}
                  onClick={() => cambiarRitmo(r.clave)}
                  className={`flex-1 min-h-[44px] rounded-xl text-sm font-extrabold border cursor-pointer transition-colors ${
                    ritmo === r.clave ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {r.etiqueta}
                  <span className={`block text-[11px] font-bold ${ritmo === r.clave ? "text-blue-100" : "text-slate-500"}`}>
                    {metaDelDia(progreso.perfil, r.clave)} al día
                  </span>
                </button>
              ))}
            </div>
          </div>
          )}

          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Trophy size={12} aria-hidden="true" /> Tus insignias · {logradas} de {progreso.insignias.length}
            </p>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {progreso.insignias.map((i) => (
                <li
                  key={i.clave}
                  className={`rounded-2xl border p-2.5 ${i.lograda ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200"}`}
                >
                  <span className={`text-2xl leading-none ${i.lograda ? "" : "grayscale opacity-40"}`} aria-hidden="true">{i.emoji}</span>
                  <strong className={`block text-[13px] font-black mt-1 leading-tight ${i.lograda ? "text-amber-900" : "text-slate-700"}`}>{i.nombre}</strong>
                  {i.lograda ? (
                    <span className="block text-[11px] font-bold text-amber-700">¡Ganada!</span>
                  ) : (
                    <>
                      <span className="block text-[11px] font-semibold text-slate-600 leading-snug">{i.como}</span>
                      <span className="mt-1.5 block h-1.5 rounded-full bg-slate-100 overflow-hidden" aria-hidden="true">
                        <span className="block h-full rounded-full bg-blue-500" style={{ width: `${Math.round((i.lleva / i.meta) * 100)}%` }} />
                      </span>
                      <span className="block text-[11px] font-bold text-slate-500 mt-0.5 tabular-nums">{i.lleva} de {i.meta}</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-[11px] font-semibold text-slate-500">
            Solo tú ves esta tarjeta. Cuentan los registros activos y sin teléfonos repetidos: si uno se da de baja, deja de contar.
            {" "}En el Resumen, quien coordina tu equipo ve lo que registras, como siempre, y en cuántos días de la semana llegaste a la meta que te puso o, si no te puso una, a la de tu rol ({progreso.metaBase} al día).
          </p>
        </div>
      )}
    </section>
  );
}
