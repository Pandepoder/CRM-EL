import { describe, expect, it } from "vitest";

import {
  CASILLAS_ESTIMADAS_POR_SECCION,
  direccionDeCobertura,
  esRolElectoral,
  leerFiltrosDeCobertura,
  nombreDeRol,
  normalizarCasilla,
  ROLES_ELECTORALES,
  seccionCompleta
} from "./estructura-electoral";

describe("roles de la estructura", () => {
  it("las tres claves que acepta la base (regla de la 0029), con su nombre", () => {
    expect(ROLES_ELECTORALES.map((r) => r.clave)).toEqual(["coordinador", "representante_general", "representante_casilla"]);
    for (const r of ROLES_ELECTORALES) expect(esRolElectoral(r.clave)).toBe(true);
    expect(esRolElectoral("Representante General (RG)")).toBe(false);
    expect(nombreDeRol("representante_casilla")).toBe("Representante de casilla");
  });

  it("un rol viejo fuera del catálogo se dice tal cual, sin disfrazarlo", () => {
    expect(nombreDeRol("Promotor")).toBe("Otro: Promotor");
    expect(nombreDeRol("")).toBe("Sin rol");
  });
});

describe("la casilla", () => {
  it("se guarda como la escribe el INE, en mayúsculas y sin espacios; vacía es «sin casilla»", () => {
    expect(normalizarCasilla(" c1 ")).toEqual({ ok: true, casilla: "C1" });
    expect(normalizarCasilla("e1 c2")).toEqual({ ok: true, casilla: "E1C2" });
    expect(normalizarCasilla("")).toEqual({ ok: true, casilla: null });
    expect(normalizarCasilla(undefined)).toEqual({ ok: true, casilla: null });
  });

  it("lo que no tiene esa forma se rechaza", () => {
    expect(normalizarCasilla("B-12!")).toEqual({ ok: false });
    expect(normalizarCasilla("ABCDEFGHIJ")).toEqual({ ok: false });
    expect(normalizarCasilla(12)).toEqual({ ok: false });
  });
});

describe("filtros de la cobertura", () => {
  it("un filtro inventado vuelve a «todas»; la página, acotada", () => {
    expect(leerFiltrosDeCobertura({ filtro: "lo_que_sea", page: "-3" })).toEqual({ filtro: "todas", q: "", pagina: 1 });
    expect(leerFiltrosDeCobertura({ filtro: "sin_rc", pagina: 4, q: "  2695 " })).toEqual({ filtro: "sin_rc", q: "2695", pagina: 4 });
  });

  it("el buscador nunca va en la dirección; el municipio, el chip y la página sí", () => {
    const dir = direccionDeCobertura({ filtro: "sin_coordinador", q: "Juan Pérez", pagina: 2 }, "Tonalá");
    expect(dir).not.toContain("Juan");
    expect(dir).toBe("?municipio=Tonal%C3%A1&filtro=sin_coordinador&page=2");
    expect(direccionDeCobertura({ filtro: "todas", q: "", pagina: 1 }, null)).toBe("");
  });

  it("una sección está completa con coordinación, RG y las casillas estimadas", () => {
    expect(seccionCompleta({ coordinador: 1, representante_general: 1, representante_casilla: CASILLAS_ESTIMADAS_POR_SECCION })).toBe(true);
    expect(seccionCompleta({ coordinador: 1, representante_general: 1, representante_casilla: 1 })).toBe(false);
    expect(seccionCompleta({ coordinador: 0, representante_general: 1, representante_casilla: 2 })).toBe(false);
  });
});
