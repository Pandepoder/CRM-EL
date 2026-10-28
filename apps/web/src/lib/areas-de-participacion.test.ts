import { describe, expect, it } from "vitest";

import { AREAS_DE_PARTICIPACION, areasDe, etiquetaDeArea } from "./areas-de-participacion";

describe("áreas de participación", () => {
  it("cada clave de los formularios tiene su nombre legible", () => {
    expect(etiquetaDeArea("Vecinal")).toBe("Comité vecinal y mejoras");
    expect(etiquetaDeArea("deporte")).toBe("Deporte y juventud");
    expect(etiquetaDeArea("  CULTURA ")).toBe("Cultura y tradiciones");
    for (const a of AREAS_DE_PARTICIPACION) expect(etiquetaDeArea(a.clave)).toBe(a.nombre);
  });

  it("lo que no está en el catálogo se enseña como se capturó, y lo vacío queda vacío", () => {
    expect(etiquetaDeArea("Programas sociales")).toBe("Programas sociales");
    expect(etiquetaDeArea("Perfil Lider")).toBe("Perfil Lider");
    expect(etiquetaDeArea("")).toBe("");
    expect(etiquetaDeArea(null)).toBe("");
  });

  it("separa lo importado con comas y cuenta cada área una vez", () => {
    expect(areasDe("Programas sociales, Bacheo y pavimentación")).toEqual(["Programas sociales", "Bacheo y pavimentación"]);
    expect(areasDe("Vecinal, cultura ; Vecinal,, ")).toEqual(["Comité vecinal y mejoras", "Cultura y tradiciones"]);
    expect(areasDe("Seguridad pública,seguridad publica")).toEqual(["Seguridad pública"]);
    expect(areasDe(undefined)).toEqual([]);
  });
});
