"use client";

import { useState } from "react";
import { PlusCircle, X, Package, CheckCircle2, UserCheck } from "lucide-react";
import { PredictiveCombobox } from "@/components/PredictiveCombobox";

export function AssignModal({ items }: { items: { id: string, name: string, quantity: number }[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [movementType, setMovementType] = useState("out");
  const [selectedLeader, setSelectedLeader] = useState("");

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl shadow-sm flex items-center gap-2 transition-colors"
      >
        <PlusCircle className="h-5 w-5" />
        Registrar Movimiento
      </button>
    );
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl shadow-sm flex items-center gap-2 transition-colors"
      >
        <PlusCircle className="h-5 w-5" />
        Registrar Movimiento
      </button>

      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
          
          <div className="flex justify-between items-center p-6 border-b border-gray-100">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <Package className="h-6 w-6 text-blue-600" />
              Asignación de Material
            </h2>
            <button onClick={() => { setIsOpen(false); setStep(1); }} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto">
            {step === 1 ? (
              <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
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
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Cantidad *</label>
                    <input type="number" required min="1" placeholder="0" className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 text-sm outline-none focus:border-blue-500 focus:bg-white transition-colors font-bold" />
                  </div>
                  <div>
                    <PredictiveCombobox
                      label="Tipo de Movimiento"
                      required
                      allowCustom={false}
                      value={movementType}
                      onChange={(val) => setMovementType(val)}
                      options={[
                        { value: "out", label: "Salida (Asignación)", badge: "Salida" },
                        { value: "in", label: "Entrada (Resurtido)", badge: "Entrada" }
                      ]}
                    />
                  </div>
                </div>

                <div>
                  <PredictiveCombobox
                    label="Asignar a Líder / Brigadista"
                    allowCustom={true}
                    placeholder="Buscar o escribir nombre de responsable..."
                    value={selectedLeader}
                    onChange={(val) => setSelectedLeader(val)}
                    options={[
                      { value: "user1", label: "Juan Pérez - Coordinador Zona Norte", badge: "Coordinador" },
                      { value: "user2", label: "María Gómez - Avanzada", badge: "Avanzada" },
                      { value: "user3", label: "Carlos Ruiz - Brigada Seccional", badge: "Brigada" }
                    ]}
                    icon={<UserCheck size={14} className="text-blue-600" />}
                    helperText="Opcional: Asigna el material a un promotor o brigadista"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Notas</label>
                  <textarea rows={2} placeholder="Justificación del movimiento..." className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 text-sm outline-none focus:border-blue-500 focus:bg-white transition-colors resize-none"></textarea>
                </div>

                <div className="pt-4">
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-colors text-sm">
                    Confirmar Movimiento
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Movimiento Registrado</h3>
                <p className="text-gray-500 text-sm mb-8">El stock ha sido actualizado exitosamente mediante el Outbox Pattern.</p>
                <button onClick={() => { setIsOpen(false); setStep(1); }} className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-2.5 px-6 rounded-xl transition-colors text-sm">
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
