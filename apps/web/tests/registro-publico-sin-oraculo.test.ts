import "dotenv/config";

import crypto from "node:crypto";

import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createAuthenticatedActor, type ActorContext } from "@tonala/shared/auth";
import { huellaDeTelefono, schema } from "@tonala/shared/database";

import type * as AyudantesApi from "@/lib/api-helpers";
import { getDatabaseClient } from "@/lib/db-client";
import { permissionsForRole } from "@/lib/permissions";

import { crearBaseDesechable } from "./base-desechable";

/**
 * El registro por QR (`POST /api/public/registro`) no pide sesión: no debe servir para averiguar si un teléfono
 * está en el padrón. Antes bastaba mandar un teléfono sin municipio: «ya registrado» (409) si estaba,
 * «elige el municipio» (400) si no, sin guardar nada ni dejar rastro.
 *
 * - Sin la sesión de quien opera el enlace, un teléfono repetido recibe la misma respuesta que un registro nuevo
 *   y no se guarda otra vez; la respuesta no trae la ficha ni si fue repetido.
 * - Lo que falta (municipio, colonia, fecha) se revisa antes que el teléfono.
 * - El tope por enlace es por la persona dueña del enlace, no por cómo se escribió.
 * - Con la sesión de quien opera el enlace (modo evento), el repetido se sigue diciendo.
 */

const sesion: { actor: ActorContext | null; userId: string } = { actor: null, userId: "" };
vi.mock("@/lib/api-helpers", async (importarOriginal) => ({
  ...(await importarOriginal<typeof AyudantesApi>()),
  actorFromSession: async () => sesion.actor
}));
vi.mock("@/lib/session-server", () => ({ getServerSession: async () => ({ isLoggedIn: Boolean(sesion.userId), userId: sesion.userId }) }));

const id = () => crypto.randomUUID();
const u = { L: id(), O: id() };
const rolDe = { L: "territorial_coordinator", O: "capturist" } as const;
const SLUG = `zz-qr-${Date.now()}`;
const db = () => getDatabaseClient();
let base: Awaited<ReturnType<typeof crearBaseDesechable>>;

/** L es dueño del enlace; O, una capturista de otra estructura. */
const como = (p: keyof typeof u | null) => {
  sesion.userId = p ? u[p] : "";
  sesion.actor = p
    ? createAuthenticatedActor({
        actorId: u[p],
        roles: [rolDe[p]],
        permissions: permissionsForRole(rolDe[p]),
        correlationId: id(),
        authenticationMethod: "password",
        requestStartedAt: new Date()
      })
    : null;
};

const persona = (telefono: string, extra: Record<string, unknown> = {}) => ({
  slug: SLUG,
  firstName: "zz-qr",
  lastName: "Prueba",
  phone: telefono,
  birthDay: 3,
  birthMonth: 5,
  municipality: "Tonalá",
  colony: "zz-Colonia",
  clientRequestId: id(),
  ...extra
});

async function registrar(cuerpo: Record<string, unknown>, ip = "10.8.0.1") {
  const { POST } = await import("../app/api/public/registro/route");
  const headers: Record<string, string> = { "content-type": "application/json", "x-forwarded-for": ip };
  // Quien abre el QR casi nunca trae sesión; quien opera el modo evento, sí.
  if (sesion.userId) headers.cookie = "tonala_session=prueba";
  const r = await POST(new NextRequest("http://localhost/api/public/registro", { method: "POST", headers, body: JSON.stringify(cuerpo) }));
  return { estado: r.status, cuerpo: (await r.json()) as Record<string, unknown> };
}

const fichas = (telefono: string) =>
  db()
    .select({ id: schema.contacts.id, nombre: schema.contacts.displayName })
    .from(schema.contacts)
    .where(eq(schema.contacts.phoneHash, huellaDeTelefono(telefono)!));

beforeAll(async () => {
  base = await crearBaseDesechable("registropublico");
  const roles = Object.fromEntries((await db().select({ id: schema.roles.id, key: schema.roles.key }).from(schema.roles)).map((r) => [r.key, r.id]));
  await db().insert(schema.userProfiles).values([
    { id: u.L, email: "zz-qr-lider@prueba.local", displayName: "zz-qr-lider", roleId: roles[rolDe.L]!, status: "active", personalSlug: SLUG },
    { id: u.O, email: "zz-qr-ajeno@prueba.local", displayName: "zz-qr-ajeno", roleId: roles[rolDe.O]!, status: "active" }
  ]);
}, 120_000);

afterAll(async () => {
  await base?.borrar();
});

describe("registro por QR sin sesión: no dice si un teléfono está en el padrón", () => {
  it("un teléfono que ya está recibe la misma respuesta que uno nuevo, y no se guarda otra vez", async () => {
    como(null);
    const nuevo = await registrar(persona("3391000001"));
    const repetido = await registrar(persona("3391000001", { firstName: "zz-qr-otra" }));
    expect(nuevo.estado).toBe(200);
    expect(repetido).toEqual(nuevo);
    // Ni la ficha ni si fue repetido: quien abre el QR no los necesita, y con ellos se notaría la diferencia.
    expect(Object.keys(nuevo.cuerpo).sort()).toEqual(["message", "success"]);
    expect((await fichas("3391000001")).map((f) => f.nombre)).toEqual(["zz-qr Prueba"]);
  });

  it("pedir el modo evento sin sesión no cambia nada: lo que cuenta es la sesión, no lo que diga el cuerpo", async () => {
    como(null);
    const nuevo = await registrar(persona("3391000007", { modo: "evento" }));
    const repetido = await registrar(persona("3391000007", { modo: "evento" }));
    expect(nuevo.estado).toBe(200);
    expect(repetido).toEqual(nuevo);
    expect(await fichas("3391000007")).toHaveLength(1);
  });

  it("la misma solicitud enviada dos veces responde igual, esté o no el teléfono en el padrón", async () => {
    como(null);
    await registrar(persona("3391000002"));
    const clave = id();
    const enPadron = [await registrar(persona("3391000002", { clientRequestId: clave })), await registrar(persona("3391000002", { clientRequestId: clave }))];
    const otraClave = id();
    const fuera = [await registrar(persona("3391000003", { clientRequestId: otraClave })), await registrar(persona("3391000003", { clientRequestId: otraClave }))];
    expect(enPadron[1]).toEqual(enPadron[0]);
    expect(fuera[1]).toEqual(fuera[0]);
    expect(fuera[0]).toEqual(enPadron[0]);
    expect(await fichas("3391000002")).toHaveLength(1);
    expect(await fichas("3391000003")).toHaveLength(1);
  });

  it("lo que falta se dice igual, esté o no el teléfono en el padrón, y no se guarda nada", async () => {
    como(null);
    await registrar(persona("3391000004"));
    const casos: Array<[Record<string, unknown>, string]> = [
      [{ municipality: undefined }, "municipality"],
      [{ colony: undefined }, "colony"],
      [{ birthDay: 31, birthMonth: 2 }, "birthDay"]
    ];
    for (const [cambio, campo] of casos) {
      const enPadron = await registrar(persona("3391000004", cambio));
      const fuera = await registrar(persona("3391000005", cambio));
      expect(enPadron.estado, campo).toBe(400);
      expect(enPadron.cuerpo, campo).toMatchObject({ campo });
      expect(fuera, campo).toEqual(enPadron);
    }
    expect(await fichas("3391000004")).toHaveLength(1);
    expect(await fichas("3391000005")).toHaveLength(0);
  });

  it("el tope por enlace no se esquiva escribiendo el enlace con espacios", async () => {
    como(null);
    const ip = "10.8.9.9";
    // 300 intentos por hora, IP y enlace; cada uno con el enlace escrito distinto (espacios antes y después).
    const variantes = Array.from({ length: 300 }, (_, i) => `${" ".repeat(i % 7)}${SLUG}${" ".repeat(Math.floor(i / 7) % 7)}`);
    for (let i = 0; i < variantes.length; i += 50) {
      const estados = await Promise.all(variantes.slice(i, i + 50).map((slug) => registrar(persona("3391000006", { slug, municipality: undefined }), ip)));
      expect(estados.every((r) => r.estado === 400)).toBe(true);
    }
    expect((await registrar(persona("3391000006", { slug: ` ${SLUG}`, municipality: undefined }), ip)).estado).toBe(429);
  }, 60_000);
});

describe("con la sesión de quien opera el enlace (modo evento)", () => {
  it("el repetido se dice: 409 en el teléfono, y la ficha sigue siendo una", async () => {
    como(null);
    await registrar(persona("3391000010"));
    como("L");
    const repetido = await registrar(persona("3391000010", { modo: "evento" }));
    expect(repetido.estado).toBe(409);
    expect(repetido.cuerpo).toMatchObject({ campo: "phone" });
    expect(await fichas("3391000010")).toHaveLength(1);
    // Un registro nuevo desde el kiosco sí trae su ficha.
    const nuevo = await registrar(persona("3391000011", { modo: "evento" }));
    expect(nuevo.estado).toBe(200);
    expect(nuevo.cuerpo.contactId).toBe((await fichas("3391000011"))[0]?.id);
  });

  it("una sesión que no opera ese enlace recibe lo mismo que sin sesión", async () => {
    como(null);
    await registrar(persona("3391000012"));
    const sinSesion = await registrar(persona("3391000012"));
    como("O");
    const ajena = await registrar(persona("3391000012"));
    expect(ajena.estado).toBe(200);
    expect(ajena).toEqual(sinSesion);
    expect(await fichas("3391000012")).toHaveLength(1);
  });
});
