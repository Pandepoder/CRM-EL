import "dotenv/config";

import crypto from "node:crypto";

import { and, desc, eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createAuthenticatedActor, type ActorContext } from "@tonala/shared/auth";
import { schema } from "@tonala/shared/database";

import type * as AyudantesApi from "@/lib/api-helpers";
import { permissionsForRole } from "@/lib/permissions";

import { crearBaseDesechable } from "./base-desechable";

/**
 * Domicilios (pedido del dueño, 2026-09-26), contra los manejadores de verdad y una base desechable:
 *
 * - el alta del panel exige calle y número, y guarda el punto marcado tal cual, sin redondear;
 * - el registro por QR exige la colonia (la calle sigue opcional);
 * - quien se suma por el QR de brigada o se registra solo deja su domicilio, cifrado;
 * - cada quien lo corrige en su perfil;
 * - corregir el domicilio desde la ficha guarda la calle y el punto (antes se tiraban), y lo audita
 *   sin escribir en claro lo que va cifrado.
 */

const sesion: { actor: ActorContext | null } = { actor: null };

vi.mock("@/lib/api-helpers", async (importarOriginal) => {
  const original = await importarOriginal<typeof AyudantesApi>();
  return { ...original, actorFromSession: async () => sesion.actor };
});

const alta = await import("../app/api/crm/contacts/route");
const territorio = await import("../app/api/crm/contacts/[id]/territory/route");
const asignacion = await import("../app/api/crm/contacts/[id]/assignment/route");
const registroPublico = await import("../app/api/public/registro/route");
const unirme = await import("../app/api/public/unirme/route");
const autoRegistro = await import("../app/api/auth/register/route");
const perfil = await import("../app/api/auth/profile/route");
const { getDatabaseClient } = await import("@/lib/db-client");

const id = () => crypto.randomUUID();
const u = { L: id(), B: id() };
const equipo = id();
const SLUG = `zz-domicilio-${Date.now()}`;
const db = () => getDatabaseClient();
let base: Awaited<ReturnType<typeof crearBaseDesechable>>;
let ip = 1;

function como(userId: string, rol: string) {
  sesion.actor = createAuthenticatedActor({
    actorId: userId,
    roles: [rol],
    permissions: permissionsForRole(rol),
    correlationId: id(),
    authenticationMethod: "password",
    requestStartedAt: new Date()
  });
}
const pedir = (url: string, method: string, cuerpo: unknown) =>
  new NextRequest(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json", "x-forwarded-for": `10.88.0.${ip++}` },
    body: JSON.stringify(cuerpo)
  });
const leer = async (r: Response) => ({ status: r.status, cuerpo: (await r.json()) as Record<string, any> });
const crudo = async (consulta: ReturnType<typeof sql>) => (await db().execute<Record<string, unknown>>(consulta)).rows;

beforeAll(async () => {
  base = await crearBaseDesechable("domicilios");
  const roles = Object.fromEntries((await db().select({ id: schema.roles.id, key: schema.roles.key }).from(schema.roles)).map((r) => [r.key, r.id]));
  await db().insert(schema.userProfiles).values([
    { id: u.L, email: "zz-lider-dom@prueba.local", displayName: "zz-lider", roleId: roles.territorial_coordinator!, status: "active", personalSlug: SLUG, municipality: "Tonalá" },
    { id: u.B, email: "zz-brig-dom@prueba.local", displayName: "zz-brigadista", roleId: roles.visit_responsible!, status: "active", municipality: "Tonalá" }
  ]);
  await db().insert(schema.teams).values({ id: equipo, name: "zz-brigada-dom", leaderId: u.L, municipality: "Tonalá" });
  await db().insert(schema.teamMembers).values({ teamId: equipo, userId: u.B });
}, 180_000);

afterAll(async () => {
  sesion.actor = null;
  await base?.borrar();
});

describe("alta de ciudadano en el panel", () => {
  const registrar = async (extra: Record<string, unknown>) => {
    como(u.L, "territorial_coordinator");
    return leer(await alta.POST(pedir("/api/crm/contacts", "POST", { firstName: "zz-Domicilio", municipality: "Tonalá", clientRequestId: id(), ...extra })));
  };

  it("sin calle y número se rechaza, con el campo", async () => {
    const r = await registrar({});
    expect(r.status).toBe(400);
    expect(r.cuerpo).toMatchObject({ code: "domicilio_requerido", campo: "address" });
  });

  it("quien no puede dar de alta recibe 403 aunque el formulario venga incompleto", async () => {
    como(u.B, "visit_responsible");
    for (const cuerpo of [{ firstName: "zz-Domicilio", municipality: "Tonalá" }, { firstName: "zz-Domicilio", municipality: "Tonalá", address: "Hidalgo #21" }]) {
      const r = await leer(await alta.POST(pedir("/api/crm/contacts", "POST", { ...cuerpo, clientRequestId: id() })));
      expect(r.status).toBe(403);
      expect(r.cuerpo).toMatchObject({ code: "forbidden" });
    }
  });

  it("el punto marcado se guarda exacto, sin redondear", async () => {
    const lat = 20.624812345678;
    const lng = -103.242298765432;
    const r = await registrar({ address: "Hidalgo #21", exactLatitude: String(lat), exactLongitude: String(lng) });
    expect(r.status).toBe(201);
    const [c] = await db().select().from(schema.contacts).where(eq(schema.contacts.id, r.cuerpo.contactId));
    expect(c?.address).toBe("Hidalgo #21");
    expect(c?.exactLatitude).toBe(lat);
    expect(c?.exactLongitude).toBe(lng);
  });
});

describe("registro por QR", () => {
  it("sin colonia se rechaza con el campo, y no se guarda nada", async () => {
    sesion.actor = null;
    const antes = (await crudo(sql`SELECT count(*)::int AS n FROM contacts`))[0]!.n;
    const r = await leer(await registroPublico.POST(pedir("/api/public/registro", "POST", {
      slug: SLUG, firstName: "zz-SinColonia", phone: "3377700001", birthDay: 1, birthMonth: 2, municipality: "Tonalá", clientRequestId: id()
    })));
    expect(r.status).toBe(400);
    expect(r.cuerpo.campo).toBe("colony");
    expect((await crudo(sql`SELECT count(*)::int AS n FROM contacts`))[0]!.n).toBe(antes);
  });
});

describe("el domicilio de quien se suma a la estructura", () => {
  const completo = { homeAddress: "Av. Tonaltecas #120", homeColony: "Centro", homeMunicipality: "tonala" };

  it("el QR de brigada lo exige campo por campo, y lo guarda cifrado con el municipio del catálogo", async () => {
    sesion.actor = null;
    const correo = `zz-unirme-dom-${id().slice(0, 6)}@prueba.local`;
    const cuerpo = { slug: SLUG, displayName: "zz-Nueva Brigadista", phone: "3377700002", email: correo, password: "clave-segura" };
    for (const [falta, campo] of [["homeAddress", "homeAddress"], ["homeColony", "homeColony"], ["homeMunicipality", "homeMunicipality"]] as const) {
      const r = await leer(await unirme.POST(pedir("/api/public/unirme", "POST", { ...cuerpo, ...completo, [falta]: "" })));
      expect(r.status).toBe(400);
      expect(r.cuerpo.campo).toBe(campo);
    }
    const r = await leer(await unirme.POST(pedir("/api/public/unirme", "POST", { ...cuerpo, ...completo })));
    expect(r.status).toBe(200);
    const [cuenta] = await db().select().from(schema.userProfiles).where(eq(schema.userProfiles.email, correo));
    expect(cuenta).toMatchObject({ homeAddress: "Av. Tonaltecas #120", homeColony: "Centro", homeMunicipality: "Tonalá", status: "pending" });
    const [enLaBase] = await crudo(sql`SELECT home_address, home_colony FROM user_profiles WHERE email = ${correo}`);
    expect(String(enLaBase!.home_address)).not.toContain("Tonaltecas");
    expect(String(enLaBase!.home_colony)).not.toContain("Centro");
  });

  it("el auto-registro también", async () => {
    sesion.actor = null;
    const correo = `zz-registro-dom-${id().slice(0, 6)}@prueba.local`;
    const cuerpo = { displayName: "zz-Solicitante", email: correo, password: "clave-segura", municipality: "Zapopan" };
    const sin = await leer(await autoRegistro.POST(pedir("/api/auth/register", "POST", cuerpo)));
    expect(sin.status).toBe(400);
    expect(sin.cuerpo.campo).toBe("homeAddress");
    const r = await leer(await autoRegistro.POST(pedir("/api/auth/register", "POST", { ...cuerpo, ...completo })));
    expect(r.status).toBe(200);
    const [cuenta] = await db().select().from(schema.userProfiles).where(eq(schema.userProfiles.email, correo));
    // Donde vive no es donde trabaja: el municipio de la cuenta sigue siendo el que eligió para trabajar.
    expect(cuenta).toMatchObject({ homeMunicipality: "Tonalá", municipality: "Zapopan" });
  });

  it("cada quien lo corrige en su perfil, completo", async () => {
    como(u.B, "visit_responsible");
    const incompleto = await leer(await perfil.PATCH(pedir("/api/auth/profile", "PATCH", { homeAddress: "Calle Nueva #5" })));
    expect(incompleto.status).toBe(400);
    const r = await leer(await perfil.PATCH(pedir("/api/auth/profile", "PATCH", { homeAddress: "Calle Nueva #5", homeColony: "Loma Dorada", homeMunicipality: "Tonalá" })));
    expect(r.status).toBe(200);
    const [cuenta] = await db().select().from(schema.userProfiles).where(eq(schema.userProfiles.id, u.B));
    expect(cuenta).toMatchObject({ homeAddress: "Calle Nueva #5", homeColony: "Loma Dorada", homeMunicipality: "Tonalá", municipality: "Tonalá" });
  });
});

describe("corregir el domicilio desde la ficha", () => {
  let c = "";
  beforeAll(async () => {
    como(u.L, "territorial_coordinator");
    const r = await leer(await alta.POST(pedir("/api/crm/contacts", "POST", {
      firstName: "zz-Puerta", municipality: "Tonalá", address: "Calle vieja #1", clientRequestId: id()
    })));
    c = r.cuerpo.contactId;
    await asignacion.POST(pedir(`/api/crm/contacts/${c}/assignment`, "POST", { assignedUserId: u.B }), { params: Promise.resolve({ id: c }) });
  });
  const corregir = async (cuerpo: unknown) =>
    leer(await territorio.POST(pedir(`/api/crm/contacts/${c}/territory`, "POST", cuerpo), { params: Promise.resolve({ id: c }) }));
  const ficha = async () => (await db().select().from(schema.contacts).where(eq(schema.contacts.id, c)))[0]!;

  it("el brigadista en la puerta guarda la calle y el punto exacto de su GPS, y queda auditado sin datos en claro", async () => {
    como(u.B, "visit_responsible");
    const lat = 20.61234567891;
    const lng = -103.23456789012;
    const r = await corregir({ address: "Calle nueva #22", exactLatitude: lat, exactLongitude: lng });
    expect(r.status).toBe(200);
    const f = await ficha();
    expect([f.address, f.exactLatitude, f.exactLongitude]).toEqual(["Calle nueva #22", lat, lng]);
    const [auditoria] = await db().select().from(schema.auditLogs)
      .where(and(eq(schema.auditLogs.action, "contacts.update"), eq(schema.auditLogs.entityId, c)))
      .orderBy(desc(schema.auditLogs.createdAt)).limit(1);
    expect(auditoria?.actorUserId).toBe(u.B);
    expect(auditoria?.afterData).toEqual({ address: "(cifrado)", ubicacion: "punto marcado" });
    expect(JSON.stringify(auditoria?.afterData)).not.toContain("nueva");
  });

  it("un punto imposible o una calle que no es texto se rechazan sin tocar nada", async () => {
    como(u.B, "visit_responsible");
    expect((await corregir({ exactLatitude: 91, exactLongitude: -103 })).status).toBe(400);
    expect((await corregir({ exactLatitude: 20.6 })).status).toBe(400);
    expect((await corregir({ address: 12345 })).status).toBe(400);
    expect((await ficha()).address).toBe("Calle nueva #22");
  });

  it("«Quitar el punto» lo borra, y el mapa vuelve a ubicarlo por su sección", async () => {
    como(u.B, "visit_responsible");
    expect((await corregir({ exactLatitude: null, exactLongitude: null })).status).toBe(200);
    const f = await ficha();
    expect([f.exactLatitude, f.exactLongitude]).toEqual([null, null]);
  });
});
