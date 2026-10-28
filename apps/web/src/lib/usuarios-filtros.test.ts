import { describe, expect, it } from "vitest";

import { direccionDeUsuarios, leerFiltrosDeUsuarios } from "./usuarios-filtros";

describe("los filtros de «Usuarios y permisos» (O2: el texto buscado no va en la dirección)", () => {
  it("la dirección lleva rol, estado, municipio y página, nunca el nombre o correo buscado", () => {
    const f = leerFiltrosDeUsuarios({ q: "ana@correo.mx", rol: "capturist", estado: "inactive", municipio: "Tonalá", page: "2" });
    const direccion = direccionDeUsuarios(f);
    expect(direccion).toBe("?rol=capturist&estado=inactive&municipio=Tonal%C3%A1&page=2");
    expect(direccion).not.toMatch(/q=|ana|correo/);
    expect(direccionDeUsuarios(leerFiltrosDeUsuarios({ q: "solo texto" }))).toBe("");
  });

  it("lee igual la dirección (y los enlaces viejos con `q=`) que el cuerpo de la consulta", () => {
    expect(leerFiltrosDeUsuarios({ q: " ana ", rol: "admin", estado: "active", page: "3" })).toEqual(
      leerFiltrosDeUsuarios({ q: "ana", rol: "admin", estado: "active", pagina: 3 })
    );
  });

  it("lo raro se ignora: estado inventado, rol con caracteres extraños, página negativa, texto largo", () => {
    const f = leerFiltrosDeUsuarios({ estado: "borrados", rol: "admin'; --", page: "-1", q: "x".repeat(300) });
    expect(f).toMatchObject({ estado: "todos", rol: "", pagina: 1 });
    expect(f.q).toHaveLength(120);
  });
});
