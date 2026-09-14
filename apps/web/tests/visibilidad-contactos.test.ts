import "dotenv/config";

import crypto from "node:crypto";

import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { schema } from "@tonala/shared/database";

import { visibleContactIds } from "@/lib/contact-visibility";
import { getDatabaseClient } from "@/lib/db-client";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { puedeVerContacto } from "@/lib/permisos-contacto";

/**
 * Visibilidad de contactos por equipo y territorio, contra la base real.
 *
 * Las reglas las decidió el dueño del sistema (ver apps/web/src/lib/contact-visibility.ts):
 * solo administración ve todo; cada quien ve lo de los integrantes de su equipo dentro del
 * territorio del equipo; lo propio nunca desaparece; y el filtro de territorio solo aplica
 * cuando hay dato. Las pruebas unitarias cubren la comparación de territorios; esta cubre lo
 * que solo se ve con datos reales: el SQL de pertenencia, las asignaciones, el municipio
 * cifrado y el de la sección.
 */

const db = getDatabaseClient();
const id = () => crypto.randomUUID();

const L = id(); // líder del equipo (territorial_coordinator)
const M = id(); // integrante (visit_responsible)
const O = id(); // persona ajena, sin equipo (capturist)
const BAJA = id(); // integrante dado de baja
const EQUIPO = id();

const c = {
  zapopan: id(), //          creado por M, en Zapopan
  tonala: id(), //           creado por M, en Tonalá (fuera del territorio)
  sinMunicipio: id(), //     creado por M, sin municipio ni sección
  seccionTonala: id(), //    creado por M, sin municipio pero con sección de Tonalá
  propioLider: id(), //      creado por L, en Tonalá
  asignadoAM: id(), //       creado por O, en Tonalá, asignado a M
  ajeno: id() //             creado por O, en Zapopan
};

let rolIds: Record<string, string> = {};
let seccionTonalaId = "";

async function visibles(userId: string) {
  const ids = await visibleContactIds(await resolveUserNetworkScope(userId));
  return new Set(ids ?? []);
}

beforeAll(async () => {
  const roles = await db.select({ id: schema.roles.id, key: schema.roles.key }).from(schema.roles);
  rolIds = Object.fromEntries(roles.map((r) => [r.key, r.id]));
  const [seccion] = await db
    .select({ id: schema.electoralSections.id })
    .from(schema.electoralSections)
    .where(eq(schema.electoralSections.municipality, "Tonalá"))
    .limit(1);
  if (!seccion) throw new Error("La base de pruebas necesita secciones de Tonalá cargadas");
  seccionTonalaId = seccion.id;

  const persona = (userId: string, rol: string, status = "active") => ({
    id: userId,
    email: `vis-${userId}@pruebas.local`,
    displayName: `Prueba ${rol}`,
    roleId: rolIds[rol]!,
    status
  });
  await db.insert(schema.userProfiles).values([
    persona(L, "territorial_coordinator"),
    persona(M, "visit_responsible"),
    persona(O, "capturist"),
    persona(BAJA, "visit_responsible", "inactive")
  ]);
  await db.insert(schema.teams).values({ id: EQUIPO, name: `Equipo prueba ${EQUIPO}`, leaderId: L, municipality: "Zapopan" });
  await db.insert(schema.teamMembers).values([
    { teamId: EQUIPO, userId: M },
    { teamId: EQUIPO, userId: BAJA }
  ]);

  const contacto = (contactId: string, creador: string, municipality: string | null, sectionId: string | null = null) => ({
    id: contactId,
    displayName: `Contacto ${contactId.slice(0, 6)}`,
    createdByUserId: creador,
    municipality,
    sectionId,
    status: "active",
    createdAt: new Date()
  });
  await db.insert(schema.contacts).values([
    contacto(c.zapopan, M, "Zapopan"),
    contacto(c.tonala, M, "Tonalá"),
    contacto(c.sinMunicipio, M, null),
    contacto(c.seccionTonala, M, null, seccionTonalaId),
    contacto(c.propioLider, L, "Tonalá"),
    contacto(c.asignadoAM, O, "Tonalá"),
    contacto(c.ajeno, O, "Zapopan")
  ]);
  await db.insert(schema.contactAssignments).values({
    contactId: c.asignadoAM,
    assignedUserId: M,
    assignmentStatus: "active",
    assignedByUserId: O,
    assignedAt: new Date()
  });
});

afterAll(async () => {
  const contactos = Object.values(c);
  await db.delete(schema.contactAssignments).where(inArray(schema.contactAssignments.contactId, contactos));
  await db.delete(schema.contacts).where(inArray(schema.contacts.id, contactos));
  await db.delete(schema.teamMembers).where(eq(schema.teamMembers.teamId, EQUIPO));
  await db.delete(schema.teams).where(eq(schema.teams.id, EQUIPO));
  await db.delete(schema.userProfiles).where(inArray(schema.userProfiles.id, [L, M, O, BAJA]));
});

describe("visibilidad de contactos con territorio del equipo (Zapopan)", () => {
  it("el líder ve lo de su equipo dentro del territorio, lo sin municipio y lo suyo", async () => {
    const v = await visibles(L);
    expect(v.has(c.zapopan)).toBe(true);
    expect(v.has(c.sinMunicipio)).toBe(true);
    expect(v.has(c.propioLider)).toBe(true); // propio, aunque sea de Tonalá
    expect(v.has(c.tonala)).toBe(false); // de un integrante, fuera del territorio
    expect(v.has(c.seccionTonala)).toBe(false); // sin municipio, pero su sección es de Tonalá
    expect(v.has(c.asignadoAM)).toBe(false); // asignado a un integrante, fuera del territorio
    expect(v.has(c.ajeno)).toBe(false); // de alguien que no es del equipo
  });

  it("el integrante nunca pierde lo suyo: lo que creó y lo que tiene asignado", async () => {
    const v = await visibles(M);
    expect(v.has(c.tonala)).toBe(true);
    expect(v.has(c.seccionTonala)).toBe(true);
    expect(v.has(c.asignadoAM)).toBe(true);
    expect(v.has(c.zapopan)).toBe(true);
    expect(v.has(c.propioLider)).toBe(false); // del líder, fuera del territorio
    expect(v.has(c.ajeno)).toBe(false);
  });

  it("puedeVerContacto da la misma respuesta que la lista", async () => {
    expect(await puedeVerContacto(c.tonala, M, [])).toBe(true);
    expect(await puedeVerContacto(c.tonala, L, [])).toBe(false);
  });

  it("quien no tiene equipo ve solo lo suyo", async () => {
    const v = await visibles(O);
    expect([...v].sort()).toEqual([c.asignadoAM, c.ajeno].sort());
  });

  it("una sesión de alguien dado de baja no ve nada", async () => {
    expect(await visibles(BAJA)).toEqual(new Set());
  });
});

describe("equipo sin territorio asignado", () => {
  beforeAll(async () => {
    await db.update(schema.teams).set({ municipality: null, section: null }).where(eq(schema.teams.id, EQUIPO));
  });

  it("no limita: el líder ve todo lo de sus integrantes activos", async () => {
    const v = await visibles(L);
    for (const contacto of [c.zapopan, c.tonala, c.sinMunicipio, c.seccionTonala, c.propioLider, c.asignadoAM]) {
      expect(v.has(contacto)).toBe(true);
    }
    expect(v.has(c.ajeno)).toBe(false);
  });
});
