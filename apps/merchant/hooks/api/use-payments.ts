"use client";

import { useQuery } from "@tanstack/react-query";

import type { PaymentFilters } from "@repo/types";
import {
  getPayment,
  getPaymentProviders,
  getPayments,
} from "@/lib/payments/payment-data";
import { queryKeys } from "@repo/query-client";

export function usePaymentProviders(enabled = true) {
  return useQuery({
    queryKey: queryKeys.payments.providers(),
    queryFn: getPaymentProviders,
    enabled,
  });
}

export function usePayments(filters: PaymentFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.payments.list(filters),
    queryFn: () => getPayments(filters),
    enabled,
  });
}

export function usePayment(paymentId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.payments.detail(paymentId),
    queryFn: () => getPayment(paymentId),
    enabled: enabled && Boolean(paymentId),
  });
}
