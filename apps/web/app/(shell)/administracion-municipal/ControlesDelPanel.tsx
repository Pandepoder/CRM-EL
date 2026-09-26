"use client";

import { useState } from "react";

import { MUNICIPIOS_JALISCO } from "@/lib/municipios-jalisco";

import { asignarMunicipioAction, nombrarAdministradorAction } from "./actions";

type Respuesta = { ok: true; mensaje?: string } | { ok: false; error: string };

function useAccion() {
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const correr = async (accion: () => Promise<Respuesta>, exito: string) => {
    setEnviando(true);
    setMensaje(null);
    try {
      const r = await accion();
      setMensaje(r.ok ? { ok: true, texto: r.mensaje ?? exito } : { ok: false, texto: r.error });
    } catch {
      setMensaje({ ok: false, texto: "No se pudo completar. Revisa tu conexión e intenta de nuevo." });
    } finally {
      setEnviando(false);
    }
  };
  return { enviando, mensaje, correr };
}

function Aviso({ mensaje }: { mensaje: { ok: boolean; texto: string } | null }) {
  if (!mensaje) return null;
  return (
    <p role="status" className={`m-0 mt-1 text-[11px] font-bold ${mensaje.ok ? "text-green-800" : "text-rose-800"}`}>
      {mensaje.texto}
    </p>
  );
}

/** Asignar o transferir el municipio de una cuenta (el de un administrador es lo que gobierna). */
export function AsignarMunicipio({ userId, actual, etiqueta }: { userId: string; actual: string | null; etiqueta: string }) {
  const [municipio, setMunicipio] = useState(actual ?? "");
  const { enviando, mensaje, correr } = useAccion();
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        <label className="sr-only" htmlFor={`municipio-${userId}`}>{etiqueta}</label>
        <select
          id={`municipio-${userId}`}
          value={municipio}
          onChange={(e) => setMunicipio(e.target.value)}
          className="max-w-[12rem] p-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-900"
        >
          <option value="" disabled>Elige municipio…</option>
          {MUNICIPIOS_JALISCO.map((m) => (
            <option key={m.name} value={m.name}>{m.name}</option>
          ))}
        </select>
        <button
          type="button"
          disabled={enviando || !municipio || municipio === actual}
          onClick={() => { void correr(() => asignarMunicipioAction(userId, municipio), `Ahora es de ${municipio}. Sus sesiones abiertas se cerraron.`); }}
          className="px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-extrabold disabled:opacity-40 cursor-pointer"
        >
          {enviando ? "Guardando…" : actual ? "Transferir" : "Asignar"}
        </button>
      </div>
      <Aviso mensaje={mensaje} />
    </div>
  );
}

/** Nombrar administradora de su municipio a una persona activa de él. */
export function NombrarAdministrador({ candidatos, municipio }: { candidatos: { id: string; nombre: string; rol: string }[]; municipio: string }) {
  const [elegido, setElegido] = useState("");
  const { enviando, mensaje, correr } = useAccion();
  if (candidatos.length === 0) return <p className="m-0 text-[11px] text-slate-500">No hay personas activas en {municipio} que nombrar.</p>;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        <label className="sr-only" htmlFor={`nombrar-${municipio}`}>Nombrar administrador de {municipio}</label>
        <select
          id={`nombrar-${municipio}`}
          value={elegido}
          onChange={(e) => setElegido(e.target.value)}
          className="max-w-[14rem] p-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-900"
        >
          <option value="" disabled>Persona activa de {municipio}…</option>
          {candidatos.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre} · {c.rol}</option>
          ))}
        </select>
        <button
          type="button"
          disabled={enviando || !elegido}
          onClick={() => {
            if (!confirm("¿Nombrarla administradora de su municipio? Verá y gobernará todo " + municipio + ".")) return;
            void correr(() => nombrarAdministradorAction(elegido), "Nombrada administradora. Sus sesiones abiertas se cerraron.");
          }}
          className="px-2.5 py-1.5 rounded-lg bg-blue-700 text-white text-xs font-extrabold disabled:opacity-40 cursor-pointer"
        >
          {enviando ? "Nombrando…" : "Nombrar administrador"}
        </button>
      </div>
      <Aviso mensaje={mensaje} />
    </div>
  );
}
