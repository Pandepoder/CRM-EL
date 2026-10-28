import "dotenv/config";

import crypto from "node:crypto";
import fs from "node:fs";

import { and, eq } from "drizzle-orm";
import pg from "pg";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { ActorContext } from "@tonala/shared/auth";
import { schema } from "@tonala/shared/database";

import type * as AyudantesApi from "@/lib/api-helpers";

import { crearBaseDesechable } from "./base-desechable";
import { crearEstructuraDePrueba, type EstructuraDePrueba, type Persona } from "./estructura-de-prueba";

/**
 * Escucha Social contra la API, con la sesión de cada perfil (plan de auditoría de menús: fase 1, F1.4 y
 * F1.5; fase 3, F3.1 a F3.6). Estructura en `estructura-de-prueba.ts`; la matriz completa del §4.3, en
 * `matriz-escucha.test.ts`.
 */

const sesion: { actor: ActorContext | null } = { actor: null };
vi.mock("@/lib/api-helpers", async (importarOriginal) => {
  const original = await importarOriginal<typeof AyudantesApi>();
  return { ...original, actorFromSession: async () => sesion.actor };
});

const coleccion = await import("../app/api/escucha-social/route");
const registro = await import("../app/api/escucha-social/[id]/route");
const mapa = await import("../app/api/map/escucha/route");

const MIGRACION = fs.readFileSync(new URL("../../../db/migrations/0028_escucha_social_completa.sql", import.meta.url), "utf8");

let base: Awaited<ReturnType<typeof crearBaseDesechable>>;
let x: EstructuraDePrueba;
const db = async () => (await import("@/lib/db-client")).getDatabaseClient();

const como = (p: Persona | null) => {
  sesion.actor = p ? x.actor(p) : null;
};
const peticion = (url: string, method: string, cuerpo?: unknown) =>
  new NextRequest(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {})
  });
const anotar = (cuerpo: Record<string, unknown>) =>
  coleccion.POST(peticion("/api/escucha-social", "POST", { title: "zz Taller de oficios", description: "Lo piden en la colonia", ...cuerpo }));
const cambiar = (registroId: string, cuerpo: Record<string, unknown>) =>
  registro.PATCH(peticion(`/api/escucha-social/${registroId}`, "PATCH", cuerpo), { params: Promise.resolve({ id: registroId }) });

let deK1 = "";
/** Una vecina que M1 registró (la ven M1, su líder, su dirección y la administración de Tonalá) y uno de Zapopan. */
const vecino = { deM1: crypto.randomUUID(), deL3: crypto.randomUUID() };
const leerLista = async (p: Persona) => {
  como(p);
  const r = await coleccion.GET(new NextRequest("http://localhost/api/escucha-social"));
  return { estado: r.status, cuerpo: await r.json() };
};
const loQueHaPedido = async (p: Persona, contacto: string) => {
  como(p);
  const r = await coleccion.GET(new NextRequest(`http://localhost/api/escucha-social?contacto=${contacto}`));
  return { estado: r.status, cuerpo: await r.json() };
};
const unaPeticion = async (p: Persona, registroId: string) => {
  como(p);
  return registro.GET(new NextRequest(`http://localhost/api/escucha-social/${registroId}`), { params: Promise.resolve({ id: registroId }) });
};

beforeAll(async () => {
  base = await crearBaseDesechable("escucha");
  x = await crearEstructuraDePrueba(await db());
  await (await db()).insert(schema.contacts).values([
    { id: vecino.deM1, displayName: "zz Vecina de M1", status: "active", createdByUserId: x.u.M1, municipality: "Tonalá", createdAt: new Date() },
    { id: vecino.deL3, displayName: "zz Vecino de Zapopan", status: "active", createdByUserId: x.u.L3, municipality: "Zapopan", createdAt: new Date() }
  ]);
  como("K1");
  const r = await anotar({ categories: ["propuesta"], resolutionNotes: undefined });
  deK1 = (await r.json()).item.id;
}, 120_000);

afterAll(async () => {
  await base?.borrar();
});

describe("categorías (F1.4)", () => {
  it("una categoría inventada se rechaza con el campo que falla", async () => {
    como("M1");
    const r = await anotar({ categories: ["queja"] });
    expect(r.status).toBe(400);
    expect(await r.json()).toMatchObject({ campo: "categories" });
  });

  it("sin categorías, o con demasiadas, también", async () => {
    como("M1");
    expect((await anotar({ categories: [] })).status).toBe(400);
    expect((await anotar({ categories: ["propuesta", "gestion", "compromiso", "seguimiento", "problematica", "propuesta"] })).status).toBe(400);
  });

  it("una del catálogo se guarda", async () => {
    como("M1");
    const r = await anotar({ categories: ["gestion"] });
    expect(r.status).toBe(201);
    expect((await r.json()).item.categories).toEqual(["gestion"]);
  });
});

describe("estado y notas (F1.5)", () => {
  it("vaciar las notas las borra", async () => {
    como("K1");
    expect((await cambiar(deK1, { status: "en_seguimiento", resolutionNotes: "Se habló con el delegado" })).status).toBe(200);
    expect((await cambiar(deK1, { resolutionNotes: "" })).status).toBe(200);
    const [fila] = await (await db()).select({ notas: schema.socialListening.resolutionNotes }).from(schema.socialListening).where(eq(schema.socialListening.id, deK1));
    expect(fila?.notas).toBeNull();
  });

  it("un estado inventado se rechaza con un mensaje que dice cuáles hay", async () => {
    como("K1");
    const r = await cambiar(deK1, { status: "abierto" });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toMatch(/pendiente, en seguimiento o cerrado/);
  });

  it("el compañero de brigada la ve pero no la cambia (403 con el porqué); otra brigada ni la ve (404)", async () => {
    como("K2");
    const r = await cambiar(deK1, { status: "cerrado" });
    expect(r.status).toBe(403);
    expect((await r.json()).error).toMatch(/Solo consulta/);
    como("M3");
    expect((await cambiar(deK1, { status: "cerrado" })).status).toBe(404);
  });

  it("quien coordina la brigada sí la cambia", async () => {
    como("L1");
    expect((await cambiar(deK1, { status: "cerrado" })).status).toBe(200);
  });

  it("un id mal formado no existe", async () => {
    como("L1");
    expect((await cambiar("no-es-un-id", { status: "cerrado" })).status).toBe(404);
    expect((await cambiar(crypto.randomUUID(), { status: "cerrado" })).status).toBe(404);
  });
});

describe("cada petición, de un vecino (F3.1)", () => {
  it("se liga a un vecino que quien anota puede ver, y la lista trae su nombre", async () => {
    como("M1");
    const r = await anotar({ categories: ["gestion"], contactId: vecino.deM1 });
    expect(r.status).toBe(201);
    const creada = (await r.json()).item.id as string;
    const fila = (await leerLista("M1")).cuerpo.filas.find((f: { id: string }) => f.id === creada);
    expect(fila.vecino).toEqual({ id: vecino.deM1, nombre: "zz Vecina de M1" });
    expect(fila.vecinoOculto).toBe(false);
  });

  it("ligarla a un vecino que no se ve, o a un id que no existe, es 404 en el campo del vecino", async () => {
    como("M1");
    for (const contactId of [vecino.deL3, crypto.randomUUID(), "no-es-un-id"]) {
      const r = await anotar({ categories: ["propuesta"], contactId });
      expect(r.status, contactId).toBe(404);
      expect(await r.json()).toMatchObject({ campo: "contactId" });
    }
  });

  it("si la petición es de un vecino que quien mira no ve, su nombre no viaja en la respuesta: «un vecino»", async () => {
    // Un dato de antes (o de quien después cambió de brigada): la petición de M1 ligada a un vecino de Zapopan.
    const [vieja] = await (await db())
      .insert(schema.socialListening)
      .values({ title: "zz De un vecino ajeno", description: "Dato heredado", categories: ["propuesta"], status: "pendiente", createdByUserId: x.u.M1, contactId: vecino.deL3 })
      .returning({ id: schema.socialListening.id });
    const { cuerpo } = await leerLista("M1");
    const fila = cuerpo.filas.find((f: { id: string }) => f.id === vieja!.id);
    expect(fila.vecino).toBeNull();
    expect(fila.vecinoOculto).toBe(true);
    expect(JSON.stringify(cuerpo)).not.toContain("zz Vecino de Zapopan");
    const una = await (await unaPeticion("M1", vieja!.id)).json();
    expect(una.peticion.vecinoOculto).toBe(true);
    expect(JSON.stringify(una)).not.toContain("zz Vecino de Zapopan");
  });

  it("título largo, sin descripción o con una ubicación imposible: 400 con el campo", async () => {
    como("M1");
    const largo = await anotar({ categories: ["propuesta"], title: "x".repeat(151) });
    expect(largo.status).toBe(400);
    expect(await largo.json()).toMatchObject({ campo: "title" });
    const sinDescripcion = await anotar({ categories: ["propuesta"], description: "   " });
    expect(sinDescripcion.status).toBe(400);
    expect(await sinDescripcion.json()).toMatchObject({ campo: "description" });
    const lejos = await anotar({ categories: ["propuesta"], latitude: 200, longitude: -103 });
    expect(lejos.status).toBe(400);
    expect(await lejos.json()).toMatchObject({ campo: "latitude" });
  });

  it("sin frase, se guarda con la primera oración del texto (§7.2: un campo menos en la calle)", async () => {
    como("M1");
    const r = await anotar({ categories: ["propuesta"], title: "  ", description: "Piden poda del árbol de la esquina. Tapa la luminaria." });
    expect(r.status).toBe(201);
    expect((await r.json()).item.title).toBe("Piden poda del árbol de la esquina");
  });

  it("isFormalGestion del cuerpo se ignora: nace sin turno", async () => {
    como("M1");
    const r = await anotar({ categories: ["gestion"], isFormalGestion: 1 });
    expect((await r.json()).item.isFormalGestion).toBe(0);
  });
});

describe("sin señal y sin duplicados (F3.4)", () => {
  it("la misma clave del mismo autor guarda una sola vez y responde 200 con la misma; de otro autor, 409", async () => {
    const clave = crypto.randomUUID();
    como("M1");
    const primera = await anotar({ categories: ["propuesta"], clientRequestId: clave });
    expect(primera.status).toBe(201);
    const id = (await primera.json()).item.id;
    const segunda = await anotar({ categories: ["propuesta"], clientRequestId: clave });
    expect(segunda.status).toBe(200);
    expect(await segunda.json()).toMatchObject({ repetida: true, item: { id } });
    como("K1");
    expect((await anotar({ categories: ["propuesta"], clientRequestId: clave })).status).toBe(409);
    const filas = await (await db()).select({ id: schema.socialListening.id }).from(schema.socialListening).where(eq(schema.socialListening.clientRequestId, clave));
    expect(filas).toHaveLength(1);
  });

  it("dos envíos simultáneos con la misma clave dejan una sola fila", async () => {
    const clave = crypto.randomUUID();
    como("M1");
    const respuestas = await Promise.all([anotar({ categories: ["propuesta"], clientRequestId: clave }), anotar({ categories: ["propuesta"], clientRequestId: clave })]);
    expect(respuestas.map((r) => r.status).sort()).toEqual([200, 201]);
    const filas = await (await db()).select({ id: schema.socialListening.id }).from(schema.socialListening).where(eq(schema.socialListening.clientRequestId, clave));
    expect(filas).toHaveLength(1);
  });

  it("una clave que no es UUID: 400", async () => {
    como("M1");
    expect((await anotar({ categories: ["propuesta"], clientRequestId: "clave" })).status).toBe(400);
  });
});

describe("seguimiento y turno (F3.5)", () => {
  let deM1 = "";
  beforeAll(async () => {
    como("M1");
    deM1 = (await (await anotar({ categories: ["gestion"], contactId: vecino.deM1, title: "zz Poda del árbol" })).json()).item.id;
  });

  it("cambiar el estado guarda quién y cuándo, y queda en la auditoría", async () => {
    como("M1");
    expect((await cambiar(deM1, { status: "en_seguimiento" })).status).toBe(200);
    const [fila] = await (await db())
      .select({ quien: schema.socialListening.statusChangedByUserId, cuando: schema.socialListening.statusChangedAt })
      .from(schema.socialListening)
      .where(eq(schema.socialListening.id, deM1));
    expect(fila?.quien).toBe(x.u.M1);
    expect(fila?.cuando).toBeInstanceOf(Date);
    const rastro = await (await db())
      .select({ antes: schema.auditLogs.beforeData, despues: schema.auditLogs.afterData })
      .from(schema.auditLogs)
      .where(and(eq(schema.auditLogs.entityId, deM1), eq(schema.auditLogs.action, "social.status_change")));
    expect(rastro).toEqual([{ antes: { status: "pendiente" }, despues: { status: "en_seguimiento" } }]);
  });

  it("solo administración turna; sin dependencia no se puede; «approveGestion: true» pide la dependencia", async () => {
    for (const p of ["M1", "L1", "D"] as const) {
      como(p);
      expect((await cambiar(deM1, { turno: { dependencia: "SIAPA" } })).status, p).toBe(403);
    }
    como("AT");
    const vacia = await cambiar(deM1, { turno: { dependencia: " " } });
    expect(vacia.status).toBe(400);
    expect(await vacia.json()).toMatchObject({ campo: "dependencia" });
    expect((await cambiar(deM1, { approveGestion: true })).status).toBe(400);
  });

  it("la administración de otro municipio ni la ve (404)", async () => {
    como("AZ");
    expect((await cambiar(deM1, { turno: { dependencia: "SIAPA" } })).status).toBe(404);
  });

  it("administración la turna con folio y fecha, y la quita; las dos cosas en la auditoría", async () => {
    como("AT");
    expect((await cambiar(deM1, { turno: { dependencia: "SIAPA", folio: "F-123", fecha: "2026-10-10" } })).status).toBe(200);
    const leer = async () =>
      (
        await (await db())
          .select({
            formal: schema.socialListening.isFormalGestion,
            dependencia: schema.socialListening.gestionDependencia,
            folio: schema.socialListening.gestionFolio,
            fecha: schema.socialListening.gestionTurnadaAt
          })
          .from(schema.socialListening)
          .where(eq(schema.socialListening.id, deM1))
      )[0];
    expect(await leer()).toMatchObject({ formal: 1, dependencia: "SIAPA", folio: "F-123" });
    // El día que se eligió es el que se lee en Jalisco (antes se guardaba la medianoche UTC: «9 oct»).
    expect((await leer())?.fecha?.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" })).toBe("2026-10-10");

    // En la ficha de la vecina se ve a dónde se turnó.
    const ficha = await loQueHaPedido("M1", vecino.deM1);
    expect(ficha.cuerpo.peticiones.find((p: { id: string }) => p.id === deM1).turno).toMatchObject({ dependencia: "SIAPA", folio: "F-123" });

    como("AT");
    expect((await cambiar(deM1, { turno: null })).status).toBe(200);
    expect(await leer()).toMatchObject({ formal: 0, dependencia: null, folio: null, fecha: null });
    const acciones = (await (await db()).select({ accion: schema.auditLogs.action }).from(schema.auditLogs).where(eq(schema.auditLogs.entityId, deM1))).map((a) => a.accion);
    expect(acciones).toEqual(expect.arrayContaining(["social.turn", "social.unturn"]));
  });
});

describe("las gestiones que la versión anterior marcó como formales", () => {
  it("salen turnadas, sin dependencia ni fecha inventadas", async () => {
    const [vieja] = await (await db())
      .insert(schema.socialListening)
      .values({ title: "zz Gestión vieja", description: "Aprobada antes de anotar la dependencia", categories: ["gestion"], status: "pendiente", createdByUserId: x.u.M1, isFormalGestion: 1 })
      .returning({ id: schema.socialListening.id });
    const { peticion } = await (await unaPeticion("M1", vieja!.id)).json();
    expect(peticion.turno).toEqual({ dependencia: null, folio: null, fecha: null });
  });
});

describe("«Lo que ha pedido» en la ficha (F3.2, D10)", () => {
  let deZapopanSobreVecina = "";
  beforeAll(async () => {
    // Alguien de otra estructura anotó algo de la misma vecina, con notas suyas.
    const [fila] = await (await db())
      .insert(schema.socialListening)
      .values({
        title: "zz Lo pidió en Zapopan",
        description: "Otra estructura",
        categories: ["compromiso"],
        status: "en_seguimiento",
        createdByUserId: x.u.L3,
        contactId: vecino.deM1,
        resolutionNotes: "zz nota ajena"
      })
      .returning({ id: schema.socialListening.id });
    deZapopanSobreVecina = fila!.id;
  });

  it("quien ve a la vecina ve todas sus peticiones, pero las notas solo de las que también ve en Escucha", async () => {
    const { estado, cuerpo } = await loQueHaPedido("M1", vecino.deM1);
    expect(estado).toBe(200);
    const ajena = cuerpo.peticiones.find((p: { id: string }) => p.id === deZapopanSobreVecina);
    expect(ajena).toMatchObject({ titulo: "zz Lo pidió en Zapopan", enEscucha: false, notas: null });
    expect(JSON.stringify(cuerpo)).not.toContain("zz nota ajena");
    expect(cuerpo.peticiones.filter((p: { enEscucha: boolean }) => p.enEscucha).length).toBeGreaterThan(0);
    // Y en Escucha, esa no existe para M1.
    expect((await unaPeticion("M1", deZapopanSobreVecina)).status).toBe(404);
  });

  it("quien no ve a la vecina: 404, aunque vea alguna de sus peticiones", async () => {
    expect((await loQueHaPedido("L3", vecino.deM1)).estado).toBe(404);
    expect((await loQueHaPedido("M3", vecino.deM1)).estado).toBe(404);
    expect((await loQueHaPedido("M1", "no-es-un-id")).estado).toBe(404);
  });

  it("la administración del municipio de la vecina la ve completa", async () => {
    const { estado, cuerpo } = await loQueHaPedido("AT", vecino.deM1);
    expect(estado).toBe(200);
    expect(cuerpo.peticiones.length).toBeGreaterThanOrEqual(3);
  });
});

describe("capa «Peticiones» del mapa (F3.3)", () => {
  it("solo las que se ven y tienen ubicación; sin títulos, nombres ni notas", async () => {
    como("M1");
    const conLugar = (await (await anotar({ categories: ["problematica"], contactId: vecino.deM1, title: "zz Banqueta rota", latitude: 20.62, longitude: -103.24 })).json()).item.id;
    const { puntos } = await (await mapa.GET()).json();
    expect(puntos.map((p: { id: string }) => p.id)).toContain(conLugar);
    for (const p of puntos) expect(Object.keys(p).sort()).toEqual(["categoria", "estado", "id", "latitud", "longitud"]);
    como("M3");
    expect((await (await mapa.GET()).json()).puntos.map((p: { id: string }) => p.id)).not.toContain(conLugar);
  });

  it("sin sesión: 401", async () => {
    como(null);
    expect((await mapa.GET()).status).toBe(401);
  });
});

describe("migración 0028", () => {
  it("solo agrega: ni DROP ni cambios destructivos, y todo con IF NOT EXISTS", () => {
    const sentencias = MIGRACION.split(/\r?\n/)
      .filter((l) => !l.trim().startsWith("--"))
      .join("\n");
    expect(sentencias).not.toMatch(/\bDROP\b|\bRENAME\b|ALTER COLUMN|\bTRUNCATE\b|\bDELETE\b/i);
    for (const sentencia of sentencias.split(";").map((s) => s.trim()).filter(Boolean)) expect(sentencia).toMatch(/IF NOT EXISTS/);
  });

  it("correrla otra vez sobre la base ya migrada no cambia nada, y la clave sigue siendo única", async () => {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      await pool.query(MIGRACION);
      const clave = crypto.randomUUID();
      const fila = (titulo: string) =>
        pool.query(
          `INSERT INTO social_listening (title, description, categories, status, created_by_user_id, client_request_id) VALUES ($1, 'x', '["propuesta"]', 'pendiente', $2, $3)`,
          [titulo, x.u.M1, clave]
        );
      await fila("zz primera");
      await expect(fila("zz segunda")).rejects.toMatchObject({ code: "23505" });
    } finally {
      await pool.end();
    }
  });
});
