import type { DashboardInventoryStock } from "@/types/dashboard";
import type {
  InventoryAdjustmentValues,
  InventoryMovementRecord,
} from "@/types/inventory";
import type { ProductInventoryDetail } from "@/types/product";
import { apiClient } from "@/lib/api/client";

export async function getInventory(search = "") {
  return fetchAll<DashboardInventoryStock>(
    `/inventory?${new URLSearchParams(search ? { search } : {})}`,
  );
}

export async function adjustInventory(
  stock: DashboardInventoryStock,
  values: InventoryAdjustmentValues,
) {
  const quantity = Number(values.quantity);
  const quantityDelta = values.type === "STOCK_OUT" ? -quantity : quantity;
  const response = await apiClient.post<DashboardInventoryStock>(
    "/inventory/adjust",
    {
      productId: stock.productId,
      ...(stock.variantId ? { variantId: stock.variantId } : {}),
      quantityDelta,
      safetyBuffer: Number(values.safetyBuffer || 0),
      referenceId: values.reason.trim(),
      referenceType: "dashboard_adjustment",
    },
  );

  return response.data;
}

export async function getInventoryMovements() {
  const stocks = await getInventory();
  const products = Array.from(
    new Map(stocks.map((stock) => [stock.productId, stock])).values(),
  );
  const details = await Promise.all(
    products.map(async (stock) => {
      const response = await apiClient.get<ProductInventoryDetail>(
        `/inventory/${stock.productId}`,
      );

      return { detail: response.data, stock };
    }),
  );

  return details
    .flatMap(({ detail, stock }) =>
      detail.recentMovements.map(
        (movement): InventoryMovementRecord => ({
          ...movement,
          productId: stock.productId,
          productName: stock.product.name,
          productSku: stock.product.sku,
        }),
      ),
    )
    .sort(
      (first, second) =>
        new Date(second.createdAt).getTime() -
        new Date(first.createdAt).getTime(),
    );
}

async function fetchAll<T>(path: string) {
  const separator = path.includes("?") ? "&" : "?";
  const first = await apiClient.get<T[]>(`${path}${separator}page=1&limit=100`);
  const results = [...first.data];
  const totalPages = first.meta?.totalPages ?? 1;

  if (totalPages > 1) {
    const pages = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        apiClient.get<T[]>(`${path}${separator}page=${index + 2}&limit=100`),
      ),
    );
    pages.forEach((page) => results.push(...page.data));
  }

  return results;
}
