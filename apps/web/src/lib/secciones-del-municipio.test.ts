import { describe, expect, it } from "vitest";

import { TODO_JALISCO } from "./municipios-jalisco";
import { esDelMunicipio, municipioDeOtraSeccion, seccionesParaElegir } from "./secciones-del-municipio";

const SECCIONES = [
  { id: "a", sectionNum: 2683, municipality: "Tonalá" },
  { id: "b", sectionNum: 2690, municipality: "TONALA" },
  { id: "c", sectionNum: 3101, municipality: "Zapopan" },
  { id: "d", sectionNum: 2684, municipality: null },
  { id: "e", sectionNum: 1268, municipality: "Guadalajara" }
];

describe("secciones del municipio elegido en el alta (F8)", () => {
  it("compara sin acentos ni mayúsculas", () => {
    expect(esDelMunicipio({ municipality: "TONALA" }, "Tonalá")).toBe(true);
    expect(esDelMunicipio({ municipality: "Tonalá" }, "tonala")).toBe(true);
    expect(esDelMunicipio({ municipality: "Zapopan" }, "Tonalá")).toBe(false);
  });

  it("sin municipio elegido, o con todo Jalisco, no esconde nada", () => {
    expect(seccionesParaElegir(SECCIONES, "", "").map((s) => s.id)).toEqual(["a", "b", "c", "d", "e"]);
    expect(seccionesParaElegir(SECCIONES, null, "").length).toBe(5);
    expect(seccionesParaElegir(SECCIONES, TODO_JALISCO, "").length).toBe(5);
  });

  it("una sección que no dice su municipio no se pierde", () => {
    expect(seccionesParaElegir(SECCIONES, "Tonalá", "").map((s) => s.id)).toEqual(["a", "b", "d"]);
  });

  it("filtra por lo escrito dentro del municipio", () => {
    expect(seccionesParaElegir(SECCIONES, "Tonalá", "268").map((s) => s.id)).toEqual(["a", "d"]);
    // «268» también está en la 1268 de Guadalajara, pero no es de Tonalá.
    expect(seccionesParaElegir(SECCIONES, "Tonalá", " 268 ").map((s) => s.id)).toEqual(["a", "d"]);
    expect(seccionesParaElegir(SECCIONES, "Zapopan", "268").map((s) => s.id)).toEqual(["d"]);
  });

  it("dice de qué municipio es una sección escrita de otro", () => {
    expect(municipioDeOtraSeccion(SECCIONES, "Zapopan", "2683")).toBe("Tonalá");
    expect(municipioDeOtraSeccion(SECCIONES, "Tonalá", "3101")).toBe("Zapopan");
  });

  it("no avisa si la sección es del municipio, si no existe o si no hay municipio elegido", () => {
    expect(municipioDeOtraSeccion(SECCIONES, "Tonalá", "2683")).toBeNull();
    expect(municipioDeOtraSeccion(SECCIONES, "tonala", "2690")).toBeNull();
    expect(municipioDeOtraSeccion(SECCIONES, "Tonalá", "9999")).toBeNull();
    expect(municipioDeOtraSeccion(SECCIONES, "", "3101")).toBeNull();
    expect(municipioDeOtraSeccion(SECCIONES, TODO_JALISCO, "3101")).toBeNull();
    expect(municipioDeOtraSeccion(SECCIONES, "Zapopan", "")).toBeNull();
    // Sin municipio en el catálogo, se da por buena en cualquiera.
    expect(municipioDeOtraSeccion(SECCIONES, "Zapopan", "2684")).toBeNull();
  });
});
