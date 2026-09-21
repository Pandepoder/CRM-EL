"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/**
 * QR dibujado en el propio navegador. Antes se pedía a api.qrserver.com: sin
 * internet en la calle, o si ese servicio caía, el QR no aparecía justo cuando
 * se iba a escanear. Además, el enlace de cada persona salía a un tercero.
 */
export function QrImagen({
  valor,
  tamano,
  alt,
  color = "#0b1f3a",
  className,
  style
}: {
  valor: string;
  tamano: number;
  alt: string;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    QRCode.toDataURL(valor, { width: tamano * 2, margin: 1, color: { dark: color, light: "#ffffff" } })
      .then((url) => vigente && setSrc(url))
      .catch(() => vigente && setSrc(null));
    return () => {
      vigente = false;
    };
  }, [valor, tamano, color]);

  if (!src) return <div className={className} style={{ width: tamano, height: tamano, ...style }} aria-hidden />;
  return <img src={src} alt={alt} width={tamano} height={tamano} className={className} style={style} />;
}
