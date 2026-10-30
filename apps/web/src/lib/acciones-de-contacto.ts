/**
 * Enlaces de un toque hacia un ciudadano: llamar, escribir por WhatsApp y cómo llegar (plan de experiencia
 * sencilla, C1). Antes el teléfono y la ubicación eran solo texto: para llamar había que copiar el número,
 * y para llegar, abrir Maps y pegar la dirección.
 *
 * Solo arma enlaces con lo que la pantalla ya enseña: no consulta nada ni amplía lo que se ve.
 */

/** Solo dígitos, con el 52 de México delante si el número es nacional (10 dígitos). Null si no es un teléfono. */
export function telefonoInternacional(telefono: string | null | undefined): string | null {
  const texto = (telefono ?? "").trim();
  // Un teléfono lleva dígitos y, a lo más, +, espacios, guiones, puntos o paréntesis. Cualquier letra es
  // otra cosa (por ejemplo, un valor que no se pudo descifrar).
  if (!texto || texto.length > 20 || /[^\d+\s().-]/.test(texto)) return null;
  const digitos = texto.replace(/\D/g, "");
  if (digitos.length === 10) return `52${digitos}`;
  // El formato viejo de celular, 52 1 + 10 dígitos.
  if (digitos.length === 13 && digitos.startsWith("521")) return `52${digitos.slice(3)}`;
  if (digitos.length >= 11 && digitos.length <= 15) return digitos;
  return null;
}

export function enlaceParaLlamar(telefono: string | null | undefined): string | null {
  const internacional = telefonoInternacional(telefono);
  if (internacional) return `tel:+${internacional}`;
  const digitos = (telefono ?? "").replace(/\D/g, "");
  // Un número local corto (7-9 dígitos) todavía se puede marcar tal cual.
  return digitos.length >= 7 && digitos.length <= 9 && !/[^\d+\s().-]/.test(telefono ?? "") ? `tel:${digitos}` : null;
}

export function enlaceDeWhatsApp(telefono: string | null | undefined): string | null {
  const internacional = telefonoInternacional(telefono);
  return internacional ? `https://wa.me/${internacional}` : null;
}

/**
 * Ruta en Google Maps hasta el punto exacto o, sin punto, hasta el domicilio escrito. Google Maps abre la
 * app del teléfono si está instalada, y si no, la página.
 */
export function enlaceComoLlegar(destino: { lat?: number | null; lng?: number | null; direccion?: string | null }): string | null {
  const { lat, lng } = destino;
  if (typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)},${lng.toFixed(6)}`;
  }
  const direccion = (destino.direccion ?? "").trim();
  return direccion.length >= 4 ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(direccion)}` : null;
}
