"use client";

import { useState } from "react";
import { Home, Loader2 } from "lucide-react";

import { MUNICIPIOS_JALISCO } from "@/lib/municipios-jalisco";

/**
 * El domicilio de una cuenta (0025) en su perfil. Lo ven la propia persona y la administración que
 * la gobierna; sus compañeros de brigada, no. Solo la propia persona lo corrige, desde aquí.
 */
export type Domicilio = { calle: string | null; colonia: string | null; municipio: string | null };

export function DomicilioDeLaCuenta({ domicilio, editable }: { domicilio: Domicilio; editable: boolean }) {
  const [actual, setActual] = useState(domicilio);
  const [editando, setEditando] = useState(false);
  const [f, setF] = useState({ calle: domicilio.calle ?? "", colonia: domicilio.colonia ?? "", municipio: domicilio.municipio ?? "" });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const texto = [actual.calle, actual.colonia ? `Col. ${actual.colonia}` : null, actual.municipio].filter(Boolean).join(", ");

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (guardando) return;
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeAddress: f.calle, homeColony: f.colonia, homeMunicipality: f.municipio })
      });
      const datos = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(datos.error || "No se pudo guardar tu domicilio.");
        return;
      }
      setActual({ calle: f.calle.trim(), colonia: f.colonia.trim(), municipio: f.municipio });
      setEditando(false);
    } catch {
      setError("Sin conexión: no se guardó. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  const campo = "w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900";

  return (
    <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Home size={16} className="text-blue-600" />
          <h3 className="font-extrabold text-xs text-gray-900 uppercase">Domicilio</h3>
        </div>
        {editable && !editando && (
          <button type="button" onClick={() => setEditando(true)} className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer">
            {texto ? "Editar" : "Agregar"}
          </button>
        )}
      </div>

      {!editando ? (
        <p className={`text-sm font-bold break-words ${texto ? "text-gray-900" : "text-gray-400"}`}>
          {texto || (editable ? "Aún no has registrado tu domicilio." : "Sin domicilio registrado.")}
        </p>
      ) : (
        <form onSubmit={guardar} className="space-y-3">
          <div>
            <label htmlFor="dom-calle" className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Calle y número</label>
            <input id="dom-calle" required maxLength={300} value={f.calle} onChange={(e) => setF({ ...f, calle: e.target.value })} className={campo} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="dom-colonia" className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Colonia</label>
              <input id="dom-colonia" required maxLength={150} value={f.colonia} onChange={(e) => setF({ ...f, colonia: e.target.value })} className={campo} />
            </div>
            <div>
              <label htmlFor="dom-municipio" className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Municipio donde vives</label>
              <select id="dom-municipio" required value={f.municipio} onChange={(e) => setF({ ...f, municipio: e.target.value })} className={campo}>
                <option value="">Elige tu municipio…</option>
                {MUNICIPIOS_JALISCO.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
              </select>
            </div>
          </div>
          {error && <p role="alert" className="text-xs font-bold text-rose-700">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditando(false)} disabled={guardando} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-600 cursor-pointer">Cancelar</button>
            <button type="submit" disabled={guardando} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-60 inline-flex items-center gap-1.5">
              {guardando && <Loader2 size={13} className="animate-spin" />} Guardar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
