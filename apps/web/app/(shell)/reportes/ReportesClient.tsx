"use client";

import { useState } from "react";
// @ts-ignore
import { AlertTriangle, MapPin, CheckCircle, ChevronRight, FileText, Navigation } from "lucide-react";

export default function ReportesClient({ sections, users }: { sections: any[], users: any[] }) {
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    category: "",
    description: "",
    latitude: null as number | null,
    longitude: null as number | null,
    locationText: "",
    municipality: "Guadalajara",
    district: "",
    sectionId: "",
    assignedToUserId: "",
    eventDate: ""
  });

  const handleGPS = () => {
    if (!navigator.geolocation) {
      alert("La geolocalización no está soportada por tu navegador.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(p => ({
          ...p,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          locationText: `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`
        }));
      },
      () => {
        alert("No se pudo obtener la ubicación. Por favor permite el acceso al GPS.");
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.latitude || !form.longitude) {
      alert("Debes proporcionar una ubicación (usa el botón GPS o el mapa). Para esta demo, usa el GPS.");
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
          latitude: null,
          longitude: null,
          locationText: "",
          municipality: "Guadalajara",
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

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="flex items-center gap-4 border-b border-gray-100 pb-6 mb-6">
        <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shadow-sm">
          <AlertTriangle size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-blue-950 tracking-tight">Reporte de Incidencias</h1>
          <p className="text-gray-500 mt-1">Registra eventos críticos, alertas territoriales o necesidades urgentes en el mapa.</p>
        </div>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-6 rounded-2xl flex items-center gap-4 mb-6 shadow-sm animate-in fade-in slide-in-from-top-4">
          <CheckCircle size={24} className="text-emerald-500 shrink-0" />
          <div>
            <h3 className="font-bold">Reporte Guardado Exitosamente</h3>
            <p className="text-sm opacity-90">El marcador ha sido colocado en el mapa general.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          <section>
            <div className="flex items-center gap-2 mb-4 border-b border-gray-50 pb-2">
              <FileText className="text-blue-500" size={18} />
              <h2 className="text-lg font-bold text-gray-800">Detalles del Evento</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Título Corto *</label>
                <input 
                  type="text" required placeholder="Ej. Lona vandalizada en el centro" 
                  value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-gray-800" 
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Categoría *</label>
                <select 
                  required 
                  value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-gray-800 cursor-pointer"
                >
                  <option value="" disabled>Seleccionar categoría...</option>
                  <option value="bache">🕳️ Bache / Socavón</option>
                  <option value="alumbrado">💡 Falla de Alumbrado</option>
                  <option value="fuga_agua">💧 Fuga de Agua</option>
                  <option value="inundacion">🌊 Inundación</option>
                  <option value="basura">🗑️ Problema de Basura</option>
                  <option value="seguridad">🚨 Seguridad / Vandalismo</option>
                  <option value="lona_danada">📌 Lona / Propaganda Dañada</option>
                  <option value="emergencia">🆘 Emergencia Mayor</option>
                  <option value="mitin">👥 Mitin / Evento</option>
                  <option value="brigada">🚶 Brigada</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Municipio</label>
                <input 
                  type="text" placeholder="Ej. Guadalajara" 
                  value={form.municipality} onChange={e => setForm({...form, municipality: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-gray-800" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Fecha del Evento</label>
                <input 
                  type="date"
                  value={form.eventDate} onChange={e => setForm({...form, eventDate: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-gray-800" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Sección Electoral</label>
                <select 
                  value={form.sectionId} onChange={e => setForm({...form, sectionId: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-gray-800 cursor-pointer"
                >
                  <option value="">(No asignada)</option>
                  {sections.map(s => (
                    <option key={s.id} value={s.id}>{s.sectionNum}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Delegar Responsable</label>
                <select 
                  value={form.assignedToUserId} onChange={e => setForm({...form, assignedToUserId: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-gray-800 cursor-pointer"
                >
                  <option value="">(Sin responsable)</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.displayName}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Descripción Completa *</label>
                <textarea 
                  required rows={4} placeholder="Describe qué ocurrió, quién está involucrado y qué apoyo necesitas." 
                  value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-gray-800 resize-none"
                />
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4 border-b border-gray-50 pb-2 pt-4">
              <MapPin className="text-orange-500" size={18} />
              <h2 className="text-lg font-bold text-gray-800">Ubicación</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Coordenadas *</label>
                <div className="flex gap-2">
                  <input 
                    type="text" placeholder="Presiona el botón GPS para ubicarte" readOnly required
                    value={form.locationText}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-gray-800" 
                  />
                  <button 
                    type="button" onClick={handleGPS}
                    className="px-6 bg-orange-50 text-orange-600 rounded-xl border border-orange-100 font-bold hover:bg-orange-100 transition-colors flex items-center gap-2"
                  >
                    <Navigation size={18} /> GPS
                  </button>
                </div>
                {!form.latitude && (
                  <p className="text-xs text-red-500 mt-2 font-bold">La ubicación es obligatoria para guardar el reporte en el mapa.</p>
                )}
              </div>
            </div>
          </section>

          {/* SUBMIT BUTTON */}
          <div className="flex justify-end pt-8 border-t border-gray-100 mt-4">
            <button 
              type="submit" 
              disabled={saving}
              className="flex items-center justify-center gap-3 w-full md:w-auto bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-4 px-10 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-lg"
            >
              {saving ? "Enviando..." : "Enviar Reporte"} <ChevronRight size={24} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


