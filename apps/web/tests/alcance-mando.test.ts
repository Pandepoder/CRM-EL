import "dotenv/config";

import crypto from "node:crypto";

import { inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { schema } from "@tonala/shared/database";

import { visibleContactIds } from "@/lib/contact-visibility";
import { getDatabaseClient } from "@/lib/db-client";
import { incidentScopeCondition } from "@/lib/incident-visibility";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";

/**
 * Cascada de mando contra la base real.
 *
 * Regla del dueño del sistema: solo administración ve todo; dirección ve sus equipos y a los
 * integrantes de las brigadas que cuelgan de ellos, nunca lo de otra dirección; y nadie ve
 * integrantes de brigadas que no estén bajo su mando.
 *
 *   D  (direction)  lidera C (Tonalá) ── integrantes L1, L2, ADM (admin)
 *   L1 (coordinador) lidera B1 (Tonalá)  ── integrante M1
 *   L2 (coordinador) lidera B2 (sin territorio) ── integrante M2
 *   ADM (admin)     lidera BA ── integrante MA
 *   D2 (direction)  lidera C2 ── integrante L3; L3 lidera B3 ── integrante M3
 *   D3 (direction)  es integrante de X, que lidera LX; LX también lidera X2 ── integrante MX
 *   CA lidera CY1 con CB; CB lidera CY2 con CA (ciclo)
 */

const db = getDatabaseClient();
const id = () => crypto.randomUUID();

const u = {
  D: id(), L1: id(), L2: id(), M1: id(), M2: id(), ADM: id(), MA: id(),
  D2: id(), L3: id(), M3: id(),
  D3: id(), LX: id(), MX: id(),
  CA: id(), CB: id()
};
const t = { C: id(), B1: id(), B2: id(), BA: id(), C2: id(), B3: id(), X: id(), X2: id(), CY1: id(), CY2: id() };
const contacto = { m1Tonala: id(), m1Zapopan: id(), m2Zapopan: id(), m3: id() };
const incidencia = { deM2: id(), deM3: id(), deAdmin: id(), asignadaAB1: id() };

async function alcance(userId: string) {
  return resolveUserNetworkScope(userId);
}

async function incidenciasVisibles(userId: string) {
  const filas = await db
    .select({ id: schema.eventReports.id })
    .from(schema.eventReports)
    .where(sql`${inArray(schema.eventReports.id, Object.values(incidencia))} AND ${incidentScopeCondition(await alcance(userId)) ?? sql`true`}`);
  return new Set(filas.map((f) => f.id));
}

beforeAll(async () => {
  const roles = await db.select({ id: schema.roles.id, key: schema.roles.key }).from(schema.roles);
  const rol = Object.fromEntries(roles.map((r) => [r.key, r.id])) as Record<string, string>;

  const persona = (userId: string, key: string, status = "active") => ({
    id: userId,
    email: `mando-${userId}@pruebas.local`,
    displayName: `Prueba ${key}`,
    roleId: rol[key]!,
    status
  });
  await db.insert(schema.userProfiles).values([
    persona(u.D, "direction"),
    persona(u.L1, "territorial_coordinator"),
    persona(u.L2, "territorial_coordinator"),
    persona(u.M1, "visit_responsible"),
    persona(u.M2, "visit_responsible"),
    persona(u.ADM, "admin"),
    persona(u.MA, "visit_responsible"),
    persona(u.D2, "direction"),
    persona(u.L3, "territorial_coordinator"),
    persona(u.M3, "visit_responsible"),
    persona(u.D3, "direction"),
    persona(u.LX, "territorial_coordinator"),
    persona(u.MX, "visit_responsible"),
    persona(u.CA, "territorial_coordinator"),
    persona(u.CB, "territorial_coordinator")
  ]);

  const equipo = (teamId: string, leaderId: string, municipality: string | null = null) => ({
    id: teamId,
    name: `Equipo mando ${teamId}`,
    leaderId,
    municipality
  });
  await db.insert(schema.teams).values([
    equipo(t.C, u.D, "Tonalá"),
    equipo(t.B1, u.L1, "Tonalá"),
    equipo(t.B2, u.L2),
    equipo(t.BA, u.ADM),
    equipo(t.C2, u.D2),
    equipo(t.B3, u.L3),
    equipo(t.X, u.LX),
    equipo(t.X2, u.LX),
    equipo(t.CY1, u.CA),
    equipo(t.CY2, u.CB)
  ]);
  await db.insert(schema.teamMembers).values([
    { teamId: t.C, userId: u.L1 },
    { teamId: t.C, userId: u.L2 },
    { teamId: t.C, userId: u.ADM },
    { teamId: t.B1, userId: u.M1 },
    { teamId: t.B2, userId: u.M2 },
    { teamId: t.BA, userId: u.MA },
    { teamId: t.C2, userId: u.L3 },
    { teamId: t.B3, userId: u.M3 },
    { teamId: t.X, userId: u.D3 },
    { teamId: t.X2, userId: u.MX },
    { teamId: t.CY1, userId: u.CB },
    { teamId: t.CY2, userId: u.CA }
  ]);

  const nuevoContacto = (contactId: string, creador: string, municipality: string) => ({
    id: contactId,
    displayName: `Contacto ${contactId.slice(0, 6)}`,
    createdByUserId: creador,
    municipality,
    status: "active",
    createdAt: new Date()
  });
  await db.insert(schema.contacts).values([
    nuevoContacto(contacto.m1Tonala, u.M1, "Tonalá"),
    nuevoContacto(contacto.m1Zapopan, u.M1, "Zapopan"),
    nuevoContacto(contacto.m2Zapopan, u.M2, "Zapopan"),
    nuevoContacto(contacto.m3, u.M3, "Zapopan")
  ]);

  const nuevaIncidencia = (reportId: string, creador: string, assignedTeamId: string | null = null) => ({
    id: reportId,
    title: "Incidencia de prueba",
    description: "Prueba de alcance por mando",
    latitude: 20.62,
    longitude: -103.24,
    category: "incidencia",
    createdByUserId: creador,
    assignedTeamId
  });
  await db.insert(schema.eventReports).values([
    nuevaIncidencia(incidencia.deM2, u.M2),
    nuevaIncidencia(incidencia.deM3, u.M3),
    nuevaIncidencia(incidencia.deAdmin, u.ADM),
    nuevaIncidencia(incidencia.asignadaAB1, u.ADM, t.B1)
  ]);
});

afterAll(async () => {
  await db.delete(schema.eventReports).where(inArray(schema.eventReports.id, Object.values(incidencia)));
  await db.delete(schema.contacts).where(inArray(schema.contacts.id, Object.values(contacto)));
  await db.delete(schema.teamMembers).where(inArray(schema.teamMembers.teamId, Object.values(t)));
  await db.delete(schema.teams).where(inArray(schema.teams.id, Object.values(t)));
  await db.delete(schema.userProfiles).where(inArray(schema.userProfiles.id, Object.values(u)));
});

describe("cascada de mando", () => {
  it("dirección ve su coordinación y a los integrantes de las brigadas que cuelgan de ella", async () => {
    const a = await alcance(u.D);
    expect(new Set(a.commandTeamIds)).toEqual(new Set([t.C, t.B1, t.B2]));
    for (const persona of [u.D, u.L1, u.L2, u.M1, u.M2]) expect(a.allowedUserIds).toContain(persona);
  });

  it("dirección no ve nada de otra dirección ni a administración ni sus brigadas", async () => {
    const a = await alcance(u.D);
    for (const persona of [u.D2, u.L3, u.M3, u.ADM, u.MA]) expect(a.allowedUserIds).not.toContain(persona);
    expect(a.commandTeamIds).not.toContain(t.BA);
    expect(a.teamIds).not.toContain(t.C2);
  });

  it("un líder ve su brigada y a sus compañeros de coordinación, pero no las brigadas de ellos", async () => {
    const a = await alcance(u.L1);
    expect(a.commandTeamIds).toEqual([t.B1]);
    for (const persona of [u.L1, u.M1, u.D, u.L2]) expect(a.allowedUserIds).toContain(persona);
    expect(a.allowedUserIds).not.toContain(u.M2);
  });

  it("un brigadista ve solo a su brigada", async () => {
    const a = await alcance(u.M1);
    expect(a.commandTeamIds).toEqual([]);
    expect(new Set(a.allowedUserIds)).toEqual(new Set([u.M1, u.L1]));
  });

  it("dirección como integrante de un equipo ajeno no se lleva al líder ni sus otras brigadas", async () => {
    const a = await alcance(u.D3);
    expect(a.commandTeamIds).toEqual([t.X]);
    expect(a.allowedUserIds).toContain(u.LX);
    expect(a.allowedUserIds).not.toContain(u.MX);
  });

  it("un ciclo de liderazgos no se queda dando vueltas", async () => {
    const a = await alcance(u.CA);
    expect(new Set(a.commandTeamIds)).toEqual(new Set([t.CY1, t.CY2]));
  });

  it("la cascada sigue la estructura aunque el líder de la brigada esté dado de baja", async () => {
    await db.update(schema.userProfiles).set({ status: "inactive" }).where(inArray(schema.userProfiles.id, [u.L1]));
    try {
      const a = await alcance(u.D);
      expect(a.commandTeamIds).toContain(t.B1);
      expect(a.allowedUserIds).toContain(u.M1);
      expect(a.allowedUserIds).not.toContain(u.L1);
    } finally {
      await db.update(schema.userProfiles).set({ status: "active" }).where(inArray(schema.userProfiles.id, [u.L1]));
    }
  });
});

describe("contactos e incidencias con la cascada", () => {
  it("cada contacto se filtra con el territorio de la brigada de quien lo registró", async () => {
    const visibles = new Set((await visibleContactIds(await alcance(u.D))) ?? []);
    expect(visibles.has(contacto.m1Tonala)).toBe(true);
    // M1 está en una brigada de Tonalá: que B2 no tenga territorio no le abre Zapopan.
    expect(visibles.has(contacto.m1Zapopan)).toBe(false);
    expect(visibles.has(contacto.m2Zapopan)).toBe(true);
    expect(visibles.has(contacto.m3)).toBe(false);
  });

  it("dirección ve las incidencias de sus brigadas y ninguna de otra dirección ni sin asignar ajena", async () => {
    const d = await incidenciasVisibles(u.D);
    expect(d.has(incidencia.deM2)).toBe(true);
    expect(d.has(incidencia.asignadaAB1)).toBe(true);
    expect(d.has(incidencia.deM3)).toBe(false);
    expect(d.has(incidencia.deAdmin)).toBe(false);

    const d2 = await incidenciasVisibles(u.D2);
    expect(d2.has(incidencia.deM3)).toBe(true);
    expect(d2.has(incidencia.deM2)).toBe(false);
  });

  it("un líder no ve las incidencias de la brigada de otro líder de su coordinación", async () => {
    const l1 = await incidenciasVisibles(u.L1);
    expect(l1.has(incidencia.asignadaAB1)).toBe(true);
    expect(l1.has(incidencia.deM2)).toBe(false);
  });
});
