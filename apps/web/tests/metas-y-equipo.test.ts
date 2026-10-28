import "dotenv/config";

import crypto from "node:crypto";

import { and, eq, inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createAuthenticatedActor } from "@tonala/shared/auth";
import { schema } from "@tonala/shared/database";

import type * as AccionesPorDia from "@/lib/acciones-por-dia";
import type * as Visibilidad from "@/lib/contact-visibility";
import type * as ClienteDb from "@/lib/db-client";
import type * as MetaDelLider from "@/lib/meta-del-lider";
import type * as MiProgreso from "@/lib/mi-progreso";
import type * as Jerarquia from "@/lib/network-hierarchy";
import type * as Kpis from "@/lib/resumen-kpis";
import type * as Tablero from "@/lib/resumen-tablero";

import { crearBaseDesechable } from "./base-desechable";

/**
 * «Mi día», el total de la brigada, el pulso de quien coordina, la meta que fija el líder y el tablero del
 * Resumen (plan de experiencia sencilla, §4), contra una base desechable con una estructura completa:
 *
 *   Tonalá
 *     D  (dirección) lidera C ── integrantes L1, L2
 *     L1 (líder)     lidera B1 ── M1, M4, M5 (brigadistas), K1 (capturista), MI (brigadista DADO DE BAJA)
 *     L2 (líder)     lidera B2 ── M2                      (brigada de 2: no llega al mínimo de 4)
 *     AT administración municipal de Tonalá
 *   Zapopan
 *     D2 (dirección) lidera C2 ── L3
 *     L3 (líder)     lidera B3 ── M3, M6, M7, M8
 *     AZ administración municipal de Zapopan
 *   y el administrador maestro de la semilla.
 *
 * Cada prueba pide dos cosas: que a quien le toca ver algo no le falte nada, y que no vea nada de más.
 *
 * Semana de prueba: lunes 14 a domingo 20 de septiembre de 2026; «ahora» es el miércoles 16 a las 12:00 de
 * Jalisco (18:00 UTC; Jalisco no cambia de horario). La semana anterior empieza el lunes 7.
 */

const id = (): string => crypto.randomUUID();
const AHORA = new Date("2026-09-16T18:00:00Z");
const LUNES = "2026-09-14";
const SEMANA = ["2026-09-14", "2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18", "2026-09-19", "2026-09-20"];

const u = {
  AT: id(), AZ: id(), D: id(), L1: id(), L2: id(), M1: id(), M4: id(), M5: id(), K1: id(), MI: id(), M2: id(),
  D2: id(), L3: id(), M3: id(), M6: id(), M7: id(), M8: id()
};
const t = { C: id(), B1: id(), B2: id(), C2: id(), B3: id() };
const c = {
  lunes: id(), lunesNoche: id(), qrMiercoles: id(), baja: id(), pasada: id(),
  k1: id(), k1Pasada1: id(), k1Pasada2: id(), m4: id(), l1: id(), deMI: id(), m2: id(), m3: id()
};
const v = { cerradaConActividad: id(), cerradaSola: id(), pendiente: id() };
const e = { cerrada: id(), deLaVisita: id(), abierta: id() };
let maestro = "";
let base: Awaited<ReturnType<typeof crearBaseDesechable>>;

// Se importan después de apuntar DATABASE_URL a la base desechable.
let db: ReturnType<typeof ClienteDb.getDatabaseClient>;
let alcance: typeof Jerarquia.resolveUserNetworkScope;
let acciones: typeof AccionesPorDia;
let progreso: typeof MiProgreso;
let meta: typeof MetaDelLider;
let tablero: typeof Tablero.tableroDelResumen;
let restricciones: typeof Kpis.restriccionesDelResumen;
let visibles: typeof Visibilidad.contactosVisibles;

const nombre: Record<string, string> = Object.fromEntries(Object.entries(u).map(([k, v]) => [v, k]));
const nombres = (ids: Iterable<string>) => [...ids].map((x) => nombre[x] ?? "otra").sort();

function actor(userId: string, rol: string) {
  return createAuthenticatedActor({
    actorId: userId,
    roles: [rol],
    permissions: [],
    correlationId: id(),
    authenticationMethod: "password",
    requestStartedAt: new Date()
  });
}

beforeAll(async () => {
  base = await crearBaseDesechable("metas");
  db = (await import("@/lib/db-client")).getDatabaseClient();
  alcance = (await import("@/lib/network-hierarchy")).resolveUserNetworkScope;
  acciones = await import("@/lib/acciones-por-dia");
  progreso = await import("@/lib/mi-progreso");
  meta = await import("@/lib/meta-del-lider");
  tablero = (await import("@/lib/resumen-tablero")).tableroDelResumen;
  restricciones = (await import("@/lib/resumen-kpis")).restriccionesDelResumen;
  visibles = (await import("@/lib/contact-visibility")).contactosVisibles;

  const roles = Object.fromEntries((await db.select({ id: schema.roles.id, key: schema.roles.key }).from(schema.roles)).map((r) => [r.key, r.id]));
  const persona = (pid: string, rol: string, municipio: string, status = "active") => ({
    id: pid,
    email: `zz-${nombre[pid]!.toLowerCase()}-${pid.slice(0, 6)}@prueba.local`,
    displayName: `zz ${nombre[pid]}`,
    roleId: roles[rol]!,
    status,
    municipality: municipio
  });
  await db.insert(schema.userProfiles).values([
    persona(u.AT, "admin", "Tonalá"),
    persona(u.AZ, "admin", "Zapopan"),
    persona(u.D, "direction", "Tonalá"),
    persona(u.L1, "territorial_coordinator", "Tonalá"),
    persona(u.L2, "territorial_coordinator", "Tonalá"),
    persona(u.M1, "visit_responsible", "Tonalá"),
    persona(u.M4, "visit_responsible", "Tonalá"),
    persona(u.M5, "visit_responsible", "Tonalá"),
    persona(u.K1, "capturist", "Tonalá"),
    persona(u.MI, "visit_responsible", "Tonalá", "inactive"),
    persona(u.M2, "visit_responsible", "Tonalá"),
    persona(u.D2, "direction", "Zapopan"),
    persona(u.L3, "territorial_coordinator", "Zapopan"),
    persona(u.M3, "visit_responsible", "Zapopan"),
    persona(u.M6, "visit_responsible", "Zapopan"),
    persona(u.M7, "visit_responsible", "Zapopan"),
    persona(u.M8, "visit_responsible", "Zapopan")
  ]);
  const equipo = (tid: string, lider: string, municipio: string) => ({ id: tid, name: `zz equipo ${tid.slice(0, 6)}`, leaderId: lider, municipality: municipio });
  await db.insert(schema.teams).values([
    equipo(t.C, u.D, "Tonalá"), equipo(t.B1, u.L1, "Tonalá"), equipo(t.B2, u.L2, "Tonalá"),
    equipo(t.C2, u.D2, "Zapopan"), equipo(t.B3, u.L3, "Zapopan")
  ]);
  await db.insert(schema.teamMembers).values([
    { teamId: t.C, userId: u.L1 }, { teamId: t.C, userId: u.L2 },
    ...[u.M1, u.M4, u.M5, u.K1, u.MI].map((userId) => ({ teamId: t.B1, userId })),
    { teamId: t.B2, userId: u.M2 },
    { teamId: t.C2, userId: u.L3 },
    ...[u.M3, u.M6, u.M7, u.M8].map((userId) => ({ teamId: t.B3, userId }))
  ]);

  const ciudadano = (cid: string, autor: string, creado: string, extra: Partial<typeof schema.contacts.$inferInsert> = {}) => ({
    id: cid,
    displayName: `zz ciudadano ${cid.slice(0, 6)}`,
    createdByUserId: autor,
    municipality: autor === u.M3 ? "Zapopan" : "Tonalá",
    status: "active",
    createdAt: new Date(creado),
    ...extra
  });
  await db.insert(schema.contacts).values([
    ciudadano(c.lunes, u.M1, "2026-09-14T15:00:00Z", { panMilitancy: "confirmada" }),
    ciudadano(c.lunesNoche, u.M1, "2026-09-15T05:30:00Z"), // lunes 23:30 en Jalisco: cuenta el lunes
    ciudadano(c.qrMiercoles, u.M1, "2026-09-16T16:00:00Z", { origin: "enlace_personal" }),
    ciudadano(c.baja, u.M1, "2026-09-16T16:30:00Z", { status: "inactive" }), // dado de baja: no cuenta
    ciudadano(c.pasada, u.M1, "2026-09-09T18:00:00Z"),
    ciudadano(c.k1, u.K1, "2026-09-16T15:00:00Z"),
    ciudadano(c.k1Pasada1, u.K1, "2026-09-08T18:00:00Z"),
    ciudadano(c.k1Pasada2, u.K1, "2026-09-10T18:00:00Z"),
    ciudadano(c.m4, u.M4, "2026-09-15T17:00:00Z"),
    ciudadano(c.l1, u.L1, "2026-09-14T17:00:00Z"),
    ciudadano(c.deMI, u.MI, "2026-09-16T15:00:00Z"),
    ciudadano(c.m2, u.M2, "2026-09-15T17:00:00Z"),
    ciudadano(c.m3, u.M3, "2026-09-15T17:00:00Z")
  ]);

  const [colonia] = await db.select({ id: schema.colonies.id }).from(schema.colonies).limit(1);
  if (!colonia) throw new Error("La semilla debía dejar colonias");
  const visita = (vid: string, estado: "scheduled" | "completed", cerrada?: string) => ({
    id: vid,
    contactId: c.lunes,
    colonyId: colonia.id,
    assignedUserId: u.M1,
    scheduledAt: new Date("2026-09-14T16:00:00Z"),
    status: estado,
    visitLocationText: "Domicilio de prueba",
    createdByUserId: u.M1,
    createdAt: new Date("2026-09-14T16:00:00Z"),
    ...(cerrada ? { completedAt: new Date(cerrada), completedByUserId: u.M1 } : {})
  });
  await db.insert(schema.visits).values([
    visita(v.cerradaConActividad, "completed", "2026-09-15T19:00:00Z"),
    visita(v.cerradaSola, "completed", "2026-09-16T17:00:00Z"),
    visita(v.pendiente, "scheduled")
  ]);
  const incidencia = (eid: string, extra: Partial<typeof schema.eventReports.$inferInsert>) => ({
    id: eid,
    title: "zz actividad",
    description: "Prueba de metas",
    latitude: 20.62,
    longitude: -103.24,
    category: "incidencia",
    createdByUserId: u.M1,
    assignedToUserId: u.M1,
    municipality: "Tonalá",
    ...extra
  });
  await db.insert(schema.eventReports).values([
    incidencia(e.cerrada, { status: "resolved", outcome: "successful", closedByUserId: u.M1, closedAt: new Date("2026-09-15T18:00:00Z") }),
    // La actividad de una visita: la visita y su actividad se cierran juntas y cuentan UNA vez.
    incidencia(e.deLaVisita, { status: "resolved", outcome: "successful", closedByUserId: u.M1, closedAt: new Date("2026-09-15T19:00:00Z"), visitId: v.cerradaConActividad, contactId: c.lunes }),
    incidencia(e.abierta, { status: "active" })
  ]);
  await db.insert(schema.rapidActivityProspects).values({ prospectName: "zz prospecto", createdByUserId: u.M1, createdAt: new Date("2026-09-16T15:30:00Z") });
  await db.insert(schema.socialListening).values({ categories: ["servicios"], title: "zz petición", description: "Prueba", createdByUserId: u.M1, createdAt: new Date("2026-09-16T15:45:00Z") });

  const [m] = await db.select({ id: schema.userProfiles.id }).from(schema.userProfiles).where(eq(schema.userProfiles.isMasterAdmin, true));
  if (!m) throw new Error("La semilla debía dejar un administrador maestro");
  maestro = m.id;
}, 180_000);

afterAll(async () => {
  await base?.borrar();
});

// ── Acciones por persona y día ──────────────────────────────────────────────────────────────────────

describe("acciones por persona y día (lo que suma «Mi día»)", () => {
  it("cuenta cada acción el día de Jalisco en que pasó, sin bajas, abiertas ni pendientes, y la visita con actividad una vez", async () => {
    const porDia = (await acciones.accionesPorPersonaYDia([u.M1], new Date("2026-09-14T06:00:00Z"))).get(u.M1);
    // Lunes: dos altas (una a las 23:30 de Jalisco, que en UTC ya es martes). Martes: una actividad cerrada
    // y una visita cerrada con su actividad (una sola acción). Miércoles: el alta por su QR, la visita
    // cerrada sola, el prospecto y la petición de Escucha. No cuentan: el ciudadano dado de baja, la
    // actividad abierta ni la visita pendiente.
    expect(Object.fromEntries(porDia ?? [])).toEqual({ "2026-09-14": 2, "2026-09-15": 2, "2026-09-16": 4 });
  });

  it("desde el lunes anterior también trae lo de la semana pasada", async () => {
    const r = await acciones.accionesPorPersonaYDia([u.M1, u.K1], new Date("2026-09-07T06:00:00Z"));
    expect(r.get(u.M1)?.get("2026-09-09")).toBe(1);
    expect(Object.fromEntries(r.get(u.K1) ?? [])).toEqual({ "2026-09-08": 1, "2026-09-10": 1, "2026-09-16": 1 });
  });

  it("quien no hizo nada no aparece; una lista vacía o con ids raros no consulta nada", async () => {
    const r = await acciones.accionesPorPersonaYDia([u.M5, "no-es-un-id", "'; DROP TABLE contacts; --"], new Date("2026-09-14T06:00:00Z"));
    expect(r.size).toBe(0);
    expect((await acciones.accionesPorPersonaYDia([], new Date())).size).toBe(0);
  });

  it("sumarAcciones suma por persona y por días, sin contar dos veces a nadie", async () => {
    const r = await acciones.accionesPorPersonaYDia([u.M1, u.K1, u.M4], new Date("2026-09-07T06:00:00Z"));
    const estaSemana = (dia: string) => dia >= LUNES;
    expect(acciones.sumarAcciones(r, [u.M1, u.K1, u.M4], estaSemana)).toBe(8 + 1 + 1);
    expect(acciones.sumarAcciones(r, [u.M1, u.M1], estaSemana)).toBe(8);
    expect(acciones.sumarAcciones(r, [u.M1, u.K1], (dia) => !estaSemana(dia))).toBe(1 + 2);
  });
});

// ── «Mi día»: meta, brigada y pulso ─────────────────────────────────────────────────────────────────

describe("«Mi día» de cada quien", () => {
  it("el brigadista: lo suyo de hoy y de la semana, y el total de su brigada sin nombres", async () => {
    const p = await progreso.progresoDe(await alcance(u.M1), AHORA);
    expect(p.dia).toBe("2026-09-16");
    expect(p.hoy.total).toBe(4);
    expect(p.semana).toBe(8);
    expect(p.metaDelLider).toBeNull();
    // Brigada B1: L1, M1, M4, M5 y K1 (MI está dada de baja). 1 + 8 + 1 + 0 + 1.
    expect(p.equipo).toEqual({ tipo: "brigada", semana: 11, tuyo: 8, personas: 5 });
    expect(JSON.stringify(p.equipo)).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/);
  });

  it("la capturista de la misma brigada ve el mismo total, con lo suyo", async () => {
    const p = await progreso.progresoDe(await alcance(u.K1), AHORA);
    expect(p.equipo).toEqual({ tipo: "brigada", semana: 11, tuyo: 1, personas: 5 });
  });

  it("en una brigada de menos de 4 personas no se enseña el total (dejaría adivinar lo de cada quien)", async () => {
    const p = await progreso.progresoDe(await alcance(u.M2), AHORA);
    expect(p.equipo).toBeNull();
  });

  it("cada brigada ve lo suyo: la de Zapopan no suma nada de Tonalá", async () => {
    const p = await progreso.progresoDe(await alcance(u.M3), AHORA);
    expect(p.equipo).toEqual({ tipo: "brigada", semana: 1, tuyo: 1, personas: 5 });
  });

  it("el líder recibe el pulso de su gente activa, contra la semana pasada", async () => {
    const p = await progreso.progresoDe(await alcance(u.L1), AHORA);
    // M1 8, K1 1, M4 1, M5 0; la semana pasada M1 1 y K1 2. Sin MI (baja) y sin lo propio.
    expect(p.equipo).toEqual({ tipo: "mando", semana: 10, semanaPasada: 3, personas: 4, activas: 3 });
  });

  it("la dirección recibe el pulso de toda su cascada, y la de otra coordinación no lo ve", async () => {
    const d = await progreso.progresoDe(await alcance(u.D), AHORA);
    // L1 1 + B1 10 + L2 0 + M2 1.
    expect(d.equipo).toEqual({ tipo: "mando", semana: 12, semanaPasada: 3, personas: 7, activas: 5 });
    const d2 = await progreso.progresoDe(await alcance(u.D2), AHORA);
    expect(d2.equipo).toEqual({ tipo: "mando", semana: 1, semanaPasada: 0, personas: 5, activas: 1 });
  });

  it("administración y el maestro no lo llevan: tienen el Resumen", async () => {
    expect((await progreso.progresoDe(await alcance(u.AT), AHORA)).equipo).toBeNull();
    expect((await progreso.progresoDe(await alcance(maestro), AHORA)).equipo).toBeNull();
  });
});

// ── Meta que fija el líder ──────────────────────────────────────────────────────────────────────────

describe("quién puede ponerle meta a quién", () => {
  // persona → quienes SÍ pueden; cualquier otra persona de la lista, no.
  const pueden: Record<string, string[]> = {
    M1: ["L1", "D", "AT", "maestro"],
    K1: ["L1", "D", "AT", "maestro"],
    L1: ["D", "AT", "maestro"],
    M2: ["L2", "D", "AT", "maestro"],
    D: ["AT", "maestro"],
    M3: ["L3", "D2", "AZ", "maestro"],
    AT: ["maestro"]
  };
  const actores = ["maestro", "AT", "AZ", "D", "D2", "L1", "L2", "L3", "M1", "K1", "M2", "M3"];
  const idDe = (k: string): string => (k === "maestro" ? maestro : u[k as keyof typeof u]);

  it("solo quien manda sobre la persona (o administración de su municipio, o el maestro); nadie a sí mismo", async () => {
    const obtenido: Record<string, string[]> = {};
    for (const persona of Object.keys(pueden)) {
      obtenido[persona] = [];
      for (const k of actores) if (meta.puedeFijarMeta(await alcance(idDe(k)), idDe(persona))) obtenido[persona]?.push(k);
    }
    const ordenar = (r: Record<string, string[]>) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, [...v].sort()]));
    expect(ordenar(obtenido)).toEqual(ordenar(pueden));
  });

  it("guarda la meta, quién la puso y una sola fila de auditoría por cambio; null la quita", async () => {
    const lider = actor(u.L1, "territorial_coordinator");
    const auditorias = async () =>
      Number((await db.select({ n: sql<string>`count(*)` }).from(schema.auditLogs).where(and(eq(schema.auditLogs.action, "user.daily_goal_set"), eq(schema.auditLogs.entityId, u.M1))))[0]!.n);

    expect(await meta.fijarMetaDelLider(lider, await alcance(u.L1), u.M1, 6)).toEqual({ ok: true, meta: 6 });
    let [fila] = await db.select().from(schema.userProfiles).where(eq(schema.userProfiles.id, u.M1));
    expect([fila!.dailyGoal, fila!.dailyGoalSetByUserId, fila!.dailyGoalSetAt !== null]).toEqual([6, u.L1, true]);
    expect(await auditorias()).toBe(1);

    expect(await meta.fijarMetaDelLider(lider, await alcance(u.L1), u.M1, 6)).toEqual({ ok: true, meta: 6 });
    expect(await auditorias()).toBe(1);
    expect((await progreso.progresoDe(await alcance(u.M1), AHORA)).metaDelLider).toBe(6);

    expect(await meta.fijarMetaDelLider(lider, await alcance(u.L1), u.M1, null)).toEqual({ ok: true, meta: null });
    [fila] = await db.select().from(schema.userProfiles).where(eq(schema.userProfiles.id, u.M1));
    expect([fila!.dailyGoal, fila!.dailyGoalSetByUserId, fila!.dailyGoalSetAt]).toEqual([null, null, null]);
    expect(await auditorias()).toBe(2);
    expect((await progreso.progresoDe(await alcance(u.M1), AHORA)).metaDelLider).toBeNull();
  });

  it("rechaza metas fuera de 1 a 200, a quien no manda y a personas dadas de baja", async () => {
    const lider = actor(u.L1, "territorial_coordinator");
    for (const mala of [0, -1, 201, 2.5, "6", undefined, Number.NaN]) {
      expect((await meta.fijarMetaDelLider(lider, await alcance(u.L1), u.M1, mala)).ok, String(mala)).toBe(false);
      expect(await meta.fijarMetaDelLider(lider, await alcance(u.L1), u.M1, mala)).toMatchObject({ status: 400 });
    }
    expect(await meta.fijarMetaDelLider(actor(u.K1, "capturist"), await alcance(u.K1), u.M1, 6)).toMatchObject({ ok: false, status: 403 });
    expect(await meta.fijarMetaDelLider(actor(u.D2, "direction"), await alcance(u.D2), u.M1, 6)).toMatchObject({ ok: false, status: 403 });
    // MI está dada de baja: para su líder ya no está bajo su mando; para el maestro, no existe como activa.
    expect(await meta.fijarMetaDelLider(lider, await alcance(u.L1), u.MI, 6)).toMatchObject({ ok: false, status: 403 });
    expect(await meta.fijarMetaDelLider(actor(maestro, "admin"), await alcance(maestro), u.MI, 6)).toMatchObject({ ok: false, status: 404 });
    // La base tampoco acepta una meta fuera de rango, aunque alguien se salte la aplicación.
    await expect(db.update(schema.userProfiles).set({ dailyGoal: 500 }).where(eq(schema.userProfiles.id, u.M4))).rejects.toThrow();
  });
});

// ── Tablero del Resumen ─────────────────────────────────────────────────────────────────────────────

describe("tablero del Resumen: a nadie le falta su gente ni ve gente de más", () => {
  async function tableroDe(userId: string) {
    const scope = await alcance(userId);
    return { scope, filas: await tablero(scope, await restricciones(scope), { ahora: AHORA }) };
  }
  /** Las personas activas del alcance: las que el tablero tiene que enseñar, todas. */
  async function activasDelAlcance(ids: string[] | null) {
    const filas = await db
      .select({ id: schema.userProfiles.id })
      .from(schema.userProfiles)
      .where(ids ? and(eq(schema.userProfiles.status, "active"), inArray(schema.userProfiles.id, ids)) : eq(schema.userProfiles.status, "active"));
    return filas.map((f) => f.id).sort();
  }

  it("el líder: él y su brigada activa, nadie de otra brigada", async () => {
    const { scope, filas } = await tableroDe(u.L1);
    expect(nombres(filas.map((f) => f.userId))).toEqual(["K1", "L1", "M1", "M4", "M5"]);
    expect(filas.map((f) => f.userId).sort()).toEqual(await activasDelAlcance(scope.teammateUserIds));
  });

  it("la dirección: toda su cascada; la otra dirección, solo la suya", async () => {
    const d = await tableroDe(u.D);
    expect(nombres(d.filas.map((f) => f.userId))).toEqual(["D", "K1", "L1", "L2", "M1", "M2", "M4", "M5"]);
    expect(d.filas.map((f) => f.userId).sort()).toEqual(await activasDelAlcance(d.scope.teammateUserIds));
    const d2 = await tableroDe(u.D2);
    expect(nombres(d2.filas.map((f) => f.userId))).toEqual(["D2", "L3", "M3", "M6", "M7", "M8"]);
  });

  it("administración municipal: toda la gente activa de su municipio; el maestro: toda la gente activa", async () => {
    const at = await tableroDe(u.AT);
    expect(nombres(at.filas.map((f) => f.userId)).filter((n) => n !== "otra")).toEqual(["AT", "D", "K1", "L1", "L2", "M1", "M2", "M4", "M5"]);
    expect(at.filas.map((f) => f.userId).sort()).toEqual(await activasDelAlcance(at.scope.teammateUserIds));
    const m = await tableroDe(maestro);
    expect(m.filas.map((f) => f.userId).sort()).toEqual(await activasDelAlcance(null));
    expect(m.filas.some((f) => f.userId === u.MI)).toBe(false);
  });

  it("los números de cada quien son los mismos que contaba la versión anterior (filas filtradas en memoria)", async () => {
    for (const viewer of [u.L1, u.D, u.AT]) {
      const { scope, filas } = await tableroDe(viewer);
      const r = await restricciones(scope);
      // La versión anterior: traer las filas del alcance y filtrarlas por persona.
      const contactos = await db.select({ por: schema.contacts.createdByUserId, pan: schema.contacts.panMilitancy }).from(schema.contacts).where(r.contactos);
      const visitas = await db.select({ por: schema.visits.assignedUserId, estado: schema.visits.status }).from(schema.visits).where(r.visitas);
      const incidencias = await db.select({ por: schema.eventReports.assignedToUserId }).from(schema.eventReports).where(r.incidencias);
      for (const f of filas) {
        const suyos = contactos.filter((x) => x.por === f.userId);
        const total = visitas.filter((x) => x.por === f.userId).length + incidencias.filter((x) => x.por === f.userId).length;
        expect([f.contactsCount, f.panContactsCount, f.activitiesCount], `${nombre[viewer]} → ${nombre[f.userId] ?? f.userId}`).toEqual([
          suyos.length,
          suyos.filter((x) => x.pan === "confirmada").length,
          total
        ]);
      }
    }
  });

  it("la líder ve completos los ciudadanos de su brigada (nada de lo visible se queda sin contar)", async () => {
    const { scope, filas } = await tableroDe(u.L1);
    const vis = await visibles(scope);
    if (!("ids" in vis)) throw new Error("La líder debía tener una lista de ciudadanos visibles");
    const m1 = filas.find((f) => f.userId === u.M1)!;
    // Lunes, lunes noche, QR del miércoles y el de la semana pasada; no el dado de baja.
    expect(m1.contactsCount).toBe(4);
    expect(m1.panContactsCount).toBe(1);
    expect(vis.ids).toEqual(expect.arrayContaining([c.lunes, c.lunesNoche, c.qrMiercoles, c.pasada, c.k1, c.m4, c.l1]));
    expect(vis.ids).not.toContain(c.m2);
    expect(vis.ids).not.toContain(c.m3);
  });

  it("la semana de cada quien contra su propia meta: medalla por días cumplidos, no por lugar", async () => {
    let fila = (await tableroDe(u.L1)).filas.find((f) => f.userId === u.M1)!;
    expect(fila.semana).toEqual({ porDia: [2, 2, 4, 0, 0, 0, 0], hoyIndice: 2, meta: 5, metaDelLider: null, diasCumplidos: 0, medalla: null });
    expect(SEMANA[fila.semana.hoyIndice]).toBe("2026-09-16");

    const lider = actor(u.L1, "territorial_coordinator");
    const conMeta = async (m: number) => {
      await meta.fijarMetaDelLider(lider, await alcance(u.L1), u.M1, m);
      return (await tableroDe(u.L1)).filas.find((f) => f.userId === u.M1)!.semana;
    };
    expect(await conMeta(2)).toMatchObject({ meta: 2, metaDelLider: 2, diasCumplidos: 3, medalla: "oro" });
    expect(await conMeta(3)).toMatchObject({ meta: 3, diasCumplidos: 1, medalla: "bronce" });
    expect(await conMeta(1)).toMatchObject({ meta: 1, diasCumplidos: 3, medalla: "oro" });
    await meta.fijarMetaDelLider(lider, await alcance(u.L1), u.M1, null);

    // Sin meta del líder, la de su rol: 10 para quien registra, 5 para el brigadista.
    fila = (await tableroDe(u.L1)).filas.find((f) => f.userId === u.K1)!;
    expect(fila.semana).toMatchObject({ porDia: [0, 0, 1, 0, 0, 0, 0], meta: 10, medalla: null });
  });

  it("«Cambiar meta» aparece justo donde la API la acepta", async () => {
    for (const viewer of [u.L1, u.D, u.AT, maestro, u.D2]) {
      const { scope, filas } = await tableroDe(viewer);
      for (const f of filas) {
        expect(f.puedeFijarMeta, `${nombre[viewer] ?? "maestro"} → ${nombre[f.userId] ?? f.userId}`).toBe(meta.puedeFijarMeta(scope, f.userId));
        if (f.userId === viewer) expect(f.puedeFijarMeta).toBe(false);
      }
    }
    // El líder, a toda su brigada; la dirección, a toda su cascada.
    expect((await tableroDe(u.L1)).filas.filter((f) => f.userId !== u.L1).every((f) => f.puedeFijarMeta)).toBe(true);
    expect((await tableroDe(u.D)).filas.filter((f) => f.userId !== u.D).every((f) => f.puedeFijarMeta)).toBe(true);
  });
});
