import type { DashboardInventoryStock } from "@/types/dashboard";
import type { InventoryMovement } from "@/types/product";

export type InventoryFilter = "ALL" | "LOW" | "OUT";

export type InventoryAdjustmentValues = {
  type: "STOCK_IN" | "STOCK_OUT";
  quantity: string;
  safetyBuffer: string;
  reason: string;
};

export type InventoryMovementRecord = InventoryMovement & {
  productId: string;
  productName: string;
  productSku: string;
};

export type AdjustableStock = DashboardInventoryStock;
