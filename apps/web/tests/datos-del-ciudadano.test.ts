import "dotenv/config";

import crypto from "node:crypto";

import { and, desc, eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createAuthenticatedActor, type ActorContext } from "@tonala/shared/auth";
import { huellaDeTelefono, schema } from "@tonala/shared/database";

import type * as AyudantesApi from "@/lib/api-helpers";
import { permissionsForRole } from "@/lib/permissions";

import { crearBaseDesechable } from "./base-desechable";

/**
 * Lo que se corrigió al revisar el registro de ciudadanos, las incidencias y la privacidad antes del
 * primer despliegue (2026-09-26), contra los manejadores HTTP de verdad y una base desechable. Solo se
 * sustituye la lectura de la sesión, que depende de las cookies:
 *
 * - corregir los datos personales de un ciudadano: quién, qué se valida, la huella del teléfono, la
 *   versión y la auditoría sin datos cifrados en claro;
 * - el teléfono repetido en el alta del panel avisa y deja seguir si se confirma;
 * - el año de nacimiento que no se capturó ya no se da por cierto (D4);
 * - territorio, notas y asignación: municipio coherente con la sección, texto válido, solo a su gente;
 * - Escucha social: estados válidos, y ver no es trabajar;
 * - incidencias: al levantarlas y al editarlas se validan categoría, fecha, sección y municipio;
 * - las acciones en bloque que no usaba nadie ya no existen.
 */

const sesion: { actor: ActorContext | null } = { actor: null };

vi.mock("@/lib/api-helpers", async (importarOriginal) => {
  const original = await importarOriginal<typeof AyudantesApi>();
  return { ...original, actorFromSession: async () => sesion.actor };
});

const ficha = await import("../app/api/crm/contacts/[id]/route");
const alta = await import("../app/api/crm/contacts/route");
const territorio = await import("../app/api/crm/contacts/[id]/territory/route");
const notas = await import("../app/api/crm/contacts/[id]/notes/route");
const asignacion = await import("../app/api/crm/contacts/[id]/assignment/route");
const escucha = await import("../app/api/escucha-social/route");
const escuchaUno = await import("../app/api/escucha-social/[id]/route");
const incidencias = await import("../app/api/map/reports/route");
const incidencia = await import("../app/api/map/reports/[id]/route");
const enBloque = await import("../app/api/map/reports/bulk/route");
const registroPublico = await import("../app/api/public/registro/route");
const { getDatabaseClient } = await import("@/lib/db-client");

const id = () => crypto.randomUUID();
const u = { L: id(), B: id(), K: id(), L2: id(), B2: id(), M: "" };
const equipo = { T: id(), T2: id() };
const seccion = { tonala: id(), zapopan: id() };
const SLUG = `zz-datos-${Date.now()}`;
const db = () => getDatabaseClient();

let base: Awaited<ReturnType<typeof crearBaseDesechable>>;

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
const lider = () => como(u.L, "territorial_coordinator");
const brigadista = () => como(u.B, "visit_responsible");
const capturista = () => como(u.K, "capturist");
const otroLider = () => como(u.L2, "territorial_coordinator");
const maestro = () => como(u.M, "admin");

const json = (url: string, method: string, cuerpo?: unknown) =>
  new NextRequest(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(cuerpo === undefined ? {} : { body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo) })
  });
const conId = (valor: string) => ({ params: Promise.resolve({ id: valor }) });

async function registrar(extra: Record<string, unknown>) {
  const r = await alta.POST(json("/api/crm/contacts", "POST", {
    firstName: "zz-Persona", lastName: "Prueba", municipality: "Tonalá", address: "Calle de Prueba #1", clientRequestId: id(), ...extra
  }));
  return { status: r.status, cuerpo: (await r.json()) as Record<string, any> };
}
async function editar(contactId: string, cuerpo: Record<string, unknown>) {
  const r = await ficha.PATCH(json(`/api/crm/contacts/${contactId}`, "PATCH", cuerpo), conId(contactId));
  return { status: r.status, cuerpo: (await r.json()) as Record<string, any> };
}
async function verFicha(contactId: string) {
  const r = await ficha.GET(json(`/api/crm/contacts/${contactId}`, "GET"), conId(contactId));
  return { status: r.status, cuerpo: (await r.json()) as Record<string, any> };
}
async function fila(contactId: string) {
  const [c] = await db().select().from(schema.contacts).where(eq(schema.contacts.id, contactId));
  return c!;
}

beforeAll(async () => {
  base = await crearBaseDesechable("datos_ciudadano");
  const roles = Object.fromEntries((await db().select({ id: schema.roles.id, key: schema.roles.key }).from(schema.roles)).map((r) => [r.key, r.id]));
  const persona = (userId: string, rol: string, nombre: string, slug: string | null = null) => ({
    id: userId, email: `${nombre}@prueba.local`, displayName: nombre, roleId: roles[rol]!, status: "active",
    personalSlug: slug, municipality: "Tonalá"
  });
  await db().insert(schema.userProfiles).values([
    persona(u.L, "territorial_coordinator", "zz-lider", SLUG),
    persona(u.B, "visit_responsible", "zz-brigadista"),
    persona(u.K, "capturist", "zz-capturista"),
    persona(u.L2, "territorial_coordinator", "zz-otro-lider"),
    persona(u.B2, "visit_responsible", "zz-otro-brigadista")
  ]);
  const [m] = await db().select({ id: schema.userProfiles.id }).from(schema.userProfiles).where(eq(schema.userProfiles.isMasterAdmin, true));
  if (!m) throw new Error("La semilla debía dejar un administrador maestro");
  u.M = m.id;
  await db().insert(schema.teams).values([
    { id: equipo.T, name: "zz-brigada", leaderId: u.L, municipality: "Tonalá" },
    { id: equipo.T2, name: "zz-otra-brigada", leaderId: u.L2, municipality: "Tonalá" }
  ]);
  await db().insert(schema.teamMembers).values([
    { teamId: equipo.T, userId: u.B },
    { teamId: equipo.T, userId: u.K },
    { teamId: equipo.T2, userId: u.B2 }
  ]);
  await db().insert(schema.electoralSections).values([
    { id: seccion.tonala, sectionNum: 990101, municipality: "Tonalá" },
    { id: seccion.zapopan, sectionNum: 990102, municipality: "Zapopan" }
  ]);
}, 180_000);

afterAll(async () => {
  sesion.actor = null;
  await base?.borrar();
});

describe("corregir los datos personales de un ciudadano", () => {
  let c1 = "";
  let c2 = "";
  let c3 = "";

  beforeAll(async () => {
    lider();
    const r1 = await registrar({
      firstName: "zz-Rosa", lastName: "Pérez", phone: "3311110001", email: "rosa@ejemplo.mx",
      birthDay: 12, birthMonth: 3, address: "Juárez", addressNumber: "10", sectionNum: 990101
    });
    const r2 = await registrar({ firstName: "zz-Toño", phone: "3311110003" });
    otroLider();
    const r3 = await registrar({ firstName: "zz-Ajeno", phone: "3311110004" });
    expect([r1.status, r2.status, r3.status]).toEqual([201, 201, 201]);
    c1 = r1.cuerpo.contactId;
    c2 = r2.cuerpo.contactId;
    c3 = r3.cuerpo.contactId;
  });

  it("la ficha enseña lo que se capturó: correo, nacimiento sin año inventado, calle y número", async () => {
    lider();
    const { status, cuerpo } = await verFicha(c1);
    expect(status).toBe(200);
    expect(cuerpo).toMatchObject({
      firstName: "zz-Rosa", lastName: "Pérez", email: "rosa@ejemplo.mx", address: "Juárez", addressNumber: "10",
      birthYearKnown: false, version: 1, canEditData: true
    });
    expect(new Date(cuerpo.birthDate).getUTCMonth()).toBe(2);
  });

  it("el capturista de la brigada corrige el teléfono: nueva huella, nueva versión, y la auditoría sin el número", async () => {
    capturista();
    const r = await editar(c1, { version: 1, phone: "33 1111 0002", email: "rosa.perez@ejemplo.mx" });
    expect(r.status).toBe(200);
    expect(r.cuerpo).toMatchObject({ version: 2 });
    const c = await fila(c1);
    expect(c.phone).toBe("33 1111 0002");
    expect(c.phoneHash).toBe(huellaDeTelefono("3311110002"));
    expect(c.email).toBe("rosa.perez@ejemplo.mx");
    expect(c.version).toBe(2);
    // Lo que queda en la base sigue cifrado.
    const crudo = (await db().execute<{ phone: string; email: string }>(sql`SELECT phone, email FROM contacts WHERE id = ${c1}`)).rows;
    expect(crudo[0]!.phone).not.toContain("1111");
    expect(crudo[0]!.email).not.toContain("rosa");
    const [auditoria] = await db().select().from(schema.auditLogs)
      .where(and(eq(schema.auditLogs.action, "contacts.update"), eq(schema.auditLogs.entityId, c1)))
      .orderBy(desc(schema.auditLogs.createdAt)).limit(1);
    expect(auditoria?.actorUserId).toBe(u.K);
    expect(auditoria?.beforeData).toMatchObject({ phone: "•••0001", email: "r•••@ejemplo.mx" });
    expect(auditoria?.afterData).toMatchObject({ phone: "•••0002", email: "r•••@ejemplo.mx" });
    const texto = JSON.stringify([auditoria?.beforeData, auditoria?.afterData]);
    expect(texto).not.toContain("3311110002");
    expect(texto).not.toContain("rosa.perez");
  });

  it("con la versión vieja no pisa la corrección de otro", async () => {
    lider();
    const r = await editar(c1, { version: 1, email: "otro@ejemplo.mx" });
    expect(r.status).toBe(409);
    expect(r.cuerpo.code).toBe("version_conflict");
    expect((await fila(c1)).email).toBe("rosa.perez@ejemplo.mx");
  });

  it("el brigadista no corrige datos personales (sí el domicilio, por otra ruta)", async () => {
    brigadista();
    const r = await editar(c1, { version: 2, email: "brigada@ejemplo.mx" });
    expect(r.status).toBe(403);
  });

  it("quien no ve al ciudadano recibe 404, como si no existiera", async () => {
    otroLider();
    expect((await editar(c1, { version: 2, email: "x@ejemplo.mx" })).status).toBe(404);
    expect((await editar("no-es-un-id", { version: 1, email: "x@ejemplo.mx" })).status).toBe(404);
  });

  it("el nombre visible sale de las partes, y el nombre no se puede dejar vacío", async () => {
    lider();
    const vacio = await editar(c1, { version: 2, firstName: "   " });
    expect(vacio.status).toBe(400);
    expect(vacio.cuerpo.campo).toBe("firstName");
    const r = await editar(c1, { version: 2, lastName: "López", maternalLastName: "Gómez" });
    expect(r.status).toBe(200);
    expect((await fila(c1)).displayName).toBe("zz-Rosa López Gómez");
  });

  it("valida la fecha, el correo y el teléfono como el alta", async () => {
    lider();
    expect((await editar(c1, { version: 3, birthDay: 31, birthMonth: 2 })).cuerpo.campo).toBe("birthDay");
    expect((await editar(c1, { version: 3, birthDay: 5 })).cuerpo.code).toBe("fecha_incompleta");
    expect((await editar(c1, { version: 3, email: "sin-arroba" })).cuerpo.campo).toBe("email");
    expect((await editar(c1, { version: 3, phone: "no tengo" })).cuerpo.campo).toBe("phone");
    expect((await fila(c1)).version).toBe(3);
  });

  it("el año se guarda cuando se da, y la fecha se puede borrar", async () => {
    lider();
    expect((await editar(c1, { version: 3, birthDay: 12, birthMonth: 3, birthYear: 1985 })).status).toBe(200);
    let c = await fila(c1);
    expect(c.birthYearKnown).toBe(true);
    expect(c.birthDate?.getUTCFullYear()).toBe(1985);
    expect((await editar(c1, { version: 4, birthDay: null, birthMonth: null, birthYear: null })).status).toBe(200);
    c = await fila(c1);
    expect(c.birthDate).toBeNull();
  });

  it("un teléfono que ya está en otra ficha avisa, con la ficha si la ve, y se guarda si se confirma", async () => {
    lider();
    const aviso = await editar(c1, { version: 5, phone: "331 111 0003" });
    expect(aviso.status).toBe(409);
    expect(aviso.cuerpo).toMatchObject({ code: "telefono_repetido", campo: "phone", contactoExistenteId: c2 });
    expect((await fila(c1)).phone).toBe("33 1111 0002");
    const confirmado = await editar(c1, { version: 5, phone: "331 111 0003", confirmarTelefonoRepetido: true });
    expect(confirmado.status).toBe(200);
    expect((await fila(c1)).phoneHash).toBe(huellaDeTelefono("3311110003"));
  });

  it("si la otra ficha no es de su estructura, avisa sin decir de quién es", async () => {
    capturista();
    const aviso = await editar(c1, { version: 6, phone: "3311110004" });
    expect(aviso.status).toBe(409);
    expect(aviso.cuerpo.code).toBe("telefono_repetido");
    expect(aviso.cuerpo.contactoExistenteId).toBeUndefined();
    expect(c3).not.toBe("");
  });

  it("el maestro corrige cualquier ficha", async () => {
    maestro();
    expect((await editar(c3, { version: 1, addressNumber: "22-B" })).status).toBe(200);
  });
});

describe("alta del panel con un teléfono que ya existe", () => {
  it("avisa con la ficha existente, se registra si se confirma, y el reintento no crea una tercera", async () => {
    lider();
    const primera = await registrar({ firstName: "zz-Mamá", phone: "3322220001" });
    expect(primera.status).toBe(201);

    capturista();
    const clave = id();
    const aviso = await registrar({ firstName: "zz-Hijo", phone: "33-2222-0001", clientRequestId: clave });
    expect(aviso.status).toBe(409);
    expect(aviso.cuerpo).toMatchObject({ code: "telefono_repetido", campo: "phone", contactoExistenteId: primera.cuerpo.contactId });

    const confirmada = await registrar({ firstName: "zz-Hijo", phone: "33-2222-0001", clientRequestId: clave, confirmarTelefonoRepetido: true });
    expect(confirmada.status).toBe(201);
    const reintento = await registrar({ firstName: "zz-Hijo", phone: "33-2222-0001", clientRequestId: clave, confirmarTelefonoRepetido: true });
    expect(reintento.status).toBe(200);
    expect(reintento.cuerpo.contactId).toBe(confirmada.cuerpo.contactId);
    const conEseTelefono = await db().select({ id: schema.contacts.id }).from(schema.contacts)
      .where(eq(schema.contacts.phoneHash, huellaDeTelefono("3322220001")!));
    expect(conEseTelefono).toHaveLength(2);
  });

  it("a quien no ve la otra ficha no se le dice de quién es", async () => {
    otroLider();
    const aviso = await registrar({ firstName: "zz-Vecino", phone: "3322220001" });
    expect(aviso.status).toBe(409);
    expect(aviso.cuerpo.contactoExistenteId).toBeUndefined();
  });
});

describe("año de nacimiento no capturado (D4)", () => {
  it("el alta del panel y el registro público lo marcan como desconocido; con año, conocido", async () => {
    lider();
    const sinAnio = await registrar({ firstName: "zz-SinAño", birthDay: 1, birthMonth: 6 });
    const conAnio = await registrar({ firstName: "zz-ConAño", birthDay: 1, birthMonth: 6, birthYear: 1990 });
    expect((await fila(sinAnio.cuerpo.contactId)).birthYearKnown).toBe(false);
    expect((await fila(conAnio.cuerpo.contactId)).birthYearKnown).toBe(true);

    sesion.actor = null;
    const r = await registroPublico.POST(new NextRequest("http://localhost/api/public/registro", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "10.77.0.1" },
      body: JSON.stringify({ slug: SLUG, firstName: "zz-Publico", phone: "3399990001", birthDay: 9, birthMonth: 9, municipality: "Tonalá", colony: "zz-Centro", clientRequestId: id() })
    }));
    expect(r.status).toBe(200);
    const [publico] = await db().select().from(schema.contacts).where(eq(schema.contacts.phoneHash, huellaDeTelefono("3399990001")!));
    expect(publico?.birthYearKnown).toBe(false);
  });
});

describe("territorio, notas y asignación desde la ficha", () => {
  let c = "";
  beforeAll(async () => {
    lider();
    c = (await registrar({ firstName: "zz-Territorio", phone: "3355550001", sectionNum: 990101 })).cuerpo.contactId;
  });

  it("una sección de un municipio con otro municipio escrito se rechaza diciendo cuál es", async () => {
    lider();
    const mal = await territorio.POST(json(`/api/crm/contacts/${c}/territory`, "POST", { sectionNum: 990101, municipality: "Zapopan" }), conId(c));
    expect(mal.status).toBe(400);
    expect((await mal.json()).error).toContain("es de Tonalá");
    const bien = await territorio.POST(json(`/api/crm/contacts/${c}/territory`, "POST", { sectionNum: 990101, municipality: "Tonalá" }), conId(c));
    expect(bien.status).toBe(200);
  });

  it("una nota que no es texto, vacía o enorme se rechaza sin error del servidor", async () => {
    lider();
    const nota = (cuerpo: unknown) => notas.POST(json(`/api/crm/contacts/${c}/notes`, "POST", cuerpo), conId(c));
    expect((await nota({ noteText: 123 })).status).toBe(400);
    expect((await nota({ noteText: "   " })).status).toBe(400);
    expect((await nota({ noteText: "x".repeat(4001) })).status).toBe(400);
    expect((await nota("{no es json")).status).toBe(400);
    expect((await nota({ noteText: "Vive frente al parque" })).status).toBe(200);
  });

  it("el líder asigna solo a gente bajo su mando", async () => {
    lider();
    const asignar = (a: string) => asignacion.POST(json(`/api/crm/contacts/${c}/assignment`, "POST", { assignedUserId: a }), conId(c));
    expect((await asignar(u.B2)).status).toBe(403);
    expect((await asignar(u.B)).status).toBeLessThan(300);
  });

  it("el brigadista ve la ficha que le asignaron: corrige el domicilio, no los datos personales", async () => {
    brigadista();
    const { status, cuerpo } = await verFicha(c);
    expect(status).toBe(200);
    expect(cuerpo).toMatchObject({ canEditData: false, canEditTerritory: true });
  });
});

describe("Escucha social: estados válidos, y ver no es trabajar", () => {
  let e1 = "";
  beforeAll(async () => {
    const [f] = await db().insert(schema.socialListening).values({
      categories: ["propuesta"], title: "zz-Luminaria", description: "Fundida", createdByUserId: u.B
    }).returning({ id: schema.socialListening.id });
    e1 = f!.id;
  });
  const cambiar = (cuerpo: unknown) => escuchaUno.PATCH(json(`/api/escucha-social/${e1}`, "PATCH", cuerpo), conId(e1));

  it("el capturista lo ve como solo consulta y no le cambia el estado", async () => {
    capturista();
    const lista = await (await escucha.GET(json("/api/escucha-social", "GET"))).json();
    const item = lista.items.find((i: { id: string }) => i.id === e1);
    expect(item?.puedeTrabajar).toBe(false);
    expect((await cambiar({ status: "cerrado" })).status).toBe(403);
  });

  it("quien lo levantó y quien lo coordina sí; un estado inventado, no", async () => {
    lider();
    const lista = await (await escucha.GET(json("/api/escucha-social", "GET"))).json();
    expect(lista.items.find((i: { id: string }) => i.id === e1)?.puedeTrabajar).toBe(true);
    expect((await cambiar({ status: "hackeado" })).status).toBe(400);
    expect((await cambiar({ status: "en_seguimiento", resolutionNotes: "Se reportó a la dirección" })).status).toBe(200);
    brigadista();
    expect((await cambiar({ status: "cerrado" })).status).toBe(200);
  });

  it("quien no lo ve recibe 404, no «no es de tu equipo»", async () => {
    otroLider();
    expect((await cambiar({ status: "pendiente" })).status).toBe(404);
  });
});

describe("incidencias: lo que se escribe se valida al levantarlas y al editarlas", () => {
  let i1 = "";
  const levantar = async (cuerpo: Record<string, unknown>) => {
    const r = await incidencias.POST(json("/api/map/reports", "POST", {
      title: "zz-Bache", description: "Hondo", category: "bache", latitude: 20.6, longitude: -103.2, clientRequestId: id(), ...cuerpo
    }));
    return { status: r.status, cuerpo: (await r.json()) as Record<string, any> };
  };
  const cambiar = async (cuerpo: Record<string, unknown>) => {
    const r = await incidencia.PATCH(json(`/api/map/reports/${i1}`, "PATCH", cuerpo), conId(i1));
    return { status: r.status, cuerpo: (await r.json()) as Record<string, any> };
  };
  const guardada = async () => (await db().select().from(schema.eventReports).where(eq(schema.eventReports.id, i1)))[0]!;

  it("al levantarla, la sección elegida manda sobre el municipio escrito", async () => {
    lider();
    const r = await levantar({ sectionId: seccion.tonala, municipality: "Zapopan" });
    expect(r.status).toBe(201);
    i1 = r.cuerpo.id;
    expect((await guardada()).municipality).toBe("Tonalá");
  });

  it("al levantarla se rechazan sección inexistente, ubicación y fecha imposibles", async () => {
    lider();
    expect((await levantar({ sectionId: "no-uuid" })).status).toBe(400);
    expect((await levantar({ sectionId: id() })).cuerpo.campo).toBe("sectionId");
    expect((await levantar({ latitude: "abc" })).cuerpo.campo).toBe("latitude");
    expect((await levantar({ eventDate: "no-es-fecha" })).cuerpo.campo).toBe("eventDate");
    expect((await levantar({ title: "x".repeat(201) })).cuerpo.campo).toBe("title");
  });

  it("al editarla se rechazan categoría inventada, título vacío, fecha imposible y municipio ajeno a su sección", async () => {
    lider();
    expect((await cambiar({ category: "inventada" })).cuerpo.campo).toBe("category");
    expect((await cambiar({ title: "  " })).cuerpo.campo).toBe("title");
    expect((await cambiar({ eventDate: "no-es-fecha" })).cuerpo.campo).toBe("eventDate");
    const ajeno = await cambiar({ municipality: "Zapopan" });
    expect(ajeno.status).toBe(400);
    expect(ajeno.cuerpo.error).toContain("es de Tonalá");
    expect((await cambiar({ municipality: "Municipio Inventado" })).cuerpo.campo).toBe("municipality");
    const g = await guardada();
    expect([g.category, g.title, g.municipality]).toEqual(["bache", "zz-Bache", "Tonalá"]);
  });

  it("cambiar solo la sección lleva el municipio de la sección", async () => {
    lider();
    expect((await cambiar({ sectionId: seccion.zapopan })).status).toBe(200);
    const g = await guardada();
    expect([g.sectionId, g.municipality]).toEqual([seccion.zapopan, "Zapopan"]);
  });

  it("lo que llega igual a lo guardado no se revalida: un municipio antiguo no impide cambiar el estado", async () => {
    await db().update(schema.eventReports).set({ municipality: "Tonalá centro (captura vieja)", sectionId: null }).where(eq(schema.eventReports.id, i1));
    lider();
    const r = await cambiar({ status: "in_progress", title: "zz-Bache", municipality: "Tonalá centro (captura vieja)", category: "bache" });
    expect(r.status).toBe(200);
    expect((await guardada()).status).toBe("in_progress");
  });

  it("en bloque solo queda «archivar resueltas»: borrar en bloque ya no existe", async () => {
    maestro();
    const bloque = (cuerpo: unknown) => enBloque.POST(json("/api/map/reports/bulk", "POST", cuerpo));
    for (const action of ["delete", "resolve", "reopen", "assign"]) {
      expect((await bloque({ action, ids: [i1], assignedToUserId: u.B })).status).toBe(400);
    }
    expect(await guardada()).toBeTruthy();
    expect((await guardada()).status).toBe("in_progress");
    expect((await bloque({ action: "purge_resolved", municipality: "all" })).status).toBe(200);
  });
});
