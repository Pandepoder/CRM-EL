"use client";

import { useState } from "react";
// @ts-ignore
import { AlertTriangle, CheckCircle, ChevronRight, FileText, X, Landmark, Check, Loader2, Sparkles, Building2, Tag, Hash, UserCheck } from "lucide-react";
import { PredictiveCombobox } from "@/components/PredictiveCombobox";
import type { LocationValue } from "@/components/LocationPicker";
import { LocationPicker } from "@/components/LocationPicker";

export default function ReportesClient({ sections, users }: { sections: any[], users: any[] }) {
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sectionsList, setSectionsList] = useState<any[]>(sections || []);
  const [showNewSectionModal, setShowNewSectionModal] = useState(false);
  const [newSectionForm, setNewSectionForm] = useState({ sectionNum: "", municipality: "Tonalá", colony: "" });
  const [creatingSection, setCreatingSection] = useState(false);

  const [form, setForm] = useState({
    title: "",
    category: "",
    description: "",
    latitude: 20.6248,
    longitude: -103.2422,
    locationText: "Tonalá Centro, Jalisco",
    municipality: "Tonalá",
    district: "",
    sectionId: "",
    assignedToUserId: "",
    eventDate: ""
  });

  const handleLocationChange = (loc: LocationValue) => {
    setForm(prev => {
      let matchedSectionId = prev.sectionId;
      if (loc.sectionNum && !matchedSectionId) {
        const found = sectionsList.find(s => String(s.sectionNum) === String(loc.sectionNum));
        if (found) matchedSectionId = found.id;
      }
      return {
        ...prev,
        latitude: (loc.latitude ?? prev.latitude) || 20.6248,
        longitude: (loc.longitude ?? prev.longitude) || -103.2422,
        locationText: loc.address || loc.locationText || prev.locationText,
        municipality: loc.municipality || prev.municipality,
        sectionId: loc.sectionId || matchedSectionId || prev.sectionId
      };
    });
  };

  const handleCreateNewSection = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(newSectionForm.sectionNum, 10);
    if (isNaN(num) || num <= 0) {
      alert("Ingresa un número de sección válido.");
      return;
    }

    setCreatingSection(true);
    try {
      const res = await fetch("/api/electoral/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionNum: num,
          municipality: newSectionForm.municipality,
          colony: newSectionForm.colony || undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        const created = data.section || data;
        setSectionsList(prev => [created, ...prev]);
        setForm(prev => ({ ...prev, sectionId: created.id }));
        setShowNewSectionModal(false);
        setNewSectionForm({ sectionNum: "", municipality: "Tonalá", colony: "" });
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || "Error al crear la sección.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al crear sección.");
    } finally {
      setCreatingSection(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.latitude || !form.longitude) {
      alert("Debes proporcionar una ubicación (usa el botón GPS o el mapa).");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/map/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          category: form.category,
          latitude: form.latitude,
          longitude: form.longitude,
          municipality: form.municipality,
          district: form.district,
          sectionId: form.sectionId || undefined,
          assignedToUserId: form.assignedToUserId || undefined,
          eventDate: form.eventDate || undefined
        })
      });

      if (res.ok) {
        setSuccess(true);
        setForm({
          title: "",
          category: "",
          description: "",
          latitude: 20.6248,
          longitude: -103.2422,
          locationText: "",
          municipality: "Tonalá",
          district: "",
          sectionId: "",
          assignedToUserId: "",
          eventDate: ""
        });
        setTimeout(() => setSuccess(false), 4000);
      } else {
        alert("Error al enviar el reporte");
      }
    } catch {
      alert("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const categoryOptions = [
    { value: "bacheo", label: "Bacheo y Pavimentación", badge: "Infraestructura" },
    { value: "alumbrado", label: "Alumbrado Público", badge: "Servicios" },
    { value: "fuga_agua", label: "Fuga de Agua / Drenaje", badge: "Agua" },
    { value: "basura", label: "Recolección de Basura", badge: "Limpia" },
    { value: "seguridad", label: "Seguridad Ciudadana", badge: "Urgente" },
    { value: "brigada", label: "Apoyo de Brigada", badge: "Territorial" },
    { value: "emergencia", label: "Emergencia Crítica", badge: "Alta Prioridad" },
    { value: "otro", label: "Otro / General", badge: "Otros" }
  ];

  const municipalityOptions = [
    { value: "Tonalá", label: "Tonalá", badge: "Principal" },
    { value: "Guadalajara", label: "Guadalajara" },
    { value: "San Pedro Tlaquepaque", label: "Tlaquepaque" },
    { value: "Zapopan", label: "Zapopan" },
    { value: "Tlajomulco de Zúñiga", label: "Tlajomulco" },
    { value: "El Salto", label: "El Salto" },
    { value: "Zapotlanejo", label: "Zapotlanejo" }
  ];

  const sectionOptions = sectionsList.map((s) => ({
    value: s.id,
    label: `Sección #${s.sectionNum}`,
    sublabel: s.municipality || "Tonalá",
    badge: `Sección ${s.sectionNum}`
  }));

  const userOptions = users.map((u) => ({
    value: u.id,
    label: u.displayName,
    badge: "Operador"
  }));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
        <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shadow-sm">
          <AlertTriangle size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-950 flex items-center gap-2">
            Nuevo Reporte Territorial
            <span className="text-xs bg-red-100 text-red-800 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles size={12} /> Autopredicción Activa
            </span>
          </h1>
          <p className="text-sm text-gray-500">Registra una incidencia con búsqueda predictiva y asignación instantánea.</p>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 animate-in fade-in">
          <CheckCircle className="text-emerald-600 shrink-0" size={20} />
          <div>
            <p className="font-bold">¡Reporte registrado exitosamente!</p>
            <p className="text-sm">El reporte ha sido agregado al sistema y está visible en el mapa en vivo.</p>
          </div>
        </div>
      )}

      {/* FORM */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <section>
            <div className="flex items-center gap-2 mb-4 border-b border-gray-50 pb-2">
              <FileText className="text-red-500" size={18} />
              <h2 className="text-lg font-bold text-gray-800">Detalles de la Incidencia</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Título de la Incidencia *</label>
                <input 
                  type="text" required placeholder="Ej. Bache profundo en Av. Río Nilo cruce con Calle Juárez" 
                  value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-gray-900 text-sm font-semibold" 
                />
              </div>

              <div>
                <PredictiveCombobox
                  label="Categoría de Incidencia"
                  required
                  allowCustom={true}
                  placeholder="Escribe o busca categoría..."
                  value={form.category}
                  onChange={(val) => setForm({ ...form, category: val })}
                  options={categoryOptions}
                  icon={<Tag size={13} className="text-red-500" />}
                />
              </div>

              <div>
                <PredictiveCombobox
                  label="Municipio"
                  required
                  allowCustom={false}
                  value={form.municipality}
                  onChange={(val) => setForm({ ...form, municipality: val })}
                  options={municipalityOptions}
                  icon={<Building2 size={13} className="text-red-500" />}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Fecha del Evento</label>
                <input 
                  type="date"
                  value={form.eventDate} onChange={e => setForm({...form, eventDate: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-gray-900 text-sm font-medium" 
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="block text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                    <Hash size={13} className="text-red-500" /> Sección Electoral
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowNewSectionModal(true)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    + Registrar Nueva
                  </button>
                </div>
                <PredictiveCombobox
                  placeholder="Escribe para buscar sección (ej. 2704)..."
                  allowCustom={false}
                  value={form.sectionId}
                  onChange={(val) => setForm({ ...form, sectionId: val })}
                  options={sectionOptions}
                />
              </div>

              <div className="md:col-span-2">
                <PredictiveCombobox
                  label="Delegar Operador Responsable"
                  allowCustom={false}
                  placeholder="Buscar operador o brigadista..."
                  value={form.assignedToUserId}
                  onChange={(val) => setForm({ ...form, assignedToUserId: val })}
                  options={userOptions}
                  icon={<UserCheck size={13} className="text-red-500" />}
                  helperText="Opcional: Asigna al operador encargado de resolver el reporte"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Descripción Completa *</label>
                <textarea 
                  required rows={3} placeholder="Describe qué ocurrió, quién está involucrado y qué apoyo necesitas." 
                  value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-gray-900 text-sm resize-none font-medium" 
                />
              </div>
            </div>
          </section>

          <section className="pt-2">
            <LocationPicker
              label="Sede o Domicilio de la Incidencia / Evento *"
              helperText="Escribe el domicilio (ej. Comité Directivo Municipal del PAN, Calle Juárez #123, Tonalá Centro), marca el punto en el mapa interactivo o usa tu GPS."
              defaultMunicipality={form.municipality || "Tonalá"}
              value={{
                latitude: form.latitude,
                longitude: form.longitude,
                address: form.locationText,
                locationText: form.locationText,
                municipality: form.municipality,
                sectionId: form.sectionId
              }}
              onChange={handleLocationChange}
            />
          </section>

          {/* SUBMIT BUTTON */}
          <div className="flex justify-end pt-8 border-t border-gray-100 mt-4">
            <button 
              type="submit" 
              disabled={saving}
              className="flex items-center justify-center gap-3 w-full md:w-auto bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:opacity-50 text-white font-bold py-4 px-10 rounded-2xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 text-lg"
            >
              {saving ? "Enviando..." : "Enviar Reporte"} <ChevronRight size={24} />
            </button>
          </div>
        </form>
      </div>

      {/* Modal: Registrar Nueva Sección Electoral */}
      {showNewSectionModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowNewSectionModal(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh] animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-blue-950 flex items-center gap-2">
                <Landmark size={20} className="text-indigo-600" /> Registrar Sección Electoral
              </h2>
              <button onClick={() => setShowNewSectionModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateNewSection} className="p-6 space-y-4">
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
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Municipio *
                </label>
                <select
                  value={newSectionForm.municipality}
                  onChange={e => setNewSectionForm({...newSectionForm, municipality: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                >
                  <option value="Tonalá">Tonalá</option>
                  <option value="Guadalajara">Guadalajara</option>
                  <option value="San Pedro Tlaquepaque">Tlaquepaque</option>
                  <option value="Zapopan">Zapopan</option>
                  <option value="Tlajomulco de Zúñiga">Tlajomulco</option>
                  <option value="El Salto">El Salto</option>
                  <option value="Zapotlanejo">Zapotlanejo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Colonia Principal (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Loma Dorada"
                  value={newSectionForm.colony}
                  onChange={e => setNewSectionForm({...newSectionForm, colony: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewSectionModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingSection}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  {creatingSection ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  <span>Guardar Sección</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
