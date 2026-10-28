"use client";

import { CLAVES_RESULTADO, RESULTADOS_ACTIVIDAD } from "@/lib/actividades";
import { agregarFrase, ASPECTO_RESULTADO as ASPECTO, FRASES_RAPIDAS } from "@/lib/resultados-rapidos";

// El aspecto, las frases y `agregarFrase` viven en `lib/resultados-rapidos.ts`, donde se prueban; se
// reexportan aquí para quien ya los importaba del componente.
export { agregarFrase, FRASES_RAPIDAS };

/**
 * Elegir cómo salió una visita o actividad (C2): cinco botones grandes con un emoji en vez de una lista
 * desplegable, que en el teléfono costaba dos toques y se leía mal al sol. Lo usan la ficha de la
 * actividad (Agenda) y la ficha del ciudadano, para que el resultado se registre igual en los dos lados.
 */
export function ElegirResultado({
  valor,
  onElegir,
  etiqueta = "¿Cómo te fue?"
}: Readonly<{ valor: string; onElegir: (clave: string) => void; etiqueta?: string }>) {
  return (
    <fieldset>
      <legend className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">{etiqueta}</legend>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Resultado">
        {CLAVES_RESULTADO.map((k) => {
          const elegido = valor === k;
          return (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={elegido}
              onClick={() => onElegir(k)}
              className={`min-h-[52px] px-3 py-2 rounded-2xl border-2 text-left text-sm font-extrabold inline-flex items-center gap-2 cursor-pointer transition-colors ${
                elegido ? ASPECTO[k]?.elegido ?? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
              } ${k === "rejected" ? "col-span-2 sm:col-span-1" : ""}`}
            >
              <span className="text-lg leading-none" aria-hidden="true">{ASPECTO[k]?.emoji}</span>
              <span className="leading-tight">{RESULTADOS_ACTIVIDAD[k]!.label}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs font-semibold text-gray-600">{RESULTADOS_ACTIVIDAD[valor]?.ayuda}</p>
    </fieldset>
  );
}

export function FrasesRapidas({ resultado, onFrase }: Readonly<{ resultado: string; onFrase: (frase: string) => void }>) {
  const frases = FRASES_RAPIDAS[resultado] ?? [];
  if (frases.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Frases rápidas">
      {frases.map((frase) => (
        <button
          key={frase}
          type="button"
          onClick={() => onFrase(frase)}
          className="min-h-[40px] px-3 rounded-full bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
        >
          + {frase}
        </button>
      ))}
    </div>
  );
}
