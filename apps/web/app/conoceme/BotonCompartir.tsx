"use client";

import { useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";

/**
 * Compartir la página por WhatsApp, que es por donde se mueve de verdad el material de campaña.
 *
 * La dirección se toma del propio navegador en vez de escribirla en el código: así funciona
 * igual en pruebas, en el dominio de campaña o si algún día cambia, sin que nadie recuerde
 * actualizarla. El segundo botón copia el enlace, por si prefieren pegarlo en otra parte.
 */
export default function BotonCompartir({ mensaje }: { mensaje: string }) {
  const [copiado, setCopiado] = useState(false);

  const compartir = () => {
    const url = window.location.href;
    window.open(`https://wa.me/?text=${encodeURIComponent(`${mensaje} ${url}`)}`, "_blank", "noopener,noreferrer");
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch {
      // Sin permiso de portapapeles no se hace nada: el botón de WhatsApp sigue sirviendo.
    }
  };

  return (
    <div className="cierre-acciones">
      <button type="button" onClick={compartir} className="cierre-whatsapp">
        <Share2 size={18} /> Compartir por WhatsApp
      </button>
      <button type="button" onClick={copiar} className="cierre-copiar">
        {copiado ? <Check size={17} /> : <Link2 size={17} />}
        {copiado ? "Enlace copiado" : "Copiar enlace"}
      </button>
    </div>
  );
}
