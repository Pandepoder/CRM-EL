import { describe, expect, it, vi } from "vitest";

import { crearUnaSolaVez, esViolacionUnica } from "./idempotencia";

/** Como llega de Drizzle: el error de Postgres en `cause`. */
const choque = (constraint: string) => Object.assign(new Error("Failed query: insert …"), { cause: { code: "23505", constraint } });

type Fila = { id: string; dueno: string };

function escenario(opciones: { previa?: Fila; alCrear: () => Promise<Fila>; despuesDelChoque?: Fila }) {
  let llamadas = 0;
  const buscar = vi.fn(async () => {
    llamadas++;
    return llamadas === 1 ? opciones.previa : opciones.despuesDelChoque;
  });
  const crear = vi.fn(opciones.alCrear);
  const correr = (clave: string | null, quien = "ana") =>
    crearUnaSolaVez<Fila>({ clave, indice: "tabla_client_request_idx", buscar, crear, creadaPor: (f) => f.dueno, quien });
  return { buscar, crear, correr };
}

describe("esViolacionUnica", () => {
  it("reconoce el 23505 en el error o en su causa, y distingue el índice", () => {
    expect(esViolacionUnica({ code: "23505" })).toBe(true);
    expect(esViolacionUnica(choque("tabla_client_request_idx"))).toBe(true);
    expect(esViolacionUnica(choque("tabla_client_request_idx"), "tabla_client_request_idx")).toBe(true);
    expect(esViolacionUnica(choque("otro_idx"), "tabla_client_request_idx")).toBe(false);
    expect(esViolacionUnica(new Error("otra cosa"))).toBe(false);
    expect(esViolacionUnica(null)).toBe(false);
  });
});

describe("crearUnaSolaVez", () => {
  it("sin clave crea sin buscar (clientes que todavía no la mandan)", async () => {
    const e = escenario({ alCrear: async () => ({ id: "n", dueno: "ana" }) });
    expect(await e.correr(null)).toEqual({ ok: true, fila: { id: "n", dueno: "ana" }, repetida: false });
    expect(e.buscar).not.toHaveBeenCalled();
  });

  it("con una clave ya usada por la misma persona devuelve lo creado y no crea otro", async () => {
    const e = escenario({ previa: { id: "vieja", dueno: "ana" }, alCrear: async () => ({ id: "n", dueno: "ana" }) });
    expect(await e.correr("k")).toEqual({ ok: true, fila: { id: "vieja", dueno: "ana" }, repetida: true });
    expect(e.crear).not.toHaveBeenCalled();
  });

  it("la clave de otra persona no entrega su registro", async () => {
    const e = escenario({ previa: { id: "ajena", dueno: "beto" }, alCrear: async () => ({ id: "n", dueno: "ana" }) });
    expect(await e.correr("k")).toEqual({ ok: false, motivo: "clave_ajena" });
    expect(e.crear).not.toHaveBeenCalled();
  });

  it("dos envíos a la vez: el que pierde contra el índice recibe lo que creó el otro", async () => {
    const e = escenario({
      alCrear: async () => { throw choque("tabla_client_request_idx"); },
      despuesDelChoque: { id: "ganadora", dueno: "ana" }
    });
    expect(await e.correr("k")).toEqual({ ok: true, fila: { id: "ganadora", dueno: "ana" }, repetida: true });
  });

  it("cualquier otro error sigue siendo error: no se disfraza de reintento", async () => {
    const otro = choque("otro_idx");
    const e = escenario({ alCrear: async () => { throw otro; } });
    await expect(e.correr("k")).rejects.toBe(otro);
    const caido = new Error("connection refused");
    const e2 = escenario({ alCrear: async () => { throw caido; } });
    await expect(e2.correr("k")).rejects.toBe(caido);
  });
});
