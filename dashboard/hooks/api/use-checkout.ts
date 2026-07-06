"use client";

import { useQuery } from "@tanstack/react-query";

import { getCheckoutSession } from "@/lib/checkout/checkout-data";
import { queryKeys } from "@/lib/query/keys";

export function useCheckoutSession(
  sessionId: string,
  checkoutToken: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.checkout.detail(sessionId),
    queryFn: () => getCheckoutSession(sessionId, checkoutToken!),
    enabled: enabled && Boolean(sessionId) && Boolean(checkoutToken),
    refetchOnWindowFocus: true,
  });
}
