import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Igual que en crypto.test.ts: la llave sale de `process.env` sin validar el entorno completo.
vi.mock("@tonala/config", () => ({
  loadAppEnv: () => ({ private: { DATABASE_ENCRYPTION_KEY: process.env.DATABASE_ENCRYPTION_KEY } })
}));

const { huellaDeTelefono } = await import("./crypto.js");
const { huellasParaBuscarTelefono, patronDeBusqueda, sinAcentos } = await import("./busqueda.js");

describe("buscar ciudadanos", () => {
  const original = process.env.DATABASE_ENCRYPTION_KEY;
  beforeAll(() => {
    process.env.DATABASE_ENCRYPTION_KEY = "c".repeat(32);
  });
  afterAll(() => {
    if (original === undefined) delete process.env.DATABASE_ENCRYPTION_KEY;
    else process.env.DATABASE_ENCRYPTION_KEY = original;
  });

  it("un teléfono tecleado de cualquier forma encuentra el guardado con 10 dígitos", () => {
    const guardado = huellaDeTelefono("3312345678");
    for (const tecleado of ["3312345678", "33 1234 5678", "(33) 1234-5678", "+52 33 1234 5678", "52 1 33 1234 5678"]) {
      expect(huellasParaBuscarTelefono(tecleado)).toContain(guardado);
    }
  });

  it("y encuentra uno guardado con prefijo de país aunque se teclee sin él", () => {
    expect(huellasParaBuscarTelefono("3312345678")).toContain(huellaDeTelefono("523312345678"));
  });

  it("menos de 7 dígitos no es un teléfono: no se busca por huella", () => {
    expect(huellasParaBuscarTelefono("2704")).toEqual([]);
    expect(huellasParaBuscarTelefono("Loma Dorada")).toEqual([]);
  });

  it("compara sin mayúsculas ni acentos, como `translate` en la base", () => {
    expect(sinAcentos("José Pérez Muñoz")).toBe("jose perez munoz");
    expect(sinAcentos("TONALÁ")).toBe("tonala");
  });

  it("el patrón busca en cualquier parte y escapa los comodines que escribió la persona", () => {
    expect(patronDeBusqueda("  Tonalá ")).toBe("%tonala%");
    expect(patronDeBusqueda("50%_x")).toBe("%50\\%\\_x%");
  });
});
