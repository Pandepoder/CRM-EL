import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session-server";
import { getHomePathForRole } from "@tonala/ui";
import Link from "next/link";
import { ArrowRight, Map, Users, ShieldCheck } from "lucide-react";

export default async function HomePage() {
  const session = await getServerSession();
  
  // Si ya tiene sesión, mandarlo a su panel operativo
  if (session.isLoggedIn) {
    redirect(getHomePathForRole(session.roleKey));
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Navbar Pública */}
      <header className="w-full bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-900 rounded-lg"></div>
          <span className="font-bold text-xl tracking-tight text-blue-950">Tonalá OS</span>
        </div>
        <nav>
          <Link href="/login" className="text-gray-600 font-medium hover:text-blue-600 transition-colors px-4">
            Iniciar Sesión
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 bg-gradient-to-b from-white to-gray-50">
        <h1 className="text-5xl md:text-6xl font-extrabold text-blue-950 tracking-tight max-w-4xl mb-6 leading-tight">
          El Centro de Operaciones para el Territorio
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mb-12">
          La plataforma definitiva para gestionar brigadas, padrón ciudadano, reportes en tiempo real y análisis demográfico. Todo en un solo lugar.
        </p>

        {/* Cajas de acción principal */}
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 max-w-md w-full mb-16">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Únete al Equipo Operativo</h2>
          <p className="text-gray-500 text-sm mb-6">Crea tu cuenta para comenzar a registrar ciudadanos y gestionar tu zona.</p>
          
          <Link 
            href="/register" 
            className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-md text-lg"
          >
            Registrarme Ahora <ArrowRight size={20} />
          </Link>
          
          <div className="mt-6 text-sm text-gray-500">
            ¿Ya eres parte de la estructura? <Link href="/login" className="text-blue-600 font-semibold hover:underline">Entra aquí</Link>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full text-left">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
              <Map size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Mapa Interactivo</h3>
            <p className="text-gray-500 text-sm">Visualiza reportes, incidencias y eventos en tiempo real sobre el territorio de Tonalá.</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
              <Users size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Padrón y CRM</h3>
            <p className="text-gray-500 text-sm">Registra ciudadanos, clasifica sus habilidades y asigna líderes operativos de forma inteligente.</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Control Estricto</h3>
            <p className="text-gray-500 text-sm">Administración avanzada de roles y permisos para proteger la información estratégica.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 text-center text-gray-400 text-sm">
        <p>© 2026 Tonalá OS. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
