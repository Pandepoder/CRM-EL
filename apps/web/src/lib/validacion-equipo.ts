import { z } from "zod";

import { buscarMunicipio } from "@/lib/municipios-jalisco";

/** Texto opcional: vacío o solo espacios cuenta como «sin dato». */
const textoOpcional = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().trim().max(max).nullish());

/**
 * Datos de un equipo, al crearlo o editarlo. Al editar, todos los campos son opcionales (solo se
 * cambia lo que llega).
 */
const campos = {
  name: z.string().trim().min(1, "El equipo necesita un nombre.").max(120, "El nombre es demasiado largo."),
  leaderId: z.string().uuid("Elige a quién lidera el equipo."),
  zone: textoOpcional(120),
  // Solo un municipio de Jalisco. Antes se guardaba cualquier texto, y un «Tonala» o un
  // «Zapopan Jal.» dejaba al equipo fuera de todo filtro por municipio.
  municipality: textoOpcional(100).refine((m) => m == null || buscarMunicipio(m) != null, {
    message: "Ese municipio no es de Jalisco."
  }),
  section: textoOpcional(20)
};

export const equipoNuevo = z.object(campos);
export const cambiosDeEquipo = z.object(campos).partial();

/** El primer motivo de rechazo, en una frase para quien llenó el formulario. */
export function motivoDeRechazo(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Revisa los datos del equipo.";
}

/** El nombre canónico del municipio, o null. */
export function municipioCanonico(texto: string | null | undefined): string | null {
  return texto ? (buscarMunicipio(texto)?.name ?? null) : null;
}
