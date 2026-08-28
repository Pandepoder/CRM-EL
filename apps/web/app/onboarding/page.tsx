import { completeOnboardingAction } from "./actions";
import { User, MapPin, Briefcase, ChevronRight, ChevronDown } from "lucide-react";
import { getServerSession } from "@/lib/session-server";
import { redirect } from "next/navigation";
import { ColonySelector } from "@/components/ColonySelector";

export default async function OnboardingPage() {
  const session = await getServerSession();
  if (!session.isLoggedIn) redirect("/login");

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
          <h1 className="text-3xl font-extrabold tracking-tight mb-2 relative z-10">Completa tu Registro</h1>
          <p className="text-blue-200 text-lg relative z-10">Diseña tu perfil operativo para que el administrador asigne tu nivel de acceso y territorio en la plataforma.</p>
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
                <input type="text" name="firstName" required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-800" placeholder="Ej. Juan Carlos" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Apellido Paterno *</label>
                <input type="text" name="lastName" required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-800" placeholder="Ej. Pérez" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Apellido Materno</label>
                <input type="text" name="maternalLastName" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-800" placeholder="Ej. Gómez" />
              </div>
            </div>
          </section>

          {/* SECCIÓN: Contacto y Ubicación */}
          <section>
            <div className="flex items-center gap-3 mb-5 border-b border-gray-100 pb-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <MapPin size={20} />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Contacto y Zona Operativa</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Celular *</label>
                <input type="tel" name="phone" required placeholder="10 dígitos" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-800" />
              </div>
              <div className="w-full">
                <ColonySelector />
              </div>
            </div>
          </section>

          {/* SECCIÓN: Perfil Operativo */}
          <section>
            <div className="flex items-center gap-3 mb-5 border-b border-gray-100 pb-3">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <Briefcase size={20} />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Perfil y Capacidades</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Profesión *</label>
                <div className="relative">
                  <select name="profession" required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl appearance-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-gray-800 font-medium cursor-pointer">
                    <option value="" disabled>Seleccionar profesión...</option>
                    <option value="Derecho electoral">Derecho electoral</option>
                    <option value="Derecho laboral">Derecho laboral</option>
                    <option value="Derecho penal">Derecho penal</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Fotografía">Fotografía</option>
                    <option value="Video">Video</option>
                    <option value="Música">Música</option>
                    <option value="Organización de eventos">Organización de eventos</option>
                    <option value="Carpintería">Carpintería</option>
                    <option value="Albañilería">Albañilería</option>
                    <option value="Electricidad">Electricidad</option>
                    <option value="Psicología">Psicología</option>
                    <option value="Medicina">Medicina</option>
                    <option value="Comercio">Comercio</option>
                    <option value="Redes sociales">Redes sociales</option>
                    <option value="Inteligencia artificial">Inteligencia artificial</option>
                    <option value="Finanzas">Finanzas</option>
                    <option value="Gestión social">Gestión social</option>
                    <option value="Liderazgo vecinal">Liderazgo vecinal</option>
                    <option value="Otro">Otro</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                </div>
              </div>

              <div className="relative">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Características o Relaciones *</label>
                <div className="relative">
                  <select name="skill" required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl appearance-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-gray-800 font-medium cursor-pointer">
                    <option value="" disabled>Seleccionar perfil táctico...</option>
                    <option value="Es líder religioso">Es líder religioso</option>
                    <option value="Tiene sindicato">Tiene sindicato</option>
                    <option value="Pertenece a una asociación">Pertenece a una asociación</option>
                    <option value="Es empresario">Es empresario</option>
                    <option value="Es maestro">Es maestro</option>
                    <option value="Tiene comercio">Tiene comercio</option>
                    <option value="Es presidente de colonia">Es presidente de colonia</option>
                    <option value="Es deportista">Es deportista</option>
                    <option value="Es influencer">Es influencer</option>
                    <option value="Participa en organización civil">Participa en organización civil</option>
                    <option value="Ninguna de las anteriores">Ninguna de las anteriores</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                </div>
              </div>

              <div className="relative">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Disponibilidad de Apoyo *</label>
                <div className="relative">
                  <select name="availability" required className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl appearance-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-gray-800 font-medium cursor-pointer">
                    <option value="" disabled>Seleccionar compromiso...</option>
                    <option value="Solo simpatiza">Solo simpatiza</option>
                    <option value="Apoya ocasionalmente">Apoya ocasionalmente</option>
                    <option value="Voluntario activo">Voluntario activo</option>
                    <option value="Puede coordinar personas">Puede coordinar personas</option>
                    <option value="Puede aportar conocimiento">Puede aportar conocimiento técnico</option>
                    <option value="Puede donar en especie">Puede donar en especie</option>
                    <option value="Puede donar en efectivo">Puede donar en efectivo</option>
                    <option value="Puede prestar su casa">Puede prestar su casa para reuniones</option>
                    <option value="Puede prestar su vehículo">Puede prestar su vehículo</option>
                    <option value="Puede movilizar el día D">Puede movilizar el día D</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                </div>
              </div>

              <div className="relative">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Trabajo o Empresa Actual</label>
                <input type="text" name="companyOrWork" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-gray-800" placeholder="¿Dónde trabajas actualmente?" />
              </div>
            </div>
          </section>

          {/* SUBMIT BUTTON */}
          <div className="flex justify-end pt-8 border-t border-gray-100">
            <button type="submit" className="flex items-center justify-center gap-3 w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-10 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-lg">
              Finalizar y Entrar al Sistema <ChevronRight size={24} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
