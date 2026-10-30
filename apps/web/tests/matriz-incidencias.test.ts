import "dotenv/config";

import crypto from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { ActorContext } from "@tonala/shared/auth";
import { schema } from "@tonala/shared/database";

import type * as AyudantesApi from "@/lib/api-helpers";

import { crearBaseDesechable } from "./base-desechable";
import { crearEstructuraDePrueba, type EstructuraDePrueba, type Persona } from "./estructura-de-prueba";

/**
 * La matriz de Incidencias del plan de auditoría de menús (§4.2), contra la API y con las seis cuentas:
 * quién consulta la lista, quién asigna y a quién, y que la lista nunca ofrezca trabajar lo que el servidor
 * después rechaza (ni al revés).
 */

const sesion: { actor: ActorContext | null } = { actor: null };
vi.mock("@/lib/api-helpers", async (importarOriginal) => {
  const original = await importarOriginal<typeof AyudantesApi>();
  return { ...original, actorFromSession: async () => sesion.actor };
});

const consultaRuta = await import("../app/api/incidencias/consulta/route");
const registro = await import("../app/api/map/reports/[id]/route");

const id = (): string => crypto.randomUUID();
const e = { deL1: id(), deM1: id(), deL2: id(), deL4: id(), deL3: id(), deL4EnB1: id() };

let base: Awaited<ReturnType<typeof crearBaseDesechable>>;
let x: EstructuraDePrueba;
const db = async () => (await import("@/lib/db-client")).getDatabaseClient();
const como = (p: Persona) => {
  sesion.actor = x.actor(p);
};

async function consultar(p: Persona, cuerpo: Record<string, unknown> = { vista: "todas" }) {
  como(p);
  const r = await consultaRuta.POST(new Request("http://localhost/api/incidencias/consulta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) }));
  return { estado: r.status, cuerpo: await r.json() };
}

async function asignar(p: Persona, incidencia: string, destino: Record<string, unknown>) {
  como(p);
  const r = await registro.PATCH(
    new Request(`http://localhost/api/map/reports/${incidencia}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(destino) }),
    { params: Promise.resolve({ id: incidencia }) }
  );
  return r.status;
}

beforeAll(async () => {
  base = await crearBaseDesechable("matriz_incidencias");
  x = await crearEstructuraDePrueba(await db());
  const incidencia = (eid: string, autor: Persona, extra: Partial<typeof schema.eventReports.$inferInsert> = {}) => ({
    id: eid,
    title: `zz ${eid.slice(0, 6)}`,
    description: "Matriz de incidencias",
    latitude: 20.62,
    longitude: -103.24,
    category: "bache",
    createdByUserId: x.u[autor],
    status: "active",
    ...extra
  });
  await (await db()).insert(schema.eventReports).values([
    incidencia(e.deL1, "L1"),
    incidencia(e.deM1, "M1", { status: "pendiente" }),
    incidencia(e.deL2, "L2"),
    incidencia(e.deL4, "L4"),
    incidencia(e.deL3, "L3"),
    incidencia(e.deL4EnB1, "L4", { assignedTeamId: x.t.B1 })
  ]);
}, 120_000);

afterAll(async () => {
  await base?.borrar();
});

describe("quién consulta la lista de Incidencias", () => {
  it("quien coordina, sí; capturista y brigadista, no (403)", async () => {
    for (const p of ["MA", "AT", "D", "L1"] as const) expect((await consultar(p)).estado, p).toBe(200);
    for (const p of ["K1", "M1"] as const) expect((await consultar(p)).estado, p).toBe(403);
  });

  it("cada perfil ve exactamente lo de su alcance", async () => {
    const ids = async (p: Persona) => ((await consultar(p)).cuerpo.filas as Array<{ id: string }>).map((f) => f.id).filter((i) => Object.values(e).includes(i)).sort();
    expect(await ids("L1")).toEqual([e.deL1, e.deM1, e.deL4EnB1].sort());
    expect(await ids("L2")).toEqual([e.deL2]);
    expect(await ids("D")).toEqual([e.deL1, e.deM1, e.deL2, e.deL4EnB1].sort());
    expect(await ids("DB")).toEqual([e.deL4, e.deL4EnB1].sort());
    expect(await ids("AT")).toEqual([e.deL1, e.deM1, e.deL2, e.deL4, e.deL4EnB1].sort());
    expect(await ids("DZ")).toEqual([e.deL3]);
    expect(await ids("MA")).toEqual(Object.values(e).sort());
  });

  it("un cuerpo que no es JSON: 400", async () => {
    como("L1");
    const r = await consultaRuta.POST(new Request("http://localhost/api/incidencias/consulta", { method: "POST", body: "{nada" }));
    expect(r.status).toBe(400);
  });
});

describe("lo que la lista ofrece trabajar es lo que el servidor deja", () => {
  it("para cada perfil y cada incidencia que ve, «puedeTrabajar» coincide con la regla del servidor", async () => {
    const { cargarContextoIncidencia, puedeSobreIncidencia } = await import("@/lib/permisos-incidencias");
    for (const p of ["MA", "AT", "D", "DB", "L1", "L2"] as const) {
      const filas = (await consultar(p)).cuerpo.filas as Array<{ id: string; puedeTrabajar: boolean }>;
      for (const f of filas.filter((r) => Object.values(e).includes(r.id))) {
        const c = await cargarContextoIncidencia(f.id, x.u[p]);
        const servidor = Boolean(c.incidencia && puedeSobreIncidencia("actualizar", c.incidencia, x.u[p], c.esAdmin, c.equipos, c.personas));
        expect(f.puedeTrabajar, `${p} · ${x.quien(f.id)}`).toBe(servidor);
      }
    }
  });
});

describe("asignar", () => {
  it("el líder asigna a su gente y a su brigada; fuera de su estructura, 403", async () => {
    expect(await asignar("L1", e.deL1, { assignedToUserId: x.u.M2 })).toBe(200);
    expect(await asignar("L1", e.deL1, { assignedTeamId: x.t.B1 })).toBe(200);
    expect(await asignar("L1", e.deL1, { assignedToUserId: x.u.M4 })).toBe(403);
    expect(await asignar("L1", e.deL1, { assignedTeamId: x.t.B4 })).toBe(403);
  });

  it("la dirección asigna dentro de su cascada, no a la otra dirección del municipio", async () => {
    expect(await asignar("D", e.deL1, { assignedTeamId: x.t.B2 })).toBe(200);
    expect(await asignar("D", e.deL1, { assignedTeamId: x.t.B4 })).toBe(403);
  });

  it("la administración municipal asigna en su municipio, no en otro", async () => {
    expect(await asignar("AT", e.deL1, { assignedTeamId: x.t.B4 })).toBe(200);
    expect(await asignar("AT", e.deL1, { assignedTeamId: x.t.B3 })).toBe(403);
  });

  it("quien no coordina no reasigna, aunque la incidencia le toque", async () => {
    expect(await asignar("L1", e.deL1, { assignedToUserId: x.u.M1 })).toBe(200);
    expect(await asignar("M1", e.deL1, { assignedToUserId: x.u.M2 })).toBe(403);
  });
});
