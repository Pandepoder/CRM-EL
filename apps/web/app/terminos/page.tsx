import Link from "next/link";
import { ArrowLeft, Scale } from "lucide-react";

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-8 sm:p-10">
          <div className="flex items-center gap-3 mb-8">
            <Scale className="h-10 w-10 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Términos y Condiciones de Uso</h1>
          </div>
          
          <div className="prose prose-blue max-w-none text-gray-600 space-y-6">
            <p><strong>Última actualización: Agosto 2026</strong></p>
            
            <section>
              <h2 className="text-xl font-semibold text-gray-900">1. Aceptación de los Términos</h2>
              <p>
                Al acceder y utilizar la plataforma Tonalá OS (en adelante, "el Sistema"), usted acepta estar sujeto a estos 
                Términos y Condiciones. Si no está de acuerdo con alguna parte de los mismos, debe abstenerse de utilizar el sistema.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">2. Uso Autorizado</h2>
              <p>
                El acceso al sistema está restringido exclusivamente al personal, voluntarios y administradores autorizados. 
                Usted se compromete a:
              </p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li>Mantener la confidencialidad absoluta de sus credenciales de acceso.</li>
                <li>No utilizar la plataforma para fines ajenos a los objetivos operativos oficiales.</li>
                <li>Registrar información verífica y precisa durante sus labores en campo.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">3. Privacidad y Protección de Datos</h2>
              <p>
                El manejo de datos ciudadanos está estrictamente regulado. Al utilizar este sistema, usted se convierte en 
                corresponsable del correcto tratamiento de la información, aceptando acatar todas las directrices estipuladas en nuestra 
                <Link href="/privacidad" className="text-blue-600 hover:underline"> Política de Privacidad</Link>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">4. Auditoría y Trazabilidad</h2>
              <p>
                El Sistema registra de manera inmutable (mediante <em>Audit Logs</em>) todas las acciones importantes realizadas 
                (accesos, modificaciones de registros, exportaciones). La organización se reserva el derecho de auditar 
                estas bitácoras para garantizar el cumplimiento de estos términos y aplicar sanciones en caso de mal uso.
              </p>
            </section>
          </div>

          <div className="mt-10 pt-6 border-t border-gray-100 flex justify-center">
            <Link href="/login" className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Volver al Acceso
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
