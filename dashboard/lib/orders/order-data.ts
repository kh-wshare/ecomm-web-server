import type {
  Order,
  OrderFilters,
  OrderPage,
  OrderStatus,
} from "@/types/order";
import { apiClient } from "@/lib/api/client";

export async function getOrders(filters: OrderFilters): Promise<OrderPage> {
  const response = await apiClient.get<Order[]>(
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
  const response = await apiClient.get<Order>(`/orders/${orderId}`);

  return response.data;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const response = await apiClient.patch<Order>(`/orders/${orderId}/status`, {
    status,
  });

  return response.data;
}

export async function cancelOrder(orderId: string) {
  const response = await apiClient.post<Order>(`/orders/${orderId}/cancel`);

  return response.data;
}

export async function refundOrder(orderId: string, returnStock: boolean) {
  const response = await apiClient.post<Order>(`/orders/${orderId}/refund`, {
    returnStock,
  });

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
