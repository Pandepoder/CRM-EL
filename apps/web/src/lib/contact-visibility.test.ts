import { describe, expect, it } from "vitest";

import { matchesAssignedTerritory, seccionesDeEquipo } from "./contact-visibility";

const contacto = (municipality: string | null, sectionNum: number | null, sectionMunicipality: string | null = null) => ({
  municipality,
  sectionNum,
  sectionMunicipality
});
const equipo = (municipality: string | null, section: string | null = null) => ({ municipality, section });

describe("seccionesDeEquipo", () => {
  it("lee números sueltos, rangos y texto alrededor", () => {
    const s = seccionesDeEquipo("Sección 3073, 3000-3010; 2704");
    expect(s && [...s.numeros].sort()).toEqual([2704, 3073]);
    expect(s?.rangos).toEqual([[3000, 3010]]);
  });

  it("sin números no hay secciones asignadas", () => {
    expect(seccionesDeEquipo("   ")).toBeNull();
    expect(seccionesDeEquipo("Centro histórico")).toBeNull();
    expect(seccionesDeEquipo(null)).toBeNull();
  });

  it("un rango escrito al revés se ordena", () => {
    expect(seccionesDeEquipo("3010-3000")?.rangos).toEqual([[3000, 3010]]);
  });
});

describe("matchesAssignedTerritory: el filtro solo aplica cuando hay dato", () => {
  it("un equipo sin municipio ni sección no limita", () => {
    expect(matchesAssignedTerritory(contacto("Zapopan", 3073), [equipo(null, null)])).toBe(true);
    expect(matchesAssignedTerritory(contacto("Tonalá", 2704), [equipo("", "Centro")])).toBe(true);
  });

  it("un contacto sin municipio ni sección lo ve su equipo", () => {
    expect(matchesAssignedTerritory(contacto(null, null), [equipo("Zapopan")])).toBe(true);
  });

  it("un contacto de otro municipio queda fuera", () => {
    expect(matchesAssignedTerritory(contacto("Tonalá", null), [equipo("Zapopan")])).toBe(false);
  });

  it("sin municipio propio se usa el de su sección", () => {
    expect(matchesAssignedTerritory(contacto(null, 2704, "Tonalá"), [equipo("Zapopan")])).toBe(false);
    expect(matchesAssignedTerritory(contacto(null, 3073, "Zapopan"), [equipo("Zapopan")])).toBe(true);
  });

  it("compara municipios sin importar acentos ni mayúsculas", () => {
    expect(matchesAssignedTerritory(contacto("TONALA", null), [equipo("Tonalá")])).toBe(true);
  });

  it("respeta rangos y secciones escritas con texto", () => {
    expect(matchesAssignedTerritory(contacto("Zapopan", 3005), [equipo("Zapopan", "3000-3010")])).toBe(true);
    expect(matchesAssignedTerritory(contacto("Zapopan", 3011), [equipo("Zapopan", "3000-3010")])).toBe(false);
    expect(matchesAssignedTerritory(contacto("Zapopan", 3073), [equipo("Zapopan", "Sección 3073")])).toBe(true);
  });

  it("un contacto sin sección no se descarta por las secciones del equipo", () => {
    expect(matchesAssignedTerritory(contacto("Zapopan", null), [equipo("Zapopan", "3000-3010")])).toBe(true);
  });

  it("con varios equipos basta que caiga en uno", () => {
    expect(matchesAssignedTerritory(contacto("Tonalá", 2704), [equipo("Zapopan"), equipo("Tonalá")])).toBe(true);
  });

  it("sin territorios que comparar no limita", () => {
    expect(matchesAssignedTerritory(contacto("Tonalá", 2704), [])).toBe(true);
  });
});
