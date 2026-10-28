import "dotenv/config";

import crypto from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { schema } from "@tonala/shared/database";

import type * as ClienteDb from "@/lib/db-client";
import type * as Consulta from "@/lib/incidencias-consulta";
import type * as Filtros from "@/lib/incidencias-filtros";
import type * as Jerarquia from "@/lib/network-hierarchy";

import { crearBaseDesechable } from "./base-desechable";
import { crearEstructuraDePrueba, type EstructuraDePrueba, type Persona } from "./estructura-de-prueba";

/**
 * La pantalla única de Incidencias (plan de auditoría de menús, F1.1 y fase 2): qué cuenta como incidencia, los
 * filtros, el buscador, las páginas y el recorte de nombres al alcance de quien mira. Estructura en
 * `estructura-de-prueba.ts`. «Ahora» es el 15 de octubre de 2026 a mediodía en Jalisco.
 */

const id = (): string => crypto.randomUUID();
const AHORA = new Date("2026-10-15T18:00:00Z");
const hace = (dias: number) => new Date(AHORA.getTime() - dias * 86_400_000);
const e = {
  abiertaB1: id(), viejaB1: id(), pendienteB1: id(), cerradaB1: id(), rechazadaB1: id(), actividadB1: id(),
  deOtraEnB1: id(), abiertaB3: id(), abiertaB4: id(), abiertaB2: id()
};
const paginadas = Array.from({ length: 35 }, () => id());

let base: Awaited<ReturnType<typeof crearBaseDesechable>>;
let db: ReturnType<typeof ClienteDb.getDatabaseClient>;
let alcance: typeof Jerarquia.resolveUserNetworkScope;
let consulta: typeof Consulta;
let filtros: typeof Filtros;
let x: EstructuraDePrueba;

const nuestras = new Set<string>(Object.values(e));

async function vistas(p: Persona) {
  const a = await alcance(x.u[p]);
  const ids = async (vista: Consulta.VistaDeIncidencias) =>
    (await db.select({ id: schema.eventReports.id }).from(schema.eventReports).where(consulta.condicionDeIncidencias(a, vista)))
      .map((f) => f.id)
      .filter((i) => nuestras.has(i))
      .sort();
  return { atender: await ids("atender"), cerradas: await ids("cerradas"), todas: await ids("todas") };
}

async function consultar(p: Persona, parcial: Record<string, unknown> = {}) {
  return consulta.consultarIncidencias(await alcance(x.u[p]), filtros.leerFiltrosDeIncidencias(parcial), AHORA);
}
const idsDe = (r: Consulta.ResultadoDeIncidencias) => r.filas.map((f) => f.id).filter((i) => nuestras.has(i)).sort();

beforeAll(async () => {
  base = await crearBaseDesechable("incidencias");
  db = (await import("@/lib/db-client")).getDatabaseClient();
  alcance = (await import("@/lib/network-hierarchy")).resolveUserNetworkScope;
  consulta = await import("@/lib/incidencias-consulta");
  filtros = await import("@/lib/incidencias-filtros");
  x = await crearEstructuraDePrueba(db);

  const [tipo] = await db
    .insert(schema.activityCatalogOptions)
    .values({ kind: "type", key: `zz-${id().slice(0, 6)}`, name: "zz Brigada de prueba", normalizedName: `zz brigada ${id().slice(0, 6)}`, createdByUserId: x.u.MA })
    .returning({ id: schema.activityCatalogOptions.id });

  const incidencia = (eid: string, autor: Persona, extra: Partial<typeof schema.eventReports.$inferInsert> = {}) => ({
    id: eid,
    title: `zz incidencia ${eid.slice(0, 6)}`,
    description: "Prueba de la consulta de incidencias",
    latitude: 20.62,
    longitude: -103.24,
    category: "bache",
    createdByUserId: x.u[autor],
    status: "active",
    createdAt: hace(1),
    ...extra
  });
  await db.insert(schema.eventReports).values([
    incidencia(e.abiertaB1, "L1"),
    incidencia(e.viejaB1, "L1", { title: "zz Fuga en la calle Hidalgo", category: "fuga_agua", createdAt: hace(10), assignedToUserId: x.u.M1 }),
    incidencia(e.pendienteB1, "M1", { status: "pendiente" }),
    incidencia(e.cerradaB1, "L1", { status: "resolved", closedAt: hace(0), closedByUserId: x.u.L1 }),
    incidencia(e.rechazadaB1, "L1", { status: "rechazada", closedAt: hace(0), closedByUserId: x.u.L1 }),
    incidencia(e.actividadB1, "L1", { activityTypeId: tipo!.id, category: "brigada" }),
    // La levantó alguien de otra dirección (L4) y se la asignó a la brigada B1: L1 la ve por su equipo.
    incidencia(e.deOtraEnB1, "L4", { assignedTeamId: x.t.B1 }),
    incidencia(e.abiertaB3, "L3"),
    incidencia(e.abiertaB4, "L4"),
    // Sin asignar, de la brigada B2: la otra brigada de la MISMA dirección que B1.
    incidencia(e.abiertaB2, "M3")
  ]);
  // Para las páginas: 35 en Zapopan, de L3.
  await db.insert(schema.eventReports).values(paginadas.map((pid, i) => incidencia(pid, "L3", { createdAt: hace(2 + i / 100) })));
}, 120_000);

afterAll(async () => {
  await base?.borrar();
});

describe("condicionDeIncidencias", () => {
  it("cada vista trae lo suyo, y una actividad de la Agenda nunca", async () => {
    const v = await vistas("L1");
    expect(v.atender).toEqual([e.abiertaB1, e.viejaB1, e.pendienteB1, e.deOtraEnB1].sort());
    expect(v.cerradas).toEqual([e.cerradaB1, e.rechazadaB1].sort());
    expect(v.todas).toEqual([...v.atender, ...v.cerradas].sort());
    for (const lista of Object.values(v)) expect(lista).not.toContain(e.actividadB1);
  });

  it("respeta el alcance: la otra dirección del municipio y Zapopan no ven lo de B1", async () => {
    expect((await vistas("DB")).todas).toEqual([e.deOtraEnB1, e.abiertaB4].sort());
    expect((await vistas("DZ")).todas).toEqual([e.abiertaB3]);
  });

  it("la administración municipal ve su municipio entero y el maestro todo, sin actividades", async () => {
    expect((await vistas("AT")).todas).not.toContain(e.abiertaB3);
    expect((await vistas("AT")).todas).toContain(e.abiertaB4);
    expect((await vistas("MA")).todas).toEqual(Object.values(e).filter((i) => i !== e.actividadB1).sort());
  });

  it("«Cancelada» es de la Agenda: no es un estado cerrado de incidencia", () => {
    expect(consulta.ESTADOS_CERRADOS_DE_INCIDENCIA).not.toContain("cancelada");
    expect(consulta.ESTADOS_CERRADOS_DE_INCIDENCIA).toEqual(expect.arrayContaining(["resolved", "archived", "rechazada"]));
  });
});

describe("filtros de la pantalla", () => {
  it("el buscador no distingue acentos ni mayúsculas", async () => {
    expect(idsDe(await consultar("L1", { q: "HÍDALGO" }))).toEqual([e.viejaB1]);
    expect(idsDe(await consultar("L1", { q: "nada que coincida" }))).toEqual([]);
  });

  it("por categoría, por antigüedad y lo «por aceptar»", async () => {
    expect(idsDe(await consultar("L1", { categoria: "fuga_agua" }))).toEqual([e.viejaB1]);
    expect(idsDe(await consultar("L1", { antiguedad: "7" }))).toEqual([e.viejaB1]);
    expect(idsDe(await consultar("L1", { por_aceptar: "1" }))).toEqual([e.pendienteB1]);
  });

  it("responsable: las de una persona del alcance; una de fuera se ignora sin decir nada", async () => {
    expect(idsDe(await consultar("L1", { responsable: x.u.M1 }))).toEqual([e.viejaB1]);
    const sinFiltro = idsDe(await consultar("L1"));
    expect(idsDe(await consultar("L1", { responsable: x.u.DZ }))).toEqual(sinFiltro);
    expect(idsDe(await consultar("L1", { responsable: "sin" }))).toEqual([e.abiertaB1, e.pendienteB1].sort());
  });

  it("«Sin asignar» no trae lo de otra brigada de la misma dirección, ni al revés", async () => {
    const deL1 = await consultar("L1", { responsable: "sin" });
    expect(idsDe(deL1)).not.toContain(e.abiertaB2);
    expect(deL1.indicadores.sinAsignar).toBe(2);
    const deL2 = await consultar("L2", { responsable: "sin" });
    expect(idsDe(deL2)).toEqual([e.abiertaB2]);
    expect(deL2.indicadores.sinAsignar).toBe(1);
    // Quien dirige a las dos brigadas sí ve las de ambas.
    expect(idsDe(await consultar("D", { responsable: "sin" }))).toEqual([e.abiertaB1, e.pendienteB1, e.abiertaB2].sort());
  });

  it("«Por atender» pone primero lo que espera que lo acepten", async () => {
    const r = await consultar("L1");
    expect(r.filas[0]?.id).toBe(e.pendienteB1);
  });

  it("los indicadores cuentan lo abierto del alcance", async () => {
    const r = await consultar("L1");
    expect(r.indicadores).toMatchObject({ abiertas: 4, porAceptar: 1, sinAsignar: 2, masDeSieteDias: 1, sinSeccion: 4 });
  });

  it("páginas de 30; una página que ya no existe cae en la última", async () => {
    const p2 = await consultar("L3", { page: "2" });
    expect(p2.total).toBe(36);
    expect(p2.totalPaginas).toBe(2);
    expect(p2.filas).toHaveLength(6);
    expect((await consultar("L3", { page: "99" })).pagina).toBe(2);
  });
});

describe("privacidad: los nombres se recortan en el servidor", () => {
  it("quien reportó desde otra estructura llega como nulo («Otra estructura»), no con su nombre", async () => {
    const fila = (await consultar("L1")).filas.find((f) => f.id === e.deOtraEnB1)!;
    expect(fila.reporto).toBeNull();
    expect(JSON.stringify(fila)).not.toContain("zz L4");
    expect(fila.atiendeEquipo).toBe("zz equipo de L1");
  });

  it("dentro del alcance sí llega el nombre, y el aviso de un brigadista se marca como aviso de campo", async () => {
    const r = await consultar("L1");
    expect(r.filas.find((f) => f.id === e.viejaB1)).toMatchObject({ reporto: "zz L1", atiendePersona: "zz M1" });
    expect(r.filas.find((f) => f.id === e.pendienteB1)).toMatchObject({ reporto: "zz M1", esAvisoDeCampo: true });
  });

  it("la dirección de al lado ve la incidencia que levantó su líder, pero no el nombre del equipo que la atiende", async () => {
    const fila = (await consultar("DB")).filas.find((f) => f.id === e.deOtraEnB1)!;
    expect(fila.reporto).toBe("zz L4");
    expect(fila.atiendeEquipo).toBeNull();
    expect(fila.atiendeEquipoAjeno).toBe(true);
  });
});
