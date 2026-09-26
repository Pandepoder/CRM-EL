import "dotenv/config";

import crypto from "node:crypto";
import fs from "node:fs";

import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createAuthenticatedActor } from "@tonala/shared/auth";
import { schema } from "@tonala/shared/database";

import { registrarCiudadano } from "@/lib/alta-ciudadano";
import { getDatabaseClient } from "@/lib/db-client";
import { MUNICIPIOS_JALISCO, resolverMunicipio, sinAcentos } from "@/lib/municipios-jalisco";
import { permissionsForRole } from "@/lib/permissions";

import { POST as registroPublico } from "../app/api/public/registro/route";
import { crearBaseDesechable } from "./base-desechable";

/**
 * Etapa 5: el municipio como llave (migración 0022), contra una base real y desechable.
 *   - La base resuelve un texto libre igual que la aplicación (`resolverMunicipio`).
 *   - Toda fila nueva sale con municipio, por la regla de su tabla, venga de donde venga.
 *   - El relleno de filas anteriores a la 0022 sigue el orden de confianza del plan.
 *   - Ningún ciudadano se registra sin municipio (C4, D1).
 */

const id = () => crypto.randomUUID();
const MIGRACION = fs.readFileSync(new URL("../../../db/migrations/0022_municipio_como_llave.sql", import.meta.url), "utf8");
const DISPARADORES = [
  ["electoral_sections", "electoral_sections_municipio"],
  ["user_profiles", "user_profiles_municipio"],
  ["user_profiles", "user_profiles_sale_de_general"],
  ["teams", "teams_municipio"],
  ["teams", "teams_municipio_de_su_gente"],
  ["team_members", "team_members_municipio"],
  ["contacts", "contacts_municipio"],
  ["event_reports", "event_reports_municipio"],
  ["warehouses", "warehouses_municipio"],
  ["activity_catalog_options", "activity_catalog_options_municipio"],
  ["social_listening", "social_listening_municipio"],
  ["rapid_activity_prospects", "rapid_activity_prospects_municipio"]
] as const;
const TABLAS = ["user_profiles", "teams", "contacts", "event_reports", "warehouses", "activity_catalog_options", "social_listening", "rapid_activity_prospects"];

let base: Awaited<ReturnType<typeof crearBaseDesechable>>;
let pool: pg.Pool;
let roles: Record<string, string>;
const db = () => getDatabaseClient();

/** Id de un municipio por nombre (o de General). */
async function m(nombre: string) {
  const { rows } = await pool.query<{ id: string }>(
    nombre === "General" ? `SELECT id FROM municipalities WHERE kind = 'general'` : `SELECT id FROM municipalities WHERE name = $1`,
    nombre === "General" ? [] : [nombre]
  );
  return rows[0]!.id;
}
const llaveDe = async (tabla: string, fila: string) =>
  (await pool.query<{ m: string }>(`SELECT municipality_id AS m FROM ${tabla} WHERE id = $1`, [fila])).rows[0]!.m;

async function persona(texto: string | null, rol = "visit_responsible") {
  const u = id();
  await db().insert(schema.userProfiles).values({ id: u, email: `${u}@prueba.local`, displayName: `zz-${u.slice(0, 6)}`, roleId: roles[rol]!, status: "active", municipality: texto });
  return u;
}

async function seccion(num: number, municipio: string) {
  const s = id();
  await db().insert(schema.electoralSections).values({ id: s, sectionNum: num, municipality: municipio });
  return s;
}

beforeAll(async () => {
  base = await crearBaseDesechable("municipio_llave");
  pool = new pg.Pool({ connectionString: base.url });
  roles = Object.fromEntries((await db().select({ id: schema.roles.id, key: schema.roles.key }).from(schema.roles)).map((r) => [r.key, r.id]));
}, 180_000);

afterAll(async () => {
  await pool?.end();
  await base?.borrar();
});

describe("catálogo y resolución de un texto", () => {
  it("tiene los 125 municipios del catálogo de la aplicación y una sola fila General", async () => {
    const { rows } = await pool.query<{ name: string; kind: string }>(`SELECT name, kind FROM municipalities`);
    expect(rows.filter((r) => r.kind === "municipio").map((r) => r.name).sort()).toEqual(MUNICIPIOS_JALISCO.map((x) => x.name).sort());
    expect(rows.filter((r) => r.kind === "general")).toHaveLength(1);
  });

  it("la base resuelve cada texto igual que resolverMunicipio, en cientos de variantes", async () => {
    const entradas = new Set<string>([
      "Tlaquepaque", "Tlajomulco", "Ixtlahuacán", "Guanajuato", "Springfield", "", "  ", "de", "San", "Lagos", "El", "Juan",
      "Mpio. de Zapopan", "TONALA JAL.", "zapopan jal", "Col. Centro, Tonalá", "Calle Guadalajara 12, Zapopan", "Jalisco", "Jal",
      "San Pedro", "Zapotlán", "tonala-centro"
    ]);
    for (const { name } of MUNICIPIOS_JALISCO) {
      for (const v of [name, name.toUpperCase(), sinAcentos(name), `Municipio de ${name}`, `${name}, Jalisco`, `${name} Jal.`]) entradas.add(v);
      const palabras = name.split(" ");
      palabras.forEach((p, i) => {
        entradas.add(p);
        if (i < palabras.length - 1) entradas.add(`${p} ${palabras[i + 1]}`);
      });
    }
    const lista = [...entradas];
    const { rows } = await pool.query<{ t: string; nombre: string | null }>(
      `SELECT t, (SELECT name FROM municipalities WHERE id = municipio_por_texto(t)) AS nombre FROM unnest($1::text[]) AS t`,
      [lista]
    );
    const distintas = rows.filter((r) => r.nombre !== resolverMunicipio(r.t)).map((r) => `${r.t} → base ${r.nombre}, app ${resolverMunicipio(r.t)}`);
    expect(distintas).toEqual([]);
    expect(lista.length).toBeGreaterThan(500);
  });
});

describe("toda fila nueva sale con municipio", () => {
  it("persona: su municipio escrito, y si no, General", async () => {
    expect(await llaveDe("user_profiles", await persona("TONALA"))).toBe(await m("Tonalá"));
    expect(await llaveDe("user_profiles", await persona("tlaquepaque"))).toBe(await m("San Pedro Tlaquepaque"));
    expect(await llaveDe("user_profiles", await persona(null))).toBe(await m("General"));
  });

  it("ciudadano: la sección manda; sin sección, quien lo registra; y no se le puede quitar", async () => {
    const zapopense = await persona("Zapopan");
    const sinNada = await persona(null);
    const sTonala = await seccion(990101, "Tonalá");
    const sZapopan = await seccion(990102, "Zapopan");
    const [c1, c2, c3] = [id(), id(), id()];
    const ciudadano = (cid: string, quien: string, sectionId: string | null) =>
      db().insert(schema.contacts).values({ id: cid, displayName: "zz-c", status: "active", createdByUserId: quien, createdAt: new Date(), version: 1, sectionId });
    await ciudadano(c1, zapopense, sTonala);
    await ciudadano(c2, zapopense, null);
    await ciudadano(c3, sinNada, null);
    expect(await llaveDe("contacts", c1)).toBe(await m("Tonalá"));
    expect(await llaveDe("contacts", c2)).toBe(await m("Zapopan"));
    expect(await llaveDe("contacts", c3)).toBe(await m("General"));

    await db().update(schema.contacts).set({ sectionId: sZapopan }).where(eq(schema.contacts.id, c1));
    expect(await llaveDe("contacts", c1)).toBe(await m("Zapopan"));
    await db().update(schema.contacts).set({ municipalityId: await m("Tonalá") }).where(eq(schema.contacts.id, c1));
    expect(await llaveDe("contacts", c1)).toBe(await m("Zapopan"));

    await expect(pool.query(`UPDATE contacts SET municipality_id = NULL WHERE id = $1`, [c2])).rejects.toThrow(/null/i);
  });

  it("incidencia: su texto → su sección → quien la levanta; almacén: el último tramo de su dirección", async () => {
    const sinNada = await persona(null);
    const lider = await persona("Zapopan", "territorial_coordinator");
    const s = await seccion(990103, "Tonalá");
    const [e1, e2, e3] = [id(), id(), id()];
    const incidencia = (eid: string, quien: string, texto: string | null, sectionId: string | null) =>
      db().insert(schema.eventReports).values({ id: eid, title: "zz", description: "zz", category: "servicios", status: "active", municipality: texto, sectionId, createdByUserId: quien, latitude: 20.6, longitude: -103.3 });
    await incidencia(e1, sinNada, "TONALA JAL.", null);
    await incidencia(e2, sinNada, null, s);
    await incidencia(e3, lider, null, null);
    expect(await llaveDe("event_reports", e1)).toBe(await m("Tonalá"));
    expect(await llaveDe("event_reports", e2)).toBe(await m("Tonalá"));
    expect(await llaveDe("event_reports", e3)).toBe(await m("Zapopan"));

    const [bodega] = await db().insert(schema.warehouses).values({ name: "zz-bodega", location: "Av. Siempre Viva 1, Centro, Tlajomulco" }).returning({ id: schema.warehouses.id });
    expect(await llaveDe("warehouses", bodega!.id)).toBe(await m("Tlajomulco de Zúñiga"));
  });

  it("equipos: el de su texto o su líder; quien está en General lo toma al sumarse, y se lleva lo suyo", async () => {
    const lider = await persona(null, "territorial_coordinator");
    const integrante = await persona(null);
    const conMunicipio = await persona("San Pedro Tlaquepaque");
    const suCiudadano = id();
    await db().insert(schema.contacts).values({ id: suCiudadano, displayName: "zz-c", status: "active", createdByUserId: integrante, createdAt: new Date(), version: 1 });
    const [escucha] = await db().insert(schema.socialListening).values({ categories: ["x"], title: "zz", description: "zz", createdByUserId: integrante }).returning({ id: schema.socialListening.id });

    const equipo = id();
    await db().insert(schema.teams).values({ id: equipo, name: "zz-equipo", leaderId: lider });
    expect(await llaveDe("teams", equipo)).toBe(await m("General"));
    await db().insert(schema.teamMembers).values([{ teamId: equipo, userId: integrante }, { teamId: equipo, userId: conMunicipio }]);
    expect(await llaveDe("user_profiles", integrante)).toBe(await m("General"));

    await db().update(schema.teams).set({ municipality: "Zapopan" }).where(eq(schema.teams.id, equipo));
    expect(await llaveDe("teams", equipo)).toBe(await m("Zapopan"));
    expect(await llaveDe("user_profiles", lider)).toBe(await m("Zapopan"));
    expect(await llaveDe("user_profiles", integrante)).toBe(await m("Zapopan"));
    expect(await llaveDe("user_profiles", conMunicipio)).toBe(await m("San Pedro Tlaquepaque"));
    expect(await llaveDe("contacts", suCiudadano)).toBe(await m("Zapopan"));
    expect(await llaveDe("social_listening", escucha!.id)).toBe(await m("Zapopan"));

    // Sin su municipio escrito vuelve a la regla: el de su líder.
    await db().update(schema.teams).set({ municipality: null, leaderId: conMunicipio }).where(eq(schema.teams.id, equipo));
    expect(await llaveDe("teams", equipo)).toBe(await m("San Pedro Tlaquepaque"));
  });
});

describe("relleno de filas anteriores a la 0022", () => {
  it("sigue el orden de confianza, deja General a la vista y vuelve a exigir la llave", async () => {
    const c = await pool.connect();
    try {
      // La base como estaba antes: sin disparadores ni NOT NULL, y filas sin llave.
      for (const [tabla, nombre] of DISPARADORES) await c.query(`DROP TRIGGER ${nombre} ON ${tabla}`);
      for (const tabla of TABLAS) await c.query(`ALTER TABLE ${tabla} ALTER COLUMN municipality_id DROP NOT NULL`);

      const ids = { conTexto: id(), lider: id(), integrante: id(), nadie: id(), equipo: id(), equipoSinTexto: id(), liderSinTexto: id(), s: id(), c1: id(), c2: id(), c3: id(), e1: id(), e2: id(), e3: id(), p: id() };
      const rol = roles.visit_responsible!;
      const alta = (uid: string, texto: string | null) =>
        c.query(`INSERT INTO user_profiles (id, email, display_name, role_id, municipality) VALUES ($1, $2, 'zz', $3, $4)`, [uid, `${uid}@x`, rol, texto]);
      await alta(ids.conTexto, "Tonala");
      await alta(ids.lider, null);
      await alta(ids.integrante, null);
      await alta(ids.nadie, null);
      await alta(ids.liderSinTexto, "Zapopan");
      await c.query(`INSERT INTO teams (id, name, leader_id, municipality) VALUES ($1, 'zz-t', $2, 'Tlaquepaque')`, [ids.equipo, ids.lider]);
      await c.query(`INSERT INTO teams (id, name, leader_id) VALUES ($1, 'zz-t2', $2)`, [ids.equipoSinTexto, ids.liderSinTexto]);
      await c.query(`INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)`, [ids.equipo, ids.integrante]);
      await c.query(`INSERT INTO electoral_sections (id, section_num, municipality) VALUES ($1, 990201, 'Tonalá')`, [ids.s]);
      const ciudadano = (cid: string, quien: string, sec: string | null) =>
        c.query(`INSERT INTO contacts (id, display_name, status, created_by_user_id, created_at, version, section_id) VALUES ($1, 'zz', 'active', $2, now(), 1, $3)`, [cid, quien, sec]);
      await ciudadano(ids.c1, ids.integrante, ids.s);
      await ciudadano(ids.c2, ids.integrante, null);
      await ciudadano(ids.c3, ids.nadie, null);
      const incidencia = (eid: string, quien: string, texto: string | null, sec: string | null) =>
        c.query(`INSERT INTO event_reports (id, title, description, category, status, municipality, section_id, created_by_user_id, latitude, longitude) VALUES ($1, 'zz', 'zz', 'servicios', 'active', $2, $3, $4, 20.6, -103.3)`, [eid, texto, sec, quien]);
      await incidencia(ids.e1, ids.nadie, "Zapopan Jal.", null);
      await incidencia(ids.e2, ids.nadie, null, ids.s);
      await incidencia(ids.e3, ids.nadie, null, null);
      await c.query(`INSERT INTO rapid_activity_prospects (id, prospect_name, created_by_user_id) VALUES ($1, 'zz', $2)`, [ids.p, ids.integrante]);

      // La migración, otra vez, en una transacción: como la primera vez que corrió.
      await c.query("BEGIN");
      await c.query(MIGRACION);
      await c.query("COMMIT");

      const esperado: Array<[string, string, string]> = [
        ["user_profiles", ids.conTexto, "Tonalá"], // su texto
        ["user_profiles", ids.lider, "San Pedro Tlaquepaque"], // el equipo que lidera
        ["user_profiles", ids.integrante, "San Pedro Tlaquepaque"], // el equipo al que pertenece
        ["user_profiles", ids.nadie, "General"],
        ["teams", ids.equipo, "San Pedro Tlaquepaque"], // su texto
        ["teams", ids.equipoSinTexto, "Zapopan"], // su líder
        ["contacts", ids.c1, "Tonalá"], // su sección, aunque quien lo registró es de Tlaquepaque
        ["contacts", ids.c2, "San Pedro Tlaquepaque"], // quien lo registró
        ["contacts", ids.c3, "General"],
        ["event_reports", ids.e1, "Zapopan"], // su texto
        ["event_reports", ids.e2, "Tonalá"], // su sección
        ["event_reports", ids.e3, "General"], // quien la levantó está en General
        ["rapid_activity_prospects", ids.p, "San Pedro Tlaquepaque"]
      ];
      for (const [tabla, fila, municipio] of esperado) expect([tabla, municipio, await llaveDe(tabla, fila)]).toEqual([tabla, municipio, await m(municipio)]);

      const { rows } = await c.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'municipality_id' AND is_nullable = 'NO'`
      );
      expect(rows[0]!.n).toBe(TABLAS.length);
    } finally {
      c.release();
    }
  });

  it("se detiene, sin aplicar nada, si una sección trae un municipio que no está en el catálogo", async () => {
    const s = id();
    await pool.query(`INSERT INTO electoral_sections (id, section_num, municipality) VALUES ($1, 990301, 'Springfield')`, [s]);
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      await expect(c.query(MIGRACION)).rejects.toThrow(/«Springfield»/);
      await c.query("ROLLBACK");
    } finally {
      c.release();
      await pool.query(`DELETE FROM electoral_sections WHERE id = $1`, [s]);
    }
  });
});

describe("ningún ciudadano sin municipio (C4, D1)", () => {
  const actor = (userId: string, rol: string) =>
    createAuthenticatedActor({ actorId: userId, roles: [rol], permissions: permissionsForRole(rol), correlationId: id(), authenticationMethod: "password", requestStartedAt: new Date() });

  it("el alta interna lo exige y guarda la llave del municipio elegido, no la de quien registra", async () => {
    const lider = await persona("Tonalá", "territorial_coordinator");
    expect(await registrarCiudadano(actor(lider, "territorial_coordinator"), { firstName: "zz-Sin" })).toMatchObject({ ok: false, status: 400, campo: "municipality" });

    const r = await registrarCiudadano(actor(lider, "territorial_coordinator"), { firstName: "zz-Zapopan", municipality: "Zapopan" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(await llaveDe("contacts", r.contactId)).toBe(await m("Zapopan"));
  });

  it("el registro público lo exige y guarda su llave", async () => {
    const slug = `zz-${Date.now()}`;
    const anfitrion = await persona("Tonalá", "territorial_coordinator");
    await db().update(schema.userProfiles).set({ personalSlug: slug }).where(eq(schema.userProfiles.id, anfitrion));
    const pedir = (extra: Record<string, unknown>) =>
      registroPublico(
        new NextRequest("http://localhost/api/public/registro", {
          method: "POST",
          headers: { "content-type": "application/json", "x-forwarded-for": "10.9.9.9" },
          body: JSON.stringify({ slug, firstName: "zz-publico", lastName: "Prueba", birthDay: 3, birthMonth: 5, colony: "zz-Centro", ...extra })
        })
      );
    const sin = await pedir({ phone: "3398711001" });
    expect(sin.status).toBe(400);
    expect(await sin.json()).toMatchObject({ campo: "municipality" });

    const con = await pedir({ phone: "3398711002", municipality: "Guadalajara" });
    expect(con.status).toBe(200);
    const { contactId } = (await con.json()) as { contactId: string };
    expect(await llaveDe("contacts", contactId)).toBe(await m("Guadalajara"));
  });
});
