"use client";

import { OPCIONES_CATEGORIA } from "@/lib/categorias-incidencia";

import { useState } from "react";
import { AlertTriangle, CheckCircle, ChevronRight, FileText, Sparkles, Building2, UserCheck, Users } from "lucide-react";
import { PredictiveCombobox } from "@/components/PredictiveCombobox";
import { SeccionBuscable } from "@/components/SeccionBuscable";
import type { OpcionSelector } from "@/lib/bitacora-tipos";
import type { LocationValue } from "@/components/LocationPicker";
import { LocationPicker } from "@/components/LocationPicker";
import { MUNICIPIOS_JALISCO } from "@/lib/municipios-jalisco";
import { useMunicipioUsuario } from "@/lib/municipio-contexto";
import { enviarOEncolar, nuevaClave, TEXTO_DE_ESPERA } from "@/lib/cola-de-envios";
export default function ReportesClient({ users, teams = [], usuarioActualId }: { users: any[], teams?: any[], usuarioActualId: string }) {
  // El selector de punto abre en el municipio de quien reporta, no en todo Jalisco.
  const municipioUsuario = useMunicipioUsuario();
  const [error, setError] = useState("");
  const [locationKey, setLocationKey] = useState(0);
  const [success, setSuccess] = useState(false);
  // Sin señal el reporte queda en el teléfono: se dice así, no como «registrado».
  const [enEspera, setEnEspera] = useState<string | null>(null);
  // Clave del alta (R16): el doble toque o el reenvío desde la cola no levantan otra incidencia.
  const [clave, setClave] = useState(() => nuevaClave());
  const [saving, setSaving] = useState(false);
  // La sección elegida a mano, o la que dio el punto. Si queda vacía, el servidor la saca del punto.
  const [seccion, setSeccion] = useState<OpcionSelector | null>(null);

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
    // La sección es la del punto: la del punto anterior no vale (antes se quedaba si el nuevo caía fuera
    // de la cartografía, y la incidencia se guardaba con una sección de otro lugar). Sin ella, el servidor
    // ubica el punto en su sección.
    const matchedSectionId = loc.sectionId || "";
    setSeccion(matchedSectionId ? { id: matchedSectionId, nombre: loc.sectionNum ? `Sección ${loc.sectionNum}` : "Sección del punto" } : null);
    setForm(prev => {
      return {
        ...prev,
        latitude: loc.latitude ?? prev.latitude,
        longitude: loc.longitude ?? prev.longitude,
        locationText: loc.address || loc.locationText || prev.locationText,
        municipality: loc.municipality || prev.municipality,
        sectionId: matchedSectionId
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError("");
    setSuccess(false);
    setEnEspera(null);
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
      const r = await enviarOEncolar({
        clave,
        tipo: "incidencia",
        url: "/api/map/reports",
        descripcion: `Incidencia: ${form.title.trim() || "sin título"}`,
        usuarioId: usuarioActualId,
        cuerpo: {
          clientRequestId: clave,
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
        }
      });

      if (r.estado === "enviado" || r.estado === "encolado") {
        if (r.estado === "enviado") setSuccess(true);
        else setEnEspera(TEXTO_DE_ESPERA[r.motivo]);
        setClave(nuevaClave());
        setSeccion(null);
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
        setError(`${r.error} Tus datos siguen aquí.`);
      }
    } finally {
      setSaving(false);
    }
  };

  // Se toman del catálogo único. Antes esta lista incluía `bacheo` y `otro`, que
  // la base de datos no acepta: elegir cualquiera de las dos daba error 500 y el
  // reporte se perdía sin que quien lo levantaba supiera por qué.
  const categoryOptions = OPCIONES_CATEGORIA.map((o) => ({ value: o.value, label: o.label, badge: "" }));

  const municipalityOptions = MUNICIPIOS_JALISCO.map((m) => ({ value: m.name, label: m.name, badge: `${m.count} secc.` }));

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

      {enEspera && (
        <div role="status" className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl flex items-center gap-3">
          <AlertTriangle className="text-amber-600 shrink-0" size={20} />
          <div>
            <p className="font-bold">El reporte está a salvo en este teléfono</p>
            <p className="text-sm">{enEspera}</p>
          </div>
        </div>
      )}
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
              defaultMunicipality={form.municipality || municipioUsuario || undefined}
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
                <SeccionBuscable
                  municipio={form.municipality || municipioUsuario || null}
                  valor={seccion}
                  onCambiar={(s) => {
                    setSeccion(s);
                    setForm({ ...form, sectionId: s?.id ?? "" });
                  }}
                  ayuda="Si la dejas vacía, se toma la del punto en el mapa."
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
                  label="¿Quién la atiende?"
                  allowCustom={false}
                  placeholder="Busca por nombre…"
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

    </div>
  );
}
