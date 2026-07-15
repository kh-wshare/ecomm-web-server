import type { DashboardInventoryStock } from "@/types/dashboard";
import type {
  InventoryAdjustmentValues,
  InventoryMovementRecord,
} from "@/types/inventory";
import type { ProductInventoryDetail } from "@/types/product";
import type { ApiResponse } from "@repo/types";

const commerceBasePath = "/merchant/api/commerce";

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
  const response = await commerceRequest<ApiResponse<DashboardInventoryStock>>(
    "/inventory/adjust",
    {
      body: {
        productId: stock.productId,
        ...(stock.variantId ? { variantId: stock.variantId } : {}),
        quantityDelta,
        referenceId: values.reason.trim(),
        referenceType: "dashboard_adjustment",
        safetyBuffer: Number(values.safetyBuffer || 0),
      },
      method: "POST",
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
      const response = await commerceRequest<ApiResponse<ProductInventoryDetail>>(
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
  const first = await commerceRequest<ApiResponse<T[]>>(
    `${path}${separator}page=1&limit=100`,
  );
  const results = [...first.data];
  const totalPages = first.meta?.totalPages ?? 1;

  if (totalPages > 1) {
    const pages = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        commerceRequest<ApiResponse<T[]>>(
          `${path}${separator}page=${index + 2}&limit=100`,
        ),
      ),
    );
    pages.forEach((page) => results.push(...page.data));
  }

  return results;
}

async function commerceRequest<T>(
  path: string,
  options: { body?: unknown; method?: string } = {},
) {
  const response = await fetch(`${commerceBasePath}${path}`, {
    body:
      options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options.body === undefined
        ? {}
        : { "Content-Type": "application/json" }),
    },
    method: options.method ?? "GET",
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : "Inventory request failed";

    throw new Error(message);
  }

  return payload as T;
}
