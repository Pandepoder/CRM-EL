import { describe, expect, it } from "vitest";

import { direccionDelDirectorio, leerFiltrosDelDirectorio } from "./directorio-filtros";

const UNO = "3f2c1a8e-5b7d-4c9e-8a1f-2d3e4f5a6b7c";

describe("los filtros del Directorio (O2: el texto buscado no va en la dirección)", () => {
  it("la dirección lleva los filtros pero nunca el texto del buscador", () => {
    const f = leerFiltrosDelDirectorio({ q: "Ana López 3312345678", asignados: "mios", pan: "confirmada", ubicacion: "sin", registro: UNO, page: "3" });
    const direccion = direccionDelDirectorio(f);
    expect(direccion).toBe(`?registro=${UNO}&asignados=mios&pan=confirmada&ubicacion=sin&page=3`);
    expect(direccion).not.toMatch(/q=|Ana|3312345678/);
    expect(direccionDelDirectorio(leerFiltrosDelDirectorio({ q: "solo texto" }))).toBe("");
  });

  it("lee igual la dirección (y los enlaces viejos con `q=`) que el cuerpo de la consulta", () => {
    const deLaDireccion = leerFiltrosDelDirectorio({ q: " ana ", asignados: "mios", pan: "declarada", ubicacion: "sin", registro: UNO, page: "2" });
    const delCuerpo = leerFiltrosDelDirectorio({ q: "ana", soloAsignados: true, militancia: "declarada", sinUbicacion: true, registro: UNO, pagina: 2 });
    expect(deLaDireccion).toEqual(delCuerpo);
    expect(delCuerpo).toEqual({ q: "ana", soloAsignados: true, militancia: "declarada", sinUbicacion: true, registro: UNO, pagina: 2 });
  });

  it("lo que no se entiende se ignora: militancia inventada, registro que no es id, páginas raras, texto largo", () => {
    const f = leerFiltrosDelDirectorio({ pan: "morena", registro: "no-es-un-id", page: "-4", q: "x".repeat(200), asignados: "todos" });
    expect(f).toMatchObject({ militancia: "", registro: null, pagina: 1, soloAsignados: false });
    expect(f.q).toHaveLength(80);
    expect(leerFiltrosDelDirectorio({ page: "999999" }).pagina).toBe(10_000);
  });
});
