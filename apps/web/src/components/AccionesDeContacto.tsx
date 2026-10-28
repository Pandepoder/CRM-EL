import { MessageCircle, Navigation, Phone } from "lucide-react";

import { enlaceComoLlegar, enlaceDeWhatsApp, enlaceParaLlamar } from "@/lib/acciones-de-contacto";

/**
 * Llamar, WhatsApp y Cómo llegar, a un toque. Solo aparecen los que se pueden armar con lo que ya se ve:
 * sin teléfono no hay Llamar; sin punto ni domicilio, no hay Cómo llegar.
 *
 * `grande` (la ficha): botones de 48 px a todo lo ancho. `compacta` (tarjetas del directorio): 44 px.
 */
export function AccionesDeContacto({
  telefono,
  lat,
  lng,
  direccion,
  tamano = "grande",
  className = ""
}: Readonly<{
  telefono?: string | null | undefined;
  lat?: number | null | undefined;
  lng?: number | null | undefined;
  direccion?: string | null | undefined;
  tamano?: "grande" | "compacta";
  className?: string;
}>) {
  const llamar = enlaceParaLlamar(telefono);
  const whatsapp = enlaceDeWhatsApp(telefono);
  const llegar = enlaceComoLlegar({ lat: lat ?? null, lng: lng ?? null, direccion: direccion ?? null });
  if (!llamar && !whatsapp && !llegar) return null;

  const base =
    tamano === "grande"
      ? "flex-1 min-h-[48px] px-2 rounded-2xl text-[13px] sm:text-sm font-extrabold whitespace-nowrap inline-flex items-center justify-center gap-1.5 sm:gap-2 transition-colors"
      : "flex-1 min-h-[44px] px-2 rounded-xl text-[13px] font-extrabold whitespace-nowrap inline-flex items-center justify-center gap-1.5 transition-colors";
  const icono = tamano === "grande" ? 17 : 16;

  return (
    <div className={`flex gap-2 ${className}`}>
      {llamar && (
        <a href={llamar} className={`${base} bg-blue-600 hover:bg-blue-700 text-white`}>
          <Phone size={icono} aria-hidden="true" /> Llamar
        </a>
      )}
      {whatsapp && (
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={`${base} bg-emerald-600 hover:bg-emerald-700 text-white`}>
          <MessageCircle size={icono} aria-hidden="true" /> WhatsApp
        </a>
      )}
      {llegar && (
        <a href={llegar} target="_blank" rel="noopener noreferrer" className={`${base} bg-white hover:bg-slate-50 text-slate-800 border border-slate-200`}>
          <Navigation size={icono} aria-hidden="true" /> Cómo llegar
        </a>
      )}
    </div>
  );
}
