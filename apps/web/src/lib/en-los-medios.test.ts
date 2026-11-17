import { describe, expect, it } from "vitest";

import { aparicionesParaMostrar, fechaLegible, type Aparicion } from "./en-los-medios";

const nota = (fecha: string, enlace = "https://medio.example/nota"): Aparicion => ({
  medio: "Medio de prueba",
  titular: "Titular",
  fecha,
  enlace,
  tipo: "nota"
});

describe("En los medios", () => {
  it("ordena de la más reciente a la más vieja", () => {
    const orden = aparicionesParaMostrar([nota("2026-03-01"), nota("2026-10-12"), nota("2025-12-31")]).map((a) => a.fecha);
    expect(orden).toEqual(["2026-10-12", "2026-03-01", "2025-12-31"]);
  });

  it("descarta enlaces que no son http(s), para que nadie pegue uno que ejecute código", () => {
    const lista = [nota("2026-01-01", "javascript:alert(1)"), nota("2026-01-02", "data:text/html,hola"), nota("2026-01-03", "no es enlace")];
    expect(aparicionesParaMostrar(lista)).toEqual([]);
  });

  it("descarta una fecha mal escrita en vez de enseñar «Invalid Date»", () => {
    expect(aparicionesParaMostrar([nota("12/10/2026"), nota("2026-13-45")])).toEqual([]);
  });

  it("escribe la fecha en español sin correrla un día", () => {
    expect(fechaLegible("2026-10-12")).toBe("12 de octubre de 2026");
    expect(fechaLegible("2026-01-01")).toBe("1 de enero de 2026");
  });
});
