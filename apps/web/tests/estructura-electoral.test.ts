import "dotenv/config";

import crypto from "node:crypto";
import fs from "node:fs";

import { and, eq } from "drizzle-orm";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { ActorContext } from "@tonala/shared/auth";
import { schema } from "@tonala/shared/database";

import type * as AyudantesApi from "@/lib/api-helpers";

import { crearBaseDesechable } from "./base-desechable";
import { crearEstructuraDePrueba, type EstructuraDePrueba, type Persona } from "./estructura-de-prueba";

/**
 * Estructura Electoral contra la API (plan de auditoría de menús, fase 4): la migración 0029, nombrar a una
 * cuenta o a un ciudadano (D4), la casilla (D5), la cobertura que cuenta solo la estructura de quien mira (D11),
 * cambiar y quitar con auditoría, y a quién se sugiere. La matriz completa del §4.4, en
 * `matriz-estructura.test.ts`.
 */

const sesion: { actor: ActorContext | null } = { actor: null };
vi.mock("@/lib/api-helpers", async (importarOriginal) => {
  const original = await importarOriginal<typeof AyudantesApi>();
  return { ...original, actorFromSession: async () => sesion.actor };
});

const nombrarRuta = await import("../app/api/electoral/representatives/route");
const unoRuta = await import("../app/api/electoral/representatives/[id]/route");
const coberturaRuta = await import("../app/api/electoral/cobertura/route");
const candidatosRuta = await import("../app/api/electoral/candidatos/route");

const MIGRACION = fs.readFileSync(new URL("../../../db/migrations/0029_estructura_electoral.sql", import.meta.url), "utf8");

let base: Awaited<ReturnType<typeof crearBaseDesechable>>;
let x: EstructuraDePrueba;
const db = async () => (await import("@/lib/db-client")).getDatabaseClient();
const id = () => crypto.randomUUID();
const como = (p: Persona | null) => {
  sesion.actor = p ? x.actor(p) : null;
};
const json = (url: string, method: string, cuerpo?: unknown) =>
  new Request(`http://localhost${url}`, { method, headers: { "Content-Type": "application/json" }, ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) }) });

const s = { t1: id(), t2: id(), t3: id(), z1: id(), viejas: id() };
const NUM = { t1: 9901, t2: 9902, t3: 9903, z1: 9911, viejas: 9999 };
const vecino = { deM1: id(), deL3: id(), deL4: id() };

async function nombrar(p: Persona, cuerpo: Record<string, unknown>) {
  como(p);
  const r = await nombrarRuta.POST(json("/api/electoral/representatives", "POST", cuerpo));
  return { estado: r.status, cuerpo: await r.json() };
}
async function cobertura(p: Persona, cuerpo: Record<string, unknown> = {}) {
  como(p);
  const r = await coberturaRuta.POST(json("/api/electoral/cobertura", "POST", cuerpo));
  return { estado: r.status, cuerpo: await r.json() };
}
async function cambiar(p: Persona, nid: string, cuerpo: Record<string, unknown>) {
  como(p);
  return (await unoRuta.PATCH(json(`/api/electoral/representatives/${nid}`, "PATCH", cuerpo), { params: Promise.resolve({ id: nid }) })).status;
}
async function quitar(p: Persona, nid: string) {
  como(p);
  return (await unoRuta.DELETE(json(`/api/electoral/representatives/${nid}`, "DELETE"), { params: Promise.resolve({ id: nid }) })).status;
}
async function candidatos(p: Persona, cuerpo: Record<string, unknown>) {
  como(p);
  const r = await candidatosRuta.POST(json("/api/electoral/candidatos", "POST", cuerpo));
  return { estado: r.status, cuerpo: await r.json() };
}

beforeAll(async () => {
  base = await crearBaseDesechable("estructura");
  x = await crearEstructuraDePrueba(await db());
  const d = await db();
  await d.insert(schema.electoralSections).values([
    { id: s.t1, sectionNum: NUM.t1, municipality: "Tonalá" },
    { id: s.t2, sectionNum: NUM.t2, municipality: "Tonalá" },
    { id: s.t3, sectionNum: NUM.t3, municipality: "Tonalá" },
    { id: s.z1, sectionNum: NUM.z1, municipality: "Zapopan" },
    { id: s.viejas, sectionNum: NUM.viejas, municipality: "Tonalá" }
  ]);
  await d.insert(schema.contacts).values([
    { id: vecino.deM1, displayName: "zz Vecina de M1", status: "active", createdByUserId: x.u.M1, municipality: "Tonalá", sectionId: s.t1, createdAt: new Date() },
    { id: vecino.deL3, displayName: "zz Vecino de Zapopan", status: "active", createdByUserId: x.u.L3, municipality: "Zapopan", sectionId: s.z1, createdAt: new Date() },
    { id: vecino.deL4, displayName: "zz Vecino de la otra dirección", status: "active", createdByUserId: x.u.L4, municipality: "Tonalá", sectionId: s.t2, createdAt: new Date() }
  ]);
  // Los tres dijeron en la encuesta que quieren ser representantes de casilla.
  await d.insert(schema.socialSurveys).values([
    { contactId: vecino.deM1, participationForm: "Representante de casilla" },
    { contactId: vecino.deL3, participationForm: "Representante de casilla" },
    { contactId: vecino.deL4, participationForm: "Otro", participationFormOther: "Quiero cuidar una casilla" }
  ]);
}, 120_000);

afterAll(async () => {
  await base?.borrar();
});

describe("migración 0029", () => {
  it("solo agrega o relaja: nada de DROP COLUMN, DROP TABLE ni DELETE", () => {
    const sentencias = MIGRACION.split(/\r?\n/)
      .filter((l) => !l.trim().startsWith("--"))
      .join("\n");
    expect(sentencias).not.toMatch(/DROP\s+(COLUMN|TABLE|INDEX)|\bTRUNCATE\b|\bDELETE\b|\bRENAME\b/i);
  });

  it("dos veces sin error; deja los roles viejos con la clave nueva y no toca los que no conoce", async () => {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      // Los datos de antes: se quita la regla para poder escribirlos, como estaban antes de la 0029.
      await pool.query(`ALTER TABLE electoral_representatives DROP CONSTRAINT electoral_reps_role_check`);
      const viejos = [
        [x.u.K1, "Representante General (RG)"],
        [x.u.K2, "casilla_responsible"],
        [x.u.M1, "Coordinador de Zona"],
        [x.u.M2, "Promotor"],
        [x.u.L1, "general_responsible"]
      ];
      for (const [usuario, rol] of viejos) {
        await pool.query(`INSERT INTO electoral_representatives (section_id, user_id, role) VALUES ($1, $2, $3)`, [s.viejas, usuario, rol]);
      }
      await pool.query(MIGRACION);
      await pool.query(MIGRACION);
      const { rows } = await pool.query(`SELECT user_id::text AS u, role FROM electoral_representatives WHERE section_id = $1`, [s.viejas]);
      const rolDe = new Map(rows.map((r: { u: string; role: string }) => [r.u, r.role]));
      expect(rolDe.get(x.u.K1)).toBe("representante_general");
      expect(rolDe.get(x.u.K2)).toBe("representante_casilla");
      expect(rolDe.get(x.u.M1)).toBe("coordinador");
      expect(rolDe.get(x.u.L1)).toBe("representante_general");
      expect(rolDe.get(x.u.M2)).toBe("Promotor");
      await pool.query(`DELETE FROM electoral_representatives WHERE section_id = $1`, [s.viejas]);
    } finally {
      await pool.end();
    }
  });

  it("user_id ya acepta nulo, pero cada fila lleva una persona, y solo una; un rol inventado se rechaza", async () => {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const { rows } = await pool.query(`SELECT is_nullable FROM information_schema.columns WHERE table_name = 'electoral_representatives' AND column_name = 'user_id'`);
      expect(rows[0].is_nullable).toBe("YES");
      const fila = (usuario: string | null, ciudadano: string | null, rol: string) =>
        pool.query(`INSERT INTO electoral_representatives (section_id, user_id, contact_id, role) VALUES ($1, $2, $3, $4)`, [s.viejas, usuario, ciudadano, rol]);
      await expect(fila(null, null, "coordinador")).rejects.toMatchObject({ code: "23514" });
      await expect(fila(x.u.K1, vecino.deM1, "coordinador")).rejects.toMatchObject({ code: "23514" });
      await expect(fila(x.u.K1, null, "Promotor")).rejects.toMatchObject({ code: "23514" });
    } finally {
      await pool.end();
    }
  });
});

let deL1: { coordinadorM1: string; rcVecina: string } = { coordinadorM1: "", rcVecina: "" };

describe("nombrar (F4.2)", () => {
  it("el líder nombra a alguien de su brigada y a una vecina que ve, con casilla; queda en la auditoría", async () => {
    const a = await nombrar("L1", { sectionId: s.t1, role: "coordinador", userId: x.u.M1 });
    expect(a.estado).toBe(201);
    const b = await nombrar("L1", { sectionId: s.t1, role: "representante_casilla", contactId: vecino.deM1, casilla: " c1 " });
    expect(b.estado).toBe(201);
    deL1 = { coordinadorM1: a.cuerpo.item.id, rcVecina: b.cuerpo.item.id };
    const [fila] = await (await db()).select().from(schema.electoralRepresentatives).where(eq(schema.electoralRepresentatives.id, deL1.rcVecina));
    expect(fila).toMatchObject({ contactId: vecino.deM1, userId: null, casilla: "C1", assignedByUserId: x.u.L1, role: "representante_casilla" });
    const rastro = await (await db())
      .select({ despues: schema.auditLogs.afterData })
      .from(schema.auditLogs)
      .where(and(eq(schema.auditLogs.entityId, deL1.rcVecina), eq(schema.auditLogs.action, "electoral.assign")));
    expect(rastro).toHaveLength(1);
  });

  it("fuera de su brigada (403), un ciudadano que no ve (404), en otro municipio (403)", async () => {
    expect((await nombrar("L1", { sectionId: s.t2, role: "coordinador", userId: x.u.M4 })).estado).toBe(403);
    const ajeno = await nombrar("L1", { sectionId: s.t2, role: "representante_casilla", contactId: vecino.deL3 });
    expect(ajeno.estado).toBe(404);
    expect(ajeno.cuerpo).toMatchObject({ campo: "contactId" });
    const zapopan = await nombrar("L1", { sectionId: s.z1, role: "coordinador", userId: x.u.M2 });
    expect(zapopan.estado).toBe(403);
    expect(zapopan.cuerpo).toMatchObject({ campo: "sectionId" });
  });

  it("rol inventado, casilla mal escrita, sin persona o con dos: 400 con el campo", async () => {
    expect((await nombrar("L1", { sectionId: s.t2, role: "promotor", userId: x.u.M2 })).cuerpo).toMatchObject({ campo: "role" });
    expect((await nombrar("L1", { sectionId: s.t2, role: "representante_casilla", userId: x.u.M2, casilla: "B-12!" })).cuerpo).toMatchObject({ campo: "casilla" });
    expect((await nombrar("L1", { sectionId: s.t2, role: "coordinador" })).cuerpo).toMatchObject({ campo: "persona" });
    expect((await nombrar("L1", { sectionId: s.t2, role: "coordinador", userId: x.u.M2, contactId: vecino.deM1 })).estado).toBe(400);
  });

  it("dos veces la misma persona en la misma sección: 409; una sección que no existe: 404", async () => {
    expect((await nombrar("L1", { sectionId: s.t1, role: "representante_general", userId: x.u.M1 })).estado).toBe(409);
    expect((await nombrar("L1", { sectionId: s.t1, role: "representante_general", contactId: vecino.deM1 })).estado).toBe(409);
    expect((await nombrar("L1", { sectionId: id(), role: "coordinador", userId: x.u.M2 })).estado).toBe(404);
    expect((await nombrar("L1", { sectionId: "no-es-un-id", role: "coordinador", userId: x.u.M2 })).estado).toBe(404);
  });

  it("capturista y brigadista no nombran", async () => {
    expect((await nombrar("K1", { sectionId: s.t2, role: "coordinador", userId: x.u.K1 })).estado).toBe(403);
    expect((await nombrar("M1", { sectionId: s.t2, role: "coordinador", userId: x.u.M1 })).estado).toBe(403);
  });
});

describe("cobertura (F4.1, D11)", () => {
  let deDB = "";
  beforeAll(async () => {
    // La otra dirección de Tonalá nombra en la misma sección y en otra.
    deDB = (await nombrar("DB", { sectionId: s.t1, role: "representante_general", userId: x.u.L4 })).cuerpo.item.id;
    await nombrar("DB", { sectionId: s.t2, role: "coordinador", userId: x.u.M4 });
  });

  const fila = (c: { filas: Array<{ numero: number }> }, numero: number) => c.filas.find((f) => f.numero === numero) as any;

  it("el líder cuenta solo su brigada: no ve el RG de la otra dirección ni su nombre", async () => {
    // La siembra trae las secciones reales de Tonalá: «990» deja solo las de la prueba.
    const { estado, cuerpo } = await cobertura("L1", { q: "990" });
    expect(estado).toBe(200);
    expect(cuerpo.municipio.nombre).toBe("Tonalá");
    expect(cuerpo.soloSuEstructura).toBe(true);
    const t1 = fila(cuerpo, NUM.t1);
    expect(t1.conteo).toEqual({ coordinador: 1, representante_general: 0, representante_casilla: 1 });
    expect(t1.nombrados.map((n: { nombre: string }) => n.nombre).sort()).toEqual(["zz M1", "zz Vecina de M1"]);
    expect(fila(cuerpo, NUM.t2).conteo.coordinador).toBe(0);
    expect(JSON.stringify(cuerpo)).not.toContain("zz L4");
    expect(JSON.stringify(cuerpo)).not.toContain("zz M4");
    expect(JSON.stringify(cuerpo)).not.toContain(deDB);
  });

  it("la administración municipal cuenta todo su municipio", async () => {
    const { cuerpo } = await cobertura("AT", { q: "990" });
    expect(cuerpo.soloSuEstructura).toBe(false);
    expect(fila(cuerpo, NUM.t1).conteo).toEqual({ coordinador: 1, representante_general: 1, representante_casilla: 1 });
    expect(fila(cuerpo, NUM.t2).conteo.coordinador).toBe(1);
    expect(fila(cuerpo, NUM.z1)).toBeUndefined();
  });

  it("la otra dirección ve lo suyo y no lo del líder", async () => {
    const { cuerpo } = await cobertura("DB", { q: "990" });
    expect(fila(cuerpo, NUM.t1).conteo).toEqual({ coordinador: 0, representante_general: 1, representante_casilla: 0 });
    expect(JSON.stringify(cuerpo)).not.toContain("zz Vecina de M1");
  });

  it("chips, buscador por número, colonia o nombre, y el maestro elige municipio", async () => {
    const sin = (await cobertura("L1", { filtro: "sin_coordinador", q: "990" })).cuerpo;
    expect(sin.filas.some((f: { numero: number }) => f.numero === NUM.t1)).toBe(false);
    expect(sin.filas.some((f: { numero: number }) => f.numero === NUM.t2)).toBe(true);
    expect((await cobertura("L1", { q: String(NUM.t3) })).cuerpo.filas.map((f: { numero: number }) => f.numero)).toEqual([NUM.t3]);
    expect((await cobertura("L1", { q: "vecina de m1" })).cuerpo.filas.map((f: { numero: number }) => f.numero)).toEqual([NUM.t1]);
    // El nombre de la otra dirección no se encuentra buscándolo.
    expect((await cobertura("L1", { q: "zz L4" })).cuerpo.total).toBe(0);
    const maestro = (await cobertura("MA", { municipio: "Zapopan", q: String(NUM.z1) })).cuerpo;
    expect(maestro.municipio.nombre).toBe("Zapopan");
    expect(fila(maestro, NUM.z1)).toBeDefined();
    // Un municipio pedido por quien no es el maestro se ignora: ve el suyo.
    expect((await cobertura("L1", { municipio: "Zapopan" })).cuerpo.municipio.nombre).toBe("Tonalá");
  });

  it("los totales de arriba son del municipio entero, no de lo filtrado, y cuadran", async () => {
    const { cuerpo } = await cobertura("AT");
    expect(cuerpo.totales.secciones).toBe(cuerpo.total);
    expect((await cobertura("AT", { q: "990" })).cuerpo.totales.secciones).toBe(cuerpo.totales.secciones);
    expect(cuerpo.totales.rcEsperados).toBe(cuerpo.totales.secciones * 2);
    expect(cuerpo.totales.sinCoordinador + cuerpo.totales.conCoordinador).toBe(cuerpo.totales.secciones);
  });
});

describe("cambiar y quitar (F4.2)", () => {
  it("cambia el rol quien lo nombró, y su dirección; la otra dirección ni lo ve (404)", async () => {
    expect(await cambiar("L1", deL1.coordinadorM1, { role: "representante_general" })).toBe(200);
    expect(await cambiar("D", deL1.coordinadorM1, { role: "coordinador" })).toBe(200);
    expect(await cambiar("DB", deL1.coordinadorM1, { role: "representante_general" })).toBe(404);
    expect(await cambiar("L2", deL1.coordinadorM1, { role: "representante_general" })).toBe(404);
    const acciones = await (await db())
      .select({ antes: schema.auditLogs.beforeData, despues: schema.auditLogs.afterData })
      .from(schema.auditLogs)
      .where(and(eq(schema.auditLogs.entityId, deL1.coordinadorM1), eq(schema.auditLogs.action, "electoral.change")));
    expect(acciones).toHaveLength(2);
  });

  it("la casilla solo la lleva un RC: al cambiar a otro rol se borra", async () => {
    expect(await cambiar("L1", deL1.rcVecina, { casilla: "e1c2" })).toBe(200);
    let [f] = await (await db()).select().from(schema.electoralRepresentatives).where(eq(schema.electoralRepresentatives.id, deL1.rcVecina));
    expect(f?.casilla).toBe("E1C2");
    expect(await cambiar("L1", deL1.rcVecina, { role: "representante_general" })).toBe(200);
    [f] = await (await db()).select().from(schema.electoralRepresentatives).where(eq(schema.electoralRepresentatives.id, deL1.rcVecina));
    expect(f?.casilla).toBeNull();
    expect(await cambiar("L1", deL1.rcVecina, { role: "representante_casilla", casilla: "B" })).toBe(200);
  });

  it("lo que nombró la administración a una vecina que la dirección ve: solo consulta (403)", async () => {
    const r = await nombrar("AT", { sectionId: s.t3, role: "representante_general", contactId: vecino.deM1 });
    expect(r.estado).toBe(201);
    const { cuerpo } = await cobertura("D", { q: String(NUM.t3) });
    const n = cuerpo.filas[0].nombrados.find((m: { id: string }) => m.id === r.cuerpo.item.id);
    expect(n.puedeCambiar).toBe(false);
    expect(await cambiar("D", r.cuerpo.item.id, { role: "coordinador" })).toBe(403);
    expect(await quitar("D", r.cuerpo.item.id)).toBe(403);
    expect(await quitar("AT", r.cuerpo.item.id)).toBe(200);
  });

  it("quitar borra la fila y deja en la auditoría a quién, de qué sección, con qué rol y quién", async () => {
    expect(await quitar("L1", deL1.rcVecina)).toBe(200);
    const filas = await (await db()).select().from(schema.electoralRepresentatives).where(eq(schema.electoralRepresentatives.id, deL1.rcVecina));
    expect(filas).toHaveLength(0);
    const [rastro] = await (await db())
      .select({ quien: schema.auditLogs.actorUserId, antes: schema.auditLogs.beforeData })
      .from(schema.auditLogs)
      .where(and(eq(schema.auditLogs.entityId, deL1.rcVecina), eq(schema.auditLogs.action, "electoral.remove")));
    expect(rastro).toMatchObject({ quien: x.u.L1, antes: { seccion: NUM.t1, rol: "representante_casilla", ciudadano: vecino.deM1 } });
  });

  it("un id mal formado o que no existe: 404; capturista: 403", async () => {
    expect(await cambiar("L1", "no-es-un-id", { role: "coordinador" })).toBe(404);
    expect(await quitar("L1", id())).toBe(404);
    expect(await quitar("K1", deL1.coordinadorM1)).toBe(403);
  });

  it("una fila vieja sin quién la nombró se decide por la persona nombrada", async () => {
    const [vieja] = await (await db())
      .insert(schema.electoralRepresentatives)
      .values({ sectionId: s.t2, userId: x.u.M2, role: "representante_general" })
      .returning({ id: schema.electoralRepresentatives.id });
    expect(await cambiar("L1", vieja!.id, { role: "coordinador" })).toBe(200);
    expect(await cambiar("DB", vieja!.id, { role: "coordinador" })).toBe(404);
  });
});

describe("a quién se puede nombrar (F4.2, D4)", () => {
  it("si es RC, arriba los vecinos visibles que quieren ser representantes; nunca uno que no ve", async () => {
    const { estado, cuerpo } = await candidatos("L1", { sectionId: s.t2, role: "representante_casilla" });
    expect(estado).toBe(200);
    const sugeridos = cuerpo.sugeridos.map((c: { id: string }) => c.id);
    expect(sugeridos).toContain(vecino.deM1);
    expect(sugeridos).not.toContain(vecino.deL3);
    expect(sugeridos).not.toContain(vecino.deL4);
    expect(JSON.stringify(cuerpo)).not.toContain("zz Vecino de Zapopan");
  });

  it("su gente: la de su mando y nadie más; sin sugeridos si no es RC", async () => {
    const { cuerpo } = await candidatos("L1", { sectionId: s.t3, role: "coordinador" });
    expect(cuerpo.sugeridos).toEqual([]);
    const gente = cuerpo.gente.map((c: { id: string }) => c.id);
    expect(gente).toEqual(expect.arrayContaining([x.u.K1, x.u.M2]));
    expect(gente).not.toContain(x.u.M4);
    expect(gente).not.toContain(x.u.M3);
  });

  it("no vuelve a ofrecer a quien ya está nombrado en esa sección, y busca por nombre", async () => {
    const { cuerpo } = await candidatos("L1", { sectionId: s.t1, role: "representante_casilla", q: "zz" });
    expect(cuerpo.gente.map((c: { id: string }) => c.id)).not.toContain(x.u.M1);
    expect((await candidatos("L1", { sectionId: s.t3, role: "coordinador", q: "zz k1" })).cuerpo.gente.map((c: { id: string }) => c.id)).toEqual([x.u.K1]);
  });

  it("en una sección de otro municipio: 403", async () => {
    expect((await candidatos("L1", { sectionId: s.z1, role: "coordinador" })).estado).toBe(403);
  });
});
