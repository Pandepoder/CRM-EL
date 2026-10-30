/**
 * Cómo se ve cada resultado de una visita o actividad en los botones de un toque (C2 del plan de experiencia
 * sencilla) y las frases rápidas para empezar la conclusión. Sin React, para poder probarlo: cada resultado
 * que acepta el servidor (`CLAVES_RESULTADO`) tiene su botón y sus frases (`resultados-rapidos.test.ts`).
 */
export const ASPECTO_RESULTADO: Record<string, { emoji: string; elegido: string }> = {
  successful: { emoji: "✅", elegido: "border-emerald-500 bg-emerald-50 text-emerald-900" },
  positive_commitment: { emoji: "🤝", elegido: "border-blue-500 bg-blue-50 text-blue-900" },
  follow_up_required: { emoji: "🔁", elegido: "border-amber-500 bg-amber-50 text-amber-900" },
  no_contact: { emoji: "🚪", elegido: "border-slate-500 bg-slate-100 text-slate-900" },
  rejected: { emoji: "✋", elegido: "border-rose-500 bg-rose-50 text-rose-900" }
};

/**
 * Frases para empezar la conclusión con un toque; se pueden combinar y editar. La conclusión sigue siendo
 * obligatoria donde lo era: esto solo ahorra escribir lo de siempre.
 */
export const FRASES_RAPIDAS: Readonly<Record<string, readonly string[]>> = {
  successful: ["Platicamos con la familia.", "Recibió la información.", "Se sumó a la red."],
  positive_commitment: ["Se comprometió a participar.", "Invitará a sus vecinos.", "Aceptó colaborar en la colonia."],
  follow_up_required: ["Pidió que regresemos otro día.", "Pidió apoyo con una gestión.", "Hay que llevarle información."],
  no_contact: ["No había nadie en casa.", "No encontramos el domicilio.", "No contestó el teléfono."],
  rejected: ["No le interesa por ahora.", "Pidió no volver a visitarle."]
};

/** Agrega una frase al final del texto, con un espacio si ya había algo. */
export function agregarFrase(texto: string, frase: string): string {
  return texto.trim() ? `${texto.trim()} ${frase}` : frase;
}
