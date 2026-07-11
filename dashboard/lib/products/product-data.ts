import type {
  InventoryStock,
  Product,
  ProductInventoryDetail,
  ProductFormChannel,
  ProductListFilters,
  ProductListItem,
  ProductOrder,
  ProductPayload,
} from "@/types/product";
import { apiClient } from "@/lib/api/client";

export async function getProducts(
  filters: ProductListFilters,
  includeInventory = true,
): Promise<ProductListItem[]> {
  const products = await fetchAll<Product>(
    `/products?${new URLSearchParams({
      ...(filters.search ? { search: filters.search } : {}),
      ...(filters.status !== "ALL" ? { status: filters.status } : {}),
    })}`,
  );
  const detailedProducts = await Promise.all(
    products.map(async (product) => {
      const response = await apiClient.get<Product>(`/products/${product.id}`);

      return response.data;
    }),
  );
  const inventory = includeInventory
    ? await fetchAll<InventoryStock>("/inventory")
    : [];

  return detailedProducts
    .filter(
      (product) =>
        filters.channel === "ALL" ||
        product.channelVisibility?.some(
          (item) => item.channel === filters.channel && item.isVisible,
        ),
    )
    .map((product) => ({
      ...product,
      stocks: inventory.filter((stock) => stock.productId === product.id),
    }));
}

export async function getProduct(productId: string) {
  const response = await apiClient.get<Product>(`/products/${productId}`);

  return response.data;
}

export async function createProduct(payload: ProductPayload) {
  const response = await apiClient.post<Product>("/products", payload);

  return response.data;
}

export async function updateProduct(
  productId: string,
  payload: ProductPayload,
) {
  const response = await apiClient.patch<Product>(
    `/products/${productId}`,
    payload,
  );

  return response.data;
}

export async function updateProductChannelVisibility(
  productId: string,
  channelVisibility: ProductFormChannel[],
) {
  const response = await apiClient.patch<Product>(`/products/${productId}`, {
    channelVisibility,
  });

  return response.data;
}

export async function deleteProduct(productId: string) {
  const response = await apiClient.delete<Product>(`/products/${productId}`);

  return response.data;
}

export async function adjustProductStock(
  productId: string,
  quantityDelta: number,
  safetyBuffer: number,
  variantId?: string,
) {
  const response = await apiClient.post<InventoryStock>("/inventory/adjust", {
    productId,
    ...(variantId ? { variantId } : {}),
    quantityDelta,
    safetyBuffer,
    referenceType: "dashboard_product",
  });

  return response.data;
}

export async function getProductInventory(productId: string) {
  const response = await apiClient.get<ProductInventoryDetail>(
    `/inventory/${productId}`,
  );

  return response.data;
}

export async function getProductOrders(productId: string) {
  const orders = await fetchAll<ProductOrder>("/orders");

  return orders.filter((order) =>
    order.items.some((item) => item.productId === productId),
  );
}

async function fetchAll<T>(path: string) {
  const separator = path.includes("?") ? "&" : "?";
  const first = await apiClient.get<T[]>(`${path}${separator}page=1&limit=100`);
  const items = [...first.data];
  const totalPages = first.meta?.totalPages ?? 1;

  if (totalPages > 1) {
    const pages = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        apiClient.get<T[]>(`${path}${separator}page=${index + 2}&limit=100`),
      ),
    );
    pages.forEach((page) => items.push(...page.data));
  }

  return items;
}
