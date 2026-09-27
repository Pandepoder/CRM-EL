import { buscarMunicipio } from "@/lib/municipios-jalisco";

/**
 * El domicilio de quien se registra como parte de la estructura (0025): calle y número, colonia y el
 * municipio donde vive. Se pide completo en el QR de brigada y en el auto-registro (decisión del dueño,
 * 2026-09-26), y se corrige desde «Mi perfil». Una sola validación para las tres rutas.
 *
 * El municipio donde vive no es el de la cuenta (`municipality`): ese es donde trabaja y decide qué ve.
 */

export type DomicilioDePersona = { homeAddress: string; homeColony: string; homeMunicipality: string };

export type ProblemaDeDomicilio = { ok: false; campo: "homeAddress" | "homeColony" | "homeMunicipality"; error: string };

export function validarDomicilioDePersona(e: {
  homeAddress?: unknown;
  homeColony?: unknown;
  homeMunicipality?: unknown;
}): { ok: true; domicilio: DomicilioDePersona } | ProblemaDeDomicilio {
  const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const calle = texto(e.homeAddress);
  const colonia = texto(e.homeColony);
  const municipio = buscarMunicipio(texto(e.homeMunicipality))?.name ?? null;
  if (!calle) return { ok: false, campo: "homeAddress", error: "Escribe tu calle y número." };
  if (calle.length > 300) return { ok: false, campo: "homeAddress", error: "La calle puede tener hasta 300 caracteres." };
  if (!colonia) return { ok: false, campo: "homeColony", error: "Escribe tu colonia." };
  if (colonia.length > 150) return { ok: false, campo: "homeColony", error: "La colonia puede tener hasta 150 caracteres." };
  if (!municipio) return { ok: false, campo: "homeMunicipality", error: "Elige el municipio donde vives." };
  return { ok: true, domicilio: { homeAddress: calle, homeColony: colonia, homeMunicipality: municipio } };
}
