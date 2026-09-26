"use client";

import { useState } from "react";
import { PlusCircle, X, Package, CheckCircle2, UserCheck } from "lucide-react";
import { PredictiveCombobox } from "@/components/PredictiveCombobox";

import { registerMovementAction } from "./actions";

/**
 * Registrar una entrada o una salida de material.
 *
 * Antes este formulario no guardaba nada: al confirmar decía «Movimiento registrado… actualizado
 * exitosamente» y el inventario seguía igual, y ofrecía de responsables a tres personas inventadas
 * (M33). Ahora llama a `registerMovementAction`, que suma o resta existencias de verdad, y el
 * responsable se elige entre las personas activas de tu estructura.
 */
export function AssignModal({
  items,
  personas
}: {
  items: { id: string; name: string; quantity: number }[];
  personas: { id: string; nombre: string }[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [hecho, setHecho] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [movementType, setMovementType] = useState("out");
  const [selectedLeader, setSelectedLeader] = useState("");

  const cerrar = () => {
    setIsOpen(false);
    setHecho(null);
    setError("");
    setSelectedItemId("");
    setSelectedLeader("");
  };

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const datos = new FormData(e.currentTarget);
    datos.set("itemId", selectedItemId);
    datos.set("type", movementType);
    datos.set("assignedToUserId", selectedLeader);
    setEnviando(true);
    try {
      const r = await registerMovementAction(datos);
      if (r.ok) setHecho(r.mensaje ?? "Movimiento registrado.");
      else setError(r.error);
    } catch {
      setError("No se pudo registrar. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  const boton = (
    <button
      onClick={() => setIsOpen(true)}
      disabled={items.length === 0}
      title={items.length === 0 ? "Primero da de alta un artículo" : undefined}
      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-xl shadow-sm flex items-center gap-2 transition-colors"
    >
      <PlusCircle className="h-5 w-5" />
      Registrar Movimiento
    </button>
  );

  if (!isOpen) return boton;

  return (
    <>
      {boton}

      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-3 sm:p-4 animate-in fade-in" onClick={cerrar}>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[88dvh] flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>

          <div className="flex justify-between items-center p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50 shrink-0">
            <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              Movimiento de material
            </h2>
            <button
              type="button"
              onClick={cerrar}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1 pb-16">
            {hecho === null ? (
              <form className="space-y-4" onSubmit={(e) => { void enviar(e); }}>
                {error && (
                  <p role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">{error}</p>
                )}
                <div>
                  <PredictiveCombobox
                    label="Artículo del Inventario"
                    required
                    allowCustom={false}
                    placeholder="Escribe o busca artículo..."
                    value={selectedItemId}
                    onChange={(val) => setSelectedItemId(val)}
                    options={items.map(it => ({
                      value: it.id,
                      label: it.name,
                      badge: `Disp: ${it.quantity}`
                    }))}
                    icon={<Package size={14} className="text-blue-600" />}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="movimiento-cantidad" className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Cantidad *</label>
                    <input id="movimiento-cantidad" name="quantity" type="number" required min="1" step="1" placeholder="0" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50 text-sm outline-none focus:border-blue-500 focus:bg-white transition-colors font-bold" />
                  </div>
                  <div>
                    <PredictiveCombobox
                      label="Tipo de Movimiento"
                      required
                      allowCustom={false}
                      value={movementType}
                      onChange={(val) => setMovementType(val)}
                      options={[
                        { value: "out", label: "Salida (entrega)", badge: "Salida" },
                        { value: "in", label: "Entrada (resurtido)", badge: "Entrada" }
                      ]}
                    />
                  </div>
                </div>

                <div>
                  <PredictiveCombobox
                    label="Entregar a"
                    allowCustom={false}
                    placeholder="Busca a una persona de tu estructura..."
                    value={selectedLeader}
                    onChange={(val) => setSelectedLeader(val)}
                    options={personas.map((p) => ({ value: p.id, label: p.nombre }))}
                    icon={<UserCheck size={14} className="text-blue-600" />}
                    helperText="Opcional: quién recibe el material."
                  />
                </div>

                <div>
                  <label htmlFor="movimiento-notas" className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Notas</label>
                  <textarea id="movimiento-notas" name="notes" rows={2} maxLength={500} placeholder="Justificación del movimiento..." className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50 text-sm outline-none focus:border-blue-500 focus:bg-white transition-colors resize-none"></textarea>
                </div>

                <div className="pt-2">
                  <button type="submit" disabled={enviando || !selectedItemId} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-colors text-sm cursor-pointer">
                    {enviando ? "Registrando…" : "Confirmar Movimiento"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Movimiento registrado</h3>
                <p className="text-gray-500 text-sm mb-8">{hecho}</p>
                <button onClick={cerrar} className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-2.5 px-6 rounded-xl transition-colors text-sm cursor-pointer">
                  Cerrar Panel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
