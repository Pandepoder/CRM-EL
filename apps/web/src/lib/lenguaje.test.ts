import { describe, expect, it } from "vitest";

import { nombreDelNivel } from "./lenguaje";

describe("nombre del nivel a la vista (L3)", () => {
  it("cada valor interno tiene su palabra de todos los días", () => {
    expect(nombreDelNivel("conexion")).toBe("Integrante");
    expect(nombreDelNivel("enlace")).toBe("Líder de equipo");
    expect(nombreDelNivel("coordinacion")).toBe("Coordinación");
  });

  it("sin nivel, o con uno desconocido, nunca enseña la clave técnica", () => {
    expect(nombreDelNivel(null)).toBe("Integrante");
    expect(nombreDelNivel(undefined)).toBe("Integrante");
    expect(nombreDelNivel("CONEXION")).toBe("Integrante");
    expect(nombreDelNivel("otro")).toBe("Integrante");
  });
});
