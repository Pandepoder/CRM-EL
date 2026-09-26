import { describe, expect, it } from "vitest";

import { esNombreDeArchivoValido, nombreDesdeUrl, urlsDeAdjuntos } from "./archivos";
import { fechaDeNacimiento } from "./alta-ciudadano";

describe("nombres y URLs de archivos subidos", () => {
  it("solo acepta nombres de archivo, nunca rutas", () => {
    expect(esNombreDeArchivoValido("1790208405433-51b18e94-6748-47b8-8f2e-ce4bd7ff46ed.jpg")).toBe(true);
    for (const malo of ["../.env", "a/b.jpg", "..jpg", "", ".oculto", "a\\b.jpg", "x".repeat(201)]) {
      expect(esNombreDeArchivoValido(malo)).toBe(false);
    }
  });

  it("solo reconoce URLs de /api/uploads, no enlaces externos ni la ruta estática", () => {
    expect(nombreDesdeUrl("/api/uploads/1-a.jpg")).toBe("1-a.jpg");
    for (const otra of ["https://ejemplo.com/foto.jpg", "/uploads/1-a.jpg", "/api/uploads/../x", "/api/uploads/", null, 5]) {
      expect(nombreDesdeUrl(otra)).toBeNull();
    }
  });

  it("lee las dos formas en que se guardan los adjuntos: objetos del uploader y textos", () => {
    expect(urlsDeAdjuntos([{ url: "/api/uploads/a.jpg", type: "image" }, "/api/uploads/b.jpg", { sin: "url" }, 3])).toEqual([
      "/api/uploads/a.jpg",
      "/api/uploads/b.jpg"
    ]);
    expect(urlsDeAdjuntos(null)).toEqual([]);
  });
});

describe("fechaDeNacimiento", () => {
  it("rechaza fechas que no existen en vez de correrlas al mes siguiente", () => {
    expect(fechaDeNacimiento(31, 2, 1990)).toBeNull();
    expect(fechaDeNacimiento(29, 2, 2001)).toBeNull();
    expect(fechaDeNacimiento(31, 4)).toBeNull();
  });

  it("acepta las que sí existen; sin año sigue usando el 2000, que es bisiesto", () => {
    expect(fechaDeNacimiento(29, 2)?.toISOString()).toBe("2000-02-29T00:00:00.000Z");
    expect(fechaDeNacimiento(15, 9, 1985)?.toISOString()).toBe("1985-09-15T00:00:00.000Z");
  });
});
