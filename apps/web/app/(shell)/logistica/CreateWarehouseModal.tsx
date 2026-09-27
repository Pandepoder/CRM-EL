"use client";

import { useState } from "react";
import { Warehouse, X } from "lucide-react";

import { MUNICIPIOS_JALISCO } from "@/lib/municipios-jalisco";

import { createWarehouseAction } from "./actions";

/**
 * Alta de un almacén (M32): antes no existía, y el único almacén que la aplicación creaba se inventaba
 * en silencio. Se da de alta en el municipio de quien lo crea; el administrador maestro elige cuál.
 */
export function CreateWarehouseModal({ eligeMunicipio }: { eligeMunicipio: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      const r = await createWarehouseAction(new FormData(e.currentTarget));
      if (r.ok) setAbierto(false);
      else setError(r.error);
    } catch {
      setError("No se pudo guardar. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <button
        onClick={() => { setError(""); setAbierto(true); }}
        className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-xl shadow-sm flex items-center gap-2 transition-colors"
      >
        <Warehouse className="h-5 w-5" />
        Nuevo almacén
      </button>

      {abierto && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-3 sm:p-4" onClick={() => setAbierto(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[88dvh] flex flex-col overflow-hidden border border-gray-100" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50 shrink-0">
              <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                <Warehouse className="h-5 w-5 text-blue-600" /> Nuevo almacén
              </h2>
              <button type="button" onClick={() => setAbierto(false)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center cursor-pointer" title="Cerrar ventana">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form className="p-5 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-1 pb-16" onSubmit={(e) => { void enviar(e); }}>
              {error && <p role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">{error}</p>}
              <div>
                <label htmlFor="almacen-nombre" className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Nombre *</label>
                <input id="almacen-nombre" name="name" required minLength={2} maxLength={80} placeholder="Ej. Bodega Centro" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white" />
              </div>
              <div>
                <label htmlFor="almacen-ubicacion" className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Dirección</label>
                <input id="almacen-ubicacion" name="location" maxLength={200} placeholder="Calle, número y colonia" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50 text-sm outline-none focus:border-blue-500 focus:bg-white" />
              </div>
              {eligeMunicipio ? (
                <div>
                  <label htmlFor="almacen-municipio" className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Municipio *</label>
                  <select id="almacen-municipio" name="municipality" required defaultValue="" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white">
                    <option value="" disabled>Elige el municipio…</option>
                    {MUNICIPIOS_JALISCO.map((m) => (
                      <option key={m.name} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-xs text-gray-500">Se da de alta en tu municipio.</p>
              )}
              <button type="submit" disabled={enviando} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl text-sm cursor-pointer">
                {enviando ? "Guardando…" : "Guardar almacén"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
