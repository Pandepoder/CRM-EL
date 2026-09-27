"use server";

import { revalidatePath } from "next/cache";

import { actorFromSession } from "@/lib/api-helpers";
import { esUuid } from "@/lib/ids";
import { crearAlmacen, crearArticulo, registrarMovimiento, type Resultado } from "@/lib/logistica";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";

/**
 * Logística: administración y dirección, cada quien en los almacenes de su municipio (etapa 6, ver
 * `lib/logistica.ts`). Devuelven el resultado en vez de lanzar: en producción Next oculta el mensaje
 * de lo que lanza una acción, y la pantalla no podría decir qué pasó.
 */

const ROLES = new Set(["admin", "direction"]);
const texto = (valor: FormDataEntryValue | null): string => (typeof valor === "string" ? valor : "");

async function sesion() {
  const actor = await actorFromSession();
  if (!actor || !actor.roles.some((r) => ROLES.has(r))) return null;
  return { actor, alcance: await resolveUserNetworkScope(actor.actorId) };
}

const SIN_PERMISO: Resultado = { ok: false, error: "Logística la llevan administración y dirección." };

function responder(r: Resultado): Resultado {
  if (r.ok) revalidatePath("/logistica");
  return r;
}

export async function createWarehouseAction(formData: FormData): Promise<Resultado> {
  const s = await sesion();
  if (!s) return SIN_PERMISO;
  return responder(
    await crearAlmacen(s.actor, s.alcance, {
      nombre: texto(formData.get("name")),
      ubicacion: texto(formData.get("location")),
      municipio: texto(formData.get("municipality"))
    })
  );
}

export async function createInventoryItemAction(formData: FormData): Promise<Resultado> {
  const s = await sesion();
  if (!s) return SIN_PERMISO;
  const warehouseId = formData.get("warehouseId");
  if (!esUuid(warehouseId)) return { ok: false, error: "Elige el almacén del artículo." };
  return responder(
    await crearArticulo(s.alcance, {
      warehouseId,
      nombre: texto(formData.get("name")),
      sku: texto(formData.get("sku")),
      categoria: texto(formData.get("category")),
      descripcion: texto(formData.get("description")),
      imagen: texto(formData.get("imageUrl"))
    })
  );
}

export async function registerMovementAction(formData: FormData): Promise<Resultado> {
  const s = await sesion();
  if (!s) return SIN_PERMISO;
  const itemId = formData.get("itemId");
  if (!esUuid(itemId)) return { ok: false, error: "Elige un artículo del inventario." };
  const responsable = formData.get("assignedToUserId");
  if (responsable && !esUuid(responsable)) return { ok: false, error: "Elige al responsable de la lista." };
  const tipo = texto(formData.get("type")) === "in" ? "in" : "out";
  return responder(
    await registrarMovimiento(s.actor, s.alcance, {
      itemId,
      cantidad: Number(texto(formData.get("quantity"))),
      tipo,
      responsableId: typeof responsable === "string" && responsable ? responsable : null,
      notas: texto(formData.get("notes"))
    })
  );
}
