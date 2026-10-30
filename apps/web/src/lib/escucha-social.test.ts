import { describe, expect, it } from "vitest";

import {
  CATEGORIAS_ESCUCHA,
  esCategoriaEscucha,
  esEstadoEscucha,
  nombreDeCategoriaEscucha,
  nombreDeEstadoEscucha,
  textoDeProblemaEnLaCalle,
  tituloDesdeTexto,
  LARGO_DE_TITULO_AUTOMATICO,
  diaDeJalisco,
  fechaDeTurno,
  textoDelTurno
} from "./escucha-social";

describe("catálogos de Escucha Social", () => {
  it("las cinco categorías se reconocen y tienen nombre", () => {
    expect(CATEGORIAS_ESCUCHA.map((c) => c.clave)).toEqual(["propuesta", "problematica", "compromiso", "seguimiento", "gestion"]);
    for (const c of CATEGORIAS_ESCUCHA) expect(esCategoriaEscucha(c.clave)).toBe(true);
    expect(esCategoriaEscucha("queja")).toBe(false);
    expect(esCategoriaEscucha(7)).toBe(false);
  });

  it("una categoría vieja que no está en el catálogo no se disfraza de propuesta", () => {
    expect(nombreDeCategoriaEscucha("queja")).toBe("Otra: queja");
    expect(nombreDeCategoriaEscucha("")).toBe("Sin categoría");
    expect(nombreDeCategoriaEscucha("propuesta")).toBe("Idea o propuesta");
  });

  it("los tres estados, con su nombre", () => {
    expect(esEstadoEscucha("en_seguimiento")).toBe(true);
    expect(esEstadoEscucha("abierto")).toBe(false);
    expect(nombreDeEstadoEscucha("cerrado")).toBe("Cerrada");
  });

  it("a cada quien le dice qué hacer con un problema en la calle, con lo que sí tiene", () => {
    expect(textoDeProblemaEnLaCalle(true, false)).toMatch(/levántalo como incidencia/);
    expect(textoDeProblemaEnLaCalle(false, true)).toMatch(/Avisar de una incidencia/);
    expect(textoDeProblemaEnLaCalle(false, false)).toMatch(/avísale a tu líder/);
  });
});

describe("el turno en palabras", () => {
  it("con dependencia y folio, o una marca vieja sin dependencia, sin inventar", () => {
    expect(textoDelTurno({ dependencia: "SIAPA", folio: "F-12", fecha: null })).toBe("Turnada a SIAPA · folio F-12");
    expect(textoDelTurno({ dependencia: null, folio: null, fecha: null })).toBe("Turnada (sin dependencia anotada)");
  });
});

describe("la fecha del turno, en Jalisco", () => {
  it("el día que se elige es el que se lee después, también de noche", () => {
    const fecha = fechaDeTurno("2026-10-17")!;
    expect(diaDeJalisco(fecha)).toBe("2026-10-17");
    expect(fecha.toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "America/Mexico_City" })).toMatch(/^17 oct/);
  });

  it("lo que no es una fecha AAAA-MM-DD válida se rechaza", () => {
    expect(fechaDeTurno("17/10/2026")).toBeNull();
    expect(fechaDeTurno("2026-02-30")).toBeNull();
    expect(fechaDeTurno("mañana")).toBeNull();
  });

  it("hoy en Jalisco no es hoy en UTC: a las 8 de la noche sigue siendo el mismo día", () => {
    expect(diaDeJalisco(new Date("2026-10-18T02:00:00Z"))).toBe("2026-10-17");
  });
});

describe("la frase que se toma del texto", () => {
  it("es la primera oración, sin el punto", () => {
    expect(tituloDesdeTexto("Piden poda del árbol de la esquina. Está tapando la luminaria.")).toBe("Piden poda del árbol de la esquina");
    expect(tituloDesdeTexto("  Un taller de oficios\npara jóvenes  ")).toBe("Un taller de oficios para jóvenes");
  });

  it("si es larga, se corta en una palabra completa y avisa con «…»", () => {
    const largo = "Los vecinos de la calle Hidalgo piden que se instale un reductor de velocidad frente a la primaria porque los coches pasan muy rápido";
    const titulo = tituloDesdeTexto(largo);
    expect(titulo.length).toBeLessThanOrEqual(LARGO_DE_TITULO_AUTOMATICO);
    expect(titulo.endsWith("…")).toBe(true);
    expect(largo.startsWith(titulo.slice(0, -1))).toBe(true);
    expect(largo.charAt(titulo.length - 1)).toBe(" ");
  });

  it("un texto sin puntos se usa entero si cabe", () => {
    expect(tituloDesdeTexto("Arreglar la banqueta")).toBe("Arreglar la banqueta");
  });
});
