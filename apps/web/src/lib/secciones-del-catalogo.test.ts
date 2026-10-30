import { afterEach, describe, expect, it, vi } from "vitest";

import { olvidarSeccionesDelCatalogo, seccionesDelCatalogo } from "./secciones-del-catalogo";

const SECCIONES = [{ id: "a", sectionNum: 2690, municipality: "Tonalá" }];

afterEach(() => {
  olvidarSeccionesDelCatalogo();
  vi.unstubAllGlobals();
});

describe("el catálogo de secciones del alta (O3)", () => {
  it("pide la versión ligera una sola vez por visita, aunque el formulario se abra muchas veces", async () => {
    const pedir = vi.fn(async () => new Response(JSON.stringify({ sections: SECCIONES })));
    vi.stubGlobal("fetch", pedir);
    for (let i = 0; i < 5; i++) expect(await seccionesDelCatalogo()).toEqual(SECCIONES);
    expect(pedir).toHaveBeenCalledTimes(1);
    expect(pedir).toHaveBeenCalledWith("/api/electoral/sections?ligera=1");
  });

  it("si falla (sin señal o error del servidor), da una lista vacía y lo vuelve a intentar la próxima vez", async () => {
    const pedir = vi
      .fn()
      .mockRejectedValueOnce(new Error("sin señal"))
      .mockResolvedValueOnce(new Response("{}", { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ sections: SECCIONES })));
    vi.stubGlobal("fetch", pedir);
    expect(await seccionesDelCatalogo()).toEqual([]);
    expect(await seccionesDelCatalogo()).toEqual([]);
    expect(await seccionesDelCatalogo()).toEqual(SECCIONES);
    expect(pedir).toHaveBeenCalledTimes(3);
  });
});
