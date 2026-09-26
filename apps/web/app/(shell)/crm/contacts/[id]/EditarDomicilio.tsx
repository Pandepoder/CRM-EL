"use client";

import { useRef, useState } from "react";
import { MapPin, X } from "lucide-react";

import { ColonySelector } from "@/components/ColonySelector";

/**
 * Corregir el domicilio de un ciudadano desde su ficha: colonia, sección, municipio, calle y número, y
 * el punto exacto (mapa o GPS). Lo corrige quien ya ve al ciudadano, brigadista incluido: es quien toca
 * la puerta y descubre el error (misma regla que `POST /api/crm/contacts/[id]/territory`).
 *
 * Antes era un diálogo con dos campos de sección —el del selector se ignoraba—, el municipio de quien
 * editaba en vez del del ciudadano, y el punto marcado en el mapa o por GPS se descartaba al guardar:
 * solo viajaban colonia, sección y municipio. Ahora el diálogo es un formulario y se envía lo que el
 * selector tiene en sus campos, además de la calle y el punto.
 */

export type DomicilioActual = {
  colonia: string | null;
  seccion: number | null;
  municipio: string | null;
  calle: string | null;
  lat: number | null;
  lng: number | null;
};

export function EditarDomicilio({
  contactId,
  actual,
  onCerrar,
  onGuardado,
  avisar,
  motivo
}: {
  contactId: string;
  actual: DomicilioActual;
  onCerrar: () => void;
  onGuardado: () => Promise<void> | void;
  avisar: (tipo: "success" | "error", mensaje: string) => void;
  /** Traduce el error del servidor a un texto para la persona. */
  motivo: (err: { code?: string; message?: string; error?: string } | null) => string | null;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calle, setCalle] = useState(actual.calle ?? "");
  const [punto, setPunto] = useState<{ lat: number; lng: number } | null>(
    actual.lat !== null && actual.lng !== null ? { lat: actual.lat, lng: actual.lng } : null
  );
  // La calle que puso el mapa se sustituye al marcar otro punto; la escrita a mano, no.
  const calleDelMapa = useRef(!actual.calle);

  async function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (guardando) return;
    setError(null);
    const datos = new FormData(e.currentTarget);
    const texto = (k: string) => {
      const v = datos.get(k);
      return typeof v === "string" ? v.trim() : "";
    };
    const numeroDeSeccion = Number.parseInt(texto("sectionNum"), 10);
    const cuerpo: Record<string, unknown> = {
      colonyName: texto("colony"),
      municipality: texto("municipality") || undefined,
      sectionNum: Number.isNaN(numeroDeSeccion) ? undefined : numeroDeSeccion,
      address: calle.trim()
    };
    if (punto) {
      cuerpo.exactLatitude = punto.lat;
      cuerpo.exactLongitude = punto.lng;
    } else if (actual.lat !== null) {
      // «Quitar el punto»: se borra, y el mapa vuelve a ubicarlo por su sección.
      cuerpo.exactLatitude = null;
      cuerpo.exactLongitude = null;
    }
    setGuardando(true);
    try {
      const res = await fetch(`/api/crm/contacts/${contactId}/territory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        setError(motivo(err) || "No se pudo guardar el domicilio.");
        return;
      }
      avisar("success", "Domicilio actualizado.");
      await onGuardado();
      onCerrar();
    } catch {
      setError("Sin conexión: no se guardó nada. Intenta de nuevo cuando tengas señal.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[110] flex items-center justify-center p-3 sm:p-4 animate-in fade-in" onClick={() => !guardando && onCerrar()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Editar domicilio"
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl max-h-[88dvh] flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-5 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <h3 className="font-black text-sm text-gray-900">Editar domicilio</h3>
          <button
            type="button"
            onClick={onCerrar}
            disabled={guardando}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center cursor-pointer transition-colors"
            title="Cerrar ventana"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={guardar} className="p-4 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-1">
          {error && (
            <p role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-2xl">{error}</p>
          )}

          <ColonySelector
            defaultValue={actual.colonia ?? ""}
            {...(actual.seccion ? { defaultSectionNum: actual.seccion } : {})}
            {...(actual.municipio ? { defaultMunicipality: actual.municipio } : {})}
            {...(punto ? { defaultCoords: punto } : {})}
            onSelect={(_seccionId, _colonia, _municipio, _numero, coords, calleDelPunto) => {
              if (coords) setPunto(coords);
              if (calleDelPunto !== undefined && (calleDelMapa.current || !calle.trim())) {
                setCalle(calleDelPunto);
                calleDelMapa.current = true;
              }
            }}
          />

          <div>
            <label htmlFor="domicilio-calle" className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Calle y número</label>
            <input
              id="domicilio-calle"
              maxLength={300}
              value={calle}
              onChange={(e) => {
                setCalle(e.target.value);
                calleDelMapa.current = e.target.value.trim() === "";
              }}
              placeholder="Ej. Calle Juárez #145"
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900"
            />
          </div>

          <p className="text-[11px] font-semibold text-gray-600 flex flex-wrap items-center gap-x-2 gap-y-1">
            <MapPin size={12} className="shrink-0 text-blue-600" aria-hidden="true" />
            {punto ? (
              <>
                <span>Punto: {punto.lat.toFixed(6)}, {punto.lng.toFixed(6)} (el que usa el mapa).</span>
                <button type="button" onClick={() => setPunto(null)} className="underline cursor-pointer">Quitar el punto</button>
              </>
            ) : (
              <span>Sin punto exacto: el mapa lo ubica en el centro de su sección. Márcalo con «Abrir mapa» o «Mi GPS».</span>
            )}
          </p>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button type="button" onClick={onCerrar} disabled={guardando} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-600 cursor-pointer">
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50">
              {guardando ? "Guardando..." : "Guardar domicilio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
