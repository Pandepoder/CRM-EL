import "dotenv/config";

import crypto from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createAuthenticatedActor, type ActorContext } from "@tonala/shared/auth";
import { huellaDeTelefono, schema } from "@tonala/shared/database";

import { registrarCiudadano } from "@/lib/alta-ciudadano";
import { motivoSiAdjuntosAjenos, puedeVerArchivo, urlDeArchivo } from "@/lib/archivos";
import { getDatabaseClient } from "@/lib/db-client";
import { permissionsForRole } from "@/lib/permissions";
import { crearProspecto } from "@/lib/prospectos-servicio";

import { POST as registroPublico } from "../app/api/public/registro/route";
import { POST as unirme } from "../app/api/public/unirme/route";
import { crearBaseDesechable } from "./base-desechable";

/**
 * Etapa 3 contra una base real (y desechable):
 *   - las altas de campo se crean una sola vez aunque lleguen dos veces (R16);
 *   - el registro público valida el municipio y la sección (C18, D1) y va en una transacción;
 *   - cada archivo subido lo ve solo quien puede ver el registro que lo usa (A12).
 */

const id = () => crypto.randomUUID();
const u: { L: string; M: string; O: string; A: string } = { L: id(), M: id(), O: id(), A: id() };
const equipo = id();
const seccion = { tonala: id(), zapopan: id() };
const colonia = { catalogo: id(), tonala: id() };
const SLUG = `zz-lider-${Date.now()}`;

let base: Awaited<ReturnType<typeof crearBaseDesechable>>;
const db = () => getDatabaseClient();

function actor(userId: string, rol: string): ActorContext {
  return createAuthenticatedActor({
    actorId: userId,
    roles: [rol],
    permissions: permissionsForRole(rol),
    correlationId: id(),
    authenticationMethod: "password",
    requestStartedAt: new Date()
  });
}

const lider = () => actor(u.L, "territorial_coordinator");
const capturista = () => actor(u.O, "capturist");

async function contactosConClave(clave: string) {
  return db().select({ id: schema.contacts.id }).from(schema.contacts).where(eq(schema.contacts.clientRequestId, clave));
}

function peticionPublica(cuerpo: Record<string, unknown>, ip = "10.9.0.1") {
  return new NextRequest("http://localhost/api/public/registro", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(cuerpo)
  });
}

const personaPublica = (telefono: string, extra: Record<string, unknown> = {}) => ({
  slug: SLUG,
  firstName: "zz-publico",
  lastName: "Prueba",
  phone: telefono,
  birthDay: 3,
  birthMonth: 5,
  municipality: "Tonalá",
  // Obligatoria en el QR desde el 2026-09-26.
  colony: "zz-Colonia de prueba",
  ...extra
});

beforeAll(async () => {
  base = await crearBaseDesechable("altas_campo");
  const roles = Object.fromEntries((await db().select({ id: schema.roles.id, key: schema.roles.key }).from(schema.roles)).map((r) => [r.key, r.id]));
  const persona = (userId: string, rol: string, nombre: string, slug: string | null = null) => ({
    id: userId, email: `${nombre}@prueba.local`, displayName: nombre, roleId: roles[rol]!, status: "active", personalSlug: slug
  });
  await db().insert(schema.userProfiles).values([
    persona(u.L, "territorial_coordinator", "zz-lider", SLUG),
    persona(u.M, "visit_responsible", "zz-integrante"),
    persona(u.O, "capturist", "zz-ajeno")
  ]);
  // Administración que lo ve todo: el maestro que deja la semilla en una base nueva (etapa 6). Un
  // administrador activo sin municipio ya no se puede crear.
  const [maestro] = await db().select({ id: schema.userProfiles.id }).from(schema.userProfiles).where(eq(schema.userProfiles.isMasterAdmin, true));
  if (!maestro) throw new Error("La semilla debía dejar un administrador maestro en la base desechable");
  u.A = maestro.id;
  await db().insert(schema.teams).values({ id: equipo, name: "zz-equipo", leaderId: u.L });
  await db().insert(schema.teamMembers).values({ teamId: equipo, userId: u.M });
  await db().insert(schema.electoralSections).values([
    { id: seccion.tonala, sectionNum: 990001, municipality: "Tonalá" },
    { id: seccion.zapopan, sectionNum: 990002, municipality: "Zapopan" }
  ]);
  // Una colonia del catálogo de Tonalá, con acento y mayúsculas: el alta la escribe como sea.
  await db().insert(schema.catalogVersions).values({ id: colonia.catalogo, catalogType: "colonies", sourceName: "zz-prueba", sourceVersion: "v1" });
  await db().insert(schema.colonies).values({ id: colonia.tonala, catalogVersionId: colonia.catalogo, name: "ZZ-Colonia Práctica", municipality: "Tonalá", status: "active" });
}, 180_000);

afterAll(async () => {
  await base?.borrar();
});

describe("alta interna de ciudadano (POST /api/crm/contacts)", () => {
  it("la misma clave dos veces es un solo ciudadano, con su nota y su encuesta una vez", async () => {
    const clave = id();
    const entrada = {
      firstName: "zz-Ana", lastName: "Idempotente", phone: "3312345001", clientRequestId: clave,
      initialNote: "Primera plática", survey: { colonyPriorityNeed: "Seguridad" }, municipality: "Tonalá", sectionNum: 990001
    };
    const primero = await registrarCiudadano(lider(), entrada);
    const segundo = await registrarCiudadano(lider(), entrada);
    expect(primero).toMatchObject({ ok: true, repetido: false });
    expect(segundo).toMatchObject({ ok: true, repetido: true });
    if (!primero.ok || !segundo.ok) return;
    expect(segundo.contactId).toBe(primero.contactId);
    expect(await contactosConClave(clave)).toHaveLength(1);

    const [ficha] = await db().select().from(schema.contacts).where(eq(schema.contacts.id, primero.contactId));
    expect(ficha).toMatchObject({ sectionId: seccion.tonala, municipality: "Tonalá", origin: "toca_toca", panMilitancy: "no_registrada", actualContactUserId: u.L });
    const notas = await db().select().from(schema.contactNotes).where(eq(schema.contactNotes.contactId, primero.contactId));
    expect(notas.map((n) => n.noteText)).toEqual(["Primera plática"]);
    expect(await db().select().from(schema.socialSurveys).where(eq(schema.socialSurveys.contactId, primero.contactId))).toHaveLength(1);
  });

  it("cinco envíos simultáneos con la misma clave crean uno", async () => {
    const clave = id();
    const r = await Promise.all(Array.from({ length: 5 }, () => registrarCiudadano(lider(), { firstName: "zz-Simultaneo", municipality: "Tonalá", clientRequestId: clave })));
    const ids = new Set(r.map((x) => (x.ok ? x.contactId : "fallo")));
    expect(ids.size).toBe(1);
    expect(ids.has("fallo")).toBe(false);
    expect(await contactosConClave(clave)).toHaveLength(1);
  });

  it("la clave de otra persona no entrega su ciudadano", async () => {
    const clave = id();
    await registrarCiudadano(lider(), { firstName: "zz-Clave", municipality: "Tonalá", clientRequestId: clave });
    expect(await registrarCiudadano(capturista(), { firstName: "zz-Clave", municipality: "Tonalá", clientRequestId: clave })).toMatchObject({ ok: false, status: 409 });
  });

  it("rechaza, diciendo el campo, una sección de otro municipio, una que no existe y un 31 de febrero; y no crea nada", async () => {
    const antes = await db().select({ n: sql<number>`count(*)::int` }).from(schema.contacts);
    expect(await registrarCiudadano(lider(), { firstName: "zz-X", municipality: "Tonalá", sectionNum: 990002 })).toMatchObject({ ok: false, status: 400, campo: "sectionNum" });
    expect(await registrarCiudadano(lider(), { firstName: "zz-X", sectionNum: 999999 })).toMatchObject({ ok: false, status: 400, campo: "sectionNum" });
    expect(await registrarCiudadano(lider(), { firstName: "zz-X", municipality: "Springfield" })).toMatchObject({ ok: false, status: 400, campo: "municipality" });
    expect(await registrarCiudadano(lider(), { firstName: "zz-X", birthDay: 31, birthMonth: 2 })).toMatchObject({ ok: false, status: 400, campo: "birthDay" });
    const despues = await db().select({ n: sql<number>`count(*)::int` }).from(schema.contacts);
    expect(despues[0]!.n).toBe(antes[0]!.n);
  });

  it("sin nombre sigue siendo el error de dominio de siempre (422), ahora con el campo", async () => {
    expect(await registrarCiudadano(lider(), { phone: "3300000000" })).toMatchObject({ ok: false, status: 422, code: "contact_display_name_required", campo: "firstName" });
  });

  it("la sección sola decide el municipio", async () => {
    const r = await registrarCiudadano(lider(), { firstName: "zz-Seccion", sectionNum: 990002 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const [ficha] = await db().select({ m: schema.contacts.municipality }).from(schema.contacts).where(eq(schema.contacts.id, r.contactId));
    expect(ficha?.m).toBe("Zapopan");
  });
});

describe("prospectos", () => {
  it("la misma clave dos veces es un solo prospecto; de otra persona, 409", async () => {
    const clave = id();
    const integrante = actor(u.M, "visit_responsible");
    const a = await crearProspecto(integrante, { prospectName: "zz-Prospecto" }, clave);
    const b = await crearProspecto(integrante, { prospectName: "zz-Prospecto" }, clave);
    expect(a).toMatchObject({ ok: true, repetido: false });
    expect(b).toMatchObject({ ok: true, repetido: true });
    if (!a.ok || !b.ok) return;
    expect(b.prospecto.id).toBe(a.prospecto.id);
    expect(await crearProspecto(capturista(), { prospectName: "zz-Prospecto" }, clave)).toMatchObject({ ok: false, status: 409 });
    const filas = await db().select().from(schema.rapidActivityProspects).where(eq(schema.rapidActivityProspects.clientRequestId, clave));
    expect(filas).toHaveLength(1);
  });
});

describe("registro público (POST /api/public/registro)", () => {
  it("el reenvío de un registro que sí llegó devuelve el mismo, no «teléfono ya registrado»", async () => {
    const clave = id();
    const cuerpo = personaPublica("3398700001", { clientRequestId: clave });
    const r1 = await registroPublico(peticionPublica(cuerpo));
    const r2 = await registroPublico(peticionPublica(cuerpo));
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    const [d1, d2] = [await r1.json(), await r2.json()];
    expect(d2.contactId).toBe(d1.contactId);
    expect(d2.repetido).toBe(true);
    expect(await contactosConClave(clave)).toHaveLength(1);
    // Otra clave con el mismo teléfono sí es otra persona intentando registrarse: 409, como antes.
    const r3 = await registroPublico(peticionPublica(personaPublica("3398700001", { clientRequestId: id() })));
    expect(r3.status).toBe(409);
  });

  it("el mismo teléfono cuatro veces a la vez, con solicitudes distintas: una ficha y tres «ya registrado»", async () => {
    // En un evento: la persona desde su teléfono y desde el kiosco al mismo tiempo. Antes las cuatro
    // pasaban la búsqueda del teléfono antes de que ninguna guardara, y quedaban cuatro fichas.
    const telefono = "3398700010";
    const rs = await Promise.all([0, 1, 2, 3].map((i) => registroPublico(peticionPublica(personaPublica(telefono, { clientRequestId: id() }), `10.9.1.${i}`))));
    expect(rs.map((r) => r.status).sort()).toEqual([200, 409, 409, 409]);
    const fichas = await db().select({ id: schema.contacts.id }).from(schema.contacts).where(eq(schema.contacts.phoneHash, huellaDeTelefono(telefono)!));
    expect(fichas).toHaveLength(1);
  });

  it("un doble toque de la misma solicitud sigue siendo el mismo registro, no «ya registrado»", async () => {
    // Varias rondas de seis toques a la vez. Ojo: la ventana entre la búsqueda por clave y la del
    // teléfono (el caso que se corrigió) es de milisegundos y, llamando a la ruta sin servidor, esta
    // prueba casi nunca cae en ella; la reproduce el simulacro de evento por HTTP (scripts/local).
    for (let ronda = 0; ronda < 4; ronda++) {
      const clave = id();
      const cuerpo = personaPublica(`339870002${ronda}`, { clientRequestId: clave });
      const rs = await Promise.all([0, 1, 2, 3, 4, 5].map(() => registroPublico(peticionPublica(cuerpo))));
      expect(rs.map((r) => r.status)).toEqual([200, 200, 200, 200, 200, 200]);
      const ids = new Set(await Promise.all(rs.map(async (r) => (await r.json()).contactId)));
      expect(ids.size).toBe(1);
      expect(await contactosConClave(clave)).toHaveLength(1);
    }
  });

  it("el municipio sale del catálogo, nunca del texto libre; y una sección de otro municipio se rechaza", async () => {
    const libre = await registroPublico(peticionPublica(personaPublica("3398700002", { municipality: "Springfield" })));
    expect(libre.status).toBe(400);
    expect((await libre.json()).campo).toBe("municipality");
    const cruzada = await registroPublico(peticionPublica(personaPublica("3398700003", { sectionNum: 990002 })));
    expect(cruzada.status).toBe(400);
    expect((await cruzada.json()).campo).toBe("sectionNum");
    const imposible = await registroPublico(peticionPublica(personaPublica("3398700004", { birthDay: 31, birthMonth: 2 })));
    expect(imposible.status).toBe(400);
  });

  it("en modo evento queda con origen «evento», su sección y su nota, en una transacción", async () => {
    const clave = id();
    const r = await registroPublico(peticionPublica(personaPublica("3398700005", { clientRequestId: clave, modo: "evento", sectionNum: 990001 })));
    expect(r.status).toBe(200);
    const { contactId } = await r.json();
    const [ficha] = await db().select().from(schema.contacts).where(eq(schema.contacts.id, contactId));
    expect(ficha).toMatchObject({ origin: "evento", sectionId: seccion.tonala, municipality: "Tonalá", createdByUserId: u.L });
    expect(await db().select().from(schema.contactNotes).where(eq(schema.contactNotes.contactId, contactId))).toHaveLength(1);
  });

  it("un cuerpo que no es JSON es 400, no 500", async () => {
    const r = await registroPublico(new NextRequest("http://localhost/api/public/registro", { method: "POST", body: "no es json" }));
    expect(r.status).toBe(400);
  });
});

describe("el territorio desde el alta (D20)", () => {
  const territorioDe = async (contactId: string) =>
    (await db().select().from(schema.contactTerritory).where(eq(schema.contactTerritory.contactId, contactId)))[0];

  it("el alta interna lo vincula si la colonia está en el catálogo de su municipio, escrita como sea", async () => {
    const r = await registrarCiudadano(lider(), { firstName: "zz-Territorio", lastName: "Interna", phone: "3312345101", municipality: "Tonalá", colony: "  zz-colonia practica " });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const t = await territorioDe(r.contactId);
    expect(t).toMatchObject({ colonyId: colonia.tonala, territoryStatus: "confirmed", linkedByUserId: u.L });
    const auditoria = await db().select().from(schema.auditLogs).where(eq(schema.auditLogs.entityId, r.contactId));
    expect(auditoria.map((a) => a.action)).toContain("territory.contact_linked");
  });

  it("una colonia que no está en el catálogo no se inventa: sin territorio y sin colonia nueva", async () => {
    const antes = (await db().select({ id: schema.colonies.id }).from(schema.colonies)).length;
    const r = await registrarCiudadano(lider(), { firstName: "zz-Territorio", lastName: "Inventada", phone: "3312345102", municipality: "Tonalá", colony: "Colonia Que No Existe" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(await territorioDe(r.contactId)).toBeUndefined();
    expect((await db().select({ id: schema.colonies.id }).from(schema.colonies)).length).toBe(antes);
  });

  it("la misma colonia en otro municipio no cuenta", async () => {
    const r = await registrarCiudadano(lider(), { firstName: "zz-Territorio", lastName: "OtroMunicipio", phone: "3312345103", municipality: "Zapopan", colony: "ZZ-Colonia Práctica" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(await territorioDe(r.contactId)).toBeUndefined();
  });

  it("el registro público lo vincula a nombre del dueño del enlace", async () => {
    const r = await registroPublico(peticionPublica(personaPublica("3398700030", { colony: "ZZ-COLONIA PRÁCTICA" })));
    expect(r.status).toBe(200);
    const { contactId } = await r.json();
    expect(await territorioDe(contactId)).toMatchObject({ colonyId: colonia.tonala, linkedByUserId: u.L });
  });
});

describe("sumarse a la brigada por el QR (POST /api/public/unirme)", () => {
  it("tres toques a la vez con el mismo correo: una cuenta pendiente, en su brigada, y ningún 500", async () => {
    // Visto en el simulacro de evento: los que perdían la carrera contra el índice único respondían 500.
    const correo = `zz-unirme-${id().slice(0, 8)}@prueba.local`;
    const peticion = (i: number) => new NextRequest("http://localhost/api/public/unirme", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": `10.9.2.${i}` },
      body: JSON.stringify({ slug: SLUG, displayName: "zz-unirme Brigadista", phone: "3398700020", email: correo, password: "clave-de-prueba", homeAddress: "Calle 1 #2", homeColony: "Centro", homeMunicipality: "Tonalá" })
    });
    const rs = await Promise.all([0, 1, 2].map((i) => unirme(peticion(i))));
    expect(rs.map((r) => r.status).sort()).toEqual([200, 400, 400]);
    const cuentas = await db().select({ id: schema.userProfiles.id, status: schema.userProfiles.status }).from(schema.userProfiles).where(eq(schema.userProfiles.email, correo));
    expect(cuentas).toHaveLength(1);
    expect(cuentas[0]!.status).toBe("pending");
    const enEquipo = await db().select().from(schema.teamMembers).where(eq(schema.teamMembers.userId, cuentas[0]!.id));
    expect(enEquipo).toHaveLength(1);
  });
});

describe("quién ve cada archivo subido (/api/uploads)", () => {
  const nombre = (etiqueta: string) => `${Date.now()}-${id()}-${etiqueta}.jpg`;
  const f = { incidencia: nombre("inc"), deOtro: nombre("otro"), escucha: nombre("esc"), barda: nombre("barda"), perfil: nombre("perfil"), video: nombre("video") };

  beforeAll(async () => {
    const subido = (fileName: string, por: string, mediaType = "image") => ({ fileName, uploadedByUserId: por, mediaType, sizeBytes: 10 });
    await db().insert(schema.uploadedFiles).values([
      subido(f.incidencia, u.M), subido(f.deOtro, u.O), subido(f.escucha, u.M), subido(f.barda, u.M), subido(f.perfil, u.O), subido(f.video, u.M, "video")
    ]);
  });

  it("antes de que exista el registro, solo lo ve quien lo subió", async () => {
    expect(await puedeVerArchivo(f.incidencia, u.M)).toBe(true);
    expect(await puedeVerArchivo(f.incidencia, u.L)).toBe(false);
    expect(await puedeVerArchivo(f.incidencia, u.O)).toBe(false);
  });

  it("en una incidencia o actividad, lo ve su cadena de mando y administración; nadie más", async () => {
    await db().insert(schema.eventReports).values({
      title: "zz-inc", description: "zz", latitude: 20.6, longitude: -103.2, category: "servicios", createdByUserId: u.M,
      mediaUrls: [{ url: urlDeArchivo(f.incidencia), type: "image", name: "x.jpg" }]
    });
    expect(await puedeVerArchivo(f.incidencia, u.L)).toBe(true);
    expect(await puedeVerArchivo(f.incidencia, u.A)).toBe(true);
    expect(await puedeVerArchivo(f.incidencia, u.O)).toBe(false);
  });

  it("en escucha social y en la barda de un ciudadano, la misma regla que esas pantallas", async () => {
    await db().insert(schema.socialListening).values({ categories: ["propuesta"], title: "zz-esc", description: "zz", photoUrls: [urlDeArchivo(f.escucha)], createdByUserId: u.M });
    await db().insert(schema.contacts).values({ id: id(), displayName: "zz-barda", status: "active", createdByUserId: u.M, createdAt: new Date(), version: 1, bardaPhotoUrl: urlDeArchivo(f.barda) });
    expect(await puedeVerArchivo(f.escucha, u.L)).toBe(true);
    expect(await puedeVerArchivo(f.escucha, u.O)).toBe(false);
    expect(await puedeVerArchivo(f.barda, u.L)).toBe(true);
    expect(await puedeVerArchivo(f.barda, u.O)).toBe(false);
  });

  it("una foto de perfil la ve cualquier sesión; un nombre que no existe, nadie", async () => {
    await db().update(schema.userProfiles).set({ photoUrl: urlDeArchivo(f.perfil) }).where(eq(schema.userProfiles.id, u.O));
    expect(await puedeVerArchivo(f.perfil, u.M)).toBe(true);
    expect(await puedeVerArchivo(`${Date.now()}-no-existe.jpg`, u.A)).toBe(false);
    expect(await puedeVerArchivo("../.env", u.A)).toBe(false);
  });

  it("al guardar, no se puede adjuntar como propia la foto de otra persona", async () => {
    expect(await motivoSiAdjuntosAjenos(u.M, [urlDeArchivo(f.deOtro)])).toMatch(/no lo subiste tú/);
    expect(await motivoSiAdjuntosAjenos(u.M, ["https://ejemplo.com/x.jpg"])).toMatch(/subidos desde la aplicación/);
    expect(await motivoSiAdjuntosAjenos(u.M, [urlDeArchivo(f.video)], [], { soloImagenes: true })).toMatch(/solo se puede adjuntar una foto/);
    expect(await motivoSiAdjuntosAjenos(u.M, [urlDeArchivo(f.incidencia)])).toBeNull();
    // Al editar, lo que el registro ya tenía se conserva aunque lo haya subido otra persona.
    expect(await motivoSiAdjuntosAjenos(u.L, [urlDeArchivo(f.incidencia)], [urlDeArchivo(f.incidencia)])).toBeNull();
    // Y la barda de un alta interna pasa por la misma regla.
    expect(await registrarCiudadano(lider(), { firstName: "zz-Barda", municipality: "Tonalá", bardaPhotoUrl: urlDeArchivo(f.deOtro) })).toMatchObject({ ok: false, campo: "bardaPhotoUrl" });
  });
});
