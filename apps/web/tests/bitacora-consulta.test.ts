import "dotenv/config";

import crypto from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { schema } from "@tonala/shared/database";

import type * as Consulta from "@/lib/bitacora-consulta";
import type * as Jerarquia from "@/lib/network-hierarchy";

import { crearBaseDesechable } from "./base-desechable";
import { crearEstructuraDePrueba, type EstructuraDePrueba, type Persona } from "./estructura-de-prueba";

/**
 * La lista de la Agenda (`lib/bitacora-consulta.ts`): cada vista, «Mi agenda» contra «Todo mi equipo», el filtro por
 * persona (solo de su alcance), que una visita agendada desde una actividad salga una sola vez, el buscador y quién
 * ve la actividad de quién. Estructura en `estructura-de-prueba.ts`. Las fechas se arman desde el inicio del día de
 * hoy en Jalisco, para que la prueba no dependa de la hora a la que corre.
 */

const id = (): string => crypto.randomUUID();
const a = {
  vencida: id(), proxima: id(), deHoy: id(), seguimiento: id(), archivada: id(),
  deM1: id(), conVisita: id(), deM3: id(), deM4: id(), deM5: id()
};
const v = { suelta: id(), ligada: id() };
const nuestras = new Set<string>([...Object.values(a), ...Object.values(v)]);

let base: Awaited<ReturnType<typeof crearBaseDesechable>>;
let x: EstructuraDePrueba;
let consulta: typeof Consulta;
let alcance: typeof Jerarquia.resolveUserNetworkScope;

async function pagina(p: Persona, sp: Record<string, string> = {}) {
  return consulta.consultarBitacora(consulta.crearContexto(await alcance(x.u[p])), consulta.leerFiltros({ vista: "todas", ...sp }));
}
async function ids(p: Persona, sp: Record<string, string> = {}) {
  return (await pagina(p, sp)).items.map((i) => i.id).filter((i) => nuestras.has(i)).sort();
}
const orden = (...lista: string[]) => [...lista].sort();

beforeAll(async () => {
  base = await crearBaseDesechable("bitacora");
  const db = (await import("@/lib/db-client")).getDatabaseClient();
  consulta = await import("@/lib/bitacora-consulta");
  alcance = (await import("@/lib/network-hierarchy")).resolveUserNetworkScope;
  const { inicioDeDia } = await import("@/lib/actividades");
  x = await crearEstructuraDePrueba(db);

  const hoy = inicioDeDia(new Date());
  const dia = (n: number, minutos = 0) => new Date(hoy.getTime() + n * 86_400_000 + minutos * 60_000);

  const [tipo] = await db
    .insert(schema.activityCatalogOptions)
    .values({ kind: "type", key: `zz-${id().slice(0, 6)}`, name: "zz Recorrido", normalizedName: `zz recorrido ${id().slice(0, 6)}`, createdByUserId: x.u.MA })
    .returning({ id: schema.activityCatalogOptions.id });
  const catalogo = id();
  const colonia = id();
  await db.insert(schema.catalogVersions).values({ id: catalogo, catalogType: "colonies", sourceName: "zz-agenda", sourceVersion: "v1" });
  await db.insert(schema.colonies).values({ id: colonia, catalogVersionId: catalogo, name: "zz Colonia de la Agenda", municipality: "Tonalá", status: "active" });
  const vecino = id();
  await db.insert(schema.contacts).values({ id: vecino, displayName: "zz Vecino de M1", status: "active", createdByUserId: x.u.M1, municipality: "Tonalá", createdAt: new Date() });

  const visita = (vid: string) => ({
    id: vid,
    contactId: vecino,
    colonyId: colonia,
    assignedUserId: x.u.M1,
    scheduledAt: dia(2, 60),
    status: "scheduled",
    visitLocationText: "zz Domicilio",
    createdByUserId: x.u.M1,
    createdAt: new Date()
  });
  await db.insert(schema.visits).values([visita(v.suelta), visita(v.ligada)]);

  const cerrada = (n: number) => ({ closedAt: dia(n, 30), closedByUserId: x.u.L1 });
  const actividad = (aid: string, quien: Persona, extra: Partial<typeof schema.eventReports.$inferInsert> = {}) => ({
    id: aid,
    title: `zz actividad ${aid.slice(0, 6)}`,
    description: "Prueba de la Agenda",
    latitude: 20.62,
    longitude: -103.24,
    category: "brigada",
    activityTypeId: tipo!.id,
    createdByUserId: x.u[quien],
    assignedToUserId: x.u[quien],
    status: "active",
    eventDate: dia(-1),
    ...extra
  });
  await db.insert(schema.eventReports).values([
    actividad(a.vencida, "L1", { eventDate: dia(-3) }),
    actividad(a.proxima, "L1", { eventDate: dia(3) }),
    // Cerrada y con fecha de hoy (un minuto después de medianoche): está en «Hoy» a cualquier hora.
    actividad(a.deHoy, "L1", { status: "resolved", eventDate: dia(0, 1), ...cerrada(0) }),
    actividad(a.seguimiento, "L1", { status: "resolved", outcome: "follow_up_required", eventDate: dia(-10), ...cerrada(-10) }),
    actividad(a.archivada, "L1", { status: "archived", eventDate: dia(-5), ...cerrada(-5) }),
    actividad(a.deM1, "M1", { title: "zz Asamblea en la calle Juárez" }),
    // La actividad que agendó la visita ligada: la visita no se lista aparte.
    actividad(a.conVisita, "M1", { eventDate: dia(2, 60), visitId: v.ligada }),
    actividad(a.deM3, "M3"),
    actividad(a.deM4, "M4"),
    actividad(a.deM5, "M5")
  ]);
}, 120_000);

afterAll(async () => {
  await base?.borrar();
});

describe("las vistas de «Mi agenda»", () => {
  it("cada vista trae lo suyo; lo archivado solo en el historial", async () => {
    expect(await ids("L1")).toEqual(orden(a.vencida, a.proxima, a.deHoy, a.seguimiento));
    expect(await ids("L1", { vista: "hoy" })).toEqual([a.deHoy]);
    expect(await ids("L1", { vista: "vencidas" })).toEqual([a.vencida]);
    expect(await ids("L1", { vista: "proximas" })).toEqual([a.proxima]);
    expect(await ids("L1", { vista: "seguimiento" })).toEqual([a.seguimiento]);
    expect(await ids("L1", { vista: "historial" })).toEqual(orden(a.deHoy, a.seguimiento, a.archivada));
    expect(await ids("L1", { vista: "semana" })).toContain(a.deHoy);
    expect(await ids("L1", { vista: "mes" })).toContain(a.deHoy);
  });

  it("los números de las vistas rápidas cuentan lo mismo que listan", async () => {
    expect((await pagina("L1")).conteos).toEqual({ hoy: 1, vencidas: 1, proximas: 1, seguimiento: 1, historial: 3 });
  });

  it("«Mi agenda» es lo propio, aunque se pida «Todo mi equipo» sin poder asignar", async () => {
    expect(await ids("L1", { scope: "mis" })).not.toContain(a.deM1);
    // Quien no asigna (brigadista, capturista) ve su agenda aunque pida el equipo. Al brigadista ya lo acota su
    // alcance; a la capturista, que sí ve a sus compañeros en otras pantallas, solo esta regla.
    expect(await ids("M1", { scope: "equipo" })).toEqual(orden(a.deM1, a.conVisita, v.suelta));
    expect(await ids("K1", { scope: "equipo" })).toEqual([]);
  });
});

describe("«Todo mi equipo» y quién ve qué", () => {
  it("la visita agendada desde una actividad sale una sola vez", async () => {
    const r = (await pagina("L1", { scope: "equipo" })).items.map((i) => i.id);
    expect(r.filter((i) => i === a.conVisita)).toHaveLength(1);
    expect(r).not.toContain(v.ligada);
    expect(r).toContain(v.suelta);
  });

  it("cada quien ve su estructura y nada de otra brigada, dirección o municipio", async () => {
    const de = async (p: Persona) => (await ids(p, { scope: "equipo" })).filter((i) => [a.deM1, a.deM3, a.deM4, a.deM5].includes(i));
    expect(await de("L1")).toEqual([a.deM1]);
    expect(await de("L2")).toEqual([a.deM3]);
    expect(await de("D")).toEqual(orden(a.deM1, a.deM3));
    expect(await de("DB")).toEqual([a.deM4]);
    expect(await de("DZ")).toEqual([a.deM5]);
    expect(await de("AT")).toEqual(orden(a.deM1, a.deM3, a.deM4));
    expect(await de("AZ")).toEqual([a.deM5]);
    expect(await de("MA")).toEqual(orden(a.deM1, a.deM3, a.deM4, a.deM5));
  });
});

describe("el filtro por persona (`responsable=`)", () => {
  it("una persona de su alcance: solo lo de ella, visitas incluidas", async () => {
    expect(await ids("L1", { scope: "equipo", responsable: x.u.M1 })).toEqual(orden(a.deM1, a.conVisita, v.suelta));
  });

  it("alguien de fuera o un id inventado no amplían nada: la misma lista que sin filtro", async () => {
    const sinFiltro = await ids("L1", { scope: "equipo" });
    for (const otro of [x.u.M3, x.u.M5, id()]) expect(await ids("L1", { scope: "equipo", responsable: otro })).toEqual(sinFiltro);
    expect(await ids("M1", { responsable: x.u.M3 })).toEqual(await ids("M1"));
  });
});

describe("el buscador", () => {
  it("encuentra por el título de la actividad y por el nombre del vecino de una visita", async () => {
    expect(await ids("L1", { scope: "equipo", q: "juárez" })).toEqual([a.deM1]);
    expect(await ids("L1", { scope: "equipo", q: "vecino de m1" })).toEqual([v.suelta]);
  });
});
