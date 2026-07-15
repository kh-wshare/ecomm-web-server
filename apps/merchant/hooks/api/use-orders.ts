"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { OrderFilters, OrderStatus } from "@/types/order";
import {
  cancelOrder,
  getOrder,
  getOrders,
  refundOrder,
  updateOrderStatus,
} from "@/lib/orders/order-data";
import { queryKeys } from "@repo/query-client";

export function useOrders(filters: OrderFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.orders.list(filters),
    queryFn: () => getOrders(filters),
    enabled,
  });
}

export function useOrder(orderId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => getOrder(orderId),
    enabled: enabled && Boolean(orderId),
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      status,
    }: {
      orderId: string;
      status: OrderStatus;
    }) => updateOrderStatus(orderId, status),
    onSuccess: (order) => refreshOrder(queryClient, order.id, order),
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => cancelOrder(orderId),
    onSuccess: (order) => refreshOrder(queryClient, order.id, order),
  });
}

export function useRefundOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      returnStock,
    }: {
      orderId: string;
      returnStock: boolean;
    }) => refundOrder(orderId, returnStock),
    onSuccess: (order) => {
      refreshOrder(queryClient, order.id, order);
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
    },
  });
}

function refreshOrder(
  queryClient: ReturnType<typeof useQueryClient>,
  orderId: string,
  order: Awaited<ReturnType<typeof getOrder>>,
) {
  queryClient.setQueryData(queryKeys.orders.detail(orderId), order);
  void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.merchant.dashboard(),
  });
}
