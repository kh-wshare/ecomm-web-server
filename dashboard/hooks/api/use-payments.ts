"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import type { PaymentFilters } from "@/types/payment";
import { createPaymentIntent } from "@/lib/checkout/checkout-data";
import {
  getPayment,
  getPaymentProviders,
  getPayments,
} from "@/lib/payments/payment-data";
import { queryKeys } from "@/lib/query/keys";

export function usePaymentProviders(enabled = true) {
  return useQuery({
    queryKey: queryKeys.payments.providers(),
    queryFn: getPaymentProviders,
    enabled,
  });
}

export function useCreatePaymentIntent() {
  return useMutation({
    mutationFn: ({
      checkoutToken,
      orderId,
    }: {
      checkoutToken: string;
      orderId: string;
    }) => createPaymentIntent(orderId, checkoutToken),
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
