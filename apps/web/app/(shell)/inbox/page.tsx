import { Headset, Construction } from "lucide-react";

export default function InboxPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center" style={{ minHeight: "60vh" }}>
      <div className="w-24 h-24 bg-teal-50 text-teal-500 rounded-full flex items-center justify-center mb-6 shadow-sm border border-teal-100">
        <Headset size={48} strokeWidth={1.5} />
      </div>
      <h1 className="text-3xl font-extrabold text-blue-950 mb-2 tracking-tight">Call Center & Inbox</h1>
      <p className="text-gray-500 max-w-md mx-auto mb-8 text-lg">
        Bandeja unificada para responder mensajes de WhatsApp, redes sociales y registrar llamadas ciudadanas.
      </p>
      
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-start gap-4 max-w-lg text-left">
        <div className="bg-yellow-50 p-3 rounded-xl text-yellow-600">
          <Construction size={24} />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 mb-1">Módulo en Desarrollo</h3>
          <p className="text-sm text-gray-600">
            Se requiere la configuración final de la API de Meta y Twilio para habilitar la mensajería bidireccional en esta vista.
          </p>
        </div>
      </div>
    </div>
  );
}
