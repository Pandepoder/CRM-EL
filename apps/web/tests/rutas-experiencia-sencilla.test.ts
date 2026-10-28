import "dotenv/config";

import crypto from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createAuthenticatedActor, type ActorContext } from "@tonala/shared/auth";
import { huellaDeTelefono, schema } from "@tonala/shared/database";

import type * as AyudantesApi from "@/lib/api-helpers";
import { permissionsForRole } from "@/lib/permissions";

import { crearBaseDesechable } from "./base-desechable";

/**
 * Las rutas que usa el teléfono en el plan de experiencia sencilla, con la sesión de cada rol y contra una
 * base desechable:
 * - poner la meta del día (`PUT /api/equipo/personas/[id]/meta`);
 * - «Mi día» (`GET /api/yo/progreso`), que nunca recibe el id de nadie;
 * - el aviso de teléfono repetido al escribirlo (`GET /api/crm/contacts/telefono-repetido`), que solo dice de
 *   quién es la ficha si quien pregunta la puede ver;
 * - los mensajes del alta de ciudadano (`POST /api/crm/contacts`): en español y con el campo a corregir;
 * - el resultado que la cola del teléfono reenvía al volver la señal: el mismo cierre repetido responde lo
 *   ya hecho, y cualquier otro cierre sobre algo cerrado sigue siendo un conflicto (visita suelta y
 *   actividad de la Agenda).
 *
 *   Tonalá:  L lidera B ── M (brigadista), K (capturista)
 *   Zapopan: LZ lidera BZ ── MZ
 */

const sesion: { actor: ActorContext | null } = { actor: null };
vi.mock("@/lib/api-helpers", async (importarOriginal) => {
  const original = await importarOriginal<typeof AyudantesApi>();
  return { ...original, actorFromSession: async () => sesion.actor };
});

const rutaMeta = await import("../app/api/equipo/personas/[id]/meta/route");
const rutaProgreso = await import("../app/api/yo/progreso/route");
const rutaTelefono = await import("../app/api/crm/contacts/telefono-repetido/route");
const rutaVisita = await import("../app/api/crm/contacts/[id]/visits/[visitId]/complete/route");
const rutaActividad = await import("../app/api/equipo/tareas/[id]/route");
const rutaAlta = await import("../app/api/crm/contacts/route");
const { getDatabaseClient } = await import("@/lib/db-client");

const id = (): string => crypto.randomUUID();
const db = () => getDatabaseClient();
const u = { L: id(), M: id(), K: id(), LZ: id(), MZ: id() };
const ROL: Record<string, string> = { L: "territorial_coordinator", M: "visit_responsible", K: "capturist", LZ: "territorial_coordinator", MZ: "visit_responsible" };
const c = { deM: id(), deMZ: id() };
const visita = id();
const actividad = id();
const TEL_M = "3312345678";
const TEL_MZ = "3398765432";
let base: Awaited<ReturnType<typeof crearBaseDesechable>>;

function como(clave: keyof typeof u | null) {
  sesion.actor = clave
    ? createAuthenticatedActor({
        actorId: u[clave],
        roles: [ROL[clave]!],
        permissions: permissionsForRole(ROL[clave]!),
        correlationId: id(),
        authenticationMethod: "password",
        requestStartedAt: new Date()
      })
    : null;
}

const json = (url: string, method: string, cuerpo?: unknown, crudo?: string) =>
  new NextRequest(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(cuerpo !== undefined || crudo !== undefined ? { body: crudo ?? JSON.stringify(cuerpo) } : {})
  });

const ponerMeta = (persona: string, cuerpo?: unknown, crudo?: string) =>
  rutaMeta.PUT(json(`/api/equipo/personas/${persona}/meta`, "PUT", cuerpo, crudo), { params: Promise.resolve({ id: persona }) });
const telefono = (numero: string) => rutaTelefono.GET(new Request(`http://localhost/api/crm/contacts/telefono-repetido?telefono=${numero}`));
const cerrarVisita = (cuerpo: unknown, visitId = visita) =>
  rutaVisita.POST(json(`/api/crm/contacts/${c.deM}/visits/${visitId}/complete`, "POST", cuerpo), { params: Promise.resolve({ id: c.deM, visitId }) });
const cerrarActividad = (cuerpo: unknown) =>
  rutaActividad.PATCH(json(`/api/equipo/tareas/${actividad}`, "PATCH", cuerpo), { params: Promise.resolve({ id: actividad }) });

beforeAll(async () => {
  base = await crearBaseDesechable("rutas_sencilla");
  const roles = Object.fromEntries((await db().select({ id: schema.roles.id, key: schema.roles.key }).from(schema.roles)).map((r) => [r.key, r.id]));
  await db().insert(schema.userProfiles).values(
    (Object.keys(u) as Array<keyof typeof u>).map((k) => ({
      id: u[k],
      email: `zz-${k.toLowerCase()}-${u[k].slice(0, 6)}@prueba.local`,
      displayName: `zz ${k}`,
      roleId: roles[ROL[k]!]!,
      status: "active",
      municipality: k.endsWith("Z") ? "Zapopan" : "Tonalá"
    }))
  );
  const B = id();
  const BZ = id();
  await db().insert(schema.teams).values([
    { id: B, name: "zz B", leaderId: u.L, municipality: "Tonalá" },
    { id: BZ, name: "zz BZ", leaderId: u.LZ, municipality: "Zapopan" }
  ]);
  await db().insert(schema.teamMembers).values([
    { teamId: B, userId: u.M },
    { teamId: B, userId: u.K },
    { teamId: BZ, userId: u.MZ }
  ]);
  await db().insert(schema.contacts).values([
    { id: c.deM, displayName: "zz ciudadano de M", createdByUserId: u.M, municipality: "Tonalá", status: "active", createdAt: new Date(), phone: TEL_M, phoneHash: huellaDeTelefono(TEL_M) },
    { id: c.deMZ, displayName: "zz ciudadano de MZ", createdByUserId: u.MZ, municipality: "Zapopan", status: "active", createdAt: new Date(), phone: TEL_MZ, phoneHash: huellaDeTelefono(TEL_MZ) }
  ]);
  const [colonia] = await db().select({ id: schema.colonies.id }).from(schema.colonies).limit(1);
  await db().insert(schema.visits).values({
    id: visita,
    contactId: c.deM,
    colonyId: colonia!.id,
    assignedUserId: u.M,
    scheduledAt: new Date(),
    status: "scheduled",
    visitLocationText: "Domicilio de prueba",
    createdByUserId: u.M,
    createdAt: new Date()
  });
  await db().insert(schema.eventReports).values({
    id: actividad,
    title: "zz actividad para cerrar",
    description: "Prueba de cierre repetido",
    latitude: 20.62,
    longitude: -103.24,
    category: "brigada",
    createdByUserId: u.M,
    assignedToUserId: u.M,
    municipality: "Tonalá",
    status: "active"
  });
}, 180_000);

afterAll(async () => {
  sesion.actor = null;
  await base?.borrar();
});

describe("PUT /api/equipo/personas/[id]/meta", () => {
  it("sin sesión 401; id mal formado 404; cuerpo roto o sin meta 400", async () => {
    como(null);
    expect((await ponerMeta(u.M, { meta: 5 })).status).toBe(401);
    como("L");
    expect((await ponerMeta("no-es-un-id", { meta: 5 })).status).toBe(404);
    expect((await ponerMeta(u.M, undefined, "{no es json")).status).toBe(400);
    expect((await ponerMeta(u.M, {})).status).toBe(400);
    expect((await ponerMeta(u.M, { meta: 0 })).status).toBe(400);
    expect((await ponerMeta(u.M, { meta: "7" })).status).toBe(400);
  });

  it("su líder sí (200); la capturista del equipo, el propio brigadista y otro líder no (403)", async () => {
    como("K");
    expect((await ponerMeta(u.M, { meta: 7 })).status).toBe(403);
    como("M");
    expect((await ponerMeta(u.M, { meta: 7 })).status).toBe(403);
    como("LZ");
    expect((await ponerMeta(u.M, { meta: 7 })).status).toBe(403);
    como("L");
    const r = await ponerMeta(u.M, { meta: 7 });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ meta: 7 });
  });
});

describe("GET /api/yo/progreso", () => {
  it("sin sesión 401", async () => {
    como(null);
    expect((await rutaProgreso.GET()).status).toBe(401);
  });

  it("no recibe ningún parámetro: siempre es el progreso de quien tiene la sesión", async () => {
    expect(rutaProgreso.GET.length).toBe(0);
    como("M");
    const r = await rutaProgreso.GET();
    expect(r.status).toBe(200);
    expect(r.headers.get("Cache-Control")).toBe("no-store");
    const p = await r.json();
    expect(p.metaDelLider).toBe(7);
    expect(p.perfil).toEqual({ registra: false, haceCampo: true });
    // Su brigada tiene 3 personas (L, M, K): no llega al mínimo, así que no hay total que enseñar.
    expect(p.equipo).toBeNull();
    como("L");
    const lider = await (await rutaProgreso.GET()).json();
    expect(lider.metaDelLider).toBeNull();
    expect(lider.equipo).toMatchObject({ tipo: "mando", personas: 2 });
  });
});

describe("GET /api/crm/contacts/telefono-repetido", () => {
  it("sin sesión 401; quien no da de alta ciudadanos (brigadista) 403", async () => {
    como(null);
    expect((await telefono(TEL_M)).status).toBe(401);
    como("M");
    expect((await telefono(TEL_M)).status).toBe(403);
  });

  it("avisa del repetido, y solo dice de quién es la ficha si quien pregunta la puede ver", async () => {
    como("K");
    expect(await (await telefono("123")).json()).toEqual({ repetido: false });
    expect(await (await telefono("3300000000")).json()).toEqual({ repetido: false });
    const propio = await (await telefono(TEL_M)).json();
    expect(propio).toMatchObject({ repetido: true, contactoExistenteId: c.deM });
    const ajeno = await (await telefono(TEL_MZ)).json();
    expect(ajeno).toMatchObject({ repetido: true, contactoExistenteId: null });
    expect(JSON.stringify(ajeno)).not.toContain(c.deMZ);
  });
});

describe("POST /api/crm/contacts: mensajes que dicen qué corregir", () => {
  const alta = (cuerpo: unknown) => rutaAlta.POST(json("/api/crm/contacts", "POST", cuerpo));

  it("quien no da de alta recibe 403 antes que la lista de lo que le falta", async () => {
    como("M");
    expect((await alta({ birthYear: 1800 })).status).toBe(403);
  });

  it("un dato mal escrito: 400 con el campo y el mensaje en español, no el de Zod en inglés", async () => {
    como("K");
    const casos: Array<[Record<string, unknown>, string, RegExp]> = [
      [{ firstName: "zz", birthYear: 1800 }, "birthYear", /año con 4 dígitos/],
      [{ firstName: "zz", email: "sin-arroba" }, "email", /correo/],
      [{ firstName: "zz", sectionNum: "abc" }, "sectionNum", /sección son solo números/],
      [{ firstName: "zz", birthMonth: 13 }, "birthMonth", /mes del cumpleaños/]
    ];
    for (const [cuerpo, campo, mensaje] of casos) {
      const r = await alta(cuerpo);
      expect(r.status, campo).toBe(400);
      const datos = await r.json();
      expect(datos, campo).toMatchObject({ code: "datos_invalidos", campo });
      expect(datos.message, campo).toMatch(mensaje);
      expect(datos.message, campo).not.toMatch(/expected|Too small|Invalid/i);
    }
  });
});

describe("el mismo cierre reenviado por la cola del teléfono", () => {
  const cierre = { structuredOutcome: "no_contact", summary: "No había nadie en casa." };

  it("visita suelta: el primero cierra, el mismo otra vez responde lo hecho, cualquier otro es conflicto", async () => {
    como(null);
    expect((await cerrarVisita(cierre)).status).toBe(401);
    como("M");
    expect((await cerrarVisita(cierre, "no-es-un-id")).status).toBe(404);
    // Más de lo que acepta una visita: se rechaza con un mensaje en español y la visita sigue pendiente.
    const largo = await cerrarVisita({ ...cierre, summary: "a".repeat(1001) });
    expect(largo.status).toBeGreaterThanOrEqual(400);
    expect(largo.status).toBeLessThan(500);
    expect((await largo.json()).message).toMatch(/hasta 1000 caracteres/);

    expect((await cerrarVisita(cierre)).status).toBe(200);
    const [v] = await db().select().from(schema.visits).where(eq(schema.visits.id, visita));
    expect([v!.status, v!.completedByUserId]).toEqual(["completed", u.M]);

    const otraVez = await cerrarVisita(cierre);
    expect(otraVez.status).toBe(200);
    expect(await otraVez.json()).toMatchObject({ status: "completed", repetido: true });
    // Con espacios de más también es el mismo cierre.
    expect((await cerrarVisita({ ...cierre, summary: `  ${cierre.summary} ` })).status).toBe(200);

    const otro = await cerrarVisita({ ...cierre, summary: "Otro resumen." });
    expect(otro.status).toBe(409);
    expect((await otro.json()).message).toBe("Esta visita ya estaba cerrada.");
    expect((await cerrarVisita({ ...cierre, structuredOutcome: "rejected" })).status).toBe(409);
    como("L");
    expect((await cerrarVisita(cierre)).status).toBe(409);

    const resultados = await db().select({ n: sql<string>`count(*)` }).from(schema.visitResults).where(eq(schema.visitResults.visitId, visita));
    expect(Number(resultados[0]!.n)).toBe(1);
  });

  it("actividad de la Agenda: lo mismo, con un solo cierre en el historial y en la auditoría", async () => {
    const cuerpo = { accion: "completar", outcome: "successful", summary: "Platicamos con la familia." };
    como("M");
    expect((await cerrarActividad(cuerpo)).status).toBe(200);
    expect((await cerrarActividad(cuerpo)).status).toBe(200);
    expect((await cerrarActividad({ ...cuerpo, summary: "Otra conclusión." })).status).toBe(409);
    como("L");
    expect((await cerrarActividad(cuerpo)).status).toBe(409);

    const [a] = await db().select().from(schema.eventReports).where(eq(schema.eventReports.id, actividad));
    expect([a!.status, a!.closedByUserId, a!.outcome]).toEqual(["resolved", u.M, "successful"]);
    const cierres = await db()
      .select({ n: sql<string>`count(*)` })
      .from(schema.activityHistory)
      .where(and(eq(schema.activityHistory.eventReportId, actividad), eq(schema.activityHistory.kind, "completed")));
    expect(Number(cierres[0]!.n)).toBe(1);
    const auditoria = await db()
      .select({ n: sql<string>`count(*)` })
      .from(schema.auditLogs)
      .where(and(eq(schema.auditLogs.entityId, actividad), eq(schema.auditLogs.action, "agenda.task.complete")));
    expect(Number(auditoria[0]!.n)).toBe(1);
  });
});
