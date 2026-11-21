import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readSheet } from "read-excel-file/node";
import { describe, expect, it } from "vitest";

import {
  COLUMNAS,
  TITULOS_DE_LA_PLANTILLA,
  TOPE_DE_RENGLONES,
  coordenadasDelRenglon,
  emparejarEncabezados,
  fechaDelRenglon,
  leerRenglones,
  nombreDelRenglon,
  repetidosEnElArchivo,
  seccionDelRenglon,
  telefonoDeDiezDigitos,
  textoDeCelda
} from "./importar-ciudadanos";

/** Importar ciudadanos desde Excel: lo que se decide sin la base (columnas, teléfonos, fechas, coordenadas). */

describe("las columnas del Excel", () => {
  it("se reconocen sin importar acentos, mayúsculas ni signos, y con sus otros nombres", () => {
    const { columnas, ignoradas } = emparejarEncabezados(["NOMBRE(S)", "Apellido Paterno", "Celular", "Domicilio", "Sección:", "Edad", "C.P."]);
    expect([...columnas.values()]).toEqual(["nombre", "apellidoPaterno", "telefono", "calle", "seccion"]);
    expect(ignoradas).toEqual(["Edad", "C.P."]);
  });

  it("«No.» y «Núm.» a secas son el consecutivo de la lista, no el número de la casa", () => {
    const { columnas, ignoradas } = emparejarEncabezados(["No.", "Núm.", "Nombre", "Teléfono", "Calle", "Número exterior"]);
    expect([...columnas.values()]).toEqual(["nombre", "telefono", "calle", "numero"]);
    expect(ignoradas).toEqual(["No.", "Núm."]);
  });

  it("dos columnas para lo mismo: manda la primera y la otra se dice como no usada", () => {
    const { columnas, ignoradas } = emparejarEncabezados(["Nombre completo", "Teléfono", "WhatsApp", "Calle"]);
    expect([...columnas.entries()]).toEqual([[0, "nombreCompleto"], [1, "telefono"], [3, "calle"]]);
    expect(ignoradas).toEqual(["WhatsApp"]);
  });

  it("los títulos pueden no ir en la primera fila (una lista con el nombre del evento arriba)", () => {
    const lectura = leerRenglones([
      ["Simpatizantes del evento del 20 de noviembre"],
      [],
      ["Nombre", "Teléfono", "Calle", "Edad"],
      ["Ana", 3312345678, "Hidalgo 21", 34],
      [null, null, null, null],
      ["  Beto  ", "33 1234 5679", "Morelos 5", null]
    ]);
    expect(lectura.ok).toBe(true);
    if (!lectura.ok) return;
    // El número de renglón es el que ve quien abre el Excel; el vacío se salta sin contarse.
    expect(lectura.renglones).toEqual([
      { renglon: 4, datos: { nombre: "Ana", telefono: "3312345678", calle: "Hidalgo 21" } },
      { renglon: 6, datos: { nombre: "Beto", telefono: "33 1234 5679", calle: "Morelos 5" } }
    ]);
    expect(lectura.ignoradas).toEqual(["Edad"]);
  });

  it("sin nombre, teléfono o calle no se puede importar: se dice qué columna falta", () => {
    const sinTelefono = leerRenglones([["Nombre", "Calle"], ["Ana", "Hidalgo"]]);
    expect(sinTelefono).toEqual({ ok: false, error: expect.stringContaining("«Teléfono»") });
    const sinDos = leerRenglones([["Nombre", "Correo"], ["Ana", "a@b.mx"]]);
    expect(sinDos).toEqual({ ok: false, error: expect.stringMatching(/columnas «Teléfono», «Calle»/) });
    expect(leerRenglones([["hola"], ["mundo"]])).toEqual({ ok: false, error: expect.stringContaining("títulos") });
    expect(leerRenglones([["Nombre", "Teléfono", "Calle"]])).toEqual({ ok: false, error: expect.stringContaining("ninguna persona") });
  });

  it(`más de ${TOPE_DE_RENGLONES} personas se piden en varios archivos`, () => {
    const hoja = [["Nombre", "Teléfono", "Calle"], ...Array.from({ length: TOPE_DE_RENGLONES + 1 }, (_, i) => [`P${i}`, "3300000000", "Calle"])];
    expect(leerRenglones(hoja)).toEqual({ ok: false, error: expect.stringContaining("Divídelo") });
  });

  it("las fechas de una celda con formato de fecha llegan como AAAA-MM-DD, sin correrse un día", () => {
    expect(textoDeCelda(new Date(Date.UTC(1990, 2, 15)))).toBe("1990-03-15");
    expect(textoDeCelda(true)).toBe("");
    expect(textoDeCelda({ algo: 1 })).toBe("");
  });

  it("la plantilla que se descarga tiene exactamente los títulos que se reconocen", async () => {
    const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
    const hoja = await readSheet(fs.readFileSync(path.join(raiz, "public/plantilla-ciudadanos.xlsx")));
    expect(hoja[0]).toEqual([...TITULOS_DE_LA_PLANTILLA]);
    const { columnas, ignoradas } = emparejarEncabezados(hoja[0] ?? []);
    expect(ignoradas).toEqual([]);
    expect(columnas.size).toBe(TITULOS_DE_LA_PLANTILLA.length);
    // Cada campo que se acepta (salvo los alternativos) está en la plantilla.
    const enPlantilla = new Set(columnas.values());
    for (const c of COLUMNAS) if (!["nombreCompleto", "coordenadas"].includes(c.campo)) expect(enPlantilla.has(c.campo), c.campo).toBe(true);
  });
});

describe("los datos de cada renglón", () => {
  it("el teléfono queda en sus diez dígitos, escriba como se escriba", () => {
    expect(telefonoDeDiezDigitos("33 1234 5678")).toBe("3312345678");
    expect(telefonoDeDiezDigitos("(33) 1234-5678")).toBe("3312345678");
    expect(telefonoDeDiezDigitos("+52 33 1234 5678")).toBe("3312345678");
    expect(telefonoDeDiezDigitos("52 1 33 1234 5678")).toBe("3312345678");
    expect(telefonoDeDiezDigitos("331234567")).toBeNull();
    expect(telefonoDeDiezDigitos("")).toBeNull();
  });

  it("el nombre: por partes o completo", () => {
    expect(nombreDelRenglon({ nombre: "Ana", apellidoPaterno: "López", apellidoMaterno: "Ruiz" }).displayName).toBe("Ana López Ruiz");
    expect(nombreDelRenglon({ nombreCompleto: "Ana López" })).toMatchObject({ displayName: "Ana López", firstName: "" });
    expect(nombreDelRenglon({}).displayName).toBe("");
  });

  it("la fecha de nacimiento: día/mes/año, AAAA-MM-DD o número de serie de Excel; la que no existe es error", () => {
    const hoy = new Date(Date.UTC(2026, 10, 21));
    expect(fechaDelRenglon("15/03/1990", hoy)).toEqual({ dia: 15, mes: 3, anio: 1990 });
    expect(fechaDelRenglon("1990-03-15", hoy)).toEqual({ dia: 15, mes: 3, anio: 1990 });
    expect(fechaDelRenglon("5-7-85", hoy)).toEqual({ dia: 5, mes: 7, anio: 1985 });
    expect(fechaDelRenglon("5.7.05", hoy)).toEqual({ dia: 5, mes: 7, anio: 2005 });
    expect(fechaDelRenglon("32947", hoy)).toEqual({ dia: 15, mes: 3, anio: 1990 });
    expect(fechaDelRenglon("31/02/1990", hoy)).toBe("invalida");
    // Un año solo no es una fecha (antes se leía como número de serie: «1985» daba 1905).
    expect(fechaDelRenglon("1985", hoy)).toBe("invalida");
    expect(fechaDelRenglon("01/01/2030", hoy)).toBe("invalida");
    expect(fechaDelRenglon("ayer", hoy)).toBe("invalida");
    expect(fechaDelRenglon(undefined, hoy)).toBeNull();
  });

  it("latitud y longitud: en dos columnas o en una; con coma decimal; lo que no se entiende es error", () => {
    expect(coordenadasDelRenglon({ latitud: "20.62", longitud: "-103.24" })).toEqual({ lat: 20.62, lng: -103.24 });
    expect(coordenadasDelRenglon({ latitud: "20,62", longitud: "-103,24" })).toEqual({ lat: 20.62, lng: -103.24 });
    expect(coordenadasDelRenglon({ coordenadas: "20.62, -103.24" })).toEqual({ lat: 20.62, lng: -103.24 });
    expect(coordenadasDelRenglon({ latitud: "20.62" })).toBe("invalida");
    expect(coordenadasDelRenglon({ latitud: "norte", longitud: "-103" })).toBe("invalida");
    expect(coordenadasDelRenglon({ latitud: "120", longitud: "-103" })).toBe("invalida");
    expect(coordenadasDelRenglon({})).toBeNull();
  });

  it("la sección: un entero positivo, aunque diga «Sección»", () => {
    expect(seccionDelRenglon("2704")).toBe(2704);
    expect(seccionDelRenglon("Sección 2704")).toBe(2704);
    expect(seccionDelRenglon("27.5")).toBe("invalida");
    expect(seccionDelRenglon("dos")).toBe("invalida");
    expect(seccionDelRenglon(undefined)).toBeNull();
  });

  it("el mismo teléfono dos veces en el archivo: del segundo en adelante, el renglón del primero", () => {
    const repetidos = repetidosEnElArchivo([
      { renglon: 2, datos: { telefono: "3312345678" } },
      { renglon: 3, datos: { telefono: "+52 33 1234 5678" } },
      { renglon: 4, datos: { telefono: "3399999999" } },
      { renglon: 5, datos: { telefono: "33-1234-5678" } },
      { renglon: 6, datos: {} }
    ]);
    expect([...repetidos.entries()]).toEqual([[3, 2], [5, 2]]);
  });
});
