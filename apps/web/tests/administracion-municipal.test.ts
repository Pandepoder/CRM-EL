import "dotenv/config";

import crypto from "node:crypto";

import argon2 from "argon2";
import { and, eq, inArray, sql } from "drizzle-orm";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createAuthenticatedActor, type ActorContext } from "@tonala/shared/auth";
import { schema } from "@tonala/shared/database";
import { listContacts } from "@tonala/modules/contacts/application";
import { DevelopmentLogger } from "@tonala/shared/observability";

import { condicionDeEquipos, condicionPorAutor } from "@/lib/alcance-municipal";
import { permissionChecker } from "@/lib/api-helpers";
import { listarOpciones, crearOpcion } from "@/lib/catalogo-actividades";
import { contactosVisibles, veCiudadano } from "@/lib/contact-visibility";
import { createCrmDependencies } from "@/lib/crm-deps";
import { getDatabaseClient } from "@/lib/db-client";
import { cambiarEstado, cambiarRol, crearCuenta, editarCuenta, eliminarCuentaSinDatos, restablecerContrasena } from "@/lib/gobierno-de-cuentas";
import { incidentScopeCondition } from "@/lib/incident-visibility";
import { almacenesVisibles, crearAlmacen, registrarMovimiento } from "@/lib/logistica";
import { resolveUserNetworkScope, type UserNetworkScope } from "@/lib/network-hierarchy";
import { permissionsForRole } from "@/lib/permissions";

import { ErrorDeRescate, nombrarMaestroSiFalta, rescatar } from "../../../scripts/db/administracion";
import { crearBaseDesechable } from "./base-desechable";

/**
 * Etapa 6: administrador maestro y administradores municipales (migración 0023), contra una base real
 * y desechable. Dos municipios, varios administradores en cada uno:
 *   - ninguno ve lo del otro municipio, y el maestro ve todo (A1);
 *   - ningún administrador toca a otro, ni se asciende, ni cambia a nadie de municipio (A2);
 *   - cada cambio de cuenta queda auditado (A5) y cierra las sesiones de esa cuenta (A8);
 *   - la base no deja dos maestros, ni un administrador activo sin municipio;
 *   - el rescate desde la consola y el nombramiento del maestro al migrar.
 */

const id = () => crypto.randomUUID();
let base: Awaited<ReturnType<typeof crearBaseDesechable>>;
let pool: pg.Pool;
let roles: Record<string, string>;
const db = () => getDatabaseClient();

const u: Record<string, string> = {};
const c: Record<string, string> = {};
const inc: Record<string, string> = {};
const esc: Record<string, string> = {};
const eq_: Record<string, string> = {};

async function persona(nombre: string, rol: string, municipio: string | null, estado = "active") {
  const p = id();
  await db().insert(schema.userProfiles).values({
    id: p,
    email: `${nombre}-${p.slice(0, 6)}@prueba.local`,
    displayName: `zz-${nombre}`,
    roleId: roles[rol]!,
    status: estado,
    municipality: municipio
  });
  return p;
}

async function ciudadano(creador: string, municipio: string) {
  const cid = id();
  await db().insert(schema.contacts).values({
    id: cid,
    displayName: `zz-ciudadano-${cid.slice(0, 6)}`,
    createdByUserId: creador,
    status: "active",
    createdAt: new Date(),
    municipalityId: sql`(SELECT id FROM municipalities WHERE name = ${municipio})`
  });
  return cid;
}

async function incidencia(creador: string, municipio: string) {
  const iid = id();
  await db().insert(schema.eventReports).values({
    id: iid,
    title: "zz-incidencia",
    description: "prueba",
    category: "servicios",
    status: "active",
    createdByUserId: creador,
    latitude: 20.62,
    longitude: -103.24,
    municipality: municipio
  });
  return iid;
}

async function escucha(creador: string) {
  const eid = id();
  await db().insert(schema.socialListening).values({ id: eid, title: "zz-escucha", description: "prueba", categories: ["servicios"], createdByUserId: creador });
  return eid;
}

function actor(userId: string, rol = "admin", maestro = false): ActorContext {
  return createAuthenticatedActor({
    actorId: userId,
    roles: maestro ? [rol, "master_admin"] : [rol],
    permissions: permissionsForRole(rol),
    correlationId: id(),
    authenticationMethod: "password",
    requestStartedAt: new Date()
  });
}

const alcance = (userId: string) => resolveUserNetworkScope(userId);

/** Los ids de ciudadanos que ve un alcance, resolviendo la subconsulta si la hay. */
async function ciudadanosQueVe(scope: UserNetworkScope): Promise<Set<string> | "todos"> {
  const v = await contactosVisibles(scope);
  if ("todos" in v) return "todos";
  if ("ids" in v) return new Set(v.ids);
  const { rows } = await db().execute<{ id: string }>(sql`SELECT x.id FROM (${v.subconsulta}) x`);
  return new Set(rows.map((r) => r.id));
}

async function municipioDe(nombre: string) {
  const { rows } = await pool.query<{ id: string }>(
    nombre === "General" ? "SELECT id FROM municipalities WHERE kind = 'general'" : "SELECT id FROM municipalities WHERE name = $1",
    nombre === "General" ? [] : [nombre]
  );
  return rows[0]!.id;
}

beforeAll(async () => {
  base = await crearBaseDesechable("admin_municipal");
  pool = new pg.Pool({ connectionString: base.url });
  roles = Object.fromEntries((await db().select({ id: schema.roles.id, key: schema.roles.key }).from(schema.roles)).map((r) => [r.key, r.id]));

  // El maestro: el que deja la semilla en una base nueva (una cuenta de administración con la marca, en
  // General). Solo puede haber uno.
  const [maestro] = await db().select({ id: schema.userProfiles.id }).from(schema.userProfiles).where(eq(schema.userProfiles.isMasterAdmin, true));
  if (!maestro) throw new Error("La semilla debía dejar un administrador maestro");
  u.maestro = maestro.id;
  // Dos administradores de Tonalá y uno de Zapopan.
  u.adminT1 = await persona("adminT1", "admin", "Tonalá");
  u.adminT2 = await persona("adminT2", "admin", "Tonalá");
  u.adminZ = await persona("adminZ", "admin", "Zapopan");
  // Uno que la 0022 dejó en General: la regla de la 0023 ya no deja crearlo así, se imita el legado.
  await pool.query("ALTER TABLE user_profiles DISABLE TRIGGER user_profiles_regla_de_administracion");
  u.adminSinMunicipio = await persona("adminSinMunicipio", "admin", null);
  await pool.query("ALTER TABLE user_profiles ENABLE TRIGGER user_profiles_regla_de_administracion");

  // Estructura de cada municipio.
  u.liderT = await persona("liderT", "territorial_coordinator", "Tonalá");
  u.brigT = await persona("brigT", "visit_responsible", "Tonalá");
  u.liderZ = await persona("liderZ", "territorial_coordinator", "Zapopan");
  u.brigZ = await persona("brigZ", "visit_responsible", "Zapopan");
  u.enGeneral = await persona("enGeneral", "visit_responsible", null);
  eq_.T = id();
  eq_.Z = id();
  await db().insert(schema.teams).values([
    { id: eq_.T, name: "zz-equipo-T", leaderId: u.liderT, municipality: "Tonalá" },
    { id: eq_.Z, name: "zz-equipo-Z", leaderId: u.liderZ, municipality: "Zapopan" }
  ]);
  await db().insert(schema.teamMembers).values([
    { teamId: eq_.T, userId: u.brigT },
    { teamId: eq_.Z, userId: u.brigZ }
  ]);

  // Ciudadanos: de cada municipio; uno de Zapopan registrado por gente de Tonalá, y al revés.
  c.T = await ciudadano(u.liderT, "Tonalá");
  c.Z = await ciudadano(u.liderZ, "Zapopan");
  c.ZporGenteT = await ciudadano(u.liderT, "Zapopan");
  c.TporGenteZ = await ciudadano(u.liderZ, "Tonalá");
  inc.T = await incidencia(u.liderT, "Tonalá");
  inc.Z = await incidencia(u.liderZ, "Zapopan");
  esc.T = await escucha(u.brigT);
  esc.Z = await escucha(u.brigZ);
}, 180_000);

afterAll(async () => {
  await pool?.end();
  await base?.borrar();
});

describe("el alcance de cada administración (A1)", () => {
  it("el maestro ve todo; un municipal, su municipio y su gente; uno sin municipio, solo lo suyo", async () => {
    const maestro = await alcance(u.maestro!);
    expect(maestro).toMatchObject({ isAdmin: true, isMaster: true, adminMunicipalityId: null, allowedUserIds: null });

    const t1 = await alcance(u.adminT1!);
    expect(t1).toMatchObject({ isAdmin: true, isMaster: false, adminMunicipalityId: await municipioDe("Tonalá") });
    expect(t1.allowedUserIds).toEqual(expect.arrayContaining([u.adminT1, u.adminT2, u.liderT, u.brigT]));
    expect(t1.allowedUserIds).not.toContain(u.liderZ);
    expect(t1.allowedUserIds).not.toContain(u.maestro);
    expect(t1.teamIds).toEqual([eq_.T]);

    const sin = await alcance(u.adminSinMunicipio!);
    expect(sin).toMatchObject({ isAdmin: true, isMaster: false, adminMunicipalityId: null, allowedUserIds: [u.adminSinMunicipio], teamIds: [] });
  });

  it("ciudadanos: ninguno ve los del otro municipio, salvo lo que registró su gente", async () => {
    expect(await ciudadanosQueVe(await alcance(u.maestro!))).toBe("todos");

    const deT = (await ciudadanosQueVe(await alcance(u.adminT1!))) as Set<string>;
    expect(deT.has(c.T!)).toBe(true);
    expect(deT.has(c.TporGenteZ!)).toBe(true); // tiene la llave de Tonalá
    expect(deT.has(c.ZporGenteT!)).toBe(true); // lo registró su gente
    expect(deT.has(c.Z!)).toBe(false);

    const deZ = (await ciudadanosQueVe(await alcance(u.adminZ!))) as Set<string>;
    expect(deZ.has(c.Z!)).toBe(true);
    expect(deZ.has(c.T!)).toBe(false);

    const sin = (await ciudadanosQueVe(await alcance(u.adminSinMunicipio!))) as Set<string>;
    expect([...sin].filter((x) => Object.values(c).includes(x))).toEqual([]);

    expect(await veCiudadano(await alcance(u.adminT1!), c.Z!)).toBe(false);
    expect(await veCiudadano(await alcance(u.adminT1!), c.T!)).toBe(true);
  });

  it("el módulo de contactos aplica la misma regla que las pantallas", async () => {
    const { contactsReader } = await createCrmDependencies(db());
    const t1 = await alcance(u.adminT1!);
    const r = await listContacts(
      actor(u.adminT1!),
      { scopedAdministration: { municipalityId: t1.adminMunicipalityId }, pageSize: 100 },
      { contactsReader, logger: new DevelopmentLogger(), permissionChecker }
    );
    if (!r.ok) throw r.error;
    const delModulo = new Set(r.value.items.map((i) => i.contactId));
    const dePantallas = (await ciudadanosQueVe(t1)) as Set<string>;
    expect([...delModulo].sort()).toEqual([...dePantallas].filter((x) => Object.values(c).includes(x)).sort());
  });

  it("incidencias, escucha y equipos: cada municipio lo suyo", async () => {
    const t1 = await alcance(u.adminT1!);
    const incidencias = await db().select({ id: schema.eventReports.id }).from(schema.eventReports).where(and(inArray(schema.eventReports.id, Object.values(inc)), incidentScopeCondition(t1)));
    expect(incidencias.map((f) => f.id)).toEqual([inc.T]);

    const escuchas = await db()
      .select({ id: schema.socialListening.id })
      .from(schema.socialListening)
      .where(and(inArray(schema.socialListening.id, Object.values(esc)), condicionPorAutor(t1, schema.socialListening.municipalityId, schema.socialListening.createdByUserId)));
    expect(escuchas.map((f) => f.id)).toEqual([esc.T]);

    const equipos = await db().select({ id: schema.teams.id }).from(schema.teams).where(and(inArray(schema.teams.id, Object.values(eq_)), condicionDeEquipos(t1)));
    expect(equipos.map((f) => f.id)).toEqual([eq_.T]);

    const maestro = await alcance(u.maestro!);
    expect(incidentScopeCondition(maestro)).toBeUndefined();
    expect(condicionDeEquipos(maestro)).toBeUndefined();
  });

  it("catálogo: las de organización de un municipio no las ve otro; las estatales, todos (A10)", async () => {
    const creada = await crearOpcion(await alcance(u.adminT1!), { kind: "tag", name: "zz Asamblea de colonia", scope: "organization" });
    expect(creada.estado).toBe("creada");
    const estatal = await crearOpcion(await alcance(u.maestro!), { kind: "tag", name: "zz Mitin estatal", scope: "organization" });
    expect(estatal.estado).toBe("creada");

    const nombres = async (userId: string) => (await listarOpciones(await alcance(userId), { kind: "tag" })).map((o) => o.name);
    expect(await nombres(u.brigT!)).toEqual(expect.arrayContaining(["zz Asamblea de colonia", "zz Mitin estatal"]));
    expect(await nombres(u.brigZ!)).not.toContain("zz Asamblea de colonia");
    expect(await nombres(u.adminZ!)).not.toContain("zz Asamblea de colonia");
    expect(await nombres(u.brigZ!)).toContain("zz Mitin estatal");

    // Zapopan puede tener la suya con el mismo nombre: el nombre es único dentro de cada municipio.
    const deZ = await crearOpcion(await alcance(u.adminZ!), { kind: "tag", name: "zz Asamblea de colonia", scope: "organization" });
    expect(deZ.estado).toBe("creada");
  });

  it("logística: cada quien sus almacenes (A4, M32)", async () => {
    const t1 = await alcance(u.adminT1!);
    expect((await crearAlmacen(actor(u.adminT1!), t1, { nombre: "zz Bodega T", ubicacion: "", municipio: "Zapopan" })).ok).toBe(true);
    const [bodega] = await db().select().from(schema.warehouses).where(eq(schema.warehouses.name, "zz Bodega T"));
    // Se pidió Zapopan, pero un administrador municipal da de alta en el suyo, con autor.
    expect(bodega).toMatchObject({ municipalityId: await municipioDe("Tonalá"), createdByUserId: u.adminT1 });

    const ven = async (userId: string) =>
      (await db().select({ id: schema.warehouses.id }).from(schema.warehouses).where(and(eq(schema.warehouses.id, bodega!.id), almacenesVisibles(await alcance(userId))))).length;
    expect(await ven(u.adminT1!)).toBe(1);
    expect(await ven(u.adminZ!)).toBe(0);
    expect(await ven(u.maestro!)).toBe(1);

    const articulo = id();
    await db().insert(schema.inventoryItems).values({ id: articulo, warehouseId: bodega!.id, sku: "zz-1", name: "zz Lona", category: "propaganda", quantity: 3 });
    const z = await alcance(u.adminZ!);
    expect((await registrarMovimiento(actor(u.adminZ!), z, { itemId: articulo, cantidad: 1, tipo: "out", responsableId: null, notas: "" })).ok).toBe(false);
    // Salida mayor que las existencias: rechazada, sin tocar el inventario (M33).
    expect((await registrarMovimiento(actor(u.adminT1!), t1, { itemId: articulo, cantidad: 5, tipo: "out", responsableId: null, notas: "" })).ok).toBe(false);
    expect((await registrarMovimiento(actor(u.adminT1!), t1, { itemId: articulo, cantidad: 2, tipo: "out", responsableId: u.brigT!, notas: "" })).ok).toBe(true);
    // A alguien de otro municipio, no.
    expect((await registrarMovimiento(actor(u.adminT1!), t1, { itemId: articulo, cantidad: 1, tipo: "out", responsableId: u.brigZ!, notas: "" })).ok).toBe(false);
    const [quedan] = await db().select({ q: schema.inventoryItems.quantity }).from(schema.inventoryItems).where(eq(schema.inventoryItems.id, articulo));
    expect(quedan!.q).toBe(1);
  });
});

describe("ningún administrador toca a otro (A2) y todo queda auditado (A5)", () => {
  const rechaza = (r: { ok: boolean }) => expect(r.ok).toBe(false);

  it("un administrador municipal no toca a otro administrador, ni al maestro, ni a gente de otro municipio", async () => {
    const t1 = await alcance(u.adminT1!);
    const a = actor(u.adminT1!);
    rechaza(await cambiarRol(a, t1, u.adminT2!, roles.capturist!));
    rechaza(await cambiarEstado(a, t1, u.adminT2!, false));
    rechaza(await restablecerContrasena(a, t1, u.adminT2!, "otra-contrasena"));
    rechaza(await cambiarEstado(a, t1, u.maestro!, false));
    rechaza(await cambiarRol(a, t1, u.brigZ!, roles.capturist!));
    rechaza(await cambiarEstado(a, t1, u.adminZ!, false));
  });

  it("no se asciende a sí mismo ni a nadie a administración, ni cambia municipios", async () => {
    const t1 = await alcance(u.adminT1!);
    const a = actor(u.adminT1!);
    rechaza(await cambiarRol(a, t1, u.brigT!, roles.admin!));
    rechaza(await cambiarRol(a, t1, u.adminT1!, roles.direction!));
    rechaza(await editarCuenta(a, t1, u.brigT!, { displayName: "zz-brigT", municipio: "Zapopan" }));
    rechaza(await editarCuenta(a, t1, u.adminT1!, { displayName: "zz-adminT1", municipio: "Zapopan" }));
    rechaza(await crearCuenta(a, t1, { displayName: "zz nuevo admin", email: `${id()}@prueba.local`, password: "una-contrasena", roleId: roles.admin!, municipio: "Tonalá" }));
    const otro = await crearCuenta(a, t1, { displayName: "zz de otro", email: `${id()}@prueba.local`, password: "una-contrasena", roleId: roles.capturist!, municipio: "Zapopan" });
    rechaza(otro);
  });

  it("sí gobierna a su gente, en su municipio, y queda auditado", async () => {
    const t1 = await alcance(u.adminT1!);
    const a = actor(u.adminT1!);
    expect((await cambiarRol(a, t1, u.brigT!, roles.capturist!)).ok).toBe(true);
    const correo = `${id()}@prueba.local`;
    expect((await crearCuenta(a, t1, { displayName: "zz alta de T", email: correo, password: "una-contrasena", roleId: roles.visit_responsible!, municipio: null })).ok).toBe(true);
    const [alta] = await db().select({ id: schema.userProfiles.id, m: schema.userProfiles.municipalityId }).from(schema.userProfiles).where(eq(schema.userProfiles.email, correo));
    expect(alta!.m).toBe(await municipioDe("Tonalá"));

    const auditoria = await db()
      .select({ accion: schema.auditLogs.action, entidad: schema.auditLogs.entityId })
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.actorUserId, u.adminT1!));
    expect(auditoria).toEqual(expect.arrayContaining([
      { accion: "user.role_change", entidad: u.brigT },
      { accion: "user.create", entidad: alta!.id }
    ]));
    // Ningún rechazo de arriba dejó rastro de cambio sobre otro administrador.
    expect(auditoria.filter((f) => [u.adminT2, u.maestro, u.adminZ, u.brigZ].includes(f.entidad))).toEqual([]);
    await cambiarRol(a, t1, u.brigT!, roles.visit_responsible!);
  });

  it("un administrador sin municipio no gobierna a nadie", async () => {
    const sin = await alcance(u.adminSinMunicipio!);
    rechaza(await cambiarRol(actor(u.adminSinMunicipio!), sin, u.brigT!, roles.capturist!));
    rechaza(await crearCuenta(actor(u.adminSinMunicipio!), sin, { displayName: "zz x", email: `${id()}@prueba.local`, password: "una-contrasena", roleId: roles.capturist!, municipio: null }));
  });

  it("el maestro gobierna a todos menos a sí mismo; nombra administradores con municipio", async () => {
    const m = await alcance(u.maestro!);
    const a = actor(u.maestro!, "admin", true);
    rechaza(await cambiarRol(a, m, u.maestro!, roles.direction!));
    rechaza(await cambiarEstado(a, m, u.maestro!, false));
    // Alguien en General no puede ser administración: primero su municipio.
    rechaza(await cambiarRol(a, m, u.enGeneral!, roles.admin!));
    expect((await editarCuenta(a, m, u.enGeneral!, { displayName: "zz-enGeneral", municipio: "Zapopan" })).ok).toBe(true);
    expect((await cambiarRol(a, m, u.enGeneral!, roles.admin!)).ok).toBe(true);
    expect((await alcance(u.enGeneral!)).adminMunicipalityId).toBe(await municipioDe("Zapopan"));
    // Transferir un administrador y dejarlo sin municipio: lo segundo no.
    expect((await editarCuenta(a, m, u.enGeneral!, { displayName: "zz-enGeneral", municipio: "Tonalá" })).ok).toBe(true);
    rechaza(await editarCuenta(a, m, u.enGeneral!, { displayName: "zz-enGeneral", municipio: "" }));
    // Y le asigna municipio al que quedó en General.
    expect((await editarCuenta(a, m, u.adminSinMunicipio!, { displayName: "zz-adminSinMunicipio", municipio: "Zapopan" })).ok).toBe(true);
    expect((await alcance(u.adminSinMunicipio!)).adminMunicipalityId).toBe(await municipioDe("Zapopan"));
  });

  it("eliminar una cuenta: solo el maestro y solo sin datos", async () => {
    const m = await alcance(u.maestro!);
    const a = actor(u.maestro!, "admin", true);
    const vacia = await persona("vacia", "capturist", "Tonalá");
    rechaza(await eliminarCuentaSinDatos(actor(u.adminT1!), await alcance(u.adminT1!), vacia));
    expect((await eliminarCuentaSinDatos(a, m, vacia)).ok).toBe(true);
    const conDatos = await eliminarCuentaSinDatos(a, m, u.liderT!);
    expect(conDatos).toMatchObject({ ok: false, status: 409 });
  });
});

describe("reglas de la base (0023)", () => {
  it("un solo maestro, siempre administración y en General", async () => {
    await expect(pool.query("UPDATE user_profiles SET is_master_admin = true, municipality_id = municipio_general() WHERE id = $1", [u.adminZ])).rejects.toMatchObject({ code: expect.stringMatching(/23505|23514/) });
    await expect(pool.query("UPDATE user_profiles SET municipality_id = (SELECT id FROM municipalities WHERE name = 'Tonalá') WHERE id = $1", [u.maestro])).rejects.toMatchObject({ code: "23514" });
    await expect(pool.query("UPDATE user_profiles SET role_id = $2 WHERE id = $1", [u.maestro, roles.direction])).rejects.toMatchObject({ code: "23514" });
    // Sumarse a un equipo con municipio no lo saca de General.
    await pool.query("INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)", [eq_.T, u.maestro]);
    expect((await pool.query("SELECT municipality_id = municipio_general() AS g FROM user_profiles WHERE id = $1", [u.maestro])).rows[0].g).toBe(true);
    await pool.query("DELETE FROM team_members WHERE team_id = $1 AND user_id = $2", [eq_.T, u.maestro]);
  });

  it("no se crea ni se activa un administrador sin municipio", async () => {
    await expect(persona("admin-en-general", "admin", null)).rejects.toThrow();
    const inactivo = await persona("admin-inactivo", "admin", null, "inactive");
    await expect(pool.query("UPDATE user_profiles SET status = 'active' WHERE id = $1", [inactivo])).rejects.toMatchObject({ code: "23514" });
  });

  it("la versión de sesión sube con rol, estado, contraseña y municipio de administración, y no con el nombre (A8)", async () => {
    const version = async (p: string) => (await pool.query<{ v: number }>("SELECT session_version AS v FROM user_profiles WHERE id = $1", [p])).rows[0]!.v;
    const b = await persona("sesiones", "visit_responsible", "Tonalá");
    const v0 = await version(b);
    await pool.query("UPDATE user_profiles SET display_name = 'zz-otra' WHERE id = $1", [b]);
    await pool.query("UPDATE user_profiles SET municipality = 'Zapopan', municipality_id = (SELECT id FROM municipalities WHERE name = 'Zapopan') WHERE id = $1", [b]);
    expect(await version(b)).toBe(v0);
    await restablecerContrasena(actor(u.maestro!, "admin", true), await alcance(u.maestro!), b, "nueva-contrasena");
    expect(await version(b)).toBe(v0 + 1);
    await pool.query("UPDATE user_profiles SET role_id = $2 WHERE id = $1", [b, roles.capturist]);
    expect(await version(b)).toBe(v0 + 2);

    const vA = await version(u.adminT2!);
    await pool.query("UPDATE user_profiles SET municipality = 'Zapopan', municipality_id = (SELECT id FROM municipalities WHERE name = 'Zapopan') WHERE id = $1", [u.adminT2]);
    expect(await version(u.adminT2!)).toBe(vA + 1);
  });
});

describe("rescate desde la consola y nombramiento del maestro", () => {
  it("nombra al maestro de ADMIN_EMAIL solo si no hay uno, y solo si ya es administración activa", async () => {
    const auxPool = new pg.Pool({ connectionString: base.url });
    try {
      const [yo] = await db().select({ email: schema.userProfiles.email }).from(schema.userProfiles).where(eq(schema.userProfiles.id, u.adminZ!));
      expect(await nombrarMaestroSiFalta(auxPool, yo!.email)).toMatchObject({ estado: "ya_habia" });

      // Sin maestro —como al desplegar la 0023, con los administradores que la 0022 dejó en General—: una
      // brigadista no se asciende; un administrador activo, sí. Ese estado ya no se puede crear con la
      // regla puesta: se imita el de antes.
      await pool.query("ALTER TABLE user_profiles DISABLE TRIGGER user_profiles_regla_de_administracion");
      await pool.query("UPDATE user_profiles SET is_master_admin = false WHERE id = $1", [u.maestro]);
      await pool.query("ALTER TABLE user_profiles ENABLE TRIGGER user_profiles_regla_de_administracion");
      const [brig] = await db().select({ email: schema.userProfiles.email }).from(schema.userProfiles).where(eq(schema.userProfiles.id, u.brigT!));
      expect(await nombrarMaestroSiFalta(auxPool, brig!.email)).toMatchObject({ estado: "sin_cuenta" });
      expect(await nombrarMaestroSiFalta(auxPool, undefined)).toMatchObject({ estado: "sin_variable" });
      const [m] = await db().select({ email: schema.userProfiles.email }).from(schema.userProfiles).where(eq(schema.userProfiles.id, u.maestro!));
      expect(await nombrarMaestroSiFalta(auxPool, m!.email.toUpperCase())).toMatchObject({ estado: "nombrado" });
      const [auditada] = await db().select().from(schema.auditLogs).where(and(eq(schema.auditLogs.action, "admin.master_named"), eq(schema.auditLogs.entityId, u.maestro!)));
      expect(auditada?.actorUserId).toBeNull();
    } finally {
      await auxPool.end();
    }
  });

  it("rescata: reemplaza al maestro solo si se pide, nombra municipales y da una contraseña temporal que sirve", async () => {
    const auxPool = new pg.Pool({ connectionString: base.url });
    try {
      const correoDe = async (p: string) => (await db().select({ email: schema.userProfiles.email }).from(schema.userProfiles).where(eq(schema.userProfiles.id, p)))[0]!.email;
      await expect(rescatar(auxPool, { correo: await correoDe(u.adminZ!), maestro: true })).rejects.toBeInstanceOf(ErrorDeRescate);

      const r = await rescatar(auxPool, { correo: await correoDe(u.adminZ!), maestro: true, reemplazar: true });
      expect(r.hecho.length).toBeGreaterThan(0);
      const cuentas = await db()
        .select({ id: schema.userProfiles.id, maestro: schema.userProfiles.isMasterAdmin, estado: schema.userProfiles.status })
        .from(schema.userProfiles)
        .where(inArray(schema.userProfiles.id, [u.maestro!, u.adminZ!]));
      expect(cuentas).toEqual(expect.arrayContaining([
        { id: u.adminZ, maestro: true, estado: "active" },
        { id: u.maestro, maestro: false, estado: "inactive" }
      ]));

      // El anterior maestro vuelve como administrador de Tonalá, con una contraseña temporal.
      const vuelta = await rescatar(auxPool, { correo: await correoDe(u.maestro!), municipio: "tonala", contrasenaTemporal: true });
      expect(vuelta.contrasena).toMatch(/^[a-zA-Z2-9]{4}(-[a-zA-Z2-9]{4}){3}$/);
      const [hash] = await db().select({ h: schema.userProfiles.passwordHash, estado: schema.userProfiles.status }).from(schema.userProfiles).where(eq(schema.userProfiles.id, u.maestro!));
      expect(hash!.estado).toBe("active");
      expect(await argon2.verify(hash!.h!, vuelta.contrasena!)).toBe(true);
      expect((await alcance(u.maestro!)).adminMunicipalityId).toBe(await municipioDe("Tonalá"));

      await expect(rescatar(auxPool, { correo: "nadie@prueba.local", cerrarSesiones: true })).rejects.toBeInstanceOf(ErrorDeRescate);
      const consola = await db().select({ n: sql<number>`count(*)::int` }).from(schema.auditLogs).where(sql`${schema.auditLogs.actorUserId} IS NULL AND ${schema.auditLogs.action} LIKE 'admin.%'`);
      expect(consola[0]!.n).toBeGreaterThanOrEqual(4);
      // La contraseña no queda en la auditoría.
      const textos = await db().select({ d: schema.auditLogs.afterData }).from(schema.auditLogs).where(sql`${schema.auditLogs.actorUserId} IS NULL`);
      expect(JSON.stringify(textos)).not.toContain(vuelta.contrasena!);
    } finally {
      await auxPool.end();
    }
  });
});
