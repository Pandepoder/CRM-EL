import "dotenv/config";

import crypto from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { ActorContext } from "@tonala/shared/auth";
import { schema } from "@tonala/shared/database";

import type * as AyudantesApi from "@/lib/api-helpers";

import { crearBaseDesechable } from "./base-desechable";
import { crearEstructuraDePrueba, type EstructuraDePrueba } from "./estructura-de-prueba";

/**
 * `GET /api/electoral/sections?ligera=1` (observación O3 del plan de auditoría de menús): lo que necesita el
 * selector de «Registrar ciudadano» —id, número y municipio— sin colonias ni conteos de ciudadanos, que dicen
 * dónde trabaja cada estructura. Sigue pidiendo sesión, y el GET completo de siempre no cambia.
 */

const sesion: { actor: ActorContext | null } = { actor: null };
vi.mock("@/lib/api-helpers", async (importarOriginal) => {
  const original = await importarOriginal<typeof AyudantesApi>();
  return { ...original, actorFromSession: async () => sesion.actor };
});

let base: Awaited<ReturnType<typeof crearBaseDesechable>>;
let x: EstructuraDePrueba;
const seccion = crypto.randomUUID();

async function pedir(ligera: boolean) {
  const { GET } = await import("../app/api/electoral/sections/route");
  const r = await GET(new Request(`http://localhost/api/electoral/sections${ligera ? "?ligera=1" : ""}`));
  return { estado: r.status, cache: r.headers.get("cache-control"), cuerpo: (await r.json()) as { sections?: Array<Record<string, unknown>> } };
}

beforeAll(async () => {
  base = await crearBaseDesechable("seccionesligeras");
  const db = (await import("@/lib/db-client")).getDatabaseClient();
  x = await crearEstructuraDePrueba(db);
  await db.insert(schema.electoralSections).values({ id: seccion, sectionNum: 9811, municipality: "Tonalá" });
  await db.insert(schema.contacts).values({ id: crypto.randomUUID(), displayName: "zz Vecino de la 9811", status: "active", createdByUserId: x.u.M1, municipality: "Tonalá", sectionId: seccion, createdAt: new Date() });
}, 120_000);

afterAll(async () => {
  await base?.borrar();
});

describe("el catálogo ligero de secciones", () => {
  it("sin sesión, 401", async () => {
    sesion.actor = null;
    expect((await pedir(true)).estado).toBe(401);
  });

  it("trae solo id, número y municipio, sin colonias ni conteos, y el navegador lo puede guardar un rato", async () => {
    sesion.actor = x.actor("M1");
    const r = await pedir(true);
    expect(r.estado).toBe(200);
    expect(r.cache).toBe("private, max-age=600");
    const la9811 = r.cuerpo.sections?.find((s) => s.sectionNum === 9811);
    expect(la9811).toEqual({ id: seccion, sectionNum: 9811, municipality: "Tonalá" });
    for (const s of r.cuerpo.sections ?? []) expect(Object.keys(s).sort()).toEqual(["id", "municipality", "sectionNum"]);
  });

  it("el GET completo de siempre no cambia: colonias y el conteo acotado al alcance", async () => {
    sesion.actor = x.actor("L1");
    expect((await pedir(false)).cuerpo.sections?.find((s) => s.sectionNum === 9811)).toMatchObject({ contactsCount: 1, colonies: [] });
    sesion.actor = x.actor("L2");
    expect((await pedir(false)).cuerpo.sections?.find((s) => s.sectionNum === 9811)).toMatchObject({ contactsCount: 0 });
  });
});
