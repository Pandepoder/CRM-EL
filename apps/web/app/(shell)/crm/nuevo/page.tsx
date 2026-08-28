import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq } from "drizzle-orm";
import { createContactAction } from "../actions";
import Link from "next/link";
import { ArrowLeft, Save, User, MapPin, Briefcase, ChevronDown } from "lucide-react";
import { ColonySelector } from "@/components/ColonySelector";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session-server";

export default async function NuevoContactoPage() {
const session = await getServerSession();
  if (!session.isLoggedIn) redirect("/login");

  const db = getDatabaseClient();
  
  // Fetch users for "Amigo De" dropdown
  const users = await db.select({
    id: schema.userProfiles.id,
    displayName: schema.userProfiles.displayName,
    roleId: schema.userProfiles.roleId
  }).from(schema.userProfiles).where(eq(schema.userProfiles.status, "active"));

  // Fetch electoral sections
  const sections = await db.select({
    id: schema.electoralSections.id,
    sectionNum: schema.electoralSections.sectionNum
  }).from(schema.electoralSections).orderBy(schema.electoralSections.sectionNum);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/crm/contacts" className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Alta de Ciudadano</h1>
            <p className="text-sm text-gray-500">Registra un nuevo contacto en el padrón</p>
          </div>
        </div>
      </div>

      <form action={createContactAction} className="space-y-8">
        {/* SECCIÓN: Datos Personales */}
        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
            <User className="text-blue-500" size={20} />
            <h2 className="text-lg font-bold text-gray-800">Datos Personales</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Nombres *</label>
              <input type="text" name="firstName" required className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Apellido Paterno *</label>
              <input type="text" name="lastName" required className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Apellido Materno</label>
              <input type="text" name="maternalLastName" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Fecha de Nacimiento</label>
              <input type="date" name="birthDate" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Amigo De (Organizador) *</label>
              <select name="referredByUserId" required className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all">
                <option value="">Selecciona al organizador...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.displayName}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* SECCIÓN: Contacto y Ubicación */}
        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
            <MapPin className="text-emerald-500" size={20} />
            <h2 className="text-lg font-bold text-gray-800">Contacto y Ubicación</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Celular *</label>
              <input type="tel" name="phone" required placeholder="10 dígitos" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Correo Electrónico</label>
              <input type="email" name="email" placeholder="ejemplo@correo.com" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
            <div className="col-span-1 md:col-span-1">
              <ColonySelector />
            </div>
            <div className="col-span-1 md:col-span-1">
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Sección Electoral</label>
              <div className="relative">
                <select name="sectionId" defaultValue="" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg appearance-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-800 cursor-pointer">
                  <option value="">No especificada</option>
                  {sections.map(s => (
                    <option key={s.id} value={s.id}>{s.sectionNum}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
              </div>
            </div>
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Calle</label>
                <input type="text" name="address" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Número Exterior / Interior</label>
                <input type="text" name="addressNumber" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" />
              </div>
            </div>
          </div>
        </section>

        {/* SECCIÓN: Perfil Operativo */}
        <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
            <Briefcase className="text-purple-500" size={20} />
            <h2 className="text-lg font-bold text-gray-800">Perfil y Operación</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Profesión *</label>
              <div className="relative">
                <select name="profession" required defaultValue="" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg appearance-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-gray-800 font-medium cursor-pointer">
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
            
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Empresa o Trabajo</label>
              <input type="text" name="companyOrWork" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all" />
            </div>

            <div className="relative">
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Características o Relaciones *</label>
              <div className="relative">
                <select name="skill" required defaultValue="" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg appearance-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-gray-800 font-medium cursor-pointer">
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
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Disponibilidad de Apoyo *</label>
              <div className="relative">
                <select name="availability" required defaultValue="" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg appearance-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-gray-800 font-medium cursor-pointer">
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

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">¿Qué le gusta?</label>
              <select name="interests" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-gray-800 font-medium">
                <option value="">Seleccionar interés...</option>
                <option value="Cultura">Cultura</option>
                <option value="Deporte">Deporte</option>
                <option value="Educación">Educación</option>
                <option value="Seguridad">Seguridad</option>
                <option value="Medio ambiente">Medio ambiente</option>
                <option value="Juventud">Juventud</option>
                <option value="Emprendimiento">Emprendimiento</option>
              </select>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Años de Conocernos</label>
                <input type="number" min="0" name="yearsKnown" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all" />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">¿En qué nos ha apoyado?</label>
              <textarea name="pastSupport" rows={2} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"></textarea>
            </div>
          </div>
        </section>

        {/* SUBMIT BUTTON */}
        <div className="flex justify-end pt-4">
          <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-sm">
            <Save size={20} /> Guardar Ciudadano
          </button>
        </div>
      </form>
    </div>
  );
}


