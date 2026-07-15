"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { DashboardInventoryStock } from "@/types/dashboard";
import type { InventoryAdjustmentValues } from "@/types/inventory";
import {
  adjustInventory,
  getInventory,
  getInventoryMovements,
} from "@/lib/inventory/inventory-data";
import { getProductInventory } from "@/lib/products/product-data";
import { queryKeys } from "@repo/query-client";

export function useInventory(search = "", enabled = true) {
  return useQuery({
    queryKey: queryKeys.inventory.list({ search }),
    queryFn: () => getInventory(search),
    enabled,
  });
}

export function useInventoryItem(productId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.inventory.detail(productId),
    queryFn: () => getProductInventory(productId),
    enabled: enabled && Boolean(productId),
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      stock,
      values,
    }: {
      stock: DashboardInventoryStock;
      values: InventoryAdjustmentValues;
    }) => adjustInventory(stock, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.merchant.dashboard(),
      });
    },
  });
}

export function useStockMovements(enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.inventory.all, "movements"],
    queryFn: getInventoryMovements,
    enabled,
  });
}
