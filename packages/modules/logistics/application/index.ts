import type { Result} from "@tonala/shared/kernel";
import { ok, err } from "@tonala/shared/kernel";
import type { Database} from "@tonala/shared/database";
import { schema } from "@tonala/shared/database";
import type { AddStockCommand, AssignStockCommand } from "../contracts/index.js";
import { eq, and, sql } from "drizzle-orm";

export class LogisticsApplication {
  constructor(
    private readonly db: Database
  ) {}

  async addStock(command: AddStockCommand): Promise<Result<string>> {
    return this.db.transaction(async (tx) => {
      let itemId: string;
      const existing = await tx.query.inventoryItems.findFirst({
        where: and(eq(schema.inventoryItems.sku, command.sku), eq(schema.inventoryItems.warehouseId, command.warehouseId))
      });

      if (existing) {
        itemId = existing.id;
        await tx.update(schema.inventoryItems)
          .set({ quantity: sql`${schema.inventoryItems.quantity} + ${command.quantity}` })
          .where(eq(schema.inventoryItems.id, itemId));
      } else {
        const [newItem] = await tx.insert(schema.inventoryItems)
          .values({
            warehouseId: command.warehouseId,
            sku: command.sku,
            name: command.name,
            category: command.category,
            quantity: command.quantity
          }).returning();
        if (!newItem) {
          throw new Error("Failed to insert item");
        }
        itemId = newItem.id;
      }

      await tx.insert(schema.inventoryTransactions).values({
        itemId,
        transactionType: "in",
        quantity: command.quantity,
        performedByUserId: command.performedByUserId,
      });

      return ok(itemId);
    });
  }

  async assignStock(command: AssignStockCommand): Promise<Result<boolean>> {
    return this.db.transaction(async (tx) => {
      const item = await tx.query.inventoryItems.findFirst({
        where: eq(schema.inventoryItems.id, command.itemId)
      });

      if (!item || item.quantity < command.quantity) {
        return err(new Error("Stock insuficiente o artículo no encontrado"));
      }

      await tx.update(schema.inventoryItems)
        .set({ quantity: sql`${schema.inventoryItems.quantity} - ${command.quantity}` })
        .where(eq(schema.inventoryItems.id, command.itemId));

      await tx.insert(schema.inventoryTransactions).values({
        itemId: command.itemId,
        transactionType: "out",
        quantity: command.quantity,
        assignedToUserId: command.assignedToUserId,
        performedByUserId: command.performedByUserId,
        notes: command.notes
      });

      return ok(true);
    });
  }
}
