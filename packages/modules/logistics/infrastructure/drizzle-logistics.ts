import { eq, desc } from "drizzle-orm";
import type { Database} from "@tonala/shared/database";
import { schema } from "@tonala/shared/database";
import type { InventoryItemDTO, InventoryTransactionDTO } from "../contracts/index.js";

export class DrizzleLogisticsRepository {
  constructor(private readonly db: Database) {}

  async getAllItems(): Promise<InventoryItemDTO[]> {
    const items = await this.db.query.inventoryItems.findMany({
      orderBy: [desc(schema.inventoryItems.createdAt)]
    });
    return items;
  }

  async getRecentTransactions(): Promise<InventoryTransactionDTO[]> {
    const txs = await this.db.query.inventoryTransactions.findMany({
      orderBy: [desc(schema.inventoryTransactions.createdAt)],
      limit: 50
    });
    return txs as InventoryTransactionDTO[];
  }

  async getItemById(itemId: string): Promise<InventoryItemDTO | undefined> {
    const item = await this.db.query.inventoryItems.findFirst({
      where: eq(schema.inventoryItems.id, itemId)
    });
    return item;
  }
}
