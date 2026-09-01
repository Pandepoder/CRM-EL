"use client";

import { useState } from "react";
import { PlusCircle, X, CheckCircle2, Image as ImageIcon, Tag } from "lucide-react";
import { createInventoryItemAction } from "./actions";
import { PredictiveCombobox } from "@/components/PredictiveCombobox";

export function CreateItemModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      await createInventoryItemAction(formData);
      setStep(2);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-xl shadow-sm flex items-center gap-2 transition-colors mr-3"
      >
        <PlusCircle className="h-5 w-5" />
        Nuevo Artículo
      </button>
    );
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-xl shadow-sm flex items-center gap-2 transition-colors mr-3"
      >
        <PlusCircle className="h-5 w-5" />
        Nuevo Artículo
      </button>

      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in" onClick={() => { setIsOpen(false); setStep(1); }}>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[88dvh] flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
          
          <div className="flex justify-between items-center p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50 shrink-0">
            <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-blue-600" />
              Nuevo Artículo
            </h2>
            <button 
              type="button"
              onClick={() => { setIsOpen(false); setStep(1); }} 
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1 pb-16">
            {step === 1 ? (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Nombre *</label>
                    <input name="name" type="text" required placeholder="Ej. Lona 2x2" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">SKU *</label>
                    <input name="sku" type="text" required placeholder="Ej. LONA-2X2" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white transition-colors" />
                  </div>
                </div>

                <div>
                  <PredictiveCombobox
                    name="category"
                    label="Categoría de Material"
                    required
                    allowCustom={true}
                    defaultValue="propaganda"
                    placeholder="Escribe o selecciona categoría..."
                    options={[
                      { value: "propaganda", label: "Propaganda Electoral", badge: "Campaña" },
                      { value: "equipo", label: "Equipo de Oficina", badge: "Operación" },
                      { value: "papeleria", label: "Papelería e Insumos", badge: "Insumos" },
                      { value: "uniformes", label: "Uniformes y Chalecos", badge: "Brigada" },
                      { value: "tecnologia", label: "Tecnología y Dispositivos", badge: "TI" },
                      { value: "otros", label: "Otros / General", badge: "General" }
                    ]}
                    icon={<Tag size={14} className="text-blue-600" />}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Descripción</label>
                  <textarea name="description" rows={2} placeholder="Detalles del artículo..." className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50 text-sm outline-none focus:border-blue-500 focus:bg-white transition-colors resize-none"></textarea>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">URL de Imagen</label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input name="imageUrl" type="url" placeholder="https://..." className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 bg-gray-50 text-sm outline-none focus:border-blue-500 focus:bg-white transition-colors" />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button disabled={loading} type="submit" className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-colors text-sm cursor-pointer">
                    {loading ? "Guardando..." : "Guardar Artículo"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Artículo Creado</h3>
                <p className="text-gray-500 text-sm mb-8">El artículo ha sido añadido al catálogo exitosamente.</p>
                <button onClick={() => { setIsOpen(false); setStep(1); }} className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-2.5 px-6 rounded-xl transition-colors text-sm cursor-pointer">
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
