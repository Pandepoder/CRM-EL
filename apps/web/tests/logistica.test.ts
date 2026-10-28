import "dotenv/config";

import crypto from "node:crypto";
import fs from "node:fs";

import { eq } from "drizzle-orm";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { schema } from "@tonala/shared/database";

import { crearBaseDesechable } from "./base-desechable";
import { crearEstructuraDePrueba, type EstructuraDePrueba, type Persona } from "./estructura-de-prueba";

/**
 * Logística (plan de auditoría de menús, fase 5): el hueco P1 (nombres de otra dirección), devoluciones,
 * archivar, «Por agotarse» (D7), entregas por fecha y la migración 0030. La matriz del §4.5, en
 * `matriz-logistica.test.ts`. Tonalá tiene dos direcciones en la estructura de prueba (D y DB): es el caso P1.
 */

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const MIGRACION = fs.readFileSync(new URL("../../../db/migrations/0030_logistica.sql", import.meta.url), "utf8");

let base: Awaited<ReturnType<typeof crearBaseDesechable>>;
let x: EstructuraDePrueba;
const db = async () => (await import("@/lib/db-client")).getDatabaseClient();
const logistica = async () => import("@/lib/logistica");
const alcance = async (p: Persona) => (await import("@/lib/network-hierarchy")).resolveUserNetworkScope(x.u[p]);

const lona = crypto.randomUUID();
const gorra = crypto.randomUUID();
let bodega = "";

beforeAll(async () => {
  base = await crearBaseDesechable("logistica");
  x = await crearEstructuraDePrueba(await db());
  const l = await logistica();
  expect((await l.crearAlmacen(x.actor("AT"), await alcance("AT"), { nombre: "zz Bodega Tonalá", ubicacion: "", municipio: "" })).ok).toBe(true);
  const [b] = await (await db()).select().from(schema.warehouses).where(eq(schema.warehouses.name, "zz Bodega Tonalá"));
  bodega = b!.id;
  await (await db()).insert(schema.inventoryItems).values([
    { id: lona, warehouseId: bodega, sku: "zz-LON", name: "zz Lona", category: "publicidad", quantity: 100 },
    { id: gorra, warehouseId: bodega, sku: "zz-GOR", name: "zz Gorra", category: "ropa", quantity: 30, minQuantity: 20 }
  ]);
  // La administración entrega a gente de las dos direcciones de Tonalá.
  const at = await alcance("AT");
  expect((await l.registrarMovimiento(x.actor("AT"), at, { itemId: lona, cantidad: 10, tipo: "out", responsableId: x.u.M1, notas: "zz para M1" })).ok).toBe(true);
  expect((await l.registrarMovimiento(x.actor("AT"), at, { itemId: lona, cantidad: 5, tipo: "out", responsableId: x.u.M4, notas: "zz para M4" })).ok).toBe(true);
}, 120_000);

afterAll(async () => {
  await base?.borrar();
});

describe("P1: los nombres de otra dirección no salen", () => {
  it("la dirección ve a su gente con nombre y lo de la otra dirección sumado como «Otras estructuras»", async () => {
    const datos = await (await logistica()).datosDeLogistica(await alcance("D"));
    const texto = JSON.stringify(datos);
    expect(texto).not.toContain("zz M4");
    expect(texto).not.toContain("zz para M4");
    expect(datos.enManos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ personaId: x.u.M1, persona: "zz M1", cantidad: 10 }),
        expect.objectContaining({ personaId: null, persona: "Otras estructuras", cantidad: 5 })
      ])
    );
    const responsables = datos.movimientos.filas.map((m) => m.responsable);
    expect(responsables).toEqual(expect.arrayContaining(["zz M1", "Otras estructuras"]));
  });

  it("la otra dirección, al revés", async () => {
    const datos = await (await logistica()).datosDeLogistica(await alcance("DB"));
    expect(JSON.stringify(datos)).not.toContain("zz M1");
    expect(datos.enManos).toEqual(expect.arrayContaining([expect.objectContaining({ personaId: x.u.M4, cantidad: 5 })]));
  });

  it("la administración del municipio ve los dos nombres", async () => {
    const datos = await (await logistica()).datosDeLogistica(await alcance("AT"));
    expect(datos.enManos.map((f) => f.persona).sort()).toEqual(["zz M1", "zz M4"]);
    expect(datos.enManos.some((f) => f.personaId === null)).toBe(false);
  });
});

describe("devoluciones (F5.3)", () => {
  it("regresa lo que tiene, y no más; las piezas vuelven al almacén", async () => {
    const l = await logistica();
    const d = await alcance("D");
    expect((await l.registrarMovimiento(x.actor("D"), d, { itemId: lona, cantidad: 4, tipo: "devolucion", responsableId: x.u.M1, notas: "" })).ok).toBe(true);
    const demas = await l.registrarMovimiento(x.actor("D"), d, { itemId: lona, cantidad: 7, tipo: "devolucion", responsableId: x.u.M1, notas: "" });
    expect(demas).toMatchObject({ ok: false });
    expect(!demas.ok && demas.error).toMatch(/tiene 6/);
    const [fila] = await (await db()).select({ q: schema.inventoryItems.quantity }).from(schema.inventoryItems).where(eq(schema.inventoryItems.id, lona));
    expect(fila!.q).toBe(89);
    const enManos = (await l.datosDeLogistica(d)).enManos.find((f) => f.personaId === x.u.M1);
    expect(enManos?.cantidad).toBe(6);
  });

  it("de alguien de otra estructura, o sin persona, no", async () => {
    const l = await logistica();
    const d = await alcance("D");
    expect((await l.registrarMovimiento(x.actor("D"), d, { itemId: lona, cantidad: 1, tipo: "devolucion", responsableId: x.u.M4, notas: "" })).ok).toBe(false);
    expect((await l.registrarMovimiento(x.actor("D"), d, { itemId: lona, cantidad: 1, tipo: "devolucion", responsableId: null, notas: "" })).ok).toBe(false);
    expect((await l.registrarMovimiento(x.actor("D"), d, { itemId: lona, cantidad: 1, tipo: "devolucion", responsableId: x.u.M2, notas: "" })).ok).toBe(false);
  });

  it("dos devoluciones a la vez no se pasan de lo que tiene", async () => {
    const l = await logistica();
    const d = await alcance("D");
    const r = await Promise.all([1, 2].map(() => l.registrarMovimiento(x.actor("D"), d, { itemId: lona, cantidad: 4, tipo: "devolucion", responsableId: x.u.M1, notas: "" })));
    expect(r.filter((m) => m.ok)).toHaveLength(1);
    const enManos = (await l.datosDeLogistica(d)).enManos.find((f) => f.personaId === x.u.M1);
    expect(enManos?.cantidad).toBe(2);
  });
});

describe("salidas", () => {
  it("sin existencias suficientes, no; un almacén de otro municipio, tampoco", async () => {
    const l = await logistica();
    expect((await l.registrarMovimiento(x.actor("AT"), await alcance("AT"), { itemId: gorra, cantidad: 31, tipo: "out", responsableId: null, notas: "" })).ok).toBe(false);
    expect((await l.registrarMovimiento(x.actor("AZ"), await alcance("AZ"), { itemId: gorra, cantidad: 1, tipo: "in", responsableId: null, notas: "" })).ok).toBe(false);
  });
});

describe("archivar (F5.2)", () => {
  it("solo administración; archivado no se mueve ni cuenta; vuelve a la lista", async () => {
    const l = await logistica();
    expect((await l.archivarArticulo(x.actor("D"), await alcance("D"), gorra, true)).ok).toBe(false);
    expect((await l.archivarArticulo(x.actor("AT"), await alcance("AT"), gorra, true)).ok).toBe(true);
    const mover = await l.registrarMovimiento(x.actor("AT"), await alcance("AT"), { itemId: gorra, cantidad: 1, tipo: "in", responsableId: null, notas: "" });
    expect(mover).toMatchObject({ ok: false });
    const datos = await l.datosDeLogistica(await alcance("AT"));
    expect(datos.articulos.find((a) => a.id === gorra)?.archivado).toBe(true);
    expect(datos.resumen.tipos).toBe(1);
    // Archivar nunca borra.
    expect(await (await db()).select().from(schema.inventoryItems).where(eq(schema.inventoryItems.id, gorra))).toHaveLength(1);
    expect((await l.archivarArticulo(x.actor("AT"), await alcance("AT"), gorra, false)).ok).toBe(true);
    const acciones = (await (await db()).select({ a: schema.auditLogs.action }).from(schema.auditLogs).where(eq(schema.auditLogs.entityId, gorra))).map((f) => f.a);
    expect(acciones).toEqual(expect.arrayContaining(["inventory.archive", "inventory.restore"]));
  });
});

describe("por agotarse (D7) y entregas por fecha", () => {
  it("cuenta lo que llegó a su mínimo; editar el mínimo lo cambia", async () => {
    const l = await logistica();
    const at = await alcance("AT");
    expect((await l.datosDeLogistica(at)).resumen.porAgotarse).toBe(0);
    expect((await l.registrarMovimiento(x.actor("AT"), at, { itemId: gorra, cantidad: 10, tipo: "out", responsableId: null, notas: "" })).ok).toBe(true);
    expect((await l.datosDeLogistica(at)).resumen.porAgotarse).toBe(1);
    const editado = await l.editarArticulo(x.actor("D"), await alcance("D"), gorra, { nombre: "zz Gorra", sku: "zz-GOR", categoria: "ropa", descripcion: "", imagen: "", minimo: "5" });
    expect(editado.ok).toBe(true);
    expect((await l.datosDeLogistica(at)).resumen.porAgotarse).toBe(0);
    expect((await l.editarArticulo(x.actor("D"), await alcance("D"), gorra, { nombre: "zz Gorra", sku: "zz-GOR", categoria: "ropa", descripcion: "", imagen: "", minimo: "-3" })).ok).toBe(false);
  });

  it("«Entregadas en 30 días» se mide por fecha: una entrega de hace 40 días no cuenta", async () => {
    const l = await logistica();
    const at = await alcance("AT");
    const antes = (await l.datosDeLogistica(at)).resumen.entregadas30;
    const hace40 = new Date(Date.now() - 40 * 24 * 3600 * 1000);
    await (await db()).insert(schema.inventoryTransactions).values({ itemId: lona, transactionType: "out", quantity: 1000, performedByUserId: x.u.AT, createdAt: hace40 });
    expect((await l.datosDeLogistica(at)).resumen.entregadas30).toBe(antes);
  });
});

describe("migración 0030", () => {
  it("solo agrega: ni DROP ni DELETE", () => {
    const sentencias = MIGRACION.split(/\r?\n/)
      .filter((l) => !l.trim().startsWith("--"))
      .join("\n");
    expect(sentencias).not.toMatch(/DROP\s+(COLUMN|TABLE|INDEX)|\bTRUNCATE\b|\bDELETE\b|\bRENAME\b/i);
  });

  it("dos veces sin error; un tipo inventado o un mínimo negativo se rechazan", async () => {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      await pool.query(MIGRACION);
      await pool.query(MIGRACION);
      await expect(
        pool.query(`INSERT INTO inventory_transactions (item_id, transaction_type, quantity, performed_by_user_id) VALUES ($1, 'ajuste', 1, $2)`, [lona, x.u.AT])
      ).rejects.toMatchObject({ code: "23514" });
      await expect(pool.query(`UPDATE inventory_items SET min_quantity = -1 WHERE id = $1`, [lona])).rejects.toMatchObject({ code: "23514" });
    } finally {
      await pool.end();
    }
  });
});
