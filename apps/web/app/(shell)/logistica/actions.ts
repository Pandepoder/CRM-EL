"use server";

import { revalidatePath } from "next/cache";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { actorFromSession } from "@/lib/api-helpers";
import { randomUUID } from "crypto";

export async function createInventoryItemAction(formData: FormData) {
  const actor = await actorFromSession();
  if (!actor || (!actor.roles.includes("admin") && !actor.roles.includes("direction"))) {
    throw new Error("Unauthorized");
  }

  const name = formData.get("name") as string;
  const sku = formData.get("sku") as string;
  const category = formData.get("category") as string;
  const description = formData.get("description") as string;
  const imageUrl = formData.get("imageUrl") as string;

  if (!name || !sku || !category) {
    throw new Error("Missing required fields");
  }

  const db = getDatabaseClient();
  const id = randomUUID();

  // Find or create a default warehouse since warehouseId is required
  let warehouseId = "";
  const existingWarehouses = await db.query.warehouses.findMany({ limit: 1 });
  if (existingWarehouses.length > 0) {
    warehouseId = existingWarehouses[0]!.id;
  } else {
    warehouseId = randomUUID();
    await db.insert(schema.warehouses).values({
      id: warehouseId,
      name: "Almacén Principal",
      location: "Sede"
    });
  }

  await db.insert(schema.inventoryItems).values({
    id,
    warehouseId,
    sku,
    name,
    category,
    description,
    imageUrl,
    quantity: 0
  });

  revalidatePath("/logistica");
}
