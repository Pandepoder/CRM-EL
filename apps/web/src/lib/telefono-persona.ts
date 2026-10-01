/**
 * El teléfono de quien se suma a la estructura: opcional (decisión del dueño, 2026-09-30), pero si se
 * escribe tiene que poder marcarse. Una sola regla para el QR de brigada y el alta por administración.
 */
export function validarTelefonoOpcional(valor: unknown): { ok: true; telefono: string | null } | { ok: false; error: string } {
  const texto = typeof valor === "string" ? valor.trim() : "";
  if (!texto) return { ok: true, telefono: null };
  const digitos = texto.replace(/\D/g, "");
  if (texto.length > 20 || digitos.length < 7 || digitos.length > 15) {
    return { ok: false, error: "Revisa el teléfono: escribe de 7 a 15 dígitos, o déjalo vacío." };
  }
  return { ok: true, telefono: texto };
}
