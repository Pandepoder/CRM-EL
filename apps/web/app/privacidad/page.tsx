import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-8 sm:p-10">
          <div className="flex items-center gap-3 mb-8">
            <ShieldCheck className="h-10 w-10 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Política de Privacidad</h1>
          </div>
          
          <div className="prose prose-blue max-w-none text-gray-600 space-y-6">
            <p><strong>Última actualización: Agosto 2026</strong></p>
            
            <section>
              <h2 className="text-xl font-semibold text-gray-900">1. Aviso de Privacidad y Manejo de Datos Sensibles</h2>
              <p>
                En cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) 
                y legislaciones aplicables, Tonalá OS se compromete a proteger la información de identificación personal (PII) 
                de los ciudadanos, operadores y voluntarios registrados en nuestro sistema.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">2. Seguridad Criptográfica Aplicada</h2>
              <p>
                Para garantizar la integridad y confidencialidad absoluta de los datos ciudadanos, Tonalá OS implementa 
                <strong> Cifrado de Grado Militar (AES-256-GCM) </strong> a nivel de aplicación (Data-at-Rest).
              </p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li>Los números de teléfono, correos electrónicos y domicilios están encriptados criptográficamente en nuestra base de datos.</li>
                <li>Las contraseñas de los operadores se almacenan mediante <em>hashing</em> avanzado (Argon2id), siendo matemáticamente irrecuperables.</li>
                <li>Toda transferencia de datos se realiza a través de canales cifrados.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">3. Uso de la Información</h2>
              <p>
                Los datos recolectados se utilizan exclusivamente para propósitos de coordinación logística, territorial y 
                operativa. Bajo ninguna circunstancia esta información será vendida o compartida con terceros externos no autorizados.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900">4. Responsabilidad de los Operadores (Capturistas)</h2>
              <p>
                Todo usuario con acceso al sistema actúa como un <strong>encargado</strong> de tratamiento de datos. 
                Está estrictamente prohibida la extracción, captura de pantalla no autorizada, o difusión de información ciudadana. 
                Cualquier abuso será registrado por nuestros sistemas de auditoría inmutables (Outbox Pattern).
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
