import "dotenv/config";

import crypto from "node:crypto";

import { desc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { ActorContext } from "@tonala/shared/auth";
import { schema } from "@tonala/shared/database";

import type * as AyudantesApi from "@/lib/api-helpers";

import { crearBaseDesechable } from "./base-desechable";
import { crearEstructuraDePrueba, type EstructuraDePrueba, type Persona } from "./estructura-de-prueba";

/**
 * La matriz de Logística del plan de auditoría de menús (§4.5), contra las acciones de la pantalla y con la
 * sesión de cada perfil: quién ve qué almacenes, quién da de alta, edita, archiva y entrega, y a quién.
 */

const sesion: { actor: ActorContext | null } = { actor: null };
vi.mock("@/lib/api-helpers", async (importarOriginal) => {
  const original = await importarOriginal<typeof AyudantesApi>();
  return { ...original, actorFromSession: async () => sesion.actor };
});
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const acciones = await import("../app/(shell)/logistica/actions");

let base: Awaited<ReturnType<typeof crearBaseDesechable>>;
let x: EstructuraDePrueba;
const db = async () => (await import("@/lib/db-client")).getDatabaseClient();
const alcance = async (p: Persona) => (await import("@/lib/network-hierarchy")).resolveUserNetworkScope(x.u[p]);
const como = (p: Persona) => {
  sesion.actor = x.actor(p);
};
const formulario = (campos: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
};
const articulo = crypto.randomUUID();
const articuloZ = crypto.randomUUID();

beforeAll(async () => {
  base = await crearBaseDesechable("matriz_logistica");
  x = await crearEstructuraDePrueba(await db());
  const d = await db();
  const municipio = async (nombre: string) => (await d.select({ id: schema.municipalities.id }).from(schema.municipalities).where(eq(schema.municipalities.name, nombre)))[0]!.id;
  const [t] = await d.insert(schema.warehouses).values({ name: "zz Bodega T", municipalityId: await municipio("Tonalá"), createdByUserId: x.u.AT }).returning();
  const [z] = await d.insert(schema.warehouses).values({ name: "zz Bodega Z", municipalityId: await municipio("Zapopan"), createdByUserId: x.u.AZ }).returning();
  await d.insert(schema.inventoryItems).values([
    { id: articulo, warehouseId: t!.id, sku: "zz-T", name: "zz Playera", category: "ropa", quantity: 500 },
    { id: articuloZ, warehouseId: z!.id, sku: "zz-Z", name: "zz Playera Z", category: "ropa", quantity: 500 }
  ]);
}, 120_000);

afterAll(async () => {
  await base?.borrar();
});

describe("ver inventario (§4.5)", () => {
  it("el maestro todos; administración y dirección los de su municipio; líder, capturista y brigadista ninguno", async () => {
    const { datosDeLogistica, tieneLogistica } = await import("@/lib/logistica");
    const nombres = async (p: Persona) => (await datosDeLogistica(await alcance(p))).almacenes.map((a) => a.nombre).filter((n) => n.startsWith("zz")).sort();
    expect(await nombres("MA")).toEqual(["zz Bodega T", "zz Bodega Z"]);
    expect(await nombres("AT")).toEqual(["zz Bodega T"]);
    expect(await nombres("D")).toEqual(["zz Bodega T"]);
    expect(await nombres("DZ")).toEqual(["zz Bodega Z"]);
    for (const p of ["L1", "K1", "M1"] as const) {
      expect(tieneLogistica(await alcance(p)), p).toBe(false);
      expect(await nombres(p), p).toEqual([]);
    }
  });
});

describe("altas y edición (§4.5)", () => {
  it("almacén: administración y dirección en su municipio; el líder no", async () => {
    for (const [p, ok] of [["AT", true], ["D", true], ["MA", true], ["L1", false], ["M1", false]] as const) {
      como(p);
      const r = await acciones.createWarehouseAction(formulario({ name: `zz Bodega de ${p}`, location: "", municipality: "Zapopan" }));
      expect(r.ok, p).toBe(ok);
    }
  });

  it("artículos: administración y dirección los dan de alta y los editan; el líder no", async () => {
    const [bodega] = await (await db()).select().from(schema.warehouses).where(eq(schema.warehouses.name, "zz Bodega T"));
    for (const [p, ok] of [["AT", true], ["D", true], ["L1", false]] as const) {
      como(p);
      const alta = await acciones.createInventoryItemAction(formulario({ warehouseId: bodega!.id, name: `zz Lona de ${p}`, sku: `zz-L-${p}`, category: "publicidad", minQuantity: "10" }));
      expect(alta.ok, `alta ${p}`).toBe(ok);
      const edicion = await acciones.editItemAction(formulario({ itemId: articulo, name: "zz Playera", sku: "zz-T", category: "ropa", minQuantity: "50" }));
      expect(edicion.ok, `edición ${p}`).toBe(ok);
    }
    // La dirección de Zapopan no edita lo de Tonalá.
    como("DZ");
    expect((await acciones.editItemAction(formulario({ itemId: articulo, name: "x", sku: "x", category: "x", minQuantity: "" }))).ok).toBe(false);
  });

  it("archivar y devolver a la lista: solo administración", async () => {
    for (const [p, ok] of [["D", false], ["L1", false], ["AT", true]] as const) {
      como(p);
      expect((await acciones.archiveItemAction(articulo, true)).ok, p).toBe(ok);
    }
    como("MA");
    expect((await acciones.archiveItemAction(articulo, false)).ok).toBe(true);
    como("AZ");
    expect((await acciones.archiveItemAction(articulo, true)).ok).toBe(false);
  });
});

describe("entregar y recibir devoluciones (§4.5)", () => {
  it("la administración entrega a gente de su municipio; la dirección, a su cascada; nadie a otro municipio", async () => {
    const entregar = async (p: Persona, a: string, persona: Persona) => {
      como(p);
      return (await acciones.registerMovementAction(formulario({ itemId: a, type: "out", quantity: "5", assignedToUserId: x.u[persona], notes: "" }))).ok;
    };
    expect(await entregar("AT", articulo, "M4")).toBe(true);
    expect(await entregar("AT", articulo, "M5")).toBe(false);
    expect(await entregar("D", articulo, "M1")).toBe(true);
    expect(await entregar("D", articulo, "M4")).toBe(false);
    expect(await entregar("DB", articulo, "M4")).toBe(true);
    expect(await entregar("DZ", articuloZ, "M5")).toBe(true);
    expect(await entregar("DZ", articulo, "M5")).toBe(false);
    expect(await entregar("L1", articulo, "M1")).toBe(false);
  });

  it("devoluciones con la misma regla; un tipo inventado se toma como entrega, no como otra cosa", async () => {
    como("D");
    expect((await acciones.registerMovementAction(formulario({ itemId: articulo, type: "devolucion", quantity: "2", assignedToUserId: x.u.M1, notes: "" }))).ok).toBe(true);
    como("D");
    expect((await acciones.registerMovementAction(formulario({ itemId: articulo, type: "devolucion", quantity: "1", assignedToUserId: x.u.M4, notes: "" }))).ok).toBe(false);
    como("AT");
    const r = await acciones.registerMovementAction(formulario({ itemId: articulo, type: "ajuste", quantity: "1", assignedToUserId: "", notes: "" }));
    expect(r.ok).toBe(true);
    const [ultimo] = await (await db())
      .select({ tipo: schema.inventoryTransactions.transactionType })
      .from(schema.inventoryTransactions)
      .where(eq(schema.inventoryTransactions.itemId, articulo))
      .orderBy(desc(schema.inventoryTransactions.createdAt))
      .limit(1);
    expect(ultimo?.tipo).toBe("out");
  });

  it("el historial por páginas también recorta los nombres (P1)", async () => {
    como("D");
    const r = await acciones.historyPageAction(1);
    expect(r.ok).toBe(true);
    const texto = JSON.stringify(r);
    expect(texto).not.toContain("zz M4");
    expect(texto).toContain("Otras estructuras");
    como("L1");
    expect((await acciones.historyPageAction(1)).ok).toBe(false);
  });
});
