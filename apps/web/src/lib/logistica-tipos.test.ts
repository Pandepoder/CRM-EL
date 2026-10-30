import { describe, expect, it } from "vitest";

import { esTipoDeMovimiento, estaPorAgotarse, filtrarArticulos, nombreDeMovimiento, normalizar, type ArticuloDeLogistica } from "./logistica-tipos";

const articulo = (parcial: Partial<ArticuloDeLogistica>): ArticuloDeLogistica => ({
  id: "a",
  nombre: "Lona 3x2 m",
  clave: "LON-TONALA",
  categoria: "publicidad",
  descripcion: null,
  imagen: null,
  existencias: 100,
  minimo: null,
  archivado: false,
  almacenId: "b1",
  almacen: "Bodega Centro",
  ...parcial
});

describe("por agotarse (D7)", () => {
  it("solo con mínimo, y cuando las existencias llegan a él", () => {
    expect(estaPorAgotarse({ existencias: 10, minimo: null })).toBe(false);
    expect(estaPorAgotarse({ existencias: 20, minimo: 20 })).toBe(true);
    expect(estaPorAgotarse({ existencias: 21, minimo: 20 })).toBe(false);
    expect(estaPorAgotarse({ existencias: 0, minimo: 0 })).toBe(true);
  });
});

describe("el buscador del inventario", () => {
  const lista = [
    articulo({ id: "1", nombre: "Camión de sonido", clave: "CAM-1", categoria: "equipo" }),
    articulo({ id: "2", nombre: "Playera", clave: "PLA-1", categoria: "ropa", existencias: 5, minimo: 10 }),
    articulo({ id: "3", nombre: "Gorra", clave: "GOR-1", categoria: "ropa", almacenId: "b2" }),
    articulo({ id: "4", nombre: "Banderín viejo", clave: "BAN-0", categoria: "publicidad", archivado: true })
  ];
  const ids = (f: Partial<Parameters<typeof filtrarArticulos>[1]>) =>
    filtrarArticulos(lista, { texto: "", almacen: null, categoria: null, porAgotarse: false, archivados: false, ...f }).map((a) => a.id);

  it("busca por nombre, clave o categoría, sin acentos ni mayúsculas", () => {
    expect(ids({ texto: "camion" })).toEqual(["1"]);
    expect(ids({ texto: "pla-1" })).toEqual(["2"]);
    expect(ids({ texto: "ROPA" })).toEqual(["2", "3"]);
  });

  it("los chips: almacén, categoría y por agotarse; lo archivado solo con su chip", () => {
    expect(ids({ almacen: "b2" })).toEqual(["3"]);
    expect(ids({ categoria: "ropa" })).toEqual(["2", "3"]);
    expect(ids({ porAgotarse: true })).toEqual(["2"]);
    expect(ids({})).not.toContain("4");
    expect(ids({ archivados: true })).toEqual(["4"]);
  });

  it("normalizar quita acentos y mayúsculas", () => {
    expect(normalizar("  Camión ")).toBe("camion");
  });
});

describe("tipos de movimiento", () => {
  it("entrada, entrega y devolución; nada más", () => {
    expect(["in", "out", "devolucion"].every(esTipoDeMovimiento)).toBe(true);
    expect(esTipoDeMovimiento("ajuste")).toBe(false);
    expect(nombreDeMovimiento("devolucion")).toBe("Devolución");
  });
});
