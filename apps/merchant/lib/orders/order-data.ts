import type {
  Order,
  OrderFilters,
  OrderPage,
  OrderStatus,
} from "@/types/order";
import type { ApiResponse } from "@repo/types";

const commerceBasePath = "/merchant/api/commerce";

export async function getOrders(filters: OrderFilters): Promise<OrderPage> {
  const response = await commerceRequest<ApiResponse<Order[]>>(
    `/orders?${new URLSearchParams({
      page: String(filters.page),
      limit: String(filters.limit),
      ...(filters.search ? { search: filters.search } : {}),
      ...(filters.paymentStatus !== "ALL"
        ? { paymentStatus: filters.paymentStatus }
        : {}),
      ...(filters.fulfillmentStatus !== "ALL"
        ? { fulfillmentStatus: filters.fulfillmentStatus }
        : {}),
      ...(filters.sourceChannel !== "ALL"
        ? { sourceChannel: filters.sourceChannel }
        : {}),
      ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
      ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
    })}`,
  );

  return {
    items: response.data,
    meta: response.meta ?? emptyMeta(filters.page, filters.limit),
  };
}

export async function getOrder(orderId: string) {
  const response = await commerceRequest<ApiResponse<Order>>(
    `/orders/${orderId}`,
  );

  return response.data;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const response = await commerceRequest<ApiResponse<Order>>(
    `/orders/${orderId}/status`,
    {
      body: { status },
      method: "PATCH",
    },
  );

  return response.data;
}

export async function cancelOrder(orderId: string) {
  const response = await commerceRequest<ApiResponse<Order>>(
    `/orders/${orderId}/cancel`,
    {
      method: "POST",
    },
  );

  return response.data;
}

export async function refundOrder(orderId: string, returnStock: boolean) {
  const response = await commerceRequest<ApiResponse<Order>>(
    `/orders/${orderId}/refund`,
    {
      body: { returnStock },
      method: "POST",
    },
  );

  return response.data;
}

function emptyMeta(page: number, limit: number) {
  return {
    limit,
    page,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: page > 1,
  };
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
        : "Order request failed";

    throw new Error(message);
  }

  return payload as T;
}
