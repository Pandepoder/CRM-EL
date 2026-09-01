"use client";

import { useState } from "react";
// @ts-ignore
import { Landmark, Users, Search, Plus, Map, X, Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { PredictiveCombobox } from "@/components/PredictiveCombobox";

type Representative = {
  id: string;
  sectionNum: number;
  sectionId: string;
  displayName: string;
  role: string;
  assignedAt: Date;
};

type UserProfile = {
  id: string;
  displayName: string;
};

type Section = {
  id: string;
  sectionNum: number;
  municipality?: string;
  colonies?: string[];
};

type Props = {
  representatives: Representative[];
  availableUsers: UserProfile[];
  sections: Section[];
};

export default function EstructuraClient({ representatives, availableUsers, sections: initialSections }: Props) {
  const router = useRouter();
  const [sectionsList, setSectionsList] = useState<Section[]>(initialSections);
  const [showModal, setShowModal] = useState(false);
  const [showNewSectionModal, setShowNewSectionModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ sectionId: "", userId: "", role: "coordinador" });
  
  const [newSectionForm, setNewSectionForm] = useState({
    sectionNum: "",
    municipality: "Tonalá",
    colony: ""
  });

  const filtered = representatives.filter(r => 
    r.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.sectionNum.toString().includes(searchTerm)
  );

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!form.sectionId || !form.userId) return;

    setSaving(true);
    try {
      const res = await fetch("/api/electoral/representatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setShowModal(false);
        setForm({ sectionId: "", userId: "", role: "coordinador" });
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Error al asignar");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateSection(e: React.FormEvent) {
    e.preventDefault();
    const num = Number(newSectionForm.sectionNum);
    if (!num || num <= 0) {
      alert("Por favor ingresa un número de sección válido.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/electoral/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionNum: num,
          municipality: newSectionForm.municipality,
          colony: newSectionForm.colony.trim() || undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        const created = data.section;
        if (created) {
          setSectionsList(prev => [...prev, {
            id: created.id,
            sectionNum: created.sectionNum,
            municipality: created.municipality,
            colonies: created.colonies
          }].sort((a, b) => a.sectionNum - b.sectionNum));
          
          setForm(f => ({ ...f, sectionId: created.id }));
        }
        setShowNewSectionModal(false);
        setNewSectionForm({ sectionNum: "", municipality: "Tonalá", colony: "" });
        alert(`✓ Sección #${num} registrada con éxito en la base de datos.`);
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Error al registrar la sección");
      }
    } catch (_err) {
      alert("Error de conexión al crear sección");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
            <Landmark size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-blue-950 tracking-tight">Estructura Electoral</h1>
            <p className="text-gray-500 mt-1">Gestión de coordinadores, representantes de casilla y catálogo de secciones.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => setShowNewSectionModal(true)}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold rounded-xl shadow-sm transition-all"
          >
            <Plus size={18} /> Nueva Sección
          </button>
          <button 
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-all"
          >
            <Plus size={18} /> Asignar Representante
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por sección o nombre..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="text-xs font-bold text-gray-500">
            {sectionsList.length} Secciones Electorales en Base de Datos
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-20 h-20 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users size={40} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No hay asignaciones</h2>
            <p className="text-gray-500 mb-6">Aún no hay representantes o coordinadores asignados a las secciones electorales.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider font-bold text-gray-500">
                  <th className="p-4 pl-6">Sección</th>
                  <th className="p-4">Representante</th>
                  <th className="p-4">Rol</th>
                  <th className="p-4">Fecha de Asignación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 pl-6 font-bold text-gray-900 flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center">
                        <Map size={16} />
                      </div>
                      Sección #{r.sectionNum}
                    </td>
                    <td className="p-4 text-gray-700 font-medium">
                      {r.displayName}
                    </td>
                    <td className="p-4">
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold uppercase rounded-full tracking-wider border border-blue-100">
                        {r.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 text-sm">
                      {new Date(r.assignedAt).toLocaleDateString("es-MX")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Asignar Representante */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl max-h-[88dvh] flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <h2 className="text-lg font-bold text-blue-950">Asignar Representante</h2>
              <button 
                type="button" 
                onClick={() => setShowModal(false)} 
                className="text-gray-500 hover:text-gray-800 w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-200/60 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAssign} className="p-5 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-1 pb-16">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Sección Electoral *</label>
                  <button 
                    type="button" 
                    onClick={() => { setShowModal(false); setShowNewSectionModal(true); }}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    + Registrar Nueva
                  </button>
                </div>
                <PredictiveCombobox
                  placeholder="Escribe para buscar sección (ej. 2704)..."
                  required
                  allowCustom={false}
                  value={form.sectionId}
                  onChange={(val) => setForm({ ...form, sectionId: val })}
                  options={sectionsList.map((s) => ({
                    value: s.id,
                    label: `Sección #${s.sectionNum}`,
                    sublabel: s.municipality || "Tonalá",
                    badge: `Sección ${s.sectionNum}`
                  }))}
                />
              </div>

              <div>
                <PredictiveCombobox
                  label="Usuario / Operador"
                  required
                  allowCustom={false}
                  placeholder="Escribe para buscar usuario..."
                  value={form.userId}
                  onChange={(val) => setForm({ ...form, userId: val })}
                  options={availableUsers.map((u) => ({
                    value: u.id,
                    label: u.displayName,
                    badge: "Usuario"
                  }))}
                />
              </div>

              <div>
                <PredictiveCombobox
                  label="Rol en Estructura"
                  required
                  allowCustom={false}
                  value={form.role}
                  onChange={(val) => setForm({ ...form, role: val })}
                  options={[
                    { value: "coordinador", label: "Coordinador de Sección", badge: "Liderazgo" },
                    { value: "representante_casilla", label: "Representante de Casilla (RC)", badge: "Casilla" },
                    { value: "representante_general", label: "Representante General (RG)", badge: "General" }
                  ]}
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={saving || !form.sectionId || !form.userId}
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : "Asignar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar Nueva Sección Electoral */}
      {showNewSectionModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in" onClick={() => setShowNewSectionModal(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl max-h-[88dvh] flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <h2 className="text-lg font-bold text-blue-950 flex items-center gap-2">
                <Landmark size={20} className="text-indigo-600" /> Registrar Sección Electoral
              </h2>
              <button 
                type="button" 
                onClick={() => setShowNewSectionModal(false)} 
                className="text-gray-500 hover:text-gray-800 w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-200/60 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateSection} className="p-5 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-1 pb-16">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Número de Sección Electoral *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="9999"
                  placeholder="Ej. 2800"
                  value={newSectionForm.sectionNum}
                  onChange={e => setNewSectionForm({...newSectionForm, sectionNum: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-bold"
                />
              </div>

              <div>
                <PredictiveCombobox
                  label="Municipio"
                  required
                  allowCustom={false}
                  value={newSectionForm.municipality}
                  onChange={(val) => setNewSectionForm({ ...newSectionForm, municipality: val })}
                  options={[
                    { value: "Tonalá", label: "Tonalá", badge: "Principal" },
                    { value: "Guadalajara", label: "Guadalajara" },
                    { value: "San Pedro Tlaquepaque", label: "Tlaquepaque" },
                    { value: "Zapopan", label: "Zapopan" },
                    { value: "Tlajomulco de Zúñiga", label: "Tlajomulco" },
                    { value: "El Salto", label: "El Salto" },
                    { value: "Zapotlanejo", label: "Zapotlanejo" },
                    { value: "Ixtlahuacán de los Membrillos", label: "Ixtlahuacán" },
                    { value: "Juanacatlán", label: "Juanacatlán" }
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Colonia / Asentamiento (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Centro / Lomas de la Soledad"
                  value={newSectionForm.colony}
                  onChange={e => setNewSectionForm({...newSectionForm, colony: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowNewSectionModal(false)}
                  className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={saving || !newSectionForm.sectionNum}
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Guardar Sección
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
