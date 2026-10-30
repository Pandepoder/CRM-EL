import "dotenv/config";

import crypto from "node:crypto";

import { and, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import React from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { ActorContext } from "@tonala/shared/auth";
import { schema } from "@tonala/shared/database";

import type * as AyudantesApi from "@/lib/api-helpers";

import { crearBaseDesechable } from "./base-desechable";
import { crearEstructuraDePrueba, type EstructuraDePrueba, type Persona } from "./estructura-de-prueba";

/**
 * El buscador del Directorio fuera de la dirección web (observación O2 del plan de auditoría de menús):
 * `POST /api/directorio/consulta` con el texto en el cuerpo, la exportación por `POST` con el texto en el
 * formulario, y que el texto solo encuentre lo que quien mira puede ver. Un enlace viejo con `?q=` sigue buscando.
 */

// La página del Directorio se llama directo y devuelve JSX: en estas pruebas se compila con `React` global.
Object.assign(globalThis, { React });

const sesion: { actor: ActorContext | null; userId: string; roleKey: string } = { actor: null, userId: "", roleKey: "" };
vi.mock("@/lib/api-helpers", async (importarOriginal) => {
  const original = await importarOriginal<typeof AyudantesApi>();
  return { ...original, actorFromSession: async () => sesion.actor };
});
vi.mock("@/lib/session-server", () => ({ getServerSession: async () => ({ userId: sesion.userId, roleKey: sesion.roleKey }) }));

let base: Awaited<ReturnType<typeof crearBaseDesechable>>;
let x: EstructuraDePrueba;
const db = async () => (await import("@/lib/db-client")).getDatabaseClient();
const id = (): string => crypto.randomUUID();

const como = (p: Persona) => {
  sesion.actor = x.actor(p);
  sesion.userId = x.u[p];
  sesion.roleKey = x.rol(p);
};

async function consultar(p: Persona | null, cuerpo: unknown) {
  if (p) como(p);
  else sesion.actor = null;
  const { POST } = await import("../app/api/directorio/consulta/route");
  const r = await POST(new Request("http://localhost/api/directorio/consulta", { method: "POST", headers: { "Content-Type": "application/json" }, body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo) }));
  return { estado: r.status, cuerpo: (await r.json()) as { filas?: Array<{ displayName: string }>; total?: number; registro?: { id: string; nombre: string } | null; error?: string } };
}
const nombres = (c: { filas?: Array<{ displayName: string }> }) => (c.filas ?? []).map((f) => f.displayName).filter((n) => n.startsWith("zz ")).sort();

async function exportarPorPost(p: Persona, q: string) {
  como(p);
  const { POST } = await import("../app/api/crm/contacts/export/route");
  const formulario = new FormData();
  formulario.set("q", q);
  const r = await POST(new NextRequest("http://localhost/api/crm/contacts/export", { method: "POST", body: formulario }));
  return { estado: r.status, texto: await r.text() };
}

beforeAll(async () => {
  base = await crearBaseDesechable("directorio");
  x = await crearEstructuraDePrueba(await db());
  await (await db()).insert(schema.contacts).values([
    { id: id(), displayName: "zz Ana Directorio", status: "active", createdByUserId: x.u.M1, municipality: "Tonalá", createdAt: new Date() },
    { id: id(), displayName: "zz Beto Directorio", status: "active", createdByUserId: x.u.M3, municipality: "Tonalá", createdAt: new Date() }
  ]);
}, 120_000);

afterAll(async () => {
  await base?.borrar();
});

describe("POST /api/directorio/consulta", () => {
  it("sin sesión, 401; con un cuerpo que no es JSON, 400", async () => {
    expect((await consultar(null, { q: "ana" })).estado).toBe(401);
    expect((await consultar("L1", "{no es json")).estado).toBe(400);
  });

  it("el texto en el cuerpo encuentra solo lo que quien mira puede ver", async () => {
    expect(nombres((await consultar("L1", { q: "directorio" })).cuerpo)).toEqual(["zz Ana Directorio"]);
    expect(nombres((await consultar("L2", { q: "directorio" })).cuerpo)).toEqual(["zz Beto Directorio"]);
    expect(nombres((await consultar("D", { q: "directorio" })).cuerpo)).toEqual(["zz Ana Directorio", "zz Beto Directorio"]);
    // Otra dirección y otro municipio: ni saben que existe.
    for (const p of ["DB", "AZ", "M3"] as const) expect(nombres((await consultar(p, { q: "ana directorio" })).cuerpo), p).toEqual([]);
  });

  it("los filtros del cuerpo valen lo mismo que en la pantalla; «Registrados por» de alguien ajeno se ignora", async () => {
    const deM1 = await consultar("L1", { registro: x.u.M1 });
    expect(deM1.cuerpo.registro).toEqual({ id: x.u.M1, nombre: "zz M1" });
    expect(nombres(deM1.cuerpo)).toEqual(["zz Ana Directorio"]);
    expect((await consultar("L1", { registro: x.u.M3 })).cuerpo.registro).toBeNull();
  });
});

describe("la pantalla", () => {
  it("un enlace viejo con `?q=` todavía busca (y la pantalla quita el texto de la dirección)", async () => {
    como("L1");
    const { default: Pagina } = await import("../app/(shell)/crm/contacts/page");
    const el = await Pagina({ searchParams: Promise.resolve({ q: "ana" }) });
    const props = el.props as { inicial: { filas: Array<{ displayName: string }> }; filtrosIniciales: { q: string } };
    expect(nombres(props.inicial)).toEqual(["zz Ana Directorio"]);
    expect(props.filtrosIniciales.q).toBe("ana");
  });
});

describe("Exportar por POST", () => {
  it("el texto va en el formulario, exporta solo lo visible y queda en la auditoría con la búsqueda", async () => {
    const deL1 = await exportarPorPost("L1", "ana");
    expect(deL1.estado).toBe(200);
    expect(deL1.texto).toContain("zz Ana Directorio");
    expect(deL1.texto).not.toContain("zz Beto Directorio");

    const deL2 = await exportarPorPost("L2", "ana");
    expect(deL2.texto).not.toContain("zz Ana Directorio");

    const [registro] = await (await db())
      .select({ despues: schema.auditLogs.afterData })
      .from(schema.auditLogs)
      .where(and(eq(schema.auditLogs.action, "contacts.export"), eq(schema.auditLogs.actorUserId, x.u.L1)));
    expect(registro?.despues).toMatchObject({ ciudadanos: 1, busqueda: "ana" });
  });

  it("el GET de siempre sigue funcionando para los enlaces y scripts que ya lo usan", async () => {
    como("L1");
    const { GET } = await import("../app/api/crm/contacts/export/route");
    const r = await GET(new NextRequest("http://localhost/api/crm/contacts/export"));
    expect(r.status).toBe(200);
    expect(await r.text()).toContain("zz Ana Directorio");
  });
});
