import { completeOnboardingAction } from "./actions";
import { User, MapPin, Briefcase, ChevronRight, Award, Shield, HeartHandshake, Sparkles } from "lucide-react";
import { getServerSession } from "@/lib/session-server";
import { redirect } from "next/navigation";
import { ColonySelector } from "@/components/ColonySelector";
import { PredictiveCombobox } from "@/components/PredictiveCombobox";

export default async function OnboardingPage() {
  const session = await getServerSession();
  if (!session.isLoggedIn) redirect("/login");

  const professionOptions = [
    { value: "Derecho electoral", label: "Derecho electoral", badge: "Legal" },
    { value: "Derecho laboral", label: "Derecho laboral", badge: "Legal" },
    { value: "Derecho penal", label: "Derecho penal", badge: "Legal" },
    { value: "Marketing", label: "Marketing", badge: "Comunicación" },
    { value: "Fotografía y Video", label: "Fotografía y Video", badge: "Medios" },
    { value: "Música y Animación", label: "Música y Animación", badge: "Cultura" },
    { value: "Organización de eventos", label: "Organización de eventos", badge: "Logística" },
    { value: "Carpintería y Oficios", label: "Carpintería y Oficios", badge: "Técnico" },
    { value: "Albañilería y Construcción", label: "Albañilería y Construcción", badge: "Técnico" },
    { value: "Electricidad y Servicios", label: "Electricidad y Servicios", badge: "Técnico" },
    { value: "Psicología y Trabajo Social", label: "Psicología y Trabajo Social", badge: "Social" },
    { value: "Medicina y Salud", label: "Medicina y Salud", badge: "Salud" },
    { value: "Comercio / Negocio Propio", label: "Comercio / Negocio Propio", badge: "Comercio" },
    { value: "Redes sociales e Influencer", label: "Redes sociales e Influencer", badge: "Digital" },
    { value: "Inteligencia artificial / Sistemas", label: "Inteligencia artificial / Sistemas", badge: "Tecnología" },
    { value: "Finanzas y Contabilidad", label: "Finanzas y Contabilidad", badge: "Administración" },
    { value: "Gestión social y Gestor", label: "Gestión social y Gestor", badge: "Comunidad" },
    { value: "Liderazgo vecinal", label: "Liderazgo vecinal", badge: "Territorial" },
    { value: "Docente / Maestro", label: "Docente / Maestro", badge: "Educación" },
    { value: "Estudiante", label: "Estudiante", badge: "Juventud" },
    { value: "Otro", label: "Otro" }
  ];

  const skillOptions = [
    { value: "Es líder religioso", label: "Es líder religioso", badge: "Comunidad" },
    { value: "Tiene sindicato", label: "Tiene sindicato", badge: "Gremial" },
    { value: "Pertenece a una asociación", label: "Pertenece a una asociación", badge: "Social" },
    { value: "Es empresario", label: "Es empresario", badge: "Económico" },
    { value: "Es maestro", label: "Es maestro", badge: "Educación" },
    { value: "Tiene comercio", label: "Tiene comercio", badge: "Local" },
    { value: "Es presidente de colonia", label: "Es presidente de colonia", badge: "Territorial" },
    { value: "Es deportista", label: "Es deportista", badge: "Deporte" },
    { value: "Es influencer", label: "Es influencer", badge: "Digital" },
    { value: "Participa en organización civil", label: "Participa en organización civil", badge: "Civil" },
    { value: "Líder seccional", label: "Líder seccional", badge: "Electoral" },
    { value: "Ninguna de las anteriores", label: "Ninguna de las anteriores" }
  ];

  const availabilityOptions = [
    { value: "Solo simpatiza", label: "Solo simpatiza", sublabel: "Simpatizante general" },
    { value: "Apoya ocasionalmente", label: "Apoya ocasionalmente", sublabel: "Eventos y volanteo" },
    { value: "Voluntario activo", label: "Voluntario activo", badge: "Frecuente", sublabel: "Disponibilidad semanal" },
    { value: "Puede coordinar personas", label: "Puede coordinar personas", badge: "Liderazgo", sublabel: "Capacidad de convocatoria" },
    { value: "Puede aportar conocimiento", label: "Puede aportar conocimiento técnico", sublabel: "Asesoría o soporte" },
    { value: "Puede donar en especie", label: "Puede donar en especie", sublabel: "Mobiliario, lonas, insumos" },
    { value: "Puede donar en efectivo", label: "Puede donar en efectivo", sublabel: "Aportaciones financieras" },
    { value: "Puede prestar su casa", label: "Puede prestar su casa para reuniones", badge: "Punto Clave", sublabel: "Casa amiga / Centro" },
    { value: "Puede prestar su vehículo", label: "Puede prestar su vehículo", sublabel: "Transporte y movilización" },
    { value: "Puede movilizar el día D", label: "Puede movilizar el día D", badge: "Día D", sublabel: "Operativo electoral" }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 md:p-8 font-sans">
      <div className="w-full max-w-4xl mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-900 rounded-lg"></div>
          <span className="font-bold text-xl tracking-tight text-blue-950">Tonalá OS</span>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-blue-950 to-blue-900 p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl"></div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2 relative z-10 flex items-center gap-2">
            Completa tu Registro
            <span className="text-xs bg-blue-500/30 text-blue-200 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles size={12} /> Autopredicción Activa
            </span>
          </h1>
          <p className="text-blue-200 text-lg relative z-10">Diseña tu perfil operativo con autocompletado inteligente para asignación de territorio.</p>
        </div>

        <form action={completeOnboardingAction} className="p-8 space-y-10">
          {/* SECCIÓN: Datos Personales */}
          <section>
            <div className="flex items-center gap-3 mb-5 border-b border-gray-100 pb-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <User size={20} />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Identidad del Operador</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nombres *</label>
                <input type="text" name="firstName" required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-800 font-medium" placeholder="Ej. Juan Carlos" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Apellido Paterno *</label>
                <input type="text" name="lastName" required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-800 font-medium" placeholder="Ej. Gómez" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Apellido Materno</label>
                <input type="text" name="maternalLastName" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-800 font-medium" placeholder="Ej. López" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Fecha de Nacimiento</label>
                <input type="date" name="birthDate" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-800 font-medium" />
              </div>
            </div>
          </section>

          {/* SECCIÓN: Contacto y Ubicación */}
          <section>
            <div className="flex items-center gap-3 mb-5 border-b border-gray-100 pb-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <MapPin size={20} />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Ubicación y Territorio</h2>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Teléfono Celular *</label>
                  <input type="tel" name="phone" required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-800 font-medium" placeholder="10 dígitos" />
                </div>
              </div>

              <ColonySelector />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Calle</label>
                  <input type="text" name="address" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-800 font-medium" placeholder="Calle o Avenida" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Número Exterior/Interior</label>
                  <input type="text" name="addressNumber" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-800 font-medium" placeholder="# Ext / Int" />
                </div>
              </div>
            </div>
          </section>

          {/* SECCIÓN: Perfil y Capacidades */}
          <section>
            <div className="flex items-center gap-3 mb-5 border-b border-gray-100 pb-3">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <Briefcase size={20} />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Perfil y Capacidades</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <PredictiveCombobox
                  name="profession"
                  label="Profesión / Oficio"
                  required
                  allowCustom={true}
                  placeholder="Escribe o selecciona profesión..."
                  options={professionOptions}
                  icon={<Award size={13} className="text-purple-600" />}
                  customOtherLabel="¿A qué te dedicas exactamente? (Especificación manual)"
                  customOtherPlaceholder="Ej. Fabricante de calzado, Tapicero, Conductor..."
                />
              </div>

              <div>
                <PredictiveCombobox
                  name="skill"
                  label="Características o Relaciones"
                  required
                  allowCustom={true}
                  placeholder="Escribe o selecciona perfil táctico..."
                  options={skillOptions}
                  icon={<Shield size={13} className="text-purple-600" />}
                  customOtherLabel="¿Qué otra característica o relación tienes? (Manual)"
                  customOtherPlaceholder="Ej. Líder comunitario, comerciante independiente..."
                />
              </div>

              <div>
                <PredictiveCombobox
                  name="availability"
                  label="Disponibilidad de Apoyo"
                  required
                  allowCustom={true}
                  placeholder="Escribe o selecciona compromiso..."
                  options={availabilityOptions}
                  icon={<HeartHandshake size={13} className="text-purple-600" />}
                  customOtherLabel="¿De qué otra forma puedes apoyar? (Manual)"
                  customOtherPlaceholder="Ej. Apoyo con vehículos, perifoneo, logística..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Trabajo o Empresa Actual</label>
                <input type="text" name="companyOrWork" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-gray-800 font-medium" placeholder="¿Dónde trabajas actualmente?" />
              </div>
            </div>
          </section>

          <div className="pt-6 border-t border-gray-100 flex justify-end">
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2">
              <span>Finalizar y Guardar</span>
              <ChevronRight size={20} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
