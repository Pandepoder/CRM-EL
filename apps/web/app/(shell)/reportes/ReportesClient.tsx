"use client";

import { OPCIONES_CATEGORIA } from "@/lib/categorias-incidencia";

import { useState } from "react";
// @ts-ignore
import { AlertTriangle, CheckCircle, ChevronRight, FileText, X, Landmark, Check, Loader2, Sparkles, Building2, Hash, UserCheck, Users } from "lucide-react";
import { PredictiveCombobox } from "@/components/PredictiveCombobox";
import type { LocationValue } from "@/components/LocationPicker";
import { LocationPicker } from "@/components/LocationPicker";
import { MUNICIPIOS_JALISCO } from "@/lib/municipios-jalisco";

export default function ReportesClient({ sections, users, teams = [] }: { sections: any[], users: any[], teams?: any[] }) {
  const [error, setError] = useState("");
  const [locationKey, setLocationKey] = useState(0);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sectionsList, setSectionsList] = useState<any[]>(sections || []);
  const [showNewSectionModal, setShowNewSectionModal] = useState(false);
  const [newSectionForm, setNewSectionForm] = useState({ sectionNum: "", municipality: "", colony: "" });
  const [creatingSection, setCreatingSection] = useState(false);

  const [form, setForm] = useState({
    title: "",
    category: "",
    description: "",
    // Sin ubicacion hasta que se fije una de verdad.
    //
    // Aqui venia la plaza principal de Tonala, con la etiqueta "Tonala Centro".
    // La comprobacion de mas abajo —"debes proporcionar una ubicacion"— no se
    // disparaba nunca, porque el formulario ya traia una: quien no tocaba el
    // mapa guardaba la incidencia en la plaza, presentada como exacta.
    latitude: null as number | null,
    longitude: null as number | null,
    locationText: "",
    municipality: "",
    district: "",
    sectionId: "",
    assignedToUserId: "",
    assignedTeamId: "",
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
        latitude: loc.latitude ?? prev.latitude,
        longitude: loc.longitude ?? prev.longitude,
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
        setNewSectionForm({ sectionNum: "", municipality: "", colony: "" });
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
    if (saving) return;
    setError("");
    setSuccess(false);
    if (!categoryOptions.some(option => option.value === form.category)) {
      setError("Selecciona una categoría de la lista.");
      return;
    }
    if (form.latitude === null || form.longitude === null) {
      setError("Falta la ubicación. Usa tu GPS, busca una dirección o toca el mapa.");
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
          assignedTeamId: form.assignedTeamId || undefined,
          eventDate: form.eventDate || undefined
        })
      });

      if (res.ok) {
        setSuccess(true);
        setLocationKey(key => key + 1);
        setForm({
          title: "",
          category: "",
          description: "",
          latitude: null as number | null,
          longitude: null as number | null,
          locationText: "",
          municipality: "",
          district: "",
          sectionId: "",
          assignedToUserId: "",
          assignedTeamId: "",
          eventDate: ""
        });

      } else {
        // Se muestra el motivo que da el servidor —por ejemplo, que levantar
        // incidencias corresponde al líder de la brigada— en vez de un mensaje
        // genérico que deja a quien reporta sin saber qué hacer.
        const errData = await res.json().catch(() => ({}));
        setError(errData.message || errData.error || "No se pudo guardar. Tus datos siguen aquí; intenta de nuevo.");
      }
    } catch {
      setError("No hay conexión. Tus datos siguen aquí; vuelve a intentar cuando tengas señal.");
    } finally {
      setSaving(false);
    }
  };

  // Se toman del catálogo único. Antes esta lista incluía `bacheo` y `otro`, que
  // la base de datos no acepta: elegir cualquiera de las dos daba error 500 y el
  // reporte se perdía sin que quien lo levantaba supiera por qué.
  const categoryOptions = OPCIONES_CATEGORIA.map((o) => ({ value: o.value, label: o.label, badge: "" }));

  const municipalityOptions = MUNICIPIOS_JALISCO.map((m) => ({ value: m.name, label: m.name, badge: `${m.count} secc.` }));

  const sectionOptions = sectionsList.map((s) => ({
    value: s.id,
    label: `Sección #${s.sectionNum}`,
    sublabel: s.municipality || "Sin municipio",
    badge: `Sección ${s.sectionNum}`
  }));

  const userOptions = users.map((u) => ({
    value: u.id,
    label: u.displayName,
    badge: "Operador"
  }));

  const teamOptions = teams.map((t) => ({
    value: t.id,
    label: t.name,
    sublabel: t.zone || undefined,
    // Un equipo sin integrantes se marca aquí para que no se asigne a ciegas.
    badge: t.memberCount > 0 ? `${t.memberCount} integrantes` : "Sin integrantes"
  }));

  return (
    <div className="workspace-page incident-page p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="workspace-hero flex items-center gap-4">
        <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shadow-sm">
          <AlertTriangle size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-950 flex flex-wrap items-center gap-2">
            Nueva incidencia
            <span className="text-xs bg-red-100 text-red-800 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles size={12} /> Registro rápido
            </span>
          </h1>
          <p className="text-sm text-gray-500">Describe el problema, ubícalo y envíalo. Así de simple.</p>
        </div>
      </div>

      {success && (
        <div role="status" className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 animate-in fade-in">
          <CheckCircle className="text-emerald-600 shrink-0" size={20} />
          <div>
            <p className="font-bold">¡Reporte registrado exitosamente!</p>
            <p className="text-sm">El reporte ha sido agregado al sistema y está visible en el mapa en vivo.</p>
          </div>
        </div>
      )}

      <div className="form-guide"><FileText size={22} /><div><strong>Lo esencial primero</strong><p>La asignación de equipo y los datos de seguimiento son opcionales.</p></div></div>
      {/* FORM */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">

          <section>
            <div className="flex items-center gap-2 mb-4 border-b border-gray-50 pb-2">
              <FileText className="text-red-500" size={18} />
              <h2 className="text-lg font-bold text-gray-800">1. ¿Qué ocurre?</h2>
            </div>

            <fieldset className="mb-5"><legend className="text-sm font-semibold text-slate-600 mb-3">Elige una categoría frecuente</legend><div className="category-shortcuts">{categoryOptions.filter(c => ["bache", "alumbrado", "fuga_agua", "basura"].includes(c.value)).map(c => <button type="button" key={c.value} aria-pressed={form.category === c.value} onClick={() => setForm(prev => ({ ...prev, category: c.value }))}>{c.label}</button>)}</div></fieldset>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label htmlFor="incident-title" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Título de la Incidencia *</label>
                <input
                  id="incident-title" type="text" required placeholder="Ej. Bache profundo en Av. Río Nilo cruce con Calle Juárez"
                  value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-gray-900 text-sm font-semibold"
                />
              </div>

              <div>
                <label htmlFor="incident-category" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Categoría de incidencia *</label>
                <select id="incident-category" required value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900">
                  <option value="">Selecciona una categoría</option>
                  {categoryOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
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

              <div className="md:col-span-2">
                <label htmlFor="incident-description" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Descripción Completa *</label>
                <textarea id="incident-description"
                  required rows={3} placeholder="Describe qué ocurrió, quién está involucrado y qué apoyo necesitas."
                  value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-gray-900 text-sm resize-none font-medium"
                />
              </div>
            </div>
          </section>

          <section className="pt-2">
            <LocationPicker
              key={locationKey}
              label="2. ¿Dónde ocurre? *"
              helperText="Escribe el domicilio (ej. Comité Directivo Municipal del PAN, Calle Juárez #123, Tonalá Centro), marca el punto en el mapa interactivo o usa tu GPS."
              defaultMunicipality={form.municipality || undefined}
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

          <details className="optional-fields"><summary>Asignación y seguimiento <span>Opcional</span></summary><div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-5">              <div>
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
                  label="Asignar a Equipo"
                  allowCustom={false}
                  placeholder="Buscar brigada o equipo..."
                  value={form.assignedTeamId}
                  onChange={(val) => setForm({ ...form, assignedTeamId: val })}
                  options={teamOptions}
                  icon={<Users size={13} className="text-red-500" />}
                  helperText="Opcional: el equipo responde por la incidencia aunque cambie quien la atiende"
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

</div></details>
          {error && <div role="alert" className="form-error">{error}</div>}
          {/* SUBMIT BUTTON */}
          <div className="form-savebar">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-3 w-full md:w-auto bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:opacity-50 text-white font-bold py-4 px-10 rounded-2xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 text-lg"
            >
              {saving ? "Enviando..." : "Crear incidencia"} <ChevronRight size={24} />
            </button>
          </div>
        </form>
      </div>

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

            <form onSubmit={handleCreateNewSection} className="p-5 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-1 pb-16">
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
                  <option value="" disabled>Selecciona un municipio…</option>
                          {MUNICIPIOS_JALISCO.map((m) => (
                            <option key={m.name} value={m.name}>{m.name}</option>
                          ))}
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
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingSection}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md"
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
