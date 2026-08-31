"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, Save, User, MapPin, Briefcase, Sparkles, HeartHandshake, Calendar, MessageSquare, ChevronDown, ChevronUp 
} from "lucide-react";
import { ColonySelector } from "@/components/ColonySelector";
import { PredictiveCombobox } from "@/components/PredictiveCombobox";
import { createContactAction } from "../actions";

export default function NuevoContactoForm({
  userOptions,
  currentUserId
}: {
  userOptions: { value: string; label: string; badge?: string }[];
  currentUserId: string;
}) {
  const [showSurvey, setShowSurvey] = useState(false);
  const [colony, setColony] = useState("");
  const [sectionNum, setSectionNum] = useState("");
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [address, setAddress] = useState("");

  const days = Array.from({ length: 31 }, (_, i) => String(i + 1));
  const months = [
    { num: "1", name: "Enero" },
    { num: "2", name: "Febrero" },
    { num: "3", name: "Marzo" },
    { num: "4", name: "Abril" },
    { num: "5", name: "Mayo" },
    { num: "6", name: "Junio" },
    { num: "7", name: "Julio" },
    { num: "8", name: "Agosto" },
    { num: "9", name: "Septiembre" },
    { num: "10", name: "Octubre" },
    { num: "11", name: "Noviembre" },
    { num: "12", name: "Diciembre" },
  ];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/crm/contacts"
            className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 shadow-sm transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-950 tracking-tight flex items-center gap-2">
              Registro Social
              <span className="text-[11px] bg-blue-100 text-blue-800 font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles size={11} /> Unificado
              </span>
            </h1>
            <p className="text-xs text-gray-500 font-medium">Alta y vinculación social a la red de Tonalá</p>
          </div>
        </div>
      </div>

      <form action={createContactAction} className="space-y-6">
        {/* SECCIÓN A: ORIGEN Y RESPONSABLE */}
        <section className="bg-white p-5 md:p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <HeartHandshake className="text-blue-600" size={18} />
            <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">A. Origen y Responsable</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Origen del Registro</label>
              <select
                name="origin"
                defaultValue="toca_toca"
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="toca_toca">Toca-toca / Recorrido</option>
                <option value="enlace_personal">Enlace personal</option>
                <option value="recomendacion">Recomendación de vecino</option>
                <option value="evento">Evento / Plática vecinal</option>
                <option value="visita">Visita programada</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Fecha de Primer Contacto</label>
              <input
                type="date"
                name="firstContactDate"
                defaultValue={new Date().toISOString().split("T")[0]}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:bg-white"
              />
            </div>

            <div>
              <PredictiveCombobox
                name="actualContactUserId"
                label="Integrante que tuvo el contacto"
                required
                allowCustom={false}
                defaultValue={currentUserId}
                options={userOptions}
                icon={<User size={13} className="text-blue-600" />}
              />
            </div>
          </div>
        </section>

        {/* SECCIÓN B: DATOS DE CONTACTO */}
        <section className="bg-white p-5 md:p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <User className="text-blue-600" size={18} />
            <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">B. Datos de Contacto</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Nombre(s) *</label>
              <input
                type="text"
                name="firstName"
                required
                placeholder="Ej. Juan Carlos"
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Primer Apellido *</label>
              <input
                type="text"
                name="lastName"
                required
                placeholder="Ej. Hernández"
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Segundo Apellido</label>
              <input
                type="text"
                name="maternalLastName"
                placeholder="Ej. López"
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Teléfono Principal *</label>
              <input
                type="tel"
                name="phone"
                required
                placeholder="10 dígitos"
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Medio Preferido</label>
              <select
                name="preferredContactMethod"
                defaultValue="whatsapp"
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:bg-white"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="llamada">Llamada telefónica</option>
                <option value="visita">Visita domiciliaria</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Horario Preferido</label>
              <select
                name="preferredContactTime"
                defaultValue="indiferente"
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:bg-white"
              >
                <option value="indiferente">Indiferente / Cualquier hora</option>
                <option value="manana">Mañana (9:00 - 13:00)</option>
                <option value="tarde">Tarde (13:00 - 18:00)</option>
                <option value="noche">Noche (18:00 - 21:00)</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Correo Electrónico (Opcional)</label>
              <input
                type="email"
                name="email"
                placeholder="correo@ejemplo.com"
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* CUMPLEAÑOS OBLIGATORIO DÍA Y MES */}
          <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-100 space-y-2">
            <label className="block text-[11px] font-extrabold text-blue-950 uppercase flex items-center gap-1.5">
              <Calendar size={13} className="text-blue-600" />
              <span>Fecha de Cumpleaños * (Día y Mes obligatorios)</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <select
                name="birthDay"
                required
                className="p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none"
              >
                <option value="">Día *</option>
                {days.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <select
                name="birthMonth"
                required
                className="p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none"
              >
                <option value="">Mes *</option>
                {months.map(m => (
                  <option key={m.num} value={m.num}>{m.name}</option>
                ))}
              </select>

              <input
                type="number"
                name="birthYear"
                placeholder="Año (Opcional)"
                className="p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none"
              />
            </div>
          </div>
        </section>

        {/* SECCIÓN C: INFORMACIÓN TERRITORIAL */}
        <section className="bg-white p-5 md:p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <MapPin className="text-blue-600" size={18} />
            <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">C. Información Territorial y Domicilio</h2>
          </div>

          <div className="space-y-4">
            {/* AUTOPREDICTOR DE COLONIA, SECCIÓN Y MUNICIPIO */}
            <ColonySelector
              defaultMunicipality="Tonalá"
              defaultValue={colony}
              defaultSectionNum={sectionNum}
              onSelect={(_secId, col, _mun, secNum, coords, detectedAddress) => {
                if (col) setColony(col);
                if (secNum) setSectionNum(String(secNum));
                if (coords) {
                  setLat(coords.lat);
                  setLng(coords.lng);
                }
                if (detectedAddress && !address) {
                  setAddress(detectedAddress);
                }
              }}
              onChange={(c, s) => {
                setColony(c);
                if (s) setSectionNum(String(s));
              }}
            />

            {/* CALLE Y NÚMERO DOMICILIAR */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Calle y Número Domiciliar
              </label>
              <input
                type="text"
                name="address"
                placeholder="Ej. Calle Juárez #145 interior B (entre López Cotilla y Reforma)"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
            </div>

            {/* COORDENADAS EXACTAS OCULTAS */}
            <input type="hidden" name="exactLatitude" value={lat || ""} />
            <input type="hidden" name="exactLongitude" value={lng || ""} />
          </div>
        </section>

        {/* SECCIÓN D: PARTICIPACIÓN & OCUPACIÓN */}
        <section className="bg-white p-5 md:p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <Briefcase className="text-blue-600" size={18} />
            <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">D. Participación y Ocupación</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Ocupación / Actividad</label>
              <input
                type="text"
                name="profession"
                placeholder="Ej. Artesano, Maestro, Comerciante..."
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Área de Interés / Participación</label>
              <select
                name="participatingArea"
                defaultValue="General"
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:bg-white"
              >
                <option value="General">Participación General</option>
                <option value="Vecinal">Comité Vecinal y Mejoras</option>
                <option value="Deporte">Deportes y Juventud</option>
                <option value="Cultura">Cultura y Tradiciones</option>
                <option value="Comercio">Comercio y Emprendimiento</option>
                <option value="Social">Apoyo Social y Familias</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Disponibilidad</label>
              <select
                name="availability"
                defaultValue="Simpatizante"
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:bg-white"
              >
                <option value="Simpatizante">Simpatizante / Informado</option>
                <option value="Voluntario">Voluntario activo</option>
                <option value="Liderazgo">Liderazgo vecinal / Coordinador</option>
                <option value="Espacio">Ofrece espacio para pláticas / barda</option>
              </select>
            </div>

            <div className="sm:col-span-2 md:col-span-3">
              <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">URL Foto de Barda / Espacio Ofrecido (Opcional)</label>
              <input
                type="text"
                name="bardaPhotoUrl"
                placeholder="https://... (enlace o fotografía)"
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:bg-white"
              />
            </div>
          </div>
        </section>

        {/* SECCIÓN E: MILITANCIA PAN */}
        <section className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 md:p-6 rounded-3xl shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-white/15 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">Ⓜ️</span>
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-white">E. Militancia PAN</h2>
                <p className="text-[11px] text-blue-200 font-medium">Control de estatus partidista en Tonalá</p>
              </div>
            </div>
            <span className="text-xs font-black bg-blue-500/30 text-blue-200 px-3 py-1 rounded-full border border-blue-400/30">
              Distintivo en Mapa Ⓜ️
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-800">
            <div>
              <label className="block text-[11px] font-extrabold text-blue-200 uppercase mb-1">Estatus de Militancia</label>
              <select
                name="panMilitancy"
                defaultValue="no_registrada"
                className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none"
              >
                <option value="no_registrada">No registrada / Ciudadano simpatizante</option>
                <option value="declarada">Declarada por la persona</option>
                <option value="pendiente">Pendiente de validación</option>
                <option value="confirmada">Ⓜ️ Confirmada en padrón oficial PAN</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-blue-200 uppercase mb-1">Fecha de Verificación</label>
              <input
                type="date"
                name="panMilitancyVerifiedAt"
                className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none"
              />
            </div>
          </div>
        </section>

        {/* SECCIÓN F: CONÓCEME MEJOR & NOTAS FECHADAS */}
        <section className="bg-white p-5 md:p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <MessageSquare className="text-blue-600" size={18} />
            <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">F. Conóceme Mejor y Notas Fechadas</h2>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-xs font-extrabold text-slate-900">
                💬 Nos gustaría conocerte un poquito mejor. ¿Qué disfrutas hacer, qué temas te interesan o qué te gustaría que recordáramos de ti?
              </label>
              <textarea
                name="knowMeBetter"
                rows={2}
                placeholder="Gustos, causas, temas de interés personal..."
                className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-gray-700 uppercase mb-1">Nota Inicial Inmutable</label>
              <textarea
                name="initialNote"
                rows={2}
                placeholder="Escribe la primera nota de conversación con fecha y autor..."
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 outline-none focus:bg-white"
              />
            </div>
          </div>
        </section>

        {/* SECCIÓN G: ENCUESTA CIUDADANA OPCIONAL (6 PREGUNTAS) */}
        <section className="border border-indigo-100 bg-indigo-50/40 rounded-3xl overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => setShowSurvey(!showSurvey)}
            className="w-full p-5 flex items-center justify-between text-left cursor-pointer hover:bg-indigo-50/80 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                📋
              </span>
              <div>
                <h3 className="font-extrabold text-sm text-indigo-950">G. Encuesta Ciudadana Opcional (6 Preguntas)</h3>
                <p className="text-xs text-indigo-700 font-medium">Diagnóstico comunitario y prioridades de colonia</p>
              </div>
            </div>
            {showSurvey ? <ChevronUp size={18} className="text-indigo-600" /> : <ChevronDown size={18} className="text-indigo-600" />}
          </button>

          {showSurvey && (
            <div className="p-6 pt-2 space-y-5 border-t border-indigo-100 bg-white">
              {/* P1 */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-900">1. ¿Qué necesita mejorar primero en tu colonia?</label>
                <select
                  name="survey_colonyPriorityNeed"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none"
                >
                  <option value="">Selecciona una opción</option>
                  <option value="Agua potable o drenaje">Agua potable o drenaje</option>
                  <option value="Calles, baches o banquetas">Calles, baches o banquetas</option>
                  <option value="Seguridad">Seguridad</option>
                  <option value="Alumbrado público">Alumbrado público</option>
                  <option value="Recolección de basura y limpieza">Recolección de basura y limpieza</option>
                  <option value="Transporte y movilidad">Transporte y movilidad</option>
                  <option value="Parques, espacios deportivos o culturales">Parques, espacios deportivos o culturales</option>
                  <option value="Salud y apoyos sociales">Salud y apoyos sociales</option>
                  <option value="Medioambiente o bienestar animal">Medioambiente o bienestar animal</option>
                  <option value="Empleo y apoyo a comerciantes y artesanos">Empleo y apoyo a comerciantes y artesanos</option>
                  <option value="Otra">Otra (especificar)</option>
                </select>
                <input
                  type="text"
                  name="survey_colonyPriorityOther"
                  placeholder="Si seleccionaste Otra, especifica..."
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              {/* P2 */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-900">2. ¿Qué es lo que más valoras de Tonalá?</label>
                <select
                  name="survey_tonalaValues"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none"
                >
                  <option value="">Selecciona una opción</option>
                  <option value="Su gente y sentido de comunidad">Su gente y sentido de comunidad</option>
                  <option value="Las tradiciones y la cultura">Las tradiciones y la cultura</option>
                  <option value="La artesanía">La artesanía</option>
                  <option value="Los mercados, tianguis y comercios">Los mercados, tianguis y comercios</option>
                  <option value="La vida familiar">La vida familiar</option>
                  <option value="Sus barrios y comunidades">Sus barrios y comunidades</option>
                  <option value="Otra">Otra</option>
                </select>
              </div>

              {/* P3 */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-900">3. Calificación de servicios públicos (1 al 5)</label>
                <select
                  name="survey_servicesRating"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none"
                >
                  <option value="">Selecciona calificación</option>
                  <option value="5">5 - Muy bien</option>
                  <option value="4">4 - Bien</option>
                  <option value="3">3 - Regular</option>
                  <option value="2">2 - Mal</option>
                  <option value="1">1 - Muy mal</option>
                </select>
                <input
                  type="text"
                  name="survey_servicesRatingWhy"
                  placeholder="¿Por qué? (breve motivo)..."
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              {/* P4 */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-900">4. ¿Qué esperarías de un nuevo proyecto para Tonalá?</label>
                <select
                  name="survey_projectExpectations"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none"
                >
                  <option value="">Selecciona una opción</option>
                  <option value="Que escuche y permanezca cercano a la gente">Que escuche y permanezca cercano a la gente</option>
                  <option value="Que mejore los servicios públicos">Que mejore los servicios públicos</option>
                  <option value="Que fortalezca la seguridad">Que fortalezca la seguridad</option>
                  <option value="Que apoye a las colonias y comunidades">Que apoye a las colonias y comunidades</option>
                  <option value="Que impulse empleos, comercios y artesanías">Que impulse empleos, comercios y artesanías</option>
                  <option value="Que trabaje con honestidad y dé resultados">Que trabaje con honestidad y dé resultados</option>
                </select>
              </div>

              {/* P5 */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-900">5. ¿Cómo te gustaría participar?</label>
                <select
                  name="survey_participationForm"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none"
                >
                  <option value="">Selecciona una opción</option>
                  <option value="Recibir información">Recibir información</option>
                  <option value="Contestar encuestas">Contestar encuestas</option>
                  <option value="Asistir a reuniones o actividades">Asistir a reuniones o actividades</option>
                  <option value="Participar en acciones sociales">Participar en acciones sociales</option>
                  <option value="Compartir ideas o propuestas">Compartir ideas o propuestas</option>
                  <option value="Por ahora solamente deseo mantenerme informado">Por ahora solamente deseo mantenerme informado</option>
                </select>
              </div>

              {/* P6 */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-900">
                  6. Propuesta o mensaje libre para Tonalá
                </label>
                <textarea
                  name="survey_openProposal"
                  rows={2}
                  placeholder="Propuesta abierta o comentario..."
                  className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:bg-white"
                />
              </div>
            </div>
          )}
        </section>

        {/* SUBMIT BUTTON */}
        <div className="flex justify-end gap-3 pt-2">
          <Link
            href="/crm/contacts"
            className="px-5 py-3 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs shadow-sm transition-colors cursor-pointer"
          >
            Cancelar
          </Link>

          <button
            type="submit"
            className="px-7 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-lg shadow-blue-600/25 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Save size={16} />
            <span>Guardar Registro Social</span>
          </button>
        </div>
      </form>
    </div>
  );
}
