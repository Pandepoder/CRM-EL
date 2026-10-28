import "dotenv/config";

import crypto from "node:crypto";

import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createAuthenticatedActor, type ActorContext } from "@tonala/shared/auth";
import { schema } from "@tonala/shared/database";

import type * as AyudantesApi from "@/lib/api-helpers";
import { permissionsForRole } from "@/lib/permissions";

import { crearBaseDesechable } from "./base-desechable";

/**
 * «Reportar un problema» de punta a punta (§9 del plan de experiencia sencilla), con la sesión de cada rol y
 * una base desechable:
 *
 *   Tonalá:  AT (administración), L (líder) ── M (brigadista)
 *   Zapopan: AZ (administración), MZ (brigadista)
 *   y el administrador maestro de la semilla.
 *
 * - Cualquiera reporta, solo sobre pantallas que abre; sin señal, el reenvío no lo duplica.
 * - Cada quien ve los suyos con su estado y la respuesta.
 * - Revisa administración, solo lo de su gente (el maestro, todo); el líder no revisa.
 * - La captura la ven quien la subió y quien revisa ese reporte.
 */

const sesion: { actor: ActorContext | null } = { actor: null };
vi.mock("@/lib/api-helpers", async (importarOriginal) => {
  const original = await importarOriginal<typeof AyudantesApi>();
  return { ...original, actorFromSession: async () => sesion.actor };
});

const ruta = await import("../app/api/problemas/route");
const rutaReporte = await import("../app/api/problemas/[id]/route");
const rutaVistos = await import("../app/api/problemas/vistos/route");
const { getDatabaseClient } = await import("@/lib/db-client");
const { contarProblemasNuevos, contarRespuestasNuevas } = await import("@/lib/problemas-servicio");
const { puedeVerArchivo } = await import("@/lib/archivos");
const { resolveUserNetworkScope } = await import("@/lib/network-hierarchy");

const id = (): string => crypto.randomUUID();
const db = () => getDatabaseClient();
const u = { AT: id(), AZ: id(), L: id(), M: id(), MZ: id() };
const ROL: Record<string, string> = { AT: "admin", AZ: "admin", L: "territorial_coordinator", M: "visit_responsible", MZ: "visit_responsible" };
let maestro = "";
let base: Awaited<ReturnType<typeof crearBaseDesechable>>;

function como(clave: keyof typeof u | "maestro" | null) {
  if (!clave) {
    sesion.actor = null;
    return;
  }
  const esMaestro = clave === "maestro";
  const rol = esMaestro ? "admin" : ROL[clave]!;
  sesion.actor = createAuthenticatedActor({
    actorId: esMaestro ? maestro : u[clave],
    roles: esMaestro ? [rol, "master_admin"] : [rol],
    permissions: permissionsForRole(rol),
    correlationId: id(),
    authenticationMethod: "password",
    requestStartedAt: new Date()
  });
}

const json = (url: string, method: string, cuerpo?: unknown, crudo?: string) =>
  new NextRequest(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(cuerpo !== undefined || crudo !== undefined ? { body: crudo ?? JSON.stringify(cuerpo) } : {})
  });
const reportar = (cuerpo: unknown, crudo?: string) => ruta.POST(json("/api/problemas", "POST", cuerpo, crudo));
const leer = (vista?: string) => ruta.GET(new Request(`http://localhost/api/problemas${vista ? `?vista=${vista}` : ""}`));
const contestar = (reporteId: string, cuerpo: unknown) =>
  rutaReporte.PATCH(json(`/api/problemas/${reporteId}`, "PATCH", cuerpo), { params: Promise.resolve({ id: reporteId }) });

const reporteDeM = { lugar: "/equipo", tipo: "falla", descripcion: "Toqué Guardar en la actividad y no hizo nada." };
let idDeM = "";
let idDeMZ = "";
const captura = { deM: `zz-captura-m-${Date.now()}.png`, deMZ: `zz-captura-mz-${Date.now()}.png` };

beforeAll(async () => {
  base = await crearBaseDesechable("problemas");
  const roles = Object.fromEntries((await db().select({ id: schema.roles.id, key: schema.roles.key }).from(schema.roles)).map((r) => [r.key, r.id]));
  await db().insert(schema.userProfiles).values(
    (Object.keys(u) as Array<keyof typeof u>).map((k) => ({
      id: u[k],
      email: `zz-${k.toLowerCase()}-${u[k].slice(0, 6)}@prueba.local`,
      displayName: `zz ${k}`,
      roleId: roles[ROL[k]!]!,
      status: "active",
      municipality: k.endsWith("Z") ? "Zapopan" : "Tonalá"
    }))
  );
  const equipo = id();
  await db().insert(schema.teams).values({ id: equipo, name: "zz brigada", leaderId: u.L, municipality: "Tonalá" });
  await db().insert(schema.teamMembers).values({ teamId: equipo, userId: u.M });
  await db().insert(schema.uploadedFiles).values([
    { fileName: captura.deM, uploadedByUserId: u.M, mediaType: "image", sizeBytes: 1000 },
    { fileName: captura.deMZ, uploadedByUserId: u.MZ, mediaType: "image", sizeBytes: 1000 }
  ]);
  const [m] = await db().select({ id: schema.userProfiles.id }).from(schema.userProfiles).where(eq(schema.userProfiles.isMasterAdmin, true));
  if (!m) throw new Error("La semilla debía dejar un administrador maestro");
  maestro = m.id;
}, 180_000);

afterAll(async () => {
  sesion.actor = null;
  await base?.borrar();
});

describe("reportar", () => {
  it("sin sesión 401; cuerpo roto 400", async () => {
    como(null);
    expect((await reportar(reporteDeM)).status).toBe(401);
    como("M");
    expect((await reportar(undefined, "{no es json")).status).toBe(400);
  });

  it("el brigadista reporta una pantalla suya: se guarda con el nombre del lugar y el contexto acotado", async () => {
    como("M");
    const clave = id();
    const r = await reportar({
      ...reporteDeM,
      clientRequestId: clave,
      ruta: "/equipo?actividad=1",
      error: "No se pudo guardar.",
      dispositivo: { navegador: "Android Chrome", pantalla: "375x812", enLinea: true, contrasena: "nunca" }
    });
    expect(r.status).toBe(201);
    idDeM = (await r.json()).id;
    const [fila] = await db().select().from(schema.problemReports).where(eq(schema.problemReports.id, idDeM));
    expect(fila).toMatchObject({
      createdByUserId: u.M,
      place: "/equipo",
      placeLabel: "Agenda",
      kind: "falla",
      status: "nuevo",
      pagePath: "/equipo?actividad=1",
      errorMessage: "No se pudo guardar.",
      device: { navegador: "Android Chrome", pantalla: "375x812", enLinea: true }
    });

    // La cola del teléfono lo reenvía (la señal se cortó después de guardarlo): no se duplica.
    const otraVez = await reportar({ ...reporteDeM, clientRequestId: clave });
    expect(otraVez.status).toBe(200);
    expect(await otraVez.json()).toEqual({ id: idDeM, repetido: true });
    // La misma clave desde otra cuenta no devuelve el reporte ajeno.
    como("MZ");
    expect((await reportar({ ...reporteDeM, clientRequestId: clave })).status).toBe(409);
  });

  it("no puede señalar una pantalla que no abre, ni mandar algo incompleto", async () => {
    como("M");
    const casos: Array<[Record<string, unknown>, string]> = [
      [{ ...reporteDeM, lugar: "/admin-usuarios" }, "lugar"],
      [{ ...reporteDeM, lugar: "/resumen" }, "lugar"],
      [{ ...reporteDeM, tipo: "queja" }, "tipo"],
      [{ ...reporteDeM, descripcion: "" }, "descripcion"]
    ];
    for (const [cuerpo, campo] of casos) {
      const r = await reportar(cuerpo);
      expect(r.status, campo).toBe(400);
      expect(await r.json(), campo).toMatchObject({ campo });
    }
  });

  it("la captura tiene que haberla subido quien reporta", async () => {
    como("M");
    const ajena = await reportar({ ...reporteDeM, foto: `/api/uploads/${captura.deMZ}` });
    expect(ajena.status).toBe(400);
    expect(await ajena.json()).toMatchObject({ campo: "foto" });
    const propia = await reportar({ ...reporteDeM, tipo: "se_ve_mal", descripcion: "La letra es muy chica.", foto: `/api/uploads/${captura.deM}` });
    expect(propia.status).toBe(201);

    como("MZ");
    const r = await reportar({ lugar: "funcion:sin-senal", tipo: "no_entiendo", descripcion: "No sé si se guardó." });
    expect(r.status).toBe(201);
    idDeMZ = (await r.json()).id;
  });
});

describe("leer y contestar", () => {
  it("cada quien ve solo los suyos, del más nuevo al más viejo, con su estado", async () => {
    como("M");
    const mios = (await (await leer()).json()).reportes as Array<{ id: string; lugar: string; estado: string; respuesta: string | null }>;
    expect(mios.map((r) => r.lugar)).toEqual(["Agenda", "Agenda"]);
    expect(mios.every((r) => r.estado === "nuevo" && r.respuesta === null)).toBe(true);
    expect(mios.map((r) => r.id)).not.toContain(idDeMZ);
  });

  it("revisar es de administración: el brigadista y el líder reciben 403", async () => {
    como("M");
    expect((await leer("revisar")).status).toBe(403);
    como("L");
    expect((await leer("revisar")).status).toBe(403);
  });

  it("administración municipal revisa lo de su gente; el maestro, todo", async () => {
    const ids = async () => ((await (await leer("revisar")).json()).reportes as Array<{ id: string; quien: { id: string } }>).map((r) => r.quien.id);
    como("AT");
    expect(new Set(await ids())).toEqual(new Set([u.M]));
    como("AZ");
    expect(new Set(await ids())).toEqual(new Set([u.MZ]));
    como("maestro");
    expect(new Set(await ids())).toEqual(new Set([u.M, u.MZ]));

    como("AT");
    const { resumen } = await (await leer("revisar")).json();
    expect(resumen.porEstado).toEqual({ nuevo: 2, en_revision: 0, resuelto: 0, descartado: 0 });
    expect(resumen.lugaresConMas).toEqual([{ lugar: "Agenda", abiertos: 2 }]);
    expect(await contarProblemasNuevos(await resolveUserNetworkScope(u.AT))).toBe(2);
    expect(await contarProblemasNuevos(await resolveUserNetworkScope(u.AZ))).toBe(1);
    expect(await contarProblemasNuevos(await resolveUserNetworkScope(u.L))).toBe(0);
  });

  it("administración contesta lo de su gente y la persona lo ve; lo de otro municipio no existe para ella", async () => {
    como("M");
    expect((await contestar(idDeM, { estado: "resuelto" })).status).toBe(403);
    como("AZ");
    expect((await contestar(idDeM, { estado: "resuelto" })).status).toBe(404);
    como("AT");
    expect((await contestar("no-es-un-id", { estado: "resuelto" })).status).toBe(404);
    expect((await contestar(idDeM, { estado: "listo" })).status).toBe(400);
    expect((await contestar(idDeM, { estado: "resuelto", respuesta: "x".repeat(1001) })).status).toBe(400);

    const r = await contestar(idDeM, { estado: "en_revision", respuesta: "Ya lo estamos viendo." });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ estado: "en_revision", respuesta: "Ya lo estamos viendo." });
    // Cambiar el estado sin mandar respuesta conserva la que ya tenía.
    expect(await (await contestar(idDeM, { estado: "resuelto" })).json()).toEqual({ estado: "resuelto", respuesta: "Ya lo estamos viendo." });

    const [fila] = await db().select().from(schema.problemReports).where(eq(schema.problemReports.id, idDeM));
    expect([fila!.status, fila!.statusChangedByUserId, fila!.statusChangedAt !== null]).toEqual(["resuelto", u.AT, true]);
    como("M");
    const mio = ((await (await leer()).json()).reportes as Array<{ id: string; estado: string; respuesta: string }>).find((x) => x.id === idDeM);
    expect(mio).toMatchObject({ estado: "resuelto", respuesta: "Ya lo estamos viendo." });
    expect(await contarProblemasNuevos(await resolveUserNetworkScope(u.AT))).toBe(1);
  });
});

describe("avisarle a quien reportó que le respondieron", () => {
  it("la respuesta de administración cuenta como nueva hasta que la persona abre sus reportes", async () => {
    // Del bloque anterior: AT contestó y resolvió el de M.
    expect(await contarRespuestasNuevas(u.M)).toBe(1);
    expect(await contarRespuestasNuevas(u.MZ)).toBe(0);
    como("M");
    const antes = (await (await leer()).json()).reportes as Array<{ id: string; nuevaRespuesta: boolean }>;
    expect(antes.find((r) => r.id === idDeM)?.nuevaRespuesta).toBe(true);
    expect(antes.filter((r) => r.id !== idDeM).every((r) => !r.nuevaRespuesta)).toBe(true);

    como(null);
    expect((await rutaVistos.POST()).status).toBe(401);
    como("M");
    const vistos = await rutaVistos.POST();
    expect(await vistos.json()).toEqual({ vistas: 1 });
    expect(await contarRespuestasNuevas(u.M)).toBe(0);
    expect(((await (await leer()).json()).reportes as Array<{ nuevaRespuesta: boolean }>).some((r) => r.nuevaRespuesta)).toBe(false);
    // Marcar otra vez no cambia nada.
    expect(await (await rutaVistos.POST()).json()).toEqual({ vistas: 0 });
  });

  it("un cambio posterior de administración vuelve a ser respuesta nueva; lo que cambia la propia persona, no", async () => {
    como("AT");
    expect((await contestar(idDeM, { estado: "en_revision", respuesta: "Lo volvimos a abrir." })).status).toBe(200);
    expect(await contarRespuestasNuevas(u.M)).toBe(1);

    // Administración que reporta algo suyo y lo resuelve ella misma: no se avisa a sí misma.
    const propio = await reportar({ lugar: "/problemas-reportados", tipo: "idea", descripcion: "Filtrar por pantalla." });
    const idPropio = (await propio.json()).id as string;
    expect((await contestar(idPropio, { estado: "resuelto", respuesta: "Hecho." })).status).toBe(200);
    expect(await contarRespuestasNuevas(u.AT)).toBe(0);
  });

  it("marcar vistas solo toca los reportes de quien las ve", async () => {
    como("MZ");
    expect(await (await rutaVistos.POST()).json()).toEqual({ vistas: 0 });
    expect(await contarRespuestasNuevas(u.M)).toBe(1);
  });
});

describe("la captura", () => {
  it("la ven quien la subió y la administración que revisa ese reporte; nadie más", async () => {
    expect(await puedeVerArchivo(captura.deM, u.M)).toBe(true);
    expect(await puedeVerArchivo(captura.deM, u.AT)).toBe(true);
    expect(await puedeVerArchivo(captura.deM, maestro)).toBe(true);
    expect(await puedeVerArchivo(captura.deM, u.AZ)).toBe(false);
    expect(await puedeVerArchivo(captura.deM, u.L)).toBe(false);
    expect(await puedeVerArchivo(captura.deM, u.MZ)).toBe(false);
  });
});
