import "dotenv/config";

import crypto from "node:crypto";

import React from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { schema } from "@tonala/shared/database";

import { crearBaseDesechable } from "./base-desechable";
import { crearEstructuraDePrueba, type EstructuraDePrueba, type Persona } from "./estructura-de-prueba";

/**
 * El perfil liviano y «Registrados por…» del Directorio (plan de auditoría de menús, fase 6): 20 ciudadanos y el
 * total, 30 actividades con el tipo real de la Agenda, colonias y secciones contadas en la base, quién abre qué
 * perfil, y `?registro=` (solo personas cuyo perfil se puede abrir; uno ajeno se ignora sin decir si existe).
 */

// La página del Directorio se llama directo y devuelve JSX: en estas pruebas se compila con `React` global.
Object.assign(globalThis, { React });

const sesion: { userId: string; roleKey: string } = { userId: "", roleKey: "" };
vi.mock("@/lib/session-server", () => ({ getServerSession: async () => sesion }));

let base: Awaited<ReturnType<typeof crearBaseDesechable>>;
let x: EstructuraDePrueba;
const db = async () => (await import("@/lib/db-client")).getDatabaseClient();
const alcance = async (p: Persona) => (await import("@/lib/network-hierarchy")).resolveUserNetworkScope(x.u[p]);
const id = () => crypto.randomUUID();
const seccion = id();
const colonia = id();
const catalogo = id();

beforeAll(async () => {
  base = await crearBaseDesechable("perfil");
  x = await crearEstructuraDePrueba(await db());
  const d = await db();
  await d.insert(schema.electoralSections).values({ id: seccion, sectionNum: 9701, municipality: "Tonalá" });
  await d.insert(schema.catalogVersions).values({ id: catalogo, catalogType: "colonies", sourceName: "zz-prueba", sourceVersion: "v1" });
  await d.insert(schema.colonies).values({ id: colonia, catalogVersionId: catalogo, name: "zz Colonia del Líder", municipality: "Tonalá", status: "active" });

  // 25 ciudadanos del líder L1 (12 en la sección de prueba y con colonia), 3 de M3 (otra brigada) y uno dado de baja.
  const ciudadanos = Array.from({ length: 25 }, (_, i) => ({
    id: id(),
    displayName: `zz Ciudadano ${String(i).padStart(2, "0")}`,
    status: "active",
    createdByUserId: x.u.L1,
    municipality: "Tonalá",
    sectionId: i < 12 ? seccion : null,
    createdAt: new Date(Date.now() - i * 60_000)
  }));
  await d.insert(schema.contacts).values([
    ...ciudadanos,
    ...[1, 2, 3].map((i) => ({ id: id(), displayName: `zz De M3 ${i}`, status: "active", createdByUserId: x.u.M3, municipality: "Tonalá", createdAt: new Date() })),
    { id: id(), displayName: "zz Dado de baja", status: "inactive", createdByUserId: x.u.L1, municipality: "Tonalá", createdAt: new Date() }
  ]);
  await d.insert(schema.contactTerritory).values(
    ciudadanos.slice(0, 7).map((c) => ({ contactId: c.id, colonyId: colonia, territoryStatus: "confirmed", linkedByUserId: x.u.L1, linkedAt: new Date() }))
  );

  // 6 visitas del líder a uno de sus ciudadanos, más recientes que sus actividades: con ellas la lista pasa de 30.
  await d.insert(schema.visits).values(
    Array.from({ length: 6 }, (_, i) => ({
      id: id(),
      contactId: ciudadanos[0]!.id,
      colonyId: colonia,
      assignedUserId: x.u.L1,
      scheduledAt: new Date(Date.now() + (i + 1) * 60_000),
      status: i < 4 ? "completed" : "scheduled",
      ...(i < 4 ? { completedAt: new Date(), completedByUserId: x.u.L1 } : {}),
      visitLocationText: "zz Domicilio",
      createdByUserId: x.u.L1,
      createdAt: new Date()
    }))
  );

  // 35 actividades de la Agenda del líder, de un tipo cuyo título no dice nada («zz Actividad n»).
  const [tipo] = await d
    .insert(schema.activityCatalogOptions)
    .values({ kind: "type", key: `zz-${id().slice(0, 6)}`, name: "zz Asamblea vecinal", normalizedName: `zz asamblea ${id().slice(0, 6)}`, createdByUserId: x.u.MA })
    .returning({ id: schema.activityCatalogOptions.id });
  await d.insert(schema.eventReports).values(
    Array.from({ length: 35 }, (_, i) => ({
      id: id(),
      title: `zz Actividad ${i}`,
      description: "Prueba del perfil",
      latitude: 20.62,
      longitude: -103.24,
      category: "brigada",
      activityTypeId: tipo!.id,
      createdByUserId: x.u.L1,
      assignedToUserId: x.u.L1,
      status: i % 2 ? "resolved" : "active",
      eventDate: new Date(Date.now() - i * 3_600_000)
    }))
  );
}, 120_000);

afterAll(async () => {
  await base?.borrar();
});

describe("el perfil liviano (F6)", () => {
  it("20 ciudadanos y el total (sin los dados de baja); colonias y secciones contadas sobre todos", async () => {
    const { datosDelPerfil } = await import("@/lib/perfil");
    const p = await datosDelPerfil(await alcance("L1"), x.u.L1);
    expect(p.ciudadanos).toHaveLength(20);
    expect(p.totalCiudadanos).toBe(25);
    expect(p.ciudadanos[0]!.displayName).toBe("zz Ciudadano 00");
    expect(p.colonias).toEqual([{ name: "zz Colonia del Líder", count: 7 }]);
    expect(p.secciones).toEqual([{ name: "Sección 9701", count: 12 }]);
  });

  it("30 actividades (visitas y Agenda juntas) con el tipo real, y los totales de todas", async () => {
    const { datosDelPerfil } = await import("@/lib/perfil");
    const p = await datosDelPerfil(await alcance("L1"), x.u.L1);
    expect(p.actividades).toHaveLength(30);
    // Las 6 visitas son las más recientes; después, actividades de la Agenda con su tipo, no adivinado por el título.
    expect(p.actividades.slice(0, 6).every((a) => a.tipo === "Visita")).toBe(true);
    expect(new Set(p.actividades.slice(6).map((a) => a.tipo))).toEqual(new Set(["zz Asamblea vecinal"]));
    expect(p.resumenActividades).toMatchObject({
      total: 41,
      hechas: 17 + 4,
      porTipo: [
        { tipo: "zz Asamblea vecinal", cantidad: 35 },
        { tipo: "Visita", cantidad: 6 }
      ]
    });
  });

  it("quien mira desde arriba ve lo mismo; un compañero que no ve los ciudadanos, no", async () => {
    const { datosDelPerfil } = await import("@/lib/perfil");
    expect((await datosDelPerfil(await alcance("D"), x.u.L1)).totalCiudadanos).toBe(25);
    expect((await datosDelPerfil(await alcance("AT"), x.u.L1)).totalCiudadanos).toBe(25);
    // El brigadista ve solo lo suyo: aunque llegara al perfil del líder, no le aparecen sus ciudadanos.
    expect((await datosDelPerfil(await alcance("M1"), x.u.L1)).totalCiudadanos).toBe(0);
  });
});

describe("quién abre qué perfil (§4.6)", () => {
  it("el propio, su estructura, la administración de su municipio y el maestro; nadie más", async () => {
    const { puedeVerPerfil } = await import("@/lib/perfil");
    const casos: Array<[Persona, Persona, boolean]> = [
      ["L1", "L1", true],
      ["D", "L1", true],
      ["K1", "L1", true],
      ["AT", "L1", true],
      ["MA", "L1", true],
      ["L2", "L1", false],
      ["DB", "L1", false],
      ["AZ", "L1", false],
      ["M1", "L1", false]
    ];
    for (const [quien, de, puede] of casos) expect(await puedeVerPerfil(await alcance(quien), x.u[de]), `${quien} → ${de}`).toBe(puede);
  });
});

describe("Directorio «Registrados por…» (`?registro=`)", () => {
  const directorio = async (p: Persona, registro?: string) => {
    sesion.userId = x.u[p];
    sesion.roleKey = x.rol(p);
    const { default: Pagina } = await import("../app/(shell)/crm/contacts/page");
    const el = await Pagina({ searchParams: Promise.resolve(registro === undefined ? {} : { registro }) });
    const { inicial } = el.props as { inicial: { total: number; registro: { id: string; nombre: string } | null; filas: Array<{ displayName: string }> } };
    return { totalCount: inicial.total, registro: inicial.registro, contactsList: inicial.filas };
  };

  it("con una persona de su estructura, filtra a lo que registró y dice quién", async () => {
    const r = await directorio("D", x.u.L1);
    expect(r.registro).toEqual({ id: x.u.L1, nombre: "zz L1" });
    expect(r.totalCount).toBe(25);
    expect(r.contactsList.every((c) => c.displayName.startsWith("zz Ciudadano"))).toBe(true);
  });

  it("una persona ajena o un id inventado se ignoran: el mismo directorio que sin filtro, sin decir si existe", async () => {
    const sinFiltro = await directorio("L2");
    for (const pedido of [x.u.L1, id(), "no-es-un-id"]) {
      const r = await directorio("L2", pedido);
      expect(r.registro, pedido).toBeNull();
      expect(r.totalCount, pedido).toBe(sinFiltro.totalCount);
    }
  });

  it("su propio id también sirve", async () => {
    expect((await directorio("L1", x.u.L1)).totalCount).toBe(25);
  });
});
