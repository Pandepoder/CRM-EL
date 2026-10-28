"use client";

import { useEffect, useState } from "react";
import { Loader2, MapPin, Sparkles } from "lucide-react";

import { HojaInferior } from "@/components/HojaInferior";
import { PredictiveCombobox } from "@/components/PredictiveCombobox";
import { SeccionBuscable } from "@/components/SeccionBuscable";
import { avisar } from "@/lib/avisos";
import type { OpcionSelector } from "@/lib/bitacora-tipos";
import type { FilaDeIncidencia } from "@/lib/incidencias-consulta";

import { StatusSelector } from "./StatusSelector";

type Opcion = { id: string; nombre: string };

async function guardarCambio(id: string, cuerpo: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(`/api/map/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo)
    });
    const datos = await res.json().catch(() => ({}));
    if (!res.ok) {
      avisar(datos.error || "No se pudo guardar. Vuelve a intentarlo.");
      return false;
    }
    return true;
  } catch {
    avisar("Sin conexión: no se guardó. Revisa tu señal y vuelve a intentarlo.");
    return false;
  }
}

/**
 * «Asignar»: a qué equipo y a qué persona. Las listas son las del alcance de quien asigna, y el servidor lo
 * vuelve a comprobar (`motivoAsignacionFueraDeAlcance`).
 */
export function HojaAsignar({
  fila,
  personas,
  equipos,
  onCerrar,
  onGuardado
}: {
  fila: FilaDeIncidencia | null;
  personas: Opcion[];
  equipos: Opcion[];
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [equipo, setEquipo] = useState("");
  const [persona, setPersona] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setEquipo(fila?.asignadaAEquipoId ?? "");
    setPersona(fila?.asignadaAId ?? "");
  }, [fila]);

  async function guardar() {
    if (!fila) return;
    setGuardando(true);
    const ok = await guardarCambio(fila.id, { assignedTeamId: equipo || null, assignedToUserId: persona || null });
    setGuardando(false);
    if (ok) {
      avisar(equipo || persona ? "Incidencia asignada." : "Quedó sin asignar.", "exito");
      onGuardado();
    }
  }

  return (
    <HojaInferior
      abierta={Boolean(fila)}
      titulo="Asignar incidencia"
      subtitulo={fila?.titulo}
      onCerrar={onCerrar}
      ocupado={guardando}
      pie={
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="w-full min-h-[52px] rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-base font-extrabold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
        >
          {guardando && <Loader2 size={18} className="animate-spin" aria-hidden="true" />} {guardando ? "Guardando…" : "Guardar"}
        </button>
      }
    >
      <PredictiveCombobox
        label="Equipo"
        allowCustom={false}
        placeholder="Busca la brigada…"
        value={equipo}
        onChange={setEquipo}
        options={equipos.map((e) => ({ value: e.id, label: e.nombre, badge: "Equipo" }))}
        helperText="El equipo responde por la incidencia aunque cambie quien la atiende."
      />
      <PredictiveCombobox
        label="Persona que la atiende"
        allowCustom={false}
        placeholder="Busca por nombre…"
        value={persona}
        onChange={setPersona}
        options={personas.map((p) => ({ value: p.id, label: p.nombre, badge: "Persona" }))}
      />
      {(equipo || persona) && (
        <button
          type="button"
          onClick={() => {
            setEquipo("");
            setPersona("");
          }}
          className="min-h-[40px] text-sm font-bold text-gray-600 hover:text-gray-900 cursor-pointer"
        >
          Quitar la asignación
        </button>
      )}
    </HojaInferior>
  );
}

/**
 * «Más»: la sección electoral (detectada por el punto, o buscada por número) y el estado detallado. Antes la
 * sección se elegía en una lista de todas las de los municipios a la vista, en cada renglón de la tabla.
 */
export function HojaMas({ fila, onCerrar, onGuardado }: { fila: FilaDeIncidencia | null; onCerrar: () => void; onGuardado: () => void }) {
  const [seccion, setSeccion] = useState<OpcionSelector | null>(null);
  const [detectada, setDetectada] = useState<OpcionSelector | null>(null);
  const [detectando, setDetectando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setSeccion(null);
    setDetectada(null);
    if (!fila || fila.latitud === null || fila.longitud === null || fila.seccion) return;
    let vigente = true;
    setDetectando(true);
    fetch(`/api/map/reverse-geocode?lat=${fila.latitud}&lng=${fila.longitud}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (vigente && d?.sectionId && d?.sectionNum) setDetectada({ id: d.sectionId, nombre: `Sección ${d.sectionNum}`, detalle: d.municipality ?? null });
      })
      .catch(() => {})
      .finally(() => vigente && setDetectando(false));
    return () => {
      vigente = false;
    };
  }, [fila]);

  async function guardarSeccion(s: OpcionSelector) {
    if (!fila) return;
    setGuardando(true);
    const ok = await guardarCambio(fila.id, { sectionId: s.id });
    setGuardando(false);
    if (ok) {
      avisar(`Quedó en la ${s.nombre}.`, "exito");
      onGuardado();
    }
  }

  return (
    <HojaInferior abierta={Boolean(fila)} titulo="Sección y estado" subtitulo={fila?.titulo} onCerrar={onCerrar} ocupado={guardando}>
      <section className="space-y-2">
        <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-1.5">
          <MapPin size={15} className="text-gray-500" aria-hidden="true" /> Sección electoral {fila?.seccion ? `(hoy: ${fila.seccion})` : ""}
        </h3>
        {detectando && (
          <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
            <Loader2 size={13} className="animate-spin" aria-hidden="true" /> Buscando la sección del punto…
          </p>
        )}
        {detectada && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-emerald-900 flex items-center gap-1.5">
              <Sparkles size={14} aria-hidden="true" /> En el punto: {detectada.nombre}
            </p>
            <button type="button" disabled={guardando} onClick={() => guardarSeccion(detectada)} className="min-h-[40px] px-3 rounded-xl bg-emerald-600 text-white text-sm font-extrabold cursor-pointer disabled:opacity-60">
              Usar esta
            </button>
          </div>
        )}
        <SeccionBuscable municipio={fila?.municipioEsGeneral ? null : fila?.municipio} valor={seccion} onCambiar={setSeccion} etiqueta="Buscar otra sección" />
        {seccion && (
          <button type="button" disabled={guardando} onClick={() => guardarSeccion(seccion)} className="w-full min-h-[48px] rounded-2xl bg-blue-600 text-white text-sm font-extrabold cursor-pointer disabled:opacity-60">
            {guardando ? "Guardando…" : `Guardar ${seccion.nombre}`}
          </button>
        )}
      </section>
      {fila && (
        <section className="space-y-2 pt-3 border-t border-gray-100">
          <h3 className="text-sm font-extrabold text-gray-900">Estado</h3>
          <p className="text-xs text-gray-600">Para cualquier cambio que no sea el siguiente paso: reabrir, archivar, rechazar.</p>
          <StatusSelector key={fila.estado} reportId={fila.id} currentStatus={fila.estado} modo="desplegable" onCambio={onGuardado} />
        </section>
      )}
    </HojaInferior>
  );
}
