import { describe, expect, it } from "vitest";

import {
  MUNICIPIOS_JALISCO,
  RECUADRO_JALISCO,
  TOTAL_SECCIONES_JALISCO,
  buscarMunicipio,
  recuadroNominatim,
  resolverMunicipio
} from "./municipios-jalisco.js";

/**
 * El catálogo reemplaza a las listas de municipios escritas a mano en cada pantalla, que
 * cubrían entre siete y doce municipios del AMG y caían a "Tonalá" ante cualquier otro.
 */

describe("catálogo de municipios", () => {
  it("cubre los 125 municipios de Jalisco con cartografía", () => {
    expect(MUNICIPIOS_JALISCO).toHaveLength(125);
    expect(TOTAL_SECCIONES_JALISCO).toBeGreaterThan(3700);
  });

  it("cada municipio tiene un recuadro válido dentro de Jalisco", () => {
    for (const m of MUNICIPIOS_JALISCO) {
      const [minLng, minLat, maxLng, maxLat] = m.bbox;
      expect(minLng, m.name).toBeLessThan(maxLng);
      expect(minLat, m.name).toBeLessThan(maxLat);
      expect(minLng, m.name).toBeGreaterThanOrEqual(RECUADRO_JALISCO[0]);
      expect(maxLat, m.name).toBeLessThanOrEqual(RECUADRO_JALISCO[3]);
    }
  });
});

describe("buscarMunicipio", () => {
  it("encuentra el municipio sin importar acentos ni mayúsculas", () => {
    expect(buscarMunicipio("tonala")?.name).toBe("Tonalá");
    expect(buscarMunicipio("  ZAPOPAN ")?.name).toBe("Zapopan");
  });

  it("no inventa municipios", () => {
    expect(buscarMunicipio("Springfield")).toBeNull();
    expect(buscarMunicipio("")).toBeNull();
    expect(buscarMunicipio(null)).toBeNull();
  });
});

describe("resolverMunicipio", () => {
  it("normaliza cómo escribe OpenStreetMap a cómo escribe el INE", () => {
    expect(resolverMunicipio("Tlaquepaque")).toBe("San Pedro Tlaquepaque");
    expect(resolverMunicipio("Tlajomulco")).toBe("Tlajomulco de Zúñiga");
    expect(resolverMunicipio("Municipio de Zapopan")).toBe("Zapopan");
    expect(resolverMunicipio("Puerto Vallarta, Jalisco")).toBe("Puerto Vallarta");
  });

  it("devuelve null ante la ambigüedad en vez de elegir uno", () => {
    // Hay dos Ixtlahuacán en Jalisco: de los Membrillos y del Río.
    expect(resolverMunicipio("Ixtlahuacán")).toBeNull();
  });

  it("devuelve null en lugar de caer a Tonalá", () => {
    // Antes todo texto desconocido se convertía en "Tonalá".
    expect(resolverMunicipio("Guanajuato")).toBeNull();
    expect(resolverMunicipio("")).toBeNull();
    expect(resolverMunicipio(undefined)).toBeNull();
  });
});

describe("recuadroNominatim", () => {
  it("usa el orden izquierda, arriba, derecha, abajo que exige Nominatim", () => {
    const [izq, arriba, der, abajo] = recuadroNominatim([-103.3, 20.5, -103.1, 20.7], 0).split(",").map(Number);
    expect([izq, arriba, der, abajo]).toEqual([-103.3, 20.7, -103.1, 20.5]);
  });
});
