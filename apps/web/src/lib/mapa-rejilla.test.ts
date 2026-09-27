import { describe, expect, it } from "vitest";

import { agruparEnRejilla, dentroDe, ladoDeRejilla, leerRecuadro, ZOOM_SIN_AGRUPAR, type PuntoDelMapa } from "./mapa-rejilla";

/** Lo que mide en pantalla (px) una celda de `lado` grados a ese zoom. */
const pixeles = (lado: number, zoom: number) => (lado * 256 * 2 ** zoom) / 360;

describe("ladoDeRejilla", () => {
  it("sin zoom no agrupa: Number(null) es 0 y habría agrupado todo", () => {
    expect(ladoDeRejilla(Number.NaN)).toBeNull();
    expect(ladoDeRejilla(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("desde el zoom 15 ya no agrupa", () => {
    expect(ladoDeRejilla(ZOOM_SIN_AGRUPAR)).toBeNull();
    expect(ladoDeRejilla(18)).toBeNull();
  });

  it("conserva los tramos de siempre del 11 al 14", () => {
    expect(ladoDeRejilla(11)).toBe(0.04);
    expect(ladoDeRejilla(12)).toBe(0.015);
    expect(ladoDeRejilla(13)).toBe(0.015);
    expect(ladoDeRejilla(14)).toBe(0.006);
  });

  it("por debajo del 11 la celda crece al alejarse y sigue midiendo lo mismo en pantalla", () => {
    const aZoom11 = pixeles(0.04, 11);
    for (const zoom of [5, 6, 7, 8, 9, 10]) {
      const lado = ladoDeRejilla(zoom)!;
      expect(lado).toBeGreaterThan(ladoDeRejilla(zoom + 1)!);
      expect(pixeles(lado, zoom)).toBeCloseTo(aZoom11, 6);
    }
    // Antes, a zoom 7 (todo Jalisco en escritorio) la celda medía unos 4 px.
    expect(pixeles(ladoDeRejilla(7)!, 7)).toBeGreaterThan(50);
  });

  it("un zoom con decimales usa el tramo del entero más cercano", () => {
    expect(ladoDeRejilla(7.6)).toBe(ladoDeRejilla(8));
    expect(ladoDeRejilla(7.4)).toBe(ladoDeRejilla(7));
  });
});

describe("leerRecuadro", () => {
  it("acepta oeste,sur,este,norte", () => {
    expect(leerRecuadro("-103.4,20.5,-103.1,20.8")).toEqual([-103.4, 20.5, -103.1, 20.8]);
  });

  it("rechaza lo que no son cuatro números en orden", () => {
    expect(leerRecuadro(null)).toBeNull();
    expect(leerRecuadro("")).toBeNull();
    expect(leerRecuadro("1,2,3")).toBeNull();
    expect(leerRecuadro("1,2,3,4,5")).toBeNull();
    expect(leerRecuadro("a,b,c,d")).toBeNull();
    expect(leerRecuadro("-103.1,20.5,-103.4,20.8")).toBeNull();
    expect(leerRecuadro("-103.4,20.8,-103.1,20.5")).toBeNull();
  });
});

describe("dentroDe", () => {
  it("incluye los bordes", () => {
    const r = [-104, 20, -103, 21] as const;
    expect(dentroDe(r, -104, 20)).toBe(true);
    expect(dentroDe(r, -103, 21)).toBe(true);
    expect(dentroDe(r, -103.5, 20.5)).toBe(true);
    expect(dentroDe(r, -102.99, 20.5)).toBe(false);
    expect(dentroDe(r, -103.5, 19.99)).toBe(false);
  });
});

describe("agruparEnRejilla", () => {
  const punto = (id: string, lat: number, lng: number, extra: Partial<PuntoDelMapa> = {}): PuntoDelMapa => ({ id, lat, lng, pan: false, aprox: false, ...extra });

  it("no pierde ni duplica a nadie: los grupos más los sueltos suman los puntos", () => {
    const puntos: PuntoDelMapa[] = [];
    for (let i = 0; i < 500; i++) puntos.push(punto(`p${i}`, 20.5 + ((i * 37) % 100) / 1000, -103.3 + ((i * 53) % 100) / 1000));
    for (const lado of [0.006, 0.015, 0.04, 0.32]) {
      const { grupos, sueltos } = agruparEnRejilla(puntos, lado);
      expect(grupos.reduce((n, g) => n + g.total, 0) + sueltos.length).toBe(puntos.length);
      expect(new Set(sueltos).size).toBe(sueltos.length);
      expect(grupos.every((g) => g.total >= 2)).toBe(true);
    }
  });

  it("un punto solo en su celda no es un grupo: se devuelve suelto", () => {
    const { grupos, sueltos } = agruparEnRejilla([punto("a", 20.5, -103.3), punto("b", 21.5, -104.3)], 0.04);
    expect(grupos).toEqual([]);
    expect(sueltos.sort()).toEqual(["a", "b"]);
  });

  it("el grupo va en el promedio de sus puntos y cuenta la militancia", () => {
    const { grupos, sueltos } = agruparEnRejilla([punto("a", 20.501, -103.301, { pan: true }), punto("b", 20.503, -103.303), punto("c", 20.505, -103.305, { pan: true })], 0.04);
    expect(sueltos).toEqual([]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0]!.total).toBe(3);
    expect(grupos[0]!.pan).toBe(2);
    expect(grupos[0]!.lat).toBeCloseTo(20.503, 9);
    expect(grupos[0]!.lng).toBeCloseTo(-103.303, 9);
  });

  it("el grupo es aproximado solo si todos lo son", () => {
    const todos = agruparEnRejilla([punto("a", 20.501, -103.301, { aprox: true }), punto("b", 20.502, -103.302, { aprox: true })], 0.04);
    expect(todos.grupos[0]!.aprox).toBe(true);
    const mezcla = agruparEnRejilla([punto("a", 20.501, -103.301, { aprox: true }), punto("b", 20.502, -103.302)], 0.04);
    expect(mezcla.grupos[0]!.aprox).toBe(false);
  });
});
