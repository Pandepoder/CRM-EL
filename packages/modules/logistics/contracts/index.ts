export type InventoryItemDTO = {
  id: string;
  warehouseId: string;
  sku: string;
  name: string;
  quantity: number;
  category: string;
  createdAt: Date;
};

export type InventoryTransactionDTO = {
  id: string;
  itemId: string;
  transactionType: "in" | "out";
  quantity: number;
  assignedToUserId?: string | null;
  performedByUserId: string;
  notes?: string | null;
  createdAt: Date;
};

export type AddStockCommand = {
  warehouseId: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  performedByUserId: string;
};

export type AssignStockCommand = {
  itemId: string;
  quantity: number;
  assignedToUserId: string;
  performedByUserId: string;
  notes?: string;
};
