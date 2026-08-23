import { Package, Construction } from "lucide-react";

export default function LogisticaPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center" style={{ minHeight: "60vh" }}>
      <div className="w-24 h-24 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mb-6 shadow-sm border border-orange-100">
        <Package size={48} strokeWidth={1.5} />
      </div>
      <h1 className="text-3xl font-extrabold text-blue-950 mb-2 tracking-tight">Logística e Inventarios</h1>
      <p className="text-gray-500 max-w-md mx-auto mb-8 text-lg">
        Gestión de almacén para materiales de campaña: playeras, gorras, lonas, folletos y su distribución a brigadas.
      </p>
      
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-start gap-4 max-w-lg text-left">
        <div className="bg-yellow-50 p-3 rounded-xl text-yellow-600">
          <Construction size={24} />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 mb-1">Módulo Planeado</h3>
          <p className="text-sm text-gray-600">
            Pronto podrás registrar entradas y salidas de almacén escaneando códigos QR y asociando la entrega a los líderes de equipo.
          </p>
        </div>
      </div>
    </div>
  );
}


