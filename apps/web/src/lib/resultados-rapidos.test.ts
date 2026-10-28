import { describe, expect, it } from "vitest";

import { VisitOutcome, visitSummaryMaxLength } from "@tonala/modules/visits/domain";

import { CLAVES_RESULTADO, LARGO_MAXIMO_RESUMEN_VISITA, RESULTADOS_ACTIVIDAD } from "./actividades";
import { agregarFrase, ASPECTO_RESULTADO, FRASES_RAPIDAS } from "./resultados-rapidos";

/**
 * Los botones de un toque para registrar el resultado (C2) tienen que ofrecer exactamente lo que el
 * servidor acepta: un botón de más se rechazaría al guardar, y uno de menos dejaría un resultado sin forma
 * de elegirlo desde el teléfono.
 */
describe("resultados de un toque", () => {
  it("la lista de la bitácora es la misma que acepta el caso de uso de visitas", () => {
    expect([...CLAVES_RESULTADO].sort()).toEqual(Object.values(VisitOutcome).sort());
  });

  it("el cuadro de texto de una visita no deja escribir más de lo que la visita acepta", () => {
    expect(LARGO_MAXIMO_RESUMEN_VISITA).toBe(visitSummaryMaxLength);
  });

  it("cada resultado tiene su botón (emoji y color) y su nombre en español", () => {
    expect(Object.keys(ASPECTO_RESULTADO).sort()).toEqual([...CLAVES_RESULTADO].sort());
    for (const clave of CLAVES_RESULTADO) {
      expect(ASPECTO_RESULTADO[clave]!.emoji.length).toBeGreaterThan(0);
      expect(ASPECTO_RESULTADO[clave]!.elegido).toMatch(/border-/);
      expect(RESULTADOS_ACTIVIDAD[clave]!.label.length).toBeGreaterThan(0);
    }
  });

  it("cada resultado tiene frases rápidas cortas, sin nombres de nadie", () => {
    expect(Object.keys(FRASES_RAPIDAS).sort()).toEqual([...CLAVES_RESULTADO].sort());
    for (const frases of Object.values(FRASES_RAPIDAS)) {
      expect(frases.length).toBeGreaterThanOrEqual(2);
      for (const f of frases) {
        expect(f.length).toBeLessThanOrEqual(60);
        expect(f.endsWith(".")).toBe(true);
      }
    }
  });

  it("agregar una frase deja un espacio y no duplica espacios", () => {
    expect(agregarFrase("", "No había nadie en casa.")).toBe("No había nadie en casa.");
    expect(agregarFrase("   ", "Recibió la información.")).toBe("Recibió la información.");
    expect(agregarFrase("Platicamos.  ", "Se sumó a la red.")).toBe("Platicamos. Se sumó a la red.");
  });
});
