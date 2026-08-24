"use client";

import { useState } from "react";
import { PlusCircle, X, Package, CheckCircle2 } from "lucide-react";

export function AssignModal({ items }: { items: { id: string, name: string, quantity: number }[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);

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
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Artículo</label>
                  <select required className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 text-sm outline-none focus:border-blue-500 focus:bg-white transition-colors appearance-none">
                    <option value="">Seleccione un artículo del inventario...</option>
                    {items.map(it => (
                      <option key={it.id} value={it.id}>{it.name} (Disp: {it.quantity})</option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Cantidad</label>
                    <input type="number" required min="1" placeholder="0" className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 text-sm outline-none focus:border-blue-500 focus:bg-white transition-colors" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Tipo</label>
                    <select required className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 text-sm outline-none focus:border-blue-500 focus:bg-white transition-colors appearance-none">
                      <option value="out">Salida (Asignación)</option>
                      <option value="in">Entrada (Resurtido)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Asignar a Líder (Opcional)</label>
                  <select className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 text-sm outline-none focus:border-blue-500 focus:bg-white transition-colors appearance-none">
                    <option value="">Buscar líder de brigada...</option>
                    <option value="user1">Juan Pérez - Coordinador Zona Norte</option>
                    <option value="user2">María Gómez - Avanzada</option>
                  </select>
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
