import "dotenv/config";

import crypto from "node:crypto";

import { and, eq, inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { ActorContext } from "@tonala/shared/auth";
import { huellaDeTelefono, schema } from "@tonala/shared/database";

import type * as AyudantesApi from "@/lib/api-helpers";

import { crearBaseDesechable } from "./base-desechable";
import { crearEstructuraDePrueba, type EstructuraDePrueba, type Persona } from "./estructura-de-prueba";

/**
 * Importar ciudadanos desde Excel (`/crm/importar`, decisión del dueño del 2026-11-21) contra una base desechable:
 * - solo administración importa: el maestro a cualquier municipio, la municipal al suyo (la matriz);
 * - la vista previa dice qué pasaría con cada renglón y no guarda nada;
 * - se guarda con su sección, municipio y ubicación; los repetidos y los errores no se guardan; reenviar no duplica;
 * - la respuesta no trae nada de las fichas que ya existen (privacidad);
 * - quien solo trae domicilio se busca en el mapa (OpenStreetMap simulado), con sus límites.
 */

const sesion: { actor: ActorContext | null } = { actor: null };
vi.mock("@/lib/api-helpers", async (importarOriginal) => {
  const original = await importarOriginal<typeof AyudantesApi>();
  return { ...original, actorFromSession: async () => sesion.actor };
});

// OpenStreetMap simulado: cada calle de prueba responde algo distinto. Nunca sale a la red.
const busquedas: string[] = [];
vi.mock("@/lib/osm-search", () => ({
  buscarDireccion: async (texto: string) => {
    busquedas.push(texto);
    if (texto.includes("Saturada")) return { filas: [], saturado: true };
    if (texto.includes("Con Numero")) return { filas: [{ lat: "19.00", lon: "-106.50", address: { house_number: "5" } }], saturado: false };
    if (texto.includes("Sin Numero")) return { filas: [{ lat: "19.00", lon: "-106.48", address: {} }], saturado: false };
    // En Zapopan: no es del municipio del ciudadano, no se acepta.
    if (texto.includes("Lejos")) return { filas: [{ lat: "19.20", lon: "-106.30", address: { house_number: "1" } }], saturado: false };
    return { filas: [], saturado: false };
  }
}));

let base: Awaited<ReturnType<typeof crearBaseDesechable>>;
let x: EstructuraDePrueba;
const db = async () => (await import("@/lib/db-client")).getDatabaseClient();
const id = (): string => crypto.randomUUID();

// Cuadros en el mar, frente a la costa: la base desechable trae la cartografía real de Jalisco y aquí no hay ninguna sección.
const SECCION = { t1: 990301, t2: 990302, z1: 990303 };
const cuadro = (lng: number, lat: number) => ({
  type: "Polygon",
  coordinates: [[[lng - 0.01, lat - 0.01], [lng + 0.01, lat - 0.01], [lng + 0.01, lat + 0.01], [lng - 0.01, lat + 0.01], [lng - 0.01, lat - 0.01]]]
});
const seccionId = { t1: id(), t2: id(), z1: id() };
const existente = id();
const municipioId: Record<string, string> = {};

type Fila = { renglon: number; datos: Record<string, string> };
const fila = (renglon: number, datos: Record<string, string>): Fila => ({ renglon, datos });
const persona = (renglon: number, nombre: string, telefono: string | null, extra: Record<string, string> = {}) =>
  fila(renglon, { nombre: `zz ${nombre}`, apellidoPaterno: "Importado", ...(telefono ? { telefono } : {}), calle: `Calle de ${nombre}`, ...extra });

async function llamar(p: Persona | null, ruta: "revision" | "guardar" | "ubicar", cuerpo: unknown) {
  sesion.actor = p ? x.actor(p) : null;
  const modulo =
    ruta === "revision"
      ? await import("../app/api/crm/contacts/importar/revision/route")
      : ruta === "guardar"
        ? await import("../app/api/crm/contacts/importar/route")
        : await import("../app/api/crm/contacts/importar/ubicar/route");
  const url = `http://localhost/api/crm/contacts/importar${ruta === "guardar" ? "" : `/${ruta}`}`;
  const r = await modulo.POST(new Request(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) }));
  const texto = await r.text();
  // `JSON.parse` ya devuelve `any`: cada prueba mira la forma que espera.
  const respuesta: any = JSON.parse(texto);
  return { estado: r.status, texto, cuerpo: respuesta };
}

const revisar = (p: Persona | null, renglones: Fila[], municipio: string | null = "Tonalá", responsableId: string | null = null) =>
  llamar(p, "revision", { municipio, responsableId, renglones });

const guardar = (p: Persona | null, renglones: Array<Fila & { clientRequestId?: string }>, opciones: { municipio?: string | null; responsableId?: string | null; importacionId?: string } = {}) =>
  llamar(p, "guardar", {
    importacionId: opciones.importacionId ?? id(),
    municipio: opciones.municipio === undefined ? "Tonalá" : opciones.municipio,
    responsableId: opciones.responsableId ?? null,
    renglones: renglones.map((r) => ({ clientRequestId: id(), ...r }))
  });

const porRenglon = (cuerpo: { renglones: Array<{ renglon: number }> }) => new Map(cuerpo.renglones.map((r) => [r.renglon, r as any]));
const cuantosCiudadanos = async () => Number((await (await db()).execute(sql`SELECT count(*)::int AS n FROM contacts`)).rows[0]?.n);
const alcanceDe = async (p: Persona) => (await import("@/lib/network-hierarchy")).resolveUserNetworkScope(x.u[p]);
const ve = async (p: Persona, contactId: string) => (await import("@/lib/contact-visibility")).veCiudadano(await alcanceDe(p), contactId);

beforeAll(async () => {
  base = await crearBaseDesechable("importar");
  const d = await db();
  x = await crearEstructuraDePrueba(d);
  await d.insert(schema.electoralSections).values([
    { id: seccionId.t1, sectionNum: SECCION.t1, municipality: "Tonalá", geomJson: cuadro(-106.5, 19.0) },
    { id: seccionId.t2, sectionNum: SECCION.t2, municipality: "Tonalá", geomJson: cuadro(-106.48, 19.0) },
    { id: seccionId.z1, sectionNum: SECCION.z1, municipality: "Zapopan", geomJson: cuadro(-106.3, 19.2) }
  ]);
  (await import("@/lib/sections-geo-cache")).invalidarSeccionesGeo();
  for (const m of await d.select({ id: schema.municipalities.id, name: schema.municipalities.name }).from(schema.municipalities).where(inArray(schema.municipalities.name, ["Tonalá", "Zapopan"]))) {
    municipioId[m.name] = m.id;
  }
  // Un ciudadano que ya está en el padrón, de la brigada de L1 en Tonalá.
  await d.insert(schema.contacts).values({
    id: existente,
    displayName: "zz Existente Privado",
    status: "active",
    createdByUserId: x.u.M1,
    phone: "3311112222",
    phoneHash: huellaDeTelefono("3311112222"),
    municipality: "Tonalá",
    createdAt: new Date()
  });
}, 180_000);

afterAll(async () => {
  await base?.borrar();
});

describe("quién puede importar (la matriz)", () => {
  const una = [persona(2, "Matriz", "3300009999")];

  it("sin sesión, 401; dirección, líder, capturista y brigadista, 403 en las tres rutas; y no se guarda nada", async () => {
    const antes = await cuantosCiudadanos();
    for (const p of [null, "D", "DZ", "L1", "L3", "K1", "M1", "M5"] as const) {
      const esperado = p === null ? 401 : 403;
      const revision = await revisar(p, una);
      expect(revision.estado, `revisar · ${p}`).toBe(esperado);
      if (p) expect(revision.cuerpo.message, p).toBe("Solo administración puede importar ciudadanos.");
      expect((await guardar(p, una)).estado, `guardar · ${p}`).toBe(esperado);
      expect((await llamar(p, "ubicar", { ids: [existente] })).estado, `ubicar · ${p}`).toBe(esperado);
    }
    expect(await cuantosCiudadanos()).toBe(antes);
  });

  it("administración sí: el maestro y la administración de cada municipio", async () => {
    for (const [p, municipio] of [["MA", "Tonalá"], ["AT", "Tonalá"], ["AZ", "Zapopan"]] as const) {
      const r = await revisar(p, una, municipio);
      expect(r.estado, p).toBe(200);
      expect(r.cuerpo.renglones[0], p).toMatchObject({ estado: "listo", municipio });
    }
  });

  it("un cuerpo que no es JSON o que no tiene la forma, 400", async () => {
    sesion.actor = x.actor("MA");
    const { POST } = await import("../app/api/crm/contacts/importar/revision/route");
    const r = await POST(new Request("http://localhost/api/crm/contacts/importar/revision", { method: "POST", body: "{no es json" }));
    expect(r.status).toBe(400);
    expect((await revisar("MA", [])).estado).toBe(400);
    expect((await guardar("MA", [{ renglon: 2, datos: {}, clientRequestId: "no-es-uuid" }])).estado).toBe(400);
  });
});

describe("la vista previa", () => {
  it("dice qué pasaría con cada renglón, sin guardar nada", async () => {
    const antes = await cuantosCiudadanos();
    const r = await revisar("MA", [
      persona(2, "Ana", "3300000002", { seccion: String(SECCION.t1) }),
      persona(3, "Beto", "3300000003", { latitud: "19.00", longitud: "-106.48" }),
      persona(4, "Carla", "3300000004"),
      persona(5, "Dora", "33 0000 0002"),
      persona(6, "Eva", null),
      persona(7, "Fer", "3300000007", { municipio: "Tonalá", seccion: String(SECCION.z1) }),
      persona(8, "Gil", "+52 33 1111 2222"),
      fila(10, { nombre: "zz Ivan", telefono: "3300000010" }),
      persona(11, "Juan", "330000011"),
      persona(12, "Kim", "3300000012", { latitud: "25", longitud: "-90" }),
      persona(13, "Lia", "3300000013", { seccion: String(SECCION.t1), latitud: "19.00", longitud: "-106.48" }),
      persona(14, "Mar", "3300000014", { municipio: "zapopan" }),
      persona(15, "Nora", "3300000015", { correo: "no-es-correo" }),
      persona(16, "Oto", "3300000016", { nacimiento: "31/02/1990" }),
      persona(17, "Pia", "3300000017", { municipio: "Narnia" })
    ]);
    expect(r.estado).toBe(200);
    const f = porRenglon(r.cuerpo);
    expect(f.get(2)).toEqual({ renglon: 2, estado: "listo", ubicacion: "seccion", municipio: "Tonalá", seccion: SECCION.t1 });
    // La sección sale del punto.
    expect(f.get(3)).toEqual({ renglon: 3, estado: "listo", ubicacion: "punto", municipio: "Tonalá", seccion: SECCION.t2 });
    expect(f.get(4)).toEqual({ renglon: 4, estado: "listo", ubicacion: "domicilio", municipio: "Tonalá", seccion: null });
    expect(f.get(5)).toMatchObject({ estado: "repetido", motivo: "El mismo teléfono está en el renglón 2." });
    expect(f.get(6)).toMatchObject({ estado: "error", campo: "telefono", motivo: "Falta el teléfono." });
    expect(f.get(7)).toMatchObject({ estado: "error", campo: "seccion", motivo: expect.stringContaining("es de Zapopan, no de Tonalá") });
    // «+52 33 1111 2222» es el mismo teléfono que la ficha guardó como 3311112222.
    expect(f.get(8)).toMatchObject({ estado: "repetido", motivo: "Ya está registrado en el CRM con ese teléfono.", contactoExistenteId: existente });
    expect(f.get(10)).toMatchObject({ estado: "error", campo: "calle" });
    expect(f.get(11)).toMatchObject({ estado: "error", campo: "telefono", motivo: "El teléfono debe tener 10 dígitos." });
    expect(f.get(12)).toMatchObject({ estado: "error", campo: "latitud", motivo: "La ubicación está fuera de Jalisco." });
    expect(f.get(13)).toMatchObject({ estado: "error", campo: "seccion", motivo: expect.stringContaining(`cae en la sección ${SECCION.t2}`) });
    expect(f.get(14)).toMatchObject({ estado: "listo", ubicacion: "domicilio", municipio: "Zapopan" });
    expect(f.get(15)).toMatchObject({ estado: "error", campo: "correo" });
    expect(f.get(16)).toMatchObject({ estado: "error", campo: "nacimiento" });
    expect(f.get(17)).toMatchObject({ estado: "error", campo: "municipio", motivo: "«Narnia» no es un municipio de Jalisco." });
    // Se buscará el domicilio de todo el que no trae su punto: Ana (sección), Carla y Mar (solo domicilio).
    expect(r.cuerpo.resumen).toEqual({ renglones: 15, listos: 4, repetidos: 2, errores: 9, porUbicar: 3 });
    expect(await cuantosCiudadanos()).toBe(antes);
  });

  it("los topes del alta y los nombres de municipio como se escriben en la calle", async () => {
    const r = await revisar("MA", [
      persona(2, "X".repeat(130), "3300000070"),
      persona(3, "Numero Largo", "3300000071", { numero: "1".repeat(41) }),
      persona(4, "Colonia Larga", "3300000072", { colonia: "C".repeat(151) }),
      persona(5, "Tlaquepaque", "3300000073", { municipio: "Tlaquepaque" }),
      persona(6, "Ambiguo", "3300000074", { municipio: "Ixtlahuacán" })
    ]);
    const f = porRenglon(r.cuerpo);
    expect(f.get(2)).toMatchObject({ estado: "error", campo: "nombre", motivo: expect.stringContaining("hasta 120") });
    expect(f.get(3)).toMatchObject({ estado: "error", campo: "numero" });
    expect(f.get(4)).toMatchObject({ estado: "error", campo: "colonia" });
    // «Tlaquepaque» es «San Pedro Tlaquepaque» para el INE; «Ixtlahuacán» puede ser dos: no se adivina.
    expect(f.get(5)).toMatchObject({ estado: "listo", municipio: "San Pedro Tlaquepaque" });
    expect(f.get(6)).toMatchObject({ estado: "error", campo: "municipio" });
  });

  it("encuentra también los teléfonos de fichas antiguas que aún no tienen huella", async () => {
    const vieja = id();
    // Como quedaron antes de la 0019: el teléfono en claro y sin huella.
    await (await db()).execute(
      sql`INSERT INTO contacts (id, display_name, status, created_by_user_id, created_at, phone, municipality_id)
          VALUES (${vieja}, 'zz Ficha Vieja', 'active', ${x.u.M1}, now(), '+52 (33) 2222-3333', ${municipioId["Tonalá"]!})`
    );
    const r = await revisar("MA", [persona(2, "Nueva", "33 2222 3333")]);
    expect(r.cuerpo.renglones[0]).toMatchObject({ estado: "repetido", contactoExistenteId: vieja });
    await (await db()).execute(sql`UPDATE contacts SET status = 'inactive' WHERE id = ${vieja}`);
  });

  it("sin municipio elegido, quien no lo dice en su renglón (ni su sección) es un error", async () => {
    const r = await revisar("MA", [persona(2, "Sin", "3300000020"), persona(3, "Con", "3300000021", { seccion: String(SECCION.z1) })], null);
    expect(porRenglon(r.cuerpo).get(2)).toMatchObject({ estado: "error", campo: "municipio", motivo: expect.stringContaining("Falta el municipio") });
    expect(porRenglon(r.cuerpo).get(3)).toMatchObject({ estado: "listo", municipio: "Zapopan" });
  });

  it("la administración de Tonalá solo importa a Tonalá, diga lo que diga el cuerpo", async () => {
    const r = await revisar(
      "AT",
      [persona(2, "Mar", "3300000030", { municipio: "Zapopan" }), persona(3, "Sec", "3300000031", { seccion: String(SECCION.z1) }), persona(4, "Sin", "3300000032")],
      "Zapopan"
    );
    const f = porRenglon(r.cuerpo);
    expect(f.get(2)).toMatchObject({ estado: "error", motivo: "Esta persona es de Zapopan y tú administras Tonalá." });
    expect(f.get(3)).toMatchObject({ estado: "error", motivo: "Esta persona es de Zapopan y tú administras Tonalá." });
    expect(f.get(4)).toMatchObject({ estado: "listo", municipio: "Tonalá" });
  });

  it("queda en la auditoría solo con números", async () => {
    const filas = await (await db())
      .select({ despues: schema.auditLogs.afterData })
      .from(schema.auditLogs)
      .where(and(eq(schema.auditLogs.action, "contacts.import_review"), eq(schema.auditLogs.actorUserId, x.u.MA)));
    expect(filas.length).toBeGreaterThan(0);
    expect(filas.map((f) => f.despues)).toContainEqual({ renglones: 15, listos: 4, repetidos: 2, errores: 9, porUbicar: 3, municipio: "Tonalá" });
    const todo = JSON.stringify(filas);
    for (const prohibido of ["zz Ana", "3300000002", "Calle de", "3311112222"]) expect(todo).not.toContain(prohibido);
  });
});

describe("privacidad: la respuesta no trae lo que no debe", () => {
  it("nada de la ficha que ya existe; su id, solo a quien puede abrirla", async () => {
    const renglon = [persona(2, "Copia", "3311112222")];
    const deTonala = await revisar("AT", renglon);
    expect(deTonala.cuerpo.renglones[0]).toMatchObject({ estado: "repetido", contactoExistenteId: existente });

    // Zapopan no ve esa ficha: sabe que el teléfono ya está, como en el alta, pero no de quién.
    const deZapopan = await revisar("AZ", renglon, "Zapopan");
    expect(deZapopan.cuerpo.renglones[0]).toEqual({ renglon: 2, estado: "repetido", motivo: "Ya está registrado en el CRM con ese teléfono." });
    expect(deZapopan.texto).not.toContain(existente);

    for (const r of [deTonala, deZapopan]) {
      expect(r.texto).not.toContain("zz Existente Privado");
      // La respuesta no repite ni lo que mandó el navegador: nombres, teléfonos y calles se quedan allá.
      expect(r.texto).not.toContain("3311112222");
      expect(r.texto).not.toContain("zz Copia");
    }
  });
});

describe("guardar", () => {
  const importacionId = id();
  const listos = [
    { ...persona(2, "Ana", "3300000002", { seccion: String(SECCION.t1), colonia: "Centro", nacimiento: "1990-03-15", nota: "Le interesa el deporte" }), clientRequestId: id() },
    { ...persona(3, "Beto", "33 0000 0003", { latitud: "19.00", longitud: "-106.48", numero: "12" }), clientRequestId: id() },
    { ...persona(4, "Carla", "+52 33 0000 0004"), clientRequestId: id() },
    { ...persona(14, "Mar", "3300000014", { municipio: "Zapopan" }), clientRequestId: id() }
  ];
  const ids: Record<number, string> = {};

  it("guarda con su sección, municipio y ubicación; el teléfono en diez dígitos, cifrado y con su huella", async () => {
    const antes = await cuantosCiudadanos();
    const r = await guardar("MA", listos, { importacionId });
    expect(r.estado).toBe(200);
    expect(r.cuerpo.resumen).toEqual({ renglones: 4, listos: 4, repetidos: 0, errores: 0, porUbicar: 3 });
    for (const g of r.cuerpo.renglones) {
      expect(g.estado, String(g.renglon)).toBe("guardado");
      ids[g.renglon] = g.contactId;
    }
    expect(porRenglon(r.cuerpo).get(4)).toMatchObject({ porUbicar: true });
    // Con sección, también se buscará su domicilio; con su punto, ya no.
    expect(porRenglon(r.cuerpo).get(2)).toMatchObject({ porUbicar: true });
    expect(porRenglon(r.cuerpo).get(3)).toMatchObject({ porUbicar: false });
    expect(await cuantosCiudadanos()).toBe(antes + 4);

    const c = schema.contacts;
    const filas = await (await db())
      .select({ id: c.id, nombre: c.displayName, telefono: c.phone, huella: c.phoneHash, seccion: c.sectionId, municipio: c.municipalityId, lat: c.exactLatitude, lng: c.exactLongitude, origen: c.origin, calle: c.address, colonia: c.colony, nacimiento: c.birthDate })
      .from(c)
      .where(inArray(c.id, Object.values(ids)));
    const de = new Map(filas.map((f) => [f.id, f]));
    expect(de.get(ids[2]!)).toMatchObject({ nombre: "zz Ana Importado", telefono: "3300000002", huella: huellaDeTelefono("3300000002"), seccion: seccionId.t1, municipio: municipioId["Tonalá"], lat: null, origen: "importacion", calle: "Calle de Ana", colonia: "Centro" });
    expect(de.get(ids[2]!)?.nacimiento?.toISOString().slice(0, 10)).toBe("1990-03-15");
    expect(de.get(ids[3]!)).toMatchObject({ telefono: "3300000003", seccion: seccionId.t2, municipio: municipioId["Tonalá"], lat: 19, lng: -106.48 });
    expect(de.get(ids[4]!)).toMatchObject({ telefono: "3300000004", seccion: null, municipio: municipioId["Tonalá"], lat: null });
    expect(de.get(ids[14]!)).toMatchObject({ seccion: null, municipio: municipioId["Zapopan"] });

    // En la base, el teléfono y la calle van cifrados.
    const crudo = await (await db()).execute(sql`SELECT phone, address FROM contacts WHERE id = ${ids[2]!}`);
    expect(crudo.rows[0]?.phone).not.toBe("3300000002");
    expect(crudo.rows[0]?.address).not.toContain("Calle de Ana");

    // Cada alta con su anotación de siempre, y la tanda, con los números.
    const a = schema.auditLogs;
    const altas = await (await db()).select({ id: a.id }).from(a).where(and(eq(a.action, "contacts.register"), inArray(a.entityId, Object.values(ids))));
    expect(altas).toHaveLength(4);
    const [tanda] = await (await db()).select({ despues: a.afterData }).from(a).where(and(eq(a.action, "contacts.import"), eq(a.entityId, importacionId)));
    expect(tanda?.despues).toEqual({ renglones: 4, guardados: 4, repetidos: 0, errores: 0, municipio: "Tonalá", responsable: null });
  });

  it("reenviar la misma tanda devuelve los mismos ciudadanos; con la clave de otra persona, no", async () => {
    const antes = await cuantosCiudadanos();
    const r = await guardar("MA", listos, { importacionId });
    expect(r.cuerpo.renglones.map((g: { contactId: string }) => g.contactId)).toEqual([ids[2], ids[3], ids[4], ids[14]]);
    expect(await cuantosCiudadanos()).toBe(antes);

    const ajena = await guardar("AT", [listos[0]!]);
    expect(ajena.cuerpo.renglones[0]).toMatchObject({ estado: "error", motivo: "Esta solicitud ya se usó." });
    expect(ajena.texto).not.toContain(ids[2]!);
  });

  it("lo que ya está en el CRM no se guarda otra vez, aunque la vista previa se haya saltado", async () => {
    const antes = await cuantosCiudadanos();
    const r = await guardar("MA", [persona(2, "Otra Ana", "33-0000-0002"), persona(3, "Otro Beto", "3300000040"), persona(4, "Mismo Beto", "3300000040")]);
    const f = porRenglon(r.cuerpo);
    expect(f.get(2)).toMatchObject({ estado: "repetido", contactoExistenteId: ids[2] });
    expect(f.get(3)).toMatchObject({ estado: "guardado" });
    expect(f.get(4)).toMatchObject({ estado: "repetido", motivo: "El mismo teléfono está en el renglón 3." });
    expect(await cuantosCiudadanos()).toBe(antes + 1);
  });

  it("los renglones con error tampoco se guardan", async () => {
    const antes = await cuantosCiudadanos();
    const r = await guardar("MA", [persona(2, "Sin Teléfono", null), persona(3, "Lejos", "3300000041", { latitud: "25", longitud: "-90" })]);
    expect(r.cuerpo.renglones.map((g: { estado: string }) => g.estado)).toEqual(["error", "error"]);
    expect(await cuantosCiudadanos()).toBe(antes);
  });

  it("los ve quien debe: la administración de su municipio sí, la de otro no", async () => {
    expect(await ve("AT", ids[2]!)).toBe(true);
    expect(await ve("AZ", ids[2]!)).toBe(false);
    expect(await ve("AZ", ids[14]!)).toBe(true);
    expect(await ve("AT", ids[14]!)).toBe(false);
  });

  it("salen en el mapa: en su sección, en su punto; quien solo trae domicilio, todavía no", async () => {
    sesion.actor = x.actor("MA");
    const { GET } = await import("../app/api/map/contacts/route");
    const r = await GET(new Request("http://localhost/api/map/contacts"));
    const datos = (await r.json()) as { features: Array<{ properties: { id: string; precision: string; sectionNum: number | null }; geometry: { coordinates: [number, number] } }> };
    const enMapa = new Map(datos.features.map((f) => [f.properties.id, f]));
    expect(enMapa.get(ids[2]!)?.properties).toMatchObject({ precision: "seccion", sectionNum: SECCION.t1 });
    expect(enMapa.get(ids[3]!)?.properties).toMatchObject({ precision: "exacta", sectionNum: SECCION.t2 });
    expect(enMapa.get(ids[3]!)?.geometry.coordinates).toEqual([-106.48, 19]);
    expect(enMapa.has(ids[4]!)).toBe(false);
  });

  it("en el mapa llevan su ícono: los del Excel van marcados como importados y los demás no", async () => {
    const delPadron = id();
    await (await db()).insert(schema.contacts).values({
      id: delPadron,
      displayName: "zz Del Padrón Con GPS",
      status: "active",
      createdByUserId: x.u.M1,
      phone: "3311113333",
      phoneHash: huellaDeTelefono("3311113333"),
      municipality: "Tonalá",
      exactLatitude: 19,
      exactLongitude: -106.48,
      createdAt: new Date()
    });
    sesion.actor = x.actor("MA");
    const { GET } = await import("../app/api/map/contacts/route");
    const r = await GET(new Request("http://localhost/api/map/contacts"));
    const datos = (await r.json()) as {
      features: Array<{ properties: Record<string, unknown> }>;
      cobertura: { importados: number };
    };
    const enMapa = new Map(datos.features.map((f) => [f.properties.id as string, f.properties]));
    expect(enMapa.get(ids[2]!)?.importado).toBe(true);
    expect(enMapa.get(ids[3]!)?.importado).toBe(true);
    expect(enMapa.get(delPadron)?.importado).toBe(false);
    // El rótulo cuenta solo a los que el mapa dibuja (quien solo trae domicilio no está).
    const marcados = datos.features.filter((f) => f.properties.importado === true).length;
    expect(datos.cobertura.importados).toBe(marcados);
    expect(marcados).toBeGreaterThanOrEqual(2);
    // Solo dice de dónde llegó: ni el origen crudo ni nada del Excel viaja de más.
    expect(Object.keys(enMapa.get(ids[2]!)!)).not.toContain("origin");
  });

  it("«¿Quién los atiende?»: una persona de su gente, que los ve con su cadena; alguien de otro municipio, no", async () => {
    const r = await guardar("AT", [persona(2, "Atendida", "3300000050", { seccion: String(SECCION.t1) })], { responsableId: x.u.L1 });
    const contactId = r.cuerpo.renglones[0].contactId as string;
    const [f] = await (await db()).select({ atiende: schema.contacts.actualContactUserId }).from(schema.contacts).where(eq(schema.contacts.id, contactId));
    expect(f?.atiende).toBe(x.u.L1);
    expect(await ve("L1", contactId)).toBe(true);
    expect(await ve("D", contactId)).toBe(true);
    expect(await ve("L2", contactId)).toBe(false);

    const ajena = await guardar("AT", [persona(2, "Mal Atendida", "3300000051")], { responsableId: x.u.L3 });
    expect(ajena.estado).toBe(400);
    expect((await revisar("AT", [persona(2, "Mal Atendida", "3300000051")], null, x.u.L3)).estado).toBe(400);
  });
});

describe("ubicar por domicilio", () => {
  const u: Record<string, string> = {};

  beforeAll(async () => {
    // Con sección (se ven en el centro de su sección), guardados antes que los demás: el orden de los pendientes
    // no puede salir de la fecha de alta.
    const conSeccion = await guardar("MA", [
      fila(6, { nombre: "zz Sección Con Casa", telefono: "3300000064", calle: "Calle Con Numero", numero: "7", seccion: String(SECCION.t1) }),
      fila(7, { nombre: "zz Sección Sin Casa", telefono: "3300000065", calle: "Calle Sin Numero", seccion: String(SECCION.t2) }),
      fila(8, { nombre: "zz Sección Otra", telefono: "3300000066", calle: "Calle Con Numero", numero: "9", seccion: String(SECCION.t2) })
    ]);
    const soloDomicilio = await guardar("MA", [
      fila(2, { nombre: "zz Con Número", telefono: "3300000060", calle: "Calle Con Numero", numero: "5" }),
      fila(3, { nombre: "zz Sin Número", telefono: "3300000061", calle: "Calle Sin Numero" }),
      fila(4, { nombre: "zz Lejos", telefono: "3300000062", calle: "Calle Lejos" }),
      fila(5, { nombre: "zz Saturada", telefono: "3300000063", calle: "Calle Saturada" })
    ]);
    for (const g of [...conSeccion.cuerpo.renglones, ...soloDomicilio.cuerpo.renglones]) u[g.renglon] = g.contactId;
  });

  it("antes de buscar: todos los que no tienen su punto, primero quien no sale en el mapa", async () => {
    const { pendientesDeUbicar } = await import("@/lib/importar-ciudadanos-servicio");
    const pendientes = await pendientesDeUbicar(x.u.MA);
    const lugar = (i: number) => pendientes.indexOf(u[i]!);
    for (const i of [2, 3, 4, 5, 6, 7, 8]) expect(lugar(i), `renglón ${i}`).toBeGreaterThanOrEqual(0);
    const ultimoSinSeccion = Math.max(...[2, 3, 4, 5].map(lugar));
    const primeroConSeccion = Math.min(...[6, 7, 8].map(lugar));
    expect(ultimoSinSeccion).toBeLessThan(primeroConSeccion);
  });

  it("con número de casa, en su punto; sin número, solo en su sección; fuera de su municipio, no se acepta", async () => {
    const r = await llamar("MA", "ubicar", { ids: [u[2], u[3], u[4]] });
    expect(r.estado).toBe(200);
    expect(r.cuerpo).toEqual({
      resultados: [
        { id: u[2], resultado: "punto" },
        { id: u[3], resultado: "seccion" },
        { id: u[4], resultado: "no_encontrado" }
      ],
      detenido: null
    });
    // Se busca con la calle, el número y el municipio del ciudadano.
    expect(busquedas).toContain("Calle Con Numero 5");

    const c = schema.contacts;
    const filas = await (await db()).select({ id: c.id, seccion: c.sectionId, lat: c.exactLatitude, lng: c.exactLongitude }).from(c).where(inArray(c.id, [u[2]!, u[3]!, u[4]!]));
    const de = new Map(filas.map((f) => [f.id, f]));
    expect(de.get(u[2]!)).toMatchObject({ seccion: seccionId.t1, lat: 19, lng: -106.5 });
    expect(de.get(u[3]!)).toMatchObject({ seccion: seccionId.t2, lat: null });
    expect(de.get(u[4]!)).toMatchObject({ seccion: null, lat: null });

    const a = schema.auditLogs;
    const anotadas = await (await db()).select({ id: a.entityId, despues: a.afterData }).from(a).where(eq(a.action, "contacts.locate"));
    expect(anotadas).toEqual(
      expect.arrayContaining([
        { id: u[2], despues: { ubicacion: "punto del domicilio", seccion: SECCION.t1 } },
        { id: u[3], despues: { ubicacion: "sección del domicilio", seccion: SECCION.t2 } },
        // El que no se encontró también queda anotado (sin nada de su domicilio): así no se vuelve a buscar.
        { id: u[4], despues: { ubicacion: "no se encontró su domicilio" } }
      ])
    );
  }, 30_000);

  it("quien trae sección gana su punto solo con número de casa y dentro de esa misma sección", async () => {
    const r = await llamar("MA", "ubicar", { ids: [u[6], u[7], u[8]] });
    expect(r.cuerpo).toEqual({
      resultados: [
        { id: u[6], resultado: "punto" },
        // OpenStreetMap da la calle, no la casa: sigue en el centro de su sección.
        { id: u[7], resultado: "sin_punto" },
        // La casa cae en la sección t1 y el Excel dice t2: manda el Excel, no se mueve.
        { id: u[8], resultado: "sin_punto" }
      ],
      detenido: null
    });
    const c = schema.contacts;
    const filas = await (await db()).select({ id: c.id, seccion: c.sectionId, lat: c.exactLatitude, lng: c.exactLongitude }).from(c).where(inArray(c.id, [u[6]!, u[7]!, u[8]!]));
    const de = new Map(filas.map((f) => [f.id, f]));
    expect(de.get(u[6]!)).toMatchObject({ seccion: seccionId.t1, lat: 19, lng: -106.5 });
    expect(de.get(u[7]!)).toMatchObject({ seccion: seccionId.t2, lat: null });
    expect(de.get(u[8]!)).toMatchObject({ seccion: seccionId.t2, lat: null });

    const a = schema.auditLogs;
    const anotadas = await (await db()).select({ id: a.entityId, antes: a.beforeData, despues: a.afterData }).from(a).where(and(eq(a.action, "contacts.locate"), inArray(a.entityId, [u[6]!, u[7]!])));
    expect(anotadas).toEqual(
      expect.arrayContaining([
        { id: u[6], antes: { ubicacion: "centro de su sección" }, despues: { ubicacion: "punto del domicilio", seccion: SECCION.t1 } },
        { id: u[7], antes: { ubicacion: "centro de su sección" }, despues: { ubicacion: "sigue en el centro de su sección" } }
      ])
    );
  }, 30_000);

  it("solo lo que importó la misma persona, sigue sin su punto y no se ha buscado", async () => {
    const antes = busquedas.length;
    // Con su punto, de otra persona, mal formado, y ya buscados (no encontrado y sin casa en su sección).
    const r = await llamar("MA", "ubicar", { ids: [u[2], existente, "no-es-un-id", u[4], u[7]] });
    expect(r.cuerpo.resultados.map((x: { resultado: string }) => x.resultado)).toEqual(["no_aplica", "no_aplica", "no_aplica", "no_aplica", "no_aplica"]);
    expect(busquedas.length).toBe(antes);
    const ajena = await llamar("AT", "ubicar", { ids: [u[5]] });
    expect(ajena.cuerpo.resultados).toEqual([{ id: u[5], resultado: "no_aplica" }]);
  });

  it("una búsqueda a la vez en todo el servidor, y se detiene si OpenStreetMap está saturado", async () => {
    globalThis.__importacionUbicando = { quien: x.u.AZ, hasta: Date.now() + 60_000 };
    expect((await llamar("MA", "ubicar", { ids: [u[5]] })).cuerpo).toEqual({ resultados: [], detenido: "ocupado" });
    globalThis.__importacionUbicando = undefined;

    const r = await llamar("MA", "ubicar", { ids: [u[5]] });
    expect(r.cuerpo).toEqual({ resultados: [], detenido: "saturado" });
    // El candado se suelta al terminar.
    expect(globalThis.__importacionUbicando).toBeUndefined();
  }, 30_000);

  it("lo que no se alcanzó a buscar se retoma después; lo ya buscado, no", async () => {
    const { pendientesDeUbicar } = await import("@/lib/importar-ciudadanos-servicio");
    const pendientes = await pendientesDeUbicar(x.u.MA);
    // OpenStreetMap estaba saturado: no contestó, sigue pendiente.
    expect(pendientes).toContain(u[5]);
    for (const i of [2, 3, 4, 6, 7, 8]) expect(pendientes, `renglón ${i}`).not.toContain(u[i]);
    expect(await pendientesDeUbicar(x.u.AT)).not.toContain(u[5]);
  });
});
