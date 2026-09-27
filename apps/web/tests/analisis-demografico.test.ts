import "dotenv/config";

import crypto from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { schema } from "@tonala/shared/database";

import { crearBaseDesechable } from "./base-desechable";

/**
 * Análisis demográfico contra una base desechable: cuenta solo lo que quien consulta puede ver, en días
 * y horas de Jalisco, y agrupa lo que se escribió a mano.
 *
 * Dos estructuras: la del líder L (con su brigadista B) en Tonalá y la del líder O en Zapopan.
 */

const id = () => crypto.randomUUID();
const u = { L: id(), B: id(), O: id() };
const equipo = { T: id(), Z: id() };
const ciudadano = { c1: id(), c2: id(), c3: id(), c4: id(), baja: id() };
// 26 de septiembre de 2026, 14:00 en Jalisco.
const AHORA = new Date("2026-09-26T20:00:00Z");
let base: Awaited<ReturnType<typeof crearBaseDesechable>>;

beforeAll(async () => {
  base = await crearBaseDesechable("analisis");
  const { getDatabaseClient } = await import("@/lib/db-client");
  const db = getDatabaseClient();
  const roles = Object.fromEntries((await db.select({ id: schema.roles.id, key: schema.roles.key }).from(schema.roles)).map((r) => [r.key, r.id]));
  await db.insert(schema.userProfiles).values([
    { id: u.L, email: "zz-lider-an@prueba.local", displayName: "zz-lider", roleId: roles.territorial_coordinator!, status: "active", municipality: "Tonalá" },
    { id: u.B, email: "zz-brig-an@prueba.local", displayName: "zz-brigadista", roleId: roles.visit_responsible!, status: "active", municipality: "Tonalá" },
    { id: u.O, email: "zz-otro-an@prueba.local", displayName: "zz-otro", roleId: roles.territorial_coordinator!, status: "active", municipality: "Zapopan" }
  ]);
  await db.insert(schema.teams).values([
    { id: equipo.T, name: "zz-Brigada Centro", leaderId: u.L, municipality: "Tonalá" },
    { id: equipo.Z, name: "zz-Brigada Zapopan", leaderId: u.O, municipality: "Zapopan" }
  ]);
  await db.insert(schema.teamMembers).values({ teamId: equipo.T, userId: u.B });
  const alta = (cid: string, autor: string, creado: string, extra: Partial<typeof schema.contacts.$inferInsert> = {}) => ({
    id: cid,
    displayName: `zz-${cid.slice(0, 6)}`,
    status: "active",
    createdByUserId: autor,
    createdAt: new Date(creado),
    version: 1,
    ...extra
  });
  await db.insert(schema.contacts).values([
    // Domingo 20 de septiembre, 12:00 en Jalisco.
    alta(ciudadano.c1, u.L, "2026-09-20T18:00:00Z", {
      origin: "evento", panMilitancy: "confirmada", birthDate: new Date(Date.UTC(1990, 4, 10)), colony: "Centro",
      availability: "Voluntario activo", preferredContactMethod: "whatsapp", preferredContactTime: "manana"
    }),
    // Viernes 25 de septiembre, 21:30 en Jalisco (ya es 26 en UTC). Sin año de nacimiento capturado.
    alta(ciudadano.c2, u.L, "2026-09-26T03:30:00Z", {
      origin: "toca_toca", birthDate: new Date(Date.UTC(2000, 0, 1)), birthYearKnown: false, colony: "  centro ",
      availability: "Simpatizante"
    }),
    alta(ciudadano.c3, u.B, "2026-08-01T15:00:00Z", { origin: "toca_toca", birthDate: new Date(Date.UTC(1960, 1, 1)), colony: "Alfareros" }),
    alta(ciudadano.c4, u.O, "2026-09-26T15:00:00Z", { origin: "evento", panMilitancy: "confirmada", colony: "Tabachines" }),
    alta(ciudadano.baja, u.L, "2026-09-21T15:00:00Z", { status: "inactive", origin: "otro" })
  ]);
  await db.insert(schema.socialSurveys).values([
    { contactId: ciudadano.c1, colonyPriorityNeed: "Seguridad", servicesRating: 4 },
    { contactId: ciudadano.c4, colonyPriorityNeed: "Agua potable", servicesRating: 1 }
  ]);
}, 180_000);

afterAll(async () => {
  await base?.borrar();
});

async function analisisDe(persona: string) {
  const { analisisDemografico } = await import("@/lib/analisis-demografico");
  const { resolveUserNetworkScope } = await import("@/lib/network-hierarchy");
  return analisisDemografico(await resolveUserNetworkScope(persona), { ahora: AHORA });
}

describe("Análisis demográfico", () => {
  it("cuenta solo los ciudadanos activos que la persona puede ver", async () => {
    const a = await analisisDe(u.L);
    expect(a.totales.ciudadanos).toBe(3);
    expect(a.origen).toEqual([
      { clave: "toca_toca", etiqueta: "Toca a toca", total: 2 },
      { clave: "evento", etiqueta: "Evento", total: 1 }
    ]);
    expect(a.totales.confirmados).toBe(1);
    const o = await analisisDe(u.O);
    expect(o.totales.ciudadanos).toBe(1);
    expect(o.origen).toEqual([{ clave: "evento", etiqueta: "Evento", total: 1 }]);
  });

  it("las encuestas, solo de los ciudadanos que ve", async () => {
    const a = await analisisDe(u.L);
    expect(a.necesidades).toEqual([{ clave: "seguridad", etiqueta: "Seguridad", total: 1 }]);
    expect(a.totales.calificacionPromedio).toBe(4);
    expect(a.totales.escalaCalificacion).toBe(5);
  });

  it("los días y las horas son los de Jalisco", async () => {
    const a = await analisisDe(u.L);
    const dia = (d: string) => a.crecimiento.find((x) => x.dia === d)?.nuevos;
    expect(a.crecimiento[0]?.dia).toBe("2026-08-01");
    expect(a.crecimiento.at(-1)?.dia).toBe("2026-09-26");
    expect(dia("2026-09-25")).toBe(1);
    expect(dia("2026-09-26")).toBe(0);
    expect(a.crecimiento.reduce((n, x) => n + x.nuevos, 0) + a.previosAlCrecimiento).toBe(3);
    // Viernes (índice 4, la semana empieza en lunes) a las 21:00, y domingo a las 12:00.
    expect(a.calor[4]![21]).toBe(1);
    expect(a.calor[6]![12]).toBe(1);
    // Los últimos 30 días empiezan el 28 de agosto: entran el 20 y el 25 de septiembre; el 1 de agosto,
    // en los 30 anteriores.
    expect(a.totales.nuevos30).toBe(2);
    expect(a.totales.nuevosPrevios30).toBe(1);
  });

  it("la edad solo cuenta con el año capturado", async () => {
    const a = await analisisDe(u.L);
    expect(a.totales.conEdad).toBe(2);
    expect(a.totales.edadPromedio).toBe(51); // 36 y 66
    const rango = (clave: string) => a.edades.find((e) => e.clave === clave)?.total;
    expect(rango("35-44")).toBe(1);
    expect(rango("65+")).toBe(1);
    expect(a.edades.some((e) => e.clave === "menos-18")).toBe(false);
  });

  it("agrupa lo escrito a mano y deja la colonia con su municipio", async () => {
    const a = await analisisDe(u.L);
    expect(a.totales.coloniasCubiertas).toBe(2);
    expect(a.colonias.map((c) => c.total)).toEqual([2, 1]);
    expect(a.colonias[0]?.etiqueta.toLowerCase()).toBe("centro · tonalá");
    expect(a.colonias[1]?.etiqueta).toBe("Alfareros · Tonalá");
    expect(a.totales.voluntarios).toBe(1);
  });

  it("el avance por equipo suma lo del líder y sus integrantes, solo de los equipos que ve", async () => {
    const a = await analisisDe(u.L);
    expect(a.equipos).toEqual([
      { id: equipo.T, nombre: "zz-Brigada Centro", municipio: "Tonalá", integrantes: 2, ciudadanos: 3, nuevos30: 2 }
    ]);
    const o = await analisisDe(u.O);
    expect(o.equipos.map((e) => e.id)).toEqual([equipo.Z]);
  });
});
