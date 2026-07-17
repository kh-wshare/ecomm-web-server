import type {
  InventoryStock,
  Product,
  ProductFormChannel,
  ProductInventoryDetail,
  ProductListFilters,
  ProductListItem,
  ProductOrder,
  ProductPayload,
} from "@/types/product";
import type { ApiResponse } from "@repo/types";

const commerceBasePath = "/merchant/api/commerce";

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
      const response = await commerceRequest<ApiResponse<Product>>(
        `/products/${product.id}`,
      );

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
  const response = await commerceRequest<ApiResponse<Product>>(
    `/products/${productId}`,
  );

  return response.data;
}

export async function createProduct(payload: ProductPayload) {
  const response = await commerceRequest<ApiResponse<Product>>("/products", {
    body: payload,
    method: "POST",
  });

  return response.data;
}

export async function updateProduct(
  productId: string,
  payload: ProductPayload,
) {
  const response = await commerceRequest<ApiResponse<Product>>(
    `/products/${productId}`,
    {
      body: payload,
      method: "PATCH",
    },
  );

  return response.data;
}

export async function updateProductChannelVisibility(
  productId: string,
  channelVisibility: ProductFormChannel[],
) {
  const response = await commerceRequest<ApiResponse<Product>>(
    `/products/${productId}`,
    {
      body: { channelVisibility },
      method: "PATCH",
    },
  );

  return response.data;
}

export async function deleteProduct(productId: string) {
  const response = await commerceRequest<ApiResponse<Product>>(
    `/products/${productId}`,
    {
      method: "DELETE",
    },
  );

  return response.data;
}

export async function adjustProductStock(
  productId: string,
  quantityDelta: number,
  safetyBuffer: number,
  variantId?: string,
) {
  const response = await commerceRequest<ApiResponse<InventoryStock>>(
    "/inventory/adjust",
    {
      body: {
        productId,
        ...(variantId ? { variantId } : {}),
        quantityDelta,
        referenceType: "dashboard_product",
        safetyBuffer,
      },
      method: "POST",
    },
  );

  return response.data;
}

export async function getProductInventory(productId: string) {
  const response = await commerceRequest<ApiResponse<ProductInventoryDetail>>(
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
  const first = await commerceRequest<ApiResponse<T[]>>(
    `${path}${separator}page=1&limit=100`,
  );
  const items = [...first.data];
  const totalPages = first.meta?.totalPages ?? 1;

  if (totalPages > 1) {
    const pages = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        commerceRequest<ApiResponse<T[]>>(
          `${path}${separator}page=${index + 2}&limit=100`,
        ),
      ),
    );
    pages.forEach((page) => items.push(...page.data));
  }

  return items;
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
        : "Commerce request failed";

    throw new Error(message);
  }

  return payload as T;
}
