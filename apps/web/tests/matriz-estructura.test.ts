import "dotenv/config";

import crypto from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { ActorContext } from "@tonala/shared/auth";
import { schema } from "@tonala/shared/database";

import type * as AyudantesApi from "@/lib/api-helpers";

import { crearBaseDesechable } from "./base-desechable";
import { crearEstructuraDePrueba, type EstructuraDePrueba, type Persona } from "./estructura-de-prueba";

/**
 * La matriz de Estructura Electoral del plan de auditoría de menús (§4.4), contra la API, con las cuentas de
 * `estructura-de-prueba.ts` (dos direcciones en Tonalá y una en Zapopan): quién ve la cobertura y qué cuenta
 * (D11), a quién nombra cada perfil y qué puede cambiar.
 */

const sesion: { actor: ActorContext | null } = { actor: null };
vi.mock("@/lib/api-helpers", async (importarOriginal) => {
  const original = await importarOriginal<typeof AyudantesApi>();
  return { ...original, actorFromSession: async () => sesion.actor };
});

const nombrarRuta = await import("../app/api/electoral/representatives/route");
const unoRuta = await import("../app/api/electoral/representatives/[id]/route");
const coberturaRuta = await import("../app/api/electoral/cobertura/route");

let base: Awaited<ReturnType<typeof crearBaseDesechable>>;
let x: EstructuraDePrueba;
const db = async () => (await import("@/lib/db-client")).getDatabaseClient();
const id = () => crypto.randomUUID();
const como = (p: Persona) => {
  sesion.actor = x.actor(p);
};
const json = (url: string, method: string, cuerpo?: unknown) =>
  new Request(`http://localhost${url}`, { method, headers: { "Content-Type": "application/json" }, ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) }) });

const s = { a: id(), b: id(), c: id(), z: id(), z2: id() };
const NUM = { a: 9801, b: 9802, c: 9803, z: 9811, z2: 9812 };
const vecinaDeM1 = id();
const r = { M1: id(), M3: id(), M4: id(), M5: id(), vecinaPorAT: id() };

beforeAll(async () => {
  base = await crearBaseDesechable("matriz_estructura");
  x = await crearEstructuraDePrueba(await db());
  const d = await db();
  await d.insert(schema.electoralSections).values([
    { id: s.a, sectionNum: NUM.a, municipality: "Tonalá" },
    { id: s.b, sectionNum: NUM.b, municipality: "Tonalá" },
    { id: s.c, sectionNum: NUM.c, municipality: "Tonalá" },
    { id: s.z, sectionNum: NUM.z, municipality: "Zapopan" },
    { id: s.z2, sectionNum: NUM.z2, municipality: "Zapopan" }
  ]);
  await d.insert(schema.contacts).values({ id: vecinaDeM1, displayName: "zz Vecina de M1", status: "active", createdByUserId: x.u.M1, municipality: "Tonalá", createdAt: new Date() });
  await d.insert(schema.electoralRepresentatives).values([
    { id: r.M1, sectionId: s.a, userId: x.u.M1, role: "coordinador", assignedByUserId: x.u.L1 },
    { id: r.M3, sectionId: s.a, userId: x.u.M3, role: "representante_general", assignedByUserId: x.u.L2 },
    { id: r.M4, sectionId: s.a, userId: x.u.M4, role: "representante_casilla", casilla: "B", assignedByUserId: x.u.L4 },
    { id: r.M5, sectionId: s.z, userId: x.u.M5, role: "coordinador", assignedByUserId: x.u.L3 },
    { id: r.vecinaPorAT, sectionId: s.b, contactId: vecinaDeM1, role: "representante_general", assignedByUserId: x.u.AT }
  ]);
}, 120_000);

afterAll(async () => {
  await base?.borrar();
});

async function conteoEn(p: Persona, numero: number, municipio?: string) {
  como(p);
  const res = await coberturaRuta.POST(json("/api/electoral/cobertura", "POST", { q: String(numero), ...(municipio ? { municipio } : {}) }));
  const cuerpo = await res.json();
  return { estado: res.status, conteo: cuerpo.filas?.find((f: { numero: number }) => f.numero === numero)?.conteo };
}

describe("ver cobertura (§4.4)", () => {
  it("la abren administración, dirección y líder; capturista y brigadista no", async () => {
    for (const p of ["MA", "AT", "D", "DB", "L1", "AZ"] as const) expect((await conteoEn(p, NUM.a)).estado, p).toBe(200);
    for (const p of ["K1", "M1"] as const) expect((await conteoEn(p, NUM.a)).estado, p).toBe(403);
  });

  it("cada perfil cuenta solo lo de su estructura (D11); la administración, todo su municipio", async () => {
    const esperado: Array<[Persona, [number, number, number]]> = [
      ["MA", [1, 1, 1]],
      ["AT", [1, 1, 1]],
      ["D", [1, 1, 0]],
      ["DB", [0, 0, 1]],
      ["L1", [1, 0, 0]],
      ["L2", [0, 1, 0]]
    ];
    for (const [p, [coordinador, rg, rc]] of esperado) {
      expect((await conteoEn(p, NUM.a)).conteo, p).toEqual({ coordinador, representante_general: rg, representante_casilla: rc });
    }
    // Zapopan no ve Tonalá: su cobertura es la de su municipio.
    expect((await conteoEn("AZ", NUM.a)).conteo).toBeUndefined();
    expect((await conteoEn("AZ", NUM.z)).conteo).toEqual({ coordinador: 1, representante_general: 0, representante_casilla: 0 });
    expect((await conteoEn("MA", NUM.z, "Zapopan")).conteo).toEqual({ coordinador: 1, representante_general: 0, representante_casilla: 0 });
  });
});

describe("nombrar a una cuenta (§4.4)", () => {
  it("el maestro a cualquiera; la administración a su municipio; la dirección a su mando; el líder a su brigada", async () => {
    const casos: Array<[Persona, string, Persona, number]> = [
      ["MA", s.z2, "M1", 201],
      ["AT", s.c, "M4", 201],
      ["AT", s.c, "M5", 403],
      ["AT", s.z2, "M2", 403],
      ["D", s.c, "M3", 201],
      ["D", s.c, "M4", 403],
      ["DB", s.c, "M1", 403],
      ["L1", s.c, "M2", 201],
      ["L1", s.c, "M3", 403],
      ["AZ", s.z2, "M5", 201],
      ["AZ", s.z2, "M2", 403],
      ["K1", s.c, "K2", 403],
      ["M1", s.c, "M1", 403]
    ];
    for (const [p, seccion, persona, estado] of casos) {
      como(p);
      const res = await nombrarRuta.POST(json("/api/electoral/representatives", "POST", { sectionId: seccion, role: "representante_casilla", userId: x.u[persona] }));
      expect(res.status, `${p} nombra a ${persona}`).toBe(estado);
    }
  });

  it("a un ciudadano: quien lo ve, sí; quien no, 404", async () => {
    const casos: Array<[Persona, number]> = [
      ["L1", 201],
      ["DB", 404],
      ["L2", 404]
    ];
    for (const [p, estado] of casos) {
      como(p);
      const res = await nombrarRuta.POST(json("/api/electoral/representatives", "POST", { sectionId: s.c, role: "coordinador", contactId: vecinaDeM1 }));
      expect(res.status, p).toBe(estado);
    }
  });
});

describe("cambiar rol o casilla, quitar (§4.4)", () => {
  it("lo cambia quien gobierna a la persona o a quien la nombró; lo que no se ve es 404; lo que se ve y no le toca, 403", async () => {
    const casos: Array<[keyof typeof r, Persona, number]> = [
      ["M1", "MA", 200],
      ["M1", "AT", 200],
      ["M1", "D", 200],
      ["M1", "L1", 200],
      ["M1", "L2", 404],
      ["M1", "DB", 404],
      ["M1", "AZ", 404],
      ["M3", "D", 200],
      ["M3", "L2", 200],
      ["M3", "L1", 404],
      ["M4", "DB", 200],
      ["M4", "D", 404],
      ["M5", "AZ", 200],
      ["M5", "AT", 404],
      ["M5", "MA", 200],
      ["vecinaPorAT", "AT", 200],
      ["vecinaPorAT", "D", 403],
      ["vecinaPorAT", "L1", 403],
      ["vecinaPorAT", "DB", 404]
    ];
    const rolDe: Record<keyof typeof r, string> = {
      M1: "coordinador",
      M3: "representante_general",
      M4: "representante_casilla",
      M5: "coordinador",
      vecinaPorAT: "representante_general"
    };
    for (const [fila, p, estado] of casos) {
      como(p);
      // Se guarda el mismo rol: la prueba mira quién puede, sin mover los datos de las demás filas.
      const res = await unoRuta.PATCH(json(`/api/electoral/representatives/${r[fila]}`, "PATCH", { role: rolDe[fila] }), { params: Promise.resolve({ id: r[fila] }) });
      expect(res.status, `${p} cambia ${fila}`).toBe(estado);
    }
  });

  it("quitar sigue la misma regla", async () => {
    como("DB");
    expect((await unoRuta.DELETE(json("/x", "DELETE"), { params: Promise.resolve({ id: r.M1 }) })).status).toBe(404);
    como("L1");
    expect((await unoRuta.DELETE(json("/x", "DELETE"), { params: Promise.resolve({ id: r.vecinaPorAT }) })).status).toBe(403);
    como("L2");
    expect((await unoRuta.DELETE(json("/x", "DELETE"), { params: Promise.resolve({ id: r.M3 }) })).status).toBe(200);
  });
});
