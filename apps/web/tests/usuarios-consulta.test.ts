import "dotenv/config";

import React from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { ActorContext } from "@tonala/shared/auth";

import type * as Navegacion from "next/navigation";

import type * as AyudantesApi from "@/lib/api-helpers";

import { crearBaseDesechable } from "./base-desechable";
import { crearEstructuraDePrueba, type EstructuraDePrueba, type Persona } from "./estructura-de-prueba";

/**
 * El buscador de «Usuarios y permisos» fuera de la dirección web (observación O2 del plan de auditoría de menús):
 * `POST /api/admin/usuarios/consulta` con el texto en el cuerpo. Solo la administración la usa, y cada una ve
 * las cuentas de su municipio (el maestro, todas). Un enlace viejo con `?q=` sigue buscando.
 */

Object.assign(globalThis, { React });

const sesion: { actor: ActorContext | null; userId: string; roleKey: string } = { actor: null, userId: "", roleKey: "" };
vi.mock("@/lib/api-helpers", async (importarOriginal) => {
  const original = await importarOriginal<typeof AyudantesApi>();
  return { ...original, actorFromSession: async () => sesion.actor };
});
vi.mock("@/lib/session-server", () => ({ getServerSession: async () => ({ isLoggedIn: Boolean(sesion.userId), userId: sesion.userId, roleKey: sesion.roleKey }) }));
vi.mock("next/navigation", async (importarOriginal) => ({
  ...(await importarOriginal<typeof Navegacion>()),
  redirect: (destino: string) => {
    throw new Error(`redirige a ${destino}`);
  }
}));

let base: Awaited<ReturnType<typeof crearBaseDesechable>>;
let x: EstructuraDePrueba;

const como = (p: Persona | null) => {
  sesion.actor = p ? x.actor(p) : null;
  sesion.userId = p ? x.u[p] : "";
  sesion.roleKey = p ? x.rol(p) : "";
};

async function consultar(p: Persona | null, cuerpo: Record<string, unknown>) {
  como(p);
  const { POST } = await import("../app/api/admin/usuarios/consulta/route");
  const r = await POST(new Request("http://localhost/api/admin/usuarios/consulta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) }));
  return { estado: r.status, cuerpo: (await r.json()) as { filas?: Array<{ displayName: string; gobernable: boolean }>; total?: number } };
}
const nombres = (c: { filas?: Array<{ displayName: string }> }) => (c.filas ?? []).map((f) => f.displayName).filter((n) => n.startsWith("zz ")).sort();

beforeAll(async () => {
  base = await crearBaseDesechable("usuarios");
  x = await crearEstructuraDePrueba((await import("@/lib/db-client")).getDatabaseClient());
}, 120_000);

afterAll(async () => {
  await base?.borrar();
});

describe("POST /api/admin/usuarios/consulta", () => {
  it("sin sesión, 401; quien no es administración, 403", async () => {
    expect((await consultar(null, { q: "zz" })).estado).toBe(401);
    for (const p of ["D", "L1", "K1", "M1"] as const) expect((await consultar(p, { q: "zz" })).estado, p).toBe(403);
  });

  it("el texto en el cuerpo busca solo en las cuentas de su municipio; el maestro, en todas", async () => {
    expect(nombres((await consultar("AT", { q: "zz l" })).cuerpo)).toEqual(["zz L1", "zz L2", "zz L4"]);
    expect(nombres((await consultar("AZ", { q: "zz l" })).cuerpo)).toEqual(["zz L3"]);
    expect(nombres((await consultar("MA", { q: "zz l" })).cuerpo)).toEqual(["zz L1", "zz L2", "zz L3", "zz L4"]);
    // Por correo, también.
    expect(nombres((await consultar("AT", { q: `zz-m4-${x.u.M4.slice(0, 6)}` })).cuerpo)).toEqual(["zz M4"]);
  });

  it("el filtro de municipio es del maestro: a una administración municipal no le abre otro municipio", async () => {
    expect(nombres((await consultar("AT", { q: "zz l", municipio: "Zapopan" })).cuerpo)).toEqual(["zz L1", "zz L2", "zz L4"]);
    expect(nombres((await consultar("MA", { q: "zz l", municipio: "Zapopan" })).cuerpo)).toEqual(["zz L3"]);
  });

  it("las acciones salen solo en las cuentas que esa administración gobierna (ninguna administración toca a otra)", async () => {
    const r = await consultar("AT", { q: "zz" });
    const gobernables = new Map((r.cuerpo.filas ?? []).map((f) => [f.displayName, f.gobernable]));
    expect(gobernables.get("zz L1")).toBe(true);
    expect(gobernables.get("zz AT")).toBe(false);
  });
});

describe("la pantalla", () => {
  it("un enlace viejo con `?q=` todavía busca (y la tabla quita el texto de la dirección)", async () => {
    como("AT");
    const { default: Pagina } = await import("../app/(shell)/admin-usuarios/page");
    const el = await Pagina({ searchParams: Promise.resolve({ q: "zz m4" }) });
    const tabla = (el.props as { children: unknown[] }).children.flat().find(
      (h): h is { props: { inicial: { filas: Array<{ displayName: string }> }; filtrosIniciales: { q: string } } } =>
        typeof h === "object" && h !== null && "props" in h && typeof (h as { props: Record<string, unknown> }).props.filtrosIniciales === "object"
    );
    expect(tabla && nombres(tabla.props.inicial)).toEqual(["zz M4"]);
    expect(tabla?.props.filtrosIniciales.q).toBe("zz m4");
  });
});
